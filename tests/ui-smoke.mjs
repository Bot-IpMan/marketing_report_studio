import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('marketing_report_studio_v8_access_folders_fixed.html', 'utf8');
const appSource = readFileSync('app.js', 'utf8');
const extractedScriptPaths = [
  'src/core/dom.js',
  'src/core/i18n.js',
  'src/features/materials.js',
  'src/features/export.js',
];

new vm.Script(appSource);
for (const scriptPath of extractedScriptPaths) {
  new vm.Script(readFileSync(scriptPath, 'utf8'));
}

for (const marker of [
  '<script src="src/core/dom.js"></script>',
  '<script src="src/core/i18n.js"></script>',
  '<script src="src/features/materials.js"></script>',
  '<script src="src/features/export.js"></script>',
  '<script src="app.js"></script>',
  'id="appNotice"',
  'id="pasteBtn"',
  'id="uploadFilesBtn"',
  'id="saveClientHtmlBtn"',
  'class="topbar workspaceTopbar"',
  'class="workspaceSearchBox"',
  'id="search" class="search select workspaceSearch" placeholder="Search project files..."',
  'id="materialsDropZone"',
  'Summary + Charts',
  'Table / File Content',
  'Project files',
]) {
  assert.ok(html.includes(marker), `Missing HTML UX marker: ${marker}`);
}

for (const marker of [
  'function openDataModal()',
  'function inspectCsvInput(text)',
  'function handleModalKeydown(e)',
  'function showImportSuccess(ds',
  'function classifyColumnType(name, values)',
  'function analyzeTable(ds)',
  'function autoChartConfigsForTable(ds',
  'function renderSimpleDashboard(ds)',
  'function renderSimpleTablePreview(ds',
  'function renderSimpleProjectTree()',
  'function runSimpleDashboardExportChecklist(reportData)',
  'function renderSimpleDashboardExportHtml(reportData)',
  'function buildSimpleClientPackageZip(reportData, reportHtml)',
  'function setupFileDropZones()',
  'function setupWorkspacePanelDrag()',
  'id="folderList" class="folderList"',
  'id="fileList" class="fileList"',
  'data-file-sort',
  'data-simple-show-more',
  'simpleDeleteBtn',
  'Delete file and tables created from it',
  '&times;',
  'simpleEmptyDrop',
  'Search project files...',
  'Add data',
  'Export report',
  "['mp4','mov','webm','avi','mkv']",
  "['ppt','pptx']",
  'Showing first ${renderLimit}',
]) {
  assert.ok(appSource.includes(marker), `Missing app UX marker: ${marker}`);
}

assert.match(html, /id="materialsDropZone" class="drop adminOnly materialsDropZone"/);
assert.match(html, /\.simpleDashboardSplit\{[\s\S]*grid-template-columns:minmax\(0,2\.3fr\) minmax\(230px,\.9fr\)/, 'simple dashboard should split charts and insights.');
assert.match(html, /\.simpleContentGrid\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(260px,340px\)/, 'simple table preview should pair table and row details.');
assert.match(html, /\.simpleTreeMore\{[\s\S]*justify-content:space-between/, 'file tree show-more rows should be visible and readable.');
assert.match(html, /data-workspace-panel="analytics" data-workspace-slot="top"/, 'summary panel must have a draggable workspace identity.');
assert.match(html, /data-workspace-handle/, 'workspace panel headers must expose a drag handle.');
assert.match(html, /grid-template-columns:minmax\(260px,1fr\) 12px minmax\(260px,var\(--workspace-side,360px\)\)/, 'workspace columns should include a resizable split track.');
assert.match(html, /\.simpleTreeItem \.simpleTreeAction\{[\s\S]*margin-left:auto/, 'table export action should push row actions to the right edge.');
assert.match(html, /\.simpleTreeItem \.simpleDeleteBtn\{[\s\S]*width:28px;[\s\S]*place-items:center/, 'file tree delete buttons should be square icon buttons.');
assert.match(html, /\.materialsFileName\{[\s\S]*text-overflow:ellipsis/, 'material filenames must truncate cleanly.');
assert.match(html, /\.materialsIcon\.unknown\{background:var\(--mrs-muted-2\)\}/, 'unknown file types should still get an icon style.');
assert.doesNotMatch(html, /<script src="vendor\/jszip-3\.10\.1\.min\.js"><\/script>/, 'JSZip should be lazy-loaded instead of blocking first load.');
assert.doesNotMatch(appSource, /files\.slice\(0,120\)|documents\.slice\(0,80\)|images\.slice\(0,80\)/, 'simple tree must not silently hide files.');
assert.doesNotMatch(appSource, /runReportQualityChecklist\(REPORT\);\s*if\(quality\.blockers\.length\)\{[\s\S]{0,220}saveClientHtml/, 'default client HTML export must not be blocked by evidence checklist.');
assert.doesNotMatch(appSource, /setTimeout\(maybeOpenOnboardingWizard,900\)/, 'complex onboarding must not auto-open in the default workspace.');

const staticHtml = html.slice(0, html.indexOf('<script type="application/json"'));
const ids = [...staticHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Static HTML contains duplicate IDs.');

console.log('Simple UI smoke test passed.');
