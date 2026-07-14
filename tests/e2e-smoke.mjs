import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appFileName = 'marketing_report_studio_v8_access_folders_fixed.html';
const pdfFixtureBase64=Object.fromEntries(['clean-native-table.pdf','native-text-no-table.pdf','corrupted-text.pdf','scanned-image-only.pdf'].map(name=>[name,readFileSync(resolve(projectRoot,'tests/fixtures/pdf',name)).toString('base64')]));
let appUrl = pathToFileURL(resolve(projectRoot, appFileName)).href;
const browserPath = findBrowser();

if (!browserPath) {
  const message='Browser E2E smoke SKIPPED: no usable Chrome/Edge headless browser found. Set E2E_BROWSER to a working Chromium-compatible executable.';
  if(process.env.E2E_STRICT==='1'){
    console.error(`${message} Strict mode requires a browser, so this run is FAIL.`);
    process.exit(1);
  }
  console.log(message);
  process.exit(0);
}

const consoleErrors = [];
const dialogs = [];
const browserStderr = [];
let page = null;
let rootCdp = null;
let browser = null;
let appServer = null;
let userDataDir = null;

async function runDumpDomE2E() {
  const appPort = await getFreePort();
  appServer = await startStaticServer(appPort);
  appUrl = `http://127.0.0.1:${appPort}/__e2e_harness.html`;
  userDataDir = mkdtempSync(resolve(tmpdir(), 'mrs-e2e-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-gpu-compositing',
    '--disable-gpu-sandbox',
    '--disable-3d-apis',
    '--disable-accelerated-2d-canvas',
    '--disable-dev-shm-usage',
    '--use-gl=swiftshader',
    '--use-angle=swiftshader',
    '--disable-features=Translate,OptimizationHints,MediaRouter,InterestFeedContentSuggestions,Vulkan,DefaultANGLEVulkan',
    '--disable-background-networking',
    '--disable-extensions',
    '--disable-sync',
    '--no-first-run',
    '--no-default-browser-check',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=90000',
    `--user-data-dir=${userDataDir}`,
    '--dump-dom',
    appUrl,
  ];
  if (process.getuid?.() === 0 || process.env.CI) args.splice(1, 0, '--no-sandbox');
  const result = spawnSync(browserPath, args, { encoding: 'utf8', timeout: 150000 });
  if (result.stderr) {
    for (const line of result.stderr.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
      browserStderr.push(line);
    }
  }
  const match = String(result.stdout || '').match(/<pre id="result">([\s\S]*?)<\/pre>/i);
  if (!match) {
    if (result.error?.code === 'ETIMEDOUT') throw new Error('Chromium automation timed out before emitting a harness result.');
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Browser exited with status ${result.status}: ${result.stderr || result.stdout}`);
  }
  assert.ok(match, `E2E harness did not emit a result. Output: ${String(result.stdout || '').slice(-2000)}`);
  const data = JSON.parse(decodeHtmlEntities(match[1]));
  assert.equal(data.ok, true, data.error || JSON.stringify(data, null, 2));
  assert.equal(data.rows, true, `CSV row count was not detected: ${JSON.stringify(data)}`);
  assert.equal(data.columns, true, `CSV column count was not detected: ${JSON.stringify(data)}`);
  assert.ok(data.chartCount >= 3, `Auto charts were not generated: ${JSON.stringify(data)}`);
  assert.equal(data.chartCatalogWorks, true, `All charts did not preserve the visual workspace and expose the catalog: ${JSON.stringify(data)}`);
  assert.equal(data.chartPreviewWorks, true, `Chart catalog preview did not render an actual chart: ${JSON.stringify(data)}`);
  assert.equal(data.pinnedChartWorks, true, `Pinned view did not render an actual chart: ${JSON.stringify(data)}`);
  assert.equal(data.tableExists, true, `Table preview was not rendered: ${JSON.stringify(data)}`);
  assert.equal(data.searchWorks, true, `Table search failed: ${JSON.stringify(data)}`);
  assert.equal(data.filterWorks, true, `Table filter failed: ${JSON.stringify(data)}`);
  assert.equal(data.sortWorks, true, `Table sort failed: ${JSON.stringify(data)}`);
  assert.equal(data.treeShowMore, true, `Right tree show-more failed: ${JSON.stringify(data)}`);
  assert.equal(data.exportLocked, true, `Client export was not locked: ${JSON.stringify(data)}`);
  assert.equal(data.exportHasDashboard, true, `Client export missed dashboard content: ${JSON.stringify(data)}`);
  assert.equal(data.exportHasEditorControls, false, `Client export leaked editor controls: ${JSON.stringify(data)}`);
  assert.equal(data.cleanPdfWorks, true, `Clean native-text PDF browser pipeline failed: ${JSON.stringify(data)}`);
  assert.equal(data.noTablePdfWorks, true, `Native-text/no-table PDF state failed: ${JSON.stringify(data)}`);
  assert.equal(data.scannedPdfWorks, true, `Scanned PDF honesty state failed: ${JSON.stringify(data)}`);
  assert.equal(data.corruptedPdfWorks, true, `Corrupted PDF honesty state failed: ${JSON.stringify(data)}`);
  console.log('Browser E2E smoke passed.');
}

async function runE2E() {
  await step('launch browser', async () => {
    const appPort = await getFreePort();
    appServer = await startStaticServer(appPort);
    appUrl = `http://127.0.0.1:${appPort}/${appFileName}`;
    const port = await getFreePort();
    userDataDir = mkdtempSync(resolve(tmpdir(), 'mrs-e2e-'));
    const downloadsDir = resolve(userDataDir, 'downloads');
    mkdirSync(downloadsDir, { recursive: true });
    const browserArgs = [
      `--remote-debugging-port=${port}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${userDataDir}`,
      '--headless=chrome',
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--disable-gpu-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=swiftshader',
      '--use-angle=swiftshader',
      '--disable-features=Translate,OptimizationHints,MediaRouter,InterestFeedContentSuggestions,Vulkan,DefaultANGLEVulkan',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
      '--allow-file-access-from-files',
      'about:blank',
    ];
    if (process.getuid?.() === 0 || process.env.CI) browserArgs.splice(4, 0, '--no-sandbox');
    browser = spawn(browserPath, browserArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    browser.stderr.on('data', (chunk) => {
      const text = String(chunk || '').trim();
      if (text && !/DevTools listening/i.test(text)) {
        browserStderr.push(text);
        if (process.env.E2E_BROWSER_DEBUG) console.error(`[browser] ${text}`);
      }
    });
    browser.once('exit', (code, signal) => {
      if (code !== null && code !== 0 && !page) {
        browserStderr.push(`exited before E2E connected: code=${code} signal=${signal || ''}`);
      }
    });
    const wsUrl = await waitForBrowserWebSocket(port);
    rootCdp = await CDP.connect(wsUrl);
    await rootCdp.send('Browser.getVersion');
    const targets = await requestJson(port, '/json/list').catch(() => []);
    let pageWsUrl = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl)?.webSocketDebuggerUrl;
    if (!pageWsUrl) {
      const { targetId } = await rootCdp.send('Target.createTarget', { url: 'about:blank' });
      await rootCdp.send('Target.activateTarget', { targetId }).catch(() => {});
      pageWsUrl = await waitForPageWebSocket(port, targetId);
    }
    page = await CDP.connect(pageWsUrl);
    await delay(500);
    page.on('Runtime.consoleAPICalled', (event) => {
      if (event.type === 'error') {
        consoleErrors.push(`console.error: ${formatConsoleArgs(event.args)}`);
      }
    });
    page.on('Runtime.exceptionThrown', (event) => {
      consoleErrors.push(`exception: ${formatException(event.exceptionDetails||{})}`);
    });
    page.on('Page.javascriptDialogOpening', async (event) => {
      dialogs.push(event.message || '');
      await page.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await page.send('Runtime.enable');
    await page.send('Page.enable');
    await page.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadsDir }).catch(() => {});
  });

  await step('load app', async () => {
    await navigate(appUrl);
    await waitForPage('app shell rendered', `
      document.readyState === 'complete' &&
      document.querySelector('.workspaceTopbar') &&
      document.querySelector('[data-simple-file-tree]')
    `);
    await delay(250);
  });

  await step('primary upload action visible', async () => {
    const uploadState = await evaluate(`(() => {
      const primary = visibleState('#pasteBtn');
      const sideUpload = visibleState('#uploadFilesBtn');
      const topbar=document.querySelector('.workspaceTopbar');
      const topbarRect=topbar?.getBoundingClientRect();
      const htmlRight=Math.max(...[...document.querySelectorAll('body *')].filter(element=>element instanceof HTMLElement).map(element=>element.getBoundingClientRect().right),window.innerWidth);
      const docOverflow=htmlRight-window.innerWidth;
      return {
        primary,
        sideUpload,
        viewport: window.innerWidth,
        docOverflow,
        topbarWidth: topbarRect ? Math.round(topbarRect.width) : 0,
        topbarOverflow: topbar ? Math.round(topbar.scrollWidth - topbar.clientWidth) : 0,
        primaryText: document.querySelector('#pasteBtn')?.textContent.trim() || '',
        sideText: document.querySelector('#uploadFilesBtn')?.textContent.trim() || ''
      };
      function visibleState(selector){
        const el=document.querySelector(selector);
        if(!el) return {exists:false, visible:false};
        const rect=el.getBoundingClientRect();
        const style=getComputedStyle(el);
        return {
          exists:true,
          visible:rect.width>0 && rect.height>0 && style.display!=='none' && style.visibility!=='hidden',
          width:Math.round(rect.width),
          height:Math.round(rect.height)
        };
      }
    })()`);
    assert.ok(uploadState.primary.visible, `Topbar upload CTA is not visible: ${JSON.stringify(uploadState)}`);
    assert.ok(uploadState.sideUpload.visible, `Materials upload button is not visible: ${JSON.stringify(uploadState)}`);
    assert.ok(uploadState.docOverflow <= 4, `Desktop page has horizontal overflow: ${JSON.stringify(uploadState)}`);
    assert.ok(uploadState.topbarWidth <= uploadState.viewport + 1, `Desktop topbar overflows viewport: ${JSON.stringify(uploadState)}`);
    assert.ok(uploadState.topbarOverflow <= 4, `Desktop topbar content overflows: ${JSON.stringify(uploadState)}`);
    assert.match(
      `${uploadState.primaryText} ${uploadState.sideText}`,
      /Upload Materials|Завантажити матеріали|Upload File|Завантажити файли/i,
      `Unexpected upload labels: ${JSON.stringify(uploadState)}`,
    );
  });

  await step('upload CTA opens import modal', async () => {
    await click('#pasteBtn');
    await waitForPage('upload import modal', `
      document.querySelector('#modalBackdrop.open') &&
      document.querySelector('#dataPasteChoice') &&
      document.querySelector('#dataUploadChoice') &&
      document.querySelector('#dataFolderChoice')
    `);
    const modalState = await evaluate(`(() => ({
      title: document.querySelector('#modalTitle')?.textContent.trim() || '',
      body: document.querySelector('#modalBody')?.textContent.trim().replace(/\\s+/g, ' ').slice(0, 240) || ''
    }))()`);
    assert.match(
      `${modalState.title} ${modalState.body}`,
      /Додати дані|Add|Вставити таблицю|Завантажити файли|Upload files|Підключити папку/i,
      `Upload CTA opened an unexpected modal: ${JSON.stringify(modalState)}`,
    );
    await click('#modalClose');
    await waitForPage('upload import modal closed', `!document.querySelector('#modalBackdrop.open')`);
  });

  await step('switch English and Ukrainian', async () => {
    await click('#langBtn');
    await waitForPage('English UI labels', `
      /Upload Materials/i.test(document.querySelector('#pasteBtn')?.textContent || '') &&
      /Client Export/i.test(document.querySelector('#saveClientHtmlBtn')?.textContent || '')
    `);
    const englishText = await evaluate(`document.body.textContent || ''`);
    assert.doesNotMatch(englishText, /Всі сайти|Порівняння/, 'English UI should not show known hardcoded Ukrainian analytics labels.');
    await click('#langBtn');
    await waitForPage('Ukrainian UI labels', `
      /Завантажити матеріали/i.test(document.querySelector('#pasteBtn')?.textContent || '') &&
      /Експорт клієнту/i.test(document.querySelector('#saveClientHtmlBtn')?.textContent || '')
    `);
  });

  await step('open demo report', async () => {
    await click('[data-side-panel="report"]');
    await waitForPage('demo action available', `document.querySelector('[data-open-demo]')`);
    await click('[data-open-demo]');
    await waitForPage('demo report loaded notice', `
      /Demo report loaded|демонстрацій/i.test(document.querySelector('#appNoticeText')?.textContent || '') ||
      /Demo report loaded/i.test(document.querySelector('#readerContent')?.textContent || '')
    `);
  });

  await step('client export warning state', async () => {
    await click('#saveClientHtmlBtn');
    await waitForPage('client export warning state', `
      /warning|попередження/i.test(document.querySelector('#appNoticeText')?.textContent || '') ||
      /Completed with warnings|Завершено з попередженнями/i.test(document.body.textContent || '')
    `, 12000);
  });

  await step('mobile viewport materials smoke', async () => {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await evaluate(`window.dispatchEvent(new Event('resize'))`);
    await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(resolve,80))))`);
    await click('[data-side-panel="materials"]');
    const mobileState = await evaluate(`(() => {
      const topbar=document.querySelector('.workspaceTopbar');
      const topbarRect=topbar?.getBoundingClientRect();
      const docOverflow=Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)-window.innerWidth;
      const tab=document.querySelector('[data-side-panel="materials"]');
      const folderList=document.querySelector('#folderList');
      const dropZone=document.querySelector('#materialsDropZone');
      return {
        viewport: window.innerWidth,
        docOverflow,
        topbarWidth: topbarRect ? topbarRect.width : 0,
        materialsTabSelected: tab?.getAttribute('aria-selected') || '',
        folderListExists: Boolean(folderList),
        dropZoneExists: Boolean(dropZone),
        dropZoneText: dropZone?.textContent.trim().replace(/\\s+/g, ' ').slice(0, 160) || ''
      };
    })()`);
    assert.ok(mobileState.docOverflow <= 4, `Mobile page has horizontal overflow: ${JSON.stringify(mobileState)}`);
    assert.ok(mobileState.topbarWidth <= mobileState.viewport + 1, `Mobile topbar overflows viewport: ${JSON.stringify(mobileState)}`);
    assert.equal(mobileState.materialsTabSelected, 'true', `Materials tab is not selected: ${JSON.stringify(mobileState)}`);
    assert.ok(mobileState.folderListExists && mobileState.dropZoneExists, `Materials panel is not usable on mobile: ${JSON.stringify(mobileState)}`);
  });
}

async function runSimpleE2E() {
  await step('launch browser', async () => {
    const appPort = await getFreePort();
    appServer = await startStaticServer(appPort);
    appUrl = `http://127.0.0.1:${appPort}/${appFileName}`;
    const port = await getFreePort();
    userDataDir = mkdtempSync(resolve(tmpdir(), 'mrs-e2e-'));
    const downloadsDir = resolve(userDataDir, 'downloads');
    mkdirSync(downloadsDir, { recursive: true });
    const browserArgs = [
      `--remote-debugging-port=${port}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${userDataDir}`,
      '--headless=chrome',
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--disable-gpu-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=swiftshader',
      '--use-angle=swiftshader',
      '--disable-features=Translate,OptimizationHints,MediaRouter,InterestFeedContentSuggestions,Vulkan,DefaultANGLEVulkan',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
      '--allow-file-access-from-files',
      'about:blank',
    ];
    if (process.getuid?.() === 0 || process.env.CI) browserArgs.splice(4, 0, '--no-sandbox');
    browser = spawn(browserPath, browserArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    browser.stderr.on('data', (chunk) => {
      const text = String(chunk || '').trim();
      if (text && !/DevTools listening/i.test(text)) {
        browserStderr.push(text);
        if (process.env.E2E_BROWSER_DEBUG) console.error(`[browser] ${text}`);
      }
    });
    browser.once('exit', (code, signal) => {
      if (code !== null && code !== 0 && !page) {
        browserStderr.push(`exited before E2E connected: code=${code} signal=${signal || ''}`);
      }
    });
    const wsUrl = await waitForBrowserWebSocket(port);
    rootCdp = await CDP.connect(wsUrl);
    await rootCdp.send('Browser.getVersion');
    const targets = await requestJson(port, '/json/list').catch(() => []);
    let pageWsUrl = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl)?.webSocketDebuggerUrl;
    if (!pageWsUrl) {
      const { targetId } = await rootCdp.send('Target.createTarget', { url: 'about:blank' });
      await rootCdp.send('Target.activateTarget', { targetId }).catch(() => {});
      pageWsUrl = await waitForPageWebSocket(port, targetId);
    }
    page = await CDP.connect(pageWsUrl);
    await delay(500);
    page.on('Runtime.consoleAPICalled', (event) => {
      if (event.type === 'error') consoleErrors.push(`console.error: ${formatConsoleArgs(event.args)}`);
    });
    page.on('Runtime.exceptionThrown', (event) => {
      consoleErrors.push(`exception: ${event.exceptionDetails?.text || 'Unhandled exception'}`);
    });
    page.on('Page.javascriptDialogOpening', async (event) => {
      dialogs.push(event.message || '');
      await page.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await page.send('Runtime.enable');
    await page.send('Page.enable');
    await page.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadsDir }).catch(() => {});
  });

  await step('load simple workspace', async () => {
    await navigate(appUrl);
    await waitForPage('3-zone simple UI', `
      document.readyState === 'complete' &&
      document.querySelector('.workspaceTopbar') &&
      document.querySelector('[data-simple-file-tree]') &&
      document.querySelector('.analytics') &&
      document.querySelector('.reader')
    `);
    const state = await evaluate(`(() => {
      const visible = (selector) => {
        const el=document.querySelector(selector);
        if(!el) return false;
        const rect=el.getBoundingClientRect();
        const style=getComputedStyle(el);
        return rect.width>0 && rect.height>0 && style.display!=='none' && style.visibility!=='hidden';
      };
      const visibleButtons=[...document.querySelectorAll('.workspaceTopbar button')]
        .filter((el)=>(el.id&&visible('#'+el.id)) || (el.offsetWidth>0 && getComputedStyle(el).display!=='none'))
        .map((el)=>el.textContent.trim());
      return {
        addData: visible('#pasteBtn'),
        exportReport: visible('#saveClientHtmlBtn'),
        save: visible('#saveDiskBtn'),
        compactMenu: visible('#workspaceMoreBtn'),
        tree: Boolean(document.querySelector('[data-simple-file-tree]')),
        analytics: visible('.analytics'),
        reader: visible('.reader'),
        searchPlaceholder: document.querySelector('#search')?.getAttribute('placeholder') || '',
        advancedOpen: Boolean(document.querySelector('.advancedLabs[open]')),
        visibleButtons,
        docOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)-window.innerWidth
      };
    })()`);
    assert.ok(state.addData && ((state.exportReport&&state.save)||state.compactMenu), `Default controls are not visible: ${JSON.stringify(state)}`);
    assert.ok(state.tree && state.analytics && state.reader, `Three-zone UI is not ready: ${JSON.stringify(state)}`);
    assert.match(state.searchPlaceholder, /project files|файлів/i);
    assert.equal(state.advancedOpen, false, `Advanced / Labs should be collapsed by default: ${JSON.stringify(state)}`);
    assert.ok(state.docOverflow <= 4, `Desktop page has horizontal overflow: ${JSON.stringify(state)}`);
    assert.doesNotMatch(state.visibleButtons.join(' '), /Save admin|Client package|CI JSON|Audit/);
    await evaluate(`window.addEventListener('unhandledrejection',event=>console.error('[e2e unhandled rejection]',event.reason?.stack||event.reason?.message||String(event.reason)))`);
  });

  await step('upload CTA opens import modal', async () => {
    await click('#pasteBtn');
    await waitForPage('upload import modal', `
      document.querySelector('#modalBackdrop.open') &&
      document.querySelector('#dataPasteChoice') &&
      document.querySelector('#dataUploadChoice') &&
      document.querySelector('#dataFolderChoice')
    `);
    await click('#modalClose');
    await waitForPage('upload import modal closed', `!document.querySelector('#modalBackdrop.open')`);
  });

  await step('import 200x31 sample CSV through drop zone', async () => {
    const imported = await evaluate(`(async () => {
      const headers=[
        'company','segment','priority','seo_threat_level','seo_total_estimated_traffic','seo_threat_score',
        'seo_organic_count','seo_paid_count','seo_featured_snippet_count','seo_local_pack_count','seo_organic_etv','seo_paid_etv',
        'domain','website','country','city_region','verification_status','next_action','outreach_angle','why_relevant',
        'estimated_revenue','employee_count','energy_focus','grid_role','renewable_share','investment_stage','policy_alignment',
        'risk_score','opportunity_score','notes','row_number'
      ];
      const quote = (value) => {
        const text=String(value ?? '');
        return /[",\\n]/.test(text) ? '"' + text.replace(/"/g,'""') + '"' : text;
      };
      const rows=[];
      for(let i=1;i<=200;i+=1){
        rows.push([
          'Company '+String(i).padStart(3,'0'), ['Generation','Storage','Grid','Services'][i%4], ['High','Medium','Low'][i%3],
          i%3===0?'High':(i%3===1?'Medium':'Low'), 1000+i*137, 20+i, 10+i, i%7, i%5, i%4, 500+i*9, 50+i*3,
          'company'+i+'.ua', 'https://company'+i+'.ua', 'Ukraine', ['Kyiv','Lviv','Dnipro','Odesa'][i%4],
          i%5===0?'Needs review':'Verified', 'Review partnership fit', 'Energy transition pitch '+i,
          'Relevant to Ukraine energy prospects', 1000000+i*2500, 25+i, ['solar','wind','storage','grid'][i%4],
          ['producer','operator','supplier'][i%3], (i%100)/100, ['seed','growth','mature'][i%3],
          ['strong','medium','weak'][i%3], i%100, 100-(i%100), 'Sample row '+i, i
        ]);
      }
      const csv=[headers.join(','),...rows.map(row=>row.map(quote).join(','))].join('\\n');
      const file=new File([csv], 'ukraine_energy_prospects_200_seo.csv', {type:'text/csv'});
      const dt=new DataTransfer();
      dt.items.add(file);
      const zone=document.querySelector('.simpleEmptyDrop') || document.querySelector('#materialsDropZone');
      zone.dispatchEvent(new DragEvent('dragenter', {bubbles:true,cancelable:true,dataTransfer:dt}));
      zone.dispatchEvent(new DragEvent('drop', {bubbles:true,cancelable:true,dataTransfer:dt}));
      return {rows:rows.length, columns:headers.length, bytes:csv.length};
    })()`);
    assert.deepEqual({ rows: imported.rows, columns: imported.columns }, { rows: 200, columns: 31 });
    await waitForPage('CSV import success modal', `document.querySelector('#importReport')`, 15000);
    await click('#importReport');
    await waitForPage('sample dashboard', `document.querySelector('[data-simple-dashboard]') && document.querySelector('[data-simple-file-tree]')`, 12000);
    const hasTable=await evaluate(`Boolean(document.querySelector('[data-simple-table]'))`);
    if(!hasTable) await evaluate(`document.querySelector('.simpleTreeItem[data-type="dataset"]')?.click()`);
    await waitForPage('sample table preview', `document.querySelector('[data-simple-table]')`,8000);
  });

  await step('dashboard cards charts table and controls work', async () => {
    const dashboard = await evaluate(`(() => {
      const text=document.body.textContent || '';
      return {
        rows: /200\\s+rows/i.test(text),
        columns: /31\\s+columns/i.test(text),
        cardText: [...document.querySelectorAll('.simpleStat')].map(el=>el.textContent.trim().replace(/\\s+/g,' ')),
        chartCount: document.querySelectorAll('.autoChartCard').length,
        tableExists: Boolean(document.querySelector('.simplePreviewTable')),
        treeText: document.querySelector('[data-simple-file-tree]')?.textContent || '',
        requiredColumns: ['company','segment','priority','seo_threat_level','seo_total_estimated_traffic','seo_threat_score'].every(name => text.includes(name))
      };
    })()`);
    assert.ok(dashboard.rows && dashboard.columns, `Dashboard did not show 200 rows / 31 columns: ${JSON.stringify(dashboard)}`);
    assert.ok(dashboard.cardText.some((item) => item.startsWith('Rows200')), `Rows summary card missing: ${JSON.stringify(dashboard)}`);
    assert.ok(dashboard.cardText.some((item) => item.startsWith('Columns31')), `Columns summary card missing: ${JSON.stringify(dashboard)}`);
    assert.ok(dashboard.chartCount >= 3, `Auto charts were not generated: ${JSON.stringify(dashboard)}`);
    assert.ok(dashboard.tableExists, `Table preview missing: ${JSON.stringify(dashboard)}`);
    assert.ok(dashboard.requiredColumns, `Required SEO columns missing from UI: ${JSON.stringify(dashboard)}`);
    assert.match(dashboard.treeText, /ukraine_energy_prospects_200_seo\\.csv|Tables|Auto charts/i);

    await evaluate(`(() => {
      const input=document.querySelector('#simpleTableSearch');
      input.value='Company 150';
      input.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:'Company 150'}));
    })()`);
    await waitForPage('table search filtered row', `/Company 150/i.test(document.querySelector('#readerContent')?.textContent || '')`, 8000);

    await click('#simpleResetTable');
    await evaluate(`(() => {
      const select=document.querySelector('[data-simple-filter="seo_threat_level"]');
      select.value='High';
      select.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await waitForPage('table category filter applied', `/after filters/i.test(document.querySelector('#readerContent')?.textContent || '') && /High/i.test(document.querySelector('#readerContent')?.textContent || '')`, 8000);

    await click('#simpleResetTable');
    await evaluate(`(() => {
      const select=document.querySelector('#simpleSortCol');
      select.value='seo_total_estimated_traffic';
      select.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await waitForPage('table sort applied', `/Company 200/i.test(document.querySelector('.simplePreviewTable tbody tr')?.textContent || '')`, 8000);
  });

  await step('All charts keeps visual workspace and pin renders a chart', async () => {
    const before=await evaluate(`document.querySelectorAll('[data-chart-workspace="recommended"] .autoChartCard').length`);
    assert.ok(before>0,'Recommended must render actual charts before opening All charts.');
    await click('[data-chart-view="all"]');
    await waitForPage('separate All charts catalog', `document.querySelector('[data-chart-catalog="all"]') && document.querySelector('[data-chart-workspace] .autoChartCard')`);
    const catalog=await evaluate(`(() => ({workspaceCharts:document.querySelectorAll('[data-chart-workspace] .autoChartCard').length,families:document.querySelectorAll('[data-chart-catalog="all"] .chartCandidateFamily').length,filters:Boolean(document.querySelector('#simpleChartMetric'))}))()`);
    assert.ok(catalog.workspaceCharts>0&&catalog.families>0&&catalog.filters,`All charts replaced or failed to expose the catalog: ${JSON.stringify(catalog)}`);
    await evaluate(`(() => {const select=document.querySelector('#simpleChartMetric');if([...select.options].some(option=>option.value==='seo_total_estimated_traffic'))select.value='seo_total_estimated_traffic';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitForPage('filtered chart family', `document.querySelector('[data-chart-catalog="all"] [data-simple-open-chart]')`);
    await click('[data-chart-catalog="all"] [data-simple-open-chart]');
    await waitForPage('actual selected chart preview', `document.querySelector('[data-selected-chart-preview] .svgChart')`);
    await click('[data-selected-chart-preview] [data-pin-chart]');
    await waitForPage('pinned count increment', `Number(document.querySelector('[data-chart-view="pinned"] span')?.textContent||0)>0`);
    await click('[data-chart-view="pinned"]');
    await waitForPage('actual pinned chart render', `document.querySelector('[data-chart-workspace="pinned"] .autoChartCard .svgChart')`);
    await click('[data-chart-view="recommended"]');
    await waitForPage('recommended chart render restored', `document.querySelector('[data-chart-workspace="recommended"] .autoChartCard .svgChart')`);
  });

  await step('right tree show-more for many files', async () => {
    await evaluate(`(async () => {
      const dt=new DataTransfer();
      for(let i=1;i<=130;i+=1){
        dt.items.add(new File(['note '+i], 'note-'+String(i).padStart(3,'0')+'.txt', {type:'text/plain'}));
      }
      const zone=document.querySelector('#materialsDropZone');
      zone.dispatchEvent(new DragEvent('drop', {bubbles:true,cancelable:true,dataTransfer:dt}));
    })()`);
    await waitForPage('tree visible count for many files', `/Showing\\s+120\\s+of\\s+131/i.test(document.querySelector('[data-simple-file-tree]')?.textContent || '')`, 20000);
    await click('[data-simple-show-more="files"]');
    await waitForPage('tree show more reveals files', `/note-130\\.txt/i.test(document.querySelector('[data-simple-file-tree]')?.textContent || '')`, 8000);
  });

  await step('simple client export has no editor controls', async () => {
    const exportState = await evaluate(`(async () => {
      window.__mrsDownloads=[];
      const original=HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click=function(){
        window.__mrsDownloads.push({download:this.download, href:this.href});
      };
      document.querySelector('#saveClientHtmlBtn').click();
      for(let i=0;i<80 && !window.__mrsDownloads.length;i+=1) await new Promise(resolve=>setTimeout(resolve,100));
      HTMLAnchorElement.prototype.click=original;
      const item=window.__mrsDownloads[0] || {};
      const html=item.href ? await fetch(item.href).then(response=>response.text()) : '';
      return {
        download:item.download || '',
        hasClientLocked:/data-client-locked="true"/.test(html),
        hasRows:/200\\s+rows/i.test(html),
        hasCharts:/Auto Charts/i.test(html),
        hasEditorControls:/adminOnly|pasteBtn|saveHtmlBtn|Client package|CI JSON|Audit|Advanced \\/ Labs|contenteditable/i.test(html)
      };
    })()`);
    assert.ok(exportState.download.endsWith('client.html'),`Unexpected client export filename: ${exportState.download}`);
    assert.ok(exportState.hasClientLocked, `Client export is not marked locked: ${JSON.stringify(exportState)}`);
    assert.ok(exportState.hasRows && exportState.hasCharts, `Client export missed dashboard content: ${JSON.stringify(exportState)}`);
    assert.equal(exportState.hasEditorControls, false, `Client export leaked editor controls: ${JSON.stringify(exportState)}`);
  });

  await step('real PDF upload pipeline and honest unsupported states', async () => {
    await evaluate(`(() => {
      const fixtures=${JSON.stringify(pdfFixtureBase64)},dt=new DataTransfer();
      for(const [name,base64] of Object.entries(fixtures)){
        const binary=atob(base64),bytes=new Uint8Array(binary.length);
        for(let index=0;index<binary.length;index+=1) bytes[index]=binary.charCodeAt(index);
        dt.items.add(new File([bytes],name,{type:'application/pdf'}));
      }
      document.querySelector('#materialsDropZone').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));
    })()`);
    await waitForPage('PDF batch import result', `document.querySelector('#importReport')`,45000);
    await click('#importReport');
    await waitForPage('PDF files in project tree', `${JSON.stringify(Object.keys(pdfFixtureBase64))}.every(name=>(document.querySelector('[data-simple-file-tree]')?.textContent||'').includes(name))`,15000);
    async function diagnostics(name){
      await evaluate(`(() => {const item=[...document.querySelectorAll('.simpleTreeItem[data-type="emb-file"]')].find(element=>element.textContent.includes(${JSON.stringify(name)}));if(!item)throw new Error('Missing PDF tree item');item.click();})()`);
      await waitForPage(`${name} diagnostics`,`document.querySelector('[data-pdf-diagnostics]') && (document.querySelector('#readerContent')?.textContent||'').includes(${JSON.stringify(name)})`);
      return evaluate(`(document.querySelector('#readerContent')?.textContent||'').replace(/\\s+/g,' ')`);
    }
    const clean=await diagnostics('clean-native-table.pdf');
    assert.match(clean,/PDF\.js\s*loaded/i);assert.match(clean,/Worker\s*(?:configured|fake_worker)/i);assert.match(clean,/Protocol\s*https?:/i);assert.match(clean,/Module URL\s*http:\/\/127\.0\.0\.1:\d+\/vendor\/pdfjs\/pdf\.min\.mjs/i);assert.match(clean,/Worker URL\s*http:\/\/127\.0\.0\.1:\d+\/vendor\/pdfjs\/pdf\.worker\.min\.mjs/i);assert.match(clean,/Tables detected\s*[1-9]/i);assert.match(clean,/Chart candidates\s*[1-9]/i);
    const noTable=await diagnostics('native-text-no-table.pdf');
    assert.match(noTable,/Native text was extracted, but no reliable table was detected/i);assert.match(noTable,/Tables detected\s*0/i);
    const scanned=await diagnostics('scanned-image-only.pdf');
    assert.match(scanned,/PDF_SCANNED_NO_OCR/);assert.match(scanned,/OCR is not enabled/i);assert.match(scanned,/Tables detected\s*0/i);
    const corrupted=await diagnostics('corrupted-text.pdf');
    assert.match(corrupted,/PDF_TEXT_CORRUPTED/);assert.match(corrupted,/needs_review/i);assert.doesNotMatch(corrupted,/Tables detected\s*[1-9]/i);
  });

  await step('mobile viewport simple tree smoke', async () => {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await evaluate(`window.dispatchEvent(new Event('resize'))`);
    const mobileState = await evaluate(`(() => {
      const topbar=document.querySelector('.workspaceTopbar');
      const topbarRect=topbar?.getBoundingClientRect();
      const docOverflow=Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)-window.innerWidth;
      return {
        viewport: window.innerWidth,
        docOverflow,
        topbarWidth: topbarRect ? topbarRect.width : 0,
        simpleTreeExists: Boolean(document.querySelector('[data-simple-file-tree]')),
        dropZoneExists: Boolean(document.querySelector('#materialsDropZone'))
        ,overflowing:[...document.querySelectorAll('body *')].map(element=>{const rect=element.getBoundingClientRect();return {tag:element.tagName,className:String(element.className||'').slice(0,100),id:element.id||'',left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width),scrollWidth:element.scrollWidth};}).filter(item=>item.right>window.innerWidth+4||item.left<-4||item.scrollWidth>item.width+4).sort((a,b)=>Math.max(b.right-window.innerWidth,b.scrollWidth-b.width)-Math.max(a.right-window.innerWidth,a.scrollWidth-a.width)).slice(0,8)
      };
    })()`);
    assert.ok(mobileState.docOverflow <= 4, `Mobile page has horizontal overflow: ${JSON.stringify(mobileState)}`);
    assert.ok(mobileState.topbarWidth <= mobileState.viewport + 1, `Mobile topbar overflows viewport: ${JSON.stringify(mobileState)}`);
    assert.ok(mobileState.simpleTreeExists && mobileState.dropZoneExists, `Simple project tree is not usable on mobile: ${JSON.stringify(mobileState)}`);
  });
}

async function step(name, fn) {
  try {
    await fn();
    console.log(`[e2e] ${name}: ok`);
  } catch (error) {
    error.message = `[${name}] ${error.message}`;
    throw error;
  }
}

async function navigate(url) {
  const loaded = new Promise((resolve) => {
    const off = page.on('Page.loadEventFired', () => {
      off();
      resolve();
    });
  });
  await page.send('Page.navigate', { url });
  await Promise.race([
    loaded,
    delay(10000).then(() => {
      throw new Error(`Timed out loading ${url}`);
    }),
  ]);
}

async function click(selector) {
  await waitForPage(`click target ${selector}`, `document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(`(() => {
    const el=document.querySelector(${JSON.stringify(selector)});
    el.scrollIntoView({block:'center', inline:'center'});
    el.click();
    return true;
  })()`);
}

async function waitForPage(label, expression, timeoutMs = 6000) {
  const started = Date.now();
  let lastError = '';
  while (Date.now() - started < timeoutMs) {
    try {
      const ok = await evaluate(`Boolean(${expression})`);
      if (ok) return;
    } catch (error) {
      lastError = error.message;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? ` (${lastError})` : ''}`);
}

async function evaluate(expression) {
  const response = await page.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) {
    throw new Error(formatException(response.exceptionDetails));
  }
  return response.result?.value;
}

class CDP {
  constructor(transport) {
    this.transport = transport;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    transport.onMessage = (message) => {
      this.handleMessage(message).catch((error) => {
        for (const { reject } of this.pending.values()) reject(error);
        this.pending.clear();
      });
    };
    transport.onClose = () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('CDP websocket closed.'));
      }
      this.pending.clear();
    };
  }

  static async connect(wsUrl) {
    return new CDP(await connectWebSocket(wsUrl));
  }

  send(method, params = {}, sessionId = null) {
    const id = this.nextId++;
    if (process.env.E2E_BROWSER_DEBUG) console.error(`[cdp] -> ${id} ${method}`);
    this.transport.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 15000).unref?.();
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || new Set();
    handlers.add(handler);
    this.handlers.set(method, handlers);
    return () => handlers.delete(handler);
  }

  close() {
    this.transport.close();
  }

  async handleMessage(raw) {
    const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw || '');
    if (process.env.E2E_BROWSER_DEBUG) console.error(`[cdp] <- ${text.slice(0, 240)}`);
    const message = JSON.parse(text);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result || {});
      return;
    }
    const eventKeys = message.sessionId ? [`${message.sessionId}:${message.method}`, message.method] : [message.method];
    for (const key of eventKeys) for (const handler of this.handlers.get(key) || []) {
      handler(message.params || {});
    }
  }
}

class CDPSession {
  constructor(root, sessionId) {
    this.root = root;
    this.sessionId = sessionId;
  }

  send(method, params = {}) {
    return this.root.send(method, params, this.sessionId);
  }

  on(method, handler) {
    return this.root.on(`${this.sessionId}:${method}`, handler);
  }

  close() {
    this.root.close();
  }
}

class TargetSession {
  constructor(root, sessionId) {
    this.root = root;
    this.sessionId = sessionId;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.off = root.on('Target.receivedMessageFromTarget', (params) => {
      if (params.sessionId !== this.sessionId || !params.message) return;
      this.handleMessage(params.message);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const message = JSON.stringify({ id, method, params });
    if (process.env.E2E_BROWSER_DEBUG) console.error(`[target] -> ${id} ${method}`);
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP target command timed out: ${method}`));
      }, 15000).unref?.();
    });
    this.root.send('Target.sendMessageToTarget', { sessionId: this.sessionId, message }).catch((error) => {
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      pending.reject(error);
    });
    return result;
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || new Set();
    handlers.add(handler);
    this.handlers.set(method, handlers);
    return () => handlers.delete(handler);
  }

  close() {
    this.off?.();
  }

  handleMessage(raw) {
    if (process.env.E2E_BROWSER_DEBUG) console.error(`[target] <- ${String(raw).slice(0, 240)}`);
    const message = JSON.parse(raw);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result || {});
      return;
    }
    for (const handler of this.handlers.get(message.method) || []) {
      handler(message.params || {});
    }
  }
}

function connectWebSocket(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const key = randomBytes(16).toString('base64');
    const socket = net.createConnection({
      host: url.hostname,
      port: Number(url.port || 80),
    });
    let connected = false;
    let buffer = Buffer.alloc(0);
    let fragmented = [];
    const transport = {
      onMessage: null,
      onClose: null,
      send(data) {
        socket.write(encodeWsFrame(Buffer.from(String(data), 'utf8'), 1));
      },
      close() {
        try {
          socket.write(encodeWsFrame(Buffer.alloc(0), 8));
        } catch {}
        socket.end();
      },
    };

    socket.once('error', (error) => {
      if (!connected) reject(error);
    });
    socket.once('connect', () => {
      socket.write([
        `GET ${url.pathname}${url.search} HTTP/1.1`,
        `Host: ${url.host}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        '',
      ].join('\r\n'));
    });
    socket.on('close', () => {
      transport.onClose?.();
    });
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!connected) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;
        const header = buffer.subarray(0, headerEnd).toString('utf8');
        buffer = buffer.subarray(headerEnd + 4);
        if (!/^HTTP\/1\.1 101\b/i.test(header)) {
          reject(new Error(`WebSocket upgrade failed: ${header.split('\r\n')[0] || header}`));
          socket.destroy();
          return;
        }
        connected = true;
        if (process.env.E2E_BROWSER_DEBUG) console.error('[cdp] websocket upgraded');
        resolve(transport);
      }
      while (true) {
        const frame = decodeWsFrame(buffer);
        if (!frame) return;
        buffer = buffer.subarray(frame.frameLength);
        if (frame.opcode === 8) {
          socket.end();
          return;
        }
        if (frame.opcode === 9) {
          socket.write(encodeWsFrame(frame.payload, 10));
          continue;
        }
        if (frame.opcode === 1 || frame.opcode === 2) {
          if (process.env.E2E_BROWSER_DEBUG) console.error(`[cdp] text frame ${frame.payload.length} bytes`);
          if (frame.fin) transport.onMessage?.(frame.payload);
          else fragmented = [frame.payload];
          continue;
        }
        if (frame.opcode === 0) {
          fragmented.push(frame.payload);
          if (frame.fin) {
            transport.onMessage?.(Buffer.concat(fragmented));
            fragmented = [];
          }
        }
      }
    });
  });
}

function encodeWsFrame(payload, opcode) {
  const length = payload.length;
  const mask = randomBytes(4);
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = 0x80 | length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  header[0] = 0x80 | opcode;
  const masked = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([header, mask, masked]);
}

function decodeWsFrame(buffer) {
  if (buffer.length < 2) return null;
  const first = buffer[0];
  const second = buffer[1];
  const fin = Boolean(first & 0x80);
  const opcode = first & 0x0f;
  const masked = Boolean(second & 0x80);
  let length = second & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buffer.length < offset + 2) return null;
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) return null;
    length = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }
  let mask = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    mask = buffer.subarray(offset, offset + 4);
    offset += 4;
  }
  if (buffer.length < offset + length) return null;
  const payload = Buffer.from(buffer.subarray(offset, offset + length));
  if (mask) {
    for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
  }
  return { fin, opcode, payload, frameLength: offset + length };
}

function findBrowser() {
  const envPath = process.env.E2E_BROWSER;
  const candidates = [
    envPath,
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate) && canUseHeadlessBrowser(candidate)) return candidate;
  }
  const pathCommands = process.platform === 'win32'
    ? ['chrome.exe', 'msedge.exe']
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];
  for (const command of pathCommands) {
    const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], { encoding: 'utf8' });
    const found = lookup.stdout?.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (found && existsSync(found) && canUseHeadlessBrowser(found)) return found;
  }
  return null;
}

function canUseHeadlessBrowser(candidate) {
  const checkDir = mkdtempSync(resolve(tmpdir(), 'mrs-browser-check-'));
  try {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--disable-gpu-sandbox',
      '--disable-3d-apis',
      '--disable-accelerated-2d-canvas',
      '--disable-dev-shm-usage',
      '--use-gl=swiftshader',
      '--use-angle=swiftshader',
      '--disable-features=Translate,OptimizationHints,MediaRouter,InterestFeedContentSuggestions,Vulkan,DefaultANGLEVulkan',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${checkDir}`,
      '--dump-dom',
      'data:text/html,<html><body>mrs-e2e-browser-check</body></html>',
    ];
    if (process.getuid?.() === 0 || process.env.CI) args.splice(1, 0, '--no-sandbox');
    const result = spawnSync(candidate, args, { encoding: 'utf8', timeout: 8000 });
    return result.status === 0 && /mrs-e2e-browser-check/.test(result.stdout || '');
  } catch {
    return false;
  } finally {
    try {
      rmSync(checkDir, { recursive: true, force: true });
    } catch {}
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function waitForBrowserWebSocket(port) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const version = await requestJson(port, '/json/version');
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
    } catch {}
    await delay(100);
  }
  throw new Error('Timed out waiting for browser DevTools websocket.');
}

async function waitForPageWebSocket(port, targetId) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const targets = await requestJson(port, '/json/list');
      const pageTarget = targets.find((target) => target.id === targetId && target.type === 'page' && target.webSocketDebuggerUrl);
      if (pageTarget) return pageTarget.webSocketDebuggerUrl;
    } catch {}
    await delay(100);
  }
  throw new Error(`Timed out waiting for page DevTools websocket for target ${targetId}.`);
}

function requestJson(port, path) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path, timeout: 2000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Invalid JSON from DevTools ${path}: ${error.message}`));
        }
      });
    });
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy(new Error(`Timed out requesting DevTools ${path}`));
    });
  });
}

async function buildFailureReport(error) {
  let snapshot = null;
  if (page) {
    try {
      snapshot = await Promise.race([
        evaluate(`(() => ({
        url: location.href,
        title: document.title,
        notice: document.querySelector('#appNoticeText')?.textContent || '',
        topbar: document.querySelector('.workspaceTopbar')?.textContent.trim().replace(/\\s+/g, ' ').slice(0, 260) || '',
        analytics: document.querySelector('#analyticsContent')?.textContent.trim().replace(/\\s+/g, ' ').slice(0, 800) || '',
        analyticsHtml: document.querySelector('#analyticsContent')?.innerHTML.slice(0, 1200) || '',
        side: document.querySelector('#sideList')?.textContent.trim().replace(/\\s+/g, ' ').slice(0, 600) || '',
        viewport: { width: window.innerWidth, height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth }
      }))()`),
        delay(2000).then(() => ({ error: 'Timed out while collecting page snapshot.' })),
      ]);
    } catch (snapshotError) {
      snapshot = { error: snapshotError.message };
    }
  }
  return [
    'Browser E2E smoke failed.',
    `Browser: ${browserPath}`,
    `URL: ${appUrl}`,
    `Error: ${error.stack || error.message || error}`,
    dialogs.length ? `Dialogs accepted: ${dialogs.join(' | ')}` : '',
    consoleErrors.length ? formatConsoleErrors(consoleErrors) : '',
    browserStderr.length ? `Browser stderr:\n${browserStderr.slice(-10).map((line) => `- ${line}`).join('\n')}` : '',
    snapshot ? `Page snapshot: ${JSON.stringify(snapshot, null, 2)}` : '',
  ].filter(Boolean).join('\n');
}

function formatConsoleArgs(args = []) {
  return args.map((arg) => arg.value ?? arg.description ?? arg.type ?? '').join(' ');
}

function formatConsoleErrors(errors) {
  return `Console errors:\n${errors.map((line) => `- ${line}`).join('\n')}`;
}

function formatException(details) {
  const callFrames = details.stackTrace?.callFrames || [];
  const location = callFrames[0] ? ` at ${callFrames[0].url}:${callFrames[0].lineNumber + 1}` : '';
  const description=details.exception?.description||details.exception?.value||'';
  return `${description||details.text||'Runtime exception'}${location}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function stopBrowser() {
  if (!browser || browser.exitCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2000);
    browser.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    browser.kill();
  });
}

async function stopAppServer() {
  if (!appServer) return;
  await new Promise((resolve) => appServer.close(resolve));
  appServer = null;
}

async function removeUserDataDir() {
  if (!userDataDir) return;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      rmSync(userDataDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 5) {
        browserStderr.push(`Could not remove temp browser profile ${userDataDir}: ${error.message}`);
        return;
      }
      await delay(250);
    }
  }
}

function createE2EHarnessHtml(appFileName) {
  return String.raw`<!doctype html>
<html>
<head><meta charset="utf-8"><title>MRS E2E Harness</title></head>
<body>
<pre id="result">{"ok":false,"error":"not started"}</pre>
<iframe id="appframe" src="/${appFileName}" style="width:1200px;height:900px"></iframe>
<script>
const pdfFixtures=${JSON.stringify(pdfFixtureBase64)};
const resultEl=document.getElementById('result');
function finish(data){resultEl.textContent=JSON.stringify(data);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function waitFor(label, predicate, timeout=12000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    try{ if(predicate()) return; }catch(e){}
    await sleep(100);
  }
  throw new Error('Timed out waiting for '+label);
}
function visible(doc, selector){
  const el=doc.querySelector(selector);
  if(!el) return false;
  const rect=el.getBoundingClientRect();
  const style=el.ownerDocument.defaultView.getComputedStyle(el);
  return rect.width>0 && rect.height>0 && style.display!=='none' && style.visibility!=='hidden';
}
function sampleCsv(){
  const headers=[
    'company','segment','priority','seo_threat_level','seo_total_estimated_traffic','seo_threat_score',
    'seo_organic_count','seo_paid_count','seo_featured_snippet_count','seo_local_pack_count','seo_organic_etv','seo_paid_etv',
    'domain','website','country','city_region','verification_status','next_action','outreach_angle','why_relevant',
    'estimated_revenue','employee_count','energy_focus','grid_role','renewable_share','investment_stage','policy_alignment',
    'risk_score','opportunity_score','notes','row_number'
  ];
  const quote=(value)=>{
    const text=String(value ?? '');
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g,'""') + '"' : text;
  };
  const rows=[];
  for(let i=1;i<=200;i+=1){
    rows.push([
      'Company '+String(i).padStart(3,'0'), ['Generation','Storage','Grid','Services'][i%4], ['High','Medium','Low'][i%3],
      i%3===0?'High':(i%3===1?'Medium':'Low'), 1000+i*137, 20+i, 10+i, i%7, i%5, i%4, 500+i*9, 50+i*3,
      'company'+i+'.ua', 'https://company'+i+'.ua', 'Ukraine', ['Kyiv','Lviv','Dnipro','Odesa'][i%4],
      i%5===0?'Needs review':'Verified', 'Review partnership fit', 'Energy transition pitch '+i,
      'Relevant to Ukraine energy prospects', 1000000+i*2500, 25+i, ['solar','wind','storage','grid'][i%4],
      ['producer','operator','supplier'][i%3], (i%100)/100, ['seed','growth','mature'][i%3],
      ['strong','medium','weak'][i%3], i%100, 100-(i%100), 'Sample row '+i, i
    ]);
  }
  return {headers, rows, csv:[headers.join(','),...rows.map(row=>row.map(quote).join(','))].join('\n')};
}
async function run(){
  const frame=document.getElementById('appframe');
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('iframe load timeout')),15000);
    frame.onload=()=>{clearTimeout(timer); resolve();};
  });
  const w=frame.contentWindow;
  const d=frame.contentDocument;
  await waitFor('simple UI',()=>d.querySelector('.workspaceTopbar')&&d.querySelector('[data-simple-file-tree]')&&d.querySelector('.analytics')&&d.querySelector('.reader'));
  const initialVisible=[...d.querySelectorAll('.workspaceTopbar button')].filter(button=>button.offsetWidth>0 && w.getComputedStyle(button).display!=='none').map(button=>button.textContent.trim()).join(' ');
  if(!visible(d,'#pasteBtn') || !visible(d,'#saveClientHtmlBtn') || !visible(d,'#saveDiskBtn')) throw new Error('simple topbar controls are not visible');
  if(/Save admin|Client package|CI JSON|Audit/.test(initialVisible)) throw new Error('advanced topbar controls are visible');
  if(d.querySelector('.advancedLabs[open]')) throw new Error('Advanced / Labs is open by default');

  d.querySelector('#pasteBtn').click();
  await waitFor('import modal',()=>d.querySelector('#modalBackdrop.open')&&d.querySelector('#dataUploadChoice'));
  d.querySelector('#modalClose').click();
  await waitFor('modal closed',()=>!d.querySelector('#modalBackdrop.open'));

  const sample=sampleCsv();
  const dt=new w.DataTransfer();
  dt.items.add(new w.File([sample.csv], 'ukraine_energy_prospects_200_seo.csv', {type:'text/csv'}));
  const dropZone=d.querySelector('.simpleEmptyDrop') || d.querySelector('#materialsDropZone');
  dropZone.dispatchEvent(new w.DragEvent('dragenter', {bubbles:true,cancelable:true,dataTransfer:dt}));
  dropZone.dispatchEvent(new w.DragEvent('drop', {bubbles:true,cancelable:true,dataTransfer:dt}));
  await waitFor('CSV import modal',()=>d.querySelector('#importReport'),15000);
  d.querySelector('#importReport').click();
  await waitFor('dashboard and table',()=>d.querySelector('[data-simple-dashboard]')&&d.querySelector('[data-simple-table]'));

  const bodyText=d.body.textContent || '';
  const cardText=[...d.querySelectorAll('.simpleStat')].map(el=>el.textContent.trim().replace(/\s+/g,' '));
  const rows=/200\s+rows/i.test(bodyText) && cardText.some(item=>/Rows\s+200/i.test(item));
  const columns=/31\s+columns/i.test(bodyText) && cardText.some(item=>/Columns\s+31/i.test(item));
  const requiredColumns=['company','segment','priority','seo_threat_level','seo_total_estimated_traffic','seo_threat_score'].every(name=>bodyText.includes(name));
  const chartCount=d.querySelectorAll('.autoChartCard').length;
  const tableExists=Boolean(d.querySelector('.simplePreviewTable'));

  const recommendedBefore=d.querySelectorAll('[data-chart-workspace="recommended"] .autoChartCard').length;
  d.querySelector('[data-chart-view="all"]').click();
  await waitFor('separate chart catalog',()=>d.querySelector('[data-chart-catalog="all"]')&&d.querySelector('[data-chart-workspace] .autoChartCard'));
  const chartCatalogWorks=recommendedBefore>0&&d.querySelectorAll('[data-chart-workspace] .autoChartCard').length>0&&d.querySelectorAll('[data-chart-catalog="all"] .chartCandidateFamily').length>0&&Boolean(d.querySelector('#simpleChartMetric'));
  const metric=d.querySelector('#simpleChartMetric');
  if([...metric.options].some(option=>option.value==='seo_total_estimated_traffic')) metric.value='seo_total_estimated_traffic';
  metric.dispatchEvent(new w.Event('change',{bubbles:true}));
  await waitFor('filtered chart families',()=>d.querySelector('[data-chart-catalog="all"] [data-simple-open-chart]'));
  d.querySelector('[data-chart-catalog="all"] [data-simple-open-chart]').click();
  await waitFor('selected chart preview',()=>d.querySelector('[data-selected-chart-preview] .svgChart'));
  const chartPreviewWorks=Boolean(d.querySelector('[data-selected-chart-preview] .svgChart'));
  d.querySelector('[data-selected-chart-preview] [data-pin-chart]').click();
  await waitFor('pinned count',()=>Number(d.querySelector('[data-chart-view="pinned"] span')?.textContent||0)>0);
  d.querySelector('[data-chart-view="pinned"]').click();
  await waitFor('pinned rendered chart',()=>d.querySelector('[data-chart-workspace="pinned"] .autoChartCard .svgChart'));
  const pinnedChartWorks=Boolean(d.querySelector('[data-chart-workspace="pinned"] .autoChartCard .svgChart'));
  d.querySelector('[data-chart-view="recommended"]').click();
  await waitFor('recommended charts restored',()=>d.querySelector('[data-chart-workspace="recommended"] .autoChartCard .svgChart'));

  const search=d.querySelector('#simpleTableSearch');
  search.value='Company 150';
  search.dispatchEvent(new w.InputEvent('input', {bubbles:true,inputType:'insertText',data:'Company 150'}));
  await waitFor('table search',()=>/Company 150/i.test(d.querySelector('#readerContent')?.textContent || ''));
  const searchWorks=/Company 150/i.test(d.querySelector('#readerContent')?.textContent || '');

  d.querySelector('#simpleResetTable').click();
  await waitFor('reset after search',()=>d.querySelector('[data-simple-filter="seo_threat_level"]'));
  const filter=d.querySelector('[data-simple-filter="seo_threat_level"]');
  filter.value='High';
  filter.dispatchEvent(new w.Event('change', {bubbles:true}));
  await waitFor('table filter',()=>/after filters/i.test(d.querySelector('#readerContent')?.textContent || '') && /High/i.test(d.querySelector('#readerContent')?.textContent || ''));
  const filterWorks=/High/i.test(d.querySelector('#readerContent')?.textContent || '');

  d.querySelector('#simpleResetTable').click();
  await waitFor('reset after filter',()=>d.querySelector('#simpleSortCol'));
  const sort=d.querySelector('#simpleSortCol');
  sort.value='seo_total_estimated_traffic';
  sort.dispatchEvent(new w.Event('change', {bubbles:true}));
  await waitFor('table sort',()=>/Company 200/i.test(d.querySelector('.simplePreviewTable tbody tr')?.textContent || ''));
  const sortWorks=/Company 200/i.test(d.querySelector('.simplePreviewTable tbody tr')?.textContent || '');

  const many=new w.DataTransfer();
  for(let i=1;i<=130;i+=1){
    many.items.add(new w.File(['note '+i], 'note-'+String(i).padStart(3,'0')+'.txt', {type:'text/plain'}));
  }
  d.querySelector('#materialsDropZone').dispatchEvent(new w.DragEvent('drop', {bubbles:true,cancelable:true,dataTransfer:many}));
  await waitFor('tree count',()=>/Showing\s+120\s+of\s+131/i.test(d.querySelector('[data-simple-file-tree]')?.textContent || ''),20000);
  d.querySelector('[data-simple-show-more="files"]').click();
  await waitFor('tree show more',()=>/note-130\.txt/i.test(d.querySelector('[data-simple-file-tree]')?.textContent || ''));
  const treeShowMore=/note-130\.txt/i.test(d.querySelector('[data-simple-file-tree]')?.textContent || '');

  const originalClick=w.HTMLAnchorElement.prototype.click;
  const downloads=[];
  w.HTMLAnchorElement.prototype.click=function(){downloads.push({download:this.download,href:this.href});};
  d.querySelector('#saveClientHtmlBtn').click();
  await waitFor('client export download',()=>downloads.length>0);
  w.HTMLAnchorElement.prototype.click=originalClick;
  const exportHtml=await w.fetch(downloads[0].href).then(response=>response.text());

  const pdfDrop=new w.DataTransfer();
  for(const [name,base64] of Object.entries(pdfFixtures)){
    const binary=atob(base64),bytes=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index+=1) bytes[index]=binary.charCodeAt(index);
    pdfDrop.items.add(new w.File([bytes],name,{type:'application/pdf'}));
  }
  d.querySelector('#materialsDropZone').dispatchEvent(new w.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:pdfDrop}));
  await waitFor('PDF import completion',()=>d.querySelector('#importReport'),30000);
  d.querySelector('#importReport').click();
  await waitFor('PDF files in tree',()=>Object.keys(pdfFixtures).every(name=>(d.querySelector('[data-simple-file-tree]')?.textContent||'').includes(name)),15000);
  async function pdfDiagnosticsText(name){
    const item=[...d.querySelectorAll('.simpleTreeItem[data-type="emb-file"]')].find(element=>element.textContent.includes(name));
    if(!item) throw new Error('Missing PDF tree item: '+name);
    item.click();
    await waitFor(name+' diagnostics',()=>d.querySelector('[data-pdf-diagnostics]')&&(d.querySelector('#readerContent')?.textContent||'').includes(name));
    return d.querySelector('#readerContent')?.textContent.replace(/\s+/g,' ')||'';
  }
  const cleanPdfText=await pdfDiagnosticsText('clean-native-table.pdf');
  const noTablePdfText=await pdfDiagnosticsText('native-text-no-table.pdf');
  const scannedPdfText=await pdfDiagnosticsText('scanned-image-only.pdf');
  const corruptedPdfText=await pdfDiagnosticsText('corrupted-text.pdf');
  const cleanPdfWorks=/PDF\.js\s*loaded/i.test(cleanPdfText)&&/Worker\s*(?:configured|fake_worker)/i.test(cleanPdfText)&&/Protocol\s*https?:/i.test(cleanPdfText)&&/Module URL\s*http:\/\/127\.0\.0\.1:\d+\/vendor\/pdfjs\/pdf\.min\.mjs/i.test(cleanPdfText)&&/Worker URL\s*http:\/\/127\.0\.0\.1:\d+\/vendor\/pdfjs\/pdf\.worker\.min\.mjs/i.test(cleanPdfText)&&/Tables detected\s*[1-9]/i.test(cleanPdfText)&&/Chart candidates\s*[1-9]/i.test(cleanPdfText);
  const noTablePdfWorks=/Native text was extracted, but no reliable table was detected/i.test(noTablePdfText)&&/Tables detected\s*0/i.test(noTablePdfText);
  const scannedPdfWorks=/PDF_SCANNED_NO_OCR/.test(scannedPdfText)&&/OCR is not enabled/i.test(scannedPdfText)&&/Tables detected\s*0/i.test(scannedPdfText);
  const corruptedPdfWorks=/PDF_TEXT_CORRUPTED/.test(corruptedPdfText)&&/needs_review/i.test(corruptedPdfText)&&!/Tables detected\s*[1-9]/i.test(corruptedPdfText);

  finish({
    ok:true,
    rows,
    columns,
    requiredColumns,
    chartCount,
    chartCatalogWorks,
    chartPreviewWorks,
    pinnedChartWorks,
    tableExists,
    searchWorks,
    filterWorks,
    sortWorks,
    treeShowMore,
    exportLocked:/data-client-locked="true"/.test(exportHtml),
    exportHasDashboard:/200\s+rows/i.test(exportHtml) && /Auto Charts/i.test(exportHtml),
    exportHasEditorControls:/adminOnly|pasteBtn|saveHtmlBtn|Client package|CI JSON|Audit|Advanced \/ Labs|contenteditable/i.test(exportHtml),
    cleanPdfWorks,
    noTablePdfWorks,
    scannedPdfWorks,
    corruptedPdfWorks
  });
}
run().catch(error=>finish({ok:false,error:error && (error.stack || error.message || String(error))}));
</script>
</body>
</html>`;
}

try {
  await runSimpleE2E();
  console.log('Browser E2E smoke passed.');
  assert.equal(consoleErrors.length, 0, formatConsoleErrors(consoleErrors));
} catch (error) {
  console.error(await buildFailureReport(error));
  process.exitCode = 1;
} finally {
  try {
    page?.close();
  } catch {}
  try {
    rootCdp?.close();
  } catch {}
  await stopBrowser();
  await stopAppServer();
  await removeUserDataDir();
}

function startStaticServer(port) {
  const projectRootPrefix = projectRoot.endsWith(sep) ? projectRoot : projectRoot + sep;
  const types = {
    '.html': 'text/html;charset=utf-8',
    '.js': 'text/javascript;charset=utf-8',
    '.mjs': 'text/javascript;charset=utf-8',
    '.pdf': 'application/pdf',
    '.css': 'text/css;charset=utf-8',
    '.json': 'application/json;charset=utf-8',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain;charset=utf-8',
  };
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
      const pathname = decodeURIComponent(url.pathname === '/' ? `/${appFileName}` : url.pathname);
      if (pathname === '/__e2e_harness.html') {
        response.writeHead(200, {
          'Content-Type': 'text/html;charset=utf-8',
          'Cache-Control': 'no-store',
        });
        response.end(createE2EHarnessHtml(appFileName));
        return;
      }
      const target = resolve(projectRoot, `.${pathname}`);
      if (target !== projectRoot && !target.startsWith(projectRootPrefix)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      if (!existsSync(target) || !statSync(target).isFile()) {
        if (pathname === '/favicon.svg') {
          response.writeHead(204);
          response.end();
          return;
        }
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      const ext = target.match(/\.[^.\\/]+$/)?.[0]?.toLowerCase() || '';
      response.writeHead(200, {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      createReadStream(target).pipe(response);
    } catch (error) {
      response.writeHead(500);
      response.end(error.message);
    }
  });
  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolveServer(server));
  });
}
