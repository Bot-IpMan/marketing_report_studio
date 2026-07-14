import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const outputDir=resolve(root,'tests/fixtures/pdf');
mkdirSync(outputDir,{recursive:true});

function escapePdfText(value){return String(value).replace(/([\\()])/g,'\\$1');}
function textStream(lines){
  return ['BT','/F1 11 Tf',...lines.map(({x,y,text})=>`1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj`),'ET'].join('\n');
}
function pdfBytes(content){
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content,'ascii')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  ];
  let pdf='%PDF-1.4\n%MRS\n';
  const offsets=[0];
  objects.forEach((object,index)=>{offsets[index+1]=Buffer.byteLength(pdf,'ascii');pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=Buffer.byteLength(pdf,'ascii');
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let index=1;index<=objects.length;index+=1) pdf+=`${String(offsets[index]).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf,'ascii');
}
function write(name,content){writeFileSync(resolve(outputDir,name),pdfBytes(content));}

const table=[
  ['Metric','Q1-2025','Q2-2025','Q3-2025','Q4-2025'],
  ['Revenue','100','120','140','160'],
  ['Cost','70','75','85','90'],
  ['Operating income','30','45','55','70']
];
const xs=[50,205,285,365,445];
write('clean-native-table.pdf',textStream(table.flatMap((row,rowIndex)=>row.map((text,columnIndex)=>({x:xs[columnIndex],y:710-rowIndex*34,text})))));
write('native-text-no-table.pdf',textStream([
  {x:50,y:710,text:'Quarterly overview'},
  {x:50,y:680,text:'Revenue improved during the year while operating costs remained controlled.'},
  {x:50,y:650,text:'This narrative page intentionally contains no repeated tabular geometry.'}
]));
write('corrupted-text.pdf',textStream([
  {x:50,y:710,text:'AAAAAAAA BBBBBBBB CCCCCCCC DDDDDDDD'},
  {x:50,y:675,text:'EEEEEEEE FFFFFFFF GGGGGGGG HHHHHHHH'}
]));
write('scanned-image-only.pdf','q\n0.88 g\n50 390 512 300 re f\n0.7 g\n80 640 360 18 re f\n80 600 420 10 re f\n80 575 390 10 re f\nQ');

console.log(`Generated deterministic PDF fixtures in ${outputDir}`);
