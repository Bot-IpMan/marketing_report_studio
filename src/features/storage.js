(function(global){
'use strict';

const DB_NAME='marketing-report-studio';
const DB_VERSION=1;
let openPromise=null;

function available(){return typeof global.indexedDB!=='undefined';}
function requestResult(request){
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('IndexedDB request failed.'));
  });
}

function openDatabase(){
  if(!available()) return Promise.reject(Object.assign(new Error('IndexedDB is unavailable.'),{code:'STORAGE_UNAVAILABLE'}));
  if(openPromise) return openPromise;
  openPromise=new Promise((resolve,reject)=>{
    const request=global.indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const database=request.result;
      if(!database.objectStoreNames.contains('reports')) database.createObjectStore('reports',{keyPath:'key'});
      if(!database.objectStoreNames.contains('blobs')) database.createObjectStore('blobs',{keyPath:'key'});
      if(!database.objectStoreNames.contains('cache')) database.createObjectStore('cache',{keyPath:'key'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{openPromise=null;reject(request.error||new Error('Could not open IndexedDB.'));};
    request.onblocked=()=>{openPromise=null;reject(Object.assign(new Error('IndexedDB upgrade is blocked.'),{code:'STORAGE_BLOCKED'}));};
  });
  return openPromise;
}

function transactionDone(transaction){
  return new Promise((resolve,reject)=>{
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(transaction.error||new Error('IndexedDB transaction failed.'));
    transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB transaction was aborted.'));
  });
}

function clone(value){
  if(typeof structuredClone==='function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function base64ToBlob(base64,type='application/octet-stream'){
  const binary=global.atob(String(base64||''));
  const parts=[];const chunk=64*1024;
  for(let offset=0;offset<binary.length;offset+=chunk){
    const slice=binary.slice(offset,offset+chunk),bytes=new Uint8Array(slice.length);
    for(let index=0;index<slice.length;index+=1) bytes[index]=slice.charCodeAt(index);
    parts.push(bytes);
  }
  return new Blob(parts,{type});
}

async function blobToBase64(blob){
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let binary='';const chunk=0x8000;
  for(let offset=0;offset<bytes.length;offset+=chunk) binary+=String.fromCharCode.apply(null,bytes.subarray(offset,offset+chunk));
  return global.btoa(binary);
}

function storageError(error){
  if(error?.code) return Object.assign(new Error(String(error.message||error)),{code:error.code,cause:error});
  const message=String(error?.message||error||'Browser storage failed.');
  const quota=error?.name==='QuotaExceededError'||/quota/i.test(message);
  return Object.assign(new Error(message),{code:quota?'STORAGE_QUOTA_ERROR':'STORAGE_ERROR',cause:error});
}

async function prepareStoredReport(reportKey,report){
  const snapshot=clone(report||{}),blobRecords=[];
  snapshot.files=Array.isArray(snapshot.files)?snapshot.files:[];
  for(const file of snapshot.files){
    if(!file?.contentBase64) continue;
    const key=`${reportKey}:file:${file.id||file.name}`;
    blobRecords.push({key,reportKey,fileId:file.id||'',blob:base64ToBlob(file.contentBase64,file.type||'application/octet-stream'),updatedAt:new Date().toISOString()});
    file.storageBlobKey=key;
    file.storageEncoding='blob';
    delete file.contentBase64;
  }
  return {snapshot,blobRecords};
}

async function saveReport(reportKey,report){
  try{
    const database=await openDatabase();
    const {snapshot,blobRecords}=await prepareStoredReport(reportKey,report);
    const transaction=database.transaction(['reports','blobs'],'readwrite');
    const reports=transaction.objectStore('reports'),blobs=transaction.objectStore('blobs');
    const keepKeys=new Set(blobRecords.map(record=>record.key));
    const existingKeys=await requestResult(blobs.getAllKeys());
    existingKeys.filter(key=>String(key).startsWith(`${reportKey}:file:`)&&!keepKeys.has(key)).forEach(key=>blobs.delete(key));
    reports.put({key:reportKey,report:snapshot,updatedAt:new Date().toISOString(),version:1});
    blobRecords.forEach(record=>blobs.put(record));
    await transactionDone(transaction);
    return {ok:true,blobCount:blobRecords.length};
  }catch(error){throw storageError(error);}
}

async function loadReport(reportKey){
  try{
    const database=await openDatabase();
    const transaction=database.transaction('reports','readonly');
    const record=await requestResult(transaction.objectStore('reports').get(reportKey));
    if(!record?.report) return null;
    const report=clone(record.report);
    for(const file of report.files||[]){
      if(!file?.storageBlobKey) continue;
      const blobTransaction=database.transaction('blobs','readonly');
      const blobRecord=await requestResult(blobTransaction.objectStore('blobs').get(file.storageBlobKey));
      if(blobRecord?.blob) file.contentBase64=await blobToBase64(blobRecord.blob);
    }
    return {report,updatedAt:record.updatedAt||null,version:record.version||1};
  }catch(error){throw storageError(error);}
}

async function saveCache(key,value){
  try{
    const database=await openDatabase();
    const transaction=database.transaction('cache','readwrite');
    transaction.objectStore('cache').put({key,value,updatedAt:new Date().toISOString()});
    await transactionDone(transaction);
    return true;
  }catch(error){throw storageError(error);}
}

async function loadCache(key){
  try{
    const database=await openDatabase();
    const transaction=database.transaction('cache','readonly');
    const record=await requestResult(transaction.objectStore('cache').get(key));
    return record?.value??null;
  }catch(error){throw storageError(error);}
}

async function storageEstimate(){
  if(!global.navigator?.storage?.estimate) return {usage:null,quota:null};
  try{return await global.navigator.storage.estimate();}catch(error){return {usage:null,quota:null};}
}

async function opfsAvailable(){
  if(!global.navigator?.storage?.getDirectory) return false;
  try{await global.navigator.storage.getDirectory();return true;}catch(error){return false;}
}

global.MRSStorage=Object.freeze({
  DB_NAME,DB_VERSION,available,openDatabase,saveReport,loadReport,saveCache,loadCache,storageEstimate,opfsAvailable
});
})(typeof window!=='undefined'?window:globalThis);
