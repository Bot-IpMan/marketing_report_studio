"""Contract tests for the code that actually guards GitHub-side mutations."""

import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts/agent"))

from context import prepare  # noqa: E402
from core import AgentError, apply_file_change, canonical_json, chunk_text, git_blob_sha, validate_cumulative, validate_plan  # noqa: E402
from publish import REQUIRED_STEPS, publish  # noqa: E402
from run import diagnostic_code  # noqa: E402
from task import handle, journal_path  # noqa: E402


POLICY = json.loads((ROOT / ".agent/policy.json").read_text())
BASE_SHA = "a" * 40
TASK_ID = "b" * 32
OP_ID = "c" * 32


class FakeGitHub:
    def __init__(self, files):
        self.refs = {"main": BASE_SHA}
        self.blobs = {}
        self.commits = {
            BASE_SHA: {
                "message": "base",
                "parents": [],
                "tree": {},
            }
        }

        for path, content in files.items():
            self._add_file(BASE_SHA, path, content)

        self.data = {}
        self.writes = 0
        self.fail_write_number = None
        self.checks = []
        self.run = None

    def _add_file(self, sha, path, content):
        raw = content.encode()
        blob_sha = git_blob_sha(raw)

        self.blobs[blob_sha] = raw
        self.commits[sha]["tree"][path] = {
            "path": path,
            "mode": "100644",
            "type": "blob",
            "sha": blob_sha,
        }

    def head(self, branch):
        return self.refs.get(branch)

    def ref_or_none(self, branch):
        return (
            {"object": {"sha": self.refs[branch]}}
            if branch in self.refs
            else None
        )

    def create_ref(self, branch, sha):
        if branch in self.refs:
            raise AssertionError("already exists")

        self.refs[branch] = sha

    def update_ref(self, branch, sha):
        if self.commits[sha]["parents"][0]["sha"] != self.refs[branch]:
            raise AgentError("NON_FAST_FORWARD")

        self.refs[branch] = sha

    def commit(self, sha):
        return self.commits[sha]

    def tree(self, sha):
        return copy.deepcopy(
            self.commits[sha]["tree"]
        )

    def blob(self, sha):
        return self.blobs[sha]

    def new_commit(
        self,
        parent,
        files,
        message,
    ):
        sha = hashlib.sha1(
            (
                parent
                + canonical_json(files)
                + message
            ).encode()
        ).hexdigest()

        self.commits[sha] = {
            "message": message,
            "parents": [{"sha": parent}],
            "tree": copy.deepcopy(
                self.commits[parent]["tree"]
            ),
        }

        for path, text in files.items():
            self._add_file(
                sha,
                path,
                text,
            )

        return sha

    def write_data(
        self,
        files,
        message,
    ):
        self.writes += 1

        if self.writes == self.fail_write_number:
            raise AgentError(
                "SIMULATED_METADATA_INTERRUPTION"
            )

        self.data.update(
            copy.deepcopy(files)
        )

        return hashlib.sha1(
            canonical_json(
                self.data
            ).encode()
        ).hexdigest()

    def read_data(
        self,
        path,
    ):
        return copy.deepcopy(
            self.data.get(path)
        )

    def get(
        self,
        path,
    ):
        if path == "/actions/runs/42":
            return self.run

        if (
            path
            == "/actions/runs/42/jobs?per_page=20"
        ):
            return {
                "jobs": [
                    {
                        "name": "validate",
                        "status": "completed",
                        "conclusion": self.run[
                            "conclusion"
                        ],
                        "steps": self.run[
                            "steps"
                        ],
                    }
                ]
            }

        raise AssertionError(path)

    def post(
        self,
        path,
        body,
    ):
        if path != "/check-runs":
            raise AssertionError(path)

        self.checks.append(body)


def plan(
    paths=("README.md",),
):
    return {
        "title": "Small change",
        "summary": (
            "Improve an existing source comment."
        ),
        "allowed_files": list(paths),
        "steps": [
            {
                "objective": "Clarify text",
                "files": list(paths),
                "tests": ["npm test"],
                "risk": "Existing callers",
                "done": "Behavior is preserved",
            }
        ],
    }


def init(
    client,
    paths=("README.md",),
):
    return handle(
        client,
        {
            "operation": "init",
            "task_id": TASK_ID,
            "base_sha": BASE_SHA,
            "plan": plan(paths),
        },
        POLICY,
    )


def patch(
    client,
    head=BASE_SHA,
    old="original",
    new="replacement",
    op=OP_ID,
):
    current = client.tree(
        head
    )["README.md"]["sha"]

    return {
        "operation": "apply",
        "task_id": TASK_ID,
        "operation_id": op,
        "expected_head": head,
        "changes": [
            {
                "path": "README.md",
                "expected_blob_sha": current,
                "edits": [
                    {
                        "old": old,
                        "new": new,
                    }
                ],
            }
        ],
    }


class AgentToolsTest(
    unittest.TestCase
):
    def test_diagnostic_code_is_sanitized(
        self,
    ):
        self.assertEqual(
            diagnostic_code(
                AgentError(
                    "ANCHOR_NOT_UNIQUE"
                )
            ),
            "ANCHOR_NOT_UNIQUE",
        )

        self.assertEqual(
            diagnostic_code(
                AgentError(
                    "GITHUB_HTTP_403: "
                    "/git/refs/heads/main"
                )
            ),
            "GITHUB_HTTP_403",
        )

        self.assertEqual(
            diagnostic_code(
                AgentError(
                    "unsafe details: "
                    "private source text"
                )
            ),
            "AGENT_FAILURE",
        )

        self.assertEqual(
            diagnostic_code(
                json.JSONDecodeError(
                    "bad",
                    "{}",
                    0,
                )
            ),
            "INVALID_JSON",
        )

        self.assertEqual(
            diagnostic_code(
                KeyError("payload")
            ),
            "MISSING_REQUIRED_FIELD",
        )

        self.assertEqual(
            diagnostic_code(
                ValueError("bad value")
            ),
            "INVALID_VALUE",
        )

    def test_diagnostic_code_is_bounded(
        self,
    ):
        code = diagnostic_code(
            AgentError(
                "A" * 500
            )
        )

        self.assertEqual(
            code,
            "AGENT_FAILURE",
        )

        self.assertLessEqual(
            len(code),
            80,
        )

    def test_real_large_file_reassembles_exactly_with_bounded_chunks(
        self,
    ):
        source = (
            ROOT / "app.js"
        ).read_bytes()

        self.assertGreater(
            len(source),
            900000,
        )

        client = FakeGitHub(
            {
                "app.js": source.decode(),
                "README.md": "original\n",
            }
        )

        result = prepare(
            client,
            BASE_SHA,
            POLICY,
        )

        self.assertTrue(
            result["complete"]
        )

        manifest = next(
            value
            for value in client.data.values()
            if isinstance(value, dict)
            and value.get("path") == "app.js"
            and "chunks" in value
        )

        parts = [
            client.data[path]
            for path in manifest["chunks"]
        ]

        self.assertGreater(
            len(parts),
            50,
        )

        self.assertEqual(
            "".join(
                part["text"]
                for part in parts
            ).encode(),
            source,
        )

        self.assertEqual(
            parts[-1]["byte_end"],
            len(source),
        )

        self.assertEqual(
            manifest["blob_sha"],
            git_blob_sha(source),
        )

        self.assertTrue(
            all(
                len(
                    canonical_json(
                        part
                    ).encode()
                )
                < 24576
                for part in parts
            )
        )

    def test_utf8_crlf_and_long_line_chunk_boundaries(
        self,
    ):
        source = (
            "Ї\r\n"
            + "а" * 40000
            + "\r\nкінець"
        )

        parts = list(
            chunk_text(
                source,
                16384,
            )
        )

        self.assertEqual(
            "".join(
                p["text"]
                for p in parts
            ),
            source,
        )

        self.assertTrue(
            all(
                len(
                    p["text"].encode()
                )
                <= 16384
                for p in parts
            )
        )

        self.assertEqual(
            parts[-1]["byte_end"],
            len(
                source.encode()
            ),
        )

        self.assertEqual(
            parts[1]["line_start"],
            parts[0]["line_end"],
        )

    def test_init_patch_recovery_and_explicit_replay(
        self,
    ):
        client = FakeGitHub(
            {
                "README.md": (
                    "original\n"
                )
            }
        )

        init(client)

        request = patch(client)

        client.fail_write_number = 4

        with self.assertRaisesRegex(
            AgentError,
            "SIMULATED",
        ):
            handle(
                client,
                request,
                POLICY,
            )

        head = client.head(
            "agent/" + TASK_ID
        )

        self.assertNotEqual(
            head,
            BASE_SHA,
        )

        self.assertEqual(
            client.read_data(
                journal_path(
                    TASK_ID
                )
            )["status"],
            "PATCH_QUEUED",
        )

        client.fail_write_number = None

        result = handle(
            client,
            request,
            POLICY,
        )

        self.assertEqual(
            result["head_sha"],
            head,
        )

        self.assertEqual(
            result["status"],
            "TEST",
        )

        self.assertEqual(
            handle(
                client,
                request,
                POLICY,
            ),
            result,
        )

        self.assertEqual(
            client.blob(
                client.tree(
                    head
                )["README.md"]["sha"]
            ),
            b"replacement\n",
        )

        self.assertEqual(
            client.read_data(
                journal_path(
                    TASK_ID
                )
            )["validated_sha"],
            None,
        )

        self.assertIn(
            (
                f"contexts/{head}/"
                "changed-manifest.json"
            ),
            client.data,
        )

    def test_wrong_blob_ambiguous_anchor_and_protected_path_block(
        self,
    ):
        client = FakeGitHub(
            {
                "README.md": (
                    "original\n"
                    "original\n"
                )
            }
        )

        init(client)

        with self.assertRaisesRegex(
            AgentError,
            "ANCHOR_NOT_UNIQUE",
        ):
            handle(
                client,
                patch(client),
                POLICY,
            )

        request = patch(
            client,
            old=(
                "original\n"
                "original"
            ),
            new="safe",
        )

        request[
            "changes"
        ][0][
            "expected_blob_sha"
        ] = "0" * 40

        with self.assertRaisesRegex(
            AgentError,
            "BLOB_SHA_MISMATCH",
        ):
            handle(
                client,
                request,
                POLICY,
            )

        request[
            "changes"
        ][0][
            "path"
        ] = (
            ".github/workflows/"
            "agent-task.yml"
        )

        with self.assertRaisesRegex(
            AgentError,
            "PROTECTED_PATH",
        ):
            handle(
                client,
                request,
                POLICY,
            )

        self.assertEqual(
            client.head(
                "agent/" + TASK_ID
            ),
            BASE_SHA,
        )

    def test_rejects_symlinks_and_external_branch_advancement(
        self,
    ):
        client = FakeGitHub(
            {
                "README.md": (
                    "original\n"
                )
            }
        )

        init(client)

        client.commits[
            BASE_SHA
        ]["tree"][
            "README.md"
        ]["mode"] = "120000"

        with self.assertRaisesRegex(
            AgentError,
            "UNSUPPORTED_FILE_MODE",
        ):
            handle(
                client,
                patch(client),
                POLICY,
            )

        client.commits[
            BASE_SHA
        ]["tree"][
            "README.md"
        ]["mode"] = "100644"

        client.refs[
            "agent/" + TASK_ID
        ] = "e" * 40

        with self.assertRaisesRegex(
            AgentError,
            "TASK_BRANCH_DRIFT",
        ):
            handle(
                client,
                patch(client),
                POLICY,
            )

    def test_plan_and_cumulative_budget(
        self,
    ):
        with self.assertRaisesRegex(
            AgentError,
            "PROTECTED_PATH",
        ):
            validate_plan(
                plan(
                    (
                        "scripts/build.mjs",
                    )
                ),
                POLICY,
            )

        with self.assertRaisesRegex(
            AgentError,
            "APP_LINE_BUDGET_EXCEEDED",
        ):
            validate_cumulative(
                {
                    "app.js": "",
                },
                {
                    "app.js": (
                        "x\n" * 251
                    ),
                },
                POLICY,
            )

        with self.assertRaisesRegex(
            AgentError,
            "LINE_BUDGET_EXCEEDED",
        ):
            validate_cumulative(
                {
                    "src/a.js": "",
                },
                {
                    "src/a.js": (
                        "x\n" * 501
                    ),
                },
                POLICY,
            )

        with self.assertRaisesRegex(
            AgentError,
            "FULL_REWRITE_TOO_LARGE",
        ):
            apply_file_change(
                "a" * 30000,
                {
                    "path": "app.js",
                    "expected_blob_sha": (
                        "0" * 40
                    ),
                    "content": "b",
                },
                POLICY,
            )

    def test_publisher_attaches_result_to_candidate_sha(
        self,
    ):
        client = FakeGitHub(
            {
                "README.md": (
                    "original\n"
                )
            }
        )

        init(client)

        result = handle(
            client,
            patch(client),
            POLICY,
        )

        candidate = result[
            "head_sha"
        ]

        job_id = "d" * 32

        client.run = {
            "display_title": (
                f"agent-{job_id}-"
                f"{candidate}"
            ),
            "head_sha": BASE_SHA,
            "event": (
                "workflow_dispatch"
            ),
            "html_url": (
                "https://github.com/"
                "example/run/42"
            ),
            "conclusion": "success",
            "steps": [
                {
                    "name": name,
                    "conclusion": (
                        "success"
                    ),
                }
                for name in REQUIRED_STEPS
            ],
        }

        report = publish(
            client,
            POLICY,
            {
                "inputs": {
                    "job_id": job_id,
                    "expected_sha": (
                        candidate
                    ),
                    "task_id": TASK_ID,
                }
            },
            BASE_SHA,
            42,
            "success",
        )

        self.assertEqual(
            report["result"],
            "success",
        )

        self.assertEqual(
            client.checks[-1][
                "head_sha"
            ],
            candidate,
        )

        self.assertEqual(
            client.read_data(
                journal_path(
                    TASK_ID
                )
            )["status"],
            "REVIEW",
        )

        self.assertEqual(
            client.read_data(
                journal_path(
                    TASK_ID
                )
            )["validated_sha"],
            candidate,
        )

    def test_publisher_does_not_pass_a_skipped_browser(
        self,
    ):
        client = FakeGitHub(
            {
                "README.md": (
                    "original\n"
                )
            }
        )

        init(client)

        candidate = handle(
            client,
            patch(client),
            POLICY,
        )["head_sha"]

        job_id = "d" * 32

        client.run = {
            "display_title": (
                f"agent-{job_id}-"
                f"{candidate}"
            ),
            "head_sha": BASE_SHA,
            "event": (
                "workflow_dispatch"
            ),
            "html_url": (
                "https://github.com/"
                "example/run/42"
            ),
            "conclusion": "success",
            "steps": [
                {
                    "name": name,
                    "conclusion": (
                        "skipped"
                        if name
                        == "Strict browser E2E"
                        else "success"
                    ),
                }
                for name in REQUIRED_STEPS
            ],
        }

        report = publish(
            client,
            POLICY,
            {
                "inputs": {
                    "job_id": job_id,
                    "expected_sha": (
                        candidate
                    ),
                    "task_id": TASK_ID,
                }
            },
            BASE_SHA,
            42,
            "success",
        )

        self.assertEqual(
            report["result"],
            "failure",
        )

        self.assertEqual(
            client.checks[-1][
                "conclusion"
            ],
            "failure",
        )

        self.assertEqual(
            client.read_data(
                journal_path(
                    TASK_ID
                )
            )["status"],
            "FIX",
        )

    def test_four_failures_block_corrections(
        self,
    ):
        client = FakeGitHub(
            {
                "README.md": (
                    "original\n"
                )
            }
        )

        init(client)

        old = "original"
        head = BASE_SHA

        for index in range(4):
            new = (
                f"revision-{index}"
            )

            operation = (
                f"{index + 1:032x}"
            )

            head = handle(
                client,
                patch(
                    client,
                    head,
                    old,
                    new,
                    operation,
                ),
                POLICY,
            )["head_sha"]

            job_id = (
                f"{index + 20:032x}"
            )

            client.run = {
                "display_title": (
                    f"agent-{job_id}-"
                    f"{head}"
                ),
                "head_sha": (
                    BASE_SHA
                ),
                "event": (
                    "workflow_dispatch"
                ),
                "html_url": (
                    "https://github.com/"
                    "example/run/42"
                ),
                "conclusion": (
                    "failure"
                ),
                "steps": [
                    {
                        "name": name,
                        "conclusion": (
                            "failure"
                            if name == "Build"
                            else "skipped"
                        ),
                    }
                    for name
                    in REQUIRED_STEPS
                ],
            }

            publish(
                client,
                POLICY,
                {
                    "inputs": {
                        "job_id": (
                            job_id
                        ),
                        "expected_sha": (
                            head
                        ),
                        "task_id": (
                            TASK_ID
                        ),
                    }
                },
                BASE_SHA,
                42,
                "failure",
            )

            old = new

        self.assertEqual(
            client.read_data(
                journal_path(
                    TASK_ID
                )
            )["status"],
            "BLOCKED",
        )

        with self.assertRaisesRegex(
            AgentError,
            "TASK_NOT_EDITABLE",
        ):
            handle(
                client,
                patch(
                    client,
                    head,
                    old,
                    "fifth",
                    "f" * 32,
                ),
                POLICY,
            )


if __name__ == "__main__":
    unittest.main()
