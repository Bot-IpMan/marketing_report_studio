import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wrangler = readFileSync('wrangler.toml', 'utf8');
const html = readFileSync('marketing_report_studio_v8_access_folders_fixed.html', 'utf8');
const buildScript = readFileSync('scripts/build.mjs', 'utf8');

assert.match(wrangler, /\[\[d1_databases\]\]/, 'production wrangler.toml must declare the D1 DB binding');
assert.match(wrangler, /binding\s*=\s*"DB"/, 'D1 binding must be named DB');
assert.match(wrangler, /database_name\s*=\s*"marketing-report-studio"/, 'D1 database name must match deployment docs');
assert.match(wrangler, /database_id\s*=\s*"[^"]+"/, 'D1 database_id field must be present for deploy');
assert.match(wrangler, /\[\[r2_buckets\]\]/, 'production wrangler.toml must declare the R2 bucket binding');
assert.match(wrangler, /binding\s*=\s*"REPORTS_BUCKET"/, 'R2 binding must be named REPORTS_BUCKET');
assert.match(wrangler, /bucket_name\s*=\s*"marketing-report-studio-reports"/, 'R2 bucket name must match deployment docs');

assert.match(html, /id="uploadFilesBtn"/, 'UI must expose a visible file upload button');
assert.match(html, /id="fileInput"[^>]+multiple/, 'hidden file input must allow multiple files');
assert.match(html, /uploadFilesBtn'\)\.onclick=\(\)=>\$\('fileInput'\)\.click\(\)/, 'file upload button must open the file picker');
assert.match(html, /fileInput'\)\.addEventListener\('change',/, 'file input changes must import selected files');
assert.match(html, /aria-label="Вставити CSV"/, 'mobile paste button must keep an accessible name');
assert.match(html, /aria-label="Завантажити файли"/, 'file upload button must keep an accessible name');

assert.match(buildScript, /favicon\.svg/, 'build should emit a favicon to avoid production 404');

console.log('Config and UI smoke test passed.');
