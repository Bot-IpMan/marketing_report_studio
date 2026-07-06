import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(
  projectRoot,
  'marketing_report_studio_v8_access_folders_fixed.html',
);
const outputDir = resolve(projectRoot, 'dist');
const outputHtml = resolve(outputDir, 'index.html');
const legacyOutputHtml = resolve(
  outputDir,
  'marketing_report_studio_v8_access_folders_fixed.html',
);
const DEFAULT_MATERIAL_FOLDERS = [
  { id: 'market-research', name: '01. Market Research' },
  { id: 'competitor-intelligence', name: '02. Competitor Intelligence' },
  { id: 'customer-insights', name: '03. Customer Insights' },
  { id: 'product-positioning', name: '04. Product & Positioning' },
  { id: 'campaign-performance', name: '05. Campaign Performance' },
  { id: 'sales-enablement', name: '06. Sales Enablement' },
  { id: 'legal-compliance', name: '07. Legal & Compliance' },
];

const sourceHtml = await readFile(sourcePath, 'utf8');
const html = createHostedShell(sourceHtml);
const scriptHashes = getExecutableInlineScriptHashes(html);

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(resolve(projectRoot, 'vendor'), resolve(outputDir, 'vendor'), { recursive: true });
await cp(resolve(projectRoot, 'src'), resolve(outputDir, 'src'), { recursive: true });
await cp(resolve(projectRoot, 'app.js'), resolve(outputDir, 'app.js'));
await writeFile(outputHtml, html, 'utf8');
await writeFile(legacyOutputHtml, html, 'utf8');
await writeFile(resolve(outputDir, '_headers'), createHeaders(scriptHashes), 'utf8');
await writeFile(
  resolve(outputDir, 'robots.txt'),
  'User-agent: *\nDisallow: /\n',
  'utf8',
);
await writeFile(
  resolve(outputDir, 'favicon.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#315cf6"/><text x="32" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="white">M</text></svg>\n',
  'utf8',
);
console.log(`Built ${outputHtml}`);
console.log(`Built ${legacyOutputHtml}`);
console.log(`CSP contains ${scriptHashes.length} inline script hash(es).`);

function createHostedShell(documentHtml) {
  const emptyReport = {
    meta: {
      title: 'Marketing Report Studio',
      accessMode: 'admin',
    },
    datasets: [],
    files: [],
    charts: [],
    tables: [],
    materialFolders: createDefaultMaterialFolders(),
    simpleWorkspace: {
      version: 1,
      direction: 'upload files -> auto-structure tables -> visualize -> preview files -> export simple client report',
    },
    companies: [],
    ci: null,
  };
  const reportScript = /(<script\b(?=[^>]*\bid=["']reportData["'])[^>]*>)[\s\S]*?(<\/script\s*>)/i;
  if (!reportScript.test(documentHtml)) {
    throw new Error('Could not find the embedded reportData script.');
  }
  const safeJson = JSON.stringify(emptyReport, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return documentHtml.replace(reportScript, `$1\n${safeJson}\n$2`);
}

function createDefaultMaterialFolders() {
  return DEFAULT_MATERIAL_FOLDERS.map((folder) => ({
    id: folder.id,
    name: folder.name,
    system: true,
    createdAt: null,
    updatedAt: null,
  }));
}

function createDefaultReportSections() {
  return [
    ['cover', 'Cover'],
    ['executiveSummary', 'Executive Summary'],
    ['researchScope', 'Research Scope'],
    ['competitiveLandscape', 'Competitive Landscape'],
    ['competitors', 'Competitors'],
    ['pricing', 'Pricing'],
    ['features', 'Features'],
    ['messaging', 'Messaging / Positioning'],
    ['channels', 'Channels / Content / SEO'],
    ['risksOpportunities', 'Risks and Opportunities'],
    ['recommendations', 'Recommendations'],
    ['sourcesEvidence', 'Sources and Evidence'],
  ].map(([id, title], index) => ({
    id,
    title,
    type: id,
    order: index + 1,
    blocks: [],
    status: 'empty',
  }));
}

function getExecutableInlineScriptHashes(documentHtml) {
  const hashes = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

  for (const match of documentHtml.matchAll(scriptPattern)) {
    const attributes = match[1] || '';
    const contents = match[2] || '';

    if (/\bsrc\s*=/i.test(attributes) || !isExecutableScript(attributes)) {
      continue;
    }

    const digest = createHash('sha256').update(contents, 'utf8').digest('base64');
    hashes.push(`'sha256-${digest}'`);
  }

  return [...new Set(hashes)];
}

function isExecutableScript(attributes) {
  const typeMatch = attributes.match(/\btype\s*=\s*(["'])(.*?)\1/i);
  if (!typeMatch) return true;

  const type = typeMatch[2].trim().toLowerCase();
  return type === 'module' || type === 'text/javascript' || type === 'application/javascript';
}

function createHeaders(hashes) {
  const csp = [
    "default-src 'none'",
    `script-src 'self' ${hashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'none'",
    "frame-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  return [
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  Cache-Control: private, no-store, max-age=0',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Cross-Origin-Resource-Policy: same-origin',
    '  Origin-Agent-Cluster: ?1',
    '  Referrer-Policy: no-referrer',
    '  Strict-Transport-Security: max-age=31536000',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  X-Permitted-Cross-Domain-Policies: none',
    '  X-Robots-Tag: noindex, nofollow, noarchive',
    '  Permissions-Policy: accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), serial=(), bluetooth=()',
    '',
  ].join('\n');
}
