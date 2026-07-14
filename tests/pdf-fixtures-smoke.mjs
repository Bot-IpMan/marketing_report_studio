import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

await import('../src/features/universal-analysis.js');
await import('../src/features/chart-candidates.js');
await import('../src/features/table-detection.js');
await import('../src/features/document-extract.js');
const pdfjs=await import('../vendor/pdfjs/pdf.legacy.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;

const documents=globalThis.MRSDocumentExtract;
const charts=globalThis.MRSChartCandidates;
const UA=globalThis.MRSUniversalAnalysis;
const fixtureDir=resolve('tests/fixtures/pdf');

const tocQuality=documents.scorePdfTableCandidate({headers:['Section','Page'],rows:[{Section:'Financial summary',Page:'4'},{Section:'Balance sheet',Page:'26'}],matrix:[['Section','Page'],['Financial summary','4'],['Balance sheet','26']],structureScore:80});
assert.equal(tocQuality.accepted,false,'table-of-contents rows must not be auto-promoted');
assert.ok(tocQuality.rejectionReasons.includes('table_of_contents_pattern'));
const rebuilt=documents.reconstructFinancialTableHeaders([['Financial Summary','',''],['','Q1-2025','Q2-2025'],['Revenue','100','120']]);
assert.equal(rebuilt.reconstructed,true,'period row must replace a title row as the financial header');
assert.deepEqual(rebuilt.matrix[0],['Metric','Q1-2025','Q2-2025']);

async function extract(name,options={}){
  const bytes=readFileSync(resolve(fixtureDir,name));
  const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  return documents.extractPdfDocument(arrayBuffer,{fileId:`fixture:${name}`,fileName:name,pdfjsLib:pdfjs,pdfJsStatus:'loaded',previewAvailable:true,...options});
}

const clean=await extract('clean-native-table.pdf');
assert.equal(clean.extractionStatus,'complete');
assert.ok(clean.tables.length>=1,'clean native-text PDF must yield a real geometry table');
assert.equal(clean.tables[0].sourceAnchor.page,1,'PDF page anchor must survive extraction');
const dataset={id:'clean-pdf-table',rows:clean.tables[0].rows,sourceFileId:clean.fileId,sourceDocumentId:clean.id,sourceTableId:clean.tables[0].id,sourceAnchor:clean.tables[0].sourceAnchor,extractionConfidence:clean.tables[0].detection.confidence};
const registry=charts.createChartCandidateRegistry(dataset,UA.profileDataset(dataset));
assert.ok(registry.candidateCount>0,'clean PDF table must produce chart candidates');
assert.equal(registry.candidates.every(candidate=>candidate.extractionConfidence===dataset.extractionConfidence),true,'PDF confidence must propagate to every chart candidate');

const noTable=await extract('native-text-no-table.pdf');
assert.equal(noTable.metadata.pdfDiagnostics.nativeTextPages,1);
assert.equal(noTable.tables.length,0,'narrative PDF must not fabricate a table');
assert.notEqual(noTable.extractionStatus,'failed');

const scanned=await extract('scanned-image-only.pdf');
assert.equal(scanned.extractionStatus,'preview_only');
assert.ok(scanned.warnings.some(warning=>warning.code==='PDF_SCANNED_NO_OCR'));
assert.equal(scanned.tables.length,0,'image-only PDF must not fabricate a table');

const corrupted=await extract('corrupted-text.pdf');
assert.equal(corrupted.extractionStatus,'needs_review');
assert.ok(corrupted.warnings.some(warning=>warning.code==='PDF_TEXT_CORRUPTED'));
assert.equal(corrupted.tables.some(table=>table.detection.confidence==='high'),false,'corrupted text must not create a high-confidence table');

const unavailable=await documents.extractPdfDocument(new ArrayBuffer(8),{
  fileId:'missing',fileName:'missing.pdf',pdfjsLib:null,pdfJsStatus:'failed',previewAvailable:true,
  pdfJsLoaderDiagnostics:{
    status:'failed',stage:'module_import',code:'PDFJS_MODULE_IMPORT_FAILED',errorName:'TypeError',
    errorMessage:'Failed to fetch dynamically imported module',protocol:'https:',baseURI:'https://example.test/app/',
    moduleUrl:'https://example.test/vendor/pdfjs/pdf.min.mjs',workerUrl:'https://example.test/vendor/pdfjs/pdf.worker.min.mjs',
    modulePath:'vendor/pdfjs/pdf.min.mjs',workerPath:'vendor/pdfjs/pdf.worker.min.mjs'
  }
});
assert.ok(unavailable.warnings.some(warning=>warning.code==='PDFJS_MODULE_IMPORT_FAILED'));
assert.equal(unavailable.metadata.pdfDiagnostics.errorCode,'PDFJS_MODULE_IMPORT_FAILED');
assert.equal(unavailable.metadata.pdfDiagnostics.errorStage,'module_import');
assert.equal(unavailable.metadata.pdfDiagnostics.errorName,'TypeError');
assert.match(unavailable.metadata.pdfDiagnostics.errorMessage,/dynamically imported module/);
assert.equal(unavailable.metadata.pdfDiagnostics.protocol,'https:');
assert.equal(unavailable.metadata.pdfDiagnostics.moduleUrl,'https://example.test/vendor/pdfjs/pdf.min.mjs');
assert.equal(unavailable.metadata.pdfDiagnostics.workerUrl,'https://example.test/vendor/pdfjs/pdf.worker.min.mjs');

const workerFailurePdfJs={getDocument(){return {promise:Promise.reject(new Error('Setting up fake worker failed')),destroy(){}};}};
const workerFailure=await documents.extractPdfDocument(new ArrayBuffer(8),{fileId:'worker',fileName:'worker.pdf',pdfjsLib:workerFailurePdfJs,pdfJsStatus:'loaded'});
assert.equal(workerFailure.metadata.pdfDiagnostics.errorCode,'PDFJS_WORKER_LOAD_FAILED');
assert.equal(workerFailure.metadata.pdfDiagnostics.workerStatus,'failed');
assert.equal(workerFailure.metadata.pdfDiagnostics.errorStage,'worker_load');
assert.match(workerFailure.metadata.pdfDiagnostics.errorMessage,/fake worker/);

console.log('Real PDF fixture smoke test passed.');
