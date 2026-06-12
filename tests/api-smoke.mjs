import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequest } from '../functions/api/[[path]].js';

class D1StatementMock {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  compile() {
    const values = [];
    const sql = this.sql.replace(/\?(\d+)/g, (_, index) => {
      values.push(this.values[Number(index) - 1]);
      return '?';
    });
    return { sql, values: values.length ? values : this.values };
  }

  async run() {
    const compiled = this.compile();
    const result = this.database.prepare(compiled.sql).run(...compiled.values);
    return { success: true, meta: { changes: Number(result.changes || 0) }, results: [] };
  }

  async first() {
    const compiled = this.compile();
    return this.database.prepare(compiled.sql).get(...compiled.values) || null;
  }

  async all() {
    const compiled = this.compile();
    return { success: true, results: this.database.prepare(compiled.sql).all(...compiled.values) };
  }
}

class D1Mock {
  constructor() {
    this.database = new DatabaseSync(':memory:');
    this.database.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
  }

  prepare(sql) {
    return new D1StatementMock(this.database, sql);
  }

  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

class R2Mock {
  constructor() {
    this.objects = new Map();
  }

  async put(key, value) {
    this.objects.set(key, String(value));
  }

  async get(key) {
    if (!this.objects.has(key)) return null;
    const value = this.objects.get(key);
    return { text: async () => value };
  }

  async delete(key) {
    this.objects.delete(key);
  }
}

const env = {
  DB: new D1Mock(),
  REPORTS_BUCKET: new R2Mock(),
  LOCAL_DEV_EMAIL: 'owner@example.com',
  LOCAL_DEV_NAME: 'Owner',
  BOOTSTRAP_OWNER_EMAIL: 'owner@example.com',
};

async function api(method, path, body, email = env.LOCAL_DEV_EMAIL) {
  env.LOCAL_DEV_EMAIL = email;
  const headers = { Accept: 'application/json', Origin: 'http://localhost' };
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const request = new Request(`http://localhost${path}`, init);
  const response = await onRequest({
    request,
    env,
    params: { path: path.replace(/^\/api\/?/, '').split('/').filter(Boolean) },
  });
  return { response, body: await response.json() };
}

const emptyReport = {
  meta: { title: 'Shared report' },
  datasets: [],
  files: [],
  charts: [],
  tables: [],
  companies: [],
  ci: null,
};

let result = await api('GET', '/api/session');
assert.equal(result.response.status, 200);
assert.equal(result.body.role, 'owner');

result = await api('POST', '/api/reports', { title: 'Shared report', report: emptyReport });
assert.equal(result.response.status, 201);
assert.equal(result.body.version, 1);
const reportId = result.body.id;

result = await api('POST', '/api/members', { email: 'editor@example.com', role: 'editor' });
assert.equal(result.response.status, 201);
result = await api('POST', '/api/members', { email: 'viewer@example.com', role: 'viewer' });
assert.equal(result.response.status, 201);

const changedReport = structuredClone(emptyReport);
changedReport.meta.title = 'Changed by editor';
result = await api(
  'PUT',
  `/api/reports/${reportId}`,
  { expectedVersion: 1, title: changedReport.meta.title, report: changedReport },
  'editor@example.com',
);
assert.equal(result.response.status, 200);
assert.equal(result.body.version, 2);

result = await api(
  'PUT',
  `/api/reports/${reportId}`,
  { expectedVersion: 1, title: 'Stale owner copy', report: emptyReport },
  'owner@example.com',
);
assert.equal(result.response.status, 409);
assert.equal(result.body.error.code, 'VERSION_CONFLICT');

result = await api('GET', `/api/reports/${reportId}`, undefined, 'viewer@example.com');
assert.equal(result.response.status, 200);
assert.equal(result.body.version, 2);
assert.equal(result.body.report.meta.title, 'Changed by editor');

result = await api(
  'PUT',
  `/api/reports/${reportId}`,
  { expectedVersion: 2, title: 'Viewer write', report: emptyReport },
  'viewer@example.com',
);
assert.equal(result.response.status, 403);
assert.equal(result.body.error.code, 'READ_ONLY');

assert.ok(env.REPORTS_BUCKET.objects.size >= 2);
console.log('API smoke test passed.');
