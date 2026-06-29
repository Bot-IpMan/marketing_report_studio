# Marketing Report Studio

Marketing Report Studio is a browser-only application for marketing and
competitive-intelligence reports. It imports spreadsheets and research files,
builds tables and charts, and exports portable admin or client copies.

Production URL: <https://mrsai.lookdata.live/>

## Privacy Model

- Uploaded and connected files are processed in the user's browser.
- Report data may be kept in browser memory and `localStorage` on that device.
- Files can be exported explicitly to HTML, JSON, or ZIP by the user.
- The application does not upload report data to Cloudflare, GitHub, D1, R2, or
  another API.
- `/api/*` is intentionally disabled by both the Worker and the Pages fallback.
- The production Content Security Policy sets `connect-src 'none'`, blocking
  `fetch`, XHR, WebSocket, EventSource, and beacon requests from the page.
- The application does not include third-party analytics, tracking pixels,
  telemetry SDKs, hidden data-collection iframes, or background downloaders.
- A server-side AI provider adapter exists for future use, but real AI is
  disabled by default. Any OpenAI key must be stored as a Cloudflare Worker
  Secret, AI outputs must remain reviewable suggestions, and client exports
  must never include secrets, hidden prompts, or unreviewed AI content.

GitHub stores only application source code. Cloudflare serves the static build
and does not receive the contents of files selected inside the application.
Normal infrastructure metadata such as IP address, request path, user agent, and
Cloudflare request logs may still be processed by Cloudflare when the site is
opened.

## Features

- CSV, TSV, JSON, XLSX, Markdown, TXT, HTML, PDF, DOCX, and image imports;
- File System Access API integration for explicitly selected local folders;
- browser-side parsing, charts, tables, and competitive analysis;
- standalone admin and client HTML exports;
- ZIP bundles containing explicitly exported files;
- Ukrainian and English interface modes.

## Recent Product Update

This update moves Marketing Report Studio closer to a full
`upload materials -> structure evidence -> review -> export` workflow:

- Added a report schema for sections, materials inventory, source registry,
  evidence cards, competitor profiles, pricing/feature matrices, draft blocks,
  review statuses, quality checks, version history metadata, governance
  settings, and onboarding state.
- Added a guided first-report workflow that helps users create a report, add a
  client and competitors, upload materials, build sources, review evidence,
  generate a draft, run export checks, and create a client export.
- Added evidence-backed report tools: materials inventory, source registry,
  evidence cards, evidence review, rule-based draft generation, and export
  readiness checks.
- Added competitor and pricing/feature workspaces for organizing competitors,
  pricing tiers, feature rows, source links, evidence links, and draft
  summaries.
- Added safer export flows: client package export, internal audit package
  export, client-locked report sanitization, and checks that block client export
  when important evidence or safety requirements are missing.
- Added local AI-assistance scaffolding with disabled-by-default provider
  boundaries, dry-run previews, review queues, provenance, audit events, and
  explicit human review before any AI-derived content can be used.
- Added governance, onboarding, version diff, and retention panels for safer
  workspace setup and review of important changes before client delivery.
- Improved the side panel by grouping heavy tools into Materials, Evidence,
  Client Report, and Admin views, with debounced search rendering for smoother
  navigation.
- Expanded Ukrainian and English UI coverage across labels, dialogs, buttons,
  statuses, warnings, and export messages.
- Improved readability and accessibility with higher-contrast buttons,
  non-transparent modals, mobile/tablet responsive layout, larger touch targets,
  responsive tables, and better handling of long text in sidebars, forms, JSON,
  Markdown, and report previews.

## Security Controls

- restrictive CSP with self-hosted scripts and no network connections;
- HSTS, frame blocking, no-referrer, MIME sniffing protection, COOP, and CORP;
- sandboxed HTML and PDF previews;
- escaped user data in generated UI;
- import size, ZIP entry, expanded archive, row, column, and cell limits;
- no runtime secrets, database bindings, or object-storage bindings;
- no report data embedded in the hosted production shell;
- `noindex` and `robots.txt` protection against normal indexing.

`robots.txt` and `noindex` are privacy hints, not access control. Configure a
Cloudflare Access policy separately if the entire application interface must be
restricted to specific people. Access would protect entry to the static site;
it is not required for file storage because files never leave the browser.

## Local Use

Open this file directly in a Chromium-based browser:

```text
marketing_report_studio_v8_access_folders_fixed.html
```

Chromium is recommended for local folder access. Browser storage belongs to the
current browser profile, so use a trusted profile and clear site data on shared
devices.

## Build And Test

```bash
npm run check
```

The command runs API-disable, Worker, configuration, and UI smoke tests, then
creates the production build in `dist/`.

Future Codex work should follow the repository instructions in
[AGENTS.md](./AGENTS.md).

```text
dist/
├── index.html
├── marketing_report_studio_v8_access_folders_fixed.html
├── app.js
├── vendor/
│   └── jszip-3.10.1.min.js
├── _headers
├── favicon.svg
└── robots.txt
```

## Deployment

Cloudflare Workers Builds settings:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

No D1 database, R2 bucket, KV namespace, Access audience, environment variable,
or secret is required. See [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md).

## Limitations

- Data is not synchronized between devices or browser profiles.
- Clearing site data removes browser autosave; use exports for durable backups.
- Large files may be rejected to protect the browser from memory exhaustion.
- A client HTML export can be modified outside the application and is not a
  cryptographically immutable document.
