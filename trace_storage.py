"""TRACE Persistent Multi-Project Graph Storage Engine.

Backs TRACE's NetworkX TraceabilityGraph and ontology in SQLite with project lifecycle,
atomic graph serialization, incremental node/edge updates, point-in-time snapshots,
and blast-radius evaluation over persistent graphs.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Optional, Set, Tuple

DEFAULT_DB_PATH = Path(os.environ.get("TRACE_DB_PATH", Path(__file__).parent / "data" / "trace.db"))


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TraceStorage:
    """Manages SQLite persistence for TRACE projects, nodes, edges, and snapshots."""

    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH):
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if self.db_path == ":memory:":
            if not hasattr(self, "_mem_conn") or self._mem_conn is None:
                self._mem_conn = sqlite3.connect(":memory:")
                self._mem_conn.row_factory = sqlite3.Row
                self._mem_conn.execute("PRAGMA foreign_keys = ON")
            return self._mem_conn
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def init_db(self) -> None:
        """Create tables and indexes if they do not exist."""
        with self._get_connection() as conn:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS projects (
                    project_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata_json TEXT DEFAULT '{}'
                )"""
            )
            conn.execute(
                """CREATE TABLE IF NOT EXISTS project_nodes (
                    project_id TEXT NOT NULL,
                    node_id TEXT NOT NULL,
                    node_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    epistemic_status TEXT DEFAULT 'INTERPRETATION',
                    validation_status TEXT DEFAULT 'PROPOSED_BY_AI',
                    confidence REAL DEFAULT 1.0,
                    priority TEXT DEFAULT 'HIGH',
                    system_type TEXT,
                    layer TEXT,
                    arch_type TEXT,
                    owner TEXT,
                    raw_source_text TEXT,
                    tags_json TEXT DEFAULT '[]',
                    metadata_json TEXT DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (project_id, node_id),
                    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
                )"""
            )
            conn.execute(
                """CREATE TABLE IF NOT EXISTS project_edges (
                    edge_id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    confidence REAL DEFAULT 1.0,
                    metadata_json TEXT DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
                )"""
            )
            conn.execute(
                """CREATE TABLE IF NOT EXISTS project_snapshots (
                    snapshot_id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    version INTEGER NOT NULL,
                    label TEXT,
                    nodes_count INTEGER NOT NULL,
                    edges_count INTEGER NOT NULL,
                    snapshot_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
                )"""
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_nodes_project ON project_nodes(project_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_edges_project ON project_edges(project_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_edges_lookup ON project_edges(project_id, source_id, target_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_project ON project_snapshots(project_id, version)")
            conn.commit()

    def create_project(
        self,
        project_id: str,
        name: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new architecture project namespace."""
        now = _utc_now_iso()
        meta_str = json.dumps(metadata or {})
        with self._get_connection() as conn:
            conn.execute(
                """INSERT INTO projects (project_id, name, description, created_at, updated_at, metadata_json)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (project_id, name, description, now, now, meta_str),
            )
            conn.commit()
        return {
            "project_id": project_id,
            "name": name,
            "description": description,
            "created_at": now,
            "updated_at": now,
            "metadata": metadata or {},
        }

    def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects with node and edge counts."""
        with self._get_connection() as conn:
            rows = conn.execute(
                """SELECT p.*,
                          (SELECT COUNT(*) FROM project_nodes n WHERE n.project_id = p.project_id) AS node_count,
                          (SELECT COUNT(*) FROM project_edges e WHERE e.project_id = p.project_id) AS edge_count
                   FROM projects p
                   ORDER BY p.updated_at DESC"""
            ).fetchall()
            results = []
            for r in rows:
                d = dict(r)
                try:
                    d["metadata"] = json.loads(d.pop("metadata_json") or "{}")
                except Exception:
                    d["metadata"] = {}
                results.append(d)
            return results

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve project header and statistics."""
        with self._get_connection() as conn:
            row = conn.execute(
                """SELECT p.*,
                          (SELECT COUNT(*) FROM project_nodes n WHERE n.project_id = p.project_id) AS node_count,
                          (SELECT COUNT(*) FROM project_edges e WHERE e.project_id = p.project_id) AS edge_count
                   FROM projects p
                   WHERE p.project_id = ?""",
                (project_id,),
            ).fetchone()
            if not row:
                return None
            d = dict(row)
            try:
                d["metadata"] = json.loads(d.pop("metadata_json") or "{}")
            except Exception:
                d["metadata"] = {}
            return d

    def delete_project(self, project_id: str) -> bool:
        """Delete project and all associated nodes, edges, and snapshots."""
        with self._get_connection() as conn:
            cur = conn.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))
            conn.commit()
            return cur.rowcount > 0

    def save_node(self, project_id: str, node: Dict[str, Any]) -> Dict[str, Any]:
        """Insert or update an architecture node within a project."""
        node_id = str(node.get("id") or node.get("node_id"))
        if not node_id:
            raise ValueError("Node is missing required 'id'")
        node_type = str(node.get("node_type", "SYSTEM_COMPONENT"))
        title = str(node.get("title", node_id))
        description = str(node.get("description", ""))
        epistemic = str(node.get("epistemic_status", "INTERPRETATION"))
        validation = str(node.get("validation_status", "PROPOSED_BY_AI"))
        confidence = float(node.get("confidence", 1.0))
        priority = str(node.get("priority", "HIGH"))
        system_type = node.get("system_type")
        layer = node.get("layer")
        arch_type = node.get("arch_type")
        owner = node.get("owner")
        raw_source_text = node.get("raw_source_text")
        tags = json.dumps(node.get("tags", []))
        meta = json.dumps(node.get("metadata", {}))
        now = _utc_now_iso()

        with self._get_connection() as conn:
            conn.execute(
                """INSERT INTO project_nodes (
                    project_id, node_id, node_type, title, description,
                    epistemic_status, validation_status, confidence, priority,
                    system_type, layer, arch_type, owner, raw_source_text,
                    tags_json, metadata_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(project_id, node_id) DO UPDATE SET
                    node_type = excluded.node_type,
                    title = excluded.title,
                    description = excluded.description,
                    epistemic_status = excluded.epistemic_status,
                    validation_status = excluded.validation_status,
                    confidence = excluded.confidence,
                    priority = excluded.priority,
                    system_type = excluded.system_type,
                    layer = excluded.layer,
                    arch_type = excluded.arch_type,
                    owner = excluded.owner,
                    raw_source_text = excluded.raw_source_text,
                    tags_json = excluded.tags_json,
                    metadata_json = excluded.metadata_json,
                    updated_at = excluded.updated_at
                """,
                (
                    project_id, node_id, node_type, title, description,
                    epistemic, validation, confidence, priority,
                    system_type, layer, arch_type, owner, raw_source_text,
                    tags, meta, now, now,
                ),
            )
            conn.execute("UPDATE projects SET updated_at = ? WHERE project_id = ?", (now, project_id))
            conn.commit()

        return {
            "id": node_id,
            "project_id": project_id,
            "node_type": node_type,
            "title": title,
            "description": description,
            "epistemic_status": epistemic,
            "validation_status": validation,
            "confidence": confidence,
            "priority": priority,
            "layer": layer,
            "arch_type": arch_type,
            "updated_at": now,
        }

    def delete_node(self, project_id: str, node_id: str) -> bool:
        """Delete a node and any incident edges."""
        with self._get_connection() as conn:
            conn.execute(
                "DELETE FROM project_edges WHERE project_id = ? AND (source_id = ? OR target_id = ?)",
                (project_id, node_id, node_id),
            )
            cur = conn.execute(
                "DELETE FROM project_nodes WHERE project_id = ? AND node_id = ?",
                (project_id, node_id),
            )
            conn.commit()
            return cur.rowcount > 0

    def save_edge(self, project_id: str, edge: Dict[str, Any]) -> Dict[str, Any]:
        """Insert or replace a directed relation edge."""
        source_id = str(edge.get("from_id") or edge.get("source_id") or edge.get("from"))
        target_id = str(edge.get("to_id") or edge.get("target_id") or edge.get("to"))
        relation_type = str(edge.get("relation_type") or edge.get("relation") or "DEPENDS_ON")
        if not source_id or not target_id:
            raise ValueError("Edge requires both source and target identifiers")

        edge_id = str(edge.get("edge_id") or f"edge-{source_id}-{relation_type}-{target_id}")
        confidence = float(edge.get("confidence", 1.0))
        meta = json.dumps(edge.get("metadata", {}))
        now = _utc_now_iso()

        with self._get_connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO project_edges (
                    edge_id, project_id, source_id, relation_type, target_id, confidence, metadata_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (edge_id, project_id, source_id, relation_type, target_id, confidence, meta, now),
            )
            conn.execute("UPDATE projects SET updated_at = ? WHERE project_id = ?", (now, project_id))
            conn.commit()

        return {
            "edge_id": edge_id,
            "project_id": project_id,
            "source_id": source_id,
            "relation_type": relation_type,
            "target_id": target_id,
            "confidence": confidence,
            "created_at": now,
        }

    def delete_edge(
        self,
        project_id: str,
        source_id: str,
        target_id: str,
        relation_type: Optional[str] = None,
    ) -> bool:
        """Delete an edge matching source, target, and optional relation type."""
        with self._get_connection() as conn:
            if relation_type:
                cur = conn.execute(
                    "DELETE FROM project_edges WHERE project_id = ? AND source_id = ? AND target_id = ? AND relation_type = ?",
                    (project_id, source_id, target_id, relation_type),
                )
            else:
                cur = conn.execute(
                    "DELETE FROM project_edges WHERE project_id = ? AND source_id = ? AND target_id = ?",
                    (project_id, source_id, target_id),
                )
            conn.commit()
            return cur.rowcount > 0

    def load_graph_data(self, project_id: str) -> Dict[str, Any]:
        """Load complete node and edge lists formatted for API consumers."""
        proj = self.get_project(project_id)
        if not proj:
            raise ValueError(f"Project '{project_id}' not found.")

        with self._get_connection() as conn:
            n_rows = conn.execute(
                "SELECT * FROM project_nodes WHERE project_id = ? ORDER BY node_id ASC",
                (project_id,),
            ).fetchall()
            nodes = []
            for r in n_rows:
                d = dict(r)
                try:
                    d["tags"] = json.loads(d.pop("tags_json") or "[]")
                except Exception:
                    d["tags"] = []
                try:
                    d["metadata"] = json.loads(d.pop("metadata_json") or "{}")
                except Exception:
                    d["metadata"] = {}
                d["id"] = d.pop("node_id")
                nodes.append(d)

            e_rows = conn.execute(
                "SELECT * FROM project_edges WHERE project_id = ? ORDER BY created_at ASC",
                (project_id,),
            ).fetchall()
            edges = []
            for r in e_rows:
                d = dict(r)
                edges.append({
                    "edge_id": d["edge_id"],
                    "from_id": d["source_id"],
                    "to_id": d["target_id"],
                    "relation_type": d["relation_type"],
                    "confidence": d["confidence"],
                })

        return {
            "project_id": project_id,
            "title": proj["name"],
            "description": proj["description"],
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "nodes": nodes,
            "edges": edges,
        }

    def compute_project_blast_radius(
        self,
        project_id: str,
        severed_node_ids: List[str],
    ) -> Dict[str, Any]:
        """Compute blast radius directly over a project's persisted NetworkX graph."""
        import networkx as nx

        graph_data = self.load_graph_data(project_id)
        di_graph = nx.MultiDiGraph()
        nodes_lookup = {n["id"]: n for n in graph_data["nodes"]}

        for n in graph_data["nodes"]:
            di_graph.add_node(n["id"], **n)

        for e in graph_data["edges"]:
            di_graph.add_edge(e["from_id"], e["to_id"], relation=e["relation_type"])

        disabled_set = set(severed_node_ids)
        affected_nodes: Set[str] = set()

        for d_id in disabled_set:
            if d_id not in di_graph:
                continue
            for parent in di_graph.predecessors(d_id):
                affected_nodes.add(parent)

            # Downstream traversal
            visited: Set[str] = set()
            def _dfs(cur: str):
                if cur in visited:
                    return
                visited.add(cur)
                for succ in di_graph.successors(cur):
                    affected_nodes.add(succ)
                    _dfs(succ)
            _dfs(d_id)

        affected_reqs = [
            n for n in affected_nodes
            if nodes_lookup.get(n, {}).get("node_type") == "REQUIREMENT"
        ]
        affected_comps = [
            n for n in affected_nodes
            if nodes_lookup.get(n, {}).get("node_type") == "SYSTEM_COMPONENT"
        ]
        affected_tests = [
            n for n in affected_nodes
            if nodes_lookup.get(n, {}).get("node_type") == "TEST_CASE"
        ]

        return {
            "project_id": project_id,
            "severed_node_ids": list(disabled_set),
            "affected_node_ids": list(affected_nodes),
            "affected_requirements": affected_reqs,
            "affected_components": affected_comps,
            "affected_tests": affected_tests,
            "impact_severity": "HIGH" if len(affected_reqs) > 1 else ("MEDIUM" if affected_reqs else "LOW"),
        }

    def create_snapshot(self, project_id: str, label: Optional[str] = None) -> Dict[str, Any]:
        """Generate an immutable versioned snapshot of the current project graph."""
        graph_data = self.load_graph_data(project_id)
        now = _utc_now_iso()

        with self._get_connection() as conn:
            max_row = conn.execute(
                "SELECT COALESCE(MAX(version), 0) AS max_v FROM project_snapshots WHERE project_id = ?",
                (project_id,),
            ).fetchone()
            version = (max_row["max_v"] if max_row else 0) + 1
            snap_id = f"snap-{project_id}-v{version}"
            snap_json = json.dumps(graph_data)

            conn.execute(
                """INSERT INTO project_snapshots (
                    snapshot_id, project_id, version, label, nodes_count, edges_count, snapshot_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    snap_id,
                    project_id,
                    version,
                    label or f"Version {version} Snapshot",
                    graph_data["total_nodes"],
                    graph_data["total_edges"],
                    snap_json,
                    now,
                ),
            )
            conn.commit()

        return {
            "snapshot_id": snap_id,
            "project_id": project_id,
            "version": version,
            "label": label or f"Version {version} Snapshot",
            "nodes_count": graph_data["total_nodes"],
            "edges_count": graph_data["total_edges"],
            "created_at": now,
        }

    def list_snapshots(self, project_id: str) -> List[Dict[str, Any]]:
        """List snapshots for a given project."""
        with self._get_connection() as conn:
            rows = conn.execute(
                """SELECT snapshot_id, project_id, version, label, nodes_count, edges_count, created_at
                   FROM project_snapshots
                   WHERE project_id = ?
                   ORDER BY version DESC""",
                (project_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def seed_default_project_phoenix(self) -> None:
        """Seed Project Phoenix if it is not already present."""
        if self.get_project("project-phoenix"):
            return

        self.create_project(
            project_id="project-phoenix",
            name="Project Phoenix (Renewal Intelligence System)",
            description="Canonical case study evaluating SaaS renewal risk, intervention gates, and telemetry stores.",
            metadata={"seed_demo": True},
        )

        try:
            import app
            title, demo_nodes, demo_edges = app.load_renewal_demo()
            for n in demo_nodes:
                self.save_node("project-phoenix", {
                    "id": n.id,
                    "node_type": n.node_type.value if hasattr(n.node_type, "value") else str(n.node_type),
                    "title": n.title,
                    "description": n.description,
                    "epistemic_status": n.epistemic_status.value if hasattr(n.epistemic_status, "value") else str(n.epistemic_status),
                    "validation_status": n.validation_status.value if hasattr(n.validation_status, "value") else str(n.validation_status),
                    "confidence": getattr(n, "confidence", 1.0),
                    "priority": n.priority.value if hasattr(n, "priority") and hasattr(n.priority, "value") else "HIGH",
                    "system_type": getattr(n, "system_type", None),
                })

            for e in demo_edges:
                from_id = getattr(e, "source_id", getattr(e, "from_id", ""))
                to_id = getattr(e, "target_id", getattr(e, "to_id", ""))
                rel = getattr(e, "relation", getattr(e, "relation_type", "DEPENDS_ON"))
                rel_str = rel.value if hasattr(rel, "value") else str(rel)
                self.save_edge("project-phoenix", {
                    "from_id": from_id,
                    "to_id": to_id,
                    "relation_type": rel_str,
                })
        except Exception:
            pass
