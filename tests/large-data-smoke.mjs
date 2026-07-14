import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

await import('../src/features/universal-analysis.js');
await import('../src/features/table-detection.js');
await import('../src/features/chart-candidates.js');
await import('../src/features/derived-table-candidates.js');
await import('../src/features/document-extract.js');

const UA=globalThis.MRSUniversalAnalysis;
const tables=globalThis.MRSTableDetection;
const charts=globalThis.MRSChartCandidates;
const derived=globalThis.MRSDerivedTables;
const documents=globalThis.MRSDocumentExtract;

const timings=[];
function step(name,fn){
  const start=performance.now();
  const result=fn();
  const elapsed=performance.now()-start;
  timings.push({name,ms:Math.round(elapsed)});
  return result;
}

const csvText=step('generate 50k csv',()=>makeCsv(50000));
const csvDoc=step('parse 50k csv document',()=>documents.extractDelimitedDocument(csvText,{fileId:'file:large-csv',fileName:'large.csv'}));
assert.equal(csvDoc.tables.length,1,'large CSV should produce one detected table.');
assert.equal(csvDoc.tables[0].rows.length,50000,'large CSV should preserve all rows in the dataset model.');
const csvProfile=step('profile 50k csv',()=>UA.profileDataset({id:'large-csv',rows:csvDoc.tables[0].rows,extractionConfidence:'high'},{sampleSize:1200}));
assert.equal(csvProfile.rowCount,50000);
assert.equal(csvProfile.columns.find(column=>column.name==='row_number').analyticalRole,'identifier');
assert.equal(csvProfile.columns.find(column=>column.name==='revenue').analyticalRole,'metric');
assert.equal(csvProfile.columns.find(column=>column.name==='notes').analyticalRole,'description');
const csvCharts=step('chart registry 50k csv',()=>charts.createChartCandidateRegistry({id:'large-csv',rows:csvDoc.tables[0].rows,extractionConfidence:'high'},csvProfile));
assert.ok(csvCharts.recommended.length<=10,'large CSV Recommended must remain bounded.');
assert.ok(csvCharts.candidateCount>csvCharts.recommended.length,'large CSV All charts must retain additional valid candidates.');

const matrix=step('generate 10k xlsx-like matrix',()=>makeXlsxLikeMatrix(10000));
const detected=step('detect 10k xlsx-like table',()=>tables.detectTablesInMatrix(matrix));
assert.equal(detected.tables.length,1,'large XLSX-like matrix should detect one table region.');
assert.equal(detected.tables[0].headerRow,3,'large XLSX-like matrix should detect delayed row-4 header.');
assert.equal(detected.tables[0].rows.length,10000,'large XLSX-like matrix should keep all data rows.');
assert.ok(detected.textBlocks.some(block=>block.kind==='metadata'&&block.startRow===1),'title/source rows must remain metadata.');

const wideDataset=step('generate wide 180-column dataset',()=>makeWideDataset(180,72));
const wideProfile=step('profile wide dataset',()=>UA.profileDataset(wideDataset,{sampleSize:300}));
const wideCharts=step('lazy wide chart registry',()=>charts.createChartCandidateRegistry(wideDataset,wideProfile,{lazyColumnThreshold:160}));
assert.equal(wideCharts.lazy,true,'wide chart registry should be lazy in the large suite.');
assert.ok(wideCharts.candidateCount>wideCharts.materializedCandidateCount);
const lateWide=step('materialize late wide chart filter',()=>charts.queryChartCandidates(wideCharts,{metric:'metric_179',dimension:'dimension_179',pageSize:10}));
assert.ok(lateWide.total>0,'late wide filtered chart candidates should be materialized on demand.');
assert.ok(wideCharts.materializedCandidateCount<wideCharts.candidateCount,'late wide filter must stay bounded.');

const wideDerived=step('lazy wide derived registry',()=>derived.createDerivedTableRegistry(wideDataset,wideProfile,{lazyColumnThreshold:160}));
assert.equal(wideDerived.lazy,true,'wide derived registry should be lazy in the large suite.');
const lateDerived=step('materialize late wide derived filter',()=>derived.queryDerivedTableCandidates(wideDerived,{metric:'metric_179',dimension:'dimension_179',pageSize:10}));
assert.ok(lateDerived.total>0);
assert.ok(wideDerived.materializedCandidateCount<wideDerived.candidateCount);

console.log(JSON.stringify({
  status:'PASS',
  rows:{csv:csvDoc.tables[0].rows.length,xlsxLike:detected.tables[0].rows.length,wide:wideDataset.rows.length},
  candidates:{csv:csvCharts.candidateCount,wideEstimated:wideCharts.candidateCount,wideMaterialized:wideCharts.materializedCandidateCount},
  timings,
  memory:process.memoryUsage?Object.fromEntries(Object.entries(process.memoryUsage()).map(([key,value])=>[key,Math.round(value/1024/1024)])):null
},null,2));

function makeCsv(rowCount){
  const rows=['row_number,company,region,status,date,revenue,cost,ctr,task_id,notes'];
  for(let index=0;index<rowCount;index+=1){
    rows.push([
      index+1,
      `Company ${index+1}`,
      ['UA','EU','US','APAC'][index%4],
      ['active','paused','review'][index%3],
      `2026-07-${String(index%28+1).padStart(2,'0')}`,
      1000+index%10000,
      400+index%3000,
      `${5+index%12}%`,
      `task_${Math.floor(index/5)}`,
      `"Narrative note for row ${index+1}, with commas, context, and enough words to stay descriptive."`
    ].join(','));
  }
  return rows.join('\n');
}

function makeXlsxLikeMatrix(rowCount){
  const rows=[
    ['Marketing comparison'],
    ['Source: synthetic large matrix'],
    [],
    ['Company','Region','Status','Date','Revenue','Cost','CTR','Notes']
  ];
  for(let index=0;index<rowCount;index+=1){
    rows.push([
      `Company ${index+1}`,
      ['UA','EU','US','APAC'][index%4],
      ['active','paused','review'][index%3],
      `2026-08-${String(index%28+1).padStart(2,'0')}`,
      1200+index%9000,
      500+index%2500,
      `${6+index%10}%`,
      `Large worksheet row ${index+1} narrative note`
    ]);
  }
  rows.push([],['Notes:'],['Synthetic large worksheet fixture.']);
  return rows;
}

function makeWideDataset(width,rows){
  return {
    id:'wide-large',
    extractionConfidence:'high',
    rows:Array.from({length:rows},(_,rowIndex)=>{
      const row={};
      for(let index=0;index<width;index+=1){
        row[`metric_${index}`]=rowIndex*100+index;
        row[`dimension_${index}`]=`Group ${rowIndex%6}`;
      }
      row.quarter=`Q${rowIndex%4+1}-2026`;
      return row;
    })
  };
}
