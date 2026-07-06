(function(global){
'use strict';

const CLIENT_EXPORT_STEP_STATUSES=['not_started','ready','blocked','completed','completed_with_warnings'];

function getClientExportStepStatus(reportData, flow={}, checklist={}){
  const report=reportData || {};
  const meta=report.meta || {};
  const blockers=Array.isArray(checklist.blockers) ? checklist.blockers : [];
  const warnings=Array.isArray(checklist.warnings) ? checklist.warnings : [];
  const exported=Boolean(meta.clientExportedAt || meta.clientPackageExportedAt);
  const manual=Array.isArray(flow.completedStepIds) && flow.completedStepIds.includes('exportClientReport');
  if(blockers.length) return 'blocked';
  if(exported && (Number(meta.clientExportWarningCount || 0)>0 || warnings.length>0)) return 'completed_with_warnings';
  if(exported || manual) return 'completed';
  return checklist.status==='ready' || checklist.status==='needs_review' ? 'ready' : 'not_started';
}

global.MRSExport=Object.freeze({
  CLIENT_EXPORT_STEP_STATUSES,
  getClientExportStepStatus
});
})(typeof window!=='undefined' ? window : globalThis);
