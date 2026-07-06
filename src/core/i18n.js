(function(global){
'use strict';

function normalizeLang(lang){
  return lang==='en' ? 'en' : 'uk';
}

function formatText(template, values={}){
  return String(template || '').replace(/\{(\w+)\}/g, (_, key)=>String(values[key] ?? ''));
}

function translateKey(options={}){
  const lang=normalizeLang(options.lang);
  const fallbackLang=normalizeLang(options.fallbackLang || 'uk');
  const dictionaries=options.dictionaries || {};
  const key=String(options.key || '');
  const template=dictionaries[lang]?.[key] ?? dictionaries[fallbackLang]?.[key] ?? key;
  const formatted=formatText(template, options.values || {});
  return typeof options.translateText==='function' ? options.translateText(formatted) : formatted;
}

global.MRSI18n=Object.freeze({
  normalizeLang,
  formatText,
  translateKey
});
})(typeof window!=='undefined' ? window : globalThis);
