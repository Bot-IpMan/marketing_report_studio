(function(global){
'use strict';

const UA=global.MRSUniversalAnalysis;
const TABLES=global.MRSTableDetection;
if(!UA || !TABLES) throw new Error('Universal analysis and table detection must load before document-extract.js');

const EXTRACTION_STATUSES=new Set(['not_started','processing','complete','partial','preview_only','needs_review','failed','cancelled']);
const EXTRACTION_CONFIDENCE=new Set(['unknown','low','medium','high']);

function now(){return new Date().toISOString();}
function stableId(prefix,...parts){return `${prefix}:${UA.stableHash(parts.join('|'))}`;}
function extensionOf(name){return (String(name||'').split('.').pop()||'').toLowerCase();}
function mimeForExtension(extension){
  const map={csv:'text/csv',tsv:'text/tab-separated-values',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',json:'application/json',md:'text/markdown',markdown:'text/markdown',html:'text/html',htm:'text/html',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml'};
  return map[extension]||'application/octet-stream';
}

function createDocumentModel(input={}){
  const stamp=now();
  const fileName=String(input.fileName||input.name||'file');
  const extension=String(input.extension||extensionOf(fileName)).toLowerCase();
  return {
    id:String(input.id||stableId('doc',input.fileId||'',fileName,input.createdAt||stamp)),
    fileId:String(input.fileId||''),fileName,extension,mimeType:String(input.mimeType||mimeForExtension(extension)),
    extractionStatus:EXTRACTION_STATUSES.has(input.extractionStatus)?input.extractionStatus:'not_started',
    extractionConfidence:EXTRACTION_CONFIDENCE.has(input.extractionConfidence)?input.extractionConfidence:'unknown',
    metadata:{title:'',author:'',pageCount:null,sheetCount:null,...(input.metadata||{})},
    textBlocks:Array.isArray(input.textBlocks)?input.textBlocks:[],tables:Array.isArray(input.tables)?input.tables:[],
    images:Array.isArray(input.images)?input.images:[],diagramBlocks:Array.isArray(input.diagramBlocks)?input.diagramBlocks:[],
    warnings:Array.isArray(input.warnings)?input.warnings:[],createdAt:input.createdAt||stamp,updatedAt:input.updatedAt||stamp
  };
}

function createExtractedTable(documentModel,input={}){
  const index=input.sourceAnchor?.tableIndex??documentModel.tables.length;
  const stamp=now();
  return {
    id:String(input.id||stableId('table',documentModel.id,index,input.title||'',input.sourceAnchor?.sheet||'',input.sourceAnchor?.page||'')),
    documentId:documentModel.id,sourceFileId:documentModel.fileId,title:String(input.title||`Table ${index+1}`),
    kind:String(input.kind||'detected_table'),columns:Array.isArray(input.columns)?input.columns:[],rows:Array.isArray(input.rows)?input.rows:[],
    sourceAnchor:{sheet:null,page:null,section:null,tableIndex:index,startRow:null,endRow:null,startColumn:null,endColumn:null,...(input.sourceAnchor||{})},
    detection:{method:'structural',confidence:'unknown',score:0,warnings:[],...(input.detection||{})},
    profileId:input.profileId||null,createdAt:input.createdAt||stamp,updatedAt:input.updatedAt||stamp
  };
}

function matrixToGenericRows(matrix,startRow=0){
  const width=Math.max(0,...(matrix||[]).map(row=>(row||[]).length));
  const headers=Array.from({length:width},(_,index)=>`column_${index+1}`);
  const rows=(matrix||[]).filter(row=>(row||[]).some(TABLES.isNonEmpty)).map((source,index)=>{
    const row={};headers.forEach((header,column)=>{row[header]=source?.[column]??'';});
    Object.defineProperty(row,'_sourceRow',{value:startRow+index+1,enumerable:false});
    return row;
  });
  return {headers,rows};
}

function documentFromMatrix(input={}){
  const documentModel=createDocumentModel({...input,extractionStatus:'processing'});
  const matrix=Array.isArray(input.matrix)?input.matrix:[];
  const detected=TABLES.detectTablesInMatrix(matrix,input.detectionOptions||{});
  detected.tables.forEach((table,index)=>{
    documentModel.tables.push(createExtractedTable(documentModel,{
      title:input.tableTitle||`${input.sheetName||documentModel.fileName} · Table ${index+1}`,
      kind:input.kind||'detected_table',columns:table.headers.map(name=>({name})),rows:table.rows,
      sourceAnchor:{sheet:input.sheetName||null,tableIndex:index,startRow:table.headerRow+1,endRow:table.endRow+1,startColumn:table.startColumn+1,endColumn:table.endColumn+1},
      detection:{method:input.method||'matrix_region',confidence:table.confidence,score:table.score/100,warnings:table.warnings||[]}
    }));
  });
  documentModel.textBlocks.push(...detected.textBlocks.map(block=>({...block,sheet:input.sheetName||null})));
  documentModel.warnings.push(...detected.warnings);
  documentModel.extractionStatus=documentModel.tables.length?'complete':(matrix.length?'needs_review':'preview_only');
  documentModel.extractionConfidence=documentModel.tables.some(table=>table.detection.confidence==='high')?'high':(documentModel.tables.length?'medium':'low');
  documentModel.updatedAt=now();
  return documentModel;
}

function splitDelimitedLine(line,delimiter){
  const cells=[];let value='',quoted=false;
  for(let index=0;index<String(line||'').length;index+=1){
    const char=line[index],next=line[index+1];
    if(quoted){
      if(char==='"'&&next==='"'){value+='"';index+=1;}
      else if(char==='"') quoted=false;
      else value+=char;
    }else if(char==='"') quoted=true;
    else if(char===delimiter){cells.push(value);value='';}
    else value+=char;
  }
  cells.push(value);
  return cells;
}

function detectDelimiter(text,allowed=[',',';','\t']){
  const lines=String(text||'').replace(/^\ufeff/,'').split(/\r?\n/).filter(line=>line.trim()).slice(0,12);
  let best=null;
  for(const delimiter of allowed){
    const widths=lines.map(line=>splitDelimitedLine(line,delimiter).length);
    const multi=widths.filter(width=>width>1).length;
    const counts=new Map();widths.forEach(width=>counts.set(width,(counts.get(width)||0)+1));
    const consistency=widths.length?Math.max(0,...counts.values())/widths.length:0;
    const score=multi*10+consistency*20+Math.max(0,...widths);
    if(!best||score>best.score) best={delimiter,score,consistency,widths};
  }
  return best&&best.widths.some(width=>width>1)?best:null;
}

function parseDelimitedText(text,delimiter){
  const source=String(text||'').replace(/^\ufeff/,'');
  const chosen=delimiter||detectDelimiter(source)?.delimiter||',';
  const rows=[];let row=[],cell='',quoted=false;
  for(let index=0;index<source.length;index+=1){
    const char=source[index],next=source[index+1];
    if(quoted){
      if(char==='"'&&next==='"'){cell+='"';index+=1;}
      else if(char==='"') quoted=false;
      else cell+=char;
    }else if(char==='"') quoted=true;
    else if(char===chosen){row.push(cell);cell='';}
    else if(char==='\n'){row.push(cell);rows.push(row);row=[];cell='';}
    else if(char!=='\r') cell+=char;
  }
  row.push(cell);rows.push(row);
  return {delimiter:chosen,matrix:rows.filter(item=>item.some(value=>String(value).trim()!==''))};
}

function extractDelimitedDocument(text,input={}){
  const parsed=parseDelimitedText(text,input.delimiter);
  const documentModel=documentFromMatrix({...input,matrix:parsed.matrix,kind:input.kind||'csv_table',method:'delimited_text',detectionOptions:{minHeaderScore:42}});
  const widths=parsed.matrix.map(row=>row.length),expected=widths[0]||0;
  const malformed=widths.filter(width=>width!==expected).length;
  if(malformed) documentModel.warnings.push({code:'MALFORMED_ROW_WIDTH',count:malformed,expected});
  const replacement=(String(text).match(/\ufffd/g)||[]).length;
  if(replacement) documentModel.warnings.push({code:'TEXT_ENCODING_REPLACEMENT_CHARACTERS',count:replacement});
  documentModel.metadata.delimiter=parsed.delimiter;
  return documentModel;
}

function meaningfulObjectArray(value){
  if(!Array.isArray(value)||!value.length) return false;
  const objects=value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item));
  if(objects.length<Math.max(1,Math.ceil(value.length*.6))) return false;
  const keys=new Set();objects.slice(0,50).forEach(item=>Object.keys(item).forEach(key=>keys.add(key)));
  const scalarRows=objects.slice(0,50).filter(item=>Object.values(item).some(child=>child===null||['string','number','boolean'].includes(typeof child))).length;
  const wrapperRows=objects.slice(0,50).filter(item=>{
    const values=Object.values(item||{});
    const scalarCount=values.filter(child=>child===null||['string','number','boolean'].includes(typeof child)).length;
    const nestedCount=values.filter(child=>child&&typeof child==='object').length;
    return nestedCount>0&&scalarCount<2;
  }).length;
  if(objects.length===1&&wrapperRows===1) return false;
  return keys.size>0&&scalarRows>=Math.max(1,Math.ceil(Math.min(objects.length,50)*.5))&&wrapperRows<Math.ceil(Math.min(objects.length,50)*.75);
}

function findJsonObjectArrays(root,options={}){
  const maxDepth=options.maxDepth??6,maxCandidates=options.maxCandidates??40,maxArrayScan=options.maxArrayScan??12;
  const candidates=[];const seenArrays=new WeakSet();
  function visit(value,path,depth){
    if(depth>maxDepth||candidates.length>=maxCandidates||!value||typeof value!=='object') return;
    if(Array.isArray(value)){
      if(seenArrays.has(value)) return;
      seenArrays.add(value);
      if(meaningfulObjectArray(value)) candidates.push({jsonPath:path||'$',rows:value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item))});
      value.slice(0,maxArrayScan).forEach((item,index)=>visit(item,`${path||'$'}[${index}]`,depth+1));
      return;
    }
    for(const [key,child] of Object.entries(value)){
      const safe=/^[A-Za-z_$][\w$]*$/.test(key)?`.${key}`:`[${JSON.stringify(key)}]`;
      visit(child,`${path||'$'}${safe}`,depth+1);
      if(candidates.length>=maxCandidates) break;
    }
  }
  visit(root,'$',0);
  return candidates;
}

function rowsFromObjectArray(rows){
  const names=[];const seen=new Set();
  (rows||[]).forEach(row=>Object.keys(row||{}).forEach(name=>{if(!String(name).startsWith('_')&&!seen.has(name)){seen.add(name);names.push(name);}}));
  return {columns:names.map(name=>({name})),rows:(rows||[]).map(row=>({...row}))};
}

function extractJsonDocument(value,input={}){
  const documentModel=createDocumentModel({...input,extractionStatus:'processing'});
  const candidates=findJsonObjectArrays(value,input);
  candidates.forEach((candidate,index)=>{
    const normalized=rowsFromObjectArray(candidate.rows);
    documentModel.tables.push(createExtractedTable(documentModel,{
      title:`${documentModel.fileName} · ${candidate.jsonPath}`,kind:'json_dataset',columns:normalized.columns,rows:normalized.rows,
      sourceAnchor:{tableIndex:index,jsonPath:candidate.jsonPath},
      detection:{method:'json_object_array',confidence:'high',score:1,warnings:[]}
    }));
  });
  documentModel.extractionStatus=documentModel.tables.length?'complete':'preview_only';
  documentModel.extractionConfidence=documentModel.tables.length?'high':'low';
  if(!documentModel.tables.length) documentModel.warnings.push({code:'TABLE_NOT_FOUND',message:'No meaningful arrays of objects were found.'});
  documentModel.updatedAt=now();
  return documentModel;
}

function splitMarkdownRow(line){
  const text=String(line||'').trim().replace(/^\|/,'').replace(/\|$/,'');
  const cells=[];let value='',escaped=false;
  for(const char of text){
    if(escaped){value+=char;escaped=false;continue;}
    if(char==='\\'){escaped=true;value+=char;continue;}
    if(char==='|'){cells.push(value.trim());value='';continue;}
    value+=char;
  }
  cells.push(value.trim());
  return cells;
}

function markdownHeading(line){
  const match=String(line||'').match(/^(#{1,6})\s+(.+?)\s*#*$/);
  return match?{level:match[1].length,title:match[2].trim()}:null;
}

function extractMarkdownDocument(text,input={}){
  const documentModel=createDocumentModel({...input,extractionStatus:'processing'});
  const lines=String(text||'').split(/\r?\n/),sectionStack=[];
  let inFence=false,fenceLanguage='',fenceStart=0,fenceLines=[],tableIndex=0;
  for(let index=0;index<lines.length;index+=1){
    const line=lines[index],heading=markdownHeading(line);
    if(!inFence&&heading){
      sectionStack.splice(heading.level-1);sectionStack[heading.level-1]=heading.title;
      documentModel.textBlocks.push({kind:'heading',text:heading.title,level:heading.level,lineStart:index+1,lineEnd:index+1,sectionPath:sectionStack.filter(Boolean)});
      continue;
    }
    const fence=line.match(/^\s*```\s*([\w-]*)\s*$/);
    if(fence){
      if(!inFence){inFence=true;fenceLanguage=(fence[1]||'').toLowerCase();fenceStart=index+1;fenceLines=[];}
      else{
        const block={kind:fenceLanguage==='mermaid'?'mermaid':'code',language:fenceLanguage,source:fenceLines.join('\n'),lineStart:fenceStart,lineEnd:index+1,sectionPath:sectionStack.filter(Boolean)};
        if(fenceLanguage==='mermaid') documentModel.diagramBlocks.push(block); else documentModel.textBlocks.push(block);
        inFence=false;fenceLanguage='';fenceLines=[];
      }
      continue;
    }
    if(inFence){fenceLines.push(line);continue;}
    if(index+1<lines.length && line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[index+1]) && lines[index+1].includes('|')){
      const headers=splitMarkdownRow(line);
      const rows=[];let end=index+1;
      for(let rowIndex=index+2;rowIndex<lines.length;rowIndex+=1){
        if(!lines[rowIndex].includes('|')||!lines[rowIndex].trim()) break;
        const values=splitMarkdownRow(lines[rowIndex]);
        if(values.length<2) break;
        const row={};headers.forEach((header,column)=>{row[header||`column_${column+1}`]=values[column]??'';});
        Object.defineProperty(row,'_sourceRow',{value:rowIndex+1,enumerable:false});
        rows.push(row);end=rowIndex;
      }
      if(headers.length>=2&&rows.length){
        const section=sectionStack.filter(Boolean);
        documentModel.tables.push(createExtractedTable(documentModel,{
          title:section[section.length-1]||`Markdown table ${tableIndex+1}`,kind:'markdown_table',columns:headers.map((name,column)=>({name:name||`column_${column+1}`})),rows,
          sourceAnchor:{section:section.join(' / ')||null,sectionPath:section,tableIndex,lineStart:index+1,lineEnd:end+1,startRow:index+1,endRow:end+1},
          detection:{method:'markdown_pipe_table',confidence:'high',score:1,warnings:[]}
        }));
        tableIndex+=1;index=end;continue;
      }
    }
    if(line.trim()) documentModel.textBlocks.push({kind:'text',text:line,lineStart:index+1,lineEnd:index+1,sectionPath:sectionStack.filter(Boolean)});
  }
  if(inFence){
    documentModel.textBlocks.push({kind:'code',language:fenceLanguage,source:fenceLines.join('\n'),lineStart:fenceStart,lineEnd:lines.length,sectionPath:sectionStack.filter(Boolean),warning:'unclosed_fence'});
  }
  documentModel.extractionStatus='complete';
  documentModel.extractionConfidence=documentModel.tables.length?'high':'medium';
  documentModel.metadata.headingCount=documentModel.textBlocks.filter(block=>block.kind==='heading').length;
  documentModel.metadata.diagramCount=documentModel.diagramBlocks.length;
  documentModel.updatedAt=now();
  return documentModel;
}

function localName(element){return String(element?.localName||element?.nodeName||'').split(':').pop();}
function elementChildren(element){return [...(element?.childNodes||[])].filter(node=>node.nodeType===1);}
function descendants(element,name){
  if(!element) return [];
  if(typeof element.getElementsByTagNameNS==='function'){
    const result=[...element.getElementsByTagNameNS('*',name)];
    if(result.length) return result;
  }
  return [...(element.getElementsByTagName?.(name)||[]),...(element.getElementsByTagName?.(`w:${name}`)||[])];
}
function docxParagraphText(paragraphElement){
  const parts=[];
  function walk(node){
    for(const child of node?.childNodes||[]){
      const name=localName(child);
      if(name==='t') parts.push(child.textContent||'');
      else if(name==='tab') parts.push('\t');
      else if(name==='br'||name==='cr') parts.push('\n');
      else walk(child);
    }
  }
  walk(paragraphElement);
  return parts.join('').replace(/[ \t]+\n/g,'\n').trim();
}
function docxCellText(cellElement){
  return descendants(cellElement,'p').map(docxParagraphText).filter(Boolean).join('\n').trim();
}

function parseXml(text,options={}){
  const Parser=options.DOMParserCtor||global.DOMParser;
  if(!Parser) throw new Error('DOMParser is unavailable.');
  const document=new Parser().parseFromString(String(text||''),'application/xml');
  if(document.getElementsByTagName?.('parsererror')?.length) throw new Error('Invalid XML document.');
  return document;
}

function decodeXmlText(value){
  return String(value||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi,(_,code)=>String.fromCodePoint(parseInt(code,16)));
}
function wordXmlFragmentText(fragment){
  const parts=[];
  const pattern=/<w:(t|tab|br|cr)\b[^>]*>([\s\S]*?)<\/w:\1>|<w:(tab|br|cr)\b[^>]*\/>/gi;
  for(const match of String(fragment||'').matchAll(pattern)){
    const kind=(match[1]||match[3]||'').toLowerCase();
    if(kind==='t') parts.push(decodeXmlText(String(match[2]||'').replace(/<[^>]+>/g,'')));
    else if(kind==='tab') parts.push('\t');
    else parts.push('\n');
  }
  return parts.join('').replace(/[ \t]+\n/g,'\n').trim();
}
function extractDocxXmlFallback(xmlText){
  const xml=String(xmlText||'');
  const tableMatches=[...xml.matchAll(/<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/gi)];
  const tables=tableMatches.map((match,index)=>{
    const matrix=[...match[1].matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/gi)].map(rowMatch=>[...rowMatch[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/gi)].map(cellMatch=>wordXmlFragmentText(cellMatch[1])));
    const width=Math.max(0,...matrix.map(row=>row.length)),nonEmpty=matrix.reduce((sum,row)=>sum+row.filter(TABLES.isNonEmpty).length,0);
    const density=matrix.length&&width?nonEmpty/(matrix.length*width):0,layoutLike=width<2||matrix.length<2||density<.25;
    const detected=TABLES.detectTablesInMatrix(matrix,{minHeaderScore:layoutLike?70:35,maxHeaderSearchRows:4}),best=detected.tables[0]||null;
    const normalized=best?{headers:best.headers,rows:best.rows,anchor:{startRow:best.headerRow+1,endRow:best.endRow+1,startColumn:best.startColumn+1,endColumn:best.endColumn+1}}:{...matrixToGenericRows(matrix),anchor:{startRow:1,endRow:matrix.length,startColumn:1,endColumn:width}};
    return {index,matrix,headers:normalized.headers,rows:normalized.rows,anchor:normalized.anchor,confidence:layoutLike?'low':(best?.confidence||'low'),score:best?.score||0,warnings:[...(detected.warnings||[]),{code:'DOCX_XML_FALLBACK'},...(layoutLike?[{code:'DOCX_LAYOUT_TABLE'}]:[])],layoutLike};
  });
  const withoutTables=xml.replace(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/gi,'');
  const paragraphs=[...withoutTables.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi)].map(match=>({kind:'paragraph',text:wordXmlFragmentText(match[1]),style:null,level:null})).filter(paragraph=>paragraph.text);
  return {paragraphs,tables};
}

function extractDocxParagraphs(xmlDocument){
  const paragraphs=[];
  for(const paragraph of descendants(xmlDocument,'p')){
    let parent=paragraph.parentNode,insideTable=false;
    while(parent&&parent!==xmlDocument){if(localName(parent)==='tbl'){insideTable=true;break;}parent=parent.parentNode;}
    if(insideTable) continue;
    const text=docxParagraphText(paragraph);
    if(!text) continue;
    const style=descendants(paragraph,'pStyle')[0]?.getAttribute?.('w:val')||descendants(paragraph,'pStyle')[0]?.getAttribute?.('val')||'';
    const levelMatch=String(style).match(/heading\s*(\d+)/i);
    paragraphs.push({kind:levelMatch?'heading':'paragraph',text,style:style||null,level:levelMatch?Number(levelMatch[1]):null});
  }
  return paragraphs;
}

function extractDocxTables(xmlDocument,context={}){
  const tableElements=descendants(xmlDocument,'tbl');
  return tableElements.map((tableElement,index)=>{
    const matrix=descendants(tableElement,'tr').map(row=>descendants(row,'tc').map(docxCellText));
    const width=Math.max(0,...matrix.map(row=>row.length));
    const nonEmpty=matrix.reduce((sum,row)=>sum+row.filter(TABLES.isNonEmpty).length,0);
    const proseCells=matrix.flat().filter(value=>String(value||'').length>120).length;
    const density=matrix.length&&width?nonEmpty/(matrix.length*width):0;
    const layoutLike=width<2||matrix.length<2||density<.25||proseCells>nonEmpty*.6;
    const detected=TABLES.detectTablesInMatrix(matrix,{minHeaderScore:layoutLike?70:35,maxHeaderSearchRows:4});
    const best=detected.tables[0]||null;
    let normalized;
    if(best) normalized={headers:best.headers,rows:best.rows,anchor:{startRow:best.headerRow+1,endRow:best.endRow+1,startColumn:best.startColumn+1,endColumn:best.endColumn+1}};
    else normalized={...matrixToGenericRows(matrix,0),anchor:{startRow:1,endRow:matrix.length,startColumn:1,endColumn:width}};
    const confidence=layoutLike?'low':(best?.confidence||'low');
    const warnings=[...(detected.warnings||[])];
    if(layoutLike) warnings.push({code:'DOCX_LAYOUT_TABLE'});
    if(!best) warnings.push({code:'HEADER_LOW_CONFIDENCE'});
    return {index,matrix,headers:normalized.headers,rows:normalized.rows,anchor:normalized.anchor,confidence,score:best?.score||0,warnings,layoutLike};
  });
}

async function extractDocxDocument(arrayBuffer,input={}){
  const documentModel=createDocumentModel({...input,extractionStatus:'processing'});
  const Zip=input.JSZip||global.JSZip;
  if(!Zip) throw new Error('JSZip is unavailable.');
  const zip=await Zip.loadAsync(arrayBuffer);
  input.assertSafeArchive?.(zip,'DOCX');
  const entry=zip.file('word/document.xml');
  const xmlText=entry?await entry.async('string'):'';
  if(!xmlText){
    documentModel.extractionStatus='failed';documentModel.extractionConfidence='low';
    documentModel.warnings.push({code:'DOCX_TABLE_PARSE_WARNING',message:'word/document.xml is missing.'});
    return documentModel;
  }
  const Parser=input.DOMParserCtor||global.DOMParser;
  const fallback=Parser?null:extractDocxXmlFallback(xmlText);
  const xmlDocument=Parser?parseXml(xmlText,input):null;
  const paragraphs=fallback?.paragraphs||extractDocxParagraphs(xmlDocument);
  documentModel.textBlocks=paragraphs.map((paragraph,index)=>({...paragraph,position:index}));
  const tables=fallback?.tables||extractDocxTables(xmlDocument,input);
  tables.forEach(table=>{
    documentModel.tables.push(createExtractedTable(documentModel,{
      title:`${documentModel.fileName} · Table ${table.index+1}`,kind:'native_table',columns:table.headers.map(name=>({name})),rows:table.rows,
      sourceAnchor:{tableIndex:table.index,...table.anchor},
      detection:{method:'docx_native_table',confidence:table.confidence,score:table.score/100,warnings:table.warnings}
    }));
  });
  documentModel.metadata.nativeTableCount=tables.length;
  documentModel.metadata.paragraphCount=paragraphs.length;
  documentModel.extractionStatus='complete';
  documentModel.extractionConfidence=tables.some(table=>table.confidence==='high')?'high':(tables.length?'medium':'low');
  documentModel.updatedAt=now();
  return documentModel;
}

function normalizeHtmlTable(tableElement){
  const rowElements=[...tableElement.querySelectorAll('tr')];
  const grid=[];const warnings=[];
  rowElements.forEach((rowElement,rowIndex)=>{
    grid[rowIndex]=grid[rowIndex]||[];
    let column=0;
    for(const cell of [...rowElement.children].filter(element=>['TH','TD'].includes(element.tagName))){
      while(grid[rowIndex][column]!==undefined) column+=1;
      const rowspan=Math.max(1,Number(cell.getAttribute('rowspan'))||1),colspan=Math.max(1,Number(cell.getAttribute('colspan'))||1);
      const text=String(cell.textContent||'').replace(/\s+/g,' ').trim();
      for(let rowOffset=0;rowOffset<rowspan;rowOffset+=1){
        grid[rowIndex+rowOffset]=grid[rowIndex+rowOffset]||[];
        for(let columnOffset=0;columnOffset<colspan;columnOffset+=1){
          grid[rowIndex+rowOffset][column+columnOffset]=rowOffset===0&&columnOffset===0?text:'';
        }
      }
      if(rowspan>1||colspan>1) warnings.push('html_spans_normalized');
      column+=colspan;
    }
  });
  return {matrix:grid,warnings:[...new Set(warnings)]};
}

function extractHtmlDocument(html,input={}){
  const documentModel=createDocumentModel({...input,extractionStatus:'processing'});
  const Parser=input.DOMParserCtor||global.DOMParser;
  if(!Parser){
    documentModel.extractionStatus='preview_only';documentModel.extractionConfidence='low';
    documentModel.warnings.push({code:'UNSUPPORTED_FORMAT',message:'DOMParser is unavailable.'});return documentModel;
  }
  const htmlDocument=new Parser().parseFromString(String(html||''),'text/html');
  const title=htmlDocument.querySelector('title')?.textContent?.trim()||'';
  documentModel.metadata.title=title;
  [...htmlDocument.querySelectorAll('table')].forEach((tableElement,index)=>{
    const normalized=normalizeHtmlTable(tableElement);
    const detected=TABLES.detectTablesInMatrix(normalized.matrix,{minHeaderScore:35,maxHeaderSearchRows:4});
    const table=detected.tables[0];
    const caption=tableElement.querySelector('caption')?.textContent?.trim();
    let heading='';let node=tableElement.previousElementSibling;
    for(let attempts=0;node&&attempts<4;attempts+=1,node=node.previousElementSibling){if(/^H[1-6]$/.test(node.tagName)){heading=node.textContent.trim();break;}}
    const fallback=matrixToGenericRows(normalized.matrix);
    documentModel.tables.push(createExtractedTable(documentModel,{
      title:caption||heading||`HTML table ${index+1}`,kind:'html_table',
      columns:(table?.headers||fallback.headers).map(name=>({name})),rows:table?.rows||fallback.rows,
      sourceAnchor:{section:heading||null,tableIndex:index,startRow:table?table.headerRow+1:1,endRow:table?table.endRow+1:normalized.matrix.length,startColumn:1,endColumn:Math.max(0,...normalized.matrix.map(row=>row.length))},
      detection:{method:'html_native_table',confidence:table?.confidence||'low',score:(table?.score||0)/100,warnings:[...normalized.warnings,...(detected.warnings||[])]}
    }));
  });
  documentModel.textBlocks=[...htmlDocument.querySelectorAll('h1,h2,h3,h4,h5,h6,p')].slice(0,1000).map((element,index)=>({kind:/^H/.test(element.tagName)?'heading':'paragraph',text:element.textContent.replace(/\s+/g,' ').trim(),position:index})).filter(block=>block.text);
  documentModel.extractionStatus='complete';documentModel.extractionConfidence=documentModel.tables.length?'high':'medium';documentModel.updatedAt=now();
  return documentModel;
}

function extractTxtDocument(text,input={}){
  const documentModel=createDocumentModel({...input,extractionStatus:'complete',extractionConfidence:'medium'});
  const raw=String(text||'');
  documentModel.textBlocks=[{kind:'text',text:raw,lineStart:1,lineEnd:raw.split(/\r?\n/).length}];
  const delimiter=detectDelimiter(raw,['\t',',',';']);
  if(delimiter&&delimiter.consistency>=.8&&delimiter.widths.filter(width=>width>1).length>=3){
    const structured=extractDelimitedDocument(raw,{...input,delimiter:delimiter.delimiter,kind:'detected_table'});
    documentModel.tables=structured.tables;documentModel.warnings.push(...structured.warnings);
    documentModel.extractionConfidence=structured.tables.length?'medium':'low';
  }
  if(!documentModel.tables.length) documentModel.warnings.push({code:'TABLE_NOT_FOUND',message:'Text did not have a consistent repeated delimiter structure.'});
  return documentModel;
}

function imageDocument(input={}){
  const documentModel=createDocumentModel({...input,extractionStatus:'preview_only',extractionConfidence:'unknown'});
  documentModel.images=[{sourceFileId:documentModel.fileId,name:documentModel.fileName,previewOnly:true}];
  documentModel.warnings.push({code:'UNSUPPORTED_FORMAT',message:'OCR/vision is not enabled for images.'});
  return documentModel;
}

function analyzePdfTextQuality(itemsOrText){
  const text=Array.isArray(itemsOrText)?itemsOrText.map(item=>typeof item==='string'?item:item?.str||'').join(' '):String(itemsOrText||'');
  const characters=[...text];
  const nonWhitespace=characters.filter(char=>!/[\s\u0000]/.test(char));
  const printable=nonWhitespace.filter(char=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(char));
  const suspicious=nonWhitespace.filter(char=>char==='\ufffd'||/[\u25a0-\u25ff\ue000-\uf8ff]/.test(char));
  const repeatedGlyphRuns=(text.match(/(.)\1{7,}/gu)||[]).length;
  const printableRatio=nonWhitespace.length?printable.length/nonWhitespace.length:0;
  const suspiciousRatio=nonWhitespace.length?suspicious.length/nonWhitespace.length:0;
  let status='good',confidence='high';const warnings=[];
  if(!nonWhitespace.length){status='empty';confidence='low';warnings.push('PDF_TEXT_EMPTY');}
  else if(printableRatio<.75||suspiciousRatio>.08||repeatedGlyphRuns>3){status='corrupted';confidence='low';warnings.push('PDF_TEXT_CORRUPTED');}
  else if(printableRatio<.92||suspiciousRatio>.02){status='needs_review';confidence='medium';warnings.push('PDF_TEXT_QUALITY_LOW');}
  return {status,confidence,characterCount:characters.length,nonWhitespaceCount:nonWhitespace.length,printableRatio,suspiciousRatio,repeatedGlyphRuns,warnings};
}

function pdfItemsToLines(items){
  const normalized=(items||[]).map(item=>({
    text:String(item?.str||'').trim(),x:Number(item?.transform?.[4]||0),y:Number(item?.transform?.[5]||0),
    width:Number(item?.width||0),height:Math.abs(Number(item?.height||item?.transform?.[3]||0))||8
  })).filter(item=>item.text);
  const heights=normalized.map(item=>item.height).sort((a,b)=>a-b),medianHeight=heights[Math.floor(heights.length/2)]||8,tolerance=Math.max(2,medianHeight*.35);
  const lines=[];
  for(const item of normalized.sort((a,b)=>b.y-a.y||a.x-b.x)){
    let line=lines.find(candidate=>Math.abs(candidate.y-item.y)<=tolerance);
    if(!line){line={y:item.y,items:[]};lines.push(line);}
    line.items.push(item);
  }
  lines.forEach(line=>line.items.sort((a,b)=>a.x-b.x));
  return lines.sort((a,b)=>b.y-a.y);
}

function medianNumber(values){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;}

function clusterPositions(lines,tolerance=12){
  const clusters=[];
  lines.forEach((line,lineIndex)=>line.items.forEach(item=>{
    let cluster=clusters.find(candidate=>Math.abs(candidate.x-item.x)<=tolerance);
    if(!cluster){cluster={x:item.x,values:[],lineIds:new Set()};clusters.push(cluster);}
    cluster.values.push(item.x);cluster.lineIds.add(lineIndex);cluster.x=cluster.values.reduce((sum,value)=>sum+value,0)/cluster.values.length;
  }));
  const minLines=Math.max(2,Math.ceil(lines.length*.28));
  return clusters.filter(cluster=>cluster.lineIds.size>=minLines).sort((a,b)=>a.x-b.x);
}

function pdfLineMatrix(lines,clusters){
  return lines.map(line=>{
    const row=Array.from({length:clusters.length},()=>[]);
    for(const item of line.items){
      let column=0,bestDistance=Infinity;
      for(let index=0;index<clusters.length;index+=1){const distance=Math.abs(clusters[index].x-item.x);if(distance<bestDistance){bestDistance=distance;column=index;}}
      row[column].push(item.text);
    }
    return row.map(parts=>parts.join(' ').replace(/\s+/g,' ').trim());
  });
}

function isPeriodHeader(value){
  const text=String(value||'').trim();
  return Boolean(UA.quarterInfo?.(text)||/^(?:(?:19|20)\d{2}(?:[-/.](?:0?[1-9]|1[0-2]))?|(?:Q[1-4]|[1-4]Q)[-\s/.]?(?:19|20)?\d{2}|(?:FY|H[12])[-\s/.]?(?:19|20)?\d{2}|YoY|QoQ|TTM)$/i.test(text));
}

function reconstructFinancialTableHeaders(matrix,context={}){
  const source=(matrix||[]).map(row=>[...(row||[])]);
  if(source.length<2) return {matrix:source,reconstructed:false,warnings:[]};
  const first=source[0].map(value=>String(value??'').trim()),second=source[1].map(value=>String(value??'').trim());
  const firstNumeric=first.filter(Boolean).length>1&&first.filter(value=>UA.parseLocaleAwareNumber(value,{}).valid).length/Math.max(1,first.filter(Boolean).length)>.65;
  const periodRow=source.slice(0,3).map((row,index)=>({index,count:row.filter(isPeriodHeader).length})).sort((a,b)=>b.count-a.count)[0];
  if(periodRow?.count>=2&&periodRow.index>0){source.splice(0,periodRow.index);if(!String(source[0][0]??'').trim())source[0][0]=context.labelHeader||'Metric';return {matrix:source,reconstructed:true,warnings:['financial_period_header_reconstructed']};}
  if(firstNumeric&&second.some(isPeriodHeader)){source.shift();if(!String(source[0][0]??'').trim())source[0][0]=context.labelHeader||'Metric';return {matrix:source,reconstructed:true,warnings:['numeric_false_header_removed']};}
  return {matrix:source,reconstructed:false,warnings:[]};
}

function scorePdfTableCandidate(candidate){
  const matrix=candidate?.matrix||[],rows=candidate?.rows||[],cells=matrix.flat().map(value=>String(value??'').trim()).filter(Boolean);
  const rowCount=rows.length,columnCount=candidate?.headers?.length||0,numeric=cells.filter(value=>UA.parseLocaleAwareNumber(value,{}).valid).length;
  const prose=cells.filter(value=>value.length>70||(/[.!?;]/.test(value)&&value.length>45)).length;
  const tocRows=matrix.filter(row=>{const values=row.map(value=>String(value??'').trim()).filter(Boolean);return values.length===2&&/^\d{1,3}$/.test(values[1])&&/[A-Za-z\p{L}]{3}/u.test(values[0]);}).length;
  const pageOnly=cells.filter(value=>/^\d{1,3}$/.test(value)).length,periodHeaders=(candidate?.headers||[]).filter(isPeriodHeader).length;
  let score=Math.min(24,rowCount*6)+Math.min(18,columnCount*4)+Math.min(22,(numeric/Math.max(1,cells.length))*45)+Math.min(16,periodHeaders*4)+Math.min(20,Number(candidate?.structureScore||0)*.2);
  const rejectionReasons=[];
  if(rowCount<2){score-=35;rejectionReasons.push('fewer_than_two_data_rows');}if(columnCount<2){score-=40;rejectionReasons.push('fewer_than_two_columns');}
  if(tocRows>=Math.max(2,Math.ceil(matrix.length*.45))){score-=75;rejectionReasons.push('table_of_contents_pattern');}
  if(prose/Math.max(1,cells.length)>.22){score-=35;rejectionReasons.push('narrative_fragment');}
  if(pageOnly/Math.max(1,cells.length)>.55&&numeric<6){score-=35;rejectionReasons.push('isolated_page_or_axis_labels');}
  if(cells.length<6){score-=25;rejectionReasons.push('too_few_populated_cells');}
  score=Math.max(0,Math.min(100,score));const confidence=score>=72?'high':(score>=52?'medium':'low');
  const accepted=score>=52&&!rejectionReasons.some(reason=>['table_of_contents_pattern','narrative_fragment','isolated_page_or_axis_labels'].includes(reason));
  return {score,confidence,accepted,promotionState:accepted?'accepted':(score>=38?'needs_review':'rejected_false_positive'),warnings:accepted?[]:['pdf_candidate_not_auto_promoted'],rejectionReasons};
}

function detectPdfTablesFromItems(items,pageNumber,options={}){
  const lines=pdfItemsToLines(items);
  if(lines.length<3) return [];
  const gaps=[];for(let index=1;index<lines.length;index+=1) gaps.push(Math.abs(lines[index-1].y-lines[index].y));
  const typicalGap=medianNumber(gaps.filter(gap=>gap>0))||12;
  const runs=[];let current=[];
  const flush=()=>{if(current.length>=3)runs.push(current);current=[];};
  lines.forEach((line,index)=>{
    if(index&&Math.abs(lines[index-1].y-line.y)>typicalGap*2.3) flush();
    if(line.items.length>=2) current.push(line); else flush();
  });flush();
  const tables=[];
  for(const run of runs){
    const clusters=clusterPositions(run,options.xTolerance||12);
    if(clusters.length<2||clusters.length>30) continue;
    const headerResult=reconstructFinancialTableHeaders(pdfLineMatrix(run,clusters),options),matrix=headerResult.matrix;
    const numericRows=matrix.filter(row=>row.filter(Boolean).some(value=>UA.parseLocaleAwareNumber(value,{}).valid)).length;
    const populatedCells=matrix.flat().filter(Boolean);
    const averageCellLength=populatedCells.length?populatedCells.reduce((sum,value)=>sum+String(value).length,0)/populatedCells.length:0;
    const proseRatio=populatedCells.length?populatedCells.filter(value=>String(value).length>70||(/[.!?;]/.test(String(value))&&String(value).length>45)).length/populatedCells.length:0;
    if(numericRows<2&&(matrix.length<5||averageCellLength>45||proseRatio>.22)) continue;
    const detected=TABLES.detectTablesInMatrix(matrix,{minHeaderScore:36,maxHeaderSearchRows:4});
    const table=detected.tables[0];
    if(!table) continue;
    const xMin=Math.min(...run.flatMap(line=>line.items.map(item=>item.x))),xMax=Math.max(...run.flatMap(line=>line.items.map(item=>item.x+item.width)));
    const yMin=Math.min(...run.map(line=>line.y)),yMax=Math.max(...run.map(line=>line.y));
    const quality=scorePdfTableCandidate({...table,matrix,structureScore:table.score});
    tables.push({
      headers:table.headers,rows:table.rows,page:pageNumber,boundingBox:{xMin,yMin,xMax,yMax},confidence:quality.confidence,accepted:quality.accepted,promotionState:quality.promotionState,rejectionReasons:quality.rejectionReasons,
      score:quality.score/100,warnings:[...(table.warnings||[]),...headerResult.warnings,...quality.warnings,...(numericRows<2?['pdf_text_only_structure']:[]),...(quality.confidence==='low'?['pdf_geometry_low_confidence']:[])],
      startRow:table.headerRow+1,endRow:table.endRow+1,startColumn:table.startColumn+1,endColumn:table.endColumn+1
    });
  }
  return tables;
}

function cancellationError(){const error=new Error('Analysis cancelled.');error.code='ANALYSIS_CANCELLED';return error;}
async function yieldThread(){return new Promise(resolve=>setTimeout(resolve,0));}

async function extractPdfDocument(arrayBuffer,input={}){
  const documentModel=createDocumentModel({...input,extractionStatus:'processing',extractionConfidence:'unknown'});
  const pdfjs=input.pdfjsLib;
  const loaderDiagnostics=input.pdfJsLoaderDiagnostics||{};
  const diagnostics={
    fileId:documentModel.fileId,fileName:documentModel.fileName,
    previewAvailable:input.previewAvailable!==false,analysisAvailable:Boolean(pdfjs?.getDocument),textExtracted:false,
    pdfJsStatus:input.pdfJsStatus||(pdfjs?.getDocument?'loaded':'failed'),workerStatus:input.workerStatus||'unknown',
    pageCount:0,pagesProcessed:0,extractionStatus:'processing',extractionConfidence:'unknown',
    nativeTextPages:0,emptyTextPages:0,corruptedTextPages:0,tablesDetected:0,datasetsCreated:0,chartCandidatesCreated:0,
    warningCodes:[],errorCode:null,errorName:null,errorMessage:null,errorStage:null,
    protocol:loaderDiagnostics.protocol||input.protocol||null,baseURI:loaderDiagnostics.baseURI||input.baseURI||null,
    moduleUrl:loaderDiagnostics.moduleUrl||null,workerUrl:loaderDiagnostics.workerUrl||null,
    modulePath:input.pdfJsModulePath||loaderDiagnostics.modulePath||null,workerPath:input.pdfJsWorkerPath||loaderDiagnostics.workerPath||null
  };
  documentModel.metadata.pdfDiagnostics=diagnostics;
  if(!pdfjs?.getDocument){
    documentModel.extractionStatus='preview_only';documentModel.extractionConfidence='low';
    const loaderCode=loaderDiagnostics.code||'PDFJS_MODULE_IMPORT_FAILED';
    diagnostics.extractionStatus='preview_only';diagnostics.extractionConfidence='low';diagnostics.errorCode=loaderCode;
    diagnostics.errorName=loaderDiagnostics.errorName||null;diagnostics.errorStage=loaderDiagnostics.stage||'module_import';
    diagnostics.errorMessage=loaderDiagnostics.errorMessage||'The local PDF.js module failed to load.';diagnostics.warningCodes.push(loaderCode);
    documentModel.warnings.push({code:loaderCode,message:`PDF structured analysis is unavailable. ${diagnostics.errorMessage} Preview remains available.`});
    return documentModel;
  }
  const loadingTask=pdfjs.getDocument({data:new Uint8Array(arrayBuffer),isEvalSupported:false,useWorkerFetch:false,disableAutoFetch:true,useSystemFonts:true});
  let pdf=null;
  try{
    pdf=await loadingTask.promise;
    documentModel.metadata.pageCount=pdf.numPages;
    diagnostics.workerStatus=input.workerStatus==='fake_worker'?'fake_worker':'configured';diagnostics.pageCount=pdf.numPages;
    const pageQualities=[];
    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber+=1){
      if(input.signal?.aborted){await loadingTask.destroy?.();throw cancellationError();}
      input.onProgress?.({stage:'pdf_text',processed:pageNumber-1,total:pdf.numPages,progress:(pageNumber-1)/pdf.numPages,page:pageNumber});
      const page=await pdf.getPage(pageNumber);
      const textContent=await page.getTextContent({disableNormalization:false});
      const quality=analyzePdfTextQuality(textContent.items);pageQualities.push(quality);
      diagnostics.pagesProcessed=pageNumber;
      const pageText=textContent.items.map(item=>String(item.str||'')).join(' ').replace(/\s+/g,' ').trim();
      if(pageText) documentModel.textBlocks.push({kind:'pdf_page_text',text:pageText,page:pageNumber,quality});
      if(!['corrupted','empty'].includes(quality.status)){
        const found=detectPdfTablesFromItems(textContent.items,pageNumber,input);
        found.forEach((table,index)=>{
          documentModel.tables.push(createExtractedTable(documentModel,{
            title:`${documentModel.fileName} · Page ${pageNumber} · Table ${index+1}`,kind:'detected_table',columns:table.headers.map(name=>({name})),rows:table.rows,
            sourceAnchor:{page:pageNumber,tableIndex:index,startRow:table.startRow,endRow:table.endRow,startColumn:table.startColumn,endColumn:table.endColumn,boundingBox:table.boundingBox},
            detection:{method:'pdf_text_geometry',confidence:table.confidence,score:table.score,accepted:table.accepted,promotionState:table.promotionState,rejectionReasons:table.rejectionReasons,warnings:table.warnings}
          }));
        });
      }
      page.cleanup?.();
      if(pageNumber%2===0) await yieldThread();
    }
    const good=pageQualities.filter(quality=>quality.status==='good').length,review=pageQualities.filter(quality=>quality.status==='needs_review').length,corrupt=pageQualities.filter(quality=>quality.status==='corrupted').length,empty=pageQualities.filter(quality=>quality.status==='empty').length;
    const nativeTextPages=good+review;
    documentModel.metadata.textQuality={goodPages:good,reviewPages:review,corruptedPages:corrupt,emptyPages:empty,totalPages:pageQualities.length};
    diagnostics.nativeTextPages=nativeTextPages;diagnostics.emptyTextPages=empty;diagnostics.corruptedTextPages=corrupt;diagnostics.textExtracted=nativeTextPages>0;
    if(!good&&empty===pageQualities.length){
      documentModel.extractionStatus='preview_only';documentModel.extractionConfidence='low';
      documentModel.warnings.push({code:'PDF_SCANNED_NO_OCR',message:'No usable native text layer was found. OCR is not enabled.'});
    }else if(corrupt>0&&corrupt>=Math.max(1,pageQualities.length*.4)){
      documentModel.extractionStatus='needs_review';documentModel.extractionConfidence='low';
      documentModel.warnings.push({code:'PDF_TEXT_CORRUPTED',message:'The native PDF text layer contains too many unreadable characters.'});
      documentModel.tables=documentModel.tables.filter(table=>table.detection.confidence!=='low');
    }else{
      documentModel.extractionStatus=corrupt||empty?'partial':'complete';
      documentModel.extractionConfidence=documentModel.tables.some(table=>table.detection.confidence==='high')?'high':(good?'medium':'low');
    }
    input.onProgress?.({stage:'complete',processed:pdf.numPages,total:pdf.numPages,progress:1});
    diagnostics.tablesDetected=documentModel.tables.length;diagnostics.extractionStatus=documentModel.extractionStatus;diagnostics.extractionConfidence=documentModel.extractionConfidence;diagnostics.warningCodes=documentModel.warnings.map(warning=>warning.code||String(warning));
    documentModel.updatedAt=now();
    return documentModel;
  }catch(error){
    if(error?.code==='ANALYSIS_CANCELLED'){
      documentModel.extractionStatus='cancelled';documentModel.extractionConfidence='low';documentModel.warnings.push({code:'ANALYSIS_CANCELLED',message:'PDF analysis was cancelled.'});
      diagnostics.extractionStatus='cancelled';diagnostics.extractionConfidence='low';diagnostics.warningCodes.push('ANALYSIS_CANCELLED');diagnostics.tablesDetected=documentModel.tables.length;
      return documentModel;
    }
    documentModel.extractionStatus='failed';documentModel.extractionConfidence='low';
    const workerFailed=/worker|fake worker/i.test(String(error?.message||error));
    const code=workerFailed?'PDFJS_WORKER_LOAD_FAILED':'PDFJS_DOCUMENT_OPEN_FAILED';
    const message=workerFailed?'PDF analysis could not start because the PDF worker failed to load.':'The PDF opened unsuccessfully during native text extraction.';
    diagnostics.workerStatus=workerFailed?'failed':diagnostics.workerStatus;diagnostics.extractionStatus='failed';diagnostics.extractionConfidence='low';diagnostics.errorCode=code;
    diagnostics.errorName=error?.name||'Error';diagnostics.errorStage=workerFailed?'worker_load':'pdf_extraction';
    diagnostics.errorMessage=`${message} ${String(error?.message||error||'').trim()}`.trim();diagnostics.warningCodes.push(code);
    documentModel.warnings.push({code,message});
    return documentModel;
  }finally{
    try{await pdf?.destroy?.();}catch(e){}
  }
}

function previewOnlyDocument(input={},warning){
  const documentModel=createDocumentModel({...input,extractionStatus:'preview_only',extractionConfidence:'low'});
  if(warning) documentModel.warnings.push(warning);
  return documentModel;
}

async function extractDocumentFromFile(fileRecord,options={}){
  const fileName=fileRecord?.name||options.fileName||'file',extension=String(fileRecord?.ext||extensionOf(fileName)).toLowerCase();
  const input={fileId:fileRecord?.id||options.fileId||'',fileName,extension,mimeType:fileRecord?.type||options.mimeType||mimeForExtension(extension),...options};
  if(['csv','tsv'].includes(extension)) return extractDelimitedDocument(options.text??fileRecord?.contentText??'',{...input,delimiter:extension==='tsv'?'\t':options.delimiter,kind:extension==='tsv'?'csv_table':'csv_table'});
  if(extension==='json'){
    try{return extractJsonDocument(options.value??JSON.parse(options.text??fileRecord?.contentText??''),input);}catch(error){return previewOnlyDocument(input,{code:'JSON_PARSE_ERROR',message:String(error?.message||error)});}
  }
  if(['md','markdown'].includes(extension)) return extractMarkdownDocument(options.text??fileRecord?.contentText??'',input);
  if(['html','htm'].includes(extension)) return extractHtmlDocument(options.text??fileRecord?.contentText??'',input);
  if(extension==='txt') return extractTxtDocument(options.text??fileRecord?.contentText??'',input);
  if(extension==='docx') return extractDocxDocument(options.arrayBuffer,input);
  if(extension==='pdf') return extractPdfDocument(options.arrayBuffer,input);
  if(['png','jpg','jpeg','webp','gif','bmp','svg'].includes(extension)) return imageDocument(input);
  return previewOnlyDocument(input,{code:'UNSUPPORTED_FORMAT',message:'Structured extraction is unavailable for this format.'});
}

global.MRSDocumentExtract=Object.freeze({
  EXTRACTION_STATUSES,EXTRACTION_CONFIDENCE,createDocumentModel,createExtractedTable,documentFromMatrix,
  detectDelimiter,parseDelimitedText,extractDelimitedDocument,findJsonObjectArrays,extractJsonDocument,
  extractMarkdownDocument,extractHtmlDocument,extractTxtDocument,docxParagraphText,docxCellText,
  extractDocxParagraphs,extractDocxTables,extractDocxXmlFallback,extractDocxDocument,analyzePdfTextQuality,pdfItemsToLines,
  detectPdfTablesFromItems,scorePdfTableCandidate,reconstructFinancialTableHeaders,extractPdfDocument,imageDocument,extractDocumentFromFile,previewOnlyDocument
});
})(typeof window!=='undefined'?window:globalThis);
