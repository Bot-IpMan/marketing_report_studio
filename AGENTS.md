# AGENTS.md

Repository-specific instructions for future Codex work on Marketing Report Studio.

## Project Architecture

Marketing Report Studio is a browser-first single-page application.

- `marketing_report_studio_v8_access_folders_fixed.html` is the standalone HTML shell. It defines the simple 3-zone layout, embeds the initial `reportData` JSON, loads extracted browser modules, and then loads `app.js`.
- `app.js` contains almost all application behavior: report normalization, import parsing, summary cards, auto charts, table/file preview, local persistence, simple export, folder integration, and UI event binding.
- `functions/api/[[path]].js` is the Cloudflare Pages Functions API fallback. It intentionally returns `API_DISABLED` for API requests.
- `worker.js` serves static assets and intentionally disables `/api/*` routes.
- `migrations/` exists for historical D1 schema work, but the current deployed app does not require D1.
- `scripts/build.mjs` builds the hosted shell in `dist/`, replaces embedded report data with an empty simple workspace report, copies `app.js`, `src/`, and `vendor/`, and emits strict security headers.
- `tests/` contains smoke tests for disabled API behavior, Worker routing, build/config security assumptions, the simple UI, and browser E2E behavior.

## Coding Rules

- Keep patches small, focused, and reversible.
- Do not rewrite the whole HTML file or `app.js` unless the user explicitly asks for a full rewrite.
- Preserve local standalone mode: opening `marketing_report_studio_v8_access_folders_fixed.html` directly should keep working.
- Preserve browser-only hosted mode unless a task explicitly asks to revive cloud storage.
- Do not add network calls, D1, R2, Access, backend persistence, analytics, telemetry, secrets, or hidden data collection unless explicitly requested.
- Avoid external AI/API calls unless the user explicitly requests them.
- Preserve `clientLocked` behavior and client-facing HTML export behavior. Client exports must remain view-only and must not expose editing controls.
- Avoid breaking imports and exports for CSV, TSV, JSON, XLSX, Markdown, TXT, HTML, PDF, DOCX, images, admin HTML export, client HTML export, JSON export, and ZIP bundles.
- Prefer additive data-model changes with normalization/backward compatibility for older reports.
- Do not duplicate large binary/base64 file contents into new metadata structures.

## Testing Rules

- Run `npm test` when available for behavior-affecting changes.
- Run `npm run build` when available after changes that affect HTML, JS, assets, security headers, or build output.
- Run `npm run e2e` after workflow/UI changes; it should pass or skip only when no browser is available.
- Run existing smoke tests rather than inventing unrelated test harnesses.
- If a test or build command fails because the environment is incomplete, report the command, the failure reason, and whether the failure appears unrelated to the patch.

## Product Direction

Marketing Report Studio should stay simple and reliable:

```text
Upload files -> auto-structure tables -> visualize -> preview files -> export simple client report
```

Default product work should support:

- importing CSV/XLSX/JSON tables and common document/image files;
- automatic summary cards and rule-based charts from detected table columns;
- table preview with search, filters, sorting, column controls, and row details;
- a right-side project tree that handles hundreds of files without silently hiding them;
- local/private operation by default;
- explicit user-controlled export of report data and source/file manifests;
- clean client export that looks like a finished report rather than an editable workspace.

Do not continue the older complex direction by default. Evidence cards, Source
Registry, AI, governance, audit packages, onboarding flows, competitor profiles,
pricing matrices, and enterprise review workflows are Advanced/Labs or legacy
compatibility only unless the user explicitly asks for them.
