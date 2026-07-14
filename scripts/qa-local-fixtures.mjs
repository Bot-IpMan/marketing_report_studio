import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

await import('../src/features/universal-analysis.js');
await import('../src/features/chart-candidates.js');
await import('../src/features/derived-table-candidates.js');
await import('../src/features/table-detection.js');
await import('../src/features/document-extract.js');
await import('../vendor/jszip-3.10.1.min.js');

const UA=globalThis.MRSUniversalAnalysis;
const charts=globalThis.MRSChartCandidates;
const tables=globalThis.MRSTableDetection;
const documents=globalThis.MRSDocumentExtract;
const JSZip=globalThis.JSZip;
const fixtureDir=resolve(process.argv[2]||'.');
const includeLarge=process.argv.includes('--large');
const strict=process.argv.includes('--strict');
const output={fixtureDir,pdfQa:{status:'SKIPPED',reason:'No PDF fixtures were found.'},checks:{},warnings:[]};
let pdfjs=null,pdfJsAttempted=false,pdfChecks=0,pdfFailures=0;

function fixture(name){
  const path=resolve(fixtureDir,name);
  return existsSync(path)?path:null;
}
function xmlDecode(value){return String(value||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
function columnIndex(reference){
  const letters=String(reference||'A').replace(/\d/g,'').toUpperCase();
  let result=0;for(const letter of letters) result=result*26+letter.charCodeAt(0)-64;
  return result-1;
}
async function firstXlsxMatrix(path){
  const zip=await JSZip.loadAsync(readFileSync(path));
  const sharedXml=await zip.file('xl/sharedStrings.xml')?.async('string')||'';
  const shared=[...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map(match=>[...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map(text=>xmlDecode(text[1])).join(''));
  const workbook=await zip.file('xl/workbook.xml')?.async('string')||'';
  const sheetName=xmlDecode(workbook.match(/<sheet\b[^>]*name="([^"]+)"/i)?.[1]||'Sheet1');
  const sheetXml=await zip.file('xl/worksheets/sheet1.xml')?.async('string')||'';
  const matrix=[];
  for(const rowMatch of sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/gi)){
    const rowNumber=Number(rowMatch[1].match(/\br="(\d+)"/)?.[1])||matrix.length+1;
    while(matrix.length<rowNumber-1) matrix.push([]);
    const row=[];
    for(const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)){
      const reference=cellMatch[1].match(/\br="([^"]+)"/)?.[1]||'A1';
      const type=cellMatch[1].match(/\bt="([^"]+)"/)?.[1]||'';
      const raw=cellMatch[2].match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1]??cellMatch[2].match(/<t\b[^>]*>([\s\S]*?)<\/t>/i)?.[1]??'';
      let value=type==='s'?shared[Number(raw)]??'':xmlDecode(raw);
      if(type!=='s'&&type!=='inlineStr'&&String(value).trim()!==''&&Number.isFinite(Number(value))) value=Number(value);
      row[columnIndex(reference)]=value;
    }
    matrix[rowNumber-1]=row;
  }
  return {sheetName,matrix};
}
async function checkPdf(name){
  const path=fixture(name);if(!path)return;
  pdfChecks+=1;
  if(!pdfJsAttempted){
    pdfJsAttempted=true;
    try{
      pdfjs=await import('../vendor/pdfjs/pdf.legacy.min.mjs');
      if(pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
    }catch(error){output.pdfQa={status:'SKIPPED',reason:`Vendored PDF.js Node QA unavailable: ${error.message}`};output.warnings.push(output.pdfQa.reason);return;}
  }
  if(!pdfjs) return;
  const bytes=readFileSync(path);
  const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const documentModel=await documents.extractPdfDocument(arrayBuffer,{fileId:`qa:${name}`,fileName:name,pdfjsLib:pdfjs,onProgress:progress=>{if(progress.processed&&progress.processed%25===0) process.stderr.write(`\r${name}: ${progress.processed}/${progress.total}`);}});
  process.stderr.write('\r');
  let chartCandidates=0,wideTimelineCandidates=0,recommended=0;
  for(const table of documentModel.tables){
    const dataset={id:table.id,rows:table.rows,sourceFileId:table.sourceFileId,sourceDocumentId:table.documentId,sourceTableId:table.id,sourceAnchor:table.sourceAnchor,extractionConfidence:table.detection.confidence};
    const profile=UA.profileDataset(dataset),registry=charts.createChartCandidateRegistry(dataset,profile);
    chartCandidates+=registry.candidateCount;recommended+=registry.recommended.length;wideTimelineCandidates+=registry.candidates.filter(candidate=>candidate.candidateType==='wide_timeline').length;
  }
  const warnings=documentModel.warnings.map(warning=>warning.code||warning);
  const quality=documentModel.metadata?.textQuality||{};
  let expected=true;
  if(name==='clean-native-table.pdf') expected=documentModel.tables.length>=1&&chartCandidates>0;
  else if(name==='native-text-no-table.pdf') expected=(quality.goodPages||0)>0&&documentModel.tables.length===0;
  else if(name==='scanned-image-only.pdf') expected=warnings.includes('PDF_SCANNED_NO_OCR')&&documentModel.tables.length===0;
  else if(name==='corrupted-text.pdf') expected=warnings.includes('PDF_TEXT_CORRUPTED')&&!documentModel.tables.some(table=>table.detection.confidence==='high');
  if(!expected) pdfFailures+=1;
  output.checks[name]={qaStatus:expected?'PASS':'FAIL',status:documentModel.extractionStatus,confidence:documentModel.extractionConfidence,pageCount:documentModel.metadata.pageCount,nativeTextPages:quality.goodPages||0,corruptedTextPages:quality.corruptedPages||0,emptyTextPages:quality.emptyPages||0,textBlocks:documentModel.textBlocks.length,tables:documentModel.tables.length,chartCandidates,recommended,wideTimelineCandidates,tableSamples:documentModel.tables.slice(0,8).map(table=>({page:table.sourceAnchor.page,confidence:table.detection.confidence,columns:table.columns.map(column=>column.name).slice(0,10),rows:table.rows.length})),warnings};
}

const csvPath=fixture('ukraine_energy_prospects_200_seo.csv');
if(csvPath){
  const documentModel=documents.extractDelimitedDocument(readFileSync(csvPath,'utf8'),{fileId:'qa:csv',fileName:'ukraine_energy_prospects_200_seo.csv'});
  const table=documentModel.tables[0],dataset={id:'qa:csv',rows:table?.rows||[],sourceAnchor:table?.sourceAnchor||{},extractionConfidence:table?.detection?.confidence||'unknown'};
  const profile=UA.profileDataset(dataset),registry=charts.createChartCandidateRegistry(dataset,profile);
  output.checks.csv={rows:profile.rowCount,columns:profile.columnCount,chartCandidates:registry.candidateCount,recommended:registry.recommended.length,identifiers:profile.roles.identifiers,metrics:profile.roles.metrics.length,timelines:profile.roles.timelines};
}

const xlsxPath=fixture('marketing_comparison.xlsx');
if(xlsxPath){
  const {sheetName,matrix}=await firstXlsxMatrix(xlsxPath),detected=tables.detectTablesInMatrix(matrix);
  output.checks.xlsx={sheetName,rows:matrix.length,columns:Math.max(0,...matrix.map(row=>row.length)),tables:detected.tables.length,headerRows:detected.tables.map(table=>table.headerRow+1),dataRows:detected.tables.map(table=>table.rows.length),textBlocks:detected.textBlocks.map(block=>({kind:block.kind,startRow:block.startRow,endRow:block.endRow,text:block.text.slice(0,120)}))};
}

const docxPath=fixture('2025_AnnualReport.docx');
if(docxPath){
  const bytes=readFileSync(docxPath),arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const documentModel=await documents.extractDocxDocument(arrayBuffer,{fileId:'qa:docx',fileName:'2025_AnnualReport.docx',JSZip});
  output.checks.docx={status:documentModel.extractionStatus,nativeTableCount:documentModel.metadata.nativeTableCount,paragraphCount:documentModel.metadata.paragraphCount,datasetsWithRows:documentModel.tables.filter(table=>table.rows.length&&table.columns.length>=2).length,lowConfidenceTables:documentModel.tables.filter(table=>table.detection.confidence==='low').length};
}

for(const name of readdirSync(fixtureDir).filter(name=>/\.md$/i.test(name)&&(/marketing_report\.md$/i.test(name)||/^YT_VIDEO_(?:ANALYSIS|VISUALIZATION)/i.test(name))).slice(0,6)){
  const documentModel=documents.extractMarkdownDocument(readFileSync(resolve(fixtureDir,name),'utf8'),{fileId:`qa:${name}`,fileName:name});
  output.checks[`markdown:${name}`]={tables:documentModel.tables.length,headings:documentModel.metadata.headingCount,diagrams:documentModel.diagramBlocks.length};
}

await checkPdf('TSLA-Q1-2026-Update.pdf');
await checkPdf('marketing_report.pdf');
if(includeLarge) await checkPdf('2026-Annual-Report-Web.pdf');
await checkPdf('clean-native-table.pdf');
await checkPdf('native-text-no-table.pdf');
await checkPdf('corrupted-text.pdf');
await checkPdf('scanned-image-only.pdf');

if(pdfChecks&&pdfjs) output.pdfQa=pdfFailures?{status:'FAIL',reason:`${pdfFailures} of ${pdfChecks} PDF fixture checks failed.`}:{status:'PASS',reason:`${pdfChecks} real PDF fixture checks completed with vendored PDF.js.`};
if(strict&&output.pdfQa.status!=='PASS') process.exitCode=1;

console.log(JSON.stringify(output,null,2));
