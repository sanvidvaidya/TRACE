# TRACE Architecture Drift Verification

TRACE's drift verifier checks repository changes against explicit component-to-file mappings and a profile-specific traceability graph. It does not infer ownership from file or component names and does not claim to prove semantic correctness.

## Separate architecture profiles

`trace_mappings.json` keeps two architecture records separate:

- **`phoenix`** maps Project Phoenix demo nodes (`COMP-*`, `DATA-*`, `TEST-*`) and includes the relevant graph links. These are illustrative sample-system records, not a claim that the repository contains live Salesforce, Snowflake, or Zendesk integrations.
- **`trace_engine`** maps TRACE's own components (`TRACE-*`) to application paths, and connects those components to requirements, tests, and outcomes in a separate graph.
- **`all`** combines both profiles only when explicitly requested. A shared path such as `app.py` can therefore match both architectures in an `all` audit without blending their default reports.

## Configure file links

Each mapping uses a stable `node_id`, `node_type`, `title`, and a repository-relative `file_patterns` list. Component records can include `layer`, `owner`, `criticality`, and `associated_tests`. Test case records have their own explicit `file_patterns`. Exact paths and glob patterns such as `frontend/src/**` are supported. Prefer narrow patterns and review mapping changes like code changes.

The profile's `graph.nodes` and `graph.edges` encode explicit `REQUIREMENT -> SYSTEM_COMPONENT` implementation links and `REQUIREMENT -> TEST_CASE` validation links, plus requirement-to-outcome links. Impact walks these declared edges only. `ignore_patterns` is an explicit repository-level allowlist for paths that should not be governed; other unmatched changed files are reported as unmapped.

## Run locally

```bash
python trace_drift.py --git-diff origin/main...HEAD --profile trace_engine
python trace_drift.py --files backend_api.py tests/test_drift.py --profile trace_engine --format json
python trace_drift.py --git-diff origin/main...HEAD --profile phoenix --output report.md
python trace_drift.py --git-diff origin/main...HEAD --profile all
```

Options include `--mappings PATH`, `--format markdown|json|summary`, and `--output PATH`. Git diff paths are read as NUL-delimited values so spaces and unusual characters are preserved. The GitHub Actions workflow tests the checker, adds a Markdown report to the job summary and pull request, and blocks high/critical findings. Unmapped paths remain review findings unless the mappings are updated or the path is deliberately excluded.

## Findings and limits

- **Untested component change:** a mapped component changed, but none of its explicitly associated or graph-linked tests changed.
- **Ambiguous requirement impact:** a changed component traces to a requirement flagged ambiguous or conflicting in that profile's graph.
- **Unmapped file:** a changed path has no matching component/test mapping or ignore pattern.

A passing result means only that these deterministic checks found no blocking mapped drift. It is not a substitute for code review, test execution, security review, or runtime verification.
