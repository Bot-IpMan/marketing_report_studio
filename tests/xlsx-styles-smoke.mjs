import assert from 'node:assert/strict';

await import('../vendor/jszip-3.10.1.min.js');
await import('../src/features/universal-analysis.js');
await import('../src/features/table-detection.js');

const JSZip=globalThis.JSZip;
const UA=globalThis.MRSUniversalAnalysis;
const tables=globalThis.MRSTableDetection;

const bytes=await buildSyntheticStyledXlsx();
const matrix=await parseSyntheticStyledXlsx(bytes);
const detected=tables.detectTablesInMatrix(matrix);

assert.equal(detected.tables.length,1,'styled XLSX fixture should yield one structural table');
assert.equal(detected.tables[0].headerRow,3,'styled XLSX fixture should detect the row-4 header structurally');

const dataset={id:'styled-xlsx',rows:detected.tables[0].rows,extractionConfidence:'high'};
const profile=UA.profileDataset(dataset);

assert.equal(profile.rowCount,4);
assert.equal(profile.columns.find(column=>column.name==='Date').analyticalRole,'timeline','Excel serial dates with date styles must become timeline columns');
assert.equal(profile.columns.find(column=>column.name==='CTR').physicalType,'percent','Excel percent styles must survive as percent values');
assert.equal(profile.columns.find(column=>column.name==='Revenue').physicalType,'currency','Excel currency styles must survive as currency values');
assert.equal(profile.columns.find(column=>column.name==='Price').analyticalRole,'metric','sequential styled price values must remain metrics');
assert.equal(profile.columns.find(column=>column.name==='Profit').physicalType,'currency','Excel accounting currency styles must survive as currency values');
assert.equal(profile.columns.find(column=>column.name==='Profit').numericStats.hasNegative,true,'Excel accounting negatives must remain negative metrics');

console.log('XLSX styles smoke test passed.');

async function buildSyntheticStyledXlsx(){
  const zip=new JSZip();
  zip.file('[Content_Types].xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`));
  zip.file('_rels/.rels',xml(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`));
  zip.file('xl/workbook.xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="false"/>
  <sheets><sheet name="Styled" sheetId="1" r:id="rId1"/></sheets>
</workbook>`));
  zip.file('xl/_rels/workbook.xml.rels',xml(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`));
  zip.file('xl/styles.xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="$#,##0.00"/>
    <numFmt numFmtId="165" formatCode="0.0%"/>
    <numFmt numFmtId="166" formatCode="$#,##0.00;($#,##0.00)"/>
  </numFmts>
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`));
  zip.file('xl/worksheets/sheet1.xml',xml(`<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Marketing comparison</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Source note</t></is></c></row>
    <row r="4">
      ${inlineCell('A4','Company')}${inlineCell('B4','Date')}${inlineCell('C4','CTR')}${inlineCell('D4','Revenue')}${inlineCell('E4','Price')}${inlineCell('F4','Region')}${inlineCell('G4','Profit')}
    </row>
    ${dataRow(5,'Alpha',44927,0.123,1234.56,100,'UA')}
    ${dataRow(6,'Beta',44958,0.156,2345.67,101,'EU')}
    ${dataRow(7,'Gamma',44986,0.201,3456.78,102,'UA')}
    ${dataRow(8,'Delta',45017,0.182,4567.89,103,'EU')}
    <row r="10"><c r="A10" t="inlineStr"><is><t>Notes:</t></is></c></row>
    <row r="11"><c r="A11" t="inlineStr"><is><t>Styled numeric cells must preserve analytical meaning.</t></is></c></row>
  </sheetData>
</worksheet>`));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

function inlineCell(ref,value){return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;}
function valueCell(ref,value,styleIndex=0){return `<c r="${ref}" s="${styleIndex}"><v>${value}</v></c>`;}
function dataRow(row,company,dateSerial,ctr,revenue,price,region){
  const profit=row===6?-321.09:revenue-price*10;
  return `<row r="${row}">
    ${inlineCell(`A${row}`,company)}
    ${valueCell(`B${row}`,dateSerial,1)}
    ${valueCell(`C${row}`,ctr,2)}
    ${row===7?formulaValueCell(`D${row}`,'E7*33.561',revenue,3):valueCell(`D${row}`,revenue,3)}
    ${valueCell(`E${row}`,price,0)}
    ${inlineCell(`F${row}`,region)}
    ${valueCell(`G${row}`,profit,4)}
  </row>`;
}
function formulaValueCell(ref,formula,value,styleIndex=0){return `<c r="${ref}" s="${styleIndex}"><f>${escapeXml(formula)}</f><v>${value}</v></c>`;}
function xml(value){return String(value).replace(/^\s+/gm,'').trim();}
function escapeXml(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

async function parseSyntheticStyledXlsx(bytes){
  const zip=await JSZip.loadAsync(bytes);
  const styles=await parseStyles(zip);
  const sheetXml=await zip.file('xl/worksheets/sheet1.xml').async('string');
  const matrix=[];
  for(const rowMatch of sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/gi)){
    const rowNumber=Number(rowMatch[1].match(/\br="(\d+)"/)?.[1])||matrix.length+1;
    while(matrix.length<rowNumber-1) matrix.push([]);
    const row=[];
    for(const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)){
      const attrs=cellMatch[1],body=cellMatch[2];
      const reference=attrs.match(/\br="([^"]+)"/)?.[1]||'A1';
      const type=attrs.match(/\bt="([^"]+)"/)?.[1]||'';
      const styleIndex=Number(attrs.match(/\bs="(\d+)"/)?.[1]||0);
      const raw=body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1]??body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/i)?.[1]??'';
      row[columnIndex(reference)]=type==='inlineStr'?xmlDecode(raw):formatStyledValue(raw,styles[styleIndex]||{kind:'general'});
    }
    matrix[rowNumber-1]=row;
  }
  return matrix;
}

async function parseStyles(zip){
  const stylesXml=await zip.file('xl/styles.xml').async('string');
  const custom=new Map([...stylesXml.matchAll(/<numFmt\b([^>]*)\/?>/gi)].map(match=>[
    Number(match[1].match(/\bnumFmtId="(\d+)"/)?.[1]),
    xmlDecode(match[1].match(/\bformatCode="([^"]*)"/)?.[1]||'')
  ]));
  const builtIn={9:{kind:'percent'},10:{kind:'percent'},14:{kind:'date'},15:{kind:'date'},16:{kind:'date'},17:{kind:'date'},18:{kind:'date'},19:{kind:'date'},20:{kind:'date'},21:{kind:'date'},22:{kind:'date'}};
  const xfsBlock=stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/i)?.[1]||'';
  return [...xfsBlock.matchAll(/<xf\b([^>]*)\/?>/gi)].map(match=>{
    const id=Number(match[1].match(/\bnumFmtId="(\d+)"/)?.[1]||0);
    return builtIn[id]||classifyFormat(custom.get(id)||'');
  });
}
function classifyFormat(code){
  if(/%/.test(code)) return {kind:'percent'};
  const negativeStyle=/;\s*(?:\[[^\]]+\])?\s*\(/.test(String(code||''))?'parentheses':null;
  if(/\$|USD/i.test(code)) return {kind:'currency',currency:'USD',negativeStyle};
  if(/[ymd]/i.test(code)) return {kind:'date'};
  return {kind:'number',negativeStyle};
}
function formatStyledValue(raw,style){
  const value=Number(raw);
  if(!Number.isFinite(value)) return raw;
  if(style.kind==='date') return excelSerialDate(value);
  if(style.kind==='percent') return `${Number((value*100).toFixed(10))}%`;
  if(style.kind==='currency'){
    const formatted=`$${Math.abs(value)}`;
    return value<0 && style.negativeStyle==='parentheses'?`(${formatted})`:(value<0?`-${formatted}`:formatted);
  }
  return value;
}
function excelSerialDate(serial){
  return new Date(Date.UTC(1899,11,30)+Math.floor(Number(serial))*86400000).toISOString().slice(0,10);
}
function columnIndex(reference){
  const letters=String(reference||'A').replace(/\d/g,'').toUpperCase();
  let result=0;for(const letter of letters) result=result*26+letter.charCodeAt(0)-64;
  return result-1;
}
function xmlDecode(value){
  return String(value||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
}
