"""Publish byte-exact, bounded source chunks on the isolated data branch."""

from __future__ import annotations

import hashlib
import json

from core import AgentError, canonical_json, chunk_text, decode_source, git_blob_sha, require, valid_sha


def selected_source(path: str) -> bool:
    roots = {"AGENTS.md", "README.md", "CLOUDFLARE_DEPLOYMENT.md", "package.json",
             "worker.js", "wrangler.toml", "app.js",
             "marketing_report_studio_v8_access_folders_fixed.html"}
    if path in roots:
        return True
    if path.startswith(("src/", "functions/", "scripts/", "tests/", "docs/")):
        return path.endswith((".js", ".mjs", ".py", ".md", ".json"))
    if path.startswith((".github/workflows/", ".agent/")):
        return path.endswith((".yml", ".yaml", ".json", ".md"))
    return False


def prepare(client, source_sha: str, policy: dict, paths: list[str] | None = None):
    source_sha = valid_sha(source_sha)
    prefix = f"contexts/{source_sha}"
    manifest_path = prefix + "/manifest.json" if paths is None else prefix + "/changed-manifest.json"
    previous = client.read_data(manifest_path)
    if previous is not None:
        require(previous["source_sha"] == source_sha and previous["complete"], "CONTEXT_INCOMPLETE")
        return previous
    entries = client.tree(source_sha)
    included = sorted(path for path in entries if selected_source(path)) if paths is None else sorted(set(paths))
    files = {}
    index = []
    skipped = []
    for path in included:
        entry = entries.get(path)
        if not entry or entry["mode"] not in ("100644", "100755"):
            skipped.append({"path": path, "reason": "MISSING_OR_NONREGULAR"})
            continue
        raw = client.blob(entry["sha"])
        require(git_blob_sha(raw) == entry["sha"], "SOURCE_BLOB_MISMATCH")
        try:
            content = decode_source(raw, policy)
        except AgentError as exc:
            skipped.append({"path": path, "reason": str(exc)})
            continue
        key = hashlib.sha256(path.encode("utf-8")).hexdigest()[:32]
        parts = list(chunk_text(content, policy["max_chunk_bytes"]))
        chunk_paths = []
        for number, part in enumerate(parts):
            location = f"{prefix}/chunks/{key}/{number:04d}.json"
            record = {"source_sha": source_sha, "path": path, "blob_sha": entry["sha"],
                      "part": number, "total_parts": len(parts), **part}
            require(len(canonical_json(record).encode("utf-8")) <= policy["max_chunk_json_bytes"], "CHUNK_TOO_LARGE")
            files[location] = record
            chunk_paths.append(location)
        file_manifest = f"{prefix}/files/{key}.json"
        files[file_manifest] = {"source_sha": source_sha, "path": path,
                                "blob_sha": entry["sha"], "size": len(raw),
                                "chunks": chunk_paths, "complete": True}
        require(len(canonical_json(files[file_manifest]).encode("utf-8")) <= 24576, "FILE_MANIFEST_TOO_LARGE")
        index.append({"path": path, "file_manifest": file_manifest, "blob_sha": entry["sha"], "size": len(raw)})
    pages = []
    for number, start in enumerate(range(0, len(index), 35)):
        location = f"{prefix}/index/{number:04d}.json"
        files[location] = {"source_sha": source_sha, "entries": index[start:start + 35]}
        require(len(canonical_json(files[location]).encode("utf-8")) <= 24576, "INDEX_PAGE_TOO_LARGE")
        pages.append(location)
    manifest = {"source_sha": source_sha, "scope": "project" if paths is None else "changed_paths",
                "complete": not skipped, "file_count": len(index), "index_pages": pages, "skipped": skipped}
    require(len(canonical_json(manifest).encode("utf-8")) <= 24576, "MANIFEST_TOO_LARGE")
    files[manifest_path] = manifest
    client.write_data(files, f"Prepare bounded context for {source_sha[:12]}")
    return manifest
