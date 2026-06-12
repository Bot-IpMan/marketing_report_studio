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
const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

const response = await worker.fetch(
  new Request('https://example.com/marketing_report_studio_v8_access_folders_fixed'),
  env,
  ctx,
);

assert.equal(response.status, 200);
assert.deepEqual(assetRequests, ['/']);
console.log('Worker route smoke test passed.');
