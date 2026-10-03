# Marketing Report Studio — dated project baseline

Prepared 2026-10-03. Repo: `Bot-IpMan/marketing_report_studio`. This is dated orientation for a GPT, not a substitute for reading current GitHub source and CI at a pinned commit.

At the last verified remote inspection, default `main` pointed to `c1cf72cf3f0969bc80af573c2f394e6a26619487`, the merge commit for PR #8 (`Agent/direct GitHub bootstrap`). The direct GitHub agent workflows, policy, helpers and `agent-gpt/` bundle were therefore present on remote `main`, not merely on a local preparation branch. Refresh the repository ref, tree, workflows and results before every task because this SHA becomes historical after the next merge.

## Verified agent readiness at this snapshot

- `Agent Context` run `37034236268` completed successfully for the pinned `main` SHA.
- `agent-data` pointed to `7c51252171e95af0826d075e7e86a8be997b8554`.
- `contexts/c1cf72cf3f0969bc80af573c2f394e6a26619487/manifest.json` reported `complete:true` and `file_count:57` with two index pages and no skipped files.
- No `tasks/*` or `results/*` records existed, so a real task dispatch, strict candidate validation, exact-SHA check and draft PR had **not** yet been proven end to end.
- The repository rulesets API returned no rulesets. Legacy branch-protection state could not be confirmed with the available integration permission. Add the `main` ruleset only after the first successful baseline validation exposes the exact required check identity.
- GPT Editor schema import, protected PAT configuration and GPT-side action calls were not verified by repository inspection.

## Product architecture

The main UI is the standalone `marketing_report_studio_v8_access_folders_fixed.html` shell plus `app.js` and `src/core`, `src/features`, `src/workers/analysis.worker.js`. Browser modules implement imports, table detection, charts, preview, exports and storage. PDF.js and JSZip are self-hosted under `vendor`. This is a browser-first SPA: file content and working reports stay in browser memory, IndexedDB or localStorage; users transfer data with explicit HTML/JSON/ZIP export-import.

Target flow: **Upload files → structure tables → visualize → preview → export a simple client report.** Advanced/Labs and legacy compatibility are not default product directions. Preserve local standalone file:// and hosted HTTP modes, admin and clientLocked view-only exports, and import of CSV/TSV/JSON/XLSX/Markdown/TXT/HTML/PDF/DOCX/images.

`npm run build` runs `scripts/build.mjs`: it recreates `dist/`, substitutes empty hosted report data, copies browser assets and creates security headers. Do not edit generated `dist/`. `npm test` runs smoke and feature checks. Ordinary `npm run e2e` can report SKIPPED without a usable browser; `npm run e2e:strict` must run the browser. The new `npm run test:agent` checks development agent policy and workflow helpers. Node 24 is used in the proposed GitHub CI.

Cloudflare Pages hosts the static site at `https://mrsai.lookdata.live/` according to prior repository configuration and the user's architecture description. `/api/*` is intentionally disabled by Worker/Pages fallback. Production is browser-only and does not require product D1/R2/KV/API persistence. `worker.js` and `wrangler.toml` remain compatibility configuration. GitHub `main` being default does not determine the Pages production branch. Prior attempts to inspect public HTTP responses from the earlier environment failed at a network proxy; do not report live status or headers based only on config.

## Developer agent boundary

The three `.github/workflows/agent-*.yml` and `scripts/agent/` are a GitHub-based development mechanism, not code loaded by the production UI. `agent-data` contains generated source context and technical status, not product customer data. The GPT's GitHub token goes only in Actions Authentication. A CI run and a saved plan do not themselves merge or deploy the application.

App files were about 939 kB for `app.js` and 72 kB for the standalone HTML at this inspection. The GPT Action response limit makes app.js unsuitable for a whole Contents read; use the SHA-pinned chunk manifest. Always remeasure if file sizes change.

Before a task, pin current main, read current AGENTS.md/README/package/config and relevant code; verify workflow and data-branch state. A locally passing check is not a GitHub run. A missing browser is not strict E2E success. Use real SHA/test evidence and distinguish inspected behavior from a reproduced failure.
