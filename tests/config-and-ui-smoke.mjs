import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wrangler = readFileSync('wrangler.toml', 'utf8');
const html = readFileSync('marketing_report_studio_v8_access_folders_fixed.html', 'utf8');
const buildScript = readFileSync('scripts/build.mjs', 'utf8');
const api = readFileSync('functions/api/[[path]].js', 'utf8');

assert.doesNotMatch(wrangler, /replace-with-|database_id\s*=\s*""/, 'deploy config must not contain placeholder Cloudflare resource IDs');
assert.match(wrangler, /keep_vars\s*=\s*true/, 'dashboard-managed production variables must be preserved');
assert.match(api, /env\.DB/, 'API must use the dashboard DB binding');
assert.match(api, /REPORTS_BUCKET/, 'API must use the dashboard report storage binding');

assert.match(html, /id="uploadFilesBtn"/, 'UI must expose a visible file upload button');
assert.match(html, /id="fileInput"[^>]+multiple/, 'hidden file input must allow multiple files');
assert.match(html, /uploadFilesBtn'\)\.onclick=\(\)=>\$\('fileInput'\)\.click\(\)/, 'file upload button must open the file picker');
assert.match(html, /fileInput'\)\.addEventListener\('change',/, 'file input changes must import selected files');
assert.match(html, /aria-label="Додати дані"/, 'mobile add-data button must keep an accessible name');
assert.match(html, /aria-label="Завантажити файли"/, 'file upload button must keep an accessible name');
assert.match(html, /<section class="panel analytics">/, 'UI must keep the charts zone');
assert.match(html, /<section class="panel reader">/, 'UI must keep the open-files zone');
assert.match(html, /<aside class="panel files">/, 'UI must keep the file-system zone');
assert.ok(html.includes('id="analyticsPanelTitle">Графіки</h2>'), 'charts zone title must be explicit');
assert.ok(html.includes('id="readerPanelTitle">Робоча область</h2>'), 'workspace zone title must be explicit');
assert.ok(html.includes('id="filesPanelTitle">Матеріали</h2>'), 'materials zone title must be explicit');
assert.match(html, /data-theme="dark"/, 'neon dashboard theme should be the default visual mode');
assert.match(html, /--brand3:#00e0c6/, 'visual theme must include the cyan/teal accent palette');

assert.match(buildScript, /favicon\.svg/, 'build should emit a favicon to avoid production 404');

console.log('Config and UI smoke test passed.');
