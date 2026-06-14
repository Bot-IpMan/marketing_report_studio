import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]].js';

for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
  const response = await onRequest({
    request: new Request('https://example.com/api/reports', { method }),
    env: {},
    params: { path: ['reports'] },
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'API_DISABLED');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
  assert.equal(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
}

console.log('Disabled API smoke test passed.');
