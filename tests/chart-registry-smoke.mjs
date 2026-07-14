import assert from 'node:assert/strict';

await import('../src/features/universal-analysis.js');
await import('../src/features/chart-candidates.js');
await import('../src/features/derived-table-candidates.js');

const UA=globalThis.MRSUniversalAnalysis;
const charts=globalThis.MRSChartCandidates;
const derived=globalThis.MRSDerivedTables;

const dataset={
  id:'registry-fixture',
  name:'Registry fixture',
  sourceFileId:'file:registry',
  sourceDocumentId:'doc:registry',
  sourceTableId:'table:registry',
  sourceAnchor:{sheet:'Candidates',startRow:4,endRow:39,startColumn:1,endColumn:10},
  extractionConfidence:'high',
  rows:Array.from({length:36},(_,index)=>({
    row_id:index+1,
    company:`Company ${index+1}`,
    channel:['Search','Social','Email'][index%3],
    region:['UA','EU','US','APAC'][index%4],
    status:['active','paused'][index%2],
    quarter:`Q${index%4+1}-2026`,
    revenue:1000+index*95,
    cost:400+index*33,
    ctr:`${5+(index%9)}%`,
    constant_metric:7,
    notes:`Campaign ${index+1} has a narrative note that should not become a chart dimension.`
  }))
};

const profile=UA.profileDataset(dataset);
const registry=charts.createChartCandidateRegistry(dataset,profile,{recommendedLimit:10});

assert.ok(registry.candidateCount>registry.recommended.length,'All charts must contain more valid candidates than Recommended.');
assert.ok(registry.recommended.length>0&&registry.recommended.length<=10,'Recommended must stay bounded and readable.');
assert.equal(registry.recommended.every(candidate=>candidate.recommended),true,'Recommended candidates must be marked.');
assert.equal(registry.recommended.some(candidate=>(candidate.metricKeys||[]).includes('row_id')),false,'Technical row IDs must not appear as recommended metrics.');

const allPage=charts.queryChartCandidates(registry,{view:'all',page:1,pageSize:7});
assert.equal(allPage.items.length<=7,true,'All charts query must paginate.');
assert.equal(allPage.total,registry.candidates.length,'All charts total must match the materialized registry.');
assert.equal(allPage.start,1);
assert.equal(allPage.end,Math.min(7,allPage.total));

const secondPage=charts.queryChartCandidates(registry,{view:'all',page:2,pageSize:7});
assert.equal(secondPage.page,Math.min(2,secondPage.pageCount),'All charts should support later pages.');
if(allPage.total>7) assert.notEqual(secondPage.items[0]?.id,allPage.items[0]?.id,'Later pages must not repeat page one as the first item.');

const filtered=charts.queryChartCandidates(registry,{view:'all',metric:'revenue',dimension:'channel',chartType:'bar',aggregation:'sum',pageSize:50});
assert.ok(filtered.total>0,'Metric/dimension/type/aggregation filters must find compatible candidates.');
assert.equal(filtered.items.every(candidate=>
  candidate.metricKeys.includes('revenue')&&candidate.dimensionKeys.includes('channel')&&candidate.chartType==='bar'&&candidate.aggregation==='sum'
),true,'Filtered candidates must all satisfy the selected controls.');

const search=charts.queryChartCandidates(registry,{view:'all',search:'quarter',pageSize:20});
assert.ok(search.total>0,'Search must find timeline candidates by title/column.');
assert.equal(search.items.every(candidate=>`${candidate.title} ${(candidate.dimensionKeys||[]).join(' ')} ${(candidate.metricKeys||[]).join(' ')}`.toLowerCase().includes('quarter')),true);

const pinnedCandidate=registry.candidates.find(candidate=>!candidate.recommended)||registry.candidates[0];
pinnedCandidate.pinned=true;
const pinned=charts.queryChartCandidates(registry,{view:'pinned',pinnedIds:[pinnedCandidate.id],pageSize:10});
assert.equal(pinned.total,1,'Pinned view must show explicitly pinned chart candidates.');
assert.equal(pinned.items[0].id,pinnedCandidate.id);

const diagnostics=charts.queryChartCandidates(registry,{view:'diagnostics',pageSize:100});
assert.ok(diagnostics.items.some(item=>item.column==='row_id'&&item.reason==='identifier_not_chart_metric'),'Diagnostics must explain rejected identifier columns.');
assert.ok(diagnostics.items.some(item=>item.column==='constant_metric'&&item.reason==='constant_metric'),'Diagnostics must explain rejected constant metrics.');

const aggregationFamily=charts.queryChartCandidateFamilies(registry,{metric:'revenue',dimension:'channel',pageSize:10});
assert.ok(aggregationFamily.rawTotal>=aggregationFamily.items[0].variants.length,'Family query must keep raw aggregation variants available.');
assert.ok(aggregationFamily.items.some(family=>family.variants.length>1),'All charts families should group aggregation variants without discarding them.');

const lowConfidence=charts.createChartCandidateRegistry({...dataset,id:'low-confidence',extractionConfidence:'low'},UA.profileDataset({...dataset,id:'low-confidence',extractionConfidence:'low'}));
assert.equal(lowConfidence.recommended.length,0,'Low-confidence extraction must not auto-promote recommended charts.');
assert.ok(lowConfidence.candidateCount>0,'Low-confidence valid candidates should remain available in All charts.');

const derivedRegistry=derived.createDerivedTableRegistry(dataset,profile,{recommendedLimit:10});
assert.ok(derivedRegistry.candidateCount>derivedRegistry.recommended.length,'Generated tables must keep a larger All registry beyond Recommended.');
const derivedFiltered=derived.queryDerivedTableCandidates(derivedRegistry,{metric:'revenue',dimension:'channel',pageSize:10});
assert.ok(derivedFiltered.total>0,'Generated table registry must filter by metric and dimension.');

console.log('Chart registry smoke test passed.');
