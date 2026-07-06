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
- detects tabular data and creates summary cards, rule-based charts, and a
  searchable table preview;
- keeps a simple right-side project tree for files, tables, charts, saved
  views, and exports;
- exports a clean static client report for the current table/dashboard;
- runs locally in the browser by default.

Advanced evidence, AI, governance, audit, and enterprise workflow code may
remain in the repository for compatibility, but it is not part of the default
product flow and must stay hidden unless explicitly requested.

## Privacy Model

- Uploaded and connected files are processed in the user's browser.
- Report data may be kept in browser memory and `localStorage` on that device.
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

## Build And Test

```bash
npm test
npm run build
npm run e2e
```

`npm run e2e` launches a local static server and a Chromium-compatible browser.
It skips only when no browser is available.

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
- A client HTML export can be modified outside the application and is not a
  cryptographically immutable document.
