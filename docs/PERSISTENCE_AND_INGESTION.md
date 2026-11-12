# TRACE Persistent Multi-Project Graph Storage & Ingestion

TRACE's persistence and ingestion subsystem operationalizes systems architecture modeling beyond single in-memory demonstrations. It equips TRACE with a persistent SQLite-backed multi-project store, incremental node/edge graph mutations, versioned point-in-time snapshots, and automated ingestion parsers for OpenAPI, Terraform, and container manifests.

---

## 1. Architecture & Persistence Layer

The storage engine (`trace_storage.py`) persists TRACE's NetworkX `TraceabilityGraph` topology into a relational SQLite database (`data/trace.db` or `:memory:` for testing).

```
                      ┌──────────────────────────────────────┐
                      │        TRACE REST API Gateway        │
                      └──────────────────┬───────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │  Automated Ingestion    │                 │  TraceStorage Engine    │
      │  (OpenAPI / TF / K8s)   │                 │  (SQLite Multi-Project) │
      └────────────┬────────────┘                 └────────────┬────────────┘
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │   SQLite Relational Store     │
                         │   - projects                  │
                         │   - project_nodes             │
                         │   - project_edges             │
                         │   - project_snapshots         │
                         └───────────────────────────────┘
```

### Relational Schema

- **`projects`**: Project metadata, namespace identifiers, descriptions, and creation timestamps.
- **`project_nodes`**: Persisted architecture entities (`SYSTEM_COMPONENT`, `DATA_SOURCE`, `REQUIREMENT`, `TEST_CASE`, etc.), epistemic statuses (`FACT`, `INTERPRETATION`), validation statuses, layers, and configuration metadata.
- **`project_edges`**: Directed relations (`DEPENDS_ON`, `IMPLEMENTED_BY`, `READS_FROM`, `VALIDATED_BY`) with confidence scores.
- **`project_snapshots`**: Immutable point-in-time serialized snapshots tracking versioned architecture states (`v1`, `v2`, ...).

---

## 2. Automated Architecture Ingestion Engine

The ingestion engine (`trace_ingest.py`) parses infrastructure and interface specifications into validated TRACE components and dependency edges:

### A. OpenAPI 3.x / Swagger 2.0 Ingestion (`ingest_openapi`)
- **Endpoints**: Operations mapped to `SYSTEM_COMPONENT` nodes with layer `"API / Interface"`.
- **Domain Models**: `$ref` schemas mapped to `DATA_SOURCE` nodes with layer `"API Domain Model"`.
- **Microservices**: Operation tags mapped to Service `SYSTEM_COMPONENT` nodes with `DEPENDS_ON` edges.
- **Security Schemes**: Authentication requirements mapped to `REQUIREMENT` nodes linked via `IMPLEMENTED_BY`.

### B. Terraform Infrastructure Ingestion (`ingest_terraform`)
- **Resource Parsing**: Handles Terraform state / plan JSON (`values.root_module.resources` or `resource_changes`).
- **Layer Classification**:
  - Relational / NoSQL databases (`aws_rds_cluster`, `google_sql_database`) -> `"Data Layer"`.
  - Object storage (`aws_s3_bucket`, `google_storage_bucket`) -> `"Storage Layer"`.
  - Workloads (`aws_ecs_service`, `aws_instance`, `lambda`) -> `"Compute Layer"`.
  - Ingress (`aws_alb`, `api_gateway`) -> `"Network & Ingress"`.
- **Dependency Graphs**: Maps explicit `depends_on` arrays into directed `DEPENDS_ON` edges.

### C. Container Manifest Ingestion (`ingest_container_manifest`)
- **Docker Compose**: Maps `services` to container workload components and parses `depends_on` chains.
- **Kubernetes (Multi-Document YAML)**: Parses `Deployment`, `StatefulSet`, `Service`, `ConfigMap`, and `Secret`. Resolves `Service.spec.selector` against `Deployment.spec.template.metadata.labels` to construct network dependencies.

---

## 3. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check and project count |
| `GET` | `/api/projects` | List all persisted architecture projects |
| `GET` | `/api/projects/{id}` | Get project header, node count, and edge count |
| `POST` | `/api/projects` | Create a new architecture project namespace |
| `DELETE` | `/api/projects?project_id=...` | Cascade delete project and all associated topology |
| `GET` | `/api/graph?project_id=...` | Load full graph for visualization (defaults to Project Phoenix) |
| `POST` | `/api/nodes` | Save or update a single architecture node |
| `DELETE` | `/api/nodes?project_id=...&node_id=...` | Delete a node and cascade-sever incident edges |
| `POST` | `/api/edges` | Insert or replace a directed dependency edge |
| `DELETE` | `/api/edges?project_id=...&source_id=...&target_id=...` | Delete an edge |
| `POST` | `/api/blast-radius` | Calculate topological blast radius over any persistent project |
| `POST` | `/api/snapshots` | Capture immutable versioned snapshot |
| `GET` | `/api/snapshots?project_id=...` | Retrieve snapshot history |
| `POST` | `/api/ingest/openapi` | Ingest OpenAPI specification JSON or YAML |
| `POST` | `/api/ingest/terraform` | Ingest Terraform plan or state JSON |
| `POST` | `/api/ingest/manifest` | Ingest Docker Compose or Kubernetes manifest YAML |

---

## 4. Verification

Run the comprehensive unit and integration suite:

```bash
pytest tests/test_storage_and_ingestion.py
```

Verify architecture drift compliance with zero unmapped findings:

```bash
python3 trace_drift.py --profile trace_engine
```
