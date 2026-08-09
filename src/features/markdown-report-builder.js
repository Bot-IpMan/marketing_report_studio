(function initProviderMarkdown(global){
  'use strict';
  const GENERATOR_VERSION='provider-audit-md-v1';
  function esc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function sanitizeMarkdownForDisplay(value){return esc(value);}
  function cell(value){return String(value??'').replace(/[|\r\n]/g,' ').trim()||'—';}
  function formatValue(value,unit){
    if(typeof value==='number'&&Number.isFinite(value)){
      if(unit==='score_100') return value.toFixed(1).replace(/\.0$/,'')+'/100';
      return new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(value)+(unit?` ${unit}`:'');
    }
    return cell(value);
  }
  function findingsTable(rows){
    const executiveRows=rows.filter(row=>row.metric!=='page_observation');
    if(!executiveRows.length) return '_Ключових findings поза інвентарем сторінок немає._';
    const header='| Провайдер | Категорія | Метрика | Значення | Серйозність | Впевненість |\n| --- | --- | --- | ---: | --- | ---: |';
    return [header,...executiveRows.slice(0,30).map(row=>`| ${cell(row.provider)} | ${cell(row.category)} | ${cell(row.metric)} | ${formatValue(row.value_number??row.value_text,row.unit)} | ${cell(row.severity)} | ${row.confidence===null?'—':cell(row.confidence)} |`)].join('\n');
  }
  function summaryTable(rows){
    if(!rows.length) return '_Валідних provider artifacts не знайдено._';
    const header='| Провайдер | Статус | Покриття | Findings | Warnings | Спостережено |\n| --- | --- | --- | ---: | ---: | --- |';
    return [header,...rows.map(row=>`| ${cell(row.provider)} | ${cell(row.status)} | ${cell(row.coverage)} | ${cell(row.findings_total)} | ${cell(row.warnings_total)} | ${cell(row.observed_at)} |`)].join('\n');
  }
  function limitationList(rows){
    if(!rows.length) return '_Явних попереджень від провайдерів немає. Це не є твердженням про повне покриття._';
    return rows.map(row=>`- **${cell(row.provider)}** — ${cell(row.warning_class)||'warning'}: ${cell(row.reason)||'без деталізації'}${row.coverage?` (покриття: ${cell(row.coverage)})`:''}.`).join('\n');
  }
  function metricSummary(rows){
    if(!rows.length) return '_Спеціалізованих числових метрик немає._';
    const usable=rows.filter(row=>typeof row.value==='number'&&Number.isFinite(row.value)).slice(0,80);
    if(!usable.length) return '_Числових значень, придатних для відображення, немає._';
    return ['| Джерело | Форм-фактор | Метрика | Значення |','| --- | --- | --- | ---: |',...usable.map(row=>`| ${cell(row.source)} | ${cell(row.form_factor)} | ${cell(row.metric)} | ${formatValue(row.value,row.unit)} |`)].join('\n');
  }
  function crawlSummary(rows){
    if(!rows.length) return '';
    const header='| Провайдер | Сторінки | HTTP статуси | Внутрішні посилання | Зовнішні посилання | Документи |\n| --- | ---: | --- | ---: | ---: | ---: |';
    return ['## Огляд Crawl4AI','',header,...rows.map(row=>`| ${cell(row.provider)} | ${formatValue(row.pages_total)} | ${cell(row.status_counts_json)} | ${formatValue(row.internal_links_total)} | ${formatValue(row.external_links_total)} | ${formatValue(row.documents_total)} |`),''].join('\n');
  }
  function crawlDetailSections(providers){
    const pages=Array.isArray(providers.crawl_pages)?providers.crawl_pages:[];
    if(!pages.length) return '';
    const quality=Array.isArray(providers.crawl_quality_summary)?providers.crawl_quality_summary[0]:null;
    const distribution=Array.isArray(providers.crawl_content_length_distribution)?providers.crawl_content_length_distribution:[];
    const top=[...pages].filter(row=>typeof row.internal_links==='number').sort((a,b)=>b.internal_links-a.internal_links).slice(0,10);
    const sections=[];
    if(quality){sections.push('## Якість інвентарю сторінок','', '| Сторінки | Без meta description | Без H1 | Redirect | Console errors | Fallback fetch |','| ---: | ---: | ---: | ---: | ---: | ---: |',`| ${formatValue(quality.pages_total)} | ${formatValue(quality.missing_description_pages)} | ${formatValue(quality.missing_h1_pages)} | ${formatValue(quality.redirected_pages)} | ${formatValue(quality.console_error_pages)} | ${formatValue(quality.fallback_fetch_pages)} |`,'');}
    if(distribution.length){sections.push('## Розподіл обсягу контенту','', '| Діапазон Markdown | Сторінки |','| --- | ---: |',...distribution.map(row=>`| ${cell(row.content_length_bucket)} | ${formatValue(row.pages)} |`),'');}
    if(top.length){sections.push('## Топ сторінок за внутрішніми посиланнями','', '| URL | Внутрішні | Зовнішні | Markdown символів |','| --- | ---: | ---: | ---: |',...top.map(row=>`| ${cell(row.url)} | ${formatValue(row.internal_links)} | ${formatValue(row.external_links)} | ${formatValue(row.markdown_characters)} |`),'');}
    return sections.join('\n');
  }
  function buildMarkdown(bundle,options={}){
    const data=bundle&&typeof bundle==='object'?bundle:{};
    const datasets=data.datasets&&typeof data.datasets==='object'?data.datasets:{};
    const providers=data.providerDatasets&&typeof data.providerDatasets==='object'?data.providerDatasets:{};
    const generatedAt=String(options.generatedAt||new Date().toISOString());
    const title=options.title||`Зведений аудит: ${data.target||'невідома ціль'}`;
    return [
      `# ${title}`,
      '',
      `- **Ціль:** ${cell(data.target)}`,
      `- **Job ID:** ${cell(data.jobId)}`,
      `- **Згенеровано:** ${cell(generatedAt)}`,
      `- **Режим:** детермінований локальний генератор (${GENERATOR_VERSION})`,
      '',
      '## Статус провайдерів',
      '',summaryTable(Array.isArray(datasets.audit_provider_summary)?datasets.audit_provider_summary:[]),
      '',
      '## Ключові нормалізовані findings',
      '',findingsTable(Array.isArray(datasets.audit_findings)?datasets.audit_findings:[]),
      '',
      crawlSummary(Array.isArray(providers.crawl_summary)?providers.crawl_summary:[]),
      crawlDetailSections(providers),
      '## Семантичні метрики',
      '',metricSummary(Array.isArray(providers.web_vitals)?providers.web_vitals:[]),
      '',
      '## Обмеження та покриття',
      '',limitationList(Array.isArray(datasets.audit_warnings)?datasets.audit_warnings:[]),
      '',
      '> Примітка: статуси `partial`, `no_data`, `disabled`, timeout або failed описують межі наявних даних. Вони не доводять відсутність проблем, контрактів, платежів чи інших фактів.',
      ''
    ].join('\n');
  }
  function createGeneratedReport(bundle,options={}){
    const generatedAt=String(options.generatedAt||new Date().toISOString());
    const bundleId=String(bundle?.bundleId||'unknown');
    return {id:`generated:provider-audit:${bundleId}`,title:options.title||'Executive report.md',format:'markdown',content:buildMarkdown(bundle,{...options,generatedAt}),jobId:String(bundle?.jobId||''),target:String(bundle?.target||''),generatedAt,generatorVersion:GENERATOR_VERSION,generationMode:'deterministic',sourceKind:'provider-result-adapter',sourceArtifactIds:Array.isArray(bundle?.artifactIds)?bundle.artifactIds.slice():[],warnings:Array.isArray(bundle?.datasets?.audit_warnings)?bundle.datasets.audit_warnings.map(row=>({provider:row.provider,reason:row.reason,coverage:row.coverage})):[]};
  }
  function renderMarkdown(markdown){
    const lines=String(markdown??'').split('\n');let html='',inList=false,inTable=false;
    const close=()=>{if(inList){html+='</ul>';inList=false;}if(inTable){html+='</tbody></table>';inTable=false;}};
    for(let index=0;index<lines.length;index++){
      const line=lines[index];
      if(/^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line)) continue;
      if(/^\|/.test(line)&&/\|$/.test(line)){
        const values=line.slice(1,-1).split('|').map(value=>esc(value.trim()));
        if(!inTable){close();html+=`<table><thead><tr>${values.map(value=>`<th>${value}</th>`).join('')}</tr></thead><tbody>`;inTable=true;}else html+=`<tr>${values.map(value=>`<td>${value}</td>`).join('')}</tr>`;
        continue;
      }
      if(inTable){html+='</tbody></table>';inTable=false;}
      const heading=line.match(/^(#{1,3})\s+(.+)$/);if(heading){close();const level=heading[1].length;html+=`<h${level}>${esc(heading[2])}</h${level}>`;continue;}
      if(/^[-*]\s+/.test(line)){if(!inList){html+='<ul>';inList=true;}html+=`<li>${esc(line.replace(/^[-*]\s+/,''))}</li>`;continue;}
      if(inList){html+='</ul>';inList=false;}
      if(!line.trim()){html+='<br>';continue;}
      html+=`<p>${esc(line).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')}</p>`;
    }
    close();return html;
  }
  global.MRSProviderMarkdown=Object.freeze({GENERATOR_VERSION,buildMarkdown,createGeneratedReport,renderMarkdown,sanitizeMarkdownForDisplay});
})(typeof window!=='undefined'?window:globalThis);
