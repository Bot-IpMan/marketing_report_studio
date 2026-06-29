# AGENTS.md

Repository-specific instructions for future Codex work on Marketing Report Studio.

## Project Architecture

Marketing Report Studio is currently a browser-first single-page application.

- `marketing_report_studio_v8_access_folders_fixed.html` is the standalone HTML shell. It defines the layout, embeds the initial `reportData` JSON, loads the local JSZip vendor bundle, and then loads `app.js`.
- `app.js` contains almost all application behavior: report normalization, import parsing, table/chart/report rendering, local persistence, admin/client export, folder integration, CI model derivation, and UI event binding.
- `functions/api/[[path]].js` is the Cloudflare Pages Functions API fallback. In the current privacy model it intentionally returns `API_DISABLED` for all API requests.
- `worker.js` serves static assets and intentionally disables `/api/*` routes.
- `migrations/` exists for historical D1 schema work, but the current deployed app does not require D1.
- R2/file-storage assumptions may exist in older plans or docs, but current report files are processed in the browser and exported explicitly by the user. Do not reintroduce R2 or server-side report storage without an explicit task.
- `scripts/build.mjs` builds the hosted shell in `dist/`, replaces embedded report data with an empty viewer-safe report, copies `app.js` and `vendor/`, and emits strict security headers.
- `tests/` contains smoke tests for disabled API behavior, Worker routing, build/config security assumptions, and core UI markers.

## Coding Rules

- Keep patches small, focused, and reversible.
- Do not rewrite the whole HTML file or `app.js` unless the user explicitly asks for a full rewrite.
- Preserve local standalone mode: opening `marketing_report_studio_v8_access_folders_fixed.html` directly should keep working.
- Preserve the current browser-only hosted mode unless a task explicitly asks to revive cloud storage.
- Preserve any existing cloud-mode compatibility code paths when editing nearby logic, but do not add network calls, D1, R2, Access, or backend dependencies unless explicitly requested.
- Preserve `clientLocked` behavior and client-facing HTML export behavior. Client exports must remain view-only and must not expose editing controls.
- Avoid external AI/API calls unless the user explicitly requests them. Do not add API keys, secrets, analytics, telemetry, or hidden network behavior.
- Avoid breaking existing import/export flows for CSV, TSV, JSON, XLSX, Markdown, TXT, HTML, PDF, DOCX, images, admin HTML export, client HTML export, JSON export, and ZIP bundles.
- Prefer additive data-model changes with normalization/backward compatibility for older reports.
- Do not duplicate large binary/base64 file contents into new metadata structures.

## Testing Rules

- Run `npm test` when available for behavior-affecting changes.
- Run `npm run build` when available after changes that affect HTML, JS, assets, security headers, or build output.
- Run existing smoke tests rather than inventing unrelated test harnesses.
- If a test or build command fails because the environment is incomplete, report the command, the failure reason, and whether the failure appears unrelated to the patch.
- For documentation-only changes, at minimum verify the changed files exist and inspect the diff.

## Product Direction

Marketing Report Studio should evolve toward:

```text
upload materials -> auto-structure -> evidence-backed insights -> client-ready report
```

Future product work should support:

- source traceability from every claim, section, recommendation, and exported report item;
- review mode for draft, needs-review, approved, and rejected content;
- clean client export that looks like a finished report rather than an editable workspace;
- local/private operation by default;
- explicit user-controlled export of report data and source manifests.

Do not implement product features while adding or updating this instruction file. Product changes should be handled in separate, incremental patches.
