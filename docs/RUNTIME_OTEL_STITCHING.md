# TRACE Live OpenTelemetry & eBPF Runtime Stitching

## Overview

Static architecture diagrams and infrastructure manifests (IaC, Kubernetes) depict how an engineering organization *believes* its microservices interact. In reality, production runtime topologies drift continuously: developers introduce undocumented HTTP calls, third-party analytics trackers, and unmanaged caches.

TRACE's **Live OpenTelemetry & eBPF Runtime Stitching Engine** (`trace_otel.py`) bridges static architecture with live runtime telemetry. It correlates observed trace spans and network flow logs against governed architecture graphs, classifying every edge into three deterministic categories:

1. **`VERIFIED_ACTIVE`**: The communication path is explicitly declared in architecture models and confirmed running in live traffic. Telemetry metrics (p95/p99 latencies, call volume, error rates) are attached directly to the graph edge.
2. **`SHADOW_DEPENDENCY`**: Live network traffic or distributed trace spans were observed between two services, but the connection is **missing from the documented architecture**. Shadow dependencies pose severe operational and security risks (unmonitored data exfiltration, unpredicted cascading failover collapses).
3. **`DORMANT_OR_UNDEPLOYED`**: An edge is declared in architecture or IaC, but zero communication spans were observed during the telemetry window (identifying zombie microservices or dead code).

---

## Architecture & Data Flow

```
+------------------------------------+
| OpenTelemetry Batches / eBPF Flows |
+-----------------+------------------+
                  |
                  v
       [ trace_otel.py ]
  +-------------------------------+
  |  TraceRuntimeStore (SQLite)   |
  |  - Ingest spans & flow logs   |
  |  - Directional aggregation    |
  |  - Percentile latency & errors|
  +---------------+---------------+
                  |
                  v
 [ ArchitecturalCorrelationEngine ] <---- Static Nodes & Edges (trace_storage.py)
                  |
       +----------+----------+
       |                     |
       v                     v
 [ Verified Edges ]  [ Shadow Dependencies ] ---> Alerts & Severity Scoring
       |
       v
 [ Empirical Blast Radius Simulation ] ---> Cascading Timeout & Error Risk Modeling
```

---

## REST Endpoints

### 1. Ingest Traces or eBPF Flows
`POST /api/traces/ingest`
```json
{
  "project_id": "project-phoenix",
  "format": "opentelemetry",
  "payload": {
    "spans": [
      {
        "trace_id": "tr-100",
        "span_id": "sp-1",
        "service_name": "checkout-service",
        "peer_service": "payment-gateway",
        "operation": "POST /v1/charge",
        "duration_ms": 45.2,
        "is_error": false
      }
    ]
  }
}
```

### 2. Architectural Correlation
`GET /api/traces/correlate?project_id=project-phoenix`
Returns verified active edges, shadow dependencies, and dormant edges with telemetry aggregates.

### 3. Shadow Dependency Audit
`GET /api/traces/shadow-dependencies?project_id=project-phoenix`
Returns an actionable risk report containing all unmapped dependencies, severity rankings (`CRITICAL` / `HIGH`), and recommended remediation steps.

### 4. Empirical Blast Radius Simulation
`GET /api/traces/empirical-blast-radius?project_id=project-phoenix&node_id=COMP-001&latency_ms=600&error_rate=0.5`
Simulates cascading latency degradation and timeout risk across upstream callers based on observed call frequencies.
