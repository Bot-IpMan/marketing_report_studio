import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wrangler = readFileSync('wrangler.toml', 'utf8');
const html = readFileSync('marketing_report_studio_v8_access_folders_fixed.html', 'utf8');
const appSource = readFileSync('app.js', 'utf8');
const buildScript = readFileSync('scripts/build.mjs', 'utf8');
const api = readFileSync('functions/api/[[path]].js', 'utf8');
const worker = readFileSync('worker.js', 'utf8');

assert.doesNotMatch(
  wrangler,
  /keep_vars|d1_databases|r2_buckets|REPORTS_BUCKET|ACCESS_AUD/,
  'browser-only deployment must not declare server storage or Access variables',
);
assert.match(api, /API_DISABLED/, 'Pages fallback API must remain disabled');
assert.doesNotMatch(api, /env\.DB|REPORTS_BUCKET|fetch\(/, 'disabled API must not access storage or the network');
assert.match(worker, /API_DISABLED/, 'Worker API routes must remain disabled');
assert.doesNotMatch(worker, /functions\/api|REPORTS_BUCKET|env\.DB/, 'Worker must not import or use the legacy backend');

assert.match(html, /id="uploadFilesBtn"/, 'UI must expose a file upload button');
assert.match(html, /id="fileInput"[^>]+multiple/, 'file input must allow multiple files');
assert.match(html, /<section class="panel analytics">/, 'UI must keep the charts zone');
assert.match(html, /<section class="panel reader">/, 'UI must keep the open-files zone');
assert.match(html, /<aside class="panel files">/, 'UI must keep the file-system zone');
assert.match(html, /data-theme="dark"/, 'dark theme should remain available');
assert.match(appSource, /const BROWSER_ONLY_MODE = true/, 'hosted UI must be locked to browser-only mode');
assert.match(appSource, /if\(BROWSER_ONLY_MODE\)/, 'network API calls must have a browser-only guard');
assert.doesNotMatch(appSource, /\bfetch\s*\(/, 'standalone UI must not contain a network request path');
assert.match(appSource, /MAX_IMPORT_FILE_BYTES/, 'file imports must have a size limit');
assert.match(appSource, /MAX_ARCHIVE_UNCOMPRESSED_BYTES/, 'compressed imports must have an expanded-size limit');
assert.match(appSource, /sandbox="" referrerpolicy="no-referrer"/, 'embedded file previews must be sandboxed');

assert.match(buildScript, /favicon\.svg/, 'build should emit a favicon');
assert.match(buildScript, /"connect-src 'none'"/, 'hosted CSP must block all browser network connections');
assert.match(buildScript, /"img-src 'self' data: blob:"/, 'hosted CSP must block remote image loads');
assert.match(buildScript, /Strict-Transport-Security: max-age=31536000/, 'hosted build must enable HSTS');
assert.match(buildScript, /Cross-Origin-Opener-Policy: same-origin/, 'hosted build must isolate the top-level window');
assert.doesNotMatch(buildScript, /_routes\.json/, 'browser-only build must not emit Pages Functions routing');

console.log('Config and UI smoke test passed.');
