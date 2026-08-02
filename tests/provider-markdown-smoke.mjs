import assert from 'node:assert/strict';

await import('../src/features/provider-result-adapter.js');
await import('../src/features/markdown-report-builder.js');

const adapter=globalThis.MRSProviderResults;
const builder=globalThis.MRSProviderMarkdown;
assert.ok(builder,'Markdown builder must expose MRSProviderMarkdown.');

const artifact={
  artifact_type:'provider_result_json',job_id:'job-42',target:'dropopt.com.ua',provider_code:'lighthouse',produced_at:'2026-08-02T10:00:00.000Z',
  result:{normalized_result:{status:'partial',coverage:'PARTIAL',findings:[{category:'performance',metric:'LCP',value:3618,unit:'ms',severity:'high'}],warnings:[{class:'provider_error',reason:'timeout'}]},provider_result:{scores:{performance:0.62},lab_metrics:{LCP:{numeric_value:3618},TBT:{numeric_value:2300}}}}
};
const bundle=adapter.buildBundle(adapter.groupArtifacts([artifact])[0]);
const options={generatedAt:'2026-08-02T12:00:00.000Z',locale:'uk'};
const first=builder.createGeneratedReport(bundle,options);
const second=builder.createGeneratedReport(bundle,options);
assert.equal(first.id,`generated:provider-audit:${bundle.bundleId}`);
assert.equal(first.format,'markdown');
assert.equal(first.generationMode,'deterministic');
assert.equal(first.sourceKind,'provider-result-adapter');
assert.deepEqual(first.sourceArtifactIds,bundle.artifactIds);
assert.equal(first.content,second.content,'Fixed normalized input and generation time must produce stable Markdown.');
assert.match(first.content,/## Обмеження та покриття/);
assert.match(first.content,/PARTIAL/);
assert.match(first.content,/timeout/);
assert.match(first.content,/LCP/);
assert.equal(first.content.includes('Проблем не виявлено.'),false,'Partial coverage must not create a negative claim.');
assert.equal(builder.renderMarkdown('# Заголовок\n\n- пункт\n\n| A | B |\n| --- | ---: |\n| x | 1 |').includes('<table>'),true);
assert.equal(builder.sanitizeMarkdownForDisplay('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
console.log('Provider Markdown smoke test passed.');
