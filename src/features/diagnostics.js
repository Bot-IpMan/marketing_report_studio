(function(global){
'use strict';
const MAX_EVENTS=200;
const MAX_TEXT=1400;
const MAX_DEPTH=4;
const MAX_ARRAY_ITEMS=20;
const MAX_OBJECT_KEYS=30;
const events=[];
const startedAt=new Date().toISOString();
let contextProvider=()=>({});
let installed=false;

function sanitizeText(value){
  let text='';
  if(value instanceof Error) text=`${value.name||'Error'}: ${value.message||''}`;
  else if(typeof value==='string'||typeof value==='number'||typeof value==='boolean') text=String(value);
  else text='[non-text-value]';
  return text
    .replace(/https?:\/\/[^\s\"'<>]+/gi,'[url]')
    .replace(/file:\/\/\/?[^\s\"'<>]+/gi,'[local-path]')
    .replace(/\b[A-Za-z]:\\(?:Users|Documents and Settings)\\[^\\\r\n\"'<>]+\\[^\r\n\"'<>]+/g,'[local-path]')
    .replace(/\/(?:Users|home)\/[^\s/]+\/[^\s\"'<>]+/g,'[local-path]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,'[email]')
    .replace(/\b[^\s\"'<>\\/]{1,120}\.(?:csv|tsv|json|xlsx|xls|pdf|docx|md|txt|html?|png|jpe?g|webp|gif|bmp|svg)\b/gi,'[file]')
    .slice(0,MAX_TEXT);
}
function sanitizeError(error){
  if(!(error instanceof Error)) return null;
  return {
    name:sanitizeText(error.name||'Error'),
    message:sanitizeText(error.message||''),
    stack:sanitizeText(error.stack||'')
  };
}
function safeKey(key){return sanitizeText(String(key)).slice(0,60);}
function sanitizeDetails(value,depth=0){
  if(value==null||typeof value==='number'||typeof value==='boolean') return value;
  if(typeof value==='string') return sanitizeText(value);
  if(value instanceof Error) return sanitizeError(value);
  if(depth>=MAX_DEPTH) return Array.isArray(value)?`[array:${value.length}]`:'[object]';
  if(Array.isArray(value)) return value.slice(0,MAX_ARRAY_ITEMS).map(item=>sanitizeDetails(item,depth+1));
  if(typeof value==='object'){
    const out={};
    Object.entries(value).slice(0,MAX_OBJECT_KEYS).forEach(([key,item])=>{out[safeKey(key)]=sanitizeDetails(item,depth+1);});
    return out;
  }
  return `[${typeof value}]`;
}
function record(kind,message,details){
  const error=message instanceof Error?message:null;
  const safeDetails=sanitizeDetails(details||{});
  if(error&&safeDetails&&typeof safeDetails==='object'&&!Array.isArray(safeDetails)) safeDetails.error=sanitizeError(error);
  events.push({at:new Date().toISOString(),kind:String(kind||'event').slice(0,60),message:sanitizeText(message),details:safeDetails});
  if(events.length>MAX_EVENTS) events.splice(0,events.length-MAX_EVENTS);
}
function safeAssetName(value){
  const text=String(value||'').split(/[?#]/)[0];
  const name=text.split('/').pop()||'';
  return /^[A-Za-z0-9._-]{1,100}\.(?:m?js|css)$/.test(name)?name:'';
}
function storageCapabilities(){
  let localStorageAvailable=false;
  try{localStorageAvailable=Boolean(global.localStorage); void global.localStorage.length;}catch{}
  return {localStorage:localStorageAvailable,indexedDB:Boolean(global.indexedDB),storageEstimate:Boolean(global.navigator?.storage?.estimate)};
}
async function storageEstimate(){
  try{
    if(!global.navigator?.storage?.estimate) return null;
    const estimate=await global.navigator.storage.estimate();
    return {usageBytes:Number(estimate?.usage)||0,quotaBytes:Number(estimate?.quota)||0};
  }catch{return null;}
}
function performanceSnapshot(){
  try{
    const nav=global.performance?.getEntriesByType?.('navigation')?.[0];
    if(!nav) return null;
    return {domContentLoadedMs:Math.round(nav.domContentLoadedEventEnd||0),loadMs:Math.round(nav.loadEventEnd||0),transferBytes:Number(nav.transferSize)||0};
  }catch{return null;}
}
async function buildSnapshot(){
  let app={};
  try{app=sanitizeDetails(contextProvider()||{});}catch(error){record('diagnostics.context_error',error);}
  return {
    schemaVersion:2,generatedAt:new Date().toISOString(),
    privacy:{localOnly:true,automaticUpload:false,persistentLogging:false,includesClientContent:false,includesFileNames:false,eventLimit:MAX_EVENTS},
    session:{startedAt,eventCount:events.length},
    environment:{protocol:global.location?.protocol||'',userAgent:sanitizeText(global.navigator?.userAgent||''),language:String(global.navigator?.language||'').slice(0,20),online:typeof global.navigator?.onLine==='boolean'?global.navigator.onLine:null,viewport:{width:Number(global.innerWidth)||0,height:Number(global.innerHeight)||0,devicePixelRatio:Number(global.devicePixelRatio)||1},capabilities:{worker:typeof global.Worker==='function',fileSystemAccess:typeof global.showDirectoryPicker==='function',...storageCapabilities()}},
    storage:await storageEstimate(),performance:performanceSnapshot(),app,events:events.map(event=>({...event}))
  };
}
function setContextProvider(provider){contextProvider=typeof provider==='function'?provider:()=>({});}
function clear(){events.length=0;}
async function downloadSnapshot(){
  record('diagnostics.export_requested','User requested local diagnostics export');
  const snapshot=await buildSnapshot();
  if(!global.document||typeof global.Blob!=='function'||!global.URL?.createObjectURL) throw new Error('Diagnostics download is unavailable in this environment');
  const blob=new global.Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
  const href=global.URL.createObjectURL(blob);
  const link=global.document.createElement('a');
  link.href=href; link.download=`marketing-report-studio-diagnostics-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  global.document.body.appendChild(link); link.click(); link.remove();
  global.setTimeout(()=>global.URL.revokeObjectURL(href),0);
  return snapshot;
}
function attachButton(){
  const button=global.document?.getElementById?.('diagnosticsBtn');
  if(!button||button.dataset.diagnosticsBound==='1') return;
  button.dataset.diagnosticsBound='1';
  button.addEventListener('click',()=>{downloadSnapshot().catch(error=>{record('diagnostics.export_error',error); global.console?.error?.('Local diagnostics export failed',error);});});
}
function describeConsoleArgs(args){return args.slice(0,12).map(item=>sanitizeDetails(item));}
function install(){
  if(installed||!global.document||typeof global.addEventListener!=='function') return;
  installed=true;
  for(const level of ['warn','error']){
    const original=global.console?.[level];
    if(typeof original!=='function') continue;
    global.console[level]=function(...args){
      try{
        const first=args[0];
        record(`console.${level}`,first instanceof Error?first:(typeof first==='string'?first:'[console-value]'),{args:describeConsoleArgs(args)});
      }catch{}
      return original.apply(this,args);
    };
  }
  global.addEventListener('error',event=>{
    const target=event?.target;
    if(target&&target!==global&&target.tagName){
      const asset=safeAssetName(target.src||target.href||target.currentSrc||'');
      record('resource.error','Local resource failed to load',{tag:String(target.tagName).toLowerCase(),asset});
      return;
    }
    record('window.error',event.error||event.message||'Runtime error',{asset:safeAssetName(event.filename),line:Number(event.lineno)||0,column:Number(event.colno)||0});
  },true);
  global.addEventListener('unhandledrejection',event=>{
    const reason=event.reason;
    record('unhandledrejection',reason instanceof Error?reason:(typeof reason==='string'?reason:'[non-text-rejection]'),reason instanceof Error?{error:sanitizeError(reason)}:{});
  });
  attachButton();
  record('diagnostics.started','Local diagnostics collector started');
}
const api=Object.freeze({MAX_EVENTS,sanitizeText,sanitizeDetails,record,clear,setContextProvider,buildSnapshot,downloadSnapshot,attachButton});
global.MRSDiagnostics=api;
install();
})(typeof window!=='undefined'?window:globalThis);
