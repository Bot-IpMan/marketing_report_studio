import assert from 'node:assert/strict';

await import('../vendor/jszip-3.10.1.min.js');
await import('../src/features/universal-analysis.js');
await import('../src/features/table-detection.js');
await import('../src/features/chart-candidates.js');
await import('../src/features/document-extract.js');

const JSZip=globalThis.JSZip;
const UA=globalThis.MRSUniversalAnalysis;
const charts=globalThis.MRSChartCandidates;
const extract=globalThis.MRSDocumentExtract;

await testMarkdownAdapter();
testJsonAdapter();
await testDocxAdapter();
testTxtAdapter();

console.log('Document adapter smoke test passed.');

async function testMarkdownAdapter(){
  const markdown=[
    '# Research Pack',
    '',
    '## Metrics',
    '',
    '| Channel | Views | CTR |',
    '| --- | ---: | ---: |',
    '| Search | 1200 | 12.5% |',
    '| Social | 800 | 8.1% |',
    '',
    '```mermaid',
    'graph TD',
    '  A-->B',
    '```',
    '',
    '## Costs',
    '',
    '| Region | Cost | Status |',
    '| --- | ---: | --- |',
    '| UA | $120 | active |',
    '| EU | $240 | paused |'
  ].join('\n');
  const doc=extract.extractMarkdownDocument(markdown,{fileId:'file:md',fileName:'research.md'});
  assert.equal(doc.tables.length,2,'Markdown should extract every real pipe table.');
  assert.equal(doc.diagramBlocks.length,1,'Mermaid should be preserved as a diagram block.');
  assert.equal(doc.diagramBlocks[0].kind,'mermaid');
  assert.equal(doc.diagramBlocks[0].source.includes('graph TD'),true);
  assert.equal(doc.tables[0].sourceAnchor.section,'Research Pack / Metrics');

  const profile=UA.profileDataset({id:'md-table',rows:doc.tables[0].rows,extractionConfidence:doc.tables[0].detection.confidence});
  assert.equal(profile.columns.find(column=>column.name==='Views').analyticalRole,'metric');
  assert.equal(profile.columns.find(column=>column.name==='CTR').physicalType,'percent');
  const registry=charts.createChartCandidateRegistry({id:'md-table',rows:doc.tables[0].rows,extractionConfidence:'high'},profile);
  assert.ok(registry.candidateCount>0,'Markdown tables should route through universal chart candidates.');
}

function testJsonAdapter(){
  const source={
    meta:{title:'Nested report'},
    reports:[
      {
        name:'Campaign A',
        metrics:[
          {channel:'Search',views:1200,cost:'$120'},
          {channel:'Social',views:800,cost:'$240'}
        ],
        tags:['seo','paid']
      }
    ],
    primitives:[1,2,3],
    settings:{enabled:true}
  };
  const doc=extract.extractJsonDocument(source,{fileId:'file:json',fileName:'nested.json'});
  assert.equal(doc.tables.length,1,'JSON should extract meaningful nested arrays of objects only.');
  assert.equal(doc.tables[0].sourceAnchor.jsonPath,'$.reports[0].metrics');
  assert.equal(doc.tables[0].kind,'json_dataset');
  assert.equal(doc.tables[0].rows.length,2);
}

async function testDocxAdapter(){
  const bytes=await buildSyntheticDocx();
  const doc=await extract.extractDocxDocument(bytes,{fileId:'file:docx',fileName:'report.docx',JSZip});
  assert.equal(doc.metadata.nativeTableCount,2,'DOCX should preserve native table count.');
  assert.equal(doc.tables.length,2,'DOCX should expose each native table.');
  assert.equal(doc.tables[0].kind,'native_table');
  assert.equal(doc.tables[0].detection.method,'docx_native_table');
  assert.equal(doc.tables[0].rows.length,2);
  assert.equal(doc.tables[0].sourceAnchor.tableIndex,0);
  assert.equal(doc.tables[1].detection.confidence,'low','Layout-like DOCX tables should be low-confidence.');

  const profile=UA.profileDataset({id:'docx-table',rows:doc.tables[0].rows,extractionConfidence:doc.tables[0].detection.confidence});
  assert.equal(profile.columns.find(column=>column.name==='Revenue').analyticalRole,'metric');
}

function testTxtAdapter(){
  const prose=extract.extractTxtDocument('This is a paragraph.\nIt is not a repeated delimiter table.',{fileId:'file:txt',fileName:'notes.txt'});
  assert.equal(prose.tables.length,0,'Plain prose TXT should not become a fake table.');
  assert.equal(prose.warnings.some(warning=>warning.code==='TABLE_NOT_FOUND'),true);

  const tabular=extract.extractTxtDocument('Name\tScore\nAlpha\t10\nBeta\t20\nGamma\t30',{fileId:'file:txt2',fileName:'scores.txt'});
  assert.equal(tabular.tables.length,1,'Consistent delimited TXT should become a detected table.');
  assert.equal(tabular.tables[0].rows.length,3);
}

async function buildSyntheticDocx(){
  const zip=new JSZip();
  zip.file('[Content_Types].xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`));
  zip.file('_rels/.rels',xml(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`));
  zip.file('word/document.xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Quarterly report</w:t></w:r></w:p>
    ${docxTable([
      ['Channel','Revenue','CTR'],
      ['Search','$1200','12.5%'],
      ['Social','$800','8.1%']
    ])}
    ${docxTable([
      ['Layout note with a very long explanatory paragraph that is not a repeated analytical table and should not be promoted as high confidence.']
    ])}
  </w:body>
</w:document>`));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

function docxTable(rows){
  return `<w:tbl>${rows.map(row=>`<w:tr>${row.map(cell=>`<w:tc><w:p><w:r><w:t>${escapeXml(cell)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
}
function xml(value){return String(value).replace(/^\s+/gm,'').trim();}
function escapeXml(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
