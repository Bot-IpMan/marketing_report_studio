import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('../src/features/universal-analysis.js');
await import('../src/features/chart-candidates.js');
await import('../src/features/derived-table-candidates.js');
await import('../src/features/table-detection.js');
await import('../src/features/document-extract.js');

const UA=globalThis.MRSUniversalAnalysis;
const charts=globalThis.MRSChartCandidates;
const derived=globalThis.MRSDerivedTables;
const tableDetection=globalThis.MRSTableDetection;
const documents=globalThis.MRSDocumentExtract;

assert.ok(UA&&charts&&derived&&tableDetection&&documents,'universal browser modules must initialize');

const localeCases=[
  ['1,234.56',1234.56,{}],
  ['1 234,56',1234.56,{}],
  ['1.234,56',1234.56,{}],
  ['$1,234.56',1234.56,{}],
  ['€ 1 234,56',1234.56,{}],
  ['₴1 234,56',1234.56,{}],
  ['(1,492)',-1492,{thousandsSeparator:','}],
  ['-12%',-12,{}],
  ['−12%',-12,{}],
];
for(const [raw,expected,context] of localeCases){
  const parsed=UA.parseLocaleAwareNumber(raw,context);
  assert.equal(parsed.valid,true,`${raw} should parse`);
  assert.equal(parsed.value,expected,`${raw} should preserve its numeric value`);
}
assert.equal(UA.parseLocaleAwareNumber('1,234').ambiguous,true,'ambiguous one-separator values must not be guessed');

const sampled=UA.distributedSampleIndices(10000,120);
assert.ok(sampled.includes(0)&&sampled.includes(9999),'distributed samples must include both edges');
assert.ok(sampled.some(index=>index>=4900&&index<=5100),'distributed samples must include the middle');
assert.deepEqual(sampled,UA.distributedSampleIndices(10000,120),'sampling must be deterministic');

const largeRows=Array.from({length:100000},(_,index)=>({
  row_number:index+1,
  sparse_metric:index<99000?'':index/10,
  category:['α','β','γ'][index%3],
  ...(index===99999?{late_column:'present'}:{}),
}));
const largeProfile=UA.profileDataset({id:'large',rows:largeRows},{sampleSize:900});
assert.ok(largeProfile.columns.some(column=>column.name==='late_column'),'columns appearing only near the end must be discovered');
assert.equal(largeProfile.columns.find(column=>column.name==='row_number').analyticalRole,'identifier','sequential numeric IDs must be identifiers');
assert.equal(largeProfile.columns.find(column=>column.name==='sparse_metric').analyticalRole,'metric','late sparse metrics must still be detected');
assert.ok(largeProfile.sampleIndices.includes(99999),'the final row must be sampled');

const xlsxSemanticRows=Array.from({length:8},(_,index)=>({
  Company:`Company ${index+1}`,
  Price:100+index,
  Traffic:1000+index*10,
  CTR:`${10+index}%`,
  Region:['UA','EU'][index%2],
  Status:['Yes','No'][index%2],
  Date:`2026-07-${String(index+1).padStart(2,'0')}`,
}));
const xlsxSemanticProfile=UA.profileDataset({id:'xlsx-semantic',rows:xlsxSemanticRows});
assert.equal(xlsxSemanticProfile.columns.find(column=>column.name==='Price').analyticalRole,'metric','sequential prices must not be demoted to identifiers');
assert.equal(xlsxSemanticProfile.columns.find(column=>column.name==='Traffic').analyticalRole,'metric','sequential metrics must remain metrics without ID-like evidence');

const noisyRows=Array.from({length:40},(_,index)=>({
  company:`Company ${index+1}`,
  seo_cost:index+1.5,
  why_relevant:`This company is relevant because it has a detailed operational context and requires careful review ${index}.`,
  outreach_angle:`Contact them with a customized explanation about procurement, grid modernization, and financing angle ${index}.`,
  seo_dataforseo_task_id:`task-${index%10}`,
  city_region:['Kyiv','Lviv','Dnipro','Odesa'][index%4],
}));
const noisyDataset={id:'noise-gates',rows:noisyRows,extractionConfidence:'high'};
const noisyProfile=UA.profileDataset(noisyDataset);
assert.equal(noisyProfile.columns.find(column=>column.name==='why_relevant').analyticalRole,'description','narrative relevance text must be excluded from automatic chart dimensions');
assert.equal(noisyProfile.columns.find(column=>column.name==='outreach_angle').analyticalRole,'description','narrative outreach text must be excluded from automatic chart dimensions');
assert.equal(noisyProfile.columns.find(column=>column.name==='seo_dataforseo_task_id').analyticalRole,'identifier','technical task IDs must be excluded from chart dimensions even when repeated');
const noisyRegistry=charts.createChartCandidateRegistry(noisyDataset,noisyProfile);
assert.equal(noisyRegistry.candidates.some(candidate=>`${candidate.title} ${(candidate.dimensionKeys||[]).join(' ')}`.match(/why_relevant|outreach_angle|task_id/)),false,'narrative and technical fields must not become automatic chart candidates');
assert.equal(noisyRegistry.recommended.some(candidate=>candidate.candidateType==='category_distribution'&&(candidate.dimensionKeys||[]).includes('company')),false,'entity dimensions should use metric Top/Bottom charts instead of noisy row distributions');

const sampleRows=Array.from({length:200},(_,index)=>({
  row_number:index+1,
  company:`Company ${String(index+1).padStart(3,'0')}`,
  segment:['Generation','Storage','Grid','Services'][index%4],
  subsegment:['A','B','C'][index%3],
  source_site:`https://company${index+1}.example/report`,
  city_region:['Kyiv','Lviv','Dnipro','Odesa'][index%4],
  priority:['High','Medium','Low'][index%3],
  why_relevant:`Research description for company ${index+1} with enough text to remain descriptive rather than numeric.`,
  outreach_angle:`Angle ${index+1}`,
  verification_status:index%5?'Verified':'Needs review',
  next_action:`Review row ${index+1}`,
  seo_run_date:`2026-07-${String(index%28+1).padStart(2,'0')}`,
  seo_domain:`company${index+1}.example`,
  seo_market:['UA','EU'][index%2],
  seo_organic_etv:500+index*9,
  seo_paid_etv:50+index*3,
  seo_featured_snippet_etv:index*2,
  seo_local_pack_etv:index,
  seo_organic_count:10+index,
  seo_paid_count:index%7,
  seo_featured_snippet_count:index%5,
  seo_local_pack_count:index%4,
  seo_total_estimated_traffic:1000+index*137,
  seo_threat_level:['High','Medium','Low'][index%3],
  seo_dataforseo_cost:`$${(index/100).toFixed(2)}`,
  seo_dataforseo_task_id:`task-${index+1}`,
  seo_cost:`€ ${index+1},50`,
  seo_scan:JSON.stringify({ok:true,index}),
  seo_scanned_auto:index%2===0,
  seo_task_id:`seo-${index+1}`,
  seo_threat_score:20+index,
}));
const sampleDataset={id:'energy-200',rows:sampleRows,sourceFileId:'file-energy',sourceDocumentId:'doc-energy',sourceTableId:'table-energy',sourceAnchor:{startRow:1,endRow:201},extractionConfidence:'high'};
const sampleProfile=UA.profileDataset(sampleDataset);
assert.equal(sampleProfile.rowCount,200);
assert.equal(sampleProfile.columnCount,31);
assert.equal(sampleProfile.columns.find(column=>column.name==='row_number').analyticalRole,'identifier');
assert.equal(sampleProfile.columns.find(column=>column.name==='seo_run_date').analyticalRole,'timeline');
assert.equal(sampleProfile.columns.find(column=>column.name==='source_site').physicalType,'url');
assert.equal(sampleProfile.columns.find(column=>column.name==='seo_domain').physicalType,'domain');
assert.equal(sampleProfile.columns.find(column=>column.name==='seo_scan').physicalType,'json');
assert.equal(sampleProfile.columns.find(column=>column.name==='seo_scanned_auto').physicalType,'boolean');

const chartRegistry=charts.createChartCandidateRegistry(sampleDataset,sampleProfile);
assert.ok(chartRegistry.candidateCount>6,'the universal registry must exceed the former fixed six charts');
assert.ok(chartRegistry.recommended.length>=8&&chartRegistry.recommended.length<=12,'Recommended must remain readable');
assert.ok(chartRegistry.candidates.some(candidate=>candidate.candidateType==='category_distribution'));
assert.ok(chartRegistry.candidates.some(candidate=>candidate.candidateType==='dimension_metric'));
assert.ok(chartRegistry.candidates.some(candidate=>candidate.candidateType==='metric_metric'));
assert.ok(chartRegistry.candidates.some(candidate=>candidate.candidateType==='numeric_distribution'));
assert.equal(chartRegistry.candidates.some(candidate=>candidate.metricKeys.includes('row_number')),false,'identifier columns must not become chart metrics');
const chartQuery=charts.queryChartCandidates(chartRegistry,{metric:'seo_total_estimated_traffic',chartType:'bar',search:'segment',pageSize:5});
assert.ok(chartQuery.total>0&&chartQuery.items.length<=5,'chart registry filters and pagination must work');
const chartFamilies=charts.groupChartCandidateFamilies(chartRegistry.candidates);
assert.ok(chartFamilies.length<chartRegistry.candidates.length,'aggregation variants must reduce top-level catalog noise');
assert.equal(chartFamilies.reduce((sum,family)=>sum+family.variants.length,0),chartRegistry.candidates.length,'family grouping must preserve every raw candidate');
const aggregationFamily=chartFamilies.find(family=>family.variants.length>=5&&family.variants.some(candidate=>candidate.aggregation==='count'));
assert.ok(aggregationFamily,'a metric/dimension family must retain selectable aggregation variants');
assert.match(aggregationFamily.variants.find(candidate=>candidate.aggregation==='count').title,/Non-empty .* records by /,'count titles must describe records rather than metric values');
const familyQuery=charts.queryChartCandidateFamilies(chartRegistry,{metric:aggregationFamily.metricKeys[0],dimension:aggregationFamily.dimensionKeys[0],pageSize:24});
assert.ok(familyQuery.rawTotal>=aggregationFamily.variants.length&&familyQuery.total>=1,'family query must retain filtered raw candidates and paginated families');

const wideColumns=[
  ...Array.from({length:100},(_,index)=>({name:`metric_${index}`,physicalType:'number',analyticalRole:'metric',nonEmptyCount:20,nullRate:0,distinctCount:20,numericStats:{count:20,min:0,max:100+index,mean:50,median:50,stdDev:10,hasNegative:false,zeroCount:1},formatHints:{}})),
  ...Array.from({length:100},(_,index)=>({name:`dimension_${index}`,physicalType:'category',analyticalRole:'category',nonEmptyCount:20,nullRate:0,distinctCount:5,distinctRatio:.25,averageTextLength:5})),
  {name:'period',physicalType:'date',analyticalRole:'timeline',nonEmptyCount:20,nullRate:0,distinctCount:20,dateStats:{inferredGranularity:'day'}},
];
const wideProfile={datasetId:'wide',rowCount:20,columnCount:wideColumns.length,columns:wideColumns,extractionConfidence:'high'};
const wideDataset={id:'wide',rows:[],sourceFileId:'wide-file',sourceTableId:'wide-table',extractionConfidence:'high'};
const wideCharts=charts.createChartCandidateRegistry(wideDataset,wideProfile);
assert.equal(wideCharts.lazy,true,'very wide chart registries must use lazy materialization');
assert.ok(wideCharts.materializedCandidateCount<wideCharts.candidateCount,'lazy chart registries must not eagerly materialize the estimated candidate space');
const lateChartQuery=charts.queryChartCandidates(wideCharts,{metric:'metric_99',dimension:'dimension_99',pageSize:10});
assert.ok(lateChartQuery.total>0,'filters must materialize late-column chart candidates on demand');
assert.ok(wideCharts.candidates.some(candidate=>candidate.metricKeys?.includes('metric_99')),'on-demand charts must remain available for preview and pinning');

const derivedRegistry=derived.createDerivedTableRegistry(sampleDataset,sampleProfile);
for(const type of ['summary_statistics','column_profile','missing_values','unique_values_summary','category_distribution','top_n','bottom_n','group_by','pivot_like_summary','timeline_summary','correlation_matrix']){
  assert.ok(derivedRegistry.candidates.some(candidate=>candidate.candidateType===type),`missing derived-table candidate type ${type}`);
}
const summaryCandidate=derivedRegistry.candidates.find(candidate=>candidate.candidateType==='summary_statistics');
const summary=derived.materializeDerivedTableCandidate(summaryCandidate,sampleDataset,sampleProfile);
assert.ok(summary.rows.length>0&&summary.columns.includes('median'),'derived tables must materialize on demand');
const wideDerived=derived.createDerivedTableRegistry(wideDataset,wideProfile);
assert.equal(wideDerived.lazy,true,'very wide derived-table registries must use lazy materialization');
assert.ok(wideDerived.materializedCandidateCount<wideDerived.candidateCount,'derived registries must retain an unmaterialized candidate estimate');
const lateDerivedQuery=derived.queryDerivedTableCandidates(wideDerived,{metric:'metric_99',dimension:'dimension_99',pageSize:10});
assert.ok(lateDerivedQuery.total>0,'filters must materialize late-column derived tables on demand');

const xlsxLikeMatrix=[
  ['Marketing comparison'],
  ['Source note'],
  [],
  ['Company','Price','Traffic','CTR','Region','Status','Date'],
  ...Array.from({length:8},(_,index)=>[`Company ${index+1}`,100+index,1000+index*10,`${10+index}%`,['UA','EU'][index%2],['Yes','No'][index%2],`2026-07-${String(index+1).padStart(2,'0')}`]),
  [],
  ['Notes:'],
  ['Values are illustrative'],
  ['Verify prices'],
  ['Keep source context'],
  ['End notes'],
];
const detected=tableDetection.detectTablesInMatrix(xlsxLikeMatrix);
assert.equal(xlsxLikeMatrix.length,18);
assert.equal(detected.tables.length,1);
assert.equal(detected.tables[0].headerRow,3,'header must be detected structurally at worksheet row 4');
assert.equal(detected.tables[0].rows.length,8,'only worksheet rows 5-12 are data');
assert.equal(detected.textBlocks[0].startRow,1);
assert.equal(detected.textBlocks[0].endRow,2);
assert.ok(detected.textBlocks.some(block=>block.startRow===14&&block.endRow===18),'worksheet notes must remain text');

const markdown=['# Section A','','| Name | Value |','| --- | ---: |','| Alpha | 10 |','| Beta | 20 |','','## Diagram','','```mermaid','flowchart LR','A["Input"] --> B["Output"]','```','','## Section B','','| Period | Revenue |','| --- | ---: |','| Q1-2025 | 100 |','| Q2-2025 | 120 |'].join('\n');
const markdownDocument=documents.extractMarkdownDocument(markdown,{fileId:'md-file',fileName:'fixture.md'});
assert.equal(markdownDocument.tables.length,2,'all Markdown tables must be extracted');
assert.equal(markdownDocument.diagramBlocks.length,1,'Mermaid must remain diagram metadata');
assert.equal(markdownDocument.tables[1].sourceAnchor.section,'Section A / Section B');

const jsonDocument=documents.extractJsonDocument({reports:[{name:'A',metrics:[{quarter:'Q1-2025',value:1},{quarter:'Q2-2025',value:2}]}]},{fileId:'json-file',fileName:'fixture.json'});
assert.ok(jsonDocument.tables.some(table=>table.sourceAnchor.jsonPath==='$.reports[0].metrics'),'nested object arrays must retain JSONPath');
assert.equal(jsonDocument.tables.some(table=>table.sourceAnchor.jsonPath==='$.reports'),false,'wrapper object arrays should not duplicate nested metric datasets');

const docxXml=`<?xml version="1.0"?><w:document xmlns:w="urn:test"><w:body><w:p><w:r><w:t>Heading</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Name</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Value</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Layout</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`;
const docxFallback=documents.extractDocxXmlFallback(docxXml);
assert.equal(docxFallback.tables.length,2,'native DOCX table count must be retained');
assert.equal(docxFallback.tables[0].matrix[1][1],'1','DOCX cells must preserve text order');
assert.equal(docxFallback.tables[1].confidence,'low','one-cell layout tables must stay low-confidence');

assert.equal(documents.analyzePdfTextQuality('Readable native PDF text 123').status,'good');
assert.equal(documents.analyzePdfTextQuality('■■■■■■■■■■■■■■').status,'corrupted');
const pdfItems=[
  ['Metric',10,100],['Q1-2025',160,100],['Q2-2025',240,100],
  ['Revenue',10,86],['100',160,86],['120',240,86],
  ['Cost',10,72],['70',160,72],['75',240,72],
  ['Income',10,58],['30',160,58],['45',240,58],
].map(([str,x,y])=>({str,width:String(str).length*5,height:10,transform:[1,0,0,10,x,y]}));
const pdfTables=documents.detectPdfTablesFromItems(pdfItems,3);
assert.ok(pdfTables.length>=1,'repeated PDF text geometry must yield a table candidate');
assert.equal(pdfTables[0].page,3,'PDF source page must be retained');

const abortController=new AbortController(),progressEvents=[];
const fakePdf={
  numPages:5,
  async getPage(pageNumber){return {async getTextContent(){return {items:[{str:`Page ${pageNumber}`,width:30,height:10,transform:[1,0,0,10,10,100]}]};},cleanup(){}};},
  async destroy(){},
};
const fakePdfJs={getDocument(){return {promise:Promise.resolve(fakePdf),async destroy(){}};}};
const cancelledPdf=await documents.extractPdfDocument(new ArrayBuffer(8),{fileId:'cancel-pdf',fileName:'cancel.pdf',pdfjsLib:fakePdfJs,signal:abortController.signal,onProgress:event=>{progressEvents.push(event);if(event.processed===1)abortController.abort();}});
assert.equal(cancelledPdf.extractionStatus,'cancelled','cancelled PDF analysis must expose a distinct cancelled state');
assert.ok(cancelledPdf.warnings.some(warning=>warning.code==='ANALYSIS_CANCELLED'),'cancelled PDF analysis must expose a structured diagnostic');
assert.ok(progressEvents.length>=2,'PDF analysis must expose incremental progress');

const html=readFileSync('marketing_report_studio_v8_access_folders_fixed.html','utf8');
const appSource=readFileSync('app.js','utf8');
const buildSource=readFileSync('scripts/build.mjs','utf8');
const moduleSource=['src/features/document-extract.js','src/features/universal-analysis.js','src/features/chart-candidates.js','src/features/derived-table-candidates.js','src/features/storage.js','src/workers/analysis.worker.js'].map(path=>readFileSync(path,'utf8')).join('\n');
assert.match(html,/src\/features\/universal-analysis\.js/);
assert.match(html,/src\/features\/storage\.js/);
assert.match(appSource,/new Worker\(new URL\(ANALYSIS_WORKER_SRC/,'heavy analysis must have a local Worker path');
assert.match(appSource,/fallback\(/,'Worker analysis must retain a fallback');
assert.match(appSource,/MRS_STORAGE\.saveReport/,'large projects must use IndexedDB storage');
assert.match(buildSource,/"connect-src 'none'"/,'CSP must keep network connections disabled');
assert.doesNotMatch(moduleSource,/https?:\/\//,'universal modules must not load external resources');
assert.doesNotMatch(moduleSource,/\bfetch\s*\(/,'universal modules must not add network calls');

console.log('Universal analysis smoke test passed.');
