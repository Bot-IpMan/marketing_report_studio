"""Static validation of the direct Github GPT configuration and local helpers."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "agent-gpt"
sys.path.insert(0, str(ROOT / "scripts/agent"))

from core import validate_plan  # noqa: E402


def check(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    try:
        import yaml
    except ImportError as exc:
        raise ValueError("PyYAML is needed to validate schema and workflows") from exc
    required = (
        "00_START_HERE.md", "01_GPT_INSTRUCTIONS.txt", "02_KNOWLEDGE_PROTOCOL.md",
        "03_ACTION_OPENAPI.yaml", "04_SAMPLE_TASK_PLAN.json", "05_TECHNICAL_SPEC.md",
        "06_VERIFICATION.md", "08_PROJECT_BASELINE.md",
    )
    check(all((PACKAGE / name).is_file() for name in required), "missing GPT bundle file")
    instructions = (PACKAGE / "01_GPT_INSTRUCTIONS.txt").read_text()
    check(len(instructions) < 8000, "Instructions exceed GPT editor budget")
    check("getRepositoryState" not in instructions and "agent.example.com" not in instructions,
          "old gateway instruction found")
    schema = yaml.safe_load((PACKAGE / "03_ACTION_OPENAPI.yaml").read_text())
    check(schema["openapi"].startswith("3."), "invalid OpenAPI version")
    check(schema["info"]["version"] == "1.1.0", "unexpected bundle schema version")
    check(schema["servers"] == [{"url": "https://api.github.com"}], "wrong server")
    paths = schema["paths"]
    prefix = "/repos/Bot-IpMan/marketing_report_studio/"
    check(all(path == prefix[:-1] or path.startswith(prefix) for path in paths),
          "unscoped GitHub path")
    operations = [(path, method, operation) for path, verbs in paths.items()
                  for method, operation in verbs.items() if method in ("get", "post", "put", "patch", "delete")]
    ids = [op["operationId"] for _, _, op in operations]
    check(len(ids) == len(set(ids)), "duplicate operation IDs")
    writes = {path for path, method, _ in operations if method != "get"}
    expected_writes = {prefix + "actions/workflows/agent-" + name + ".yml/dispatches"
                       for name in ("context", "task", "validation")}
    expected_writes.add(prefix + "pulls")
    check(writes == expected_writes, "unexpected write endpoint")
    for path, method, operation in operations:
        expected_consequential = method != "get"
        check(operation.get("x-openai-isConsequential") is expected_consequential,
              f"wrong consequential flag for {method.upper()} {path}")
        check(len(operation["summary"]) <= 300, f"long summary: {path}")
        for param in operation.get("parameters", []):
            check(len(param.get("description", "")) <= 700, f"long parameter: {path}")
    for name in ("context", "task", "validation"):
        dispatch = paths[prefix + f"actions/workflows/agent-{name}.yml/dispatches"]["post"]
        check(dispatch["requestBody"]["content"]["application/json"]["schema"]["properties"]["ref"]["enum"] == ["main"],
              "dispatch may run untrusted ref")
    pr = paths[prefix + "pulls"]["post"]["requestBody"]["content"]["application/json"]["schema"]
    check(pr["properties"]["draft"]["enum"] == [True], "PR is not draft-only")
    policy = json.loads((ROOT / ".agent/policy.json").read_text())
    validate_plan(json.loads((PACKAGE / "04_SAMPLE_TASK_PLAN.json").read_text()), policy)
    workflows = {}
    for name in ("context", "task", "validation"):
        path = ROOT / ".github/workflows" / f"agent-{name}.yml"
        workflows[name] = yaml.load(path.read_text(), Loader=yaml.BaseLoader)
        check("workflow_dispatch" in workflows[name]["on"], f"workflow not dispatchable: {name}")
    check(workflows["context"]["on"]["push"]["branches"] == ["main"], "context not refreshed on main")
    check("payload" in workflows["task"]["on"]["workflow_dispatch"]["inputs"] and
          "request_id" in workflows["task"]["on"]["workflow_dispatch"]["inputs"], "task inputs differ")
    check(workflows["validation"]["jobs"]["validate"]["permissions"] == {"contents": "read"},
          "validation job is not read-only")
    check(workflows["validation"]["jobs"]["publish"]["permissions"]["checks"] == "write",
          "publisher cannot attach check")
    result = {"version": schema["info"]["version"], "status": "local-static-pass", "operations": len(operations),
              "server": schema["servers"][0]["url"], "instruction_characters": len(instructions),
              "checked": ["required files", "OpenAPI YAML", "fixed GitHub repository paths",
                          "write endpoint whitelist", "read/write consequential flags", "unique operations", "example plan",
                          "workflow YAML", "read-only test job", "candidate check publisher"],
              "not_verified_here": ["GPT Editor import", "token grants", "remote workflows", "GitHub CI",
                                    "browser E2E", "Cloudflare configuration"]}
    target = PACKAGE / "07_BUNDLE_CHECKS.json"
    target.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (KeyError, ValueError, OSError) as exc:
        print(f"Bundle validation failed: {exc}", file=sys.stderr)
        sys.exit(1)
