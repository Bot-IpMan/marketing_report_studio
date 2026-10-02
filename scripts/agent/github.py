"""Small GitHub REST adapter used inside trusted GitHub Actions jobs only."""

from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request

from core import AgentError, canonical_json, require, valid_sha


class GitHubError(AgentError):
    def __init__(self, status: int, path: str):
        super().__init__(f"GITHUB_HTTP_{status}: {path}")
        self.status = status


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None  # Never forward the repository token to a redirected host.


class GitHub:
    def __init__(self, repository: str, token: str | None = None):
        self.repository = repository
        self.token = token or os.environ.get("GITHUB_TOKEN", "")
        require(bool(self.token), "MISSING_GITHUB_TOKEN")
        self.root = f"/repos/{repository}"
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, method: str, path: str, body: object = None):
        url = "https://api.github.com" + path
        raw = None if body is None else canonical_json(body).encode("utf-8")
        request = urllib.request.Request(url, data=raw, method=method, headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "marketing-report-studio-agent/1",
            **({"Content-Type": "application/json"} if raw is not None else {}),
        })
        try:
            with self.opener.open(request, timeout=35) as response:
                content = response.read()
                return json.loads(content) if content else None
        except urllib.error.HTTPError as error:
            error.read(1024)
            raise GitHubError(error.code, path) from None

    def get(self, path: str):
        return self.request("GET", self.root + path)

    def post(self, path: str, body: object):
        return self.request("POST", self.root + path, body)

    def patch(self, path: str, body: object):
        return self.request("PATCH", self.root + path, body)

    def ref(self, branch: str):
        return self.get("/git/ref/heads/" + urllib.parse.quote(branch, safe="/"))

    def ref_or_none(self, branch: str):
        try:
            return self.ref(branch)
        except GitHubError as exc:
            if exc.status == 404:
                return None
            raise

    def head(self, branch: str) -> str | None:
        ref = self.ref_or_none(branch)
        return ref["object"]["sha"] if ref else None

    def commit(self, sha: str):
        return self.get("/git/commits/" + valid_sha(sha))

    def tree(self, commit_sha: str):
        sha = self.commit(commit_sha)["tree"]["sha"]
        tree = self.get("/git/trees/" + sha + "?recursive=1")
        require(not tree.get("truncated"), "SOURCE_TREE_TRUNCATED")
        return {entry["path"]: entry for entry in tree["tree"] if entry["type"] == "blob"}

    def blob(self, blob_sha: str) -> bytes:
        obj = self.get("/git/blobs/" + valid_sha(blob_sha))
        require(obj["encoding"] == "base64", "UNSUPPORTED_BLOB_ENCODING")
        return base64.b64decode(obj["content"], validate=False)

    def create_ref(self, branch: str, sha: str):
        return self.post("/git/refs", {"ref": "refs/heads/" + branch, "sha": sha})

    def update_ref(self, branch: str, sha: str):
        return self.patch("/git/refs/heads/" + urllib.parse.quote(branch, safe="/"),
                          {"sha": sha, "force": False})

    def new_commit(self, parent: str | None, files: dict[str, str], message: str) -> str:
        base_tree = self.commit(parent)["tree"]["sha"] if parent else None
        data = {"tree": [
            {"path": path, "mode": "100644", "type": "blob", "content": content}
            for path, content in sorted(files.items())
        ]}
        if base_tree:
            data["base_tree"] = base_tree
        tree_sha = self.post("/git/trees", data)["sha"]
        created = self.post("/git/commits", {
            "message": message,
            "tree": tree_sha,
            "parents": [parent] if parent else [],
        })
        return created["sha"]

    def ensure_data_branch(self) -> str:
        head = self.head("agent-data")
        if head:
            return head
        root = self.new_commit(None, {"README.md":
            "Generated agent context and task journals. No credentials or client reports.\n"},
            "Initialize isolated agent data")
        try:
            self.create_ref("agent-data", root)
        except GitHubError as exc:
            if exc.status not in (409, 422):
                raise
        return self.head("agent-data")

    def write_data(self, files: dict[str, object], message: str) -> str:
        current = self.ensure_data_branch()
        encoded = {path: canonical_json(value) for path, value in files.items()}
        target = self.new_commit(current, encoded, message)
        self.update_ref("agent-data", target)
        return target

    def read_data(self, path: str, at_sha: str | None = None):
        sha = at_sha or self.head("agent-data")
        if not sha:
            return None
        urlpath = "/contents/" + urllib.parse.quote(path, safe="/") + "?ref=" + valid_sha(sha)
        try:
            value = self.get(urlpath)
        except GitHubError as exc:
            if exc.status == 404:
                return None
            raise
        require(value.get("encoding") == "base64", "INVALID_DATA_FILE")
        return json.loads(base64.b64decode(value["content"]).decode("utf-8"))
