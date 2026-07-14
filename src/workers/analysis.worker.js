'use strict';

importScripts(
  '../features/universal-analysis.js',
  '../features/chart-candidates.js',
  '../features/derived-table-candidates.js'
);

self.onmessage=(event)=>{
  const message=event.data||{};
  if(message.type!=='analyze_dataset') return;
  const jobId=message.jobId||'';
  try{
    self.postMessage({type:'progress',jobId,stage:'profiling',progress:.1});
    const profile=self.MRSUniversalAnalysis.profileDataset(message.dataset||{},message.options||{});
    self.postMessage({type:'progress',jobId,stage:'chart_candidates',progress:.55});
    const charts=self.MRSChartCandidates.createChartCandidateRegistry(message.dataset||{},profile,message.options||{});
    self.postMessage({type:'progress',jobId,stage:'derived_tables',progress:.8});
    const derivedTables=self.MRSDerivedTables.createDerivedTableRegistry(message.dataset||{},profile,message.options||{});
    self.postMessage({type:'result',jobId,profile,charts,derivedTables,progress:1});
  }catch(error){
    self.postMessage({type:'error',jobId,error:{message:String(error?.message||error),code:error?.code||'ANALYSIS_FAILED'}});
  }
};
