import assert from 'node:assert/strict';

await import('../src/features/provider-result-adapter.js');

const adapter=globalThis.MRSProviderResults;
assert.ok(adapter,'Provider Result Adapter must expose MRSProviderResults.');

const common={
  artifact_type:'provider_result_json',
  job_id:'job-dropopt-20260802',
  target:'dropopt.com.ua',
  produced_at:'2026-08-02T10:00:00.000Z'
};
const pagespeed={
  ...common,
  provider_code:'pagespeed',
  result:{
    normalized_result:{status:'completed',coverage:'FULL',findings:[{category:'performance',metric:'performance_score',value:0.99,unit:'score'}],warnings:[]},
    provider_result:{records:[{form_factor:'mobile',performance_score:0.99},{form_factor:'desktop',performance_score:1}]}
  }
};
const lighthouse={
  ...common,
  provider_code:'lighthouse',
  result:{
    normalized_result:{status:'completed',coverage:'FULL',findings:[{category:'performance',metric:'LCP',value:3618,unit:'ms'}],warnings:[]},
    provider_result:{scores:{performance:0.62,accessibility:0.93},lab_metrics:{LCP:{numeric_value:3618},TBT:{numeric_value:2300}}}
  }
};
const accessibility={
  ...common,
  provider_code:'browser_accessibility',
  result:{
    normalized_result:{status:'partial',coverage:'PARTIAL',findings:[],warnings:[{class:'provider_error',reason:'desktop HTTP 500'}]},
    provider_result:{records:[{form_factor:'mobile',accessibility:{violations:[{id:'color-contrast',impact:'serious',description:'Low contrast',nodes:[{target:['footer a']}]}]}}]}
  }
};
const crawl={
  ...common,
  provider_code:'crawl4ai',
  result:{
    normalized_result:{status:'completed',coverage:'FULL',findings:[],warnings:[]},
    provider_result:{pages:[{url:'https://dropopt.com.ua/',title:'Home',page_type:'homepage',text_length:4200,markdown:'RAW_CRAWL_BODY_MUST_NOT_APPEAR',internal_links:12,external_links:2,images:4,h1:'Shop',status:200}]}
  }
};

assert.equal(adapter.isProviderResultArtifact(pagespeed),true);
assert.equal(adapter.isProviderResultArtifact({artifact_type:'provider_result_json',provider_code:'x',result:{}}),false);
assert.deepEqual(adapter.scalarParts({nested:true}),{value_number:null,value_text:'',value_boolean:null,value_json:'{"nested":true}'});
assert.equal(adapter.scalarParts(Infinity).value_number,null);

const grouped=adapter.groupArtifacts([pagespeed,lighthouse,accessibility,crawl,{...pagespeed}]);
assert.equal(grouped.length,1,'Same job/target artifacts should produce one bundle.');
const bundle=adapter.buildBundle(grouped[0]);
assert.equal(bundle.datasets.audit_provider_summary.length,4,'Duplicate retry must be deduplicated.');
assert.equal(bundle.datasets.audit_findings.length,2);
assert.equal(bundle.datasets.audit_warnings.length,1);
assert.equal(bundle.providerDatasets.web_vitals.length,6,'PageSpeed form factors and Lighthouse scores/lab metrics should remain distinct normalized observations.');
assert.equal(bundle.providerDatasets.accessibility_violations.length,1);
assert.equal(bundle.providerDatasets.crawl_pages.length,1);
assert.equal(JSON.stringify(bundle.providerDatasets.crawl_pages).includes('RAW_CRAWL_BODY_MUST_NOT_APPEAR'),false);
assert.equal(bundle.datasets.audit_warnings[0].coverage,'PARTIAL');

const detailedCrawl={
  ...common,
  provider_code:'crawl4ai',
  result:{
    normalized_result:{status:'completed',coverage:'FULL',findings:[],warnings:[]},
    provider_result:{
      pages:[
        {url:'https://dropopt.com.ua/a',status_code:200,redirected_url:'https://dropopt.com.ua/a',metadata:{title:'A',description:'Опис A'},content:{markdown_characters:1400,markdown_excerpt:'# A'},links:{internal_total:4,external_total:2},media:{images_total:3,documents_total:1},tables:[{name:'t'}],network:{request_count:8},console:{error_count:1},crawl_stats:{retries:1,fallback_fetch_used:false},raw_markdown:'RAW_CRAWL_BODY_MUST_NOT_APPEAR'},
        {url:'https://dropopt.com.ua/b',status_code:404,redirected_url:'',metadata:{title:'B'},content:{markdown_characters:7200,markdown_excerpt:'No heading'},links:{internal_total:12,external_total:1},media:{images_total:0,documents_total:0},tables:[],network:{request_count:4},console:{error_count:0},crawl_stats:{retries:0,fallback_fetch_used:true}}
      ],
      summary:{pages_by_status:{'200':1,'404':1},internal_links_total:16,external_links_total:3,documents_total:1}
    }
  }
};
const detailed=adapter.buildBundle([detailedCrawl]);
assert.equal(detailed.providerDatasets.crawl_pages.length,2,'Crawl pages must stay as a readable per-page table.');
assert.deepEqual(detailed.providerDatasets.crawl_link_totals.map(row=>[row.link_type,row.count]),[['internal',16],['external',3]],'Link totals must be chart-ready rows.');
assert.deepEqual(detailed.providerDatasets.crawl_content_length_distribution.map(row=>[row.content_length_bucket,row.pages]),[['1–5 тис. символів',1],['5–10 тис. символів',1]],'Content distribution must be derived without page bodies.');
assert.deepEqual(detailed.providerDatasets.crawl_status_distribution.map(row=>[row.status_code,row.pages]),[[200,1],[404,1]],'Status distribution must preserve actual status counts.');
assert.equal(detailed.providerDatasets.crawl_pages[1].missing_description,true);
assert.equal(detailed.providerDatasets.crawl_pages[1].has_h1,false);
assert.equal(JSON.stringify(detailed.providerDatasets).includes('RAW_CRAWL_BODY_MUST_NOT_APPEAR'),false,'Raw page bodies must never leak into analytical datasets.');
assert.equal(bundle.providerDatasets.accessibility_violations[0].impact,'serious');

const conflict=adapter.groupArtifacts([pagespeed,{...lighthouse,target:'another.example'}]);
assert.equal(conflict.length,2,'Conflicting known targets must never be merged only by job_id.');

const normalizedTarget=adapter.groupArtifacts([pagespeed,{...lighthouse,target:'https://DROPOPT.COM.UA/path?source=test#top'}]);
assert.equal(normalizedTarget.length,1,'Equivalent URL and domain targets must share one normalized bundle.');

const distinctRuns=adapter.groupArtifacts([{...pagespeed,run_id:'run-a'},{...lighthouse,run_id:'run-b'}]);
assert.equal(distinctRuns.length,2,'Explicitly distinct provider runs must never be merged into one bundle.');

const largeA={...pagespeed,result:{...pagespeed.result,provider_result:{payload:`${'x'.repeat(5000)}A`}}};
const largeB={...pagespeed,result:{...pagespeed.result,provider_result:{payload:`${'x'.repeat(5000)}B`}}};
assert.notEqual(adapter.stableArtifactId(largeA),adapter.stableArtifactId(largeB),'Full artifact content must contribute to the artifact ID.');

const unknownProvider={...pagespeed,provider_code:'future_provider',result:{normalized_result:{status:'partial',coverage:'PARTIAL',findings:[],warnings:[]},provider_result:{}}};
const unknownBundle=adapter.buildBundle([unknownProvider]);
assert.equal(unknownBundle.datasets.audit_warnings.some(row=>row.warning_status==='UNSUPPORTED_PROVIDER_CODE'),true,'Unknown providers must be preserved with a fail-closed diagnostic.');

const noSuccessfulResults={...pagespeed,result:{...pagespeed.result,normalized_result:{...pagespeed.result.normalized_result,successful_results:undefined}}};
assert.equal(adapter.buildBundle([noSuccessfulResults]).datasets.audit_provider_summary[0].successful_results,null,'Missing successful_results must stay unknown rather than become zero.');

const clsArtifact={...pagespeed,result:{...pagespeed.result,provider_result:{records:[{form_factor:'mobile',cls:0.12}]}}};
assert.equal(adapter.buildBundle([clsArtifact]).providerDatasets.web_vitals[0].unit,'score','CLS must remain unitless score data.');

const normalized=adapter.buildNormalizedAudit(grouped[0]);
assert.equal(normalized.sourceArtifactIds.length,4);
assert.equal(normalized.providerDatasets.audit_provider_summary.length,4);
const collected=adapter.collectProviderArtifacts([{id:'file-1',name:'pagespeed.json',ext:'json',contentText:JSON.stringify(pagespeed)}]);
assert.equal(collected.length,1);
assert.equal(collected[0].sourceFileId,'file-1');

console.log('Provider Result Adapter smoke test passed.');
