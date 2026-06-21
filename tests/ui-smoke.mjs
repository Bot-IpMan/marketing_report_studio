import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('marketing_report_studio_v8_access_folders_fixed.html', 'utf8');
const appSource = readFileSync('app.js', 'utf8');

new vm.Script(appSource);

for (const marker of [
  '<script src="vendor/jszip-3.10.1.min.js"></script>',
  '<script src="app.js"></script>',
  'id="appNotice"',
  'id="uploadFilesBtn"',
]) {
  assert.ok(html.includes(marker), `Missing HTML UX marker: ${marker}`);
}

for (const marker of [
  'function openDataModal()',
  'function inspectCsvInput(text)',
  'function handleModalKeydown(e)',
  'function showImportSuccess(ds',
  'Показано перші ${rowLimit}',
]) {
  assert.ok(appSource.includes(marker), `Missing app UX marker: ${marker}`);
}

assert.match(html, /id="dropZone" class="drop adminOnly"/);
assert.match(html, /id="readerPanelTitle">Робоча область</);
assert.match(appSource, /document\.addEventListener\('keydown',handleModalKeydown\)/);
assert.match(appSource, /\$\('pasteBtn'\)\.onclick=\(\)=>openDataModal\(\)/);

const staticHtml = html.slice(0, html.indexOf('<script type="application/json"'));
const ids = [...staticHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Static HTML contains duplicate IDs.');
console.log('UI smoke test passed.');
