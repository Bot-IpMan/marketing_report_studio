"""Entry point for fixed, trusted GitHub Actions workflows."""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from context import prepare
from core import AgentError, require, valid_id, valid_sha
from github import GitHub
from publish import publish
from task import handle


def main():
    require(len(sys.argv) == 2 and sys.argv[1] in ("context", "task", "publish"), "INVALID_MODE")
    root = Path(__file__).resolve().parents[2]
    policy = json.loads((root / ".agent/policy.json").read_text())
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    require(os.environ["GITHUB_REPOSITORY"] == policy["repository"] and
            os.environ["GITHUB_REF"] == "refs/heads/" + policy["default_branch"], "UNTRUSTED_WORKFLOW_REF")
    workflow_sha = valid_sha(os.environ["GITHUB_SHA"])
    client = GitHub(policy["repository"])
    require(client.head(policy["default_branch"]) == workflow_sha, "TRUSTED_WORKFLOW_STALE")
    mode = sys.argv[1]
    if mode == "context":
        source_sha = event["after"] if os.environ["GITHUB_EVENT_NAME"] == "push" else event["inputs"]["source_sha"]
        source_sha = valid_sha(source_sha)
        branch = policy["default_branch"] if os.environ["GITHUB_EVENT_NAME"] == "push" else event["inputs"]["source_branch"]
        require(branch == policy["default_branch"] or
                re.fullmatch(r"agent/[0-9a-f]{32}", branch) is not None, "INVALID_SOURCE_BRANCH")
        require(client.head(branch) == source_sha, "STALE_SOURCE_REF")
        result = prepare(client, source_sha, policy)
    elif mode == "task":
        payload = event["inputs"]["payload"]
        require(isinstance(payload, str) and len(payload.encode("utf-8")) <= policy["max_patch_bytes"], "INVALID_PAYLOAD")
        request = json.loads(payload)
        require(isinstance(request, dict), "INVALID_REQUEST")
        request_id = valid_id(event["inputs"]["request_id"])
        require(request_id == request.get("task_id" if request.get("operation") == "init" else "operation_id"),
                "REQUEST_ID_MISMATCH")
        result = handle(client, request, policy)
    else:
        result = publish(client, policy, event, workflow_sha,
                         int(os.environ["GITHUB_RUN_ID"]), os.environ["VALIDATE_RESULT"])
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (AgentError, KeyError, ValueError, json.JSONDecodeError) as exc:
        print(f"AGENT_ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
