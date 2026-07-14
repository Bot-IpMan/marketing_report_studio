import assert from 'node:assert/strict';
import fs from 'node:fs';

await import('../src/features/universal-analysis.js');
await import('../src/features/chart-candidates.js');
await import('../src/features/derived-table-candidates.js');
await import('../src/features/storage.js');

const UA=globalThis.MRSUniversalAnalysis;
const charts=globalThis.MRSChartCandidates;
const derived=globalThis.MRSDerivedTables;
const storage=globalThis.MRSStorage;

const appSource=fs.readFileSync('app.js','utf8');
const workerSource=fs.readFileSync('src/workers/analysis.worker.js','utf8');
const storageSource=fs.readFileSync('src/features/storage.js','utf8');

const largeRows=Array.from({length:100000},(_,index)=>({
  row_number:index+1,
  region:['UA','EU','US','APAC'][index%4],
  status:['active','paused','review'][index%3],
  date:`2026-07-${String(index%28+1).padStart(2,'0')}`,
  metric:index%997,
  late_metric:index>99000?index: '',
  narrative:`Row ${index+1} has enough text to behave like a description when sampled carefully.`
}));
const largeProfile=UA.profileDataset({id:'large-scale',rows:largeRows},{sampleSize:900});
assert.equal(largeProfile.rowCount,100000,'large profiling must keep full row count.');
assert.ok(largeProfile.sampleIndices.includes(99999),'distributed sampling must include the final row.');
assert.equal(largeProfile.columns.find(column=>column.name==='row_number').analyticalRole,'identifier','row numbers must stay out of metric charts.');
assert.equal(largeProfile.columns.find(column=>column.name==='late_metric').analyticalRole,'metric','late sparse metrics must still be discovered.');

const wideRows=Array.from({length:48},(_,rowIndex)=>{
  const row={};
  for(let index=0;index<110;index+=1){
    row[`metric_${index}`]=rowIndex*10+index;
    row[`dimension_${index}`]=`Group ${rowIndex%5}`;
  }
  row.date=`Q${rowIndex%4+1}-2026`;
  return row;
});
const wideDataset={id:'wide-scale',rows:wideRows,extractionConfidence:'high'};
const wideProfile=UA.profileDataset(wideDataset,{sampleSize:240});
const wideCharts=charts.createChartCandidateRegistry(wideDataset,wideProfile,{lazyColumnThreshold:160});
assert.equal(wideCharts.lazy,true,'wide chart registries must use lazy materialization.');
assert.ok(wideCharts.candidateCount>wideCharts.materializedCandidateCount,'lazy chart registries must estimate more candidates than they materialize initially.');
const lateChart=charts.queryChartCandidates(wideCharts,{metric:'metric_109',dimension:'dimension_109',pageSize:10});
assert.ok(lateChart.total>0,'late wide chart candidates must materialize on filtered query.');
assert.ok(wideCharts.materializedCandidateCount<wideCharts.candidateCount,'filtered materialization must not eagerly materialize the whole registry.');

const wideDerived=derived.createDerivedTableRegistry(wideDataset,wideProfile,{lazyColumnThreshold:160});
assert.equal(wideDerived.lazy,true,'wide derived-table registries must use lazy materialization.');
const lateDerived=derived.queryDerivedTableCandidates(wideDerived,{metric:'metric_109',dimension:'dimension_109',pageSize:10});
assert.ok(lateDerived.total>0,'late wide generated tables must materialize on filtered query.');
assert.ok(wideDerived.materializedCandidateCount<wideDerived.candidateCount,'derived-table filtered materialization must stay bounded.');

assert.match(appSource,/slice\(0,300\)/,'chart preview tables must cap rendered rows.');
assert.match(appSource,/pageSize:24/,'All Charts catalog must render bounded metadata pages.');
assert.match(appSource,/pageSize:dashboardView==='recommended'\?12:20/,'chart workspaces must render bounded candidate sets.');
assert.match(appSource,/if\(typeof Worker==='undefined'\|\|total<1500\) return fallback/,'heavy analysis must retain a yielded main-thread fallback.');
assert.match(appSource,/new Worker\(new URL\(ANALYSIS_WORKER_SRC,document\.baseURI\)\)/,'heavy analysis must use a local Worker path when available.');
assert.match(appSource,/WORKER_UNAVAILABLE/,'worker failure must be visible as a structured warning.');

assert.match(workerSource,/postMessage\(\{type:'progress'/,'analysis worker must report progress.');
assert.match(workerSource,/stage:'profiling'/,'analysis worker must report profiling stage.');
assert.match(workerSource,/stage:'chart_candidates'/,'analysis worker must report chart candidate stage.');
assert.match(workerSource,/stage:'derived_tables'/,'analysis worker must report derived-table stage.');
assert.match(workerSource,/postMessage\(\{type:'result'/,'analysis worker must return a structured result.');

assert.equal(storage.available(),false,'Node smoke environment should not pretend IndexedDB is available.');
await assert.rejects(()=>storage.saveReport('scale-smoke',{files:[]}),error=>error.code==='STORAGE_UNAVAILABLE');
assert.match(storageSource,/delete file\.contentBase64/,'IndexedDB storage must avoid duplicating large base64 blobs in report metadata.');
assert.match(storageSource,/objectStore\('blobs'\)/,'IndexedDB storage must use a separate blob store.');
assert.match(storageSource,/opfsAvailable/,'OPFS availability must remain optional and detectable.');

console.log('Performance and storage smoke test passed.');
