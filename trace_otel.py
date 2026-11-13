"""TRACE Live OpenTelemetry & eBPF Runtime Stitching Engine.

Correlates observed distributed trace spans and network flow logs against
static architecture graphs, identifying verified edges, shadow dependencies,
and dormant couplings.
"""

from dataclasses import dataclass, field
import datetime
import json
import math
import sqlite3
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    from pydantic import BaseModel, Field
except ImportError:
    BaseModel = object  # Fallback if pydantic is not available


@dataclass
class ObservedSpan:
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    service_name: str = "unknown"
    peer_service: Optional[str] = None
    operation: str = "unknown"
    duration_ms: float = 0.0
    is_error: bool = False
    status_code: Optional[str] = None
    protocol: str = "http"
    timestamp: str = ""


@dataclass
class ObservedFlow:
    source_service: str
    target_service: str
    bytes_sent: int = 0
    bytes_recv: int = 0
    latency_ms: float = 0.0
    error_count: int = 0
    protocol: str = "tcp"
    timestamp: str = ""


@dataclass
class RuntimeTelemetryEdge:
    source: str
    target: str
    call_count: int
    error_count: int
    error_rate: float
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    protocols: List[str]
    operations: List[str]
    last_seen: str


class TraceRuntimeStore:
    """Stores and aggregates runtime traces in SQLite alongside TRACE storage."""

    def __init__(self, db_path: str = "trace_runtime.db"):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS runtime_spans (
                    span_id TEXT PRIMARY KEY,
                    trace_id TEXT NOT NULL,
                    parent_span_id TEXT,
                    service_name TEXT NOT NULL,
                    peer_service TEXT,
                    operation TEXT NOT NULL,
                    duration_ms REAL NOT NULL,
                    is_error INTEGER NOT NULL,
                    status_code TEXT,
                    protocol TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    project_id TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS runtime_flows (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_service TEXT NOT NULL,
                    target_service TEXT NOT NULL,
                    bytes_sent INTEGER NOT NULL,
                    bytes_recv INTEGER NOT NULL,
                    latency_ms REAL NOT NULL,
                    error_count INTEGER NOT NULL,
                    protocol TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    project_id TEXT NOT NULL
                )
                """
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_spans_project ON runtime_spans(project_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_spans_trace ON runtime_spans(trace_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_flows_project ON runtime_flows(project_id)")
            conn.commit()

    def record_spans(self, project_id: str, spans: List[ObservedSpan]) -> int:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        inserted = 0
        with self._get_conn() as conn:
            cursor = conn.cursor()
            for s in spans:
                ts = s.timestamp if s.timestamp else now
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO runtime_spans
                    (span_id, trace_id, parent_span_id, service_name, peer_service,
                     operation, duration_ms, is_error, status_code, protocol, timestamp, project_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        s.span_id,
                        s.trace_id,
                        s.parent_span_id,
                        s.service_name.strip().lower(),
                        s.peer_service.strip().lower() if s.peer_service else None,
                        s.operation,
                        s.duration_ms,
                        1 if s.is_error else 0,
                        s.status_code,
                        s.protocol,
                        ts,
                        project_id,
                    ),
                )
                inserted += 1
            conn.commit()
        return inserted

    def record_flows(self, project_id: str, flows: List[ObservedFlow]) -> int:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        inserted = 0
        with self._get_conn() as conn:
            cursor = conn.cursor()
            for f in flows:
                ts = f.timestamp if f.timestamp else now
                cursor.execute(
                    """
                    INSERT INTO runtime_flows
                    (source_service, target_service, bytes_sent, bytes_recv,
                     latency_ms, error_count, protocol, timestamp, project_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        f.source_service.strip().lower(),
                        f.target_service.strip().lower(),
                        f.bytes_sent,
                        f.bytes_recv,
                        f.latency_ms,
                        f.error_count,
                        f.protocol,
                        ts,
                        project_id,
                    ),
                )
                inserted += 1
            conn.commit()
        return inserted

    def aggregate_runtime_edges(self, project_id: str) -> List[RuntimeTelemetryEdge]:
        """Synthesize directional communication edges from spans and network flows."""
        edge_data: Dict[Tuple[str, str], Dict[str, Any]] = {}

        def _get_entry(src: str, tgt: str):
            key = (src, tgt)
            if key not in edge_data:
                edge_data[key] = {
                    "latencies": [],
                    "errors": 0,
                    "calls": 0,
                    "protocols": set(),
                    "operations": set(),
                    "last_seen": "",
                }
            return edge_data[key]

        with self._get_conn() as conn:
            cursor = conn.cursor()

            # Method A: Spans with explicit peer_service
            cursor.execute(
                """
                SELECT service_name, peer_service, operation, duration_ms, is_error, protocol, timestamp
                FROM runtime_spans
                WHERE project_id = ? AND peer_service IS NOT NULL AND peer_service != ''
                """,
                (project_id,),
            )
            for row in cursor.fetchall():
                src = row["service_name"]
                tgt = row["peer_service"]
                if src == tgt:
                    continue
                entry = _get_entry(src, tgt)
                entry["calls"] += 1
                entry["latencies"].append(float(row["duration_ms"]))
                if row["is_error"]:
                    entry["errors"] += 1
                entry["protocols"].add(row["protocol"])
                entry["operations"].add(row["operation"])
                if row["timestamp"] > entry["last_seen"]:
                    entry["last_seen"] = row["timestamp"]

            # Method B: Parent-child span correlation within traces
            cursor.execute(
                """
                SELECT p.service_name as parent_service, c.service_name as child_service,
                       c.operation, c.duration_ms, c.is_error, c.protocol, c.timestamp
                FROM runtime_spans c
                JOIN runtime_spans p ON c.trace_id = p.trace_id AND c.parent_span_id = p.span_id
                WHERE c.project_id = ? AND c.service_name != p.service_name
                """,
                (project_id,),
            )
            for row in cursor.fetchall():
                src = row["parent_service"]
                tgt = row["child_service"]
                entry = _get_entry(src, tgt)
                entry["calls"] += 1
                entry["latencies"].append(float(row["duration_ms"]))
                if row["is_error"]:
                    entry["errors"] += 1
                entry["protocols"].add(row["protocol"])
                entry["operations"].add(row["operation"])
                if row["timestamp"] > entry["last_seen"]:
                    entry["last_seen"] = row["timestamp"]

            # Method C: eBPF Flow logs
            cursor.execute(
                """
                SELECT source_service, target_service, latency_ms, error_count, protocol, timestamp
                FROM runtime_flows
                WHERE project_id = ? AND source_service != target_service
                """,
                (project_id,),
            )
            for row in cursor.fetchall():
                src = row["source_service"]
                tgt = row["target_service"]
                entry = _get_entry(src, tgt)
                entry["calls"] += 1
                entry["latencies"].append(float(row["latency_ms"]))
                entry["errors"] += int(row["error_count"])
                entry["protocols"].add(row["protocol"])
                if row["timestamp"] > entry["last_seen"]:
                    entry["last_seen"] = row["timestamp"]

        # Compile summaries
        results: List[RuntimeTelemetryEdge] = []
        for (src, tgt), data in edge_data.items():
            calls = max(1, data["calls"])
            lats = sorted(data["latencies"]) if data["latencies"] else [0.0]
            avg_lat = sum(lats) / len(lats)

            def _percentile(p: float) -> float:
                idx = max(0, min(len(lats) - 1, math.ceil(len(lats) * p) - 1))
                return round(lats[idx], 2)

            results.append(
                RuntimeTelemetryEdge(
                    source=src,
                    target=tgt,
                    call_count=calls,
                    error_count=data["errors"],
                    error_rate=round(data["errors"] / calls, 4),
                    avg_latency_ms=round(avg_lat, 2),
                    p95_latency_ms=_percentile(0.95),
                    p99_latency_ms=_percentile(0.99),
                    protocols=sorted(list(data["protocols"])),
                    operations=sorted(list(data["operations"]))[:20],
                    last_seen=data["last_seen"],
                )
            )
        return sorted(results, key=lambda x: x.call_count, reverse=True)


def parse_opentelemetry_json(payload: Dict[str, Any]) -> List[ObservedSpan]:
    """Parse standard OpenTelemetry batch or simplified span JSON."""
    spans: List[ObservedSpan] = []

    # Format 1: Simplified direct array of spans
    if isinstance(payload.get("spans"), list):
        for raw in payload["spans"]:
            spans.append(
                ObservedSpan(
                    trace_id=str(raw.get("trace_id", "trace-1")),
                    span_id=str(raw.get("span_id", "")),
                    parent_span_id=str(raw.get("parent_span_id")) if raw.get("parent_span_id") else None,
                    service_name=str(raw.get("service_name") or raw.get("service") or "unknown"),
                    peer_service=str(raw.get("peer_service")) if raw.get("peer_service") else None,
                    operation=str(raw.get("operation") or raw.get("name") or "operation"),
                    duration_ms=float(raw.get("duration_ms", 0.0)),
                    is_error=bool(raw.get("is_error", False) or raw.get("status") in ("ERROR", "error", 500)),
                    status_code=str(raw.get("status_code", "200")),
                    protocol=str(raw.get("protocol", "http")),
                    timestamp=str(raw.get("timestamp", "")),
                )
            )
        return spans

    # Format 2: Official OTel Collector resourceSpans format
    for resource_span in payload.get("resourceSpans", []):
        resource_attrs = {
            kv.get("key"): (kv.get("value", {}).get("stringValue") or kv.get("value"))
            for kv in resource_span.get("resource", {}).get("attributes", [])
        }
        res_service = resource_attrs.get("service.name", "unknown")

        for scope_span in resource_span.get("scopeSpans", []):
            for span in scope_span.get("spans", []):
                span_attrs = {
                    kv.get("key"): (kv.get("value", {}).get("stringValue") or kv.get("value"))
                    for kv in span.get("attributes", [])
                }
                peer = (
                    span_attrs.get("peer.service")
                    or span_attrs.get("net.peer.name")
                    or span_attrs.get("db.system")
                )
                start_nano = int(span.get("startTimeUnixNano", 0))
                end_nano = int(span.get("endTimeUnixNano", 0))
                duration_ms = (end_nano - start_nano) / 1_000_000.0 if end_nano > start_nano else 0.0
                status_obj = span.get("status", {})
                is_err = status_obj.get("code") in (2, "STATUS_CODE_ERROR", "ERROR")

                spans.append(
                    ObservedSpan(
                        trace_id=str(span.get("traceId", "")),
                        span_id=str(span.get("spanId", "")),
                        parent_span_id=str(span.get("parentSpanId")) if span.get("parentSpanId") else None,
                        service_name=res_service,
                        peer_service=peer,
                        operation=str(span.get("name", "unknown")),
                        duration_ms=round(duration_ms, 2),
                        is_error=is_err,
                        status_code=str(span_attrs.get("http.status_code", "200")),
                        protocol=span_attrs.get("rpc.system") or span_attrs.get("http.flavor") or "http",
                    )
                )

    return spans


class ArchitecturalCorrelationEngine:
    """Correlates runtime edges with static architecture nodes and edges."""

    def __init__(self, runtime_store: TraceRuntimeStore):
        self.runtime_store = runtime_store

    def correlate(
        self,
        project_id: str,
        static_nodes: List[Dict[str, Any]],
        static_edges: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Produce verified, shadow, and dormant classifications."""
        observed_edges = self.runtime_store.aggregate_runtime_edges(project_id)

        # Build name normalization map (node ID, node title, lowercased, slugified)
        node_id_map: Dict[str, str] = {}
        for n in static_nodes:
            nid = n.get("id", "")
            title = n.get("title", "")
            node_id_map[nid.lower()] = nid
            if title:
                node_id_map[title.lower()] = nid
                # also map title with hyphens or underscores
                node_id_map[title.lower().replace(" ", "-")] = nid
                node_id_map[title.lower().replace(" ", "_")] = nid

        def _resolve_id(name: str) -> str:
            lower = name.strip().lower()
            return node_id_map.get(lower, name.strip())

        # Static edges set: (from_node, to_node)
        static_edge_pairs: Set[Tuple[str, str]] = set()
        static_edge_details: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for e in static_edges:
            f_val = e.get("from_id") or e.get("from_node") or e.get("from") or ""
            t_val = e.get("to_id") or e.get("to_node") or e.get("to") or ""
            f_norm = _resolve_id(f_val)
            t_norm = _resolve_id(t_val)
            if f_norm and t_norm:
                pair = (f_norm, t_norm)
                static_edge_pairs.add(pair)
                static_edge_details[pair] = e

        observed_edge_pairs: Set[Tuple[str, str]] = set()

        verified_edges: List[Dict[str, Any]] = []
        shadow_dependencies: List[Dict[str, Any]] = []

        for obs in observed_edges:
            src_norm = _resolve_id(obs.source)
            tgt_norm = _resolve_id(obs.target)
            pair = (src_norm, tgt_norm)
            observed_edge_pairs.add(pair)

            obs_summary = {
                "source": src_norm,
                "target": tgt_norm,
                "raw_source": obs.source,
                "raw_target": obs.target,
                "call_count": obs.call_count,
                "error_count": obs.error_count,
                "error_rate": obs.error_rate,
                "avg_latency_ms": obs.avg_latency_ms,
                "p95_latency_ms": obs.p95_latency_ms,
                "p99_latency_ms": obs.p99_latency_ms,
                "protocols": obs.protocols,
                "operations": obs.operations,
                "last_seen": obs.last_seen,
            }

            if pair in static_edge_pairs or (tgt_norm, src_norm) in static_edge_pairs:
                matched_pair = pair if pair in static_edge_pairs else (tgt_norm, src_norm)
                static_info = static_edge_details.get(matched_pair, {})
                obs_summary["relation"] = static_info.get("relation", "DEPENDS_ON")
                obs_summary["status"] = "VERIFIED_ACTIVE"
                verified_edges.append(obs_summary)
            else:
                # Shadow dependency: exists at runtime but missing in architecture!
                severity = "CRITICAL" if obs.error_rate > 0.1 or obs.call_count > 500 else "HIGH"
                obs_summary["status"] = "SHADOW_DEPENDENCY"
                obs_summary["severity"] = severity
                obs_summary["risk"] = (
                    f"Unmapped runtime dependency detected from '{obs.source}' to '{obs.target}'. "
                    f"Observed {obs.call_count} calls with {obs.error_rate * 100:.1f}% error rate and {obs.p95_latency_ms}ms p95 latency. "
                    "Bypasses documented architecture, blast-radius simulations, and firewall/IAM governance."
                )
                obs_summary["recommendation"] = (
                    f"Add explicit edge ({src_norm} -> {tgt_norm}) to architecture topology "
                    "and review security perimeter."
                )
                shadow_dependencies.append(obs_summary)

        # Dormant edges: in static architecture, but never observed during trace window
        dormant_edges: List[Dict[str, Any]] = []
        for pair in static_edge_pairs:
            rev_pair = (pair[1], pair[0])
            if pair not in observed_edge_pairs and rev_pair not in observed_edge_pairs:
                e_info = static_edge_details.get(pair, {})
                dormant_edges.append({
                    "from_node": pair[0],
                    "to_node": pair[1],
                    "relation": e_info.get("relation", "DEPENDS_ON"),
                    "status": "DORMANT_OR_UNDEPLOYED",
                    "note": "Declared in static architecture/IaC but 0 communication spans observed during telemetry window.",
                })

        return {
            "project_id": project_id,
            "telemetry_summary": {
                "total_observed_runtime_edges": len(observed_edges),
                "verified_active_edges": len(verified_edges),
                "shadow_dependencies_count": len(shadow_dependencies),
                "dormant_edges_count": len(dormant_edges),
                "shadow_risk_level": "CRITICAL" if any(s["severity"] == "CRITICAL" for s in shadow_dependencies) else ("HIGH" if shadow_dependencies else "CLEAN"),
            },
            "verified_edges": verified_edges,
            "shadow_dependencies": shadow_dependencies,
            "dormant_edges": dormant_edges,
        }

    def simulate_empirical_blast_radius(
        self,
        project_id: str,
        failing_node: str,
        static_nodes: List[Dict[str, Any]],
        static_edges: List[Dict[str, Any]],
        injected_latency_ms: float = 600.0,
        injected_error_rate: float = 0.5,
    ) -> Dict[str, Any]:
        """Compute empirical blast radius by combining topology with observed traffic and latencies."""
        correlation = self.correlate(project_id, static_nodes, static_edges)

        # Build composite runtime graph
        adjacency: Dict[str, List[Dict[str, Any]]] = {}
        # Downstream callers (who calls failing_node, and who calls those callers)
        callers: Dict[str, List[Dict[str, Any]]] = {}

        all_edges = correlation["verified_edges"] + correlation["shadow_dependencies"]
        for e in all_edges:
            src = e["source"]
            tgt = e["target"]
            if src not in adjacency:
                adjacency[src] = []
            adjacency[src].append(e)

            if tgt not in callers:
                callers[tgt] = []
            callers[tgt].append(e)

        # Trace cascading impact on upstream callers (who rely on failing_node)
        impacted_nodes: Dict[str, Dict[str, Any]] = {}
        queue = [(failing_node, 0, injected_latency_ms, injected_error_rate)]
        visited = set()

        while queue:
            curr_node, hop, added_lat, err_prob = queue.pop(0)
            if curr_node in visited:
                continue
            visited.add(curr_node)

            if curr_node != failing_node:
                impacted_nodes[curr_node] = {
                    "node_id": curr_node,
                    "hop_distance": hop,
                    "projected_latency_increase_ms": round(added_lat, 1),
                    "projected_error_exposure": round(err_prob, 3),
                    "cascading_timeout_risk": "HIGH" if added_lat > 500 else ("MEDIUM" if added_lat > 200 else "LOW"),
                }

            # Propagate to services that depend on this node
            for call_edge in callers.get(curr_node, []):
                caller_src = call_edge["source"]
                if caller_src not in visited:
                    # Latency decay/dampening factor based on call frequency
                    attenuation = 0.85
                    propagated_lat = added_lat * attenuation
                    propagated_err = err_prob * 0.75
                    queue.append((caller_src, hop + 1, propagated_lat, propagated_err))

        return {
            "project_id": project_id,
            "failing_node": failing_node,
            "injected_outage": {
                "latency_spike_ms": injected_latency_ms,
                "error_rate": injected_error_rate,
            },
            "impact_summary": {
                "total_impacted_services": len(impacted_nodes),
                "max_propagation_hops": max([x["hop_distance"] for x in impacted_nodes.values()], default=0),
                "high_timeout_risk_count": sum(1 for x in impacted_nodes.values() if x["cascading_timeout_risk"] == "HIGH"),
            },
            "impacted_services": sorted(list(impacted_nodes.values()), key=lambda x: x["hop_distance"]),
        }
