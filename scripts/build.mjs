import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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

const sourceHtml = await readFile(sourcePath, 'utf8');
const html = createHostedShell(sourceHtml);
const scriptHashes = getExecutableInlineScriptHashes(html);

if (scriptHashes.length === 0) {
  throw new Error('No executable inline scripts found; refusing to emit an invalid CSP.');
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(outputHtml, html, 'utf8');
await writeFile(legacyOutputHtml, html, 'utf8');
await writeFile(resolve(outputDir, '_headers'), createHeaders(scriptHashes), 'utf8');
await writeFile(
  resolve(outputDir, 'robots.txt'),
  'User-agent: *\nDisallow: /\n',
  'utf8',
);
await writeFile(
  resolve(outputDir, '_routes.json'),
  `${JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }, null, 2)}\n`,
  'utf8',
);

console.log(`Built ${outputHtml}`);
console.log(`Built ${legacyOutputHtml}`);
console.log(`CSP contains ${scriptHashes.length} inline script hash(es).`);

function createHostedShell(documentHtml) {
  const emptyReport = {
    meta: {
      title: 'Marketing Report Studio',
      accessMode: 'viewer',
    },
    datasets: [],
    files: [],
    charts: [],
    tables: [],
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
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob: https:",
    "frame-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  return [
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  Cache-Control: private, no-store, max-age=0',
    '  Referrer-Policy: no-referrer',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  X-Robots-Tag: noindex, nofollow, noarchive',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
    '',
  ].join('\n');
}
