(function initProviderResultAdapter(global){
  'use strict';

  const ADAPTER_VERSION='provider-result-adapter-v1';
  const MAX_JSON_VALUE_LENGTH=4000;
  const PROVIDER_EXTRACTORS=Object.freeze({
    pagespeed:extractPageSpeed,
    crux:extractCrux,
    lighthouse:extractLighthouse,
    browser_accessibility:extractAccessibility,
    vnu:extractVnu,
    crawl4ai:extractCrawlPages,
    financial_data_gov_ua:extractPublicDataCoverage,
    prozorro:extractPublicDataCoverage,
    spending:extractPublicDataCoverage,
    smida:extractPublicDataCoverage,
    amcu:extractPublicDataCoverage
  });

  function text(value){return typeof value==='string'?value.trim():'';}
  function object(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}
  function array(value){return Array.isArray(value)?value:[];}
  function hash(value){let h=2166136261;const s=String(value??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function boundedJson(value){
    if(value===null||value===undefined) return '';
    try{const out=JSON.stringify(value);return out.length>MAX_JSON_VALUE_LENGTH?`${out.slice(0,MAX_JSON_VALUE_LENGTH)}…[truncated]`:out;}catch(error){return '';}
  }
  function normalizedResult(artifact){return object(object(artifact)?.result)?.normalized_result||{};}
  function targetOf(artifact){
    const source=object(artifact)||{};
    const result=object(source.result)||{};
    const normalized=normalizedResult(source);
    return text(source.target)||text(source.target_domain)||text(result.target)||text(normalized.target)||'unknown-target';
  }
  function observedAt(artifact){
    const source=object(artifact)||{};
    const result=object(source.result)||{};
    const normalized=normalizedResult(source);
    return text(source.produced_at)||text(source.observed_at)||text(result.produced_at)||text(normalized.observed_at)||'';
  }
  function stableArtifactId(artifact){
    const source=object(artifact)||{};
    return `artifact:${hash([source.job_id,source.provider_code,targetOf(source),observedAt(source),boundedJson(source.result)].join('|'))}`;
  }
  function recognizeArtifact(value){
    const artifact=object(value);
    if(!artifact) return {ok:false,code:'NOT_OBJECT'};
    if(artifact.artifact_type!=='provider_result_json') return {ok:false,code:'ARTIFACT_TYPE_MISMATCH'};
    if(!text(artifact.provider_code)) return {ok:false,code:'MISSING_PROVIDER_CODE'};
    if(!object(artifact.result)) return {ok:false,code:'MISSING_RESULT'};
    if(!object(artifact.result.normalized_result)) return {ok:false,code:'MISSING_NORMALIZED_RESULT'};
    return {ok:true,artifact};
  }
  function isProviderResultArtifact(value){return recognizeArtifact(value).ok;}
  function scalarParts(value){
    if(typeof value==='number') return {value_number:Number.isFinite(value)?value:null,value_text:'',value_boolean:null,value_json:''};
    if(typeof value==='boolean') return {value_number:null,value_text:'',value_boolean:value,value_json:''};
    if(typeof value==='string') return {value_number:null,value_text:value,value_boolean:null,value_json:''};
    return {value_number:null,value_text:'',value_boolean:null,value_json:boundedJson(value)};
  }
  function bundleKey(artifact){
    const source=object(artifact)||{};
    const date=observedAt(source).slice(0,10)||'unknown-date';
    return [text(source.schema_version)||'v1',text(source.job_id)||'ungrouped',targetOf(source),date].join('|');
  }
  function groupArtifacts(artifacts){
    const groups=new Map();
    for(const item of array(artifacts)){
      if(!isProviderResultArtifact(item)) continue;
      const key=bundleKey(item);
      if(!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(item);
    }
    return [...groups.values()];
  }
  function baseRow(artifact){
    const normalized=normalizedResult(artifact);
    return {job_id:text(artifact.job_id),target:targetOf(artifact),provider:text(artifact.provider_code),provider_run_id:text(artifact.provider_run_id),provider_status:text(normalized.status),status:text(normalized.status),coverage:text(normalized.coverage),observed_at:observedAt(artifact),sourceFileId:text(artifact.sourceFileId),source_artifact_id:stableArtifactId(artifact)};
  }
  function buildProviderSummary(artifact){
    const normalized=normalizedResult(artifact);
    return {...baseRow(artifact),findings_total:array(normalized.findings).length,warnings_total:array(normalized.warnings).length,successful_results:Number.isFinite(Number(normalized.successful_results))?Number(normalized.successful_results):0,produced_at:observedAt(artifact)};
  }
  function normalizeFinding(artifact,finding){
    const item=object(finding)||{};
    return {...baseRow(artifact),category:text(item.category),subcategory:text(item.subcategory),metric:text(item.metric),severity:text(item.severity),claim_strength:text(item.claim_strength),confidence:typeof item.confidence==='number'&&Number.isFinite(item.confidence)?item.confidence:null,unit:text(item.unit),source_url:text(item.source_url),...scalarParts(item.value)};
  }
  function warningRows(artifact){
    return array(normalizedResult(artifact).warnings).map(warning=>{
      const item=object(warning)||{};
      return {...baseRow(artifact),warning_class:text(item.class)||text(item.warning_class),reason:text(item.reason)||text(item.message),warning_status:text(item.status)||text(item.code)};
    });
  }
  function extractPageSpeed(artifact){
    const records=array(object(artifact.result)?.provider_result?.records);
    const rows=[];
    for(const record of records){
      const item=object(record)||{};
      const formFactor=text(item.form_factor)||text(item.strategy)||'unknown';
      for(const [metric,raw] of Object.entries(item)){
        if(!/(score|lcp|inp|cls|fcp|tbt)/i.test(metric)) continue;
        const value=Number(raw);
        if(!Number.isFinite(value)) continue;
        rows.push({...baseRow(artifact),source:'pagespeed',form_factor:formFactor,metric,value:value>=0&&value<=1&&/score/i.test(metric)?value*100:value,unit:/score/i.test(metric)?'score_100':'ms',category:text(item.category)});
      }
    }
    return {web_vitals:rows};
  }
  function extractCrux(artifact){
    const source=object(artifact.result)?.provider_result||{};
    const records=array(source.records).concat(array(source.metrics));
    const rows=[];
    for(const record of records){
      const item=object(record)||{};
      const formFactor=text(item.form_factor)||text(item.formFactor)||'unknown';
      if(text(item.metric)&&Number.isFinite(Number(item.value))) rows.push({...baseRow(artifact),source:'crux',form_factor:formFactor,metric:text(item.metric),value:Number(item.value),unit:text(item.unit),category:text(item.category)});
      else for(const [metric,raw] of Object.entries(object(item.metrics)||{})){
        const value=Number(object(raw)?.value??object(raw)?.numeric_value??raw);
        if(Number.isFinite(value)) rows.push({...baseRow(artifact),source:'crux',form_factor:formFactor,metric,value,unit:text(object(raw)?.unit),category:text(object(raw)?.category)});
      }
    }
    return {web_vitals:rows};
  }
  function extractLighthouse(artifact){
    const source=object(artifact.result)?.provider_result||{};
    const rows=[];
    for(const [metric,raw] of Object.entries(object(source.scores)||{})){
      const value=Number(raw);
      if(Number.isFinite(value)) rows.push({...baseRow(artifact),source:'lighthouse',form_factor:text(source.form_factor)||'lab',metric,value:value>=0&&value<=1?value*100:value,unit:'score_100',category:'score'});
    }
    for(const [metric,raw] of Object.entries(object(source.lab_metrics)||{})){
      const data=object(raw)||{};const value=Number(data.numeric_value??data.value);
      if(Number.isFinite(value)) rows.push({...baseRow(artifact),source:'lighthouse',form_factor:text(source.form_factor)||'lab',metric,value,unit:/shift|cls/i.test(metric)?'score':'ms',category:'lab_metric'});
    }
    return {web_vitals:rows,lighthouse_metrics:rows};
  }
  function extractAccessibility(artifact){
    const records=array(object(artifact.result)?.provider_result?.records);
    const rows=[];
    for(const record of records){
      const item=object(record)||{};const formFactor=text(item.form_factor)||'unknown';
      for(const violation of array(object(item.accessibility)?.violations)){
        const v=object(violation)||{};
        const targets=array(v.nodes).flatMap(node=>array(object(node)?.target)).map(String).slice(0,30).join(', ');
        rows.push({...baseRow(artifact),form_factor:formFactor,impact:text(v.impact),rule_id:text(v.id),description:text(v.description),help:text(v.help),nodes_total:Number.isFinite(Number(v.nodes_total))?Number(v.nodes_total):array(v.nodes).length,target:targets});
      }
    }
    return {accessibility_violations:rows};
  }
  function extractVnu(artifact){
    const source=object(artifact.result)?.provider_result||{};
    const messages=array(source.messages).concat(array(source.records));
    return {html_validation_messages:messages.map(message=>{const item=object(message)||{};return {...baseRow(artifact),type:text(item.type),rule_key:text(item.rule_key)||text(item.message_id),message:text(item.message),line:Number.isFinite(Number(item.lastLine??item.line))?Number(item.lastLine??item.line):null,column:Number.isFinite(Number(item.lastColumn??item.column))?Number(item.lastColumn??item.column):null};})};
  }
  function extractCrawlPages(artifact){
    const source=object(artifact.result)?.provider_result||{};
    const pages=array(source.pages).concat(array(source.records));
    return {crawl_pages:pages.map(page=>{const item=object(page)||{};return {...baseRow(artifact),url:text(item.url),title:text(item.title),page_type:text(item.page_type)||text(item.type),text_length:Number.isFinite(Number(item.text_length))?Number(item.text_length):null,internal_links:Number.isFinite(Number(item.internal_links))?Number(item.internal_links):null,external_links:Number.isFinite(Number(item.external_links))?Number(item.external_links):null,images:Number.isFinite(Number(item.images))?Number(item.images):null,h1:text(item.h1),status:Number.isFinite(Number(item.status))?Number(item.status):null};})};
  }
  function extractPublicDataCoverage(artifact){
    const normalized=normalizedResult(artifact);const source=object(artifact.result)?.provider_result||{};
    return {public_data_coverage:[{...baseRow(artifact),result:text(normalized.status),reliability:text(source.reliability)||'unknown',explanation:text(source.explanation)||array(normalized.warnings).map(w=>text(object(w)?.reason)).filter(Boolean).join('; ')}]};
  }
  function mergeProviderDatasets(target,extract){for(const [key,rows] of Object.entries(extract||{})){if(!target[key]) target[key]=[];target[key].push(...array(rows));}}
  function buildBundle(artifacts){
    const valid=[];const seen=new Set();
    for(const artifact of array(artifacts)){
      if(!isProviderResultArtifact(artifact)) continue;
      const id=stableArtifactId(artifact);if(seen.has(id)) continue;seen.add(id);valid.push(artifact);
    }
    const first=valid[0]||{};const providerDatasets={};
    for(const artifact of valid){const extractor=PROVIDER_EXTRACTORS[text(artifact.provider_code)];if(extractor) mergeProviderDatasets(providerDatasets,extractor(artifact));}
    return {adapterVersion:ADAPTER_VERSION,bundleId:`provider-audit:${hash(bundleKey(first))}`,jobId:text(first.job_id),target:targetOf(first),artifactIds:valid.map(stableArtifactId),artifacts:valid,datasets:{audit_provider_summary:valid.map(buildProviderSummary),audit_findings:valid.flatMap(artifact=>array(normalizedResult(artifact).findings).map(finding=>normalizeFinding(artifact,finding))),audit_warnings:valid.flatMap(warningRows)},providerDatasets,diagnostics:[]};
  }

  function collectProviderArtifacts(fileRecords){
    const artifacts=[];
    for(const file of array(fileRecords)){
      if(String(file?.ext||'').toLowerCase()!=='json'||typeof file?.contentText!=='string') continue;
      try{const value=JSON.parse(file.contentText);if(isProviderResultArtifact(value)) artifacts.push({...value,sourceFileId:String(file.id||''),sourceFileName:String(file.name||'')});}catch(error){}
    }
    return artifacts;
  }
  function buildNormalizedAudit(artifacts){
    const bundle=buildBundle(artifacts);
    return {...bundle,sourceArtifactIds:bundle.artifactIds,providerDatasets:{...bundle.datasets,...bundle.providerDatasets},warnings:bundle.datasets.audit_warnings.map(row=>({provider:row.provider,reason:row.reason,status:row.warning_status,coverage:row.coverage}))};
  }
  global.MRSProviderResults=Object.freeze({ADAPTER_VERSION,PROVIDER_EXTRACTORS,recognizeArtifact,isProviderResultArtifact,scalarParts,stableArtifactId,collectProviderArtifacts,groupArtifacts,buildBundle,buildNormalizedAudit});
})(typeof window!=='undefined'?window:globalThis);
