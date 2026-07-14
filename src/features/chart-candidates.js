(function(global){
'use strict';

const UA=global.MRSUniversalAnalysis;
if(!UA) throw new Error('MRSUniversalAnalysis must load before chart-candidates.js');

const CONFIDENCE_WEIGHT={unknown:.62,low:.35,medium:.78,high:1};
const AGGREGATIONS=['sum','avg','median','min','max','count'];
const DEFAULT_PAGE_SIZE=50;

function confidenceWeight(value){return CONFIDENCE_WEIGHT[value]??CONFIDENCE_WEIGHT.unknown;}
function roundScore(value){return Math.round(Math.max(0,Math.min(100,value))*10)/10;}

function sourceMetadata(dataset){
  return {
    sourceFileId:dataset?.sourceFileId||'',
    sourceDocumentId:dataset?.sourceDocumentId||'',
    sourceDatasetId:dataset?.id||'',
    sourceTableId:dataset?.sourceTableId||'',
    sourceSheet:dataset?.sourceAnchor?.sheet??dataset?.sourceSheetName??null,
    sourcePage:dataset?.sourceAnchor?.page??null,
    sourceSection:dataset?.sourceAnchor?.section??null,
    sourceRowRange:dataset?.sourceAnchor?.startRow!=null?[dataset.sourceAnchor.startRow,dataset.sourceAnchor.endRow]:null,
    sourceColumnRange:dataset?.sourceAnchor?.startColumn!=null?[dataset.sourceAnchor.startColumn,dataset.sourceAnchor.endColumn]:null,
    confidence:dataset?.extractionConfidence||'unknown'
  };
}

function candidateId(datasetId,key){return `chart-candidate:${UA.stableHash(`${datasetId}|${key}`)}`;}

function makeCandidate(dataset,key,config){
  const source=sourceMetadata(dataset);
  return {
    id:candidateId(dataset?.id||'',key),
    datasetId:dataset?.id||'',
    sourceTableId:dataset?.sourceTableId||'',
    candidateType:config.candidateType,
    chartType:config.chartType,
    title:config.title,
    dimensionKeys:config.dimensionKeys||[],
    metricKeys:config.metricKeys||[],
    aggregation:config.aggregation||'none',
    filters:[],sort:config.sort||'none',top:config.top??null,
    score:roundScore(config.score||0),recommended:false,pinned:false,
    validation:{valid:config.valid!==false,reason:config.reason||'',warnings:[...(config.warnings||[])]},
    confidence:source.confidence,extractionConfidence:source.confidence,
    sourceAnchor:{...(dataset?.sourceAnchor||{})},
    transformation:{...(config.transformation||{}),...source},
    ...source
  };
}

function metricInformationScore(column){
  const stats=column?.numericStats;
  if(!stats?.count) return 0;
  const variance=Number(stats.stdDev||0)>0?1:0;
  const coverage=1-(column.nullRate||0);
  const name=String(column?.name||'').toLowerCase();
  const business=/(?:revenue|sales|profit|margin|traffic|threat|score|views|clicks|conversion|organic|paid|etv|roi|roas|дохід|прибут|трафік|оцінк|перегляд)/u.test(name)?18:0;
  const technical=/(?:task|request|row[_\s-]?(?:id|number|index)|api[_\s-]?cost|dataforseo[_\s-]?cost|token|latency|status[_\s-]?code|uuid)/u.test(name)?28:0;
  const spread=Number(stats.max||0)!==Number(stats.min||0)?Math.min(10,Math.abs(Number(stats.stdDev||0))/Math.max(1,Math.abs(Number(stats.mean||0)))*8):0;
  return coverage*30+variance*20+confidenceWeight(column.confidence)*10+business+spread-technical;
}

function dimensionInformationScore(column,rowCount){
  const distinct=column?.distinctCountAtLeast||column?.distinctCount||0;
  if(distinct<2) return 0;
  const coverage=1-(column.nullRate||0);
  const ratio=distinct/Math.max(1,rowCount);
  const readability=distinct<=12?1:(distinct<=30?.82:(distinct<=60?.58:(ratio>.9?.44:.35)));
  return coverage*28+readability*24+confidenceWeight(column.confidence)*8;
}

function unitGroup(column){
  if(column.physicalType==='currency') return `currency:${column.formatHints?.currency||'unknown'}`;
  if(column.physicalType==='percent') return 'percent';
  if(column.physicalType==='duration') return 'duration';
  return 'number';
}

function sumIsValid(column){
  if(!column || column.analyticalRole!=='metric') return false;
  if(column.physicalType==='percent') return false;
  const signals=column.identifierSignals||[];
  const strongIdentifier=signals.includes('uuid_pattern')||signals.includes('code_like_values')||(signals.includes('name_hint')&&!signals.includes('metric_name_hint'));
  if(strongIdentifier) return false;
  return true;
}

function compatibleAggregations(column){
  if(!column || column.analyticalRole!=='metric') return [];
  const aggregations=['avg','median','min','max','count'];
  if(sumIsValid(column)) aggregations.unshift('sum');
  return aggregations;
}

function validCategory(column,rowCount){
  const distinct=column?.distinctCountAtLeast||column?.distinctCount||0;
  if(column?.analyticalRole==='dimension') return distinct>=2&&distinct<=Math.max(2,rowCount);
  return ['category','boolean'].includes(column?.analyticalRole) && distinct>=2 && distinct<=Math.min(80,Math.max(2,rowCount));
}

function validDistributionDimension(column,rowCount){
  const distinct=column?.distinctCountAtLeast||column?.distinctCount||0;
  return ['category','boolean'].includes(column?.analyticalRole) && distinct>=2 && distinct<=Math.min(80,Math.max(2,rowCount));
}

function timelineHeader(name){
  const text=String(name||'').trim();
  return Boolean(UA.quarterInfo(text) || /^(?:19|20)\d{2}(?:[-/.](?:0?[1-9]|1[0-2]))?$/.test(text));
}

function buildDiagnostics(profile){
  const diagnostics=[];
  for(const column of profile.columns||[]){
    let reason='';
    if(column.nonEmptyCount===0) reason='all_null_column';
    else if(column.analyticalRole==='identifier') reason='identifier_not_chart_metric';
    else if(column.analyticalRole==='description') reason='description_not_chart_dimension';
    else if(column.numericStats?.count && column.numericStats?.min===column.numericStats?.max) reason='constant_metric';
    else if(['category','dimension'].includes(column.analyticalRole) && (column.distinctCount||0)<2) reason='single_unique_value';
    if(reason) diagnostics.push({
      id:`chart-diagnostic:${UA.stableHash(`${profile.datasetId}|${column.name}|${reason}`)}`,
      datasetId:profile.datasetId,column:column.name,valid:false,reason,warnings:column.warnings||[],
      physicalType:column.physicalType,analyticalRole:column.analyticalRole
    });
  }
  return diagnostics;
}

function createChartCandidateRegistry(dataset,profileInput,options={}){
  const profile=profileInput||UA.profileDataset(dataset,options);
  const rows=Array.isArray(dataset?.rows)?dataset.rows:[];
  const rowCount=profile.rowCount||rows.length;
  const columns=profile.columns||[];
  if(columns.length>(options.lazyColumnThreshold||160)&&!options._wideSubset){
    const allMetrics=columns.filter(column=>column.analyticalRole==='metric'&&column.numericStats?.count>=2&&column.numericStats?.min!==column.numericStats?.max);
    const allDimensions=columns.filter(column=>validCategory(column,rowCount));
    const allTimelines=columns.filter(column=>column.analyticalRole==='timeline'&&column.nonEmptyCount>=2);
    const rank=column=>(1-(column.nullRate||0))*100+Math.min(30,column.distinctCount||0);
    const selected=[...allMetrics.sort((a,b)=>rank(b)-rank(a)).slice(0,10),...allDimensions.sort((a,b)=>rank(b)-rank(a)).slice(0,8),...allTimelines.slice(0,3)];
    const selectedNames=new Set(selected.map(column=>column.name));
    const subsetProfile={...profile,columns:columns.filter(column=>selectedNames.has(column.name))};
    const eager=createChartCandidateRegistry({...dataset,rows:[]},subsetProfile,{...options,_wideSubset:true});
    const smallCategories=allDimensions.filter(column=>(column.distinctCount||0)<=8).length;
    const entityDimensions=allDimensions.filter(column=>column.analyticalRole==='dimension'||(column.distinctCount||0)>30).length;
    const categoryDimensions=Math.max(0,allDimensions.length-entityDimensions);
    const estimated=allDimensions.length+smallCategories+entityDimensions*allMetrics.length*2+categoryDimensions*allMetrics.length*6+allTimelines.length*allMetrics.length*2+allMetrics.length+allMetrics.length*Math.max(0,allMetrics.length-1)/2;
    return {...eager,lazy:true,candidateCount:Math.max(eager.candidateCount,Math.ceil(estimated)),materializedCandidateCount:eager.candidateCount,unmaterializedCount:Math.max(0,Math.ceil(estimated)-eager.candidateCount),metrics:allMetrics.map(column=>column.name),dimensions:allDimensions.map(column=>column.name),lazyProfile:profile,lazyDataset:{id:dataset?.id||'',sourceFileId:dataset?.sourceFileId||'',sourceDocumentId:dataset?.sourceDocumentId||'',sourceTableId:dataset?.sourceTableId||'',sourceAnchor:dataset?.sourceAnchor||{},extractionConfidence:dataset?.extractionConfidence||'unknown',rows:[]},warnings:[...(eager.warnings||[]),'lazy_registry_filter_to_materialize']};
  }
  const metrics=columns.filter(column=>column.analyticalRole==='metric' && column.numericStats?.count>=2 && column.numericStats?.min!==column.numericStats?.max);
  const timelines=columns.filter(column=>column.analyticalRole==='timeline' && column.nonEmptyCount>=2);
  const dimensions=columns.filter(column=>validCategory(column,rowCount));
  const candidates=[];
  const diagnostics=buildDiagnostics(profile);
  const extraction=confidenceWeight(dataset?.extractionConfidence||profile.extractionConfidence||'unknown');
  const lowConfidenceExtraction=(dataset?.extractionConfidence||profile.extractionConfidence)==='low';
  const add=(key,config)=>{
    const candidate=makeCandidate(dataset,key,config);
    if(candidate.validation.valid) candidates.push(candidate);
    else diagnostics.push({...candidate,valid:false,reason:candidate.validation.reason});
  };

  for(const dimension of dimensions.filter(column=>validDistributionDimension(column,rowCount))){
    const distinct=dimension.distinctCountAtLeast||dimension.distinctCount||0;
    const base=dimensionInformationScore(dimension,rowCount)*extraction;
    add(`distribution|${dimension.name}|bar`,{
      candidateType:'category_distribution',chartType:'bar',title:`Rows by ${dimension.name}`,
      dimensionKeys:[dimension.name],aggregation:'count',sort:'desc',top:Math.min(30,distinct),
      score:38+base,transformation:{type:'group_by',groupBy:[dimension.name],aggregation:'count'}
    });
    if(distinct<=8){
      add(`distribution|${dimension.name}|donut`,{
        candidateType:'category_distribution',chartType:'pie',title:`Share by ${dimension.name}`,
        dimensionKeys:[dimension.name],aggregation:'count',sort:'desc',top:distinct,
        score:32+base,transformation:{type:'group_by',groupBy:[dimension.name],aggregation:'count',partToWhole:true}
      });
    }
  }

  for(const dimension of dimensions){
    const distinct=dimension.distinctCountAtLeast||dimension.distinctCount||0;
    const isEntity=dimension.analyticalRole==='dimension' || distinct>30;
    for(const metric of metrics){
      const info=(metricInformationScore(metric)+dimensionInformationScore(dimension,rowCount))*extraction;
      if(isEntity){
        add(`top|${dimension.name}|${metric.name}`,{
          candidateType:'dimension_metric',chartType:'bar',title:`Top ${metric.name} by ${dimension.name}`,
          dimensionKeys:[dimension.name],metricKeys:[metric.name],aggregation:'sum',sort:'desc',top:10,
          score:34+info,transformation:{type:'top_n',dimension:dimension.name,metric:metric.name,aggregation:'sum',top:10}
        });
        const stats=metric.numericStats||{};
        if(stats.hasNegative || (stats.min!=null&&stats.max!=null&&stats.min!==stats.max)){
          add(`bottom|${dimension.name}|${metric.name}`,{
            candidateType:'dimension_metric',chartType:'bar',title:`Bottom ${metric.name} by ${dimension.name}`,
            dimensionKeys:[dimension.name],metricKeys:[metric.name],aggregation:'sum',sort:'asc',top:10,
            score:22+info,transformation:{type:'bottom_n',dimension:dimension.name,metric:metric.name,aggregation:'sum',top:10}
          });
        }
      }else{
        for(const aggregation of compatibleAggregations(metric)){
          const aggregationBonus=aggregation==='sum'?8:(aggregation==='avg'?7:(aggregation==='median'?5:1));
          add(`category-metric|${dimension.name}|${metric.name}|${aggregation}`,{
            candidateType:'category_metric',chartType:'bar',title:aggregation==='count'?`Non-empty ${metric.name} records by ${dimension.name}`:`${metric.name} by ${dimension.name} (${aggregation})`,
            dimensionKeys:[dimension.name],metricKeys:[metric.name],aggregation,sort:'desc',top:Math.min(30,distinct),
            score:24+aggregationBonus+info,transformation:{type:'group_by',groupBy:[dimension.name],metric:metric.name,aggregation}
          });
        }
      }
    }
  }

  for(const timeline of timelines){
    for(const metric of metrics){
      const score=(metricInformationScore(metric)+(1-(timeline.nullRate||0))*35)*extraction;
      for(const aggregation of (sumIsValid(metric)?['sum','avg']:['avg'])){
        add(`timeline|${timeline.name}|${metric.name}|${aggregation}`,{
          candidateType:'timeline_metric',chartType:'line',title:`${metric.name} over ${timeline.name} (${aggregation})`,
          dimensionKeys:[timeline.name],metricKeys:[metric.name],aggregation,sort:'chronological',top:null,
          score:44+score,transformation:{type:'timeline_summary',timeline:timeline.name,metric:metric.name,aggregation,preserveLabels:true}
        });
      }
    }
  }

  for(let i=0;i<metrics.length;i+=1){
    const metric=metrics[i];
    add(`histogram|${metric.name}`,{
      candidateType:'numeric_distribution',chartType:'histogram',title:`Distribution of ${metric.name}`,
      metricKeys:[metric.name],aggregation:'bucket',sort:'asc',top:null,
      score:30+metricInformationScore(metric)*extraction,
      transformation:{type:'histogram',metric:metric.name,buckets:'auto'}
    });
    for(let j=i+1;j<metrics.length;j+=1){
      const other=metrics[j];
      const paired=Math.min(metric.nonEmptyCount||0,other.nonEmptyCount||0);
      if(paired<5){
        diagnostics.push({id:`chart-diagnostic:${UA.stableHash(`${profile.datasetId}|scatter|${metric.name}|${other.name}`)}`,datasetId:profile.datasetId,valid:false,reason:'scatter_too_few_paired_points',columns:[metric.name,other.name]});
        continue;
      }
      add(`scatter|${metric.name}|${other.name}`,{
        candidateType:'metric_metric',chartType:'scatter',title:`${other.name} vs ${metric.name}`,
        dimensionKeys:[],metricKeys:[metric.name,other.name],aggregation:'none',sort:'none',top:null,
        score:28+(metricInformationScore(metric)+metricInformationScore(other))*.55*extraction,
        transformation:{type:'scatter',xMetric:metric.name,yMetric:other.name}
      });
    }
  }

  for(const timeline of timelines){
    const byUnit=new Map();
    for(const metric of metrics){
      const key=unitGroup(metric);
      if(!byUnit.has(key)) byUnit.set(key,[]);
      byUnit.get(key).push(metric);
    }
    for(const [unit,group] of byUnit){
      if(group.length<2) continue;
      const selected=group.slice(0,Math.min(4,group.length));
      add(`multi-series|${timeline.name}|${unit}|${selected.map(metric=>metric.name).join('|')}`,{
        candidateType:'multi_series_timeline',chartType:'line',title:`Metrics over ${timeline.name}`,
        dimensionKeys:[timeline.name],metricKeys:selected.map(metric=>metric.name),aggregation:'avg',sort:'chronological',top:null,
        score:48+selected.reduce((sum,metric)=>sum+metricInformationScore(metric),0)/selected.length*extraction,
        warnings:group.length>4?['series_limited_for_readability']:[],
        transformation:{type:'multi_series_timeline',timeline:timeline.name,metrics:selected.map(metric=>metric.name),aggregation:'avg',unit}
      });
    }
  }

  const wideTimelineColumns=columns.filter(column=>metrics.includes(column)&&timelineHeader(column.name));
  const labelColumn=columns.find(column=>['dimension','category'].includes(column.analyticalRole) && !timelineHeader(column.name));
  if(labelColumn && wideTimelineColumns.length>=2){
    const rowLimit=Math.min(rows.length,options.wideTimelineLimit||80);
    for(let rowIndex=0;rowIndex<rowLimit;rowIndex+=1){
      const row=rows[rowIndex]||{};
      const label=String(row[labelColumn.name]??'').trim();
      if(!label) continue;
      const validPoints=wideTimelineColumns.filter(column=>{
        const parsed=UA.parseLocaleAwareNumber(row[column.name],column.formatHints?.localePattern||{});
        return parsed.valid;
      });
      if(validPoints.length<2) continue;
      add(`wide-timeline|${rowIndex}|${labelColumn.name}|${validPoints.map(column=>column.name).join('|')}`,{
        candidateType:'wide_timeline',chartType:'line',title:`${label} over time`,
        dimensionKeys:validPoints.map(column=>column.name),metricKeys:[labelColumn.name],aggregation:'none',sort:'chronological',top:null,
        score:52+validPoints.length*2*extraction,
        transformation:{type:'wide_timeline',rowIndex,labelColumn:labelColumn.name,timelineColumns:validPoints.map(column=>column.name),rawPeriodLabels:validPoints.map(column=>column.name)}
      });
    }
  }

  const dedup=new Map();
  for(const candidate of candidates){
    const key=JSON.stringify([candidate.chartType,candidate.dimensionKeys,candidate.metricKeys,candidate.aggregation,candidate.transformation?.rowIndex??null]);
    const previous=dedup.get(key);
    if(!previous || candidate.score>previous.score) dedup.set(key,candidate);
  }
  const all=[...dedup.values()].sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
  const recommended=[];
  const familyCounts=new Map();
  const maxRecommended=options.recommendedLimit||10;
  for(const candidate of all){
    if(recommended.length>=maxRecommended) break;
    if(lowConfidenceExtraction) break;
    if(candidate.score<42) continue;
    const count=familyCounts.get(candidate.candidateType)||0;
    if(count>=3) continue;
    candidate.recommended=true;
    recommended.push(candidate);
    familyCounts.set(candidate.candidateType,count+1);
  }
  if(!recommended.length&&!lowConfidenceExtraction){
    for(const candidate of all.slice(0,Math.min(maxRecommended,all.length))){candidate.recommended=true;recommended.push(candidate);}
  }
  return {
    datasetId:dataset?.id||'',candidateCount:all.length,candidates:all,recommended,
    diagnostics,diagnosticCount:diagnostics.length,
    dimensions:dimensions.map(column=>column.name),metrics:metrics.map(column=>column.name),
    chartTypes:[...new Set(all.map(candidate=>candidate.chartType))],
    aggregations:[...new Set(all.map(candidate=>candidate.aggregation))]
  };
}

function candidateSourceForQuery(registry,query={}){
  let source=query.view==='diagnostics'?(registry?.diagnostics||[]):(registry?.candidates||[]);
  if(registry?.lazy&&query.view!=='diagnostics'){
    const search=String(query.search||'').trim().toLowerCase();
    const requestedMetric=query.metric&&query.metric!=='all'?query.metric:'';
    const requestedDimension=query.dimension&&query.dimension!=='all'?query.dimension:'';
    const needsMaterialization=(requestedMetric&&!source.some(item=>item.metricKeys?.includes(requestedMetric)))||(requestedDimension&&!source.some(item=>item.dimensionKeys?.includes(requestedDimension)))||(search&&!source.some(item=>String(item.title||'').toLowerCase().includes(search)));
    if(needsMaterialization){
      const columns=registry.lazyProfile?.columns||[];
      const matches=column=>!search||String(column.name||'').toLowerCase().includes(search);
      const metrics=columns.filter(column=>column.analyticalRole==='metric'&&(!requestedMetric||column.name===requestedMetric)&&(matches(column)||requestedMetric)).slice(0,12);
      const dimensions=columns.filter(column=>['category','dimension','boolean'].includes(column.analyticalRole)&&(!requestedDimension||column.name===requestedDimension)&&(matches(column)||requestedDimension)).slice(0,10);
      if(requestedMetric&&!metrics.length){const column=columns.find(item=>item.name===requestedMetric);if(column)metrics.push(column);}
      if(requestedDimension&&!dimensions.length){const column=columns.find(item=>item.name===requestedDimension);if(column)dimensions.push(column);}
      if(requestedMetric&&!requestedDimension) dimensions.push(...columns.filter(column=>['category','dimension','boolean'].includes(column.analyticalRole)).slice(0,10));
      if(requestedDimension&&!requestedMetric) metrics.push(...columns.filter(column=>column.analyticalRole==='metric').slice(0,12));
      const timelines=columns.filter(column=>column.analyticalRole==='timeline').slice(0,3);
      const names=new Set([...metrics,...dimensions,...timelines].map(column=>column.name));
      const dynamicProfile={...registry.lazyProfile,columns:columns.filter(column=>names.has(column.name))};
      const dynamic=createChartCandidateRegistry(registry.lazyDataset,dynamicProfile,{_wideSubset:true,recommendedLimit:10});
      const merged=new Map([...(registry.candidates||[]),...dynamic.candidates].map(candidate=>[candidate.id,candidate]));
      registry.candidates=[...merged.values()];
      registry.materializedCandidateCount=registry.candidates.length;
      source=registry.candidates;
    }
  }
  return source;
}

function filteredChartCandidates(registry,query={}){
  const source=candidateSourceForQuery(registry,query);
  const search=String(query.search||'').trim().toLowerCase();
  return source.filter(item=>{
    if(query.view==='recommended' && !item.recommended) return false;
    if(query.view==='pinned' && !item.pinned && !(query.pinnedIds||[]).includes(item.id)) return false;
    if(search && !`${item.title||''} ${(item.dimensionKeys||[]).join(' ')} ${(item.metricKeys||[]).join(' ')} ${item.reason||''}`.toLowerCase().includes(search)) return false;
    if(query.metric && query.metric!=='all' && !(item.metricKeys||[]).includes(query.metric)) return false;
    if(query.dimension && query.dimension!=='all' && !(item.dimensionKeys||[]).includes(query.dimension)) return false;
    if(query.chartType && query.chartType!=='all' && item.chartType!==query.chartType) return false;
    if(query.aggregation && query.aggregation!=='all' && item.aggregation!==query.aggregation) return false;
    if(query.confidence && query.confidence!=='all'){
      const confidence=item.transformation?.confidence||item.extractionConfidence||'unknown';
      if(confidence!==query.confidence) return false;
    }
    return true;
  });
}

function paginate(items,query={}){
  const pageSize=Math.max(1,Math.min(100,Number(query.pageSize)||DEFAULT_PAGE_SIZE));
  const total=items.length;
  const pageCount=Math.max(1,Math.ceil(total/pageSize));
  const page=Math.max(1,Math.min(pageCount,Number(query.page)||1));
  items=items.slice((page-1)*pageSize,page*pageSize);
  return {items,total,page,pageSize,pageCount,start:total?(page-1)*pageSize+1:0,end:Math.min(total,page*pageSize)};
}

function queryChartCandidates(registry,query={}){
  return paginate(filteredChartCandidates(registry,query),query);
}

function chartCandidateFamilyId(candidate){
  return `chart-family:${UA.stableHash(JSON.stringify([
    candidate?.datasetId||'',candidate?.candidateType||'',candidate?.chartType||'',
    candidate?.dimensionKeys||[],candidate?.metricKeys||[],candidate?.transformation?.rowIndex??null
  ]))}`;
}

function chartCandidateFamilyTitle(candidate){
  const dimensions=(candidate?.dimensionKeys||[]).join(', '),metrics=(candidate?.metricKeys||[]).join(', ');
  if(candidate?.candidateType==='category_metric'&&dimensions&&metrics) return `${metrics} by ${dimensions}`;
  return String(candidate?.title||'Chart candidate').replace(/\s+\((?:sum|avg|median|min|max|count)\)$/i,'');
}

function groupChartCandidateFamilies(candidates=[]){
  const families=new Map();
  for(const candidate of candidates){
    const id=chartCandidateFamilyId(candidate);
    if(!families.has(id)) families.set(id,{id,title:chartCandidateFamilyTitle(candidate),chartType:candidate.chartType,dimensionKeys:[...(candidate.dimensionKeys||[])],metricKeys:[...(candidate.metricKeys||[])],variants:[]});
    families.get(id).variants.push(candidate);
  }
  return [...families.values()].map(family=>{
    family.variants.sort((a,b)=>b.score-a.score||AGGREGATIONS.indexOf(a.aggregation)-AGGREGATIONS.indexOf(b.aggregation));
    family.defaultCandidate=family.variants[0];
    return family;
  });
}

function queryChartCandidateFamilies(registry,query={}){
  const candidates=filteredChartCandidates(registry,{...query,view:'all'});
  return {...paginate(groupChartCandidateFamilies(candidates),query),rawTotal:candidates.length};
}

function columnByName(profile,name){return (profile?.columns||[]).find(column=>column.name===name)||null;}
function numericValue(row,name,profile){
  const column=columnByName(profile,name);
  const parsed=UA.parseLocaleAwareNumber(row?.[name],column?.formatHints?.localePattern||{});
  return parsed.valid?parsed.value:null;
}

function aggregateValues(values,aggregation){
  const clean=values.filter(Number.isFinite);
  if(aggregation==='count') return values.length;
  if(!clean.length) return null;
  if(aggregation==='sum') return clean.reduce((sum,value)=>sum+value,0);
  if(aggregation==='min') return Math.min(...clean);
  if(aggregation==='max') return Math.max(...clean);
  if(aggregation==='median'){
    const sorted=[...clean].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
    return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  }
  return clean.reduce((sum,value)=>sum+value,0)/clean.length;
}

function groupSeries(dataset,candidate,profile){
  const dimension=candidate.dimensionKeys?.[0];
  const metric=candidate.metricKeys?.[0];
  const groups=new Map();
  for(const row of dataset?.rows||[]){
    const label=String(row?.[dimension]??'').trim();
    if(!label) continue;
    if(!groups.has(label)) groups.set(label,[]);
    if(candidate.aggregation==='count') groups.get(label).push(1);
    else{
      const value=numericValue(row,metric,profile);
      if(value!==null) groups.get(label).push(value);
    }
  }
  let items=[...groups].map(([label,values])=>({label,value:aggregateValues(values,candidate.aggregation),count:values.length})).filter(item=>Number.isFinite(item.value));
  if(candidate.sort==='chronological'){
    items.sort((a,b)=>{
      const da=UA.parseDateValue(a.label),db=UA.parseDateValue(b.label);
      if(da.valid&&db.valid) return da.date-db.date;
      return a.label.localeCompare(b.label,undefined,{numeric:true});
    });
  }else if(candidate.sort==='asc') items.sort((a,b)=>a.value-b.value);
  else if(candidate.sort==='desc') items.sort((a,b)=>b.value-a.value);
  if(candidate.top) items=items.slice(0,candidate.top);
  return items;
}

function histogramSeries(dataset,candidate,profile){
  const metric=candidate.metricKeys?.[0];
  const values=(dataset?.rows||[]).map(row=>numericValue(row,metric,profile)).filter(Number.isFinite);
  if(values.length<2) return [];
  const min=Math.min(...values),max=Math.max(...values);
  if(min===max) return [{label:String(min),value:values.length,min,max}];
  const bucketCount=Math.max(4,Math.min(20,Math.ceil(Math.sqrt(values.length))));
  const width=(max-min)/bucketCount;
  const buckets=Array.from({length:bucketCount},(_,index)=>({min:min+index*width,max:index===bucketCount-1?max:min+(index+1)*width,value:0}));
  for(const value of values){
    const index=Math.min(bucketCount-1,Math.floor((value-min)/width));
    buckets[index].value+=1;
  }
  return buckets.map(bucket=>({...bucket,label:`${formatBucket(bucket.min)} – ${formatBucket(bucket.max)}`}));
}

function formatBucket(value){
  if(Math.abs(value)>=1000) return Math.round(value).toLocaleString('en-US');
  return Number(value.toFixed(2)).toString();
}

function scatterSeries(dataset,candidate,profile){
  const [xMetric,yMetric]=candidate.metricKeys||[];
  const labelColumn=(profile?.columns||[]).find(column=>column.analyticalRole==='dimension')?.name||'';
  const points=[];
  for(const row of dataset?.rows||[]){
    const x=numericValue(row,xMetric,profile),y=numericValue(row,yMetric,profile);
    if(x===null||y===null) continue;
    points.push({x,y,label:labelColumn?String(row?.[labelColumn]??''):''});
  }
  return points.slice(0,5000);
}

function wideTimelineSeries(dataset,candidate,profile){
  const row=dataset?.rows?.[candidate.transformation?.rowIndex]||{};
  return (candidate.transformation?.timelineColumns||[]).map(columnName=>({
    label:columnName,value:numericValue(row,columnName,profile)
  })).filter(item=>item.value!==null).sort((a,b)=>{
    const da=UA.parseDateValue(a.label),db=UA.parseDateValue(b.label);
    return da.valid&&db.valid?da.date-db.date:a.label.localeCompare(b.label,undefined,{numeric:true});
  });
}

function multiSeries(dataset,candidate,profile){
  const timeline=candidate.dimensionKeys?.[0];
  const metricKeys=candidate.metricKeys||[];
  const labels=new Map();
  for(const row of dataset?.rows||[]){
    const label=String(row?.[timeline]??'').trim();
    if(!label) continue;
    if(!labels.has(label)) labels.set(label,new Map());
    const metricMap=labels.get(label);
    for(const metric of metricKeys){
      const value=numericValue(row,metric,profile);
      if(value===null) continue;
      if(!metricMap.has(metric)) metricMap.set(metric,[]);
      metricMap.get(metric).push(value);
    }
  }
  const labelOrder=[...labels.keys()].sort((a,b)=>{
    const da=UA.parseDateValue(a),db=UA.parseDateValue(b);
    return da.valid&&db.valid?da.date-db.date:a.localeCompare(b,undefined,{numeric:true});
  });
  return metricKeys.map(metric=>({
    name:metric,
    items:labelOrder.map(label=>({label,value:aggregateValues(labels.get(label)?.get(metric)||[],candidate.aggregation)})).filter(item=>Number.isFinite(item.value))
  }));
}

function materializeChartCandidate(candidate,dataset,profileInput){
  const profile=profileInput||UA.profileDataset(dataset);
  if(!candidate?.validation?.valid) return {candidate,items:[],warnings:[candidate?.validation?.reason||'invalid_candidate']};
  if(candidate.candidateType==='numeric_distribution') return {candidate,items:histogramSeries(dataset,candidate,profile),warnings:[]};
  if(candidate.candidateType==='metric_metric') return {candidate,points:scatterSeries(dataset,candidate,profile),warnings:[]};
  if(candidate.candidateType==='wide_timeline') return {candidate,items:wideTimelineSeries(dataset,candidate,profile),warnings:[]};
  if(candidate.candidateType==='multi_series_timeline') return {candidate,series:multiSeries(dataset,candidate,profile),warnings:[]};
  return {candidate,items:groupSeries(dataset,candidate,profile),warnings:[]};
}

function candidateToChartConfig(candidate){
  return {
    id:candidate.id,title:candidate.title,type:candidate.chartType,chartType:candidate.chartType,
    datasetId:candidate.datasetId,x:candidate.dimensionKeys?.[0]||'',y:candidate.metricKeys?.[0]||'',
    metricKeys:[...(candidate.metricKeys||[])],dimensionKeys:[...(candidate.dimensionKeys||[])],
    agg:candidate.aggregation,aggregation:candidate.aggregation,sort:candidate.sort,top:candidate.top,
    candidateType:candidate.candidateType,sourceFileId:candidate.sourceFileId||'',sourceDocumentId:candidate.sourceDocumentId||'',
    sourceTableId:candidate.sourceTableId||'',sourceAnchor:{...(candidate.sourceAnchor||{})},
    transformation:{...(candidate.transformation||{})},score:candidate.score,recommended:candidate.recommended,
    validation:{...(candidate.validation||{})}
  };
}

global.MRSChartCandidates=Object.freeze({
  AGGREGATIONS,createChartCandidateRegistry,queryChartCandidates,queryChartCandidateFamilies,groupChartCandidateFamilies,chartCandidateFamilyId,materializeChartCandidate,
  candidateToChartConfig,compatibleAggregations,sumIsValid,sourceMetadata,timelineHeader,aggregateValues
});
})(typeof window!=='undefined'?window:globalThis);
