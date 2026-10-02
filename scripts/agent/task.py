"""Guarded task initialization and source commits on task-owned branches."""

from __future__ import annotations

import hashlib

from context import prepare
from core import (AgentError, apply_file_change, canonical_json, decode_source,
                  require, valid_id, valid_path, valid_sha, validate_cumulative,
                  validate_plan)


def journal_path(task_id: str) -> str:
    return f"tasks/{valid_id(task_id)}.json"


def write_journal(client, task: dict):
    return client.write_data({journal_path(task["task_id"]): task},
                             f"Record agent task {task['task_id'][:12]}: {task['status']}")


def initialize(client, request: dict, policy: dict):
    require(set(request) == {"operation", "task_id", "base_sha", "plan"}, "INVALID_INIT")
    task_id = valid_id(request["task_id"])
    base = valid_sha(request["base_sha"])
    plan = validate_plan(request["plan"], policy)
    require(client.head(policy["default_branch"]) == base, "DEFAULT_BRANCH_MOVED")
    branch = "agent/" + task_id
    existing = client.read_data(journal_path(task_id))
    if existing:
        require(existing["base_sha"] == base and existing["plan"] == plan, "TASK_ID_CONFLICT")
        if existing["status"] == "IMPLEMENT":
            require(client.head(branch) == existing["head_sha"], "TASK_BRANCH_DRIFT")
            return existing
        require(existing["status"] == "BRANCH_CREATING", "TASK_ALREADY_EXISTS")
    else:
        require(client.ref_or_none(branch) is None, "TASK_BRANCH_EXISTS")
        existing = {"version": 1, "task_id": task_id, "base_sha": base, "head_sha": base,
                    "branch": branch, "status": "BRANCH_CREATING", "plan": plan,
                    "last_operation": None, "validated_sha": None, "validation_run": None,
                    "failed_validations": 0, "validation_jobs": []}
        write_journal(client, existing)
    current = client.head(branch)
    if current is None:
        client.create_ref(branch, base)
    else:
        require(current == base, "TASK_BRANCH_DRIFT")
    existing["status"] = "IMPLEMENT"
    write_journal(client, existing)
    return existing


def source_file(client, entries: dict, path: str, policy: dict):
    entry = entries.get(path)
    if entry is None:
        return None
    require(entry["mode"] == "100644", "UNSUPPORTED_FILE_MODE")
    return decode_source(client.blob(entry["sha"]), policy)


def apply(client, request: dict, policy: dict):
    require(set(request) == {"operation", "task_id", "operation_id", "expected_head", "changes"}, "INVALID_PATCH")
    task_id = valid_id(request["task_id"])
    operation_id = valid_id(request["operation_id"])
    expected = valid_sha(request["expected_head"])
    task = client.read_data(journal_path(task_id))
    require(isinstance(task, dict), "TASK_NOT_FOUND")
    if (task["status"] == "TEST" and task["last_operation"] and
            task["last_operation"]["id"] == operation_id):
        require(task["last_operation"]["request_sha"] ==
                hashlib.sha256(canonical_json(request).encode("utf-8")).hexdigest(),
                "OPERATION_ID_REUSED")
        require(client.head(task["branch"]) == task["head_sha"], "TASK_BRANCH_DRIFT")
        return {"task_id": task_id, "branch": task["branch"],
                "head_sha": task["head_sha"], "status": "TEST"}
    require(client.head(policy["default_branch"]) == task["base_sha"], "DEFAULT_BRANCH_MOVED")
    require(task["status"] in ("IMPLEMENT", "FIX", "PATCH_QUEUED"), "TASK_NOT_EDITABLE")
    branch = task["branch"]
    require(branch == "agent/" + task_id, "INVALID_TASK_BRANCH")
    require(task["head_sha"] == expected or task["status"] == "PATCH_QUEUED", "STALE_TASK_HEAD")
    changes = request["changes"]
    require(isinstance(changes, list) and 1 <= len(changes) <= policy["max_changed_files"], "INVALID_CHANGES")
    require(len(canonical_json(request).encode("utf-8")) <= policy["max_patch_bytes"], "PATCH_TOO_LARGE")
    request_sha = hashlib.sha256(canonical_json(request).encode("utf-8")).hexdigest()
    pending = task["last_operation"]
    if task["status"] == "PATCH_QUEUED":
        require(pending and pending["id"] == operation_id and pending["request_sha"] == request_sha,
                "UNCERTAIN_PATCH_PENDING")
        require(pending["expected_head"] == expected, "STALE_TASK_HEAD")
    else:
        require(task["head_sha"] == expected, "STALE_TASK_HEAD")
        require(not pending or pending["id"] != operation_id, "OPERATION_ID_REUSED")
    current_head = client.head(branch)
    if current_head != expected:
        require(task["status"] == "PATCH_QUEUED", "TASK_BRANCH_DRIFT")
        commit = client.commit(current_head)
        require(commit["parents"] and commit["parents"][0]["sha"] == expected and
                commit["message"] == f"agent-task:{task_id}:{operation_id}", "UNCERTAIN_BRANCH_DRIFT")
        candidate = current_head
    else:
        entries = client.tree(expected)
        base_entries = client.tree(task["base_sha"])
        new_contents = {}
        for change in changes:
            require(isinstance(change, dict), "INVALID_CHANGE")
            path = valid_path(change.get("path"), policy)
            require(path in task["plan"]["allowed_files"] and path not in new_contents, "PATH_OUTSIDE_PLAN")
            entry = entries.get(path)
            actual_blob = entry["sha"] if entry else None
            claimed_blob = change.get("expected_blob_sha")
            require(claimed_blob is None or valid_sha(claimed_blob) == actual_blob, "BLOB_SHA_MISMATCH")
            require(claimed_blob == actual_blob, "BLOB_SHA_MISMATCH")
            original = source_file(client, entries, path, policy)
            new_contents[path] = apply_file_change(original, change, policy)
            require(not (path in base_entries and path not in entries), "UNEXPECTED_DELETION")
        baseline = {}
        final = {}
        for path in task["plan"]["allowed_files"]:
            baseline[path] = source_file(client, base_entries, path, policy)
            final[path] = new_contents.get(path)
            if final[path] is None:
                final[path] = source_file(client, entries, path, policy)
            if final[path] is None:
                final.pop(path)
        budget = validate_cumulative(baseline, final, policy)
        require(all(path in budget["files"] for path in new_contents), "CHANGE_REVERTED_TO_BASE")
        task["status"] = "PATCH_QUEUED"
        task["last_operation"] = {"id": operation_id, "request_sha": request_sha,
                                  "expected_head": expected}
        write_journal(client, task)
        candidate = client.new_commit(expected, new_contents,
                                      f"agent-task:{task_id}:{operation_id}")
        client.update_ref(branch, candidate)
    # The write above is intentionally separate from the journal. On a retry,
    # verify the parent and the unique commit message before reconciling it.
    prepare(client, candidate, policy, paths=[change["path"] for change in changes])
    task["head_sha"] = candidate
    task["validated_sha"] = None
    task["validation_run"] = None
    task["status"] = "TEST"
    task["last_operation"]["candidate_sha"] = candidate
    write_journal(client, task)
    return {"task_id": task_id, "branch": branch, "head_sha": candidate,
            "status": task["status"]}


def handle(client, request: object, policy: dict):
    require(isinstance(request, dict) and isinstance(request.get("operation"), str), "INVALID_REQUEST")
    if request["operation"] == "init":
        return initialize(client, request, policy)
    if request["operation"] == "apply":
        return apply(client, request, policy)
    raise AgentError("UNKNOWN_OPERATION")
