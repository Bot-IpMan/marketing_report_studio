(function(global){
'use strict';

const UA=global.MRSUniversalAnalysis;

function cellText(value){return value===null||value===undefined?'':String(value).trim();}
function isNonEmpty(value){return cellText(value)!=='';}
function rowNonEmptyIndices(row){
  const out=[];
  (row||[]).forEach((value,index)=>{if(isNonEmpty(value)) out.push(index);});
  return out;
}
function rowWidth(row){
  const indices=rowNonEmptyIndices(row);
  return indices.length?indices[indices.length-1]-indices[0]+1:0;
}
function rowDensity(row,start=0,end=(row||[]).length-1){
  if(end<start) return 0;
  let count=0;
  for(let index=start;index<=end;index+=1) if(isNonEmpty(row?.[index])) count+=1;
  return count/Math.max(1,end-start+1);
}
function looksNumeric(value){
  if(typeof value==='number'&&Number.isFinite(value)) return true;
  const parsed=UA?.parseLocaleAwareNumber?UA.parseLocaleAwareNumber(value,{}):{valid:/^[+-]?\d+(?:[.,]\d+)?$/.test(cellText(value))};
  return parsed.valid;
}
function looksDate(value){return Boolean(UA?.parseDateValue?.(value)?.valid);}
function looksProse(value){
  const text=cellText(value);
  return text.length>90 || (text.length>55 && /[.!?;:]/.test(text));
}

function matrixBounds(matrix){
  let maxColumn=-1;
  for(const row of matrix||[]){
    const indices=rowNonEmptyIndices(row);
    if(indices.length) maxColumn=Math.max(maxColumn,indices[indices.length-1]);
  }
  return {rowCount:(matrix||[]).length,columnCount:maxColumn+1};
}

function detectNonEmptyRegions(matrix){
  const rows=Array.isArray(matrix)?matrix:[];
  const regions=[];
  let start=null;
  for(let index=0;index<=rows.length;index+=1){
    const nonEmpty=index<rows.length&&rowNonEmptyIndices(rows[index]).length>0;
    if(nonEmpty&&start===null) start=index;
    if(!nonEmpty&&start!==null){
      const end=index-1;
      let startColumn=Infinity,endColumn=-1,cellCount=0;
      for(let rowIndex=start;rowIndex<=end;rowIndex+=1){
        const indices=rowNonEmptyIndices(rows[rowIndex]);
        if(!indices.length) continue;
        startColumn=Math.min(startColumn,indices[0]);
        endColumn=Math.max(endColumn,indices[indices.length-1]);
        cellCount+=indices.length;
      }
      regions.push({startRow:start,endRow:end,startColumn:Number.isFinite(startColumn)?startColumn:0,endColumn,cellCount,rowCount:end-start+1,columnCount:Math.max(0,endColumn-(Number.isFinite(startColumn)?startColumn:0)+1)});
      start=null;
    }
  }
  return regions;
}

function scoreHeaderRow(row,context={}){
  const values=(row||[]).map(cellText);
  const nonEmpty=values.filter(Boolean);
  if(nonEmpty.length<2) return {score:0,confidence:'low',reasons:['fewer_than_two_header_cells']};
  const unique=new Set(nonEmpty.map(value=>value.toLowerCase())).size/nonEmpty.length;
  const textRatio=nonEmpty.filter(value=>!looksNumeric(value)).length/nonEmpty.length;
  const numericRatio=nonEmpty.filter(looksNumeric).length/nonEmpty.length;
  const proseRatio=nonEmpty.filter(looksProse).length/nonEmpty.length;
  const averageLength=nonEmpty.reduce((sum,value)=>sum+value.length,0)/nonEmpty.length;
  const following=(context.followingRows||[]).slice(0,Math.min(8,context.followingRows?.length||0));
  const startColumn=context.startColumn??0,endColumn=context.endColumn??Math.max(0,values.length-1);
  const width=endColumn-startColumn+1;
  const followingDense=following.length?following.filter(next=>rowDensity(next,startColumn,endColumn)>=.55).length/following.length:0;
  const followingMixed=following.length?following.filter(next=>{
    const cells=(next||[]).slice(startColumn,endColumn+1).filter(isNonEmpty);
    return cells.some(looksNumeric)&&cells.some(value=>!looksNumeric(value));
  }).length/following.length:0;
  let score=0;
  score+=Math.min(22,nonEmpty.length*4);
  score+=unique*18;
  score+=textRatio*22;
  score+=followingDense*25;
  score+=followingMixed*12;
  score-=numericRatio*12;
  score-=proseRatio*28;
  if(averageLength>60) score-=18;
  if(width>0&&nonEmpty.length/width<.35) score-=12;
  score=Math.max(0,Math.min(100,score));
  const reasons=[];
  if(unique>=.9) reasons.push('unique_labels');
  if(textRatio>=.7) reasons.push('mostly_text');
  if(followingDense>=.7) reasons.push('consistent_following_rows');
  if(followingMixed>=.35) reasons.push('mixed_data_below');
  if(proseRatio>.3) reasons.push('prose_penalty');
  return {score,confidence:score>=72?'high':(score>=52?'medium':'low'),reasons,nonEmptyCount:nonEmpty.length,textRatio,followingDense};
}

function detectMultiRowHeader(matrix,startRow,options={}){
  const rows=Array.isArray(matrix)?matrix:[];
  const first=rows[startRow]||[];
  const second=rows[startRow+1]||[];
  if(!second.length) return {startRow,endRow:startRow,rows:[first],confidence:'high'};
  const startColumn=options.startColumn??0,endColumn=options.endColumn??Math.max(first.length,second.length)-1;
  const firstValues=first.slice(startColumn,endColumn+1).map(cellText);
  const secondValues=second.slice(startColumn,endColumn+1).map(cellText);
  const firstNonEmpty=firstValues.filter(Boolean).length,secondNonEmpty=secondValues.filter(Boolean).length;
  const firstHasSpans=firstNonEmpty>=1&&firstNonEmpty<Math.max(2,secondNonEmpty*.7);
  const secondMostlyText=secondValues.filter(Boolean).length>1 && secondValues.filter(value=>value&&!looksNumeric(value)).length/Math.max(1,secondNonEmpty)>=.75;
  if(firstHasSpans&&secondMostlyText){
    return {startRow,endRow:startRow+1,rows:[first,second],confidence:'medium',warnings:['multi_row_header_inferred']};
  }
  return {startRow,endRow:startRow,rows:[first],confidence:'high',warnings:[]};
}

function normalizeHeaderRows(headerRows,options={}){
  const rows=Array.isArray(headerRows)?headerRows:[];
  const startColumn=options.startColumn??0;
  const endColumn=options.endColumn??Math.max(0,...rows.map(row=>(row||[]).length-1));
  const labels=[];
  let carried='';
  for(let column=startColumn;column<=endColumn;column+=1){
    const pieces=[];
    for(let rowIndex=0;rowIndex<rows.length;rowIndex+=1){
      let value=cellText(rows[rowIndex]?.[column]);
      if(rowIndex===0){
        if(value) carried=value;
        else if(options.fillMergedContext) value=carried;
      }
      if(value&&!pieces.includes(value)) pieces.push(value);
    }
    labels.push(pieces.join(' / ')||`column_${column-startColumn+1}`);
  }
  const seen=new Map();
  return labels.map((label,index)=>{
    const base=label||`column_${index+1}`;
    const count=(seen.get(base)||0)+1;
    seen.set(base,count);
    return count===1?base:`${base}_${count}`;
  });
}

function dataEndForHeader(matrix,region,headerEndRow,options={}){
  const expectedWidth=region.endColumn-region.startColumn+1;
  let end=headerEndRow;
  let dataRows=0;
  let weakRun=0;
  for(let rowIndex=headerEndRow+1;rowIndex<=region.endRow;rowIndex+=1){
    const row=matrix[rowIndex]||[];
    const values=row.slice(region.startColumn,region.endColumn+1);
    const count=values.filter(isNonEmpty).length;
    const prose=count===1&&values.some(looksProse);
    const weak=count<Math.max(2,Math.ceil(expectedWidth*.35))||prose;
    if(weak) weakRun+=1; else weakRun=0;
    if(weakRun>=Math.min(2,Math.max(1,options.weakRowsToStop||2))){
      end=rowIndex-weakRun;
      break;
    }
    if(count>=2){end=rowIndex;dataRows+=1;}
  }
  return {endRow:end,dataRows};
}

function extractTableRegion(matrix,region){
  const headerRows=region.headerRows||[matrix[region.headerRow]||[]];
  const headers=normalizeHeaderRows(headerRows,{startColumn:region.startColumn,endColumn:region.endColumn,fillMergedContext:false});
  const rows=[];
  for(let rowIndex=region.headerEndRow+1;rowIndex<=region.endRow;rowIndex+=1){
    const source=matrix[rowIndex]||[];
    const values=source.slice(region.startColumn,region.endColumn+1);
    if(!values.some(isNonEmpty)) continue;
    const row={};
    headers.forEach((header,index)=>{row[header]=values[index]??'';});
    Object.defineProperty(row,'_sourceRow',{value:rowIndex+1,enumerable:false,writable:true});
    rows.push(row);
  }
  return {headers,rows,matrix:(matrix||[]).slice(region.headerRow,region.endRow+1).map(row=>(row||[]).slice(region.startColumn,region.endColumn+1))};
}

function regionTextBlock(matrix,region,kind='text'){
  const lines=[];
  for(let rowIndex=region.startRow;rowIndex<=region.endRow;rowIndex+=1){
    const values=(matrix[rowIndex]||[]).slice(region.startColumn,region.endColumn+1).map(cellText).filter(Boolean);
    if(values.length) lines.push(values.join(' | '));
  }
  return {kind,text:lines.join('\n'),startRow:region.startRow+1,endRow:region.endRow+1,startColumn:region.startColumn+1,endColumn:region.endColumn+1};
}

function detectTablesInMatrix(matrix,options={}){
  const rows=Array.isArray(matrix)?matrix:[];
  const regions=detectNonEmptyRegions(rows);
  const tables=[];
  const textBlocks=[];
  const warnings=[];
  for(const region of regions){
    if(region.rowCount<2||region.columnCount<2){
      textBlocks.push(regionTextBlock(rows,region,region.startRow===0?'metadata':'text'));
      continue;
    }
    let best=null;
    const maxHeaderSearch=Math.min(region.endRow-1,region.startRow+(options.maxHeaderSearchRows||12));
    for(let rowIndex=region.startRow;rowIndex<=maxHeaderSearch;rowIndex+=1){
      const score=scoreHeaderRow(rows[rowIndex],{
        followingRows:rows.slice(rowIndex+1,Math.min(region.endRow+1,rowIndex+9)),
        startColumn:region.startColumn,endColumn:region.endColumn
      });
      if(!best||score.score>best.score.score) best={rowIndex,score};
    }
    const minScore=options.minHeaderScore??52;
    if(!best||best.score.score<minScore){
      textBlocks.push(regionTextBlock(rows,region,'unclassified_text'));
      warnings.push({code:'HEADER_LOW_CONFIDENCE',startRow:region.startRow+1,endRow:region.endRow+1,score:best?.score?.score||0});
      continue;
    }
    const multi=detectMultiRowHeader(rows,best.rowIndex,{startColumn:region.startColumn,endColumn:region.endColumn});
    const dataEnd=dataEndForHeader(rows,region,multi.endRow,options);
    if(dataEnd.dataRows<1||dataEnd.endRow<=multi.endRow){
      textBlocks.push(regionTextBlock(rows,region,'unclassified_text'));
      warnings.push({code:'TABLE_NOT_FOUND',startRow:region.startRow+1,endRow:region.endRow+1});
      continue;
    }
    const tableRegion={
      startRow:best.rowIndex,endRow:dataEnd.endRow,startColumn:region.startColumn,endColumn:region.endColumn,
      headerRow:best.rowIndex,headerEndRow:multi.endRow,headerRows:multi.rows,
      confidence:best.score.confidence,score:best.score.score,warnings:[...(multi.warnings||[])]
    };
    const extracted=extractTableRegion(rows,tableRegion);
    if(extracted.rows.length){
      tables.push({...tableRegion,...extracted});
    }
    if(region.startRow<best.rowIndex){
      textBlocks.push(regionTextBlock(rows,{...region,endRow:best.rowIndex-1},region.startRow===0?'metadata':'text'));
    }
    if(dataEnd.endRow<region.endRow){
      textBlocks.push(regionTextBlock(rows,{...region,startRow:dataEnd.endRow+1},'notes'));
    }
  }
  return {tables,textBlocks,regions,warnings,bounds:matrixBounds(rows)};
}

function extractSheetTextBlocks(matrix,tableRegions){
  const covered=new Set();
  for(const table of tableRegions||[]){
    for(let row=table.startRow;row<=table.endRow;row+=1) covered.add(row);
  }
  const blocks=[];
  let start=null;
  for(let row=0;row<=(matrix||[]).length;row+=1){
    const textRow=row<(matrix||[]).length&&!covered.has(row)&&rowNonEmptyIndices(matrix[row]).length;
    if(textRow&&start===null) start=row;
    if(!textRow&&start!==null){
      const region={startRow:start,endRow:row-1,startColumn:0,endColumn:Math.max(0,...(matrix||[]).slice(start,row).map(item=>(item||[]).length-1))};
      blocks.push(regionTextBlock(matrix,region,start===0?'metadata':'text'));
      start=null;
    }
  }
  return blocks;
}

global.MRSTableDetection=Object.freeze({
  cellText,isNonEmpty,rowWidth,rowDensity,matrixBounds,detectNonEmptyRegions,scoreHeaderRow,
  detectMultiRowHeader,normalizeHeaderRows,extractTableRegion,extractSheetTextBlocks,detectTablesInMatrix
});
})(typeof window!=='undefined'?window:globalThis);
