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
assert.equal(bundle.providerDatasets.accessibility_violations[0].impact,'serious');

const conflict=adapter.groupArtifacts([pagespeed,{...lighthouse,target:'another.example'}]);
assert.equal(conflict.length,2,'Conflicting known targets must never be merged only by job_id.');

const normalized=adapter.buildNormalizedAudit(grouped[0]);
assert.equal(normalized.sourceArtifactIds.length,4);
assert.equal(normalized.providerDatasets.audit_provider_summary.length,4);
const collected=adapter.collectProviderArtifacts([{id:'file-1',name:'pagespeed.json',ext:'json',contentText:JSON.stringify(pagespeed)}]);
assert.equal(collected.length,1);
assert.equal(collected[0].sourceFileId,'file-1');

console.log('Provider Result Adapter smoke test passed.');
