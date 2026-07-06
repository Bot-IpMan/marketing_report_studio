(function(global){
'use strict';

function finiteNumber(value){
  const number=Number(value);
  return Number.isFinite(number) ? number : 0;
}

function extFromName(name){
  return (String(name || '').split('.').pop() || '').toLowerCase();
}

function fileExtension(file){
  return String(file?.ext || extFromName(file?.name) || '').toLowerCase();
}

function fileTypeLabel(file){
  return (fileExtension(file) || 'file').toUpperCase();
}

function fileIconClass(file){
  const ext=fileExtension(file);
  if(ext==='pdf') return 'pdf';
  if(['ppt','pptx'].includes(ext)) return 'ppt';
  if(['xlsx','csv','tsv'].includes(ext)) return 'sheet';
  if(['docx','txt','md'].includes(ext)) return 'doc';
  if(['png','jpg','jpeg','webp','gif','bmp','svg'].includes(ext)) return 'image';
  if(['mp4','mov','webm','avi','mkv'].includes(ext)) return 'video';
  if(['json','html','xml'].includes(ext)) return 'code';
  return 'unknown';
}

function fileIcon(file){
  const ext=fileExtension(file);
  if(ext==='json') return '{}';
  if(ext==='csv') return 'CSV';
  if(ext==='tsv') return 'TSV';
  if(ext==='xlsx') return 'XLSX';
  if(['ppt','pptx'].includes(ext)) return 'PPT';
  if(file?.isData) return 'DATA';
  if(['png','jpg','jpeg','webp','gif','bmp','svg'].includes(ext)) return 'IMG';
  if(['mp4','mov','webm','avi','mkv'].includes(ext)) return 'VID';
  if(ext==='pdf') return 'PDF';
  if(['md','txt'].includes(ext)) return 'TXT';
  if(ext==='html') return 'HTML';
  if(ext==='docx') return 'DOC';
  return 'FILE';
}

function fileDate(file, locale='en-US'){
  const raw=file?.lastModified || file?.createdAt || file?.updatedAt || '';
  const date=raw ? new Date(raw) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString(locale) : '';
}

function fileMetaParts(file, options={}){
  const parts=[fileTypeLabel(file)];
  const formatBytes=typeof options.formatBytes==='function' ? options.formatBytes : global.MRSDom?.formatBytes;
  if(finiteNumber(file?.size)>0) parts.push(formatBytes ? formatBytes(file.size) : String(file.size));
  const date=fileDate(file, options.locale || 'en-US');
  if(date) parts.push(date);
  return parts;
}

function sortFiles(files, sort='newest', options={}){
  const list=[...(files || [])];
  const toNumber=typeof options.toNumber==='function' ? options.toNumber : finiteNumber;
  const time=(file)=>new Date(file?.createdAt || file?.updatedAt || file?.lastModified || 0).getTime() || 0;
  const name=(file)=>String(file?.name || '').toLowerCase();
  const type=(file)=>fileExtension(file);
  if(sort==='oldest') return list.sort((a,b)=>time(a)-time(b) || name(a).localeCompare(name(b)));
  if(sort==='name') return list.sort((a,b)=>name(a).localeCompare(name(b)));
  if(sort==='type') return list.sort((a,b)=>type(a).localeCompare(type(b)) || name(a).localeCompare(name(b)));
  if(sort==='size') return list.sort((a,b)=>toNumber(b?.size)-toNumber(a?.size) || name(a).localeCompare(name(b)));
  return list.sort((a,b)=>time(b)-time(a) || name(a).localeCompare(name(b)));
}

global.MRSMaterials=Object.freeze({
  fileExtension,
  fileTypeLabel,
  fileIconClass,
  fileIcon,
  fileDate,
  fileMetaParts,
  sortFiles
});
})(typeof window!=='undefined' ? window : globalThis);
