import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(projectRoot, 'dist');

assert.ok(existsSync(resolve(distRoot, 'index.html')), 'dist/index.html must exist; run npm run build before hosted asset QA.');
assert.ok(existsSync(resolve(distRoot, 'vendor/pdfjs/pdf.min.mjs')), 'dist must include vendored PDF.js module.');
assert.ok(existsSync(resolve(distRoot, 'vendor/pdfjs/pdf.worker.min.mjs')), 'dist must include vendored PDF.js worker.');
assert.ok(existsSync(resolve(distRoot, 'src/features/document-extract.js')), 'dist must include document extraction module.');
assert.ok(existsSync(resolve(distRoot, 'app.js')), 'dist must include app.js.');

const port = await freePort();
const server = await startDistServer(port);

try {
  const checks = [
    { path: '/', status: 200, type: /^text\/html\b/i, body: /Marketing Report Studio|workspaceTopbar/i },
    { path: '/app.js', status: 200, type: /^(?:text|application)\/javascript\b/i, body: /PDFJS_MODULE_SRC|loadPdfJs/ },
    { path: '/src/features/document-extract.js', status: 200, type: /^(?:text|application)\/javascript\b/i, body: /extractPdfDocument|PDFJS_MODULE_LOAD_FAILED/ },
    { path: '/vendor/pdfjs/pdf.min.mjs', status: 200, type: /^(?:text|application)\/javascript\b/i, body: /pdfjs|PDFJS|GlobalWorkerOptions/i, minBytes: 100000 },
    { path: '/vendor/pdfjs/pdf.worker.min.mjs', status: 200, type: /^(?:text|application)\/javascript\b/i, body: /WorkerMessageHandler|pdfjs/i, minBytes: 100000 },
  ];

  for (const check of checks) {
    const response = await request(port, check.path);
    assert.equal(response.status, check.status, `${check.path} returned unexpected HTTP status.`);
    assert.match(response.headers['content-type'] || '', check.type, `${check.path} returned an unsafe content type.`);
    if (check.path !== '/') assert.doesNotMatch(response.body.slice(0, 200), /<!doctype html>|<html\b/i, `${check.path} must not serve an HTML fallback.`);
    assert.match(response.body, check.body, `${check.path} body did not look like the expected asset.`);
    if (check.minBytes) assert.ok(response.bytes >= check.minBytes, `${check.path} was too small to be the real asset.`);
  }

  const missing = await request(port, '/vendor/pdfjs/not-found.mjs');
  assert.equal(missing.status, 404, 'missing hosted assets must return 404, not the HTML shell.');

  console.log('Hosted asset smoke test passed.');
} finally {
  await new Promise((resolveServer) => server.close(resolveServer));
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

function startDistServer(port) {
  const distRootPrefix = distRoot.endsWith(sep) ? distRoot : distRoot + sep;
  const types = {
    '.html': 'text/html;charset=utf-8',
    '.js': 'text/javascript;charset=utf-8',
    '.mjs': 'text/javascript;charset=utf-8',
    '.css': 'text/css;charset=utf-8',
    '.json': 'application/json;charset=utf-8',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain;charset=utf-8',
  };
  const server = http.createServer((incoming, outgoing) => {
    try {
      const url = new URL(incoming.url || '/', `http://127.0.0.1:${port}`);
      const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const target = resolve(distRoot, `.${pathname}`);
      if (target !== distRoot && !target.startsWith(distRootPrefix)) {
        outgoing.writeHead(403, { 'Content-Type': 'text/plain;charset=utf-8' });
        outgoing.end('Forbidden');
        return;
      }
      if (!existsSync(target) || !statSync(target).isFile()) {
        outgoing.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
        outgoing.end('Not found');
        return;
      }
      const ext = target.match(/\.[^.\\/]+$/)?.[0]?.toLowerCase() || '';
      outgoing.writeHead(200, {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      createReadStream(target).pipe(outgoing);
    } catch (error) {
      outgoing.writeHead(500, { 'Content-Type': 'text/plain;charset=utf-8' });
      outgoing.end(error.message);
    }
  });
  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolveServer(server));
  });
}

function request(port, path) {
  return new Promise((resolveRequest, reject) => {
    const requestHandle = http.get({ host: '127.0.0.1', port, path, timeout: 5000 }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        resolveRequest({
          status: response.statusCode,
          headers: response.headers,
          bytes: bodyBuffer.length,
          body: bodyBuffer.toString('utf8'),
        });
      });
    });
    requestHandle.on('error', reject);
    requestHandle.on('timeout', () => requestHandle.destroy(new Error(`Timed out requesting ${path}`)));
  });
}
