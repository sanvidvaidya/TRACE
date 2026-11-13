"""TRACE — REST API Bridge & Architecture Graph Server.

Exposes the NetworkX TraceabilityGraph, AmbiguityEngine, persistent multi-project SQLite storage,
and automated architecture ingestion (OpenAPI, Terraform, Container manifests).
Run with: python backend_api.py --port 8001
"""

from __future__ import annotations

import argparse
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import sys
from urllib.parse import urlparse, parse_qs

# Import TRACE app.py and storage/ingestion engines
import app
from trace_storage import TraceStorage
from trace_ingest import ingest_openapi, ingest_terraform, ingest_container_manifest
from trace_otel import TraceRuntimeStore, ArchitecturalCorrelationEngine, parse_opentelemetry_json, ObservedFlow

MAX_BODY_SIZE = 2 * 1024 * 1024  # 2 MB ceiling
ALLOWED_ORIGIN = os.environ.get("TRACE_ALLOWED_ORIGIN", "http://localhost:5173")

# Initialize persistent SQLite store
STORAGE = TraceStorage()
STORAGE.seed_default_project_phoenix()

# Initialize OpenTelemetry and eBPF runtime store
RUNTIME_STORE = TraceRuntimeStore()
CORRELATION_ENGINE = ArchitecturalCorrelationEngine(RUNTIME_STORE)


class TraceAPIHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, data: any, status_code: int = 200):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> tuple[dict | None, tuple[str, int] | None]:
        raw_len = self.headers.get("Content-Length", "").strip()
        if not raw_len:
            return {}, None
        try:
            content_length = int(raw_len)
            if content_length < 0:
                return None, ("Invalid Content-Length header", 400)
        except ValueError:
            return None, ("Invalid Content-Length header", 400)

        if content_length > MAX_BODY_SIZE:
            return None, ("Payload too large. Maximum size is 2 MB", 413)

        raw = self.rfile.read(content_length)
        if len(raw) > MAX_BODY_SIZE:
            return None, ("Payload too large. Maximum size is 2 MB", 413)

        try:
            return json.loads(raw.decode("utf-8")), None
        except Exception:
            return None, ("Malformed JSON body", 400)

    def _get_demo_graph(self):
        title, nodes, edges = app.load_renewal_demo()
        graph = app.TraceabilityGraph()
        for n in nodes:
            graph.add_node(n)
        for e in edges:
            graph.add_edge(e)
        return title, nodes, edges, graph

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        try:
            if path in ("/api/health", "/api/status"):
                projects = STORAGE.list_projects()
                self._send_json({
                    "status": "ok",
                    "system": "TRACE Systems Architecture Engine",
                    "graph_backend": "NetworkX Digraph + Persistent SQLite Storage",
                    "active_demo": "Project Phoenix (Renewal Intelligence System)",
                    "projects_count": len(projects),
                    "port": 8001,
                })

            elif path == "/api/projects":
                projects = STORAGE.list_projects()
                self._send_json({"projects": projects})

            elif path.startswith("/api/projects/"):
                project_id = path.split("/")[-1]
                proj = STORAGE.get_project(project_id)
                if not proj:
                    self._send_json({"error": f"Project '{project_id}' not found"}, 404)
                    return
                self._send_json(proj)

            elif path == "/api/graph":
                project_id = params.get("project_id", [None])[0]
                if project_id and project_id != "project-phoenix":
                    try:
                        data = STORAGE.load_graph_data(project_id)
                        self._send_json(data)
                        return
                    except ValueError as e:
                        self._send_json({"error": str(e)}, 404)
                        return

                # Default fallback or explicit project-phoenix
                title, nodes, edges, _ = self._get_demo_graph()
                nodes_data = []
                for n in nodes:
                    node_dict = {
                        "id": n.id,
                        "node_type": n.node_type.value if hasattr(n.node_type, "value") else str(n.node_type),
                        "title": n.title,
                        "description": n.description,
                        "epistemic_status": n.epistemic_status.value if hasattr(n.epistemic_status, "value") else str(n.epistemic_status),
                        "validation_status": n.validation_status.value if hasattr(n.validation_status, "value") else str(n.validation_status),
                        "confidence": getattr(n, "confidence", 1.0),
                    }
                    if hasattr(n, "priority"):
                        node_dict["priority"] = n.priority.value if hasattr(n.priority, "value") else str(n.priority)
                    if hasattr(n, "system_type"):
                        node_dict["system_type"] = str(n.system_type)
                    nodes_data.append(node_dict)

                edges_data = []
                for e in edges:
                    from_id = getattr(e, "source_id", getattr(e, "from_id", ""))
                    to_id = getattr(e, "target_id", getattr(e, "to_id", ""))
                    rel = getattr(e, "relation", getattr(e, "relation_type", ""))
                    rel_str = rel.value if hasattr(rel, "value") else str(rel)
                    edges_data.append({
                        "from_id": from_id,
                        "to_id": to_id,
                        "relation_type": rel_str,
                    })

                self._send_json({
                    "project_id": "project-phoenix",
                    "title": title,
                    "total_nodes": len(nodes_data),
                    "total_edges": len(edges_data),
                    "nodes": nodes_data,
                    "edges": edges_data,
                })

            elif path == "/api/readiness":
                _, nodes, _, _ = self._get_demo_graph()
                readiness = app.ReadinessEngine.evaluate(nodes)
                self._send_json(readiness)

            elif path == "/api/traces/correlate":
                project_id = params.get("project_id", ["project-phoenix"])[0]
                graph_data = STORAGE.load_graph_data(project_id)
                nodes = graph_data.get("nodes", [])
                edges = graph_data.get("edges", [])
                report = CORRELATION_ENGINE.correlate(project_id, nodes, edges)
                self._send_json(report)

            elif path == "/api/traces/shadow-dependencies":
                project_id = params.get("project_id", ["project-phoenix"])[0]
                graph_data = STORAGE.load_graph_data(project_id)
                nodes = graph_data.get("nodes", [])
                edges = graph_data.get("edges", [])
                report = CORRELATION_ENGINE.correlate(project_id, nodes, edges)
                self._send_json({
                    "project_id": project_id,
                    "shadow_dependencies": report["shadow_dependencies"],
                    "shadow_risk_level": report["telemetry_summary"]["shadow_risk_level"],
                    "total_shadow_dependencies": len(report["shadow_dependencies"])
                })

            elif path == "/api/traces/empirical-blast-radius":
                project_id = params.get("project_id", ["project-phoenix"])[0]
                node_id = params.get("node_id", ["COMP-001"])[0]
                latency_spike = float(params.get("latency_ms", [600.0])[0])
                error_rate = float(params.get("error_rate", [0.5])[0])
                graph_data = STORAGE.load_graph_data(project_id)
                nodes = graph_data.get("nodes", [])
                edges = graph_data.get("edges", [])
                sim = CORRELATION_ENGINE.simulate_empirical_blast_radius(
                    project_id=project_id,
                    failing_node=node_id,
                    static_nodes=nodes,
                    static_edges=edges,
                    injected_latency_ms=latency_spike,
                    injected_error_rate=error_rate
                )
                self._send_json(sim)

            elif path == "/api/snapshots":
                project_id = params.get("project_id", ["project-phoenix"])[0]
                snapshots = STORAGE.list_snapshots(project_id)
                self._send_json({"project_id": project_id, "snapshots": snapshots})

            else:
                self._send_json({"error": f"Endpoint not found: {path}"}, 404)

        except Exception as e:
            self._send_json({"error": f"Internal server error: {str(e)}"}, 500)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            payload, err = self._read_json_body()
            if err:
                self._send_json({"error": err[0]}, err[1])
                return

            if path == "/api/projects":
                p_id = payload.get("project_id")
                name = payload.get("name")
                desc = payload.get("description", "")
                meta = payload.get("metadata", {})
                if not p_id or not name:
                    self._send_json({"error": "Missing required 'project_id' or 'name'"}, 400)
                    return
                res = STORAGE.create_project(p_id, name, desc, meta)
                self._send_json(res, 201)

            elif path == "/api/nodes":
                project_id = payload.get("project_id", "project-phoenix")
                node_data = payload.get("node") or payload
                if not node_data.get("id"):
                    self._send_json({"error": "Missing required node 'id'"}, 400)
                    return
                saved = STORAGE.save_node(project_id, node_data)
                self._send_json(saved, 200)

            elif path == "/api/edges":
                project_id = payload.get("project_id", "project-phoenix")
                edge_data = payload.get("edge") or payload
                if not edge_data.get("from_id") and not edge_data.get("source_id"):
                    self._send_json({"error": "Missing required edge 'from_id' / 'source_id'"}, 400)
                    return
                saved = STORAGE.save_edge(project_id, edge_data)
                self._send_json(saved, 200)

            elif path == "/api/blast-radius":
                severed_ids = payload.get("severed_node_ids", [])
                project_id = payload.get("project_id")
                if isinstance(severed_ids, str):
                    severed_ids = [severed_ids]

                if project_id and project_id != "project-phoenix":
                    blast_res = STORAGE.compute_project_blast_radius(project_id, severed_ids)
                    self._send_json(blast_res)
                    return

                # Demo Project Phoenix blast radius
                _, nodes, edges, graph = self._get_demo_graph()
                disabled_set = set(severed_ids)
                blast_res = graph.compute_blast_radius(disabled_set)
                readiness_impact = app.ReadinessEngine.evaluate(nodes, disabled_node_ids=disabled_set)

                self._send_json({
                    "project_id": "project-phoenix",
                    "severed_node_ids": list(disabled_set),
                    "affected_requirements": blast_res.get("affected_requirements", []),
                    "affected_components": blast_res.get("affected_components", []),
                    "affected_tests": blast_res.get("affected_tests", []),
                    "degraded_readiness_score": readiness_impact.get("total_score", 0),
                    "is_ready": readiness_impact.get("is_ready", False),
                })

            elif path == "/api/audit-text":
                title = payload.get("title", "")
                description = payload.get("description", "")
                temp_req = app.Requirement(
                    id="REQ-TEST",
                    node_type=app.NodeType.REQUIREMENT,
                    title=title,
                    description=description,
                )
                has_ambiguity, notes, remediation, opts = app.AmbiguityEngine.audit_requirement(temp_req)
                self._send_json({
                    "has_ambiguity": has_ambiguity,
                    "notes": notes,
                    "remediation": remediation,
                    "resolution_options": opts,
                })

            elif path == "/api/snapshots":
                project_id = payload.get("project_id", "project-phoenix")
                label = payload.get("label")
                snap = STORAGE.create_snapshot(project_id, label)
                self._send_json(snap, 201)

            elif path == "/api/ingest/openapi":
                spec = payload.get("spec")
                project_id = payload.get("project_id")
                if not spec or not project_id:
                    self._send_json({"error": "Missing required 'spec' or 'project_id'"}, 400)
                    return
                summary = ingest_openapi(spec, project_id, STORAGE)
                self._send_json(summary.to_dict(), 201)

            elif path == "/api/ingest/terraform":
                plan = payload.get("plan") or payload.get("config")
                project_id = payload.get("project_id")
                if not plan or not project_id:
                    self._send_json({"error": "Missing required 'plan' or 'project_id'"}, 400)
                    return
                summary = ingest_terraform(plan, project_id, STORAGE)
                self._send_json(summary.to_dict(), 201)

            elif path == "/api/ingest/manifest":
                manifest = payload.get("manifest")
                project_id = payload.get("project_id")
                if not manifest or not project_id:
                    self._send_json({"error": "Missing required 'manifest' or 'project_id'"}, 400)
                    return
                summary = ingest_container_manifest(manifest, project_id, STORAGE)
                self._send_json(summary.to_dict(), 201)

            elif path == "/api/traces/ingest":
                project_id = payload.get("project_id", "project-phoenix")
                fmt = payload.get("format", "opentelemetry").lower()
                if fmt in ("opentelemetry", "otel"):
                    spans_payload = payload.get("payload") or payload
                    spans = parse_opentelemetry_json(spans_payload)
                    count = RUNTIME_STORE.record_spans(project_id, spans)
                    self._send_json({
                        "project_id": project_id,
                        "format": "opentelemetry",
                        "recorded_spans": count,
                        "status": "ingested"
                    }, 201)
                elif fmt in ("ebpf_flows", "ebpf", "flows"):
                    raw_flows = payload.get("flows", [])
                    flows = [
                        ObservedFlow(
                            source_service=rf.get("source_service", ""),
                            target_service=rf.get("target_service", ""),
                            bytes_sent=int(rf.get("bytes_sent", 0)),
                            bytes_recv=int(rf.get("bytes_recv", 0)),
                            latency_ms=float(rf.get("latency_ms", 0.0)),
                            error_count=int(rf.get("error_count", 0)),
                            protocol=rf.get("protocol", "tcp"),
                            timestamp=rf.get("timestamp", "")
                        )
                        for rf in raw_flows if rf.get("source_service") and rf.get("target_service")
                    ]
                    count = RUNTIME_STORE.record_flows(project_id, flows)
                    self._send_json({
                        "project_id": project_id,
                        "format": "ebpf_flows",
                        "recorded_flows": count,
                        "status": "ingested"
                    }, 201)
                else:
                    self._send_json({"error": f"Unsupported format: {fmt}. Use 'opentelemetry' or 'ebpf_flows'"}, 400)

            else:
                self._send_json({"error": f"Endpoint not found: {path}"}, 404)

        except Exception as e:
            self._send_json({"error": f"Internal server error: {str(e)}"}, 500)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        try:
            if path == "/api/projects":
                project_id = params.get("project_id", [None])[0]
                if not project_id:
                    self._send_json({"error": "Missing required 'project_id' parameter"}, 400)
                    return
                deleted = STORAGE.delete_project(project_id)
                self._send_json({"project_id": project_id, "deleted": deleted})

            elif path == "/api/nodes":
                project_id = params.get("project_id", [None])[0]
                node_id = params.get("node_id", [None])[0]
                if not project_id or not node_id:
                    self._send_json({"error": "Missing required 'project_id' and 'node_id' parameters"}, 400)
                    return
                deleted = STORAGE.delete_node(project_id, node_id)
                self._send_json({"project_id": project_id, "node_id": node_id, "deleted": deleted})

            elif path == "/api/edges":
                project_id = params.get("project_id", [None])[0]
                src = params.get("source_id", [None])[0]
                tgt = params.get("target_id", [None])[0]
                rel = params.get("relation_type", [None])[0]
                if not project_id or not src or not tgt:
                    self._send_json({"error": "Missing required 'project_id', 'source_id', and 'target_id'"}, 400)
                    return
                deleted = STORAGE.delete_edge(project_id, src, tgt, rel)
                self._send_json({"project_id": project_id, "source_id": src, "target_id": tgt, "deleted": deleted})

            else:
                self._send_json({"error": f"Endpoint not found: {path}"}, 404)

        except Exception as e:
            self._send_json({"error": f"Internal server error: {str(e)}"}, 500)

    def log_message(self, format, *args):
        pass


def run_server(host: str = "127.0.0.1", port: int = 8001):
    server_address = (host, port)
    httpd = HTTPServer(server_address, TraceAPIHandler)
    print(f"[TRACE API] Running on http://{host}:{port} (NetworkX + SQLite Storage Engine ready)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[TRACE API] Shutting down.")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface to bind")
    parser.add_argument("--port", type=int, default=8001, help="Port to listen on")
    args = parser.parse_args()
    run_server(host=args.host, port=args.port)
