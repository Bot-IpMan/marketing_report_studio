# Verification matrix and installation gates

This document describes what to run and how to interpret it. It does **not** declare that a remote workflow or GPT Editor test has passed. Update results after each real run with SHA and run URL.

| Stage | Check | Passing evidence | Failure to catch |
|---|---|---|---|
| Source | `npm run build` then `npm test` | Commands exit 0, hosted assets checked after build | Generated dist stale; disabled API or imports broken |
| Guarded code | `npm run test:agent` | Actual Python contract tests exit 0 | Large chunks damaged; ambiguous anchor, SHA/path/budget bypass, interrupted metadata, skipped CI success |
| PDF | `npm run qa:pdf:strict` | Four committed fixtures parsed as specified | Missing native parser falsely marked pass |
| Browser | `npm run e2e:strict` | Real usable Chromium/Chrome runs the E2E path | SKIPPED fallback falsely marked pass |
| Bundle | `python3 agent-gpt/validate_bundle.py` | Parses schema, checks unique operations, fixed endpoints, size and plan shape | Stale gateway URLs or malformed local config |
| GitHub setup | All three workflows on current `main` and active | Read-only GitHub API response at latest SHA | Local files mistaken for installed workflows |
| Context | `Agent Context` run + `agent-data` manifest | File parts reconstruct current `app.js` SHA and exact bytes | Truncation, wrong revision or missing parts |
| Execute | One specific small authorized task | One `agent/<id>` branch commit and matching journal | Protected path or duplicate operation mutates code |
| CI | Candidate validation and publisher | Required steps all success, current journal REVIEW, same-SHA successful check | Stale, missing browser, publisher failure |
| PR | Native PR API after full CI | Exactly one draft PR, matching branch/head/base | Duplicate PR or default branch write |

The validator requires PyYAML in its local Python environment; if missing, that gate is **not run**, not successful. Browser strict QA requires an actual browser and cannot be replaced by mock unit tests. Record environment-related failures as failures/unknown with evidence, not as a pass.

Expected refusal tests: malformed or over-40-KiB payload, plan outside allowlist, stale main/head/blob SHA, `..`/symlink/protected path, repeated anchor, >8 files, >500 changed lines, >250 app.js lines, fourth failed validation, another writer advancing the ref, cancelled workflow, missing context or missing token. A GitHub run must prove actual REST permissions, authentication, GitHub Actions environment and branch rules; local fakes alone cannot.

Full workflow sequence: owner review/bootstrap → install on default branch → context run → private GPT editor schema import and token configuration → read-only analysis → small explicitly authorized task → exact-head strict validation → draft PR. Keep run IDs, SHA, final file list and failures in the review record. Cloudflare deploy is outside this validation and requires separately known production settings.
