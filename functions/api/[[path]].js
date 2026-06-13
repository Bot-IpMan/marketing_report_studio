const MAX_JSON_BYTES = 25 * 1024 * 1024;
const WRITE_ROLES = new Set(['owner', 'editor']);
const MEMBER_ROLES = new Set(['owner', 'editor', 'viewer']);
const SECURITY_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

let accessKeysCache = null;
let accessKeysExpiresAt = 0;

export async function onRequest(context) {
  try {
    const segments = normalizePath(context.params.path);
    const method = context.request.method.toUpperCase();

    if (segments.length === 1 && segments[0] === 'health' && method === 'GET') {
      const configured = Boolean(context.env.DB && context.env.REPORTS_BUCKET);
      return json({ ok: true, configured });
    }

    assertBindings(context.env);

    assertSameOriginWrite(context.request);

    const identity = await authenticate(context.request, context.env);
    const membership = await resolveMembership(context.env.DB, identity, context.env);

    if (segments.length === 1 && segments[0] === 'session' && method === 'GET') {
      return json({
        user: publicUser(membership.user),
        workspace: membership.workspace,
        role: membership.role,
      });
    }

    if (segments[0] === 'reports') {
      if (segments.length === 1 && method === 'GET') {
        return listReports(context.env.DB, membership);
      }
      if (segments.length === 1 && method === 'POST') {
        requireWriteRole(membership);
        return createReport(context, membership);
      }
      if (segments.length === 2 && method === 'GET') {
        return getReport(context, membership, segments[1]);
      }
      if (segments.length === 2 && method === 'PUT') {
        requireWriteRole(membership);
        return updateReport(context, membership, segments[1]);
      }
    }

    if (segments.length === 1 && segments[0] === 'members') {
      requireOwner(membership);
      if (method === 'GET') return listMembers(context.env.DB, membership);
      if (method === 'POST') return upsertMember(context, membership);
    }

    return error('NOT_FOUND', 'API route not found.', 404);
  } catch (cause) {
    const status = Number(cause?.status) || 500;
    if (status >= 500) console.error('[api]', cause);
    const code = cause?.code || 'INTERNAL_ERROR';
    const message = status >= 500 ? 'Server request failed.' : cause.message;
    return error(code, message, status);
  }
}

function assertBindings(env) {
  if (!env.DB) throw httpError(500, 'MISSING_DB', 'D1 binding DB is not configured.');
  if (!env.REPORTS_BUCKET) {
    throw httpError(500, 'MISSING_R2', 'R2 binding REPORTS_BUCKET is not configured.');
  }
}

function assertSameOriginWrite(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) return;
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw httpError(403, 'INVALID_ORIGIN', 'Cross-origin writes are not allowed.');
  }
}

async function authenticate(request, env) {
  const url = new URL(request.url);
  if (isLocalHost(url.hostname) && env.LOCAL_DEV_EMAIL) {
    return {
      email: normalizeEmail(env.LOCAL_DEV_EMAIL),
      name: env.LOCAL_DEV_NAME || 'Local developer',
      sub: 'local-development',
    };
  }

  const domain = normalizeAccessDomain(env.ACCESS_TEAM_DOMAIN);
  const expectedAudience = String(env.ACCESS_AUD || '').trim();
  if (!domain || !expectedAudience) {
    throw httpError(500, 'ACCESS_NOT_CONFIGURED', 'Cloudflare Access variables are missing.');
  }

  const jwt = getAccessJwt(request);
  if (!jwt) throw httpError(401, 'AUTH_REQUIRED', 'Cloudflare Access login is required.');

  const parts = jwt.split('.');
  if (parts.length !== 3) throw httpError(401, 'INVALID_TOKEN', 'Invalid Access token.');

  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64UrlText(parts[0]));
    payload = JSON.parse(decodeBase64UrlText(parts[1]));
  } catch {
    throw httpError(401, 'INVALID_TOKEN', 'Invalid Access token payload.');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw httpError(401, 'INVALID_TOKEN', 'Unsupported Access token signature.');
  }

  const jwks = await getAccessKeys(domain);
  const jwk = jwks.find((item) => item.kid === header.kid);
  if (!jwk) throw httpError(401, 'INVALID_TOKEN', 'Access signing key was not found.');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decodeBase64UrlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!verified) throw httpError(401, 'INVALID_TOKEN', 'Access token signature is invalid.');

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(expectedAudience)) {
    throw httpError(401, 'INVALID_TOKEN', 'Access token audience is invalid.');
  }
  if (normalizeAccessDomain(payload.iss) !== domain) {
    throw httpError(401, 'INVALID_TOKEN', 'Access token issuer is invalid.');
  }
  if (!Number.isFinite(payload.exp) || payload.exp <= now) {
    throw httpError(401, 'TOKEN_EXPIRED', 'Access token has expired.');
  }
  if (Number.isFinite(payload.nbf) && payload.nbf > now + 30) {
    throw httpError(401, 'INVALID_TOKEN', 'Access token is not active yet.');
  }

  const email = normalizeEmail(payload.email);
  if (!email) throw httpError(403, 'EMAIL_REQUIRED', 'Access identity has no email address.');
  return { email, name: String(payload.name || email), sub: String(payload.sub || '') };
}

async function getAccessKeys(domain) {
  if (accessKeysCache && Date.now() < accessKeysExpiresAt) return accessKeysCache;
  const response = await fetch(`${domain}/cdn-cgi/access/certs`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw httpError(503, 'ACCESS_KEYS_UNAVAILABLE', 'Access keys are unavailable.');
  const body = await response.json();
  if (!Array.isArray(body.keys)) {
    throw httpError(503, 'ACCESS_KEYS_UNAVAILABLE', 'Access keys response is invalid.');
  }
  accessKeysCache = body.keys;
  accessKeysExpiresAt = Date.now() + 60 * 60 * 1000;
  return accessKeysCache;
}

async function resolveMembership(db, identity, env) {
  const now = new Date().toISOString();
  const candidateId = `usr_${crypto.randomUUID()}`;
  await db
    .prepare(
      `INSERT INTO users (id, email, display_name, created_at, last_seen_at)
       VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT(email) DO UPDATE SET
         display_name = excluded.display_name,
         last_seen_at = excluded.last_seen_at`,
    )
    .bind(candidateId, identity.email, identity.name, now)
    .run();

  const user = await db
    .prepare('SELECT id, email, display_name FROM users WHERE email = ?1')
    .bind(identity.email)
    .first();
  if (!user) throw httpError(500, 'USER_LOOKUP_FAILED', 'Could not load the current user.');

  let membership = await findMembership(db, user.id);
  const bootstrapEmail = normalizeEmail(env.BOOTSTRAP_OWNER_EMAIL);
  if (!membership && bootstrapEmail && bootstrapEmail === identity.email) {
    membership = await bootstrapOwner(db, user, now);
  }
  if (!membership) {
    throw httpError(
      403,
      'NOT_PROVISIONED',
      'Your account is authenticated but has not been added to this workspace.',
    );
  }

  return {
    user,
    role: membership.role,
    workspace: { id: membership.workspace_id, name: membership.workspace_name },
  };
}

async function findMembership(db, userId) {
  return db
    .prepare(
      `SELECT m.workspace_id, m.role, w.name AS workspace_name
       FROM memberships m
       JOIN workspaces w ON w.id = m.workspace_id
       WHERE m.user_id = ?1
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END,
                m.created_at
       LIMIT 1`,
    )
    .bind(userId)
    .first();
}

async function bootstrapOwner(db, user, now) {
  let workspace = await db.prepare('SELECT id, name FROM workspaces ORDER BY created_at LIMIT 1').first();
  if (!workspace) {
    workspace = { id: `ws_${crypto.randomUUID()}`, name: 'Marketing Report Studio' };
    await db.batch([
      db
        .prepare('INSERT INTO workspaces (id, name, created_by, created_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(workspace.id, workspace.name, user.id, now),
      db
        .prepare(
          `INSERT INTO memberships (workspace_id, user_id, role, created_at)
           VALUES (?1, ?2, 'owner', ?3)`,
        )
        .bind(workspace.id, user.id, now),
    ]);
  } else {
    await db
      .prepare(
        `INSERT INTO memberships (workspace_id, user_id, role, created_at)
         VALUES (?1, ?2, 'owner', ?3)
         ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = 'owner'`,
      )
      .bind(workspace.id, user.id, now)
      .run();
  }
  return { workspace_id: workspace.id, workspace_name: workspace.name, role: 'owner' };
}

async function listReports(db, membership) {
  const result = await db
    .prepare(
      `SELECT id, title, version, created_at AS createdAt, updated_at AS updatedAt
       FROM reports
       WHERE workspace_id = ?1
       ORDER BY updated_at DESC`,
    )
    .bind(membership.workspace.id)
    .all();
  return json({ reports: result.results || [] });
}

async function createReport(context, membership) {
  const body = await readJson(context.request);
  const report = assertReport(body.report);
  const title = cleanTitle(body.title || report?.meta?.title || 'Shared report');
  const now = new Date().toISOString();
  const reportId = `rpt_${crypto.randomUUID()}`;
  const r2Key = reportObjectKey(membership.workspace.id, reportId, 1);
  const serialized = JSON.stringify(report);

  await context.env.REPORTS_BUCKET.put(r2Key, serialized, {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { reportId, version: '1' },
  });

  try {
    await context.env.DB.batch([
      context.env.DB
        .prepare(
          `INSERT INTO reports
           (id, workspace_id, title, version, current_r2_key, created_by, updated_by, created_at, updated_at)
           VALUES (?1, ?2, ?3, 1, ?4, ?5, ?5, ?6, ?6)`,
        )
        .bind(reportId, membership.workspace.id, title, r2Key, membership.user.id, now),
      context.env.DB
        .prepare(
          `INSERT INTO report_versions (report_id, version, r2_key, created_by, created_at)
           VALUES (?1, 1, ?2, ?3, ?4)`,
        )
        .bind(reportId, r2Key, membership.user.id, now),
      auditStatement(context.env.DB, membership, 'report.create', 'report', reportId, { version: 1 }, now),
    ]);
  } catch (cause) {
    await context.env.REPORTS_BUCKET.delete(r2Key);
    throw cause;
  }

  return json({ id: reportId, title, version: 1, report, updatedAt: now }, 201);
}

async function getReport(context, membership, reportId) {
  const row = await accessibleReport(context.env.DB, membership, reportId);
  const object = await context.env.REPORTS_BUCKET.get(row.current_r2_key);
  if (!object) throw httpError(500, 'REPORT_OBJECT_MISSING', 'The report data object is missing.');
  let report;
  try {
    report = JSON.parse(await object.text());
  } catch {
    throw httpError(500, 'REPORT_OBJECT_INVALID', 'The stored report data is invalid.');
  }
  return json({
    id: row.id,
    title: row.title,
    version: row.version,
    updatedAt: row.updated_at,
    report,
  });
}

async function updateReport(context, membership, reportId) {
  const body = await readJson(context.request);
  const expectedVersion = Number(body.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw httpError(400, 'INVALID_VERSION', 'expectedVersion must be a positive integer.');
  }
  const report = assertReport(body.report);
  const row = await accessibleReport(context.env.DB, membership, reportId);
  if (Number(row.version) !== expectedVersion) {
    return conflict(row);
  }

  const version = expectedVersion + 1;
  const title = cleanTitle(body.title || report?.meta?.title || row.title);
  const now = new Date().toISOString();
  const r2Key = reportObjectKey(membership.workspace.id, reportId, version);
  await context.env.REPORTS_BUCKET.put(r2Key, JSON.stringify(report), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { reportId, version: String(version) },
  });

  try {
    const results = await context.env.DB.batch([
      context.env.DB
        .prepare(
          `UPDATE reports
           SET title = ?1, version = ?2, current_r2_key = ?3, updated_by = ?4, updated_at = ?5
           WHERE id = ?6 AND workspace_id = ?7 AND version = ?8`,
        )
        .bind(
          title,
          version,
          r2Key,
          membership.user.id,
          now,
          reportId,
          membership.workspace.id,
          expectedVersion,
        ),
      context.env.DB
        .prepare(
          `INSERT INTO report_versions (report_id, version, r2_key, created_by, created_at)
           SELECT ?1, ?2, ?3, ?4, ?5
           WHERE EXISTS (
             SELECT 1 FROM reports
             WHERE id = ?1 AND version = ?2 AND current_r2_key = ?3
           )`,
        )
        .bind(reportId, version, r2Key, membership.user.id, now),
      context.env.DB
        .prepare(
          `INSERT INTO audit_log
           (id, workspace_id, user_id, action, object_type, object_id, details_json, created_at)
           SELECT ?1, ?2, ?3, 'report.update', 'report', ?4, ?5, ?6
           WHERE EXISTS (
             SELECT 1 FROM reports
             WHERE id = ?4 AND version = ?7 AND current_r2_key = ?8
           )`,
        )
        .bind(
          `aud_${crypto.randomUUID()}`,
          membership.workspace.id,
          membership.user.id,
          reportId,
          JSON.stringify({ version }),
          now,
          version,
          r2Key,
        ),
    ]);

    if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
      await context.env.REPORTS_BUCKET.delete(r2Key);
      const latest = await accessibleReport(context.env.DB, membership, reportId);
      return conflict(latest);
    }
  } catch (cause) {
    await context.env.REPORTS_BUCKET.delete(r2Key);
    throw cause;
  }

  return json({ id: reportId, title, version, updatedAt: now });
}

async function accessibleReport(db, membership, reportId) {
  const row = await db
    .prepare(
      `SELECT id, title, version, current_r2_key, updated_at
       FROM reports
       WHERE id = ?1 AND workspace_id = ?2`,
    )
    .bind(reportId, membership.workspace.id)
    .first();
  if (!row) throw httpError(404, 'REPORT_NOT_FOUND', 'Report not found.');
  return row;
}

async function listMembers(db, membership) {
  const result = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name AS displayName, m.role, m.created_at AS createdAt
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.workspace_id = ?1
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.email`,
    )
    .bind(membership.workspace.id)
    .all();
  return json({ members: result.results || [] });
}

async function upsertMember(context, membership) {
  const body = await readJson(context.request, 32 * 1024);
  const email = normalizeEmail(body.email);
  const role = String(body.role || '').trim().toLowerCase();
  if (!email || email.length > 320) throw httpError(400, 'INVALID_EMAIL', 'A valid email is required.');
  if (!MEMBER_ROLES.has(role)) throw httpError(400, 'INVALID_ROLE', 'Invalid member role.');
  if (email === normalizeEmail(membership.user.email) && role !== 'owner') {
    throw httpError(400, 'OWNER_SELF_DEMOTION', 'The active owner cannot demote their own account.');
  }

  const now = new Date().toISOString();
  const candidateId = `usr_${crypto.randomUUID()}`;
  await context.env.DB.batch([
    context.env.DB
      .prepare(
        `INSERT INTO users (id, email, display_name, created_at, last_seen_at)
         VALUES (?1, ?2, ?2, ?3, ?3)
         ON CONFLICT(email) DO NOTHING`,
      )
      .bind(candidateId, email, now),
    context.env.DB
      .prepare(
        `INSERT INTO memberships (workspace_id, user_id, role, created_at)
         SELECT ?1, id, ?2, ?3 FROM users WHERE email = ?4
         ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = excluded.role`,
      )
      .bind(membership.workspace.id, role, now, email),
    auditStatement(context.env.DB, membership, 'member.upsert', 'member', email, { role }, now),
  ]);
  return json({ email, role }, 201);
}

async function readJson(request, limit = MAX_JSON_BYTES) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw httpError(415, 'JSON_REQUIRED', 'Content-Type must be application/json.');
  }
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > limit) throw httpError(413, 'REQUEST_TOO_LARGE', 'Request is too large.');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > limit) {
    throw httpError(413, 'REQUEST_TOO_LARGE', 'Request is too large.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw httpError(400, 'INVALID_JSON', 'Request body is not valid JSON.');
  }
}

function assertReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw httpError(400, 'INVALID_REPORT', 'report must be a JSON object.');
  }
  return report;
}

function auditStatement(db, membership, action, objectType, objectId, details, now) {
  return db
    .prepare(
      `INSERT INTO audit_log
       (id, workspace_id, user_id, action, object_type, object_id, details_json, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      `aud_${crypto.randomUUID()}`,
      membership.workspace.id,
      membership.user.id,
      action,
      objectType,
      objectId,
      JSON.stringify(details || {}),
      now,
    );
}

function requireWriteRole(membership) {
  if (!WRITE_ROLES.has(membership.role)) {
    throw httpError(403, 'READ_ONLY', 'Your workspace role is read-only.');
  }
}

function requireOwner(membership) {
  if (membership.role !== 'owner') {
    throw httpError(403, 'OWNER_REQUIRED', 'Workspace owner permission is required.');
  }
}

function conflict(row) {
  return error(
    'VERSION_CONFLICT',
    'The report was changed by another user. Reload it before saving again.',
    409,
    { currentVersion: Number(row.version), updatedAt: row.updated_at },
  );
}

function reportObjectKey(workspaceId, reportId, version) {
  return `workspaces/${workspaceId}/reports/${reportId}/v${version}-${crypto.randomUUID()}.json`;
}

function cleanTitle(value) {
  const title = String(value || '').trim().slice(0, 160);
  return title || 'Shared report';
}

function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.display_name || user.email };
}

function normalizePath(value) {
  const parts = Array.isArray(value) ? value : [value];
  return parts.flatMap((part) => String(part || '').split('/')).filter(Boolean);
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function normalizeAccessDomain(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return '';
  }
}

function getAccessJwt(request) {
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (assertion) return assertion.trim();
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function decodeBase64UrlText(value) {
  return new TextDecoder().decode(decodeBase64UrlBytes(value));
}

function decodeBase64UrlBytes(value) {
  const base64 = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function httpError(status, code, message) {
  const cause = new Error(message);
  cause.status = status;
  cause.code = code;
  return cause;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: SECURITY_HEADERS });
}

function error(code, message, status, details) {
  return json({ error: { code, message, ...(details || {}) } }, status);
}
