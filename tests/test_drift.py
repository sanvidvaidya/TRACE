import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from trace_drift import MappingConfig, verify

ROOT = Path(__file__).parent.parent
CONFIG = MappingConfig.load(ROOT / "trace_mappings.json")


def run(files, profile="trace_engine"):
    return verify(CONFIG, files, profile)


def test_profiles_are_separate():
    assert {m["node_id"] for m in CONFIG.profile("phoenix")["mappings"]} != {m["node_id"] for m in CONFIG.profile("trace_engine")["mappings"]}
    assert "COMP-001" in {m["node_id"] for m in CONFIG.profile("phoenix")["mappings"]}
    assert "TRACE-CORE" in {m["node_id"] for m in CONFIG.profile("trace_engine")["mappings"]}


def test_explicit_component_to_file_matching():
    result = run(["backend_api.py"])
    assert result["file_to_nodes"]["backend_api.py"] == ["TRACE-API"]
    assert result["affected_requirements"] == ["TRACE-REQ-DRIFT"]
    assert "TRACE-OUTCOME" in result["affected_business_outcomes"]


def test_missing_linked_test_is_blocking_for_critical_component():
    result = run(["trace_drift.py"])
    assert result["status"] == "DRIFT_BLOCKED"
    assert "TRACE-DRIFT" in result["untested_components"]


def test_changed_linked_test_satisfies_mapping():
    result = run(["trace_drift.py", "tests/test_drift.py"])
    assert result["status"] == "CERTIFIED"
    assert result["untested_components"] == []


def test_frontend_mapping_is_narrow_and_explicit():
    result = run(["frontend/src/App.tsx"])
    assert result["file_to_nodes"]["frontend/src/App.tsx"] == ["TRACE-FRONTEND"]


def test_unmapped_files_are_findings():
    result = run(["custom/worker.py"])
    assert result["status"] == "NEEDS_ATTENTION"
    assert result["orphan_files"] == ["custom/worker.py"]


def test_ignore_patterns_only_ignore_explicit_paths():
    result = run(["README.md", "custom/worker.py"])
    assert result["ignored_files"] == ["README.md"]
    assert result["orphan_files"] == ["custom/worker.py"]


def test_phoenix_ambiguous_specifications_are_reported():
    result = run(["frontend/src/App.tsx"], "phoenix")
    assert "REQ-002" in result["ambiguous_requirements"]
    assert any(f["type"] == "AMBIGUOUS_REQUIREMENT_IMPACT" for f in result["findings"])


def test_test_only_change_does_not_claim_component_change():
    result = run(["tests/test_drift.py"])
    assert result["touched_components"] == []
    assert result["touched_test_cases"] == ["TRACE-TEST-SUITE"]


def test_all_profile_reports_shared_paths_against_both_sets():
    result = run(["app.py"], "all")
    assert "TRACE-CORE" in result["file_to_nodes"]["app.py"]
    assert "COMP-001" in result["file_to_nodes"]["app.py"]


def test_invalid_profile_errors():
    with pytest.raises(ValueError):
        CONFIG.profile("not-a-profile")
