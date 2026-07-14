import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wrangler = readFileSync('wrangler.toml', 'utf8');
const html = readFileSync('marketing_report_studio_v8_access_folders_fixed.html', 'utf8');
const appSource = readFileSync('app.js', 'utf8');
const buildScript = readFileSync('scripts/build.mjs', 'utf8');
const api = readFileSync('functions/api/[[path]].js', 'utf8');
const worker = readFileSync('worker.js', 'utf8');
const sourceBundle = [wrangler, html, appSource, buildScript, api, worker].join('\n');

assert.doesNotMatch(
  wrangler,
  /keep_vars|d1_databases|r2_buckets|REPORTS_BUCKET|ACCESS_AUD/,
  'browser-only deployment must not declare server storage or Access variables',
);
assert.match(api, /API_DISABLED/, 'Pages fallback API must remain disabled');
assert.doesNotMatch(api, /if \(path === 'ai\/status'\)|if \(path === 'ai\/preview'\)/, 'default API routes must not expose AI endpoints');
assert.match(worker, /API_DISABLED/, 'Worker API routes must remain disabled');
assert.doesNotMatch(worker, /functions\/api|REPORTS_BUCKET|env\.DB/, 'Worker must not import or use the legacy backend');

for (const marker of [
  'id="pasteBtn"',
  'id="saveClientHtmlBtn"',
  'id="saveDiskBtn"',
  'id="fileInput" class="hiddenInput" multiple',
  '<section class="panel analytics" data-workspace-panel="analytics" data-workspace-slot="top">',
  '<section class="panel reader" data-workspace-panel="reader" data-workspace-slot="bottom">',
  '<aside class="panel files materialsPanel" data-workspace-panel="files" data-workspace-slot="side">',
  'Summary + Charts',
  'Table / File Content',
  'Project files',
  'Search project files...',
]) {
  assert.ok(html.includes(marker), `Missing simple workspace marker: ${marker}`);
}

assert.match(html, /grid-template-columns:minmax\(260px,1fr\) 12px minmax\(260px,var\(--workspace-side,360px\)\)/, 'default workspace must expose a resizable right file tree.');
assert.match(html, /grid-template-rows:minmax\(220px,var\(--workspace-top,46%\)\) 12px minmax\(260px,1fr\)/, 'default workspace must expose a resizable summary/table split.');
assert.match(html, /body:has\(\.app\[data-theme="light"\]\):before/, 'light theme body background selector must match the app theme');
for (const id of ['clientReportBtn', 'saveHtmlBtn', 'saveClientPackageBtn', 'exportJsonBtn', 'internalAuditPackageBtn']) {
  const tag = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>|<button[^>]*class="[^"]*hidden[^"]*"[^>]*id="${id}"[^>]*>`))?.[0] || '';
  assert.match(tag, /\bhidden\b/, `${id} must be hidden from the default UI`);
}

assert.match(appSource, /const BROWSER_ONLY_MODE = true/, 'hosted UI must be locked to browser-only mode');
assert.match(appSource, /if\(BROWSER_ONLY_MODE\)/, 'network API calls must have a browser-only guard');
assert.doesNotMatch(appSource, /fetch\s*\(\s*['"`]https?:\/\//, 'standalone UI must not call external services');
assert.match(appSource, /const pdfjs=await import\(moduleUrl\)/, 'PDF extraction must import the local PDF.js module directly');
assert.doesNotMatch(appSource, /fetch\(url,\{method:'HEAD'/, 'PDF extraction must not use a CSP-blocked asset preflight request');
assert.match(appSource, /function replaceTranslatedPhrase\(text, from, to\)/, 'translation replacements must use phrase boundaries');
assert.doesNotMatch(appSource, /text=text\.split\(from\)\.join\(to\)/, 'translation must not replace words inside product names like Marketing');
assert.match(appSource, /function renderSimpleDashboard\(ds\)/, 'default UI must render summary cards and auto charts');
assert.match(appSource, /function renderSimpleTablePreview\(ds/, 'default UI must render the searchable table preview');
assert.match(appSource, /function renderSimpleProjectTree\(\)/, 'default UI must render the simple project file tree');
assert.match(appSource, /function setupWorkspacePanelDrag\(\)/, 'workspace panels must be draggable between layout areas');
assert.match(appSource, /function autoChartConfigsForTable\(ds/, 'default UI must generate rule-based automatic charts from table columns');
assert.match(appSource, /MRS_CHART_CANDIDATES\.createChartCandidateRegistry/, 'default analysis must use the universal chart registry');
assert.match(appSource, /MRS_DERIVED_TABLES\.createDerivedTableRegistry/, 'default analysis must expose derived-table candidates');
assert.match(appSource, /const PDFJS_MODULE_SRC = 'vendor\/pdfjs\/pdf\.min\.mjs'/, 'PDF extraction must use the vendored PDF.js module');
assert.match(appSource, /const ANALYSIS_WORKER_SRC = 'src\/workers\/analysis\.worker\.js'/, 'analysis Worker must be local');
assert.match(appSource, /MRS_STORAGE\.saveReport/, 'structured autosave must use the IndexedDB storage layer');
assert.match(appSource, /function runSimpleDashboardExportChecklist\(reportData\)/, 'simple export must not depend on evidence readiness');
assert.match(appSource, /function renderSimpleDashboardExportHtml\(reportData\)/, 'simple export must render a static dashboard report');
assert.match(appSource, /data-client-locked="true"/, 'simple client export must be clientLocked');
assert.match(appSource, /data-simple-show-more/, 'file tree must expose visible show-more controls');
assert.doesNotMatch(appSource, /files\.slice\(0,120\)|documents\.slice\(0,80\)|images\.slice\(0,80\)/, 'file tree must not silently truncate files');
assert.match(appSource, /const MAX_IMPORT_FILES = 500/, 'file importer must allow hundreds of files per batch');
assert.match(appSource, /\[data-file-drop-zone\],#materialsDropZone,\.simpleEmptyDrop/, 'all visible drop zones must accept dropped files');
assert.doesNotMatch(appSource, /setTimeout\(maybeOpenOnboardingWizard,900\)/, 'complex onboarding must not auto-open in the simple default UI');

assert.match(buildScript, /"connect-src 'none'"/, 'hosted CSP must block all browser network connections');
assert.match(buildScript, /"img-src 'self' data: blob:"/, 'hosted CSP must block remote image loads');
assert.match(buildScript, /Strict-Transport-Security: max-age=31536000/, 'hosted build must enable HSTS');
assert.match(buildScript, /Cross-Origin-Opener-Policy: same-origin/, 'hosted build must isolate the top-level window');
assert.doesNotMatch(buildScript, /_routes\.json/, 'browser-only build must not emit Pages Functions routing');
assert.doesNotMatch(sourceBundle, /static\.cloudflareinsights\.com|beacon\.min\.js|cloudflareinsights/i, 'repo must not include analytics beacon code');
assert.doesNotMatch(sourceBundle, /<script[^>]+https?:\/\//i, 'the browser shell must not load scripts from a CDN');

console.log('Config and simple UI smoke test passed.');
