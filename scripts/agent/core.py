"""Deterministic, dependency-free validation for the direct GitHub agent."""

from __future__ import annotations

import difflib
import hashlib
import json
import re
from pathlib import PurePosixPath


SHA = re.compile(r"^[0-9a-f]{40}$")
IDENTIFIER = re.compile(r"^[0-9a-f]{32}$")
TEXT_PATH = re.compile(r"^[A-Za-z0-9_.\-/]+$")


class AgentError(ValueError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AgentError(message)


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n"


def valid_sha(value: object) -> str:
    require(isinstance(value, str) and SHA.fullmatch(value) is not None, "INVALID_SHA")
    return value


def valid_id(value: object) -> str:
    require(isinstance(value, str) and IDENTIFIER.fullmatch(value) is not None, "INVALID_ID")
    return value


def valid_path(path: object, policy: dict) -> str:
    require(isinstance(path, str) and len(path) <= 200 and TEXT_PATH.fullmatch(path) is not None, "INVALID_PATH")
    parts = PurePosixPath(path).parts
    require(bool(parts) and not path.startswith("/") and all(part not in (".", "..") for part in parts), "INVALID_PATH")
    require(not path.endswith("/") and "//" not in path and path == str(PurePosixPath(path)), "INVALID_PATH")
    require(path in policy["allowed_files"] or any(path.startswith(prefix) for prefix in policy["allowed_prefixes"]), "PROTECTED_PATH")
    require(not any(part.startswith(".") for part in parts), "PROTECTED_PATH")
    return path


def text_value(value: object, limit: int, label: str) -> str:
    require(isinstance(value, str) and "\0" not in value, f"INVALID_{label}")
    require(len(value.encode("utf-8")) <= limit, f"{label}_TOO_LARGE")
    return value


def validate_plan(plan: object, policy: dict) -> dict:
    require(isinstance(plan, dict), "INVALID_PLAN")
    require(set(plan) == {"title", "summary", "allowed_files", "steps"}, "INVALID_PLAN_FIELDS")
    text_value(plan["title"], 160, "TITLE")
    text_value(plan["summary"], 2000, "SUMMARY")
    require(bool(plan["title"].strip()) and bool(plan["summary"].strip()), "EMPTY_PLAN")
    files = plan["allowed_files"]
    require(isinstance(files, list) and 1 <= len(files) <= policy["max_changed_files"], "INVALID_PLAN_FILES")
    for path in files:
        valid_path(path, policy)
    require(len(files) == len(set(files)), "DUPLICATE_PLAN_FILE")
    steps = plan["steps"]
    require(isinstance(steps, list) and 1 <= len(steps) <= 12, "INVALID_STEPS")
    for step in steps:
        require(isinstance(step, dict) and set(step) == {"objective", "files", "tests", "risk", "done"}, "INVALID_STEP")
        for key in ("objective", "risk", "done"):
            require(bool(text_value(step[key], 900, key.upper()).strip()), "EMPTY_STEP")
        require(isinstance(step["files"], list) and all(p in files for p in step["files"]), "INVALID_STEP_FILES")
        require(isinstance(step["tests"], list) and len(step["tests"]) <= 12, "INVALID_STEP_TESTS")
        for test in step["tests"]:
            text_value(test, 400, "TEST")
    require(len(canonical_json(plan).encode("utf-8")) <= 12000, "PLAN_TOO_LARGE")
    return plan


def git_blob_sha(raw: bytes) -> str:
    return hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()


def decode_source(raw: bytes, policy: dict) -> str:
    require(len(raw) <= policy["max_file_bytes"] and b"\0" not in raw, "UNSUPPORTED_FILE")
    try:
        return raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise AgentError("NON_UTF8_FILE") from exc


def apply_file_change(original: str | None, change: dict, policy: dict) -> str:
    require(isinstance(change, dict) and set(change) in (
        {"path", "expected_blob_sha", "edits"},
        {"path", "expected_blob_sha", "content"},
    ), "INVALID_CHANGE")
    result = original
    if "content" in change:
        require(original is None or len(original.encode("utf-8")) <= policy["max_full_content_bytes"], "FULL_REWRITE_TOO_LARGE")
        result = text_value(change["content"], policy["max_full_content_bytes"], "CONTENT")
    else:
        require(original is not None, "EDITS_REQUIRE_EXISTING_FILE")
        edits = change["edits"]
        require(isinstance(edits, list) and 1 <= len(edits) <= 30, "INVALID_EDITS")
        for edit in edits:
            require(isinstance(edit, dict) and set(edit) == {"old", "new"}, "INVALID_EDIT")
            old = text_value(edit["old"], 16384, "ANCHOR")
            new = text_value(edit["new"], 16384, "REPLACEMENT")
            require(bool(old) and old != new, "INVALID_ANCHOR")
            require(result.count(old) == 1, "ANCHOR_NOT_UNIQUE")
            result = result.replace(old, new, 1)
    require(result != original, "NO_CHANGE")
    text_value(result, policy["max_file_bytes"], "FILE")
    return result


def change_count(old: str, new: str) -> int:
    before = old.splitlines(keepends=True)
    after = new.splitlines(keepends=True)
    matcher = difflib.SequenceMatcher(a=before, b=after, autojunk=True)
    return sum((i2 - i1) + (j2 - j1) for tag, i1, i2, j1, j2 in matcher.get_opcodes() if tag != "equal")


def validate_cumulative(base: dict[str, str | None], final: dict[str, str], policy: dict) -> dict:
    touched = [path for path, text in final.items() if text != (base.get(path) or "")]
    require(len(touched) <= policy["max_changed_files"], "FILE_BUDGET_EXCEEDED")
    total = 0
    per_file = {}
    for path in touched:
        before = base.get(path)
        require(before is not None or final[path], "EMPTY_NEW_FILE")
        count = change_count(before or "", final[path])
        per_file[path] = count
        total += count
        if path == "app.js":
            require(count <= policy["max_app_changed_lines"], "APP_LINE_BUDGET_EXCEEDED")
    require(total <= policy["max_changed_lines"], "LINE_BUDGET_EXCEEDED")
    return {"files": touched, "changed_lines": total, "per_file": per_file}


def chunk_text(text: str, max_bytes: int):
    require(max_bytes >= 4, "INVALID_CHUNK_SIZE")
    offset = 0
    line = 1
    current = []
    used = 0
    for character in text:
        size = len(character.encode("utf-8"))
        if current and used + size > max_bytes:
            value = "".join(current)
            end = offset + used
            end_line = line + value.count("\n")
            yield {"byte_start": offset, "byte_end": end, "line_start": line, "line_end": end_line, "text": value}
            offset = end
            line = end_line
            current = []
            used = 0
        current.append(character)
        used += size
    if current or offset == 0:
        value = "".join(current)
        yield {"byte_start": offset, "byte_end": offset + used, "line_start": line,
               "line_end": line + value.count("\n"), "text": value}
