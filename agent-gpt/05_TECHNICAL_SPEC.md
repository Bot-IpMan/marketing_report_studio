# Direct GitHub technical specification

Version 1.0.0. Target repository: `Bot-IpMan/marketing_report_studio`.

## Boundary

GPT Actions use GitHub REST at `api.github.com` with a repository-scoped fine-grained PAT. There is no developer-operated gateway or product API. The app remains browser-only; the workflows are separate development infrastructure. Actions and GPT Editor integration must still be tested in the real account before declaring the agent active.

## Trust and credentials

The PAT in GPT Editor receives Contents read, Actions read/write, Pull requests read/write and Checks read. It can dispatch any workflow allowed by those GitHub grants; the OpenAPI path whitelist is not a security boundary. Owner installs `.github/workflows` and `.agent/policy.json` on `main`. The trusted helpers are checked out from the workflow's `github.sha`, and `run.py` requires that SHA to equal the current default HEAD. Task payloads are parsed as data, never executed as shell commands; validation intentionally runs candidate project code with read-only permissions.

The context/task jobs have `GITHUB_TOKEN` Contents write for `agent-data` and `agent/<id>` commits. The validation job has Contents read and `persist-credentials:false`; its product checkout can run npm scripts but has no explicit token/secrets. The separate publisher checks job steps, has Contents/Checks write and does not run candidate code. No self-hosted runner is configured.

Input paths are confined to `README.md`, the HTML shell, `app.js`, `src/`, `tests/` and `docs/`. `.github`, `.agent`, `scripts`, `vendor`, `functions`, package/deployment files, binaries and symlinks are protected from normal task writes. The owner can update these through a separate reviewed maintenance PR, outside the task workflow.

## Code and metadata branches

| Ref | Contents |
|---|---|
| `main` | Trusted workflow/policy source, project baseline |
| `agent/<task_id>` | One task branch based on the current main commit; no force push |
| `agent-data` | Orphan-rooted, generated manifests, task journals and bounded results |

The first context/task/publish write initializes `agent-data` with a root commit that has no parent from `main`. Subsequent writes use Git trees, commits and a non-force ref update. The GitHub APIs are used from a runner, so the GPT Action payload limit does not apply to internal blob transfers. Data branch visibility equals repository visibility. No user reports or credentials belong there.

Contexts: `contexts/<source_sha>/manifest.json`, `index/<page>.json`, `files/<SHA256(path)[:32]>.json`, `chunks/<path-key>/<part>.json`. A changed-only candidate snapshot is named `changed-manifest.json` and says `scope:changed_paths`. Per-part text is ≤16 KiB UTF-8; serialized chunk is ≤24 KiB, comfortably under the <100,000-character GPT Action response limit after base64/JSON. The source SHA, blob SHA, byte offsets and part order permit lossless reconstruction. Manifest `complete:false` discloses unsupported/missing files. Selected source paths exclude build output, dependencies, vendored binaries and fixtures; this is a bounded source inspection, not a promise to index every byte in the repository.

`tasks/<task_id>.json` records base/head, plan, status, latest operation, last validated SHA, last validation run, count of failures and recent job IDs. Init writes BRANCH_CREATING before the task ref; a restart can resume only after checking the real branch. Apply writes PATCH_QUEUED before a product commit. After a ref update, missing metadata is reconciled by checking the direct child parent SHA and unique `agent-task:<task_id>:<operation_id>` commit message. These refs/journals are separate transactions; an uncertain outcome is not silently retried. Data-branch non-fast-forward conflict fails for review/retry instead of discarding another writer.

## Patch rules

The plan has exactly `title`, `summary`, `allowed_files`, `steps`. Each step has `objective`, `files`, `tests`, `risk`, `done`. A task ID and operation ID are unique 32-hex strings. An apply request must name the exact task HEAD and expected Git blob SHA per path. Full content is bounded to 24 KiB; `edits` apply unique nonempty exact anchors in order. UTF-8 text only, regular `100644` files only. No deletes, renames, mode changes or binary writes.

Limits are checked against the task's original base: ≤8 modified files, ≤500 changed lines total, ≤250 changed lines in `app.js`, ≤2 MiB decoded source file. Task workflow reads both base/current source trees and creates one commit via the Git Data API. GitHub rejects a non-fast-forward ref move if another writer advanced the branch; the workflow refuses to rebase without review. The fixed task workflow input is JSON text under 40 KiB, independently checked by the helper. Input is parsed from `GITHUB_EVENT_PATH`, never interpolated into a command.

## Validation and PR

`agent-validation.yml` is dispatched with `ref:main`, `job_id`, `expected_sha` and task ID (optional for baseline). Its `run.head_sha` identifies the workflow commit; candidate code is checked out at `expected_sha`. Job names and required steps are verified through GitHub's Jobs API. The publisher writes `results/<job_id>.json`, updates the journal and creates `MRS Agent Validation` check on the candidate SHA. A successful required step may not be skipped; publisher errors mean no completed proof.

CI order: Node 24 → browser presence → `npm run build` → `npm test` → `npm run test:agent` → `npm run qa:pdf:strict` → `npm run e2e:strict`. The browser runner must actually work, not just provide a command name. A patch invalidates earlier green state. The fourth failing validation blocks correction within the task.

GPT creates a draft PR with native Pull Requests API only after exact-head success, task status REVIEW, current branch/ref and diff review. GitHub API itself cannot enforce this creation rule; protect merging with a real GitHub ruleset and required check. The PR is not a deployment. If a response or workflow dispatch is ambiguous, discover actual run/PR by unique ID and inspect the journal before another mutation.

## Operational boundaries

Metadata commits made with `GITHUB_TOKEN` do not trigger regular push workflows. The main context is generated after an owner push/merge or explicit context dispatch. Candidate validation is explicitly dispatched. On a new conversation, resume from pinned refs and task journal rather than model memory. Context generation by itself does not schedule autonomous GPT reasoning.

Cloudflare production branch is unknown until checked in Cloudflare. Existing Pages integrations may produce branch previews. The agent never calls Cloudflare deployment endpoints. A policy guard can validate paths and limits, not the semantic privacy effects of JavaScript, so PR review and targeted tests remain necessary.
