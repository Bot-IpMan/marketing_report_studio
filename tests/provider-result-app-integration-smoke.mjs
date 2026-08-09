import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../app.js',import.meta.url),'utf8');

const rebuild=app.match(/function rebuildProviderResultAudits\(\)\{[\s\S]*?\n\}/)?.[0]||'';
assert.match(rebuild,/MRS_PROVIDER_MARKDOWN\.createGeneratedReport/,'Provider rebuild must call the Markdown module API it actually exports.');
assert.doesNotMatch(rebuild,/buildAuditMarkdown/,'Provider rebuild must not call the retired Markdown API.');
assert.doesNotMatch(rebuild,/key!=='crawl_pages'/,'Crawl rebuild must not discard derived provider datasets.');
assert.match(rebuild,/Object\.entries\(audit\.providerDatasets\|\|\{\}\)/,'Provider rebuild must iterate every adapter dataset.');
assert.match(rebuild,/sourceAnchor:\{kind:key\}/,'Provider datasets must preserve the adapter dataset key as provenance.');
for (const chartDatasetKey of ['crawl_status_distribution', 'crawl_link_totals', 'crawl_content_length_distribution', 'crawl_pages']) {
  assert.match(rebuild, new RegExp(`addCrawlChart\\(['"]${chartDatasetKey}['"]`), `Crawl rebuild must chart ${chartDatasetKey}.`);
}
assert.match(app,/MRS_PROVIDER_MARKDOWN\.renderMarkdown\(report\.content\)/,'Generated reports must render safe Markdown instead of only showing raw syntax.');

const deletion=app.match(/function deleteEmbeddedFileById\(fileId\)\{[\s\S]*?\n\}/)?.[0]||'';
assert.match(deletion,/REPORT\.files=.*filter[\s\S]*rebuildProviderResultAudits\(\)/,'Deleting a source file must rebuild provider-derived state after removing that file.');

const folderDeletion=app.match(/function deleteEmbeddedFolderByKey\(folderKey\)\{[\s\S]*?\n\}/)?.[0]||'';
assert.match(folderDeletion,/REPORT\.files=.*filter[\s\S]*rebuildProviderResultAudits\(\)/,'Deleting a source folder must rebuild provider-derived state after removing its files.');

console.log('Provider Result app integration smoke test passed.');