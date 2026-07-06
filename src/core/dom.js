(function(global){
'use strict';

function byId(id){
  return global.document ? global.document.getElementById(id) : null;
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, (char)=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[char]));
}

function finiteNumber(value){
  const number=Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatBytes(value){
  const size=finiteNumber(value);
  if(size>1024*1024) return (size/1024/1024).toFixed(1)+' MB';
  if(size>1024) return (size/1024).toFixed(1)+' KB';
  return Math.round(size)+' B';
}

global.MRSDom=Object.freeze({
  byId,
  escapeHtml,
  formatBytes
});
})(typeof window!=='undefined' ? window : globalThis);
