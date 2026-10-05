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


DIAGNOSTIC_CODE_RE = re.compile(r"[A-Z][A-Z0-9_]{0,79}")


def diagnostic_code(exc):
    """Return a bounded, machine-readable error code without leaking details."""

    if isinstance(exc, AgentError):
        candidate = str(exc).split(":", 1)[0].strip()
        if DIAGNOSTIC_CODE_RE.fullmatch(candidate):
            return candidate
        return "AGENT_FAILURE"

    if isinstance(exc, json.JSONDecodeError):
        return "INVALID_JSON"

    if isinstance(exc, KeyError):
        return "MISSING_REQUIRED_FIELD"

    if isinstance(exc, ValueError):
        return "INVALID_VALUE"

    return "AGENT_FAILURE"


def publish_task_failure_best_effort(exc):
    """
    Publish a sanitized task failure record to agent-data.

    Diagnostics are intentionally best-effort:
    failure to publish diagnostics must never hide or replace the
    original task failure.
    """

    try:
        # Machine-readable task diagnostics are only useful for task dispatches.
        if len(sys.argv) != 2 or sys.argv[1] != "task":
            return

        root = Path(__file__).resolve().parents[2]
        policy = json.loads((root / ".agent/policy.json").read_text())
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())

        require(
            os.environ["GITHUB_REPOSITORY"] == policy["repository"]
            and os.environ["GITHUB_REF"]
            == "refs/heads/" + policy["default_branch"],
            "UNTRUSTED_WORKFLOW_REF",
        )

        workflow_sha = valid_sha(os.environ["GITHUB_SHA"])

        inputs = event.get("inputs")
        if not isinstance(inputs, dict):
            return

        request_id = inputs.get("request_id")
        if (
            not isinstance(request_id, str)
            or re.fullmatch(r"[0-9a-f]{32}", request_id) is None
        ):
            return

        operation = "unknown"

        payload = inputs.get("payload")
        if isinstance(payload, str):
            try:
                request = json.loads(payload)
            except json.JSONDecodeError:
                request = None

            if (
                isinstance(request, dict)
                and request.get("operation") in ("init", "apply")
            ):
                operation = request["operation"]

        code = diagnostic_code(exc)

        record = {
            "version": 1,
            "request_id": request_id,
            "operation": operation,
            "result": "failure",
            "error_code": code,
            "message": code,
            "workflow_sha": workflow_sha,
            "run_id": int(os.environ["GITHUB_RUN_ID"]),
        }

        client = GitHub(policy["repository"])

        # Re-check that the trusted workflow revision still equals default HEAD.
        require(
            client.head(policy["default_branch"]) == workflow_sha,
            "TRUSTED_WORKFLOW_STALE",
        )

        client.write_data(
            {
                f"diagnostics/{request_id}.json": record,
            },
            f"agent-diagnostic:{request_id}",
        )

    except Exception:
        # Never let diagnostic publication replace the original failure.
        pass


def main():
    require(
        len(sys.argv) == 2
        and sys.argv[1] in ("context", "task", "publish"),
        "INVALID_MODE",
    )

    root = Path(__file__).resolve().parents[2]
    policy = json.loads((root / ".agent/policy.json").read_text())
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())

    require(
        os.environ["GITHUB_REPOSITORY"] == policy["repository"]
        and os.environ["GITHUB_REF"]
        == "refs/heads/" + policy["default_branch"],
        "UNTRUSTED_WORKFLOW_REF",
    )

    workflow_sha = valid_sha(os.environ["GITHUB_SHA"])
    client = GitHub(policy["repository"])

    require(
        client.head(policy["default_branch"]) == workflow_sha,
        "TRUSTED_WORKFLOW_STALE",
    )

    mode = sys.argv[1]

    if mode == "context":
        source_sha = (
            event["after"]
            if os.environ["GITHUB_EVENT_NAME"] == "push"
            else event["inputs"]["source_sha"]
        )
        source_sha = valid_sha(source_sha)

        branch = (
            policy["default_branch"]
            if os.environ["GITHUB_EVENT_NAME"] == "push"
            else event["inputs"]["source_branch"]
        )

        require(
            branch == policy["default_branch"]
            or re.fullmatch(r"agent/[0-9a-f]{32}", branch) is not None,
            "INVALID_SOURCE_BRANCH",
        )

        require(
            client.head(branch) == source_sha,
            "STALE_SOURCE_REF",
        )

        result = prepare(
            client,
            source_sha,
            policy,
        )

    elif mode == "task":
        payload = event["inputs"]["payload"]

        require(
            isinstance(payload, str)
            and len(payload.encode("utf-8"))
            <= policy["max_patch_bytes"],
            "INVALID_PAYLOAD",
        )

        request = json.loads(payload)

        require(
            isinstance(request, dict),
            "INVALID_REQUEST",
        )

        request_id = valid_id(
            event["inputs"]["request_id"]
        )

        require(
            request_id
            == request.get(
                "task_id"
                if request.get("operation") == "init"
                else "operation_id"
            ),
            "REQUEST_ID_MISMATCH",
        )

        result = handle(
            client,
            request,
            policy,
        )

    else:
        result = publish(
            client,
            policy,
            event,
            workflow_sha,
            int(os.environ["GITHUB_RUN_ID"]),
            os.environ["VALIDATE_RESULT"],
        )

    print(
        json.dumps(
            result,
            ensure_ascii=False,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    try:
        main()

    except (
        AgentError,
        KeyError,
        ValueError,
        json.JSONDecodeError,
    ) as exc:
        message = f"AGENT_ERROR: {exc}"

        print(
            message,
            file=sys.stderr,
        )

        publish_task_failure_best_effort(exc)

        summary_path = os.environ.get(
            "GITHUB_STEP_SUMMARY"
        )

        if summary_path:
            try:
                with open(
                    summary_path,
                    "a",
                    encoding="utf-8",
                ) as summary:
                    summary.write(
                        "## Agent task failure\n\n"
                    )
                    summary.write(
                        f"`{message}`\n"
                    )

            except OSError:
                pass

        sys.exit(1)
