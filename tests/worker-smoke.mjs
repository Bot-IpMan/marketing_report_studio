import assert from 'node:assert/strict';
import worker from '../worker.js';

const assetRequests = [];
const env = {
  ASSETS: {
    async fetch(request) {
      assetRequests.push(new URL(request.url).pathname);
      return new Response('asset', { status: 200 });
    },
  },
};

const legacyResponse = await worker.fetch(
  new Request('https://example.com/marketing_report_studio_v8_access_folders_fixed'),
  env,
);
assert.equal(legacyResponse.status, 308);
assert.equal(legacyResponse.headers.get('Location'), '/');
assert.deepEqual(assetRequests, []);

const healthResponse = await worker.fetch(new Request('https://example.com/api/health'), env);
assert.equal(healthResponse.status, 404);
assert.equal((await healthResponse.json()).error.code, 'API_DISABLED');
assert.equal(healthResponse.headers.get('Strict-Transport-Security'), 'max-age=31536000');
assert.deepEqual(assetRequests, []);

const assetResponse = await worker.fetch(new Request('https://example.com/app.css'), env);
assert.equal(assetResponse.status, 200);
assert.deepEqual(assetRequests, ['/app.css']);

const postResponse = await worker.fetch(
  new Request('https://example.com/app.css', { method: 'POST', body: 'x' }),
  env,
);
assert.equal(postResponse.status, 405);
assert.equal(postResponse.headers.get('Allow'), 'GET, HEAD');
assert.deepEqual(assetRequests, ['/app.css']);

console.log('Worker route smoke test passed.');
