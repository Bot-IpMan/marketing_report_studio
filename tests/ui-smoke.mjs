import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('marketing_report_studio_v8_access_folders_fixed.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
const executable = scripts
  .filter((match) => !/\bsrc\s*=/i.test(match[1]) && !/application\/json/i.test(match[1]))
  .map((match) => match[2]);

assert.ok(executable.length > 0, 'Expected an executable inline script.');
for (const source of executable) new Function(source);

for (const marker of [
  'id="appNotice"',
  'id="uploadFilesBtn"',
  'function openDataModal()',
  'function inspectCsvInput(text)',
  'function handleModalKeydown(e)',
  'function showImportSuccess(ds',
  'Показано перші ${rowLimit}',
]) {
  assert.ok(html.includes(marker), `Missing UX marker: ${marker}`);
}

assert.match(html, /id="dropZone" class="drop adminOnly"/);
assert.match(html, /id="readerPanelTitle">Робоча область</);
assert.match(html, /document\.addEventListener\('keydown',handleModalKeydown\)/);
assert.match(html, /\$\('pasteBtn'\)\.onclick=\(\)=>openDataModal\(\)/);

const staticHtml = html.slice(0, html.indexOf('<script type="application/json"'));
const ids = [...staticHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Static HTML contains duplicate IDs.');
console.log('UI smoke test passed.');
