(function(global){
'use strict';

const UA=global.MRSUniversalAnalysis;
const CHARTS=global.MRSChartCandidates;
if(!UA || !CHARTS) throw new Error('Universal analysis and chart candidates must load before derived-table-candidates.js');

function idFor(datasetId,key){return `derived-table:${UA.stableHash(`${datasetId}|${key}`)}`;}

function sourceMetadata(dataset){return CHARTS.sourceMetadata(dataset);}

function makeCandidate(dataset,key,config){
  const source=sourceMetadata(dataset);
  return {
    id:idFor(dataset?.id||'',key),datasetId:dataset?.id||'',sourceTableId:dataset?.sourceTableId||'',
    candidateType:config.candidateType,title:config.title,groupBy:config.groupBy||[],metrics:config.metrics||[],
    score:Math.round(Math.max(0,Math.min(100,config.score||0))*10)/10,recommended:false,pinned:false,
    validation:{valid:config.valid!==false,warnings:[...(config.warnings||[])],reason:config.reason||''},
    sourceAnchor:{...(dataset?.sourceAnchor||{})},transformation:{...(config.transformation||{}),...source},...source
  };
}

function createDerivedTableRegistry(dataset,profileInput,options={}){
  const profile=profileInput||UA.profileDataset(dataset,options);
  const columns=profile.columns||[];
  const metrics=columns.filter(column=>column.analyticalRole==='metric' && column.numericStats?.count);
  const dimensions=columns.filter(column=>['category','dimension','boolean'].includes(column.analyticalRole) && (column.distinctCount||0)>=2 && (column.analyticalRole==='dimension'||(column.distinctCount||0)<=80));
  const timelines=columns.filter(column=>column.analyticalRole==='timeline'&&column.nonEmptyCount>=2);
  if(columns.length>(options.lazyColumnThreshold||160)&&!options._wideSubset){
    const rank=column=>(1-(column.nullRate||0))*100+Math.min(30,column.distinctCount||0);
    const selected=[...metrics.slice().sort((a,b)=>rank(b)-rank(a)).slice(0,10),...dimensions.slice().sort((a,b)=>rank(b)-rank(a)).slice(0,8),...timelines.slice(0,3)];
    const names=new Set(selected.map(column=>column.name));
    const subsetProfile={...profile,columns:columns.filter(column=>names.has(column.name))};
    const eager=createDerivedTableRegistry({...dataset,rows:[]},subsetProfile,{...options,_wideSubset:true});
    const entities=dimensions.filter(column=>column.analyticalRole==='dimension'||(column.distinctCount||0)>20).length;
    const pivotDimensions=Math.min(8,dimensions.filter(column=>(column.distinctCount||0)<=30).length);
    const estimated=3+(metrics.length?1:0)+dimensions.length+dimensions.length*metrics.length*5+entities*metrics.length*3+(pivotDimensions*(pivotDimensions-1)/2)*metrics.length+timelines.length*metrics.length*2+(metrics.length>=2?1:0);
    return {...eager,lazy:true,candidateCount:Math.max(eager.candidateCount,Math.ceil(estimated)),materializedCandidateCount:eager.candidateCount,unmaterializedCount:Math.max(0,Math.ceil(estimated)-eager.candidateCount),metrics:metrics.map(column=>column.name),dimensions:dimensions.map(column=>column.name),lazyProfile:profile,lazyDataset:{id:dataset?.id||'',sourceFileId:dataset?.sourceFileId||'',sourceDocumentId:dataset?.sourceDocumentId||'',sourceTableId:dataset?.sourceTableId||'',sourceAnchor:dataset?.sourceAnchor||{},extractionConfidence:dataset?.extractionConfidence||'unknown',rows:[]},warnings:[...(eager.warnings||[]),'lazy_registry_filter_to_materialize']};
  }
  const candidates=[];
  const diagnostics=[];
  const lowConfidenceExtraction=(dataset?.extractionConfidence||profile.extractionConfidence)==='low';
  const add=(key,config)=>{
    const item=makeCandidate(dataset,key,config);
    if(item.validation.valid) candidates.push(item);
    else diagnostics.push(item);
  };

  add('column-profile',{
    candidateType:'column_profile',title:'Column profile',score:96,
    transformation:{type:'column_profile'}
  });
  add('missing-values',{
    candidateType:'missing_values',title:'Missing values by column',score:92,
    transformation:{type:'missing_values'}
  });
  add('unique-values-summary',{
    candidateType:'unique_values_summary',title:'Unique values summary',score:86,
    transformation:{type:'unique_values_summary'}
  });
  if(metrics.length){
    add('summary-statistics',{
      candidateType:'summary_statistics',title:'Numeric summary statistics',score:98,
      metrics:metrics.map(column=>({column:column.name,aggregation:'statistics'})),
      transformation:{type:'summary_statistics',metrics:metrics.map(column=>column.name)}
    });
  }else diagnostics.push(makeCandidate(dataset,'summary-statistics-invalid',{candidateType:'summary_statistics',title:'Numeric summary statistics',valid:false,reason:'no_numeric_metrics'}));

  for(const dimension of dimensions){
    add(`distribution|${dimension.name}`,{
      candidateType:'category_distribution',title:`Distribution: ${dimension.name}`,groupBy:[dimension.name],score:82-(dimension.nullRate||0)*25,
      transformation:{type:'category_distribution',groupBy:[dimension.name],aggregation:'count_share'}
    });
    for(const metric of metrics){
      const aggregations=CHARTS.compatibleAggregations(metric);
      for(const aggregation of aggregations){
        add(`group-by|${dimension.name}|${metric.name}|${aggregation}`,{
          candidateType:'group_by',title:`${metric.name} by ${dimension.name} (${aggregation})`,groupBy:[dimension.name],
          metrics:[{column:metric.name,aggregation}],score:66+(aggregation==='sum'?9:(aggregation==='avg'?8:3))-(dimension.nullRate||0)*15-(metric.nullRate||0)*15,
          transformation:{type:'group_by',groupBy:[dimension.name],metric:metric.name,aggregation,filters:[]}
        });
      }
      if(dimension.analyticalRole==='dimension' || (dimension.distinctCount||0)>20){
        add(`top-10|${dimension.name}|${metric.name}`,{
          candidateType:'top_n',title:`Top 10 ${dimension.name} by ${metric.name}`,groupBy:[dimension.name],metrics:[{column:metric.name,aggregation:'sum'}],score:78,
          transformation:{type:'top_n',dimension:dimension.name,metric:metric.name,aggregation:'sum',top:10}
        });
        add(`top-25|${dimension.name}|${metric.name}`,{
          candidateType:'top_n',title:`Top 25 ${dimension.name} by ${metric.name}`,groupBy:[dimension.name],metrics:[{column:metric.name,aggregation:'sum'}],score:68,
          transformation:{type:'top_n',dimension:dimension.name,metric:metric.name,aggregation:'sum',top:25}
        });
        add(`bottom-10|${dimension.name}|${metric.name}`,{
          candidateType:'bottom_n',title:`Bottom 10 ${dimension.name} by ${metric.name}`,groupBy:[dimension.name],metrics:[{column:metric.name,aggregation:'sum'}],score:58,
          transformation:{type:'bottom_n',dimension:dimension.name,metric:metric.name,aggregation:'sum',top:10}
        });
      }
    }
  }

  if(dimensions.length>=2 && metrics.length){
    const limitedDimensions=dimensions.filter(column=>(column.distinctCount||0)<=30).slice(0,8);
    for(let i=0;i<limitedDimensions.length;i+=1){
      for(let j=i+1;j<limitedDimensions.length;j+=1){
        for(const metric of metrics){
          const aggregation=CHARTS.sumIsValid(metric)?'sum':'avg';
          add(`pivot|${limitedDimensions[i].name}|${limitedDimensions[j].name}|${metric.name}|${aggregation}`,{
            candidateType:'pivot_like_summary',title:`${metric.name} by ${limitedDimensions[i].name} and ${limitedDimensions[j].name}`,
            groupBy:[limitedDimensions[i].name,limitedDimensions[j].name],metrics:[{column:metric.name,aggregation}],score:62,
            transformation:{type:'pivot_like_summary',rowDimension:limitedDimensions[i].name,columnDimension:limitedDimensions[j].name,metric:metric.name,aggregation}
          });
        }
      }
    }
  }

  for(const timeline of timelines){
    for(const metric of metrics){
      for(const aggregation of (CHARTS.sumIsValid(metric)?['sum','avg']:['avg'])){
        add(`timeline|${timeline.name}|${metric.name}|${aggregation}`,{
          candidateType:'timeline_summary',title:`${metric.name} over ${timeline.name} (${aggregation})`,groupBy:[timeline.name],
          metrics:[{column:metric.name,aggregation}],score:88-(timeline.nullRate||0)*20-(metric.nullRate||0)*20,
          transformation:{type:'timeline_summary',timeline:timeline.name,metric:metric.name,aggregation,preserveRawLabels:true}
        });
      }
    }
  }

  const comparable=metrics.filter(column=>column.numericStats?.count>=5 && column.numericStats?.stdDev>0);
  if(comparable.length>=2){
    add('correlation-matrix',{
      candidateType:'correlation_matrix',title:'Correlation matrix',metrics:comparable.map(column=>({column:column.name,aggregation:'pearson'})),score:74,
      transformation:{type:'correlation_matrix',metrics:comparable.map(column=>column.name),method:'pearson',pairwiseComplete:true}
    });
  }else diagnostics.push(makeCandidate(dataset,'correlation-invalid',{candidateType:'correlation_matrix',title:'Correlation matrix',valid:false,reason:'insufficient_nonconstant_metrics'}));

  const dedup=new Map();
  for(const candidate of candidates){
    const key=JSON.stringify([candidate.candidateType,candidate.groupBy,candidate.metrics,candidate.transformation?.top||null]);
    const previous=dedup.get(key);
    if(!previous||candidate.score>previous.score) dedup.set(key,candidate);
  }
  const all=[...dedup.values()].sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
  const recommended=[];
  const family=new Map();
  const limit=options.recommendedLimit||10;
  for(const candidate of all){
    if(recommended.length>=limit) break;
    if(lowConfidenceExtraction) break;
    const count=family.get(candidate.candidateType)||0;
    if(count>=2) continue;
    candidate.recommended=true;
    recommended.push(candidate);
    family.set(candidate.candidateType,count+1);
  }
  return {datasetId:dataset?.id||'',candidateCount:all.length,candidates:all,recommended,diagnostics,diagnosticCount:diagnostics.length,types:[...new Set(all.map(item=>item.candidateType))]};
}

function queryDerivedTableCandidates(registry,query={}){
  const search=String(query.search||'').trim().toLowerCase();
  let source=query.view==='diagnostics'?(registry?.diagnostics||[]):(registry?.candidates||[]);
  if(registry?.lazy&&query.view!=='diagnostics'){
    const requestedMetric=query.metric&&query.metric!=='all'?query.metric:'';
    const requestedDimension=query.dimension&&query.dimension!=='all'?query.dimension:'';
    const needsMaterialization=(requestedMetric&&!source.some(item=>(item.metrics||[]).some(metric=>metric.column===requestedMetric)))||(requestedDimension&&!source.some(item=>(item.groupBy||[]).includes(requestedDimension)))||(search&&!source.some(item=>String(item.title||'').toLowerCase().includes(search)));
    if(needsMaterialization){
      const columns=registry.lazyProfile?.columns||[];
      const matches=column=>!search||String(column.name||'').toLowerCase().includes(search);
      const metrics=columns.filter(column=>column.analyticalRole==='metric'&&(!requestedMetric||column.name===requestedMetric)&&(matches(column)||requestedMetric)).slice(0,12);
      const dimensions=columns.filter(column=>['category','dimension','boolean'].includes(column.analyticalRole)&&(!requestedDimension||column.name===requestedDimension)&&(matches(column)||requestedDimension)).slice(0,10);
      if(requestedMetric&&!requestedDimension) dimensions.push(...columns.filter(column=>['category','dimension','boolean'].includes(column.analyticalRole)).slice(0,10));
      if(requestedDimension&&!requestedMetric) metrics.push(...columns.filter(column=>column.analyticalRole==='metric').slice(0,12));
      const timelines=columns.filter(column=>column.analyticalRole==='timeline').slice(0,3);
      const names=new Set([...metrics,...dimensions,...timelines].map(column=>column.name));
      const dynamicProfile={...registry.lazyProfile,columns:columns.filter(column=>names.has(column.name))};
      const dynamic=createDerivedTableRegistry(registry.lazyDataset,dynamicProfile,{_wideSubset:true,recommendedLimit:10});
      const merged=new Map([...(registry.candidates||[]),...dynamic.candidates].map(candidate=>[candidate.id,candidate]));
      registry.candidates=[...merged.values()];
      registry.materializedCandidateCount=registry.candidates.length;
      source=registry.candidates;
    }
  }
  let items=source.filter(item=>{
    if(query.view==='recommended'&&!item.recommended) return false;
    if(query.view==='pinned'&&!item.pinned&&!(query.pinnedIds||[]).includes(item.id)) return false;
    if(search&&!`${item.title} ${item.candidateType} ${(item.groupBy||[]).join(' ')} ${(item.metrics||[]).map(metric=>metric.column).join(' ')}`.toLowerCase().includes(search)) return false;
    if(query.type&&query.type!=='all'&&item.candidateType!==query.type) return false;
    if(query.metric&&query.metric!=='all'&&!(item.metrics||[]).some(metric=>metric.column===query.metric)) return false;
    if(query.dimension&&query.dimension!=='all'&&!(item.groupBy||[]).includes(query.dimension)) return false;
    return true;
  });
  const pageSize=Math.max(1,Math.min(100,Number(query.pageSize)||50));
  const total=items.length,pageCount=Math.max(1,Math.ceil(total/pageSize)),page=Math.max(1,Math.min(pageCount,Number(query.page)||1));
  items=items.slice((page-1)*pageSize,page*pageSize);
  return {items,total,page,pageSize,pageCount,start:total?(page-1)*pageSize+1:0,end:Math.min(total,page*pageSize)};
}

function profileColumn(profile,name){return (profile?.columns||[]).find(column=>column.name===name)||null;}
function numericValue(row,name,profile){
  const column=profileColumn(profile,name);
  const parsed=UA.parseLocaleAwareNumber(row?.[name],column?.formatHints?.localePattern||{});
  return parsed.valid?parsed.value:null;
}

function aggregate(values,kind){return CHARTS.aggregateValues(values,kind);}

function materializeGroupBy(candidate,dataset,profile){
  const groupBy=candidate.groupBy||[];
  const metric=candidate.metrics?.[0];
  const groups=new Map();
  for(const row of dataset?.rows||[]){
    const labels=groupBy.map(name=>String(row?.[name]??'').trim());
    if(labels.some(label=>!label)) continue;
    const key=JSON.stringify(labels);
    if(!groups.has(key)) groups.set(key,{labels,values:[]});
    const group=groups.get(key);
    if(metric?.aggregation==='count') group.values.push(1);
    else{
      const value=numericValue(row,metric?.column,profile);
      if(value!==null) group.values.push(value);
    }
  }
  const valueName=metric?`${metric.aggregation}_${metric.column}`:'count';
  let rows=[...groups.values()].map(group=>{
    const row={};
    groupBy.forEach((name,index)=>{row[name]=group.labels[index];});
    row[valueName]=metric?aggregate(group.values,metric.aggregation):group.values.length;
    row.row_count=group.values.length;
    return row;
  }).filter(row=>Number.isFinite(row[valueName]));
  const type=candidate.candidateType;
  if(type==='timeline_summary') rows.sort((a,b)=>{
    const da=UA.parseDateValue(a[groupBy[0]]),db=UA.parseDateValue(b[groupBy[0]]);
    return da.valid&&db.valid?da.date-db.date:String(a[groupBy[0]]).localeCompare(String(b[groupBy[0]]),undefined,{numeric:true});
  });
  else rows.sort((a,b)=>b[valueName]-a[valueName]);
  const top=candidate.transformation?.top;
  if(type==='bottom_n') rows=rows.sort((a,b)=>a[valueName]-b[valueName]).slice(0,top||10);
  else if(type==='top_n') rows=rows.slice(0,top||10);
  return rows;
}

function materializeDistribution(candidate,dataset){
  const column=candidate.groupBy?.[0],counts=new Map(),total=(dataset?.rows||[]).filter(row=>!UA.isMissing(row?.[column])).length;
  for(const row of dataset?.rows||[]){
    const value=row?.[column];
    if(UA.isMissing(value)) continue;
    const label=String(value);
    counts.set(label,(counts.get(label)||0)+1);
  }
  return [...counts].map(([category,count])=>({[column]:category,count,share:total?count/total:null})).sort((a,b)=>b.count-a.count);
}

function materializeProfiles(candidate,profile){
  if(candidate.candidateType==='column_profile') return (profile.columns||[]).map(column=>({
    column:column.name,physical_type:column.physicalType,analytical_role:column.analyticalRole,
    non_empty:column.nonEmptyCount,missing:column.nullCount,missing_rate:column.nullRate,
    distinct:column.distinctCountAtLeast?`>=${column.distinctCountAtLeast}`:column.distinctCount,
    confidence:column.confidence,warnings:(column.warnings||[]).join(', ')
  }));
  if(candidate.candidateType==='missing_values') return (profile.columns||[]).map(column=>({column:column.name,missing:column.nullCount,missing_rate:column.nullRate,non_empty:column.nonEmptyCount})).sort((a,b)=>b.missing_rate-a.missing_rate);
  return (profile.columns||[]).map(column=>({column:column.name,distinct:column.distinctCountAtLeast?`>=${column.distinctCountAtLeast}`:column.distinctCount,distinct_ratio:column.distinctRatio,high_cardinality:Boolean(column.distinctCountAtLeast)})).sort((a,b)=>Number(b.distinct_ratio)-Number(a.distinct_ratio));
}

function materializeSummary(profile){
  return (profile.columns||[]).filter(column=>column.analyticalRole==='metric'&&column.numericStats).map(column=>({
    metric:column.name,count:column.numericStats.count,non_empty:column.nonEmptyCount,missing:column.nullCount,
    min:column.numericStats.min,max:column.numericStats.max,mean:column.numericStats.mean,median:column.numericStats.median,
    std_dev:column.numericStats.stdDev,sum:CHARTS.sumIsValid(column)?column.numericStats.sum:null
  }));
}

function correlation(x,y){
  const n=x.length;
  if(n<3) return null;
  const meanX=x.reduce((sum,value)=>sum+value,0)/n,meanY=y.reduce((sum,value)=>sum+value,0)/n;
  let numerator=0,dx=0,dy=0;
  for(let i=0;i<n;i+=1){
    const a=x[i]-meanX,b=y[i]-meanY;
    numerator+=a*b;dx+=a*a;dy+=b*b;
  }
  const denominator=Math.sqrt(dx*dy);
  return denominator?numerator/denominator:null;
}

function materializeCorrelation(candidate,dataset,profile){
  const metrics=(candidate.metrics||[]).map(metric=>metric.column);
  const rows=[];
  for(const left of metrics){
    const out={metric:left};
    for(const right of metrics){
      const x=[],y=[];
      for(const row of dataset?.rows||[]){
        const a=numericValue(row,left,profile),b=numericValue(row,right,profile);
        if(a===null||b===null) continue;
        x.push(a);y.push(b);
      }
      out[right]=left===right?1:correlation(x,y);
    }
    rows.push(out);
  }
  return rows;
}

function materializePivot(candidate,dataset,profile){
  const rowDimension=candidate.transformation?.rowDimension,columnDimension=candidate.transformation?.columnDimension;
  const metric=candidate.transformation?.metric,aggregation=candidate.transformation?.aggregation;
  const groups=new Map(),columnNames=new Set();
  for(const row of dataset?.rows||[]){
    const r=String(row?.[rowDimension]??'').trim(),c=String(row?.[columnDimension]??'').trim();
    if(!r||!c) continue;
    const value=numericValue(row,metric,profile);
    if(value===null) continue;
    if(!groups.has(r)) groups.set(r,new Map());
    if(!groups.get(r).has(c)) groups.get(r).set(c,[]);
    groups.get(r).get(c).push(value);columnNames.add(c);
  }
  const columns=[...columnNames].slice(0,50);
  return [...groups].map(([rowLabel,values])=>{
    const out={[rowDimension]:rowLabel};
    columns.forEach(column=>{out[column]=aggregate(values.get(column)||[],aggregation);});
    return out;
  });
}

function materializeDerivedTableCandidate(candidate,dataset,profileInput){
  const profile=profileInput||UA.profileDataset(dataset);
  let rows=[];
  if(['column_profile','missing_values','unique_values_summary'].includes(candidate?.candidateType)) rows=materializeProfiles(candidate,profile);
  else if(candidate?.candidateType==='summary_statistics') rows=materializeSummary(profile);
  else if(candidate?.candidateType==='category_distribution') rows=materializeDistribution(candidate,dataset);
  else if(candidate?.candidateType==='correlation_matrix') rows=materializeCorrelation(candidate,dataset,profile);
  else if(candidate?.candidateType==='pivot_like_summary') rows=materializePivot(candidate,dataset,profile);
  else rows=materializeGroupBy(candidate,dataset,profile);
  const columns=[];
  const seen=new Set();
  for(const row of rows.slice(0,200)) for(const name of Object.keys(row||{})) if(!seen.has(name)){seen.add(name);columns.push(name);}
  return {
    id:`materialized:${candidate?.id||''}`,name:candidate?.title||'Generated table',datasetId:dataset?.id||'',sourceTableId:dataset?.sourceTableId||'',
    rows,columns,sourceAnchor:{...(candidate?.sourceAnchor||{})},transformation:{...(candidate?.transformation||{})},
    extractionConfidence:dataset?.extractionConfidence||'unknown',warnings:[...(candidate?.validation?.warnings||[])]
  };
}

global.MRSDerivedTables=Object.freeze({
  createDerivedTableRegistry,queryDerivedTableCandidates,materializeDerivedTableCandidate,correlation
});
})(typeof window!=='undefined'?window:globalThis);
