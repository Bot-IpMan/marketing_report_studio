"""Turn trusted workflow job conclusions into a check on the candidate SHA."""

from __future__ import annotations

import re
import time

from core import AgentError, require, valid_id, valid_sha
from task import journal_path, write_journal


REQUIRED_STEPS = (
    "Checkout pinned revision", "Verify pinned revision", "Node",
    "Require browser", "Build", "Unit and smoke tests",
    "Agent guard tests",
    "Strict PDF fixtures", "Strict browser E2E",
)


def read_validate_job(client, run_id: int):
    for attempt in range(5):
        jobs = client.get(f"/actions/runs/{run_id}/jobs?per_page=20")
        matches = [job for job in jobs["jobs"] if job["name"] == "validate"]
        require(len(matches) <= 1, "AMBIGUOUS_VALIDATION_JOB")
        if matches and matches[0]["status"] == "completed":
            return matches[0]
        if attempt < 4:
            time.sleep(2)
    raise AgentError("VALIDATION_JOB_NOT_FINAL")


def publish(client, policy: dict, event: dict, workflow_sha: str, run_id: int,
            validate_result: str):
    inputs = event["inputs"]
    job_id = valid_id(inputs["job_id"])
    expected = valid_sha(inputs["expected_sha"])
    task_id = inputs.get("task_id") or ""
    if task_id:
        valid_id(task_id)
    require(client.head(policy["default_branch"]) == workflow_sha, "TRUSTED_WORKFLOW_STALE")
    run = client.get(f"/actions/runs/{run_id}")
    require(run["head_sha"] == workflow_sha and run["event"] == "workflow_dispatch", "WRONG_WORKFLOW_RUN")
    require(job_id in run.get("display_title", "") and
            expected in run.get("display_title", ""), "VALIDATION_JOB_ID_MISMATCH")
    job = read_validate_job(client, run_id)
    results = {step["name"]: step.get("conclusion") for step in job["steps"]}
    steps_ok = all(results.get(name) == "success" for name in REQUIRED_STEPS)
    result = "success" if validate_result == job["conclusion"] == "success" and steps_ok else "failure"
    note = "All required steps passed at the pinned revision." if result == "success" else "Missing or failed required validation step."
    report = {"version": 1, "job_id": job_id, "run_id": run_id,
              "workflow_sha": workflow_sha, "candidate_sha": expected,
              "task_id": task_id or None, "result": result,
              "steps": {name: results.get(name, "missing") for name in REQUIRED_STEPS},
              "run_url": run["html_url"], "message": note}
    task = None
    if task_id:
        task = client.read_data(journal_path(task_id))
        require(task and task["status"] == "TEST" and task["head_sha"] == expected,
                "STALE_TASK_VALIDATION")
        require(client.head(task["branch"]) == expected, "TASK_BRANCH_DRIFT")
        require(job_id not in task["validation_jobs"], "DUPLICATE_VALIDATION_JOB")
    else:
        require(client.head(policy["default_branch"]) == expected, "STALE_BASELINE_VALIDATION")
    if task:
        task["validation_jobs"].append(job_id)
        task["validation_jobs"] = task["validation_jobs"][-8:]
        task["validation_run"] = run_id
        if result == "success":
            task["validated_sha"] = expected
            task["status"] = "REVIEW"
        else:
            task["validated_sha"] = None
            task["failed_validations"] += 1
            task["status"] = "FIX" if task["failed_validations"] < 4 else "BLOCKED"
        client.write_data({journal_path(task_id): task, f"results/{job_id}.json": report},
                          f"Agent validation {job_id[:12]}: {result}")
    else:
        client.write_data({f"results/{job_id}.json": report},
                          f"Agent baseline validation {job_id[:12]}: {result}")
    # GITHUB_TOKEN is an installation token of GitHub Actions. It may create
    # check runs when this separate job has checks: write.
    client.post("/check-runs", {
        "name": "MRS Agent Validation", "head_sha": expected,
        "status": "completed", "conclusion": result,
        "external_id": job_id, "details_url": run["html_url"],
        "output": {"title": f"Agent validation: {result}",
                   "summary": f"Candidate {expected}; workflow {workflow_sha}; run {run_id}. {note}"},
    })
    return report
