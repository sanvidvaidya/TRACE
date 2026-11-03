"""Deterministic verification of repository changes against explicit TRACE mappings."""
from __future__ import annotations

import argparse
import fnmatch
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


def normalize(path: str) -> str:
    path = path.replace("\\", "/")
    while path.startswith("./"):
        path = path[2:]
    return path


def matches(pattern: str, path: str) -> bool:
    pattern, path = normalize(pattern), normalize(path)
    if pattern.endswith("/**"):
        prefix = pattern[:-3]
        return path == prefix or path.startswith(prefix + "/")
    return fnmatch.fnmatchcase(path, pattern)


class MappingConfig:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.profiles = data.get("profiles", {})
        self.ignore_patterns = data.get("ignore_patterns", [])

    @classmethod
    def load(cls, path: str | Path) -> "MappingConfig":
        return cls(json.loads(Path(path).read_text(encoding="utf-8")))

    def profile(self, name: str) -> dict[str, Any]:
        if name == "all":
            mappings: list[dict[str, Any]] = []
            graph_nodes: dict[str, dict[str, Any]] = {}
            graph_edges: list[dict[str, str]] = []
            seen: set[str] = set()
            for profile in self.profiles.values():
                for mapping in profile.get("mappings", []):
                    if mapping["node_id"] not in seen:
                        mappings.append(mapping)
                        seen.add(mapping["node_id"])
                graph = profile.get("graph", {})
                graph_nodes.update({n["id"]: n for n in graph.get("nodes", [])})
                graph_edges.extend(graph.get("edges", []))
            return {"title": "All TRACE profiles", "mappings": mappings,
                    "graph": {"nodes": list(graph_nodes.values()), "edges": graph_edges}}
        if name not in self.profiles:
            raise ValueError(f"Unknown profile {name!r}; available: {', '.join(self.profiles)}")
        return self.profiles[name]

    def ignored(self, path: str) -> bool:
        return any(matches(pattern, path) for pattern in self.ignore_patterns)


def changed_files(revision_range: str) -> list[str]:
    result = subprocess.run(["git", "diff", "--name-only", "-z", revision_range],
                            capture_output=True, check=True)
    return [normalize(p.decode("utf-8", "surrogateescape"))
            for p in result.stdout.split(b"\0") if p]


def verify(config: MappingConfig, files: list[str], profile_name: str) -> dict[str, Any]:
    profile = config.profile(profile_name)
    mappings = {m["node_id"]: m for m in profile.get("mappings", [])}
    graph = profile.get("graph", {})
    graph_nodes = {n["id"]: n for n in graph.get("nodes", [])}
    edges = graph.get("edges", [])
    node_files: dict[str, list[str]] = {}
    file_nodes: dict[str, list[str]] = {}
    ignored: list[str] = []
    orphaned: list[str] = []

    for raw in files:
        path = normalize(raw)
        if config.ignored(path):
            ignored.append(path)
            continue
        hits = [node_id for node_id, mapping in mappings.items()
                if any(matches(pattern, path) for pattern in mapping.get("file_patterns", []))]
        if not hits:
            orphaned.append(path)
            continue
        file_nodes[path] = hits
        for node_id in hits:
            node_files.setdefault(node_id, []).append(path)

    touched_components = sorted(n for n in node_files if mappings[n].get("node_type") == "SYSTEM_COMPONENT")
    touched_tests = sorted(n for n in node_files if mappings[n].get("node_type") == "TEST_CASE")
    findings: list[dict[str, Any]] = []
    affected_requirements: set[str] = set()
    affected_outcomes: set[str] = set()
    untested: list[str] = []
    ambiguous: set[str] = set()

    # Explicit graph edges trace requirements implemented by changed components,
    # then tests that validate those requirements. No name-based inference.
    for component_id in touched_components:
        requirement_ids = {e["from"] for e in edges
                           if e.get("to") == component_id
                           and graph_nodes.get(e.get("from"), {}).get("node_type") == "REQUIREMENT"}
        affected_requirements.update(requirement_ids)
        tests_for_requirements = {
            e["to"] for e in edges if e.get("from") in requirement_ids
            and graph_nodes.get(e.get("to"), {}).get("node_type") == "TEST_CASE"
        }
        required_tests = set(mappings[component_id].get("associated_tests", [])) | tests_for_requirements
        changed_test_ids = set(touched_tests)
        if required_tests and not (required_tests & changed_test_ids):
            untested.append(component_id)
            criticality = mappings[component_id].get("criticality", "MEDIUM").upper()
            severity = criticality if criticality in {"CRITICAL", "HIGH", "MEDIUM"} else "MEDIUM"
            findings.append({"type": "UNTESTED_COMPONENT_CHANGE", "severity": severity,
                "node_id": component_id, "title": mappings[component_id].get("title", component_id),
                "changed_files": node_files[component_id], "expected_tests": sorted(required_tests),
                "message": "A mapped component changed without a mapped linked test changing."})
        for requirement_id in requirement_ids:
            req = graph_nodes.get(requirement_id, {})
            if req.get("is_ambiguous") or req.get("has_conflict"):
                ambiguous.add(requirement_id)
                findings.append({"type": "AMBIGUOUS_REQUIREMENT_IMPACT", "severity": "HIGH",
                    "node_id": requirement_id, "title": req.get("title", requirement_id),
                    "flags": req.get("flags", []),
                    "message": "Changed component traces to a requirement marked ambiguous or conflicting."})

    for req_id in affected_requirements:
        for edge in edges:
            if edge.get("from") == req_id and graph_nodes.get(edge.get("to"), {}).get("node_type") == "BUSINESS_OUTCOME":
                affected_outcomes.add(edge["to"])
    for path in orphaned:
        findings.append({"type": "UNMAPPED_FILE", "severity": "MEDIUM", "file": path,
            "message": "Changed file has no explicit mapping or ignore rule."})

    blocking = any(f["severity"] in {"CRITICAL", "HIGH"} for f in findings)
    status = "DRIFT_BLOCKED" if blocking else ("NEEDS_ATTENTION" if findings else "CERTIFIED")
    result = {
        "status": status, "profile": profile_name, "profile_title": profile.get("title", profile_name),
        "changed_file_count": len(files), "mapped_file_count": len(file_nodes),
        "ignored_files": sorted(ignored), "orphan_files": sorted(orphaned),
        "file_to_nodes": file_nodes, "touched_components": touched_components,
        "touched_test_cases": touched_tests, "untested_components": sorted(untested),
        "affected_requirements": sorted(affected_requirements),
        "affected_business_outcomes": sorted(affected_outcomes),
        "ambiguous_requirements": sorted(ambiguous), "findings": findings,
    }
    result["markdown_report"] = markdown_report(result, mappings, graph_nodes)
    return result


def markdown_report(result: dict[str, Any], mappings: dict[str, Any], graph_nodes: dict[str, Any]) -> str:
    lines = ["## TRACE Architecture Drift Verification", "",
             f"**Status:** `{result['status']}`  |  **Profile:** `{result['profile']}` ({result['profile_title']})", "",
             f"Changed files: {result['changed_file_count']} · Mapped files: {result['mapped_file_count']} · "
             f"Ignored: {len(result['ignored_files'])} · Unmapped: {len(result['orphan_files'])}", ""]
    if result["touched_components"]:
        lines += ["### Changed components", "| Component | Layer | Criticality | Changed files |", "|---|---|---|---|"]
        for node_id in result["touched_components"]:
            m = mappings[node_id]
            paths = [p for p, ids in result["file_to_nodes"].items() if node_id in ids]
            lines.append(f"| `{node_id}` {m.get('title','')} | {m.get('layer','')} | {m.get('criticality','')} | {', '.join(f'`{p}`' for p in paths)} |")
        lines.append("")
    if result["affected_requirements"]:
        lines += ["### Traced requirements", "| Requirement | Impact |", "|---|---|"]
        for node_id in result["affected_requirements"]:
            node = graph_nodes.get(node_id, {})
            flags = "; ".join(node.get("flags", []))
            lines.append(f"| `{node_id}` {node.get('title','')} | {flags or 'No ambiguity/conflict flag'} |")
        lines.append("")
    if result["affected_business_outcomes"]:
        lines.append("**Affected business outcomes:** " + ", ".join(f"`{n}` {graph_nodes.get(n, {}).get('title','')}" for n in result["affected_business_outcomes"]) + "\n")
    if result["findings"]:
        lines += ["### Findings", "| Severity | Finding | Detail |", "|---|---|---|"]
        for f in result["findings"]:
            extra = f"Expected tests: {', '.join(f.get('expected_tests', []))}" if f.get("expected_tests") else "; ".join(f.get("flags", [])) or f.get("file", "")
            lines.append(f"| **{f['severity']}** | {f['type']}: {f.get('title', f.get('file',''))} | {f['message']} {extra} |")
        lines.append("")
    else:
        lines += ["No mapped architecture drift findings.", ""]
    lines += ["_Deterministic mapping and graph checks are review signals; they do not prove semantic correctness._"]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--files", nargs="*", default=[])
    parser.add_argument("--git-diff", default="", help="Git revision range to enumerate changed paths")
    parser.add_argument("--mappings", default="trace_mappings.json")
    parser.add_argument("--profile", choices=["phoenix", "trace_engine", "all"], default="trace_engine")
    parser.add_argument("--format", choices=["markdown", "json", "summary"], default="markdown")
    parser.add_argument("--output", default="")
    parser.add_argument("--fail-on", choices=["never", "high", "medium"], default="never")
    args = parser.parse_args()
    files = list(args.files)
    if args.git_diff:
        try:
            files.extend(changed_files(args.git_diff))
        except subprocess.CalledProcessError as exc:
            print(exc.stderr.decode(errors="replace"), file=sys.stderr)
            return 2
    files = list(dict.fromkeys(files))
    config = MappingConfig.load(args.mappings)
    result = verify(config, files, args.profile)
    output = (json.dumps(result, indent=2) if args.format == "json" else
              f"{result['status']} | {len(result['findings'])} findings | {len(result['touched_components'])} components" if args.format == "summary" else
              result["markdown_report"])
    if args.output:
        Path(args.output).write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    severities = {f["severity"] for f in result["findings"]}
    if args.fail_on == "high" and severities & {"HIGH", "CRITICAL"}:
        return 1
    if args.fail_on == "medium" and severities & {"HIGH", "CRITICAL", "MEDIUM"}:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
