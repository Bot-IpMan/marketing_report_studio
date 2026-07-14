import assert from 'node:assert/strict';

await import('../vendor/jszip-3.10.1.min.js');
await import('../src/features/universal-analysis.js');
await import('../src/features/table-detection.js');

const JSZip=globalThis.JSZip;
const tables=globalThis.MRSTableDetection;

const bytes=await buildWorkbook();
const sheets=await parseWorkbookMatrices(bytes);

assert.equal(sheets.length,2,'synthetic workbook should expose two sheets.');
assert.equal(sheets[0].name,'Multi tables');
assert.deepEqual(sheets[0].mergedCells,['A1:D1'],'merged title refs should be preserved as metadata.');

const first=tables.detectTablesInMatrix(sheets[0].matrix);
assert.equal(first.tables.length,2,'one sheet should support multiple vertically separated table regions.');
assert.equal(first.tables[0].headerRow,3,'first table should detect header after title/source rows.');
assert.equal(first.tables[0].rows.length,3);
assert.equal(first.tables[1].headerRow,9,'second table should detect its own worksheet row-10 header after a separator.');
assert.equal(first.tables[1].rows.length,2);
assert.ok(first.textBlocks.some(block=>block.kind==='metadata'&&block.startRow===1&&block.endRow===2),'title/source rows should remain metadata.');
assert.ok(first.textBlocks.some(block=>block.text.includes('Notes:')),'tail notes should remain text blocks instead of fake rows.');

const second=tables.detectTablesInMatrix(sheets[1].matrix);
assert.equal(second.tables.length,1,'second sheet should detect its own table independently.');
assert.equal(second.tables[0].rows.length,4);
assert.equal(second.tables[0].headers.includes('Quarter'),true);
assert.equal(second.tables[0].headers.includes('Revenue'),true);

console.log('XLSX regions smoke test passed.');

async function buildWorkbook(){
  const zip=new JSZip();
  zip.file('[Content_Types].xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`));
  zip.file('_rels/.rels',xml(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`));
  zip.file('xl/workbook.xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Multi tables" sheetId="1" r:id="rId1"/>
    <sheet name="Timeline" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`));
  zip.file('xl/_rels/workbook.xml.rels',xml(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`));
  zip.file('xl/worksheets/sheet1.xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${inlineCell('A1','Marketing comparison workbook')}</row>
    <row r="2">${inlineCell('A2','Source: synthetic fixture')}</row>
    <row r="4">${inlineCell('A4','Company')}${inlineCell('B4','Region')}${inlineCell('C4','Revenue')}${inlineCell('D4','Status')}</row>
    ${row(5,['Alpha','UA',1200,'active'])}
    ${row(6,['Beta','EU',900,'paused'])}
    ${row(7,['Gamma','US',1500,'active'])}
    <row r="10">${inlineCell('A10','Channel')}${inlineCell('B10','Cost')}${inlineCell('C10','CTR')}</row>
    ${row(11,['Search',300,'12%'])}
    ${row(12,['Social',240,'8%'])}
    <row r="14">${inlineCell('A14','Notes:')}</row>
    <row r="15">${inlineCell('A15','Rows 5-7 and 11-12 are separate tables.')}</row>
  </sheetData>
  <mergeCells count="1"><mergeCell ref="A1:D1"/></mergeCells>
</worksheet>`));
  zip.file('xl/worksheets/sheet2.xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${inlineCell('A1','Quarterly metrics')}</row>
    <row r="3">${inlineCell('A3','Quarter')}${inlineCell('B3','Revenue')}${inlineCell('C3','Cost')}</row>
    ${row(4,['Q1-2026',1000,400])}
    ${row(5,['Q2-2026',1200,460])}
    ${row(6,['Q3-2026',1400,520])}
    ${row(7,['Q4-2026',1600,600])}
  </sheetData>
</worksheet>`));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

async function parseWorkbookMatrices(bytes){
  const zip=await JSZip.loadAsync(bytes);
  const workbook=await zip.file('xl/workbook.xml').async('string');
  const rels=await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relMap=new Map([...rels.matchAll(/<Relationship\b([^>]*)\/?>/gi)].map(match=>[
    attr(match[1],'Id'),
    attr(match[1],'Target')
  ]));
  const out=[];
  for(const sheetMatch of workbook.matchAll(/<sheet\b([^>]*)\/?>/gi)){
    const attrs=sheetMatch[1];
    const name=xmlDecode(attr(attrs,'name')||'Sheet');
    const rid=attr(attrs,'r:id')||attr(attrs,'id');
    const target=relMap.get(rid);
    if(!target) continue;
    const path=(target.startsWith('xl/')?target:`xl/${target}`).replace(/\\/g,'/');
    const sheetXml=await zip.file(path).async('string');
    out.push({name,matrix:parseSheetMatrix(sheetXml),mergedCells:[...sheetXml.matchAll(/<mergeCell\b[^>]*\bref="([^"]+)"/gi)].map(match=>match[1])});
  }
  return out;
}

function parseSheetMatrix(sheetXml){
  const matrix=[];
  for(const rowMatch of sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/gi)){
    const rowNumber=Number(attr(rowMatch[1],'r'))||matrix.length+1;
    while(matrix.length<rowNumber-1) matrix.push([]);
    const values=[];
    for(const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)){
      const attrs=cellMatch[1],body=cellMatch[2];
      const ref=attr(attrs,'r')||'A1';
      const raw=body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1]??body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/i)?.[1]??'';
      const decoded=xmlDecode(raw);
      const numeric=Number(decoded);
      values[columnIndex(ref)]=Number.isFinite(numeric)&&decoded.trim()!==''?numeric:decoded;
    }
    matrix[rowNumber-1]=values;
  }
  return matrix;
}

function row(number,values){
  return `<row r="${number}">${values.map((value,index)=>typeof value==='number'?valueCell(`${letter(index)}${number}`,value):inlineCell(`${letter(index)}${number}`,value)).join('')}</row>`;
}
function inlineCell(ref,value){return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;}
function valueCell(ref,value){return `<c r="${ref}"><v>${value}</v></c>`;}
function letter(index){
  let value=index+1,out='';
  while(value>0){const mod=(value-1)%26;out=String.fromCharCode(65+mod)+out;value=Math.floor((value-1)/26);}
  return out;
}
function columnIndex(reference){
  const letters=String(reference||'A').replace(/\d/g,'').toUpperCase();
  let result=0;for(const letter of letters) result=result*26+letter.charCodeAt(0)-64;
  return result-1;
}
function attr(attrs,name){return String(attrs||'').match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]||'';}
function xml(value){return String(value).replace(/^\s+/gm,'').trim();}
function escapeXml(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function xmlDecode(value){return String(value||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
