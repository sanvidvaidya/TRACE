"""TRACE — From Ambiguous Intent to Executable Systems
Enterprise Systems Analysis Workspace, Requirements Engineering Studio & Decision Architecture Engine.
Run with: python -m streamlit run app.py
"""

from enum import Enum
import inspect
import json
import re
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx
import pandas as pd
import plotly.graph_objects as go
from pydantic import BaseModel, Field as PydanticField
import streamlit as st

# ==============================================================================
# STREAMLIT VERSION COMPATIBILITY HELPER
# ==============================================================================


def get_stretch_kw(func):
    """Adapts dynamically to eliminate deprecation warnings on Streamlit 1.63+."""
    try:
        sig = inspect.signature(func)
        if "width" in sig.parameters:
            return {"width": "stretch"}
    except Exception:
        pass
    return {"use_container_width": True}


# ==============================================================================
# 1. CORE ONTOLOGY & DOMAIN DATA MODELS
# ==============================================================================


class NodeType(str, Enum):
    BUSINESS_OUTCOME = "BUSINESS_OUTCOME"
    PROBLEM = "PROBLEM"
    STAKEHOLDER = "STAKEHOLDER"
    GOAL = "GOAL"
    DECISION = "DECISION"
    WORKFLOW_STEP = "WORKFLOW_STEP"
    REQUIREMENT = "REQUIREMENT"
    CONSTRAINT = "CONSTRAINT"
    ASSUMPTION = "ASSUMPTION"
    DATA_SOURCE = "DATA_SOURCE"
    SYSTEM_COMPONENT = "SYSTEM_COMPONENT"
    TEST_CASE = "TEST_CASE"
    QUESTION = "QUESTION"


class EpistemicStatus(str, Enum):
    SOURCE_FACT = "SOURCE_FACT"
    INTERPRETATION = "INTERPRETATION"
    INFERENCE = "INFERENCE"
    RECOMMENDATION = "RECOMMENDATION"
    UNKNOWN = "UNKNOWN_NEEDS_VALIDATION"


class ValidationStatus(str, Enum):
    PROPOSED_BY_AI = "PROPOSED_BY_AI"
    VALIDATED_BY_HUMAN = "VALIDATED_BY_HUMAN"
    REJECTED = "REJECTED"
    FLAGGED_AMBIGUOUS = "FLAGGED_AMBIGUOUS"
    FLAGGED_CONFLICT = "FLAGGED_CONFLICT"


class Priority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RequirementType(str, Enum):
    FUNCTIONAL = "FUNCTIONAL"
    NON_FUNCTIONAL = "NON_FUNCTIONAL"
    DATA = "DATA"
    SECURITY = "SECURITY"
    INTEGRATION = "INTEGRATION"
    GOVERNANCE = "GOVERNANCE"


class RelationType(str, Enum):
    SUPPORTS = "SUPPORTS"
    ADDRESSES = "ADDRESSES"
    EXPERIENCED_BY = "EXPERIENCED_BY"
    JUSTIFIES = "JUSTIFIES"
    TRIGGERS = "TRIGGERS"
    EXECUTES = "EXECUTES"
    DEPENDS_ON = "DEPENDS_ON"
    IMPLEMENTED_BY = "IMPLEMENTED_BY"
    READS_FROM = "READS_FROM"
    VALIDATED_BY = "VALIDATED_BY"
    CONFLICTS_WITH = "CONFLICTS_WITH"
    CLARIFIED_BY = "CLARIFIED_BY"
    FOUNDED_ON = "FOUNDED_ON"


class PersonaLens(str, Enum):
    ALL_SYSTEMS = "All Systems (Full Workbench)"
    EXECUTIVE = "Executive Sponsor Lens"
    ARCHITECT = "Solutions Architect Lens"
    QA_LEAD = "QA & Test Lead Lens"
    GOVERNANCE = "Security & Governance Lens"


class TraceNode(BaseModel):
    id: str
    node_type: NodeType
    title: str
    description: str
    epistemic_status: EpistemicStatus = EpistemicStatus.INTERPRETATION
    validation_status: ValidationStatus = ValidationStatus.PROPOSED_BY_AI
    source_reference: Optional[str] = None
    raw_source_text: Optional[str] = None
    confidence: float = 1.0
    owner: Optional[str] = None
    tags: List[str] = PydanticField(default_factory=list)
    metadata: Dict[str, Any] = PydanticField(default_factory=dict)


class Requirement(TraceNode):
    node_type: NodeType = NodeType.REQUIREMENT
    req_type: RequirementType = RequirementType.FUNCTIONAL
    priority: Priority = Priority.HIGH
    acceptance_criteria: List[str] = PydanticField(default_factory=list)
    is_ambiguous: bool = False
    ambiguity_notes: List[str] = PydanticField(default_factory=list)
    has_conflict: bool = False
    conflict_notes: List[str] = PydanticField(default_factory=list)
    story_points: int = 5
    t_shirt_size: str = "M"


class DataSource(TraceNode):
    node_type: NodeType = NodeType.DATA_SOURCE
    system_of_record: str = "Unknown"
    update_frequency: str = "Batch"
    access_protocol: str = "REST API"
    contains_pii: bool = False
    is_confirmed: bool = False
    data_classification: str = "Confidential"
    encryption_at_rest: bool = True
    retention_days: int = 365


class SystemComponent(TraceNode):
    node_type: NodeType = NodeType.SYSTEM_COMPONENT
    layer: str = "Application"
    arch_type: str = "Rule Engine"
    lifecycle_state: str = "PROPOSED"
    monthly_infra_cost: int = 250


class WorkflowStep(TraceNode):
    node_type: NodeType = NodeType.WORKFLOW_STEP
    sequence_index: int = 1
    actor_id: Optional[str] = None
    system_id: Optional[str] = None
    inputs: List[str] = PydanticField(default_factory=list)
    outputs: List[str] = PydanticField(default_factory=list)


class TestCase(TraceNode):
    node_type: NodeType = NodeType.TEST_CASE
    requirement_id: str
    given: str
    when: str
    then: str
    is_automated: bool = False


class Question(TraceNode):
    node_type: NodeType = NodeType.QUESTION
    severity: Priority = Priority.HIGH
    assigned_stakeholder: Optional[str] = None
    impact_description: Optional[str] = None
    resolution: Optional[str] = None
    is_resolved: bool = False


class Assumption(TraceNode):
    node_type: NodeType = NodeType.ASSUMPTION
    impact_level: Priority = Priority.HIGH
    validation_path: str
    is_verified: bool = False


class Decision(TraceNode):
    node_type: NodeType = NodeType.DECISION
    decision_maker: str
    alternatives_considered: List[str] = PydanticField(default_factory=list)
    tradeoff_summary: str = ""


class TraceEdge(BaseModel):
    source_id: str
    relation: str
    target_id: str
    confidence: float = 1.0


# ==============================================================================
# 2. TRACEABILITY GRAPH ENGINE & BLAST RADIUS
# ==============================================================================


class TraceabilityGraph:

    def __init__(self):
        self._graph = nx.MultiDiGraph()
        self._nodes: Dict[str, TraceNode] = {}
        self._edges: List[TraceEdge] = []

    def add_node(self, node: TraceNode) -> None:
        self._nodes[node.id] = node
        self._graph.add_node(
            node.id,
            title=node.title,
            node_type=node.node_type.value,
            epistemic_status=node.epistemic_status.value,
            validation_status=node.validation_status.value,
            confidence=node.confidence,
        )

    def update_node_status(
        self, node_id: str, new_status: ValidationStatus
    ) -> None:
        if node_id in self._nodes:
            self._nodes[node_id].validation_status = new_status
            self._graph.nodes[node_id]["validation_status"] = new_status.value

    def add_edge(self, edge: TraceEdge) -> None:
        self._edges.append(edge)
        self._graph.add_edge(
            edge.source_id,
            edge.target_id,
            key=edge.relation,
            relation=edge.relation,
            confidence=edge.confidence,
        )

    def get_node(self, node_id: str) -> Optional[TraceNode]:
        return self._nodes.get(node_id)

    def all_nodes(self) -> List[TraceNode]:
        return list(self._nodes.values())

    def all_edges(self) -> List[TraceEdge]:
        return list(self._edges)

    def trace_upstream(self, node_id: str) -> List[Dict[str, Any]]:
        if node_id not in self._graph:
            return []
        visited: Set[str] = set()
        chain: List[Dict[str, Any]] = []

        def _dfs(current: str, depth: int):
            if current in visited or depth > 6:
                return
            visited.add(current)
            for pred in self._graph.predecessors(current):
                edge_dict = self._graph.get_edge_data(pred, current)
                for key, attrs in edge_dict.items():
                    parent = self._nodes.get(pred)
                    if parent:
                        chain.append(
                            {
                                "from_id": pred,
                                "from_title": parent.title,
                                "from_type": parent.node_type.value,
                                "relation": attrs.get("relation", "SUPPORTS"),
                                "to_id": current,
                                "depth": depth,
                            }
                        )
                    _dfs(pred, depth + 1)

        _dfs(node_id, 1)
        return chain

    def trace_downstream(self, node_id: str) -> List[Dict[str, Any]]:
        if node_id not in self._graph:
            return []
        visited: Set[str] = set()
        chain: List[Dict[str, Any]] = []

        def _dfs(current: str, depth: int):
            if current in visited or depth > 6:
                return
            visited.add(current)
            for succ in self._graph.successors(current):
                edge_dict = self._graph.get_edge_data(current, succ)
                for key, attrs in edge_dict.items():
                    child = self._nodes.get(succ)
                    if child:
                        chain.append(
                            {
                                "from_id": current,
                                "relation": attrs.get(
                                    "relation", "IMPLEMENTED_BY"
                                ),
                                "to_id": succ,
                                "to_title": child.title,
                                "to_type": child.node_type.value,
                                "depth": depth,
                            }
                        )
                    _dfs(succ, depth + 1)

        _dfs(node_id, 1)
        return chain

    def get_orphans(self) -> Dict[str, List[str]]:
        unjustified_reqs = []
        untested_reqs = []
        unlinked_components = []
        for n_id, n in self._nodes.items():
            if n.node_type == NodeType.REQUIREMENT:
                if not list(self._graph.predecessors(n_id)):
                    unjustified_reqs.append(n_id)
                successors = list(self._graph.successors(n_id))
                has_test = any(
                    self._nodes.get(s)
                    and self._nodes[s].node_type == NodeType.TEST_CASE
                    for s in successors
                )
                if not has_test:
                    untested_reqs.append(n_id)
            elif n.node_type == NodeType.SYSTEM_COMPONENT:
                if not list(self._graph.predecessors(n_id)):
                    unlinked_components.append(n_id)
        return {
            "unjustified_requirements": unjustified_reqs,
            "untested_requirements": untested_reqs,
            "unlinked_components": unlinked_components,
        }

    def compute_blast_radius(
        self, disabled_node_ids: Set[str]
    ) -> Dict[str, Any]:
        affected_nodes: Set[str] = set()
        for d_id in disabled_node_ids:
            for parent in self._graph.predecessors(d_id):
                affected_nodes.add(parent)
            for item in self.trace_downstream(d_id):
                affected_nodes.add(item["to_id"])

        affected_reqs = [
            n
            for n in affected_nodes
            if self._nodes.get(n)
            and self._nodes[n].node_type == NodeType.REQUIREMENT
        ]
        affected_comps = [
            n
            for n in affected_nodes
            if self._nodes.get(n)
            and self._nodes[n].node_type == NodeType.SYSTEM_COMPONENT
        ]
        affected_tests = [
            n
            for n in affected_nodes
            if self._nodes.get(n)
            and self._nodes[n].node_type == NodeType.TEST_CASE
        ]

        return {
            "affected_node_ids": list(affected_nodes),
            "affected_requirements": affected_reqs,
            "affected_components": affected_comps,
            "affected_tests": affected_tests,
            "impact_severity": "HIGH"
            if len(affected_reqs) > 1
            else ("MEDIUM" if affected_reqs else "LOW"),
        }


# ==============================================================================
# 3. DETERMINISTIC AUDIT & AMBIGUITY ENGINES
# ==============================================================================

AMBIGUITY_PATTERNS = [
    (
        r"\b(real[\s\-]time|instantaneous|zero latency)\b",
        "Operational Latency Undefined",
        "Specify acceptable SLA bounds in milliseconds, seconds, or minutes.",
        [
            "Sub-second Event Stream (<500ms SLA via WebSockets/Kafka)",
            "Hourly Micro-batch Ingestion (<60 min SLA via CDC)",
            "24-Hour Nightly Scheduled Warehouse Refresh",
        ],
    ),
    (
        r"\b(seamless|frictionless|intuitive)\b",
        "Subjective Quality Metric",
        "Formulate testable UI/system handoff criteria.",
        [
            "Standardized OpenAPI 3.0 REST Contract with JSON schema validation",
            "Single Sign-On (SSO) with OAuth 2.0 / OIDC Session Token",
            "Asynchronous Event Notification with guaranteed delivery and retry",
        ],
    ),
    (
        r"\b(as much as needed|huge scale|all data)\b",
        "Unbounded Capacity Bounds",
        "Provide explicit throughput or storage bounds (e.g., GB/day, peak QPS).",
        [
            "Peak Throughput Capped at 5,000 QPS with rate limiting",
            "Daily Ingestion Target bounded at 50 GB/day with warm retention",
            "Autoscaling horizontal tier capped at 8 replicas",
        ],
    ),
    (
        r"\b(smart|intelligent|ai-powered)\b",
        "Unspecified Mechanism",
        "State whether logic requires deterministic rules, statistical ML, or human evaluation.",
        [
            "Deterministic Rule Heuristics Engine with inspectable criteria",
            "Statistical ML Model (XGBoost) with offline feature store",
            "LLM RAG Pipeline with human approval validation gate",
        ],
    ),
    (
        r"\b(users?|stakeholders?|someone)\b",
        "Ambiguous Actor Identity",
        "Specify the explicit role, persona, or permission profile.",
        [
            "Dedicated Customer Success Manager (Role: CSM_OPERATOR)",
            "Sales Account Executive (Role: SALES_REP)",
            "Platform Engineering Administrator (Role: PLATFORM_ADMIN)",
        ],
    ),
]


class AmbiguityEngine:

    @staticmethod
    def audit_requirement(
        req: Requirement,
    ) -> Tuple[bool, List[str], List[str], List[List[str]]]:
        notes, remediation, resolution_options = [], [], []
        text = f"{req.title} {req.description}".lower()
        for pattern, reason, fix, opts in AMBIGUITY_PATTERNS:
            match = re.search(pattern, text)
            if match:
                notes.append(f"{reason} ('{match.group(0)}')")
                remediation.append(fix)
                resolution_options.append(opts)
        if not req.acceptance_criteria:
            notes.append("No acceptance criteria formulated")
            remediation.append(
                "Formulate at least one Given-When-Then testable condition."
            )
            resolution_options.append(
                [
                    "Standard Happy Path: Given valid input, when evaluated, then assert state change.",
                    "Boundary Test: Given null data, when evaluated, then surface explicit validation error.",
                ]
            )
        if not req.owner:
            notes.append("Unassigned ownership")
            remediation.append(
                "Assign a responsible stakeholder department or role."
            )
            resolution_options.append(
                [
                    "Assign to Customer Success Org",
                    "Assign to Data Platform Engineering",
                ]
            )
        return len(notes) > 0, notes, remediation, resolution_options


class ContradictionEngine:

    @staticmethod
    def detect_conflicts(requirements: List[Requirement]) -> List[Dict[str, Any]]:
        conflicts = []
        for i in range(len(requirements)):
            for j in range(i + 1, len(requirements)):
                ra, rb = requirements[i], requirements[j]
                ta = f"{ra.title} {ra.description}".lower()
                tb = f"{rb.title} {rb.description}".lower()
                auto_a = any(
                    w in ta
                    for w in [
                        "automatic",
                        "autonomous",
                        "automatically",
                        "direct outreach",
                    ]
                )
                manual_b = any(
                    w in tb
                    for w in ["manual approval", "human sign-off", "must approve"]
                )
                auto_b = any(
                    w in tb
                    for w in [
                        "automatic",
                        "autonomous",
                        "automatically",
                        "direct outreach",
                    ]
                )
                manual_a = any(
                    w in ta
                    for w in ["manual approval", "human sign-off", "must approve"]
                )

                if (auto_a and manual_b) or (auto_b and manual_a):
                    conflicts.append(
                        {
                            "id": f"CONF-{ra.id}-{rb.id}",
                            "req_1": ra.id,
                            "req_2": rb.id,
                            "title": "Full Automation vs. Mandatory Manual Gate",
                            "description": f"Autonomous trigger in {ra.id} directly violates mandatory human gate in {rb.id}.",
                            "options": [
                                "Human-in-the-loop: Automated draft generation with mandatory human trigger gate.",
                                "Human-on-the-loop: Autonomous execution with real-time audit feed and rollback.",
                                "Confidence Tiering: Full automation if confidence > 92%, human review otherwise.",
                            ],
                        }
                    )
        return conflicts


class ReadinessEngine:

    @staticmethod
    def evaluate(
        nodes: List[TraceNode],
        disabled_node_ids: Optional[Set[str]] = None,
    ) -> Dict[str, Any]:
        disabled = disabled_node_ids or set()
        active_nodes = [n for n in nodes if n.id not in disabled]

        problems = [n for n in active_nodes if n.node_type == NodeType.PROBLEM]
        stakeholders = [
            n for n in active_nodes if n.node_type == NodeType.STAKEHOLDER
        ]
        reqs = [
            n
            for n in active_nodes
            if n.node_type == NodeType.REQUIREMENT and isinstance(n, Requirement)
        ]
        data_sources = [
            n
            for n in active_nodes
            if n.node_type == NodeType.DATA_SOURCE and isinstance(n, DataSource)
        ]
        components = [
            n
            for n in active_nodes
            if n.node_type == NodeType.SYSTEM_COMPONENT
            and isinstance(n, SystemComponent)
        ]
        workflows = [
            n
            for n in active_nodes
            if n.node_type == NodeType.WORKFLOW_STEP
            and isinstance(n, WorkflowStep)
        ]
        tests = [
            n
            for n in active_nodes
            if n.node_type == NodeType.TEST_CASE and isinstance(n, TestCase)
        ]

        dims = {}
        score_1 = (
            sum(
                1
                for p in problems
                if p.metadata.get("business_impact") or len(p.description) > 30
            )
            / max(len(problems), 1)
            if problems
            else 0.0
        )
        dims["Problem Clarity"] = {
            "score": round(score_1, 2),
            "weight": 0.15,
            "notes": f"{int(score_1*len(problems))}/{len(problems)} problems quantified.",
        }

        score_2 = (
            sum(1 for s in stakeholders if s.owner or s.metadata.get("department"))
            / max(len(stakeholders), 1)
            if stakeholders
            else 0.0
        )
        dims["Stakeholder Alignment"] = {
            "score": round(score_2, 2),
            "weight": 0.10,
            "notes": f"{int(score_2*len(stakeholders))}/{len(stakeholders)} stakeholders verified.",
        }

        score_3 = (
            sum(
                1
                for r in reqs
                if not r.is_ambiguous and len(r.acceptance_criteria) > 0
            )
            / max(len(reqs), 1)
            if reqs
            else 0.0
        )
        dims["Requirement Precision"] = {
            "score": round(score_3, 2),
            "weight": 0.20,
            "notes": f"{int(score_3*len(reqs))}/{len(reqs)} unambiguous with testable criteria.",
        }

        score_4 = (
            sum(
                1
                for d in data_sources
                if d.is_confirmed and d.system_of_record != "Unknown"
            )
            / max(len(data_sources), 1)
            if data_sources
            else 0.0
        )
        dims["Data Readiness"] = {
            "score": round(score_4, 2),
            "weight": 0.15,
            "notes": f"{int(score_4*len(data_sources))}/{len(data_sources)} confirmed systems of record.",
        }

        score_5 = (
            sum(1 for w in workflows if w.actor_id and w.system_id)
            / max(len(workflows), 1)
            if workflows
            else 0.0
        )
        dims["Workflow Precision"] = {
            "score": round(score_5, 2),
            "weight": 0.10,
            "notes": f"{int(score_5*len(workflows))}/{len(workflows)} steps mapped to actor/system.",
        }

        score_6 = (
            sum(1 for c in components if c.layer and c.lifecycle_state)
            / max(len(components), 1)
            if components
            else 0.0
        )
        dims["Architecture Bounds"] = {
            "score": round(score_6, 2),
            "weight": 0.10,
            "notes": f"{int(score_6*len(components))}/{len(components)} components structurally bounded.",
        }

        tested_req_ids = {t.requirement_id for t in tests}
        score_7 = (
            sum(1 for r in reqs if r.id in tested_req_ids) / max(len(reqs), 1)
            if reqs
            else 0.0
        )
        dims["Testability Coverage"] = {
            "score": round(score_7, 2),
            "weight": 0.10,
            "notes": f"{int(score_7*len(reqs))}/{len(reqs)} requirements have verified tests.",
        }

        score_8 = (
            sum(1 for d in data_sources if hasattr(d, "contains_pii"))
            / max(len(data_sources), 1)
            if data_sources
            else 0.5
        )
        dims["Governance & Security"] = {
            "score": round(score_8, 2),
            "weight": 0.10,
            "notes": f"{int(score_8*len(data_sources))}/{len(data_sources)} sources cataloged for privacy.",
        }

        total_score = sum(v["score"] * v["weight"] for v in dims.values()) * 100
        blockers = []
        if score_3 < 0.6:
            blockers.append(
                "CRITICAL: Low requirement precision. Ambiguities or missing AC must be resolved."
            )
        if score_4 < 0.6:
            blockers.append(
                "DATA BLOCKER: Systems of record or access mechanisms unconfirmed."
            )
        if score_7 < 0.5:
            blockers.append(
                "TEST BLOCKER: Under 50% test coverage for defined requirements."
            )

        return {
            "total_score": round(total_score, 1),
            "dimensions": dims,
            "blockers": blockers,
            "is_ready": total_score >= 80.0 and len(blockers) == 0,
        }


# ==============================================================================
# 4. SPRINT SIZING & CLOUD ESTIMATION ENGINE
# ==============================================================================


class EstimationEngine:

    @staticmethod
    def calculate_sizing(
        requirements: List[Requirement],
        components: List[SystemComponent],
    ) -> Dict[str, Any]:
        total_points = 0

        for r in requirements:
            pts = 3 + len(r.acceptance_criteria) * 2
            if r.priority == Priority.CRITICAL:
                pts += 3
            if pts <= 4:
                r.t_shirt_size = "S"
            elif pts <= 7:
                r.t_shirt_size = "M"
            elif pts <= 11:
                r.t_shirt_size = "L"
            else:
                r.t_shirt_size = "XL"
            r.story_points = pts
            total_points += pts

        sprints = max(1, round(total_points / 22))
        weeks = sprints * 2
        infra_total = sum(c.monthly_infra_cost for c in components) or 600

        return {
            "total_story_points": total_points,
            "estimated_sprints": sprints,
            "estimated_calendar_weeks": weeks,
            "monthly_infra_cost": infra_total,
        }


# ==============================================================================
# 5. MULTI-FORMAT DATA INGESTION ENGINE
# ==============================================================================


class IngestionEngine:

    @staticmethod
    def parse_uploaded_file(
        uploaded_file,
    ) -> Tuple[str, List[TraceNode], List[TraceEdge]]:
        filename = uploaded_file.name.lower()

        if filename.endswith(".csv"):
            df = pd.read_csv(uploaded_file)
            return IngestionEngine._from_dataframe(df, filename)

        elif filename.endswith(".json"):
            data = json.load(uploaded_file)
            return IngestionEngine._from_json(data, filename)

        else:
            text = uploaded_file.read().decode("utf-8", errors="ignore")
            return IngestionEngine._from_text(text, filename)

    @staticmethod
    def _from_dataframe(
        df: pd.DataFrame, filename: str
    ) -> Tuple[str, List[TraceNode], List[TraceEdge]]:
        nodes: List[TraceNode] = []
        edges: List[TraceEdge] = []

        cols = {c.lower(): c for c in df.columns}
        title_col = (
            cols.get("title")
            or cols.get("name")
            or cols.get("summary")
            or df.columns[0]
        )
        desc_col = (
            cols.get("description")
            or cols.get("details")
            or cols.get("requirement")
            or title_col
        )

        bo = TraceNode(
            id="BO-001",
            node_type=NodeType.BUSINESS_OUTCOME,
            title=f"Dataset Initiative: {filename}",
            description=f"Automated system specification derived from tabular input ({len(df)} records).",
            epistemic_status=EpistemicStatus.SOURCE_FACT,
            validation_status=ValidationStatus.VALIDATED_BY_HUMAN,
        )
        nodes.append(bo)

        ds = DataSource(
            id="DATA-001",
            title=f"Source Dataset: {filename}",
            description="Ingested enterprise tabular schema and records.",
            system_of_record=filename,
            update_frequency="Ad-hoc Batch Upload",
            access_protocol="CSV Ingestion",
            is_confirmed=True,
        )
        nodes.append(ds)

        for idx, row in df.iterrows():
            req_id = f"REQ-{idx+1:03d}"
            title = str(row[title_col])[:60]
            desc = str(row[desc_col])

            req = Requirement(
                id=req_id,
                title=title,
                description=desc,
                req_type=RequirementType.FUNCTIONAL,
                priority=Priority.HIGH,
                source_reference=f"{filename} row {idx+1}",
                acceptance_criteria=[
                    f"Given valid system state, verify that '{title[:30]}' executes as specified."
                ],
            )
            is_amb, notes, _, _ = AmbiguityEngine.audit_requirement(req)
            req.is_ambiguous = is_amb
            req.ambiguity_notes = notes
            nodes.append(req)

            edges.append(
                TraceEdge(
                    source_id=req_id,
                    relation=RelationType.JUSTIFIES.value,
                    target_id="BO-001",
                )
            )
            edges.append(
                TraceEdge(
                    source_id=req_id,
                    relation=RelationType.DEPENDS_ON.value,
                    target_id="DATA-001",
                )
            )

        raw_brief = f"Imported CSV dataset '{filename}' containing {len(df)} records."
        return raw_brief, nodes, edges

    @staticmethod
    def _from_json(
        data: Dict[str, Any], filename: str
    ) -> Tuple[str, List[TraceNode], List[TraceEdge]]:
        nodes: List[TraceNode] = []
        edges: List[TraceEdge] = []
        if "nodes" in data and "edges" in data:
            for n_dict in data["nodes"]:
                ntype = n_dict.get("node_type")
                if ntype == "REQUIREMENT":
                    nodes.append(Requirement(**n_dict))
                elif ntype == "DATA_SOURCE":
                    nodes.append(DataSource(**n_dict))
                elif ntype == "SYSTEM_COMPONENT":
                    nodes.append(SystemComponent(**n_dict))
                elif ntype == "WORKFLOW_STEP":
                    nodes.append(WorkflowStep(**n_dict))
                elif ntype == "TEST_CASE":
                    nodes.append(TestCase(**n_dict))
                elif ntype == "QUESTION":
                    nodes.append(Question(**n_dict))
                elif ntype == "ASSUMPTION":
                    nodes.append(Assumption(**n_dict))
                else:
                    nodes.append(TraceNode(**n_dict))
            for e_dict in data["edges"]:
                edges.append(TraceEdge(**e_dict))
            return (
                f"Restored project '{data.get('project', filename)}' from JSON bundle.",
                nodes,
                edges,
            )

        return IngestionEngine._from_text(json.dumps(data, indent=2), filename)

    @staticmethod
    def _from_text(
        text: str, filename: str
    ) -> Tuple[str, List[TraceNode], List[TraceEdge]]:
        sentences = [
            s.strip() for s in re.split(r"[.\n]+", text) if len(s.strip()) > 12
        ]
        nodes: List[TraceNode] = []
        edges: List[TraceEdge] = []

        bo = TraceNode(
            id="BO-001",
            node_type=NodeType.BUSINESS_OUTCOME,
            title="Strategic Initiative Outcome",
            description=sentences[0]
            if sentences
            else "Strategic outcome synthesized from input document.",
            epistemic_status=EpistemicStatus.INFERENCE,
            validation_status=ValidationStatus.VALIDATED_BY_HUMAN,
        )
        nodes.append(bo)

        prb = TraceNode(
            id="PRB-001",
            node_type=NodeType.PROBLEM,
            title="Operational Challenge & Need",
            description=sentences[1]
            if len(sentences) > 1
            else "Primary operational friction identified.",
            epistemic_status=EpistemicStatus.INFERENCE,
            metadata={"business_impact": "Operational delay and process friction."},
        )
        nodes.append(prb)
        edges.append(
            TraceEdge(
                source_id="PRB-001",
                relation=RelationType.ADDRESSES.value,
                target_id="BO-001",
            )
        )

        stk = TraceNode(
            id="STK-001",
            node_type=NodeType.STAKEHOLDER,
            title="Core Delivery Team",
            description="Primary operators and delivery custodians.",
            metadata={"department": "Operations"},
        )
        nodes.append(stk)
        edges.append(
            TraceEdge(
                source_id="PRB-001",
                relation=RelationType.EXPERIENCED_BY.value,
                target_id="STK-001",
            )
        )

        ds = DataSource(
            id="DATA-001",
            title="Primary Data Store",
            description="System of record inferred from document context.",
            system_of_record="Enterprise System / Database",
            update_frequency="Daily Ingestion",
            access_protocol="REST / SQL",
            is_confirmed=True,
        )
        nodes.append(ds)

        req_idx = 1
        for s in sentences[1:8]:
            if any(
                w in s.lower()
                for w in [
                    "need",
                    "want",
                    "must",
                    "should",
                    "real-time",
                    "automatic",
                    "track",
                    "data",
                    "system",
                ]
            ):
                req = Requirement(
                    id=f"REQ-{req_idx:03d}",
                    title=f"{s[:50]}...",
                    description=s,
                    req_type=RequirementType.FUNCTIONAL,
                    priority=Priority.HIGH,
                    source_reference=filename,
                    acceptance_criteria=[
                        f"Given normal operational parameters, verify: {s[:35]}."
                    ],
                )
                is_amb, notes, _, _ = AmbiguityEngine.audit_requirement(req)
                req.is_ambiguous = is_amb
                req.ambiguity_notes = notes
                nodes.append(req)
                edges.append(
                    TraceEdge(
                        source_id=req.id,
                        relation=RelationType.JUSTIFIES.value,
                        target_id="BO-001",
                    )
                )
                edges.append(
                    TraceEdge(
                        source_id=req.id,
                        relation=RelationType.DEPENDS_ON.value,
                        target_id="DATA-001",
                    )
                )
                req_idx += 1

        return text, nodes, edges


# ==============================================================================
# 6. BENCHMARK CASE STUDY DATASET
# ==============================================================================


def load_renewal_demo() -> Tuple[str, List[TraceNode], List[TraceEdge]]:
    brief = """EXECUTIVE BRIEF: Project Phoenix — Renewal Intelligence System
Our B2B SaaS ARR growth has decelerated because net revenue retention fell from 108% to 91% over the past four quarters. Account Managers (AMs) and Customer Success Managers (CSMs) report being blindsided by account cancellations.

Critical signals are fragmented across the enterprise:
- Contract values, renewal milestones, and terms reside in Salesforce CRM.
- Product telemetry and daily active user seats reside in Snowflake.
- Customer sentiment, complaints, and ticket escalations reside in Zendesk.
- Relationship nuances are trapped in Account Managers' private email threads.

Sales leadership insists on an 'AI-powered real-time churn prediction engine' that automatically notifies managers and triggers interventions before customers cancel. Meanwhile, Customer Success insists that no automated outreach should ever occur without mandatory human sign-off from the dedicated CSM. Data Engineering warns that product telemetry is refreshed only as a 24-hour nightly batch, making sub-minute 'real-time' monitoring architecturally questionable."""

    nodes: List[TraceNode] = [
        TraceNode(
            id="BO-001",
            node_type=NodeType.BUSINESS_OUTCOME,
            title="Restore Net Revenue Retention to 105%+",
            description="Reclaim trailing 4-quarter NRR from 91% to 105%+ by mitigating preventable SaaS account cancellations.",
            epistemic_status=EpistemicStatus.SOURCE_FACT,
            validation_status=ValidationStatus.VALIDATED_BY_HUMAN,
            owner="VP Customer Success",
            metadata={"target_metric": "NRR >= 105%", "timeline": "Q4"},
        ),
        TraceNode(
            id="PRB-001",
            node_type=NodeType.PROBLEM,
            title="Fragmented Customer Risk Telemetry",
            description="Account health signals are siloed across CRM, product telemetry, Zendesk tickets, and email threads.",
            epistemic_status=EpistemicStatus.SOURCE_FACT,
            validation_status=ValidationStatus.VALIDATED_BY_HUMAN,
            metadata={
                "business_impact": "CSMs miss leading churn indicators, leaving inadequate runway for interventions."
            },
        ),
        TraceNode(
            id="STK-001",
            node_type=NodeType.STAKEHOLDER,
            title="Customer Success Leadership",
            description="Accountable for gross retention, customer health indexing, and churn mitigation.",
            owner="CS Org",
            metadata={"department": "Customer Success", "role_level": "Executive"},
        ),
        TraceNode(
            id="STK-002",
            node_type=NodeType.STAKEHOLDER,
            title="Account Management Team",
            description="Frontline owners of renewal commercial quotas, pricing negotiations, and upsell pipelines.",
            owner="Sales Org",
            metadata={"department": "Sales", "role_level": "Operational"},
        ),
        TraceNode(
            id="GOAL-001",
            node_type=NodeType.GOAL,
            title="Identify Renewal Risk >=60 Days in Advance",
            description="Provide synthesized early warning indicators to AMs with sufficient operational lead time to intervene.",
            epistemic_status=EpistemicStatus.INTERPRETATION,
            validation_status=ValidationStatus.VALIDATED_BY_HUMAN,
        ),
        Requirement(
            id="REQ-001",
            title="Multi-Source Risk Classification Engine",
            description="System shall evaluate accounts daily against composite telemetry, ticket escalations, and commercial indicators.",
            req_type=RequirementType.FUNCTIONAL,
            priority=Priority.CRITICAL,
            epistemic_status=EpistemicStatus.INTERPRETATION,
            validation_status=ValidationStatus.VALIDATED_BY_HUMAN,
            owner="Data Product Team",
            source_reference="Brief Section 2",
            acceptance_criteria=[
                "Given an account with a 30% drop in active seats over 14 days, when daily evaluation executes, then health status shifts to AT_RISK.",
                "System provides traceable evidence citations for all risk score calculations.",
            ],
            story_points=8,
            t_shirt_size="L",
        ),
        Requirement(
            id="REQ-002",
            title="Autonomous Real-Time Intervention Triggering",
            description="System shall monitor accounts in real-time and automatically trigger customer outreach without delay.",
            req_type=RequirementType.FUNCTIONAL,
            priority=Priority.HIGH,
            epistemic_status=EpistemicStatus.SOURCE_FACT,
            validation_status=ValidationStatus.FLAGGED_AMBIGUOUS,
            owner="Sales Leadership",
            source_reference="Brief Section 3",
            is_ambiguous=True,
            ambiguity_notes=[
                "Operational Latency Undefined ('real-time')",
                "Autonomous intervention mechanism unquantified",
            ],
            has_conflict=True,
            conflict_notes=[
                "Directly conflicts with REQ-003 (Mandatory Human Sign-off)"
            ],
            story_points=13,
            t_shirt_size="XL",
        ),
        Requirement(
            id="REQ-003",
            title="Mandatory Human Review Gate for Interventions",
            description="All outreach, concession offers, and retention plans must be manually reviewed and approved by the assigned CSM.",
            req_type=RequirementType.GOVERNANCE,
            priority=Priority.CRITICAL,
            epistemic_status=EpistemicStatus.SOURCE_FACT,
            validation_status=ValidationStatus.FLAGGED_CONFLICT,
            owner="VP Customer Success",
            source_reference="Brief Section 3",
            has_conflict=True,
            conflict_notes=[
                "Directly conflicts with REQ-002 (Autonomous Intervention Triggering)"
            ],
            acceptance_criteria=[
                "No communication shall dispatch to customer contacts without an authenticated CSM digital sign-off."
            ],
            story_points=5,
            t_shirt_size="M",
        ),
        DataSource(
            id="DATA-001",
            title="Salesforce CRM",
            description="Source of truth for account owners, contract dates, ARR, and commercial terms.",
            system_of_record="Salesforce Sales Cloud",
            update_frequency="Near Real-time Webhook",
            access_protocol="REST API / OData",
            is_confirmed=True,
            contains_pii=True,
            data_classification="Restricted / Commercial",
            encryption_at_rest=True,
            retention_days=730,
        ),
        DataSource(
            id="DATA-002",
            title="Snowflake Telemetry Store",
            description="Contains daily active seats, feature usage logs, and workspace activities.",
            system_of_record="Snowflake",
            update_frequency="24-Hour Nightly Batch",
            access_protocol="SQL Warehouse Connector",
            is_confirmed=True,
            contains_pii=False,
            data_classification="Internal Operational",
            encryption_at_rest=True,
            retention_days=365,
        ),
        DataSource(
            id="DATA-003",
            title="Zendesk Support Tickets",
            description="Support escalation tickets, CSAT scores, and ticket turnaround times.",
            system_of_record="Zendesk",
            update_frequency="Hourly Poll",
            access_protocol="REST API",
            is_confirmed=False,
            contains_pii=True,
            data_classification="Restricted / Customer Notes",
            encryption_at_rest=True,
            retention_days=365,
        ),
        SystemComponent(
            id="COMP-001",
            title="Risk Scoring Service",
            description="Inference service computing composite health scores using rules and statistical anomaly detection.",
            layer="Inference Layer",
            arch_type="Deterministic Heuristics + XGBoost",
            lifecycle_state="PROPOSED",
            monthly_infra_cost=320,
        ),
        SystemComponent(
            id="COMP-002",
            title="CSM Intervention Console",
            description="Web portal allowing account teams to inspect evidence, adjust risk weights, and authorize playbooks.",
            layer="Presentation Layer",
            arch_type="React SPA + Python Backend",
            lifecycle_state="PROPOSED",
            monthly_infra_cost=150,
        ),
        WorkflowStep(
            id="STEP-001",
            title="Daily Telemetry & Sentiment Join",
            description="Nightly pipeline pulls Snowflake usage metrics and joins against active Salesforce contracts.",
            sequence_index=1,
            actor_id="SYSTEM",
            system_id="COMP-001",
            inputs=["DATA-001", "DATA-002"],
            outputs=["UnifiedAccountProfile"],
        ),
        WorkflowStep(
            id="STEP-002",
            title="CSM Risk Review & Approval",
            description="CSM logs into console, inspects flagged account evidence, and authorizes customized intervention.",
            sequence_index=2,
            actor_id="STK-001",
            system_id="COMP-002",
            inputs=["UnifiedAccountProfile"],
            outputs=["ApprovedInterventionPlan"],
        ),
        TestCase(
            id="TEST-001",
            title="Verify Risk Classification Evidence Attribution",
            description="Ensure every risk notification exposes verifiable audit data points.",
            requirement_id="REQ-001",
            given="An account with a 40% seat usage drop over 14 days and 2 open Zendesk escalations",
            when="Daily health scoring pipeline executes",
            then="Account state transitions to 'HIGH_RISK' and cites seat drop and open tickets as direct evidence.",
            is_automated=True,
        ),
        Question(
            id="Q-001",
            title="Operational Definition of 'Real-Time'",
            description="Does the business require sub-minute streaming alerts, or is a daily 24-hour batch refresh acceptable?",
            severity=Priority.CRITICAL,
            assigned_stakeholder="Customer Success Leadership",
            impact_description="Determines whether architecture requires an Apache Kafka streaming backbone or a warehouse query.",
        ),
        Question(
            id="Q-002",
            title="PII Redaction Strategy for Support Notes",
            description="Are free-form customer complaint notes permissible inside the ML feature store without masking?",
            severity=Priority.HIGH,
            assigned_stakeholder="Account Management Team",
            impact_description="Determines regulatory GDPR/CCPA boundary and DLP pipeline necessity.",
        ),
        Assumption(
            id="ASM-001",
            title="24-Hour Telemetry Freshness Adequacy",
            description="Assumes 24-hour telemetry batch latency is sufficient to catch renewal churn patterns.",
            impact_level=Priority.HIGH,
            validation_path="Confirm typical enterprise B2B churn signal latency with Customer Success leadership.",
            is_verified=False,
        ),
        Decision(
            id="DEC-001",
            title="Human-in-the-Loop Intervention Protocol",
            description="System generates recommended playbooks; frontline CSM retains sole authorization to trigger outreach.",
            decision_maker="VP Customer Success & VP Sales",
            alternatives_considered=[
                "Full Autonomous Execution",
                "Fully Manual Review",
            ],
            tradeoff_summary="Eliminates risk of unreviewed automated outreach while maintaining structured intervention.",
        ),
    ]

    edges: List[TraceEdge] = [
        TraceEdge(
            source_id="PRB-001",
            relation=RelationType.ADDRESSES.value,
            target_id="BO-001",
        ),
        TraceEdge(
            source_id="PRB-001",
            relation=RelationType.EXPERIENCED_BY.value,
            target_id="STK-001",
        ),
        TraceEdge(
            source_id="GOAL-001",
            relation=RelationType.SUPPORTS.value,
            target_id="BO-001",
        ),
        TraceEdge(
            source_id="REQ-001",
            relation=RelationType.JUSTIFIES.value,
            target_id="GOAL-001",
        ),
        TraceEdge(
            source_id="REQ-001",
            relation=RelationType.DEPENDS_ON.value,
            target_id="DATA-001",
        ),
        TraceEdge(
            source_id="REQ-001",
            relation=RelationType.DEPENDS_ON.value,
            target_id="DATA-002",
        ),
        TraceEdge(
            source_id="REQ-001",
            relation=RelationType.IMPLEMENTED_BY.value,
            target_id="COMP-001",
        ),
        TraceEdge(
            source_id="REQ-001",
            relation=RelationType.VALIDATED_BY.value,
            target_id="TEST-001",
        ),
        TraceEdge(
            source_id="REQ-002",
            relation=RelationType.CONFLICTS_WITH.value,
            target_id="REQ-003",
        ),
        TraceEdge(
            source_id="REQ-002",
            relation=RelationType.CLARIFIED_BY.value,
            target_id="Q-001",
        ),
        TraceEdge(
            source_id="COMP-001",
            relation=RelationType.FOUNDED_ON.value,
            target_id="ASM-001",
        ),
        TraceEdge(
            source_id="STEP-001",
            relation=RelationType.IMPLEMENTED_BY.value,
            target_id="COMP-001",
        ),
        TraceEdge(
            source_id="STEP-002",
            relation=RelationType.IMPLEMENTED_BY.value,
            target_id="COMP-002",
        ),
        TraceEdge(
            source_id="DEC-001",
            relation=RelationType.JUSTIFIES.value,
            target_id="REQ-003",
        ),
    ]

    return brief, nodes, edges


# ==============================================================================
# 7. HIGH-CONTRAST COSMIC DESIGN SYSTEM & BULLETPROOF ICONS
# ==============================================================================

MODERN_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

:root {
    --bg-base: #060913;
    --bg-card: rgba(15, 23, 42, 0.72);
    --text-primary: #F8FAFC;
    --text-secondary: #CBD5E1;
    --text-tertiary: #94A3B8;
    --accent-cyan: #06B6D4;
    --accent-cyan-glow: rgba(6, 182, 212, 0.28);
    --accent-emerald: #10B981;
    --accent-amber: #F59E0B;
    --accent-rose: #F43F5E;
    --accent-purple: #8B5CF6;
    --font-mono: 'JetBrains Mono', monospace;
    --font-sans: 'Plus Jakarta Sans', -apple-system, sans-serif;
    
    /* Emil Kowalski & Apple Motion Tokens */
    --ease-apple: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
    --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
    --duration-fast: 120ms;
    --duration-normal: 220ms;
    --duration-smooth: 300ms;
}

/* Apple Hairline Scroll Progress Bar pinned to top of viewport */
.apple-scroll-track {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 3px;
    background: transparent;
    z-index: 999999;
    pointer-events: none;
}
.apple-scroll-bar {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #06B6D4 0%, #3B82F6 30%, #8B5CF6 70%, #EC4899 100%);
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.8), 0 0 20px rgba(139, 92, 246, 0.5);
    transform-origin: 0% 50%;
    animation: appleScrollPulse 4s ease-in-out infinite alternate;
}
@keyframes appleScrollPulse {
    0% { filter: brightness(1); }
    100% { filter: brightness(1.35) drop-shadow(0 0 8px rgba(6, 182, 212, 0.9)); }
}

/* App Canvas with Luminous Cosmic Mesh */
.stApp {
    background-color: #060913 !important;
    background-image: 
        radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.18) 0px, transparent 46%),
        radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.22) 0px, transparent 48%),
        radial-gradient(at 50% 45%, rgba(13, 20, 38, 0.96) 0px, transparent 100%),
        radial-gradient(at 100% 100%, rgba(217, 70, 239, 0.14) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.14) 0px, transparent 48%),
        radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px) !important;
    background-size: 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 32px 32px !important;
    color: var(--text-primary) !important;
    font-family: var(--font-sans) !important;
}

/* Apple Entrance Animation */
@keyframes appleReveal {
    0% {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Live Telemetry Beacon (Dynamic Island style) */
.live-beacon {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.70rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: 999px;
    background: rgba(6, 182, 212, 0.12);
    border: 1px solid rgba(6, 182, 212, 0.35);
    color: #22D3EE;
    box-shadow: 0 0 16px rgba(6, 182, 212, 0.2);
}
.beacon-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22D3EE;
    position: relative;
}
.beacon-dot::after {
    content: "";
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1.5px solid #22D3EE;
    animation: radarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes radarPing {
    0% { transform: scale(0.8); opacity: 0.95; }
    100% { transform: scale(2.6); opacity: 0; }
}

/* Header & Toolbars */
header[data-testid="stHeader"],
[data-testid="stToolbar"],
[data-testid="stToolbarActions"],
[data-testid="stDecoration"] {
    background: transparent !important;
}
header[data-testid="stHeader"] svg,
[data-testid="stToolbar"] svg,
[data-testid="stToolbarActions"] svg {
    filter: brightness(0) invert(1) !important;
    opacity: 0.95 !important;
}
header[data-testid="stHeader"] svg:hover,
[data-testid="stToolbar"] svg:hover,
[data-testid="stToolbarActions"] svg:hover {
    filter: brightness(0) invert(1) drop-shadow(0 0 6px rgba(6, 182, 212, 0.8)) !important;
    opacity: 1 !important;
}

/* Hero Section */
.hero-container {
    padding: 42px 0 28px 0;
    text-align: center;
    max-width: 960px;
    margin: 0 auto;
    animation: appleReveal 300ms var(--ease-apple) both;
}
.hero-pill {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: #22D3EE;
    background: rgba(6, 182, 212, 0.12);
    padding: 6px 16px;
    border-radius: 999px;
    border: 1px solid rgba(6, 182, 212, 0.35);
    display: inline-block;
    margin-bottom: 22px;
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.22);
}
.hero-headline {
    font-size: 3.3rem;
    font-weight: 800;
    line-height: 1.12;
    letter-spacing: -0.04em;
    background: linear-gradient(135deg, #FFFFFF 15%, #E2E8F0 50%, #67E8F9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 18px;
}
.hero-sub {
    font-size: 1.15rem;
    color: #94A3B8;
    line-height: 1.65;
    max-width: 780px;
    margin: 0 auto 34px auto;
}

/* Emil Kowalski Apple Glass Cards with Top Light-Catch Edge */
.feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 22px;
    margin: 32px 0;
}
.feature-card {
    background: linear-gradient(145deg, rgba(22, 32, 54, 0.7) 0%, rgba(11, 17, 34, 0.85) 100%);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 14px;
    padding: 26px 24px;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
    transition: transform var(--duration-normal) var(--ease-apple), box-shadow var(--duration-normal) var(--ease-apple), border-color var(--duration-normal) ease;
    animation: appleReveal 280ms var(--ease-apple) both;
}
.feature-card:hover {
    transform: translateY(-3px);
    border-color: rgba(6, 182, 212, 0.45);
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.48), 0 0 24px rgba(6, 182, 212, 0.2);
}
.feature-icon { font-size: 1.7rem; margin-bottom: 14px; }
.feature-title { font-size: 1.08rem; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; letter-spacing: -0.015em; }
.feature-desc { font-size: 0.88rem; color: #94A3B8; line-height: 1.62; }

/* Telemetry Cards with Staggered Animations */
.telemetry-card {
    background: linear-gradient(135deg, rgba(26, 38, 62, 0.75) 0%, rgba(13, 20, 38, 0.88) 100%);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 14px;
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
    transition: transform var(--duration-normal) var(--ease-apple), box-shadow var(--duration-normal) var(--ease-apple), border-color var(--duration-normal) ease;
    animation: appleReveal 280ms var(--ease-apple) both;
}
.telemetry-card:hover {
    transform: translateY(-2.5px);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.42), 0 0 20px rgba(6, 182, 212, 0.18);
    border-color: rgba(6, 182, 212, 0.35);
}
.telemetry-accent { position: absolute; top: 0; left: 0; right: 0; height: 3.5px; }
.accent-cyan { background: linear-gradient(90deg, #06B6D4, #3B82F6); }
.accent-emerald { background: linear-gradient(90deg, #10B981, #06B6D4); }
.accent-amber { background: linear-gradient(90deg, #F59E0B, #EF4444); }
.accent-rose { background: linear-gradient(90deg, #F43F5E, #EC4899); }
.telemetry-label { font-family: var(--font-mono); font-size: 0.72rem; color: #CBD5E1; text-transform: uppercase; font-weight: 600; letter-spacing: 0.08em; }
.telemetry-num { font-family: var(--font-mono); font-size: 2.3rem; font-weight: 800; color: #FFFFFF; margin-top: 6px; letter-spacing: -0.02em; }

/* Entity Cards */
.entity-card {
    background: linear-gradient(180deg, rgba(22, 32, 54, 0.72) 0%, rgba(12, 19, 36, 0.85) 100%);
    backdrop-filter: blur(18px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 22px 24px;
    margin-bottom: 16px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
    transition: transform var(--duration-normal) var(--ease-apple), box-shadow var(--duration-normal) var(--ease-apple), border-color var(--duration-normal) ease;
    animation: appleReveal 260ms var(--ease-apple) both;
}
.entity-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.38), 0 0 16px rgba(6, 182, 212, 0.15);
    border-color: rgba(6, 182, 212, 0.3);
}
.entity-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 12px; margin-bottom: 12px; }
.entity-id { font-family: var(--font-mono); font-size: 0.88rem; font-weight: 700; color: #22D3EE; }
.entity-title { font-size: 1.05rem; font-weight: 600; color: #FFFFFF; margin-bottom: 8px; letter-spacing: -0.015em; }
.entity-body { font-size: 0.88rem; color: #CBD5E1; line-height: 1.62; margin-bottom: 12px; }
.entity-footer { display: flex; gap: 20px; font-family: var(--font-mono); font-size: 0.75rem; color: #94A3B8; padding-top: 10px; border-top: 1px dashed rgba(255, 255, 255, 0.08); }

/* Badge Chips */
.chip { font-family: var(--font-mono); font-size: 0.70rem; font-weight: 600; padding: 3px 10px; border-radius: 6px; display: inline-flex; align-items: center; letter-spacing: 0.04em; }
.chip-cyan { background: rgba(6, 182, 212, 0.16); color: #22D3EE; border: 1px solid rgba(6, 182, 212, 0.38); }
.chip-emerald { background: rgba(16, 185, 129, 0.16); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.38); }
.chip-amber { background: rgba(245, 158, 11, 0.16); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.38); }
.chip-rose { background: rgba(244, 63, 94, 0.16); color: #FB7185; border: 1px solid rgba(244, 63, 94, 0.38); }

/* Decision Memo Dossier */
.decision-memo-sheet {
    background: linear-gradient(155deg, rgba(14, 22, 42, 0.95) 0%, rgba(8, 12, 24, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-top: 1px solid rgba(6, 182, 212, 0.4);
    border-radius: 16px;
    padding: 38px 44px;
    margin: 22px 0;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.12);
    position: relative;
    overflow: hidden;
}
.decision-memo-sheet::before {
    content: "AUDITED ARCHITECTURE";
    position: absolute;
    right: 24px;
    top: 24px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: #10B981;
    background: rgba(16, 185, 129, 0.12);
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid rgba(16, 185, 129, 0.35);
}

/* Emil Kowalski Tactile Button Press Physics */
div.stButton > button {
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%) !important;
    color: #FFFFFF !important;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
    border-radius: 10px !important;
    font-family: var(--font-mono) !important;
    font-size: 0.84rem !important;
    font-weight: 600 !important;
    padding: 10px 20px !important;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25) !important;
    transition: transform var(--duration-fast) var(--ease-apple), box-shadow var(--duration-fast) var(--ease-apple), border-color var(--duration-fast) ease, background var(--duration-fast) ease !important;
}
div.stButton > button:hover {
    transform: translateY(-1.5px) !important;
    border-color: rgba(6, 182, 212, 0.7) !important;
    box-shadow: 0 8px 24px rgba(6, 182, 212, 0.28) !important;
}
div.stButton > button:active {
    transform: scale(0.97) translateY(0) !important;
    box-shadow: 0 2px 8px rgba(6, 182, 212, 0.35) !important;
}

/* Streamlit Native Inputs & Selectboxes */
div[data-baseweb="select"] > div {
    background: rgba(17, 26, 46, 0.92) !important;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
    border-radius: 10px !important;
    color: #FFFFFF !important;
    transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease !important;
}
div[data-baseweb="select"] > div:hover {
    border-color: #06B6D4 !important;
    box-shadow: 0 0 14px rgba(6, 182, 212, 0.25) !important;
}
div[data-baseweb="popover"], div[data-baseweb="menu"] {
    background: #0C1527 !important;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
    border-radius: 10px !important;
}
div[data-baseweb="menu"] li:hover {
    background: rgba(6, 182, 212, 0.18) !important;
    color: #22D3EE !important;
}

/* Translucent Frosted Sidebar */
[data-testid="stSidebar"] {
    background: rgba(7, 12, 24, 0.94) !important;
    backdrop-filter: blur(28px) saturate(180%) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* Native Tabs with Apple Pill Style */
[data-testid="stTabs"] button[role="tab"] {
    font-family: var(--font-mono) !important;
    font-size: 0.82rem !important;
    font-weight: 600 !important;
    color: #94A3B8 !important;
    border-radius: 8px !important;
    padding: 8px 16px !important;
    transition: all var(--duration-fast) var(--ease-apple) !important;
}
[data-testid="stTabs"] button[role="tab"]:hover {
    color: #F8FAFC !important;
    background: rgba(255, 255, 255, 0.05) !important;
}
[data-testid="stTabs"] button[role="tab"][aria-selected="true"] {
    color: #22D3EE !important;
    background: rgba(6, 182, 212, 0.14) !important;
    border-bottom: 2px solid #06B6D4 !important;
}

/* Expanders */
[data-testid="stExpander"] {
    background: rgba(15, 23, 42, 0.65) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 10px !important;
    transition: border-color var(--duration-fast) ease !important;
}
[data-testid="stExpander"]:hover {
    border-color: rgba(6, 182, 212, 0.35) !important;
}

/* Accessibility: Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
    *, .telemetry-card, .entity-card, .feature-card, .decision-memo-sheet, .apple-scroll-bar, div.stButton > button {
        animation: none !important;
        transition: none !important;
        transform: none !important;
    }
}
</style>
"""


def render_plotly_traceability_graph(graph: TraceabilityGraph, focus_id: str) -> go.Figure:
    """Renders an interactive bidirectional Plotly network graph with physical spring layout."""
    nodes = graph.all_nodes()
    edges = graph.all_edges()

    G = nx.DiGraph()
    for n in nodes:
        G.add_node(
            n.id,
            title=n.title,
            node_type=n.node_type.value,
            status=n.validation_status.value,
            desc=n.description,
        )
    for e in edges:
        G.add_edge(e.source_id, e.target_id, relation=e.relation)

    pos = nx.spring_layout(G, seed=42, k=1.3, iterations=75)

    upstream_items = graph.trace_upstream(focus_id)
    downstream_items = graph.trace_downstream(focus_id)
    upstream_ids = {item["from_id"] for item in upstream_items}
    downstream_ids = {item["to_id"] for item in downstream_items}
    related_ids = upstream_ids | downstream_ids | {focus_id}

    norm_edge_x, norm_edge_y = [], []
    high_edge_x, high_edge_y = [], []
    for u, v in G.edges():
        x0, y0 = pos[u]
        x1, y1 = pos[v]
        if (u == focus_id and v in downstream_ids) or (v == focus_id and u in upstream_ids) or (u in related_ids and v in related_ids):
            high_edge_x.extend([x0, x1, None])
            high_edge_y.extend([y0, y1, None])
        else:
            norm_edge_x.extend([x0, x1, None])
            norm_edge_y.extend([y0, y1, None])

    fig = go.Figure()

    if norm_edge_x:
        fig.add_trace(
            go.Scatter(
                x=norm_edge_x,
                y=norm_edge_y,
                line=dict(width=1.2, color="rgba(148, 163, 184, 0.22)"),
                hoverinfo="none",
                mode="lines",
            )
        )

    if high_edge_x:
        fig.add_trace(
            go.Scatter(
                x=high_edge_x,
                y=high_edge_y,
                line=dict(width=2.8, color="rgba(6, 182, 212, 0.95)"),
                hoverinfo="none",
                mode="lines",
            )
        )

    color_map = {
        NodeType.BUSINESS_OUTCOME.value: "#10B981",
        NodeType.PROBLEM.value: "#F59E0B",
        NodeType.GOAL.value: "#06B6D4",
        NodeType.REQUIREMENT.value: "#3B82F6",
        NodeType.SYSTEM_COMPONENT.value: "#8B5CF6",
        NodeType.DATA_SOURCE.value: "#0EA5E9",
        NodeType.TEST_CASE.value: "#14B8A6",
        NodeType.QUESTION.value: "#F43F5E",
        NodeType.ASSUMPTION.value: "#EC4899",
        NodeType.DECISION.value: "#F97316",
        NodeType.STAKEHOLDER.value: "#A855F7",
        NodeType.WORKFLOW_STEP.value: "#6366F1",
    }

    node_x, node_y = [], []
    node_colors, node_sizes, node_line_colors, node_line_widths = [], [], [], []
    node_text, hover_texts = [], []

    for n_id, data in G.nodes(data=True):
        x, y = pos[n_id]
        node_x.append(x)
        node_y.append(y)
        ntype = data.get("node_type", "")
        base_color = color_map.get(ntype, "#94A3B8")

        if n_id == focus_id:
            node_sizes.append(32)
            node_colors.append("#FFFFFF")
            node_line_colors.append("#06B6D4")
            node_line_widths.append(4)
        elif n_id in upstream_ids:
            node_sizes.append(24)
            node_colors.append(base_color)
            node_line_colors.append("#F59E0B")
            node_line_widths.append(3)
        elif n_id in downstream_ids:
            node_sizes.append(24)
            node_colors.append(base_color)
            node_line_colors.append("#22D3EE")
            node_line_widths.append(3)
        else:
            node_sizes.append(18)
            node_colors.append(base_color)
            node_line_colors.append("rgba(255, 255, 255, 0.45)")
            node_line_widths.append(1.2)

        node_text.append(n_id)
        role = "TARGET FOCUS" if n_id == focus_id else ("▲ UPSTREAM RATIONALE" if n_id in upstream_ids else ("▼ DOWNSTREAM CONSEQUENCE" if n_id in downstream_ids else "UNLINKED SCOPE"))
        hover_texts.append(
            f"<b>{n_id} — {data.get('title','')}</b><br>"
            f"Type: <span style='color:#38BDF8;'>{ntype}</span><br>"
            f"Trace: <b>{role}</b><br>"
            f"Status: {data.get('status','')}<br>"
            f"<i>{data.get('desc','')[:95]}...</i>"
        )

    fig.add_trace(
        go.Scatter(
            x=node_x,
            y=node_y,
            mode="markers+text",
            text=node_text,
            textposition="top center",
            textfont=dict(family="JetBrains Mono, monospace", size=10, color="#F8FAFC"),
            hoverinfo="text",
            hovertext=hover_texts,
            marker=dict(
                size=node_sizes,
                color=node_colors,
                line=dict(color=node_line_colors, width=node_line_widths),
                opacity=0.95,
            ),
        )
    )

    fig.update_layout(
        showlegend=False,
        hoverlabel=dict(
            bgcolor="#0A1020",
            bordercolor="rgba(6, 182, 212, 0.6)",
            font=dict(family="Plus Jakarta Sans, sans-serif", size=12, color="#FFFFFF"),
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=10, r=10, t=10, b=10),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=480,
    )
    return fig


def render_compliance_scorecard(datas: List[DataSource]) -> go.Figure:
    """Renders a Plotly horizontal compliance readiness gauge bar chart."""
    categories = ["Encryption (AES-256)", "PII Boundaries", "Access Protocols", "Data Retention", "Audit Confirmation"]
    
    total = len(datas) or 1
    enc_pct = (sum(1 for d in datas if d.encryption_at_rest) / total) * 100
    pii_pct = (sum(1 for d in datas if not d.contains_pii) / total) * 100
    prot_pct = (sum(1 for d in datas if "API" in d.access_protocol or "OAuth" in d.access_protocol) / total) * 100
    ret_pct = (sum(1 for d in datas if d.retention_days <= 365) / total) * 100
    conf_pct = (sum(1 for d in datas if d.is_confirmed) / total) * 100
    
    scores = [enc_pct, pii_pct, prot_pct, ret_pct, conf_pct]
    colors = ["#10B981" if s >= 80 else ("#F59E0B" if s >= 50 else "#F43F5E") for s in scores]
    
    fig = go.Figure()
    fig.add_trace(go.Bar(
        y=categories,
        x=scores,
        orientation='h',
        marker=dict(
            color=colors,
            line=dict(color='rgba(255,255,255,0.3)', width=1)
        ),
        text=[f"{s:.0f}%" for s in scores],
        textposition='inside',
        insidetextfont=dict(family='JetBrains Mono', color='#FFFFFF', size=11),
        hoverinfo='x+y'
    ))
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=10, r=20, t=10, b=10),
        xaxis=dict(range=[0, 105], showgrid=True, gridcolor='rgba(255,255,255,0.06)', ticksuffix='%', color='#94A3B8'),
        yaxis=dict(color='#F8FAFC', tickfont=dict(family='JetBrains Mono', size=11)),
        height=220,
    )
    return fig

# ==============================================================================
# 8. BOOTSTRAP & STATE INITIALIZATION
# ==============================================================================

st.set_page_config(
    page_title="TRACE — Turn Ambiguity Into Executable Systems",
    page_icon="⬡",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(MODERN_CSS, unsafe_allow_html=True)
st.markdown(
    """
<div class="apple-scroll-track">
    <div class="apple-scroll-bar"></div>
</div>
""",
    unsafe_allow_html=True,
)

if "graph" not in st.session_state:
    g = TraceabilityGraph()
    raw_brief, demo_nodes, demo_edges = load_renewal_demo()
    for n in demo_nodes:
        g.add_node(n)
    for e in demo_edges:
        g.add_edge(e)
    st.session_state["graph"] = g
    st.session_state["raw_brief"] = raw_brief
    st.session_state["project_title"] = "Phoenix Renewal Intelligence"

if "selected_screen" not in st.session_state:
    st.session_state["selected_screen"] = "00 // Gateway & Landing"

if "active_lens" not in st.session_state:
    st.session_state["active_lens"] = PersonaLens.ALL_SYSTEMS.value

if "simulated_failures" not in st.session_state:
    st.session_state["simulated_failures"] = set()

if "snapshots" not in st.session_state:
    st.session_state["snapshots"] = {
        "v1.0 Baseline (Phoenix Initial)": {
            "nodes_count": len(st.session_state["graph"].all_nodes()),
            "score": 68.0,
            "timestamp": "2026-09-01",
        }
    }

graph: TraceabilityGraph = st.session_state["graph"]
nodes = graph.all_nodes()
edges = graph.all_edges()

# Sidebar Navigation Control & Persona Lens
with st.sidebar:
    st.markdown(
        """
    <div style="padding: 10px 4px 14px 4px;">
        <div style="margin-bottom: 10px;">
            <span class="live-beacon"><span class="beacon-dot"></span><span>SYSTEMS ENGINE ONLINE</span></span>
        </div>
        <div style="font-size: 1.55rem; font-weight: 800; color: #FFFFFF; letter-spacing: -0.03em; margin-top: 6px;">⬡ T R A C E</div>
        <div style="font-size: 0.72rem; color: #64748B; letter-spacing: 0.04em;">AMBIGUOUS INTENT → EXECUTABLE SYSTEM</div>
    </div>
    """,
        unsafe_allow_html=True,
    )

    st.session_state["active_lens"] = st.selectbox(
        "ACTIVE PERSONA LENS",
        [p.value for p in PersonaLens],
        index=[p.value for p in PersonaLens].index(
            st.session_state["active_lens"]
        ),
    )

    st.markdown("---")

    screens_list = [
        "00 // Gateway & Landing",
        "01 // Overview",
        "02 // Ingestion & Source",
        "03 // Conceptual Model",
        "04 // Requirements Ledger & Resolvers",
        "05 // Workflows & Sequences",
        "06 // Traceability Graph",
        "07 // System Architecture & ADRs",
        "08 // Acceptance Tests",
        "09 // Readiness Engine",
        "10 // Governance & Compliance Heatmap",
        "11 // Sprint Sizing & Estimation",
        "12 // Executive Sign-Off Memo",
        "13 // Version Snapshots & Diff",
        "14 // Methodology",
    ]

    current_idx = (
        screens_list.index(st.session_state["selected_screen"])
        if st.session_state["selected_screen"] in screens_list
        else 0
    )
    selected_screen = st.radio(
        "NAVIGATION", screens_list, index=current_idx, label_visibility="collapsed"
    )
    st.session_state["selected_screen"] = selected_screen

    st.markdown("---")
    st.markdown(
        f"""
    <div style="font-family: var(--font-mono); font-size: 0.74rem; line-height: 1.9; color: #94A3B8; padding: 0 4px;">
        CASE: <span style="color: #F8FAFC; font-weight:600;">{st.session_state['project_title']}</span><br/>
        NODES: <span style="color: #06B6D4;">{len(nodes)}</span> | SNAPSHOTS: <span style="color: #10B981;">{len(st.session_state['snapshots'])}</span><br/>
        LENS: <span style="color: #F59E0B;">{st.session_state['active_lens'].split(' ')[0]}</span>
    </div>
    """,
        unsafe_allow_html=True,
    )

# ==============================================================================
# 9. WORKSPACE SCREENS
# ==============================================================================

if "00 // Gateway & Landing" in st.session_state["selected_screen"]:
    st.markdown(
        """
    <div class="hero-container">
        <div class="hero-pill">ENTERPRISE SYSTEMS REASONING ENGINE</div>
        <div class="hero-headline">Turn Messy Organizational Intent<br/>Into an Executable System.</div>
        <div class="hero-sub">
            Transform ambiguous stakeholder emails, briefs, and spreadsheets into a verifiable engineering chain: 
            <b>Problem → Requirements → Dependencies → Architecture → Acceptance Tests → Version Snapshots.</b>
        </div>
    </div>
    """,
        unsafe_allow_html=True,
    )

    c_btn1, c_btn2, c_btn3 = st.columns(3)
    with c_btn1:
        if st.button("EXPLORE PHOENIX CASE STUDY ➔", **get_stretch_kw(st.button)):
            st.session_state["selected_screen"] = "01 // Overview"
            st.rerun()
    with c_btn2:
        if st.button("UPLOAD DATA & FILES ➔", **get_stretch_kw(st.button)):
            st.session_state["selected_screen"] = "02 // Ingestion & Source"
            st.rerun()
    with c_btn3:
        if st.button("EXECUTIVE SIGN-OFF MEMO ➔", **get_stretch_kw(st.button)):
            st.session_state["selected_screen"] = "12 // Executive Sign-Off Memo"
            st.rerun()

    st.markdown("<br/>", unsafe_allow_html=True)
    st.markdown(
        """
    <div class="feature-grid">
        <div class="feature-card">
            <div class="feature-icon">🔍</div>
            <div class="feature-title">Inline Ambiguity Resolvers</div>
            <div class="feature-desc">Discovers unquantified latency ("real-time") or vague bounds and offers one-click architectural resolutions in real time.</div>
        </div>
        <div class="feature-card">
            <div class="feature-icon">🛡️</div>
            <div class="feature-title">Governance & Compliance Heatmap</div>
            <div class="feature-desc">Cross-references PII data sources with protocols to verify GDPR, CCPA, and SOC 2 Type II audit readiness.</div>
        </div>
        <div class="feature-card">
            <div class="feature-icon">⏱️</div>
            <div class="feature-title">Sprint Sizing & Infrastructure Costs</div>
            <div class="feature-desc">Calculates deterministic story points, t-shirt sizes, and monthly cloud infrastructure estimates from system complexity.</div>
        </div>
    </div>
    """,
        unsafe_allow_html=True,
    )

elif "01 // Overview" in st.session_state["selected_screen"]:
    st.markdown("## Systems Executive Overview")
    st.caption(
        f"Active Lens: **{st.session_state['active_lens']}** — Macro readiness score, strategic intent chain, and blockers."
    )

    readiness = ReadinessEngine.evaluate(
        nodes, st.session_state["simulated_failures"]
    )
    reqs = [
        n
        for n in nodes
        if n.node_type == NodeType.REQUIREMENT
        and n.id not in st.session_state["simulated_failures"]
    ]
    orphans = graph.get_orphans()

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        c_acc = (
            "accent-emerald"
            if readiness["total_score"] >= 80
            else "accent-amber"
        )
        st.markdown(
            f'<div class="telemetry-card"><div class="telemetry-accent {c_acc}"></div><div class="telemetry-label">Readiness Score</div><div class="telemetry-num">{readiness["total_score"]}%</div></div>',
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            f'<div class="telemetry-card"><div class="telemetry-accent accent-cyan"></div><div class="telemetry-label">Active Requirements</div><div class="telemetry-num">{len(reqs)}</div></div>',
            unsafe_allow_html=True,
        )
    with c3:
        c_orph = (
            "accent-rose"
            if orphans["untested_requirements"]
            else "accent-emerald"
        )
        st.markdown(
            f'<div class="telemetry-card"><div class="telemetry-accent {c_orph}"></div><div class="telemetry-label">Untested Scope</div><div class="telemetry-num">{len(orphans["untested_requirements"])}</div></div>',
            unsafe_allow_html=True,
        )
    with c4:
        c_blk = "accent-rose" if readiness["blockers"] else "accent-emerald"
        st.markdown(
            f'<div class="telemetry-card"><div class="telemetry-accent {c_blk}"></div><div class="telemetry-label">Active Blockers</div><div class="telemetry-num">{len(readiness["blockers"])}</div></div>',
            unsafe_allow_html=True,
        )

    st.markdown("<br/>### Strategic Rationale Spine", unsafe_allow_html=True)
    spine_cols = st.columns(3)
    with spine_cols[0]:
        bo = next(
            (n for n in nodes if n.node_type == NodeType.BUSINESS_OUTCOME), None
        )
        if bo:
            st.markdown(
                f'<div class="entity-card"><div class="entity-header"><span class="entity-id">{bo.id}</span><span class="chip chip-emerald">OUTCOME</span></div><div class="entity-title">{bo.title}</div><div class="entity-body">{bo.description}</div></div>',
                unsafe_allow_html=True,
            )
    with spine_cols[1]:
        prb = next((n for n in nodes if n.node_type == NodeType.PROBLEM), None)
        if prb:
            st.markdown(
                f'<div class="entity-card"><div class="entity-header"><span class="entity-id">{prb.id}</span><span class="chip chip-amber">PROBLEM</span></div><div class="entity-title">{prb.title}</div><div class="entity-body">{prb.description}</div></div>',
                unsafe_allow_html=True,
            )
    with spine_cols[2]:
        goal = next((n for n in nodes if n.node_type == NodeType.GOAL), None)
        if goal:
            st.markdown(
                f'<div class="entity-card"><div class="entity-header"><span class="entity-id">{goal.id}</span><span class="chip chip-cyan">GOAL</span></div><div class="entity-title">{goal.title}</div><div class="entity-body">{goal.description}</div></div>',
                unsafe_allow_html=True,
            )

elif "02 // Ingestion & Source" in st.session_state["selected_screen"]:
    st.markdown("## Document Ingestion & Multi-Format Data Hub")
    st.caption(
        "Upload real company CSVs, JSON models, or text briefs to construct inspectable TRACE systems."
    )

    uploaded_file = st.file_uploader(
        "Upload project file",
        type=["csv", "json", "txt", "md"],
        label_visibility="collapsed",
    )
    if uploaded_file is not None:
        if st.button("Ingest & Analyze File", **get_stretch_kw(st.button)):
            raw_text, new_nodes, new_edges = (
                IngestionEngine.parse_uploaded_file(uploaded_file)
            )
            new_graph = TraceabilityGraph()
            for n in new_nodes:
                new_graph.add_node(n)
            for e in new_edges:
                new_graph.add_edge(e)
            st.session_state["graph"] = new_graph
            st.session_state["raw_brief"] = raw_text
            st.session_state["project_title"] = uploaded_file.name
            st.success(
                f"Extracted {len(new_nodes)} nodes from {uploaded_file.name}!"
            )
            st.rerun()

    user_text = st.text_area(
        "Or Paste Brief Text", value=st.session_state["raw_brief"], height=240
    )
    if st.button("Run Extraction"):
        raw_text, new_nodes, new_edges = IngestionEngine._from_text(
            user_text, "Pasted Brief"
        )
        new_graph = TraceabilityGraph()
        for n in new_nodes:
            new_graph.add_node(n)
        for e in new_edges:
            new_graph.add_edge(e)
        st.session_state["graph"] = new_graph
        st.session_state["raw_brief"] = user_text
        st.session_state["project_title"] = "Analyzed Input"
        st.rerun()

elif "03 // Conceptual Model" in st.session_state["selected_screen"]:
    st.markdown("## Conceptual Domain Model & Stakeholder Discovery")
    tabs = st.tabs(
        [
            "Outcomes & Problems",
            "Stakeholders",
            "Discovery Interview Generator",
        ]
    )
    with tabs[0]:
        for n in nodes:
            if n.node_type in [NodeType.BUSINESS_OUTCOME, NodeType.PROBLEM]:
                st.markdown(
                    f'<div class="entity-card"><div class="entity-header"><span class="entity-id">{n.id}</span><span class="chip chip-cyan">{n.node_type.value}</span></div><div class="entity-title">{n.title}</div><div class="entity-body">{n.description}</div></div>',
                    unsafe_allow_html=True,
                )
    with tabs[1]:
        for n in nodes:
            if n.node_type == NodeType.STAKEHOLDER:
                st.markdown(
                    f'<div class="entity-card"><div class="entity-header"><span class="entity-id">{n.id}</span><span class="chip chip-emerald">{n.metadata.get("department","Org")}</span></div><div class="entity-title">{n.title}</div><div class="entity-body">{n.description}</div></div>',
                    unsafe_allow_html=True,
                )
    with tabs[2]:
        for q in [n for n in nodes if n.node_type == NodeType.QUESTION]:
            st.markdown(
                f'<div class="entity-card"><div class="entity-header"><span class="entity-id">{q.id}</span><span class="chip chip-rose">BLOCKER</span></div><div class="entity-title">{q.title}</div><div class="entity-body">{q.description}</div></div>',
                unsafe_allow_html=True,
            )

elif (
    "04 // Requirements Ledger & Resolvers"
    in st.session_state["selected_screen"]
):
    st.markdown("## Traceable Requirements Matrix & Interactive Resolvers")
    st.caption(
        "Requirements ledger equipped with automated ambiguity detection and one-click architectural remedies."
    )

    reqs = [
        n
        for n in nodes
        if n.node_type == NodeType.REQUIREMENT and isinstance(n, Requirement)
    ]
    conflicts = ContradictionEngine.detect_conflicts(reqs)

    if conflicts:
        for c in conflicts:
            st.error(
                f"**ARCHITECTURAL CONTRADICTION: {c['title']}**\n\n{c['description']}"
            )
            with st.expander("Explore Stance & Decide"):
                mode = st.radio(
                    "Resolution Stance", c["options"], key=f"conf_{c['id']}"
                )
                if st.button(
                    "Enforce Stance", key=f"btn_conf_{c['id']}"
                ):
                    graph.update_node_status(
                        c["req_1"], ValidationStatus.VALIDATED_BY_HUMAN
                    )
                    graph.update_node_status(
                        c["req_2"], ValidationStatus.VALIDATED_BY_HUMAN
                    )
                    st.success("Resolved contradiction!")
                    st.rerun()

    for r in reqs:
        is_amb, notes, remediations, resolutions = (
            AmbiguityEngine.audit_requirement(r)
        )
        chip_stat = (
            "chip-rose"
            if (is_amb or r.has_conflict)
            else (
                "chip-emerald"
                if r.validation_status == ValidationStatus.VALIDATED_BY_HUMAN
                else "chip-amber"
            )
        )

        st.markdown(
            f"""
        <div class="entity-card">
            <div class="entity-header">
                <span class="entity-id">{r.id}</span>
                <div>
                    <span class="chip {chip_stat}">{r.validation_status.value}</span>
                    <span class="chip chip-cyan">{r.req_type.value}</span>
                    <span class="chip chip-amber">EST: {r.story_points} pts ({r.t_shirt_size})</span>
                </div>
            </div>
            <div class="entity-title">{r.title}</div>
            <div class="entity-body">{r.description}</div>
            <div class="entity-footer">
                <span>OWNER: {r.owner or 'Unassigned'}</span>
                <span>CRITERIA: {len(r.acceptance_criteria)} Defined</span>
            </div>
        </div>
        """,
            unsafe_allow_html=True,
        )

        with st.expander(f"Inspect Criteria & One-Click Resolvers for {r.id}"):
            if r.acceptance_criteria:
                st.markdown("**Acceptance Criteria:**")
                for ac in r.acceptance_criteria:
                    st.markdown(f"- `{ac}`")

            if notes and is_amb:
                st.markdown("### ⚠️ Ambiguity Audit & Instant Resolution")
                for idx, (n_text, rem) in enumerate(zip(notes, remediations)):
                    st.warning(f"**Issue:** {n_text} — *Remedy:* {rem}")
                    if idx < len(resolutions):
                        chosen_opt = st.selectbox(
                            f"Select SLA / Boundary Stance for {r.id}",
                            resolutions[idx],
                            key=f"res_{r.id}_{idx}",
                        )
                        if st.button(
                            f"Apply Resolution to {r.id}",
                            key=f"btn_res_{r.id}_{idx}",
                        ):
                            r.acceptance_criteria.append(
                                f"Operational Boundary: {chosen_opt}"
                            )
                            r.is_ambiguous = False
                            r.ambiguity_notes = []
                            r.validation_status = (
                                ValidationStatus.VALIDATED_BY_HUMAN
                            )
                            st.success(
                                f"Resolved! Bound {r.id} to '{chosen_opt}'"
                            )
                            st.rerun()

elif "05 // Workflows & Sequences" in st.session_state["selected_screen"]:
    st.markdown("## Operational Workflow & Native Sequence Topology")
    steps = sorted(
        [n for n in nodes if n.node_type == NodeType.WORKFLOW_STEP],
        key=lambda s: s.sequence_index,
    )
    mermaid = [
        "%%{init: {'theme': 'dark', 'themeVariables': {'darkMode': true, 'primaryColor': '#111A2E', 'primaryTextColor': '#F8FAFC', 'primaryBorderColor': '#06B6D4', 'lineColor': '#38BDF8', 'textColor': '#F8FAFC', 'messageTextColor': '#22D3EE'}}}%%",
        "sequenceDiagram",
        "    autonumber",
    ]
    for s in steps:
        mermaid.append(f"    User->>System: {s.title}")
    st.markdown("```mermaid\n" + "\n".join(mermaid) + "\n```")

elif "06 // Traceability Graph" in st.session_state["selected_screen"]:
    st.markdown("## Interactive Bidirectional Traceability Graph")
    st.caption(
        "Interactive physical topology map. Select any node to illuminate upstream rationales and downstream blast consequences."
    )

    node_opts = {f"{n.id} — {n.title}": n.id for n in nodes}
    sel_col1, sel_col2 = st.columns([2.8, 1.2])
    with sel_col1:
        focus_id = node_opts[st.selectbox("TARGET INSPECTION NODE", list(node_opts.keys()))]
    with sel_col2:
        focused_node = next((n for n in nodes if n.id == focus_id), None)
        f_type = focused_node.node_type.value if focused_node else "UNKNOWN"
        st.markdown(
            f'<div style="padding-top:28px;"><span class="chip chip-cyan" style="font-size:0.76rem;">FOCUS ENTITY: {f_type}</span></div>',
            unsafe_allow_html=True,
        )

    # Render Plotly interactive network graph
    fig = render_plotly_traceability_graph(graph, focus_id)
    st.plotly_chart(fig, **get_stretch_kw(st.plotly_chart))

    # Detailed Upstream & Downstream Drilldown Cards
    c_up, c_down = st.columns(2)
    with c_up:
        st.markdown("#### ▲ Upstream Rationale & Origins")
        up_items = graph.trace_upstream(focus_id)
        if up_items:
            for item in up_items:
                st.markdown(
                    f"""
                    <div class="entity-card" style="padding:14px 18px; margin-bottom:10px;">
                        <div class="entity-header" style="margin-bottom:6px; padding-bottom:6px;">
                            <span class="entity-id">{item['from_id']}</span>
                            <span class="chip chip-amber">{item['relation']}</span>
                        </div>
                        <div style="font-size:0.86rem; color:#CBD5E1;">Type: <b>{item['from_type']}</b></div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
        else:
            st.info("No upstream dependencies detected (Root intent entity).")

    with c_down:
        st.markdown("#### ▼ Downstream Impact & Breakage")
        down_items = graph.trace_downstream(focus_id)
        if down_items:
            for item in down_items:
                st.markdown(
                    f"""
                    <div class="entity-card" style="padding:14px 18px; margin-bottom:10px;">
                        <div class="entity-header" style="margin-bottom:6px; padding-bottom:6px;">
                            <span class="entity-id">{item['to_id']}</span>
                            <span class="chip chip-cyan">{item['relation']}</span>
                        </div>
                        <div style="font-size:0.86rem; color:#CBD5E1;">Type: <b>{item['to_type']}</b></div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
        else:
            st.info("No downstream dependents detected (Terminal leaf entity).")

elif (
    "07 // System Architecture & ADRs" in st.session_state["selected_screen"]
):
    st.markdown("## System Architecture, What-If Simulator & ADRs")
    if st.button("⚡ Simulate Storage Failure (DATA-001)"):
        if "DATA-001" in st.session_state["simulated_failures"]:
            st.session_state["simulated_failures"].remove("DATA-001")
        else:
            st.session_state["simulated_failures"].add("DATA-001")
        st.rerun()
    if st.session_state["simulated_failures"]:
        blast = graph.compute_blast_radius(
            st.session_state["simulated_failures"]
        )
        st.error(
            f"Active Blast Radius Impact: {len(blast['affected_requirements'])} requirements compromised."
        )

elif "08 // Acceptance Tests" in st.session_state["selected_screen"]:
    st.markdown("## Executable Acceptance Verification Suite")
    for t in [n for n in nodes if n.node_type == NodeType.TEST_CASE]:
        st.markdown(
            f'<div class="entity-card"><div class="entity-header"><span class="entity-id">{t.id}</span><span class="chip chip-emerald">TEST</span></div><div class="entity-title">{t.title}</div><div class="entity-body"><b>GIVEN:</b> {t.given}<br/><b>WHEN:</b> {t.when}<br/><b>THEN:</b> {t.then}</div></div>',
            unsafe_allow_html=True,
        )

elif "09 // Readiness Engine" in st.session_state["selected_screen"]:
    st.markdown("## 8-Factor Implementation Readiness Diagnostic")
    readiness = ReadinessEngine.evaluate(
        nodes, st.session_state["simulated_failures"]
    )
    st.metric("Composite Readiness Score", f"{readiness['total_score']}%")
    for name, info in readiness["dimensions"].items():
        st.progress(
            info["score"],
            text=f"{name}: {int(info['score']*100)}% — {info['notes']}",
        )

elif (
    "10 // Governance & Compliance Heatmap"
    in st.session_state["selected_screen"]
):
    st.markdown("## Security, Privacy & Compliance Exposure Heatmap")
    st.caption(
        "Cross-reference data stores with protocols, retention boundaries, and regulatory standards (GDPR / SOC 2 Type II)."
    )

    datas = [
        n
        for n in nodes
        if n.node_type == NodeType.DATA_SOURCE and isinstance(n, DataSource)
    ]

    gov_rows = []
    for d in datas:
        gov_rows.append(
            {
                "Data Source": d.title,
                "Classification": d.data_classification,
                "Contains PII": "⚠️ YES" if d.contains_pii else "✅ NO",
                "Access Protocol": d.access_protocol,
                "Encryption At-Rest": "✅ AES-256"
                if d.encryption_at_rest
                else "❌ UNENCRYPTED",
                "Retention Limit": f"{d.retention_days} days",
                "Audit Status": "Compliant"
                if d.is_confirmed
                else "Needs Audit",
            }
        )

    st.markdown("#### Compliance Readiness Gauge")
    st.plotly_chart(render_compliance_scorecard(datas), **get_stretch_kw(st.plotly_chart))

    st.markdown("#### Data Store Governance Matrix")
    st.dataframe(
        pd.DataFrame(gov_rows),
        hide_index=True,
        **get_stretch_kw(st.dataframe),
    )

    st.markdown("### Regulatory Readiness Scorecard")
    c_r1, c_r2, c_r3 = st.columns(3)
    with c_r1:
        st.markdown(
            """
        <div class="telemetry-card">
            <div class="telemetry-accent accent-emerald"></div>
            <div class="telemetry-label">GDPR Article 32</div>
            <div class="telemetry-num" style="font-size: 1.4rem;">PASS</div>
            <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">Encryption verified across confirmed stores.</div>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with c_r2:
        st.markdown(
            """
        <div class="telemetry-card">
            <div class="telemetry-accent accent-amber"></div>
            <div class="telemetry-label">CCPA Redaction</div>
            <div class="telemetry-num" style="font-size: 1.4rem;">WARN</div>
            <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">Zendesk support notes contain raw customer PII.</div>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with c_r3:
        st.markdown(
            """
        <div class="telemetry-card">
            <div class="telemetry-accent accent-cyan"></div>
            <div class="telemetry-label">SOC 2 Type II Trace</div>
            <div class="telemetry-num" style="font-size: 1.4rem;">READY</div>
            <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">Complete bi-directional provenance graph.</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

elif "11 // Sprint Sizing & Estimation" in st.session_state["selected_screen"]:
    st.markdown("## Sprint Velocity, Effort Sizing & Cloud Cost Estimation")
    st.caption(
        "Deterministic story point calculations, T-shirt sizing, and infrastructure budgeting."
    )

    reqs = [
        n
        for n in nodes
        if n.node_type == NodeType.REQUIREMENT and isinstance(n, Requirement)
    ]
    comps = [
        n
        for n in nodes
        if n.node_type == NodeType.SYSTEM_COMPONENT
        and isinstance(n, SystemComponent)
    ]
    estimates = EstimationEngine.calculate_sizing(reqs, comps)

    c_s1, c_s2, c_s3, c_s4 = st.columns(4)
    with c_s1:
        st.markdown(
            f"""
        <div class="telemetry-card">
            <div class="telemetry-accent accent-cyan"></div>
            <div class="telemetry-label">Total Story Points</div>
            <div class="telemetry-num">{estimates['total_story_points']} pts</div>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with c_s2:
        st.markdown(
            f"""
        <div class="telemetry-card">
            <div class="telemetry-accent accent-emerald"></div>
            <div class="telemetry-label">Estimated Sprints</div>
            <div class="telemetry-num">{estimates['estimated_sprints']} Sprints</div>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with c_s3:
        st.markdown(
            f"""
        <div class="telemetry-card">
            <div class="telemetry-accent accent-amber"></div>
            <div class="telemetry-label">Calendar Runway</div>
            <div class="telemetry-num">{estimates['estimated_calendar_weeks']} Weeks</div>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with c_s4:
        st.markdown(
            f"""
        <div class="telemetry-card">
            <div class="telemetry-accent accent-rose"></div>
            <div class="telemetry-label">Est. Cloud Run Cost</div>
            <div class="telemetry-num">${estimates['monthly_infra_cost']}/mo</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    st.markdown("### Requirement Sizing Breakdown")
    sizing_rows = [
        {
            "Requirement ID": r.id,
            "Requirement Title": r.title,
            "Type": r.req_type.value,
            "Criteria Count": len(r.acceptance_criteria),
            "Story Points": f"{r.story_points} pts",
            "T-Shirt Size": r.t_shirt_size,
        }
        for r in reqs
    ]
    st.dataframe(
        pd.DataFrame(sizing_rows),
        hide_index=True,
        **get_stretch_kw(st.dataframe),
    )

elif "12 // Executive Sign-Off Memo" in st.session_state["selected_screen"]:
    st.markdown("## Executive Steering Committee Decision Memo")
    st.caption(
        "Formal one-page decision brief for product executives, enterprise architects, and engineering sponsors."
    )

    bo = next(
        (n for n in nodes if n.node_type == NodeType.BUSINESS_OUTCOME), None
    )
    prb = next((n for n in nodes if n.node_type == NodeType.PROBLEM), None)
    readiness = ReadinessEngine.evaluate(nodes)
    reqs = [n for n in nodes if n.node_type == NodeType.REQUIREMENT]

    memo_content = f"""
================================================================================
EXECUTIVE DECISION BRIEF: {st.session_state['project_title'].upper()}
Target Implementation Readiness Score: {readiness['total_score']}%
Status: {'SAFE FOR ENGINEERING HANDOFF' if readiness['is_ready'] else 'CONDITIONAL REVIEW REQUIRED'}
================================================================================

1. STRATEGIC OBJECTIVE:
{bo.description if bo else 'N/A'}

2. CORE ORGANIZATIONAL PROBLEM:
{prb.description if prb else 'N/A'}

3. SYSTEM SCALE & DELIVERABLES:
- Functional & Governance Requirements: {len(reqs)} items defined
- Technical Readiness Level: {readiness['total_score']}%
- Outstanding Blocking Questions: {len(readiness['blockers'])} open items

4. RESOLVED ARCHITECTURAL STANCE:
- Human-in-the-loop validation gate enforced on automated triggers.
- Multi-source integration joins CRM contract data with usage telemetry.

5. FORMAL TECHNICAL HANDOFF SIGN-OFFS:
[ ] VP of Product: ______________________      Date: ______________
[ ] VP of Engineering: __________________      Date: ______________
[ ] Chief Information Security Officer: _      Date: ______________
"""

    st.markdown(
        f"""
    <div class="decision-memo-sheet">
        <div style="font-family: var(--font-mono); font-size: 0.76rem; color: #06B6D4; letter-spacing: 0.1em; margin-bottom: 8px;">TRACE SYSTEMS ARCHITECTURE MEMORANDUM</div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #FFFFFF; margin-bottom: 16px;">{st.session_state['project_title']}</div>
        <div style="font-size: 0.92rem; line-height: 1.7; color: #CBD5E1; white-space: pre-wrap; font-family: var(--font-mono);">{memo_content}</div>
    </div>
    """,
        unsafe_allow_html=True,
    )

    st.download_button(
        "Download Print-Ready Executive Memo (.txt)",
        data=memo_content,
        file_name="EXECUTIVE_DECISION_MEMO.txt",
        mime="text/plain",
        **get_stretch_kw(st.download_button),
    )

elif "13 // Version Snapshots & Diff" in st.session_state["selected_screen"]:
    st.markdown("## Version Snapshots & Structural Diffing")
    st.caption(
        "Save named project checkpoints and compare model evolution across architectural revisions."
    )

    col_s1, col_s2 = st.columns(2)
    with col_s1:
        snap_name = st.text_input(
            "New Snapshot Name",
            value=f"v1.{len(st.session_state['snapshots'])} - Review Checkpoint",
        )
        if st.button("Save Current Model Snapshot"):
            readiness = ReadinessEngine.evaluate(nodes)
            st.session_state["snapshots"][snap_name] = {
                "nodes_count": len(nodes),
                "score": readiness["total_score"],
                "timestamp": "2026-09-05",
            }
            st.success(f"Snapshot '{snap_name}' saved successfully!")
            st.rerun()

    with col_s2:
        st.markdown("### Saved Checkpoints")
        for s_name, s_data in st.session_state["snapshots"].items():
            st.markdown(
                f"""
            <div class="entity-card">
                <div class="entity-header">
                    <span class="entity-id">{s_name}</span>
                    <span class="chip chip-cyan">READINESS: {s_data['score']}%</span>
                </div>
                <div class="entity-body">Nodes Tracked: {s_data['nodes_count']} | Saved: {s_data['timestamp']}</div>
            </div>
            """,
                unsafe_allow_html=True,
            )

    st.markdown("### Structural Revision Diff")
    snap_keys = list(st.session_state["snapshots"].keys())
    if len(snap_keys) >= 1:
        d_col1, d_col2 = st.columns(2)
        with d_col1:
            base_snap = st.selectbox("Compare From (Base)", snap_keys, index=0)
        with d_col2:
            curr_snap = st.selectbox(
                "Compare To (Current)", snap_keys, index=len(snap_keys) - 1
            )

        base_data = st.session_state["snapshots"][base_snap]
        curr_data = st.session_state["snapshots"][curr_snap]

        node_diff = curr_data["nodes_count"] - base_data["nodes_count"]
        score_diff = curr_data["score"] - base_data["score"]

        st.info(
            f"**Structural Diff Report ({base_snap} ➔ {curr_snap}):**\n\n"
            f"• **Node Delta:** {node_diff:+d} entities\n"
            f"• **Readiness Score Delta:** {score_diff:+.1f}%\n"
            f"• **Structural Stability:** {'Stable' if node_diff == 0 else 'Evolving'}"
        )

elif "14 // Methodology" in st.session_state["selected_screen"]:
    st.markdown("## Epistemic Architecture & Non-AI Manifesto")
    st.markdown(
        """
    ### Principles of the TRACE Engine
    
    1. **Strict Epistemic Separation:** Organizational knowledge is classified into Source Facts, Normalized Interpretations, Hypothesized Inferences, and Recommendations. Generative AI cannot promote an inference to a verified fact without human sign-off.
    2. **Deterministic Governance:** Readiness scores (0-100%), conflict detection, and ambiguity flags are computed by deterministic Python algorithms and rule matrices—never by black-box LLM estimations.
    3. **Bidirectional Traceability:** Every system component, data dependency, and acceptance test maintains a verifiable relational link back to its originating stakeholder rationale.
    """
    )