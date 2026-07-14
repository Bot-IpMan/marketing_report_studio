(function(global){
'use strict';

const DEFAULT_SAMPLE_SIZE=1200;
const DEFAULT_DISTINCT_LIMIT=5000;
const EMPTY_VALUES=new Set(['','null','undefined']);
const CURRENCY_SYMBOLS={
  '$':'USD','€':'EUR','£':'GBP','₴':'UAH','¥':'JPY','₹':'INR','₽':'RUB','₺':'TRY','₩':'KRW'
};
const NUMBER_TYPES=new Set(['integer','decimal','number','percent','currency']);
const TECHNICAL_ID_HINT=/(\b|_)(?:id|uuid|guid|index|row_number|row|task_id|job_id|request_id|record_id|key|hash|код|номер)(\b|_)/u;
const METRIC_HINT=/(?:price|cost|revenue|sales|income|profit|margin|rate|ratio|ctr|cpc|cpm|score|traffic|views|clicks|conversions|budget|amount|quantity|volume|ціна|вартість|дохід|прибуток|оцінка|трафік|перегляди|бюджет|сума)/u;
const NARRATIVE_HINT=/(?:description|reason|why|notes?|comments?|summary|angle|outreach|explanation|finding|recommendation|context|relevant|опис|причин|нотат|коментар|резюме|пояснен|виснов|рекомендац|контекст)/u;

function isMissing(value){
  return value===null || value===undefined || (typeof value==='string' && value.trim()==='');
}

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

function stableHash(value){
  let hash=2166136261;
  const text=String(value??'');
  for(let i=0;i<text.length;i+=1){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(36);
}

function distributedSampleIndices(length,limit=DEFAULT_SAMPLE_SIZE){
  const size=Math.max(0,Number(length)||0);
  const cap=Math.max(1,Number(limit)||DEFAULT_SAMPLE_SIZE);
  if(size<=cap) return Array.from({length:size},(_,index)=>index);
  const selected=new Set();
  const edge=Math.min(Math.max(8,Math.floor(cap*.12)),Math.floor(cap/3));
  for(let i=0;i<edge;i+=1){
    selected.add(i);
    selected.add(size-1-i);
  }
  const middleStart=Math.max(0,Math.floor(size/2)-Math.floor(edge/2));
  for(let i=0;i<edge;i+=1) selected.add(Math.min(size-1,middleStart+i));
  const remaining=Math.max(0,cap-selected.size);
  for(let i=0;i<remaining;i+=1){
    selected.add(Math.round(i*(size-1)/Math.max(1,remaining-1)));
  }
  if(selected.size<cap){
    const step=Math.max(1,Math.floor(size/cap));
    for(let i=0;i<size && selected.size<cap;i+=step) selected.add(i);
  }
  return [...selected].sort((a,b)=>a-b).slice(0,cap);
}

function sampleColumnValues(rows,columnName,options={}){
  const source=Array.isArray(rows)?rows:[];
  const indices=distributedSampleIndices(source.length,options.sampleSize||DEFAULT_SAMPLE_SIZE);
  const includeMissing=options.includeMissing===true;
  const values=[];
  const sampledIndices=[];
  for(const index of indices){
    const value=source[index]?.[columnName];
    if(!includeMissing && isMissing(value)) continue;
    values.push(value);
    sampledIndices.push(index);
  }
  return options.withIndices?{values,indices:sampledIndices}:values;
}

function normalizeNumericText(value){
  return String(value??'')
    .trim()
    .replace(/[−–—﹣－]/g,'-')
    .replace(/[\u00a0\u202f]/g,' ')
    .replace(/[’']/g,"'");
}

function currencyHint(text){
  for(const [symbol,code] of Object.entries(CURRENCY_SYMBOLS)){
    if(text.includes(symbol)) return code;
  }
  const code=text.match(/\b(USD|EUR|GBP|UAH|JPY|CAD|AUD|CHF|PLN|CZK|SEK|NOK|DKK|CNY|INR|TRY)\b/i)?.[1];
  return code?code.toUpperCase():null;
}

function numericToken(value){
  let text=normalizeNumericText(value);
  let negative=false;
  if(/^\(.*\)$/.test(text)){
    negative=true;
    text=text.slice(1,-1).trim();
  }
  const percent=/%/.test(text);
  const currency=currencyHint(text);
  text=text
    .replace(/\b(?:USD|EUR|GBP|UAH|JPY|CAD|AUD|CHF|PLN|CZK|SEK|NOK|DKK|CNY|INR|TRY)\b/ig,'')
    .replace(/[$€£₴¥₹₽₺₩%]/g,'')
    .trim();
  if(negative && !text.startsWith('-')) text='-'+text;
  return {raw:value,text,percent,currency};
}

function separatorEvidence(token){
  const text=String(token?.text||'').replace(/^[-+]/,'').trim();
  const dot=(text.match(/\./g)||[]).length;
  const comma=(text.match(/,/g)||[]).length;
  const spaces=(text.match(/ /g)||[]).length;
  const apostrophes=(text.match(/'/g)||[]).length;
  const lastDot=text.lastIndexOf('.');
  const lastComma=text.lastIndexOf(',');
  const last=Math.max(lastDot,lastComma);
  const digitsAfter=last>=0?text.slice(last+1).replace(/\D/g,'').length:0;
  return {text,dot,comma,spaces,apostrophes,lastDot,lastComma,digitsAfter};
}

function inferNumericLocale(values,options={}){
  const tokens=(values||[]).filter(value=>!isMissing(value)).slice(0,options.limit||DEFAULT_SAMPLE_SIZE).map(numericToken);
  const evidence=tokens.map(separatorEvidence).filter(item=>/\d/.test(item.text));
  let decimalSeparator=null;
  let thousandsSeparator=null;
  let ambiguous=false;
  const both=evidence.filter(item=>item.dot&&item.comma);
  if(both.length){
    const commaDecimal=both.filter(item=>item.lastComma>item.lastDot).length;
    const dotDecimal=both.length-commaDecimal;
    if(commaDecimal===dotDecimal) ambiguous=true;
    else{
      decimalSeparator=commaDecimal>dotDecimal?',':'.';
      thousandsSeparator=decimalSeparator===','?'.':',';
    }
  }else{
    const decideSingle=(separator,key)=>{
      const rows=evidence.filter(item=>item[key]);
      if(!rows.length) return null;
      const decimalLike=rows.filter(item=>item.digitsAfter>0&&item.digitsAfter!==3).length;
      const groupedLike=rows.filter(item=>item.digitsAfter===3 && (item[key]>1 || /^\d{1,3}(?:[.,]\d{3})+$/.test(item.text))).length;
      if(decimalLike && !groupedLike) return 'decimal';
      if(groupedLike && !decimalLike) return 'thousands';
      if(decimalLike>groupedLike*2) return 'decimal';
      if(groupedLike>decimalLike*2) return 'thousands';
      return 'ambiguous';
    };
    const comma=decideSingle(',', 'comma');
    const dot=decideSingle('.', 'dot');
    if(comma==='decimal'){decimalSeparator=',';}
    else if(comma==='thousands'){thousandsSeparator=',';}
    else if(comma==='ambiguous') ambiguous=true;
    if(dot==='decimal'){
      if(decimalSeparator && decimalSeparator!=='.') ambiguous=true;
      else decimalSeparator='.';
    }else if(dot==='thousands'){
      if(thousandsSeparator && thousandsSeparator!=='.') ambiguous=true;
      else thousandsSeparator='.';
    }else if(dot==='ambiguous') ambiguous=true;
  }
  const groupedSpace=evidence.filter(item=>item.spaces && /^\d{1,3}(?: \d{3})+(?:[.,]\d+)?$/.test(item.text)).length;
  const groupedApostrophe=evidence.filter(item=>item.apostrophes && /^\d{1,3}(?:'\d{3})+(?:[.,]\d+)?$/.test(item.text)).length;
  if(groupedSpace) thousandsSeparator=' ';
  if(groupedApostrophe) thousandsSeparator="'";
  const currency=tokens.map(token=>token.currency).find(Boolean)||null;
  return {decimalSeparator,thousandsSeparator,ambiguous,currency,confidence:ambiguous?'low':(evidence.length?'medium':'unknown')};
}

function parseLocaleAwareNumber(value,context={}){
  if(typeof value==='number'){
    return Number.isFinite(value)
      ? {value,valid:true,ambiguous:false,confidence:'high',warnings:[],raw:value,percent:false,currency:null}
      : {value:null,valid:false,ambiguous:false,confidence:'low',warnings:['not_finite'],raw:value,percent:false,currency:null};
  }
  if(typeof value==='bigint') return {value:Number(value),valid:Number.isSafeInteger(Number(value)),ambiguous:false,confidence:'medium',warnings:['bigint_coerced'],raw:value,percent:false,currency:null};
  const token=numericToken(value);
  let text=token.text;
  const warnings=[];
  if(!text || !/\d/.test(text) || /[^\d.,' +\-]/.test(text)){
    return {value:null,valid:false,ambiguous:false,confidence:'low',warnings:['not_numeric'],raw:value,percent:token.percent,currency:token.currency};
  }
  const locale=context.localePattern||context;
  let decimalSeparator=locale.decimalSeparator||null;
  let thousandsSeparator=locale.thousandsSeparator||null;
  let ambiguous=false;
  const evidence=separatorEvidence(token);
  if(evidence.dot && evidence.comma){
    if(!decimalSeparator){
      decimalSeparator=evidence.lastComma>evidence.lastDot?',':'.';
      thousandsSeparator=decimalSeparator===','?'.':',';
      warnings.push('locale_inferred_from_value');
    }
  }else{
    const separator=evidence.comma?',':(evidence.dot?'.':null);
    if(separator && !decimalSeparator && !thousandsSeparator){
      if(evidence.digitsAfter===3 && evidence[separator===','?'comma':'dot']===1){
        if(token.currency){thousandsSeparator=separator; warnings.push('thousands_inferred_from_currency');}
        else ambiguous=true;
      }else decimalSeparator=separator;
    }
  }
  if(locale.ambiguous && !decimalSeparator && (evidence.comma||evidence.dot)) ambiguous=true;
  if(ambiguous){
    return {value:null,valid:false,ambiguous:true,confidence:'low',warnings:['AMBIGUOUS_NUMBER_FORMAT'],raw:value,percent:token.percent,currency:token.currency||locale.currency||null};
  }
  text=text.replace(/[ ']/g,'');
  if(thousandsSeparator) text=text.split(thousandsSeparator).join('');
  if(decimalSeparator && decimalSeparator!=='.') text=text.replace(decimalSeparator,'.');
  if((text.match(/\./g)||[]).length>1 || (text.match(/,/g)||[]).length){
    return {value:null,valid:false,ambiguous:false,confidence:'low',warnings:['invalid_grouping'],raw:value,percent:token.percent,currency:token.currency||locale.currency||null};
  }
  if(!/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text)){
    return {value:null,valid:false,ambiguous:false,confidence:'low',warnings:['not_numeric'],raw:value,percent:token.percent,currency:token.currency||locale.currency||null};
  }
  let number=Number(text);
  if(!Number.isFinite(number)) return {value:null,valid:false,ambiguous:false,confidence:'low',warnings:['not_finite'],raw:value,percent:token.percent,currency:token.currency||locale.currency||null};
  if(token.percent && context.normalizePercent===true) number/=100;
  return {value:number,valid:true,ambiguous:false,confidence:warnings.length?'medium':'high',warnings,raw:value,percent:token.percent,currency:token.currency||locale.currency||null};
}

function quarterInfo(text){
  const raw=String(text||'').trim();
  let match=raw.match(/^Q([1-4])\s*[-/ ]?\s*((?:19|20)\d{2})$/i);
  if(match) return {year:Number(match[2]),quarter:Number(match[1]),granularity:'quarter',normalized:`${match[2]}-Q${match[1]}`};
  match=raw.match(/^((?:19|20)\d{2})\s*[-/ ]?\s*Q([1-4])$/i);
  if(match) return {year:Number(match[1]),quarter:Number(match[2]),granularity:'quarter',normalized:`${match[1]}-Q${match[2]}`};
  return null;
}

function parseDateValue(value){
  if(value instanceof Date && Number.isFinite(value.getTime())) return {valid:true,date:value,granularity:'datetime',ambiguous:false};
  const text=String(value??'').trim();
  if(!text) return {valid:false};
  const quarter=quarterInfo(text);
  if(quarter){
    return {valid:true,date:new Date(Date.UTC(quarter.year,(quarter.quarter-1)*3,1)),granularity:'quarter',ambiguous:false,rawLabel:text};
  }
  if(/^((?:19|20)\d{2})$/.test(text)) return {valid:true,date:new Date(Date.UTC(Number(text),0,1)),granularity:'year',ambiguous:false,rawLabel:text};
  let match=text.match(/^((?:19|20)\d{2})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?(?:[T ](\d{1,2}):?(\d{2})?(?::?(\d{2}))?(?:\.\d+)?Z?)?$/);
  if(match){
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]||1);
    const hour=Number(match[4]||0),minute=Number(match[5]||0),second=Number(match[6]||0);
    const date=new Date(Date.UTC(year,month-1,day,hour,minute,second));
    if(date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day){
      return {valid:true,date,granularity:match[4]?'datetime':(match[3]?'day':'month'),ambiguous:false,rawLabel:text};
    }
  }
  match=text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20)?\d{2})$/);
  if(match){
    const a=Number(match[1]),b=Number(match[2]),year=Number(match[3])<100?2000+Number(match[3]):Number(match[3]);
    if(a<=12 && b<=12) return {valid:false,ambiguous:true,warning:'AMBIGUOUS_DATE_FORMAT'};
    const day=a>12?a:b;
    const month=a>12?b:a;
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day) return {valid:true,date,granularity:'day',ambiguous:false,rawLabel:text};
  }
  return {valid:false};
}

function detectDateGranularity(values){
  const parsed=(values||[]).filter(value=>!isMissing(value)).map(parseDateValue);
  const valid=parsed.filter(item=>item.valid);
  const ambiguous=parsed.filter(item=>item.ambiguous).length;
  if(!valid.length) return {granularity:null,validRatio:0,ambiguousRatio:parsed.length?ambiguous/parsed.length:0,confidence:'unknown'};
  const counts=new Map();
  valid.forEach(item=>counts.set(item.granularity,(counts.get(item.granularity)||0)+1));
  const granularity=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  const validRatio=valid.length/Math.max(1,parsed.length);
  return {granularity,validRatio,ambiguousRatio:ambiguous/Math.max(1,parsed.length),confidence:validRatio>=.9&&!ambiguous?'high':(validRatio>=.7?'medium':'low')};
}

function median(values){
  if(!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const middle=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
}

function computeNumericStats(values,context={}){
  const source=(values||[]).filter(value=>!isMissing(value));
  const localePattern=context.localePattern||inferNumericLocale(source);
  let count=0,sum=0,mean=0,m2=0,min=null,max=null,zeroCount=0,hasNegative=false,invalidCount=0,ambiguousCount=0;
  const sample=[];
  const sampleIndices=new Set(distributedSampleIndices(source.length,context.sampleSize||DEFAULT_SAMPLE_SIZE));
  source.forEach((raw,index)=>{
    const parsed=parseLocaleAwareNumber(raw,{...localePattern,normalizePercent:false});
    if(!parsed.valid){invalidCount+=1; if(parsed.ambiguous) ambiguousCount+=1; return;}
    const value=parsed.value;
    count+=1;
    sum+=value;
    const delta=value-mean;
    mean+=delta/count;
    m2+=delta*(value-mean);
    min=min===null?value:Math.min(min,value);
    max=max===null?value:Math.max(max,value);
    if(value===0) zeroCount+=1;
    if(value<0) hasNegative=true;
    if(sampleIndices.has(index)) sample.push(value);
  });
  return {
    count,min,max,mean:count?mean:null,median:median(sample),stdDev:count>1?Math.sqrt(m2/(count-1)):0,
    sum:count?sum:null,hasNegative,zeroCount,invalidCount,ambiguousCount,localePattern
  };
}

function looksLikeUrl(value){
  const text=String(value??'').trim();
  return /^https?:\/\/[^\s]+$/i.test(text);
}

function looksLikeDomain(value){
  const text=String(value??'').trim();
  return !looksLikeUrl(text) && text.length<=253 && !/\s/.test(text) && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d+)?(?:\/[^\s]*)?$/i.test(text);
}

function looksLikeJson(value){
  if(value && typeof value==='object') return true;
  const text=String(value??'').trim();
  if(!/^[\[{]/.test(text)) return false;
  try{const parsed=JSON.parse(text); return Boolean(parsed&&typeof parsed==='object');}catch(e){return false;}
}

function looksLikeDuration(value){
  const text=String(value??'').trim();
  return /^(?:\d{1,3}:)?\d{1,2}:\d{2}(?:\.\d+)?$/.test(text) || /^P(?:\d+[YMWD])?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/i.test(text);
}

function booleanValue(value){
  if(typeof value==='boolean') return true;
  return /^(?:true|false|yes|no|y|n|так|ні|да|нет|0|1)$/i.test(String(value??'').trim());
}

function nameHints(name){
  const key=String(name||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'_');
  return {
    identifier:TECHNICAL_ID_HINT.test(key),
    status:/(^|_)(?:status|state|stage|priority|verification|статус|стан|пріоритет)($|_)/u.test(key),
    date:/(^|_)(?:date|datetime|time|timestamp|created|updated|дата|час)($|_)/u.test(key),
    percent:/(?:percent|percentage|pct|share|rate|ratio|відсот|частка)/u.test(key),
    currency:/(?:price|cost|revenue|amount|budget|income|sales|ціна|вартість|дохід|бюджет)/u.test(key),
    url:/(?:url|link|href|website|посилання|сайт)/u.test(key),
    domain:/(?:domain|hostname|домен)/u.test(key),
    metric:METRIC_HINT.test(key),
    narrative:NARRATIVE_HINT.test(key)
  };
}

function narrativeScore(name,strings,averageLength,distinctRatio){
  const values=(strings||[]).filter(Boolean);
  if(!values.length) return {score:0,signals:[]};
  const hints=nameHints(name);
  const tokenCounts=values.map(value=>value.split(/\s+/).filter(Boolean).length);
  const averageTokens=tokenCounts.reduce((sum,value)=>sum+value,0)/tokenCounts.length;
  const punctuationRatio=values.filter(value=>/[.!?;:]/.test(value)).length/values.length;
  const sentenceRatio=values.filter(value=>/[.!?]\s*$/.test(value)||/[.!?]\s+/.test(value)).length/values.length;
  const whitespaceRatio=values.filter(value=>/\s/.test(value)).length/values.length;
  const longValueRatio=values.filter(value=>value.length>=55||value.split(/\s+/).length>=8).length/values.length;
  const urlLikeRatio=values.filter(value=>looksLikeUrl(value)||looksLikeDomain(value)).length/values.length;
  let score=0;
  const signals=[];
  if(hints.narrative){score+=32;signals.push('name_hint');}
  if(averageLength>=55){score+=22;signals.push('long_average_text');}
  if(averageLength>=90){score+=12;signals.push('very_long_average_text');}
  if(averageTokens>=7){score+=18;signals.push('multi_token_values');}
  if(longValueRatio>=.55){score+=16;signals.push('mostly_long_values');}
  if(punctuationRatio>=.25){score+=8;signals.push('punctuation');}
  if(sentenceRatio>=.2){score+=8;signals.push('sentence_like');}
  if(whitespaceRatio>=.75){score+=8;signals.push('contains_phrases');}
  if(distinctRatio>=.45){score+=6;signals.push('high_text_variety');}
  if(urlLikeRatio>=.35) score-=35;
  if(hints.identifier) score-=18;
  if(hints.metric) score-=14;
  return {score:Math.max(0,Math.min(100,score)),signals:[...new Set(signals)]};
}

function inferPhysicalType(profileInput={}){
  const values=(profileInput.values||[]).filter(value=>!isMissing(value));
  if(!values.length) return {type:'unknown',confidence:'unknown',warnings:[],localePattern:null};
  const hints=nameHints(profileInput.name);
  const total=values.length;
  const ratio=predicate=>values.filter(predicate).length/total;
  const urlRatio=ratio(looksLikeUrl);
  const domainRatio=ratio(looksLikeDomain);
  const jsonRatio=ratio(looksLikeJson);
  const boolRatio=ratio(booleanValue);
  const durationRatio=ratio(looksLikeDuration);
  const dateResult=detectDateGranularity(values);
  const localePattern=inferNumericLocale(values);
  const parsed=values.map(value=>parseLocaleAwareNumber(value,localePattern));
  const numeric=parsed.filter(item=>item.valid);
  const numericRatio=numeric.length/total;
  const ambiguousNumbers=parsed.filter(item=>item.ambiguous).length;
  const warnings=[];
  if(ambiguousNumbers) warnings.push('AMBIGUOUS_NUMBER_FORMAT');
  if(dateResult.ambiguousRatio) warnings.push('AMBIGUOUS_DATE_FORMAT');
  if(jsonRatio>=.85) return {type:'json',confidence:jsonRatio>=.98?'high':'medium',warnings,localePattern};
  if(urlRatio>=.8 || (hints.url&&urlRatio>=.55)) return {type:'url',confidence:urlRatio>=.95?'high':'medium',warnings,localePattern};
  if(domainRatio>=.8 || (hints.domain&&domainRatio>=.55)) return {type:'domain',confidence:domainRatio>=.95?'high':'medium',warnings,localePattern};
  if(boolRatio>=.95 && new Set(values.map(value=>String(value).toLowerCase())).size<=3) return {type:'boolean',confidence:'high',warnings,localePattern};
  if(durationRatio>=.85) return {type:'duration',confidence:durationRatio>=.95?'high':'medium',warnings,localePattern};
  if(dateResult.validRatio>=.85 || (hints.date&&dateResult.validRatio>=.65)){
    const hasTime=values.some(value=>/[T ]\d{1,2}:\d{2}/.test(String(value)));
    return {type:hasTime?'datetime':'date',confidence:dateResult.confidence,warnings,localePattern,dateGranularity:dateResult.granularity};
  }
  if(numericRatio>=.85){
    const numbers=numeric.map(item=>item.value);
    const allInteger=numbers.every(Number.isInteger);
    const percentRatio=parsed.filter(item=>item.percent).length/total;
    const currencies=parsed.map(item=>item.currency).filter(Boolean);
    let type=allInteger?'integer':'decimal';
    if(percentRatio>=.55 || (hints.percent&&percentRatio>=.2)) type='percent';
    else if(currencies.length/total>=.55 || (hints.currency&&currencies.length/total>=.2)) type='currency';
    return {type,confidence:numericRatio>=.97&&!ambiguousNumbers?'high':'medium',warnings,localePattern,currency:currencies[0]||localePattern.currency||null};
  }
  const strings=values.map(value=>String(value).trim());
  const distinct=new Set(strings).size;
  const averageLength=strings.reduce((sum,value)=>sum+value.length,0)/strings.length;
  if(hints.status && distinct<=Math.min(40,Math.max(3,total*.4)) && averageLength<=60) return {type:'status',confidence:'medium',warnings,localePattern};
  if(distinct<=Math.min(60,Math.max(8,Math.ceil(total*.35))) && averageLength<=100) return {type:'category',confidence:'medium',warnings,localePattern};
  return {type:'text',confidence:'medium',warnings,localePattern};
}

function isSequentialNumeric(values,localePattern){
  const parsed=(values||[]).filter(value=>!isMissing(value)).map(value=>parseLocaleAwareNumber(value,localePattern)).filter(item=>item.valid).map(item=>item.value);
  if(parsed.length<4 || !parsed.every(Number.isInteger)) return false;
  let steps=0;
  for(let i=1;i<parsed.length;i+=1) if(parsed[i]-parsed[i-1]===1) steps+=1;
  return steps/Math.max(1,parsed.length-1)>=.85;
}

function inferAnalyticalRole(columnProfile,datasetProfile={}){
  const profile=columnProfile||{};
  const type=profile.physicalType||'unknown';
  if(type==='identifier') return 'identifier';
  if(['date','datetime','duration'].includes(type)) return 'timeline';
  if(type==='url') return 'url';
  if(type==='domain') return 'domain';
  if(type==='boolean') return 'boolean';
  if(type==='json') return 'json';
  if(NUMBER_TYPES.has(type)){
    if(profile.identifierSignals?.includes('uuid_pattern')) return 'identifier';
    if(profile.identifierSignals?.includes('name_hint')&&!profile.identifierSignals?.includes('metric_name_hint')) return 'identifier';
    return profile.numericStats?.count && profile.numericStats?.min!==profile.numericStats?.max?'metric':'unknown';
  }
  if(type==='status') return 'category';
  if(type==='category') return 'category';
  if(type==='text'){
    if((profile.narrativeScore||0)>=58 || (profile.averageTextLength||0)>=120) return 'description';
    if(Math.max(profile.distinctRatio||0,profile.distinctRatioEstimated||0)>=.35 && (profile.averageTextLength||0)<=100) return 'dimension';
    if((profile.distinctCount||0)<=60) return 'category';
    return 'description';
  }
  return 'unknown';
}

function profileColumn(name,values,context={}){
  const source=Array.isArray(values)?values:[];
  const sampled=Array.isArray(context.sampleValues)?context.sampleValues:source.slice(0,DEFAULT_SAMPLE_SIZE);
  const nonEmptySample=sampled.filter(value=>!isMissing(value));
  const inferred=inferPhysicalType({name,values:nonEmptySample,context});
  const distinctLimit=context.distinctLimit||DEFAULT_DISTINCT_LIMIT;
  const distinct=new Set();
  let distinctOverflow=false;
  let nonEmptyCount=0;
  let nullCount=0;
  let totalTextLength=0;
  for(const value of source){
    if(isMissing(value)){nullCount+=1; continue;}
    nonEmptyCount+=1;
    totalTextLength+=String(value).length;
    if(distinct.size<distinctLimit) distinct.add(typeof value==='object'?JSON.stringify(value):String(value).trim());
    else distinctOverflow=true;
  }
  const distinctCount=distinct.size;
  const distinctRatio=nonEmptyCount?Math.min(1,distinctCount/nonEmptyCount):0;
  const sampleDistinctRatio=nonEmptySample.length?new Set(nonEmptySample.map(value=>typeof value==='object'?JSON.stringify(value):String(value).trim())).size/nonEmptySample.length:0;
  const distinctRatioEstimated=distinctOverflow?Math.max(distinctRatio,sampleDistinctRatio):distinctRatio;
  const averageTextLength=nonEmptyCount?totalTextLength/nonEmptyCount:null;
  const identifierSignals=[];
  const strings=nonEmptySample.map(value=>String(value).trim());
  const uuidRatio=strings.length?strings.filter(value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)).length/strings.length:0;
  const hints=nameHints(name);
  const codeLikeIdRatio=strings.length?strings.filter(value=>/^[a-z]{1,16}[-_:]?[a-z0-9]{1,24}[-_:]\d+$/i.test(value)||/^[a-z0-9_-]{6,64}$/i.test(value)&&/\d/.test(value)&&/[a-z]/i.test(value)).length/strings.length:0;
  if(uuidRatio>=.8) identifierSignals.push('uuid_pattern');
  if(nonEmptyCount>=4 && distinctRatioEstimated>=.98 && averageTextLength!==null && averageTextLength<=64) identifierSignals.push('high_distinct_ratio');
  if(distinctRatioEstimated>=.8 && isSequentialNumeric(nonEmptySample,inferred.localePattern)) identifierSignals.push('sequential_values');
  if(hints.identifier && (distinctRatio>=.35||distinctRatioEstimated>=.35||codeLikeIdRatio>=.6)) identifierSignals.push('name_hint');
  if(hints.identifier && codeLikeIdRatio>=.55) identifierSignals.push('code_like_values');
  if(hints.metric && identifierSignals.includes('sequential_values')) identifierSignals.push('metric_name_hint');
  let physicalType=inferred.type;
  const strongTechnicalId=identifierSignals.includes('name_hint')&&(identifierSignals.includes('code_like_values')||distinctRatioEstimated>=.7);
  const rowPositionId=identifierSignals.includes('name_hint')&&identifierSignals.includes('sequential_values')&&!hints.metric;
  if(identifierSignals.includes('uuid_pattern') || strongTechnicalId || rowPositionId) physicalType='identifier';
  const numericStats=NUMBER_TYPES.has(physicalType)?computeNumericStats(source,{localePattern:inferred.localePattern,sampleSize:context.sampleSize}):null;
  const dateValues=['date','datetime'].includes(physicalType)?nonEmptySample.map(parseDateValue).filter(item=>item.valid):[];
  const timestamps=dateValues.map(item=>item.date.getTime()).filter(Number.isFinite);
  const dateStats=dateValues.length?{
    minDate:new Date(Math.min(...timestamps)).toISOString(),
    maxDate:new Date(Math.max(...timestamps)).toISOString(),
    inferredGranularity:inferred.dateGranularity||detectDateGranularity(nonEmptySample).granularity
  }:null;
  const narrative=narrativeScore(name,strings,averageTextLength||0,distinctRatioEstimated);
  const profile={
    name:String(name),physicalType,analyticalRole:'unknown',nonEmptyCount,nullCount,
    nullRate:source.length?nullCount/source.length:0,
    distinctCount,distinctCountAtLeast:distinctOverflow?distinctLimit:null,distinctRatio,distinctRatioEstimated,
    averageTextLength,
    numericStats,dateStats,
    formatHints:{
      percent:physicalType==='percent',currency:inferred.currency||null,localePattern:inferred.localePattern||null
    },
    semanticHints:Object.entries(hints).filter(([,enabled])=>enabled).map(([hint])=>hint),
    identifierSignals,narrativeScore:narrative.score,narrativeSignals:narrative.signals,
    confidence:inferred.confidence||'unknown',
    warnings:[...new Set([...(inferred.warnings||[]),...(distinctOverflow?['high_cardinality']:[])])]
  };
  profile.analyticalRole=inferAnalyticalRole(profile,context.datasetProfile||{});
  if(profile.analyticalRole==='identifier' && profile.physicalType!=='identifier') profile.warnings.push('identifier_excluded_from_metrics');
  return profile;
}

function discoverColumnNames(rows){
  const names=[];
  const seen=new Set();
  for(const row of rows||[]){
    if(!row || typeof row!=='object' || Array.isArray(row)) continue;
    for(const name of Object.keys(row)){
      if(String(name).startsWith('_') || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function computeDatasetQuality(datasetProfile){
  const profile=datasetProfile||{};
  const columns=profile.columns||[];
  const warnings=[];
  if(!profile.rowCount) warnings.push('insufficient_data');
  if(!columns.length) warnings.push('no_columns');
  const highMissing=columns.filter(column=>column.nullRate>.5).length;
  const allNull=columns.filter(column=>column.nonEmptyCount===0).length;
  const ambiguous=columns.filter(column=>column.warnings?.some(warning=>/^AMBIGUOUS_/.test(warning))).length;
  if(highMissing) warnings.push('high_missingness');
  if(allNull) warnings.push('all_null_columns');
  if(ambiguous) warnings.push('ambiguous_formats');
  const completeness=columns.length?1-columns.reduce((sum,column)=>sum+column.nullRate,0)/columns.length:0;
  return {completeness,highMissingColumnCount:highMissing,allNullColumnCount:allNull,ambiguousColumnCount:ambiguous,warnings};
}

function legacyColumnType(profile){
  const type=profile?.physicalType||'unknown';
  if(NUMBER_TYPES.has(type)) return 'number';
  if(type==='identifier') return 'identifier';
  if(type==='datetime') return 'date';
  return type;
}

function profileDataset(dataset,options={}){
  const rows=Array.isArray(dataset?.rows)?dataset.rows:[];
  const names=Array.isArray(options.columns)&&options.columns.length
    ? options.columns.map(column=>typeof column==='string'?column:column.name).filter(Boolean)
    : discoverColumnNames(rows);
  const sampleSize=options.sampleSize||DEFAULT_SAMPLE_SIZE;
  const indices=distributedSampleIndices(rows.length,sampleSize);
  const columns=names.map(name=>{
    const values=rows.map(row=>row?.[name]);
    const sampleValues=indices.map(index=>rows[index]?.[name]);
    return profileColumn(name,values,{sampleValues,sampleSize,distinctLimit:options.distinctLimit||DEFAULT_DISTINCT_LIMIT});
  });
  const profile={
    id:`profile:${dataset?.id||stableHash(dataset?.name||'dataset')}`,
    datasetId:dataset?.id||'',rowCount:rows.length,columnCount:columns.length,columns,
    sampledRowCount:indices.length,sampleIndices:indices,
    roles:{
      identifiers:columns.filter(column=>column.analyticalRole==='identifier').map(column=>column.name),
      metrics:columns.filter(column=>column.analyticalRole==='metric').map(column=>column.name),
      timelines:columns.filter(column=>column.analyticalRole==='timeline').map(column=>column.name),
      categories:columns.filter(column=>['category','boolean'].includes(column.analyticalRole)).map(column=>column.name),
      dimensions:columns.filter(column=>column.analyticalRole==='dimension').map(column=>column.name),
      descriptions:columns.filter(column=>column.analyticalRole==='description').map(column=>column.name)
    },
    sourceAnchor:dataset?.sourceAnchor||{},
    extractionConfidence:dataset?.extractionConfidence||'unknown',
    warnings:[...(dataset?.warnings||[])]
  };
  profile.quality=computeDatasetQuality(profile);
  profile.warnings=[...new Set([...profile.warnings,...profile.quality.warnings])];
  profile.legacyColumns=columns.map(column=>({name:column.name,type:legacyColumnType(column),physicalType:column.physicalType,analyticalRole:column.analyticalRole,confidence:column.confidence,warnings:column.warnings}));
  return profile;
}

global.MRSUniversalAnalysis=Object.freeze({
  DEFAULT_SAMPLE_SIZE,DEFAULT_DISTINCT_LIMIT,NUMBER_TYPES,
  stableHash,distributedSampleIndices,sampleColumnValues,parseLocaleAwareNumber,inferNumericLocale,
  parseDateValue,detectDateGranularity,computeNumericStats,inferPhysicalType,inferAnalyticalRole,
  profileColumn,profileDataset,computeDatasetQuality,discoverColumnNames,legacyColumnType,isMissing,quarterInfo
});
})(typeof window!=='undefined'?window:globalThis);
