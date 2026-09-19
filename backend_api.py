"""TRACE — REST API Bridge
Exposes the NetworkX TraceabilityGraph, AmbiguityEngine, and Project Phoenix case study.
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

# Import TRACE app.py
import app

MAX_BODY_SIZE = 2 * 1024 * 1024  # 2 MB ceiling
ALLOWED_ORIGIN = os.environ.get("TRACE_ALLOWED_ORIGIN", "http://localhost:5173")


class TraceAPIHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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
                self._send_json({
                    "status": "ok",
                    "system": "TRACE Systems Architecture Engine",
                    "graph_backend": "NetworkX Digraph",
                    "active_demo": "Project Phoenix (Renewal Intelligence System)",
                    "port": 8001,
                })

            elif path == "/api/graph":
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

            else:
                self._send_json({"error": f"Endpoint not found: {path}"}, 404)

        except Exception:
            self._send_json({"error": "Internal server error"}, 500)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            payload, err = self._read_json_body()
            if err:
                self._send_json({"error": err[0]}, err[1])
                return

            if path == "/api/blast-radius":
                severed_ids = payload.get("severed_node_ids", [])
                if isinstance(severed_ids, str):
                    severed_ids = [severed_ids]

                _, nodes, edges, graph = self._get_demo_graph()
                disabled_set = set(severed_ids)
                
                # Compute mathematical blast radius using NetworkX
                blast_res = graph.compute_blast_radius(disabled_set)
                readiness_impact = app.ReadinessEngine.evaluate(nodes, disabled_node_ids=disabled_set)

                self._send_json({
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

            else:
                self._send_json({"error": f"Endpoint not found: {path}"}, 404)

        except Exception:
            self._send_json({"error": "Internal server error"}, 500)

    def log_message(self, format, *args):
        pass


def run_server(host: str = "127.0.0.1", port: int = 8001):
    server_address = (host, port)
    httpd = HTTPServer(server_address, TraceAPIHandler)
    print(f"[TRACE API] Running on http://{host}:{port} (NetworkX Engine ready)")
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
