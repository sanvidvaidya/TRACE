"""Tests for TRACE Live OpenTelemetry & eBPF Runtime Stitching Engine."""

import io
import json
import os
import tempfile
import pytest

from trace_otel import (
    ObservedSpan,
    ObservedFlow,
    TraceRuntimeStore,
    ArchitecturalCorrelationEngine,
    parse_opentelemetry_json,
)
from trace_storage import TraceStorage


@pytest.fixture
def temp_runtime_store():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
        db_path = tf.name
    store = TraceRuntimeStore(db_path=db_path)
    yield store
    if os.path.exists(db_path):
        os.remove(db_path)


def test_span_parsing_simplified_and_official():
    # 1. Simplified format
    simple_payload = {
        "spans": [
            {
                "trace_id": "t-100",
                "span_id": "s-1",
                "service_name": "api-gateway",
                "peer_service": "auth-service",
                "operation": "POST /v1/token",
                "duration_ms": 42.5,
                "is_error": False,
                "protocol": "http"
            }
        ]
    }
    spans = parse_opentelemetry_json(simple_payload)
    assert len(spans) == 1
    assert spans[0].service_name == "api-gateway"
    assert spans[0].peer_service == "auth-service"
    assert spans[0].duration_ms == 42.5
    assert not spans[0].is_error

    # 2. Official OTel Collector resourceSpans format
    official_payload = {
        "resourceSpans": [
            {
                "resource": {
                    "attributes": [
                        {"key": "service.name", "value": {"stringValue": "checkout-service"}}
                    ]
                },
                "scopeSpans": [
                    {
                        "spans": [
                            {
                                "traceId": "t-200",
                                "spanId": "s-2",
                                "parentSpanId": "s-1",
                                "name": "PaymentService.Authorize",
                                "startTimeUnixNano": 1000000000,
                                "endTimeUnixNano": 1080000000,  # 80ms
                                "attributes": [
                                    {"key": "peer.service", "value": {"stringValue": "payment-gateway"}},
                                    {"key": "rpc.system", "value": {"stringValue": "grpc"}}
                                ],
                                "status": {"code": 1}
                            }
                        ]
                    }
                ]
            }
        ]
    }
    otel_spans = parse_opentelemetry_json(official_payload)
    assert len(otel_spans) == 1
    assert otel_spans[0].service_name == "checkout-service"
    assert otel_spans[0].peer_service == "payment-gateway"
    assert otel_spans[0].duration_ms == 80.0
    assert otel_spans[0].protocol == "grpc"


def test_runtime_store_and_edge_aggregation(temp_runtime_store):
    project_id = "test-proj"

    # Add spans
    spans = [
        ObservedSpan(
            trace_id="t-1",
            span_id="s-1",
            service_name="frontend",
            peer_service="backend-api",
            operation="GET /api/items",
            duration_ms=25.0,
            is_error=False
        ),
        ObservedSpan(
            trace_id="t-1",
            span_id="s-2",
            service_name="frontend",
            peer_service="backend-api",
            operation="GET /api/items",
            duration_ms=45.0,
            is_error=True
        ),
        ObservedSpan(
            trace_id="t-2",
            span_id="s-3",
            parent_span_id="s-parent",
            service_name="backend-api",
            peer_service="database",
            operation="SELECT * FROM items",
            duration_ms=10.0,
            is_error=False
        )
    ]
    inserted_spans = temp_runtime_store.record_spans(project_id, spans)
    assert inserted_spans == 3

    # Add eBPF flows
    flows = [
        ObservedFlow(
            source_service="backend-api",
            target_service="redis-cache",
            bytes_sent=1024,
            bytes_recv=4096,
            latency_ms=2.5,
            error_count=0,
            protocol="tcp"
        )
    ]
    inserted_flows = temp_runtime_store.record_flows(project_id, flows)
    assert inserted_flows == 1

    edges = temp_runtime_store.aggregate_runtime_edges(project_id)
    assert len(edges) == 3

    # Check frontend -> backend-api
    f_b = next(e for e in edges if e.source == "frontend" and e.target == "backend-api")
    assert f_b.call_count == 2
    assert f_b.error_count == 1
    assert f_b.error_rate == 0.5
    assert f_b.avg_latency_ms == 35.0


def test_architectural_correlation_and_shadow_dependencies(temp_runtime_store):
    project_id = "test-proj-arch"
    engine = ArchitecturalCorrelationEngine(temp_runtime_store)

    # Static architecture: COMP-001 (frontend) -> COMP-002 (backend-api) -> COMP-003 (database)
    static_nodes = [
        {"id": "COMP-001", "title": "Frontend Service"},
        {"id": "COMP-002", "title": "Backend API"},
        {"id": "COMP-003", "title": "Postgres Database"},
        {"id": "COMP-004", "title": "Dormant Microservice"}
    ]
    static_edges = [
        {"from_node": "COMP-001", "to_node": "COMP-002", "relation": "DEPENDS_ON"},
        {"from_node": "COMP-002", "to_node": "COMP-003", "relation": "DEPENDS_ON"},
        {"from_node": "COMP-002", "to_node": "COMP-004", "relation": "DEPENDS_ON"},
    ]

    # Ingest runtime telemetry:
    # 1. frontend -> backend-api (VERIFIED)
    # 2. backend-api -> database (VERIFIED)
    # 3. backend-api -> shadow-analytics (SHADOW DEPENDENCY!)
    spans = [
        ObservedSpan(trace_id="t-1", span_id="s1", service_name="Frontend Service", peer_service="Backend API", duration_ms=20.0),
        ObservedSpan(trace_id="t-1", span_id="s2", service_name="Backend API", peer_service="Postgres Database", duration_ms=12.0),
        ObservedSpan(
            trace_id="t-1",
            span_id="s3",
            service_name="Backend API",
            peer_service="shadow-analytics",
            operation="POST /track",
            duration_ms=150.0,
            is_error=True
        )
    ]
    temp_runtime_store.record_spans(project_id, spans)

    report = engine.correlate(project_id, static_nodes, static_edges)

    # 1. Check verified edges
    verified = report["verified_edges"]
    assert len(verified) == 2
    pairs = {(v["source"], v["target"]) for v in verified}
    assert ("COMP-001", "COMP-002") in pairs
    assert ("COMP-002", "COMP-003") in pairs

    # 2. Check shadow dependency
    shadows = report["shadow_dependencies"]
    assert len(shadows) == 1
    assert shadows[0]["target"] == "shadow-analytics"
    assert shadows[0]["status"] == "SHADOW_DEPENDENCY"
    assert "Unmapped runtime dependency detected" in shadows[0]["risk"]

    # 3. Check dormant edges
    dormant = report["dormant_edges"]
    assert len(dormant) == 1
    assert dormant[0]["from_node"] == "COMP-002"
    assert dormant[0]["to_node"] == "COMP-004"


def test_empirical_blast_radius_simulation(temp_runtime_store):
    project_id = "test-blast"
    engine = ArchitecturalCorrelationEngine(temp_runtime_store)

    static_nodes = [
        {"id": "COMP-UI", "title": "Web UI"},
        {"id": "COMP-GATEWAY", "title": "API Gateway"},
        {"id": "COMP-PAY", "title": "Payment Service"},
    ]
    static_edges = [
        {"from_node": "COMP-UI", "to_node": "COMP-GATEWAY", "relation": "CALLS"},
        {"from_node": "COMP-GATEWAY", "to_node": "COMP-PAY", "relation": "CALLS"},
    ]

    # Ingest calls: Web UI -> API Gateway -> Payment Service
    spans = [
        ObservedSpan(trace_id="t1", span_id="s1", service_name="Web UI", peer_service="API Gateway", duration_ms=15.0),
        ObservedSpan(trace_id="t1", span_id="s2", service_name="API Gateway", peer_service="Payment Service", duration_ms=120.0),
    ]
    temp_runtime_store.record_spans(project_id, spans)

    # Simulate outage/slowdown in COMP-PAY
    result = engine.simulate_empirical_blast_radius(
        project_id=project_id,
        failing_node="COMP-PAY",
        static_nodes=static_nodes,
        static_edges=static_edges,
        injected_latency_ms=800.0,
        injected_error_rate=0.8
    )

    assert result["failing_node"] == "COMP-PAY"
    impacted = result["impacted_services"]
    assert len(impacted) == 2  # COMP-GATEWAY and COMP-UI
    gateway_impact = next(x for x in impacted if x["node_id"] == "COMP-GATEWAY")
    assert gateway_impact["hop_distance"] == 1
    assert gateway_impact["cascading_timeout_risk"] == "HIGH"

    ui_impact = next(x for x in impacted if x["node_id"] == "COMP-UI")
    assert ui_impact["hop_distance"] == 2


def test_api_handler_trace_routes():
    """Verify backend_api integration with OpenTelemetry and shadow dependency routes."""
    from backend_api import TraceAPIHandler, RUNTIME_STORE, STORAGE

    project_id = "api-trace-test"
    STORAGE.delete_project(project_id)
    STORAGE.create_project(project_id, "API Trace Project")
    STORAGE.save_node(project_id, {"node_id": "SVC-A", "title": "Service A", "node_type": "SYSTEM_COMPONENT"})
    STORAGE.save_node(project_id, {"node_id": "SVC-B", "title": "Service B", "node_type": "SYSTEM_COMPONENT"})
    STORAGE.save_edge(project_id, {"source_id": "SVC-A", "target_id": "SVC-B", "relation_type": "CALLS"})

    # 1. Test POST /api/traces/ingest
    post_payload = {
        "project_id": project_id,
        "format": "opentelemetry",
        "payload": {
            "spans": [
                {
                    "trace_id": "tr-api-1",
                    "span_id": "sp-1",
                    "service_name": "Service A",
                    "peer_service": "Service B",
                    "operation": "GET /api/data",
                    "duration_ms": 30.0
                },
                {
                    "trace_id": "tr-api-1",
                    "span_id": "sp-2",
                    "service_name": "Service A",
                    "peer_service": "ThirdPartyTracker",
                    "operation": "POST /ping",
                    "duration_ms": 100.0
                }
            ]
        }
    }
    raw_body = json.dumps(post_payload).encode("utf-8")

    class MockRequest:
        def __init__(self, body: bytes):
            self.body = body
        def makefile(self, *args, **kwargs):
            return io.BytesIO(self.body)

    handler = TraceAPIHandler.__new__(TraceAPIHandler)
    handler.rfile = io.BytesIO(raw_body)
    handler.headers = {"Content-Length": str(len(raw_body))}
    handler.path = "/api/traces/ingest"

    sent_data = {}
    def mock_send_json(data, status=200):
        sent_data["body"] = data
        sent_data["status"] = status

    handler._send_json = mock_send_json
    handler.do_POST()

    assert sent_data["status"] == 201
    assert sent_data["body"]["recorded_spans"] == 2

    # 2. Test GET /api/traces/correlate
    handler.path = f"/api/traces/correlate?project_id={project_id}"
    handler.do_GET()
    correlate_res = sent_data["body"]
    assert correlate_res["project_id"] == project_id
    assert len(correlate_res["verified_edges"]) == 1
    assert len(correlate_res["shadow_dependencies"]) == 1
    assert correlate_res["shadow_dependencies"][0]["target"] == "thirdpartytracker"

    # 3. Test GET /api/traces/shadow-dependencies
    handler.path = f"/api/traces/shadow-dependencies?project_id={project_id}"
    handler.do_GET()
    shadow_res = sent_data["body"]
    assert shadow_res["total_shadow_dependencies"] == 1
    assert shadow_res["shadow_dependencies"][0]["status"] == "SHADOW_DEPENDENCY"
