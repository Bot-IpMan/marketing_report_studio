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

const crawlArtifact={
  artifact_type:'provider_result_json',job_id:'crawl-job-1',provider_code:'crawl4ai',produced_at:'2026-08-01T08:36:00.000Z',
  result:{normalized_result:{status:'completed',coverage:'FULL',evidence:[{source_url:'https://dropopt.com.ua/'}],findings:[
    {category:'content',metric:'pages_crawled',value:100,confidence:1},
    {category:'website',metric:'page_observation',value:{url:'https://dropopt.com.ua/',status_code:200,title:'DropOpt',internal_links:16,external_links:3},confidence:1}
  ],warnings:[]},provider_result:{summary:{pages_by_status:{200:100},internal_links_total:4655,external_links_total:208,documents_total:0},limitations:['Crawl is bounded by same-origin policy and page budget'],pages:[{url:'https://dropopt.com.ua/',title:'DropOpt',status:200,internal_links:16,external_links:3}]}}
};
const crawlBundle=adapter.buildNormalizedAudit(adapter.groupArtifacts([crawlArtifact])[0]);
const crawlReport=builder.createGeneratedReport(crawlBundle,options);
assert.equal(crawlBundle.target,'dropopt.com.ua','Evidence source URL must provide target provenance when the top-level target is absent.');
assert.equal(crawlBundle.datasets.audit_provider_summary[0].warnings_total,1,'Provider crawl limitations must contribute to the visible warning total.');
assert.equal(crawlBundle.datasets.audit_warnings.some(row=>row.reason.includes('page budget')),true,'Provider crawl limitations must remain visible as audit warnings.');
assert.match(crawlReport.content,/## Огляд Crawl4AI/,'Crawl results require a dedicated executive summary.');
assert.match(crawlReport.content,/## Якість інвентарю сторінок/,'Crawl report must expose a compact page-quality table.');
assert.match(crawlReport.content,/## Топ сторінок за внутрішніми посиланнями/,'Crawl report must expose bounded top-page evidence.');
assert.match(crawlReport.content,/100/,'Crawl totals must be represented in the Markdown report.');
assert.match(crawlReport.content,/page budget/,'Provider crawl limitation must appear in Markdown.');
assert.equal(crawlReport.content.includes('page_observation'),false,'Raw page-observation records must not flood executive findings.');
assert.equal(builder.renderMarkdown('# Заголовок\n\n- пункт\n\n| A | B |\n| --- | ---: |\n| x | 1 |').includes('<table>'),true);
assert.equal(builder.sanitizeMarkdownForDisplay('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
console.log('Provider Markdown smoke test passed.');
