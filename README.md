# Marketing Report Studio

Marketing Report Studio is a browser-only file and table workspace for simple
marketing research reports.

Product direction:

```text
Upload files -> auto-structure tables -> visualize -> preview files -> export simple client report
```

Production URL: <https://mrsai.lookdata.live/>

## What It Does

- imports CSV, TSV, JSON, XLSX, Markdown, TXT, HTML, PDF, DOCX, and images;
- detects zero, one, or many real tables in a file and profiles columns from
  values instead of depending on English or Ukrainian field names;
- creates deterministic derived-table and chart-candidate registries, showing
  a small Recommended set while keeping All charts searchable, filterable,
  paginated, previewable, and pinnable;
- keeps a simple right-side project tree for files, tables, charts, saved
  views, and exports;
- exports a clean static client report for the current table/dashboard;
- runs locally in the browser by default.

Advanced evidence, AI, governance, audit, and enterprise workflow code may
remain in the repository for compatibility, but it is not part of the default
product flow and must stay hidden unless explicitly requested.

## Privacy Model

- Uploaded and connected files are processed in the user's browser.
- Report data may be kept in browser memory. Small preferences and the existing
  fallback use `localStorage`; structured reports and large blobs use
  IndexedDB when it is available.
- Files can be exported explicitly to HTML, JSON, or ZIP by the user.
- The application does not upload report data to Cloudflare, GitHub, D1, R2, or
  another API.
- `/api/*` is intentionally disabled by both the Worker and the Pages fallback.
- The production Content Security Policy sets `connect-src 'none'`, blocking
  browser network requests from the page.
- The application does not include analytics, telemetry, tracking pixels, or
  hidden network behavior.

## Local Use

Open this file directly in a Chromium-based browser:

```text
marketing_report_studio_v8_access_folders_fixed.html
```

Chromium is recommended for local folder access. Browser storage belongs to the
current browser profile, so use a trusted profile and export durable backups.
Some browsers restrict module Workers when a page is opened through `file://`;
the app keeps a yielded main-thread fallback, while a local/hosted static server
provides the most reliable PDF and Worker behavior.

## File Intelligence

- CSV/TSV use delimiter and malformed-width checks and the universal profiler.
- XLSX keeps raw worksheet matrices long enough to detect title rows, structural
  headers, vertically separated table regions, and notes.
- JSON discovers bounded, meaningful nested arrays of objects and retains their
  JSON paths.
- Markdown retains heading context and Mermaid/code blocks while extracting all
  real pipe tables. HTML extracts inert `<table>` structures; TXT becomes a
  dataset only when repeated delimiters are structurally consistent.
- DOCX is parsed locally from WordprocessingML and preserves native paragraph
  and table structure with table anchors and confidence diagnostics.
- PDF uses the vendored, self-hosted PDF.js 6.1.200 build for incremental native
  text extraction and conservative geometry-based table candidates. Poor,
  empty, or corrupted text layers remain preview-only or need review.
- Images remain preview-only. OCR, vision, AI, and automatic text repair are not
  included.

Every normalized table and generated candidate retains the known file,
document, table, sheet/page/section/range anchor, extraction confidence, and
transformation metadata. Unknown provenance fields remain unknown.

## Build And Test

```bash
npm test
npm run build
npm run e2e
npm run e2e:strict
npm run qa:pdf:strict
```

`npm run e2e` launches a local static server and a Chromium-compatible browser.
It reports `SKIPPED` when no browser is available. `npm run e2e:strict` treats a
missing browser as a failure. The strict PDF QA command parses the committed
native-text, no-table, corrupted-text, and image-only fixtures with the
vendored PDF.js build and fails if that real parsing path is unavailable.

## Deployment

The production site is deployed from GitHub to Cloudflare Pages. Configure the
Pages project with:

```text
Build command: npm run build
Build output directory: dist
```

Every push to the production branch should trigger a Pages build. No D1
database, R2 bucket, KV namespace, Access audience, environment variable, or
secret is required. The Pages Functions fallback and Worker-compatible routing
both keep `/api/*` disabled with `API_DISABLED`.

See [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) for the current
Cloudflare checklist and security headers.

## Limitations

- Data is not synchronized between devices or browser profiles.
- Clearing site data removes browser autosave; use exports for durable backups.
- Large files may be rejected to protect the browser from memory exhaustion.
- PDF geometry extraction is best-effort and intentionally keeps uncertain
  layouts out of Recommended results. Scanned PDFs require OCR, which is not
  enabled.
- XLSX supports multiple vertically separated regions; independently detecting
  every side-by-side table and reproducing complex merged-cell presentation is
  not guaranteed.
- DOCX extraction preserves textual table structure, not Word's complete visual
  layout fidelity.
- A client HTML export can be modified outside the application and is not a
  cryptographically immutable document.
