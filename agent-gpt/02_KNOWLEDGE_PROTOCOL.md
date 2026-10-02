# Protocol for the direct GitHub agent

This file supplements Instructions. It is a versioned guide, not live repository truth. User authorization and platform policy → current scoped `AGENTS.md` guidance → pinned source/tests/config → GitHub runs/PRs → this guide.

## Read consistency

1. `getMainRef`: pin a full main SHA. `getGitCommit` returns its tree SHA. `getGitTree` reads a tree; if GitHub sets `truncated`, recurse into subtrees or state the gap. `readSmallFileOrContextPart` requires a SHA in `ref`.
2. Read `AGENTS.md`, `README.md`, `package.json`, affected sources and relevant tests/config. The HTML shell contains embedded data and exceeds a safe whole-file Contents response; prefer prepared context.
3. `getAgentDataRef`: pin its own SHA separately. At that ref read `contexts/<main SHA>/manifest.json`. Follow `index_pages` → `file_manifest` → `chunks` for relevant paths. Decode base64 at every Contents response. Chunk JSON has `source_sha`, `path`, `blob_sha`, `part`, `total_parts`, `byte_start/end`, `line_start/end`, `text`.
4. Confirm parts 0…N-1 without gaps, contiguous byte offsets, encoded byte count and file size. Mark missing/skipped files and stale contexts. `changed-manifest.json` for a candidate covers changed paths only; combine with the pinned main context for unchanged code. Never claim a complete new candidate audit from a changed-only manifest.
5. The source SHA and pinned `agent-data` SHA serve different purposes. A new main head requires a new decision; do not silently mix branches.

GitHub's Contents endpoint has no line-range option. In particular, `start_line`, `limit`, `max_chars` and the old `/v1/*` gateway operations do not exist on `api.github.com`.

## Findings and impact

| Classification | Meaning |
|---|---|
| CONFIRMED | Exact code/config or reproduced runtime/test fact; state which |
| LIKELY | Strong evidence, runtime proof still needed |
| POSSIBLE | Hypothesis with a concrete test |
| IDEA | Improvement, never describe as an existing defect |

Use P0 for serious data loss/security, P1 for significant breakage or architecture risk, P2 for maintainability/UX/performance, P3 for optional polish. A finding must cite the current SHA, path and location/test; give impact and verification. Inspect import, normalized tables, charts, preview, export/storage and browser modes when the change touches their data flow. A partial view is not a full project audit.

## Exact task request contracts

Generate fresh random 32-character lowercase hex identifiers for `task_id`, `operation_id` and `job_id`. The following values are examples only:

```json
{
  "ref": "main",
  "inputs": {
    "request_id": "11111111111111111111111111111111",
    "payload": "{\"operation\":\"init\",\"task_id\":\"11111111111111111111111111111111\",\"base_sha\":\"FULL_40_HEX_SHA\",\"plan\":{\"title\":\"Small change\",\"summary\":\"Reason and desired behavior\",\"allowed_files\":[\"README.md\"],\"steps\":[{\"objective\":\"Clarify instructions\",\"files\":[\"README.md\"],\"tests\":[\"npm test\"],\"risk\":\"Documentation drift\",\"done\":\"Accurate instructions\"}]}}"
  }
}
```

`payload` is a **JSON string**, not a nested object. Replace all examples with actual data. `base_sha` must equal the live default HEAD and the plan must have only `title`, `summary`, `allowed_files`, `steps` keys. Each step has exactly `objective`, `files`, `tests`, `risk`, `done`. `allowed_files` max 8, plan max 12 KiB; paths from `.agent/policy.json` only. Unique `request_id=task_id` for init; `request_id=operation_id` for apply. The workflow reads event JSON as data, never as a shell command.

Apply payload inside the same dispatch envelope:

```json
{
  "operation": "apply",
  "task_id": "11111111111111111111111111111111",
  "operation_id": "22222222222222222222222222222222",
  "expected_head": "FULL_40_HEX_TASK_BRANCH_SHA",
  "changes": [{
    "path": "app.js",
    "expected_blob_sha": "FULL_40_HEX_GIT_BLOB_SHA",
    "edits": [{"old": "unique exact old fragment", "new": "small replacement"}]
  }]
}
```

For new small text files, use `expected_blob_sha:null` plus `content`. Existing files ≤24 KiB may also use `content`; larger files require unique exact anchors. Inputs are below 40 KiB UTF-8. The workflow checks path, regular-file mode, head/blob SHA, presence in the persisted plan and cumulative task-base diff. Task status is stored at `tasks/<task_id>.json` in `agent-data`.

| Journal state | Action |
|---|---|
| BRANCH_CREATING | Inspect journal and ref; re-dispatch same init only after reconciliation |
| IMPLEMENT | Apply a planned patch |
| PATCH_QUEUED | Inspect branch and journal; retry only the identical operation after confirming it is pending |
| TEST | Dispatch strict candidate validation |
| FIX | Diagnose and apply a correction within budget |
| REVIEW | Check exact-head green, review changes, optionally create draft PR |
| BLOCKED | Explain conflict/failures; do not bypass a guard |

If a `workflow_dispatch` response has a `workflow_run_id`, poll it. If it is empty but accepted, find the uniquely named workflow run by `display_title` and request/job ID. Cancelled/queued runs must be reported; never equate dispatch acceptance with successful work. `agent-context` generated snapshots may require time to appear on `agent-data`.

## Validation evidence

Dispatch validation from `main` with `job_id`, `expected_sha` and `task_id` (omit task ID for baseline). Read workflow run and jobs. The trusted workflow SHA is `run.head_sha`; the tested SHA is `expected_sha` and the runner-verified checkout. The separate publisher writes `results/<job_id>.json`, updates the task journal and creates `MRS Agent Validation` check on the candidate SHA. Require all three: successful underlying test steps, a fresh successful report/journal and the exact check SHA. Missing browser, skipped steps and failed publish are failures.

The branch is updated by GitHub Actions `GITHUB_TOKEN`, which does not automatically trigger ordinary push-based validation; explicitly dispatch it. Failure correction limit is 3, then BLOCKED on a fourth failed validation. Data-branch journal and product branch are separate Git histories; on an interrupted write compare real refs, commit parent/message, task journal and run before retry.

PR mode searches existing open PRs before native `createDraftTaskPR`. A PR can be created with a token independently of the green workflow, so obey exact-head checks and branch rules. Do not claim merge, deployment or automatic background model work.

## Privacy and security

The product runtime still runs in the user's browser and does not upload report data. This developer workflow exchanges chosen repository text and test summaries between ChatGPT and GitHub. Use synthetic fixtures; never place tokens, real client reports or private data in source chunks, task plans, workflow inputs or PR bodies. `agent-data` has the same visibility as the repository. A policy file and size checks cannot prove a semantic privacy claim; examine the diff and user flows.
