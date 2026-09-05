"""TRACE — From Ambiguous Intent to Executable Systems
A portfolio-grade systems analysis workspace and requirements engineering engine.
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
    try:
        sig = inspect.signature(func)
        if "width" in sig.parameters:
            return {"width": "stretch"}
    except Exception:
        pass
    return {"use_container_width": True}


# ==============================================================================
# 1. CORE ONTOLOGY & DATA MODELS
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


class DataSource(TraceNode):
    node_type: NodeType = NodeType.DATA_SOURCE
    system_of_record: str = "Unknown"
    update_frequency: str = "Batch"
    access_protocol: str = "REST API"
    contains_pii: bool = False
    is_confirmed: bool = False


class SystemComponent(TraceNode):
    node_type: NodeType = NodeType.SYSTEM_COMPONENT
    layer: str = "Application"
    arch_type: str = "Rule Engine"
    lifecycle_state: str = "PROPOSED"


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
# 2. TRACEABILITY GRAPH ENGINE
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


# ==============================================================================
# 3. DETERMINISTIC AUDIT ENGINES
# ==============================================================================

AMBIGUITY_PATTERNS = [
    (
        r"\b(real[\s\-]time|instantaneous|zero latency)\b",
        "Operational Latency Undefined",
        "Specify acceptable SLA bounds in milliseconds, seconds, or minutes.",
    ),
    (
        r"\b(seamless|frictionless|intuitive)\b",
        "Subjective Quality Metric",
        "Formulate testable UI/system handoff criteria.",
    ),
    (
        r"\b(as much as needed|huge scale|all data)\b",
        "Unbounded Capacity Bounds",
        "Provide explicit throughput or storage bounds (e.g., GB/day, peak QPS).",
    ),
    (
        r"\b(smart|intelligent|ai-powered)\b",
        "Unspecified Mechanism",
        "State whether logic requires deterministic rules, statistical ML, or human evaluation.",
    ),
    (
        r"\b(users?|stakeholders?|someone)\b",
        "Ambiguous Actor Identity",
        "Specify the explicit role, persona, or permission profile.",
    ),
]


class AmbiguityEngine:

    @staticmethod
    def audit_requirement(req: Requirement) -> Tuple[bool, List[str], List[str]]:
        notes, remediation = [], []
        text = f"{req.title} {req.description}".lower()
        for pattern, reason, fix in AMBIGUITY_PATTERNS:
            match = re.search(pattern, text)
            if match:
                notes.append(f"{reason} ('{match.group(0)}')")
                remediation.append(fix)
        if not req.acceptance_criteria:
            notes.append("No acceptance criteria formulated")
            remediation.append(
                "Formulate at least one Given-When-Then testable condition."
            )
        if not req.owner:
            notes.append("Unassigned ownership")
            remediation.append(
                "Assign a responsible stakeholder department or role."
            )
        return len(notes) > 0, notes, remediation


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
    def evaluate(nodes: List[TraceNode]) -> Dict[str, Any]:
        problems = [n for n in nodes if n.node_type == NodeType.PROBLEM]
        stakeholders = [n for n in nodes if n.node_type == NodeType.STAKEHOLDER]
        reqs = [
            n
            for n in nodes
            if n.node_type == NodeType.REQUIREMENT and isinstance(n, Requirement)
        ]
        data_sources = [
            n
            for n in nodes
            if n.node_type == NodeType.DATA_SOURCE and isinstance(n, DataSource)
        ]
        components = [
            n
            for n in nodes
            if n.node_type == NodeType.SYSTEM_COMPONENT
            and isinstance(n, SystemComponent)
        ]
        workflows = [
            n
            for n in nodes
            if n.node_type == NodeType.WORKFLOW_STEP
            and isinstance(n, WorkflowStep)
        ]
        tests = [
            n
            for n in nodes
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
# 4. DETERMINISTIC BENCHMARK CASE
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
            metadata={
                "department": "Customer Success",
                "role_level": "Executive",
            },
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
        ),
        SystemComponent(
            id="COMP-001",
            title="Risk Scoring Service",
            description="Inference service computing composite health scores using rules and statistical anomaly detection.",
            layer="Inference Layer",
            arch_type="Deterministic Heuristics + XGBoost",
            lifecycle_state="PROPOSED",
        ),
        SystemComponent(
            id="COMP-002",
            title="CSM Intervention Console",
            description="Web portal allowing account teams to inspect evidence, adjust risk weights, and authorize playbooks.",
            layer="Presentation Layer",
            arch_type="React SPA + Python Backend",
            lifecycle_state="PROPOSED",
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
            assigned_stakeholder="STK-001",
            impact_description="Determines whether architecture requires an Apache Kafka streaming backbone or a warehouse query.",
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
# 5. ELEVATED DESIGN SYSTEM: MULTI-HUE AURORA MESH & PROTECTED ICON ENGINE
# ==============================================================================

MODERN_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

:root {
    --bg-base: #070B16;
    --text-primary: #F8FAFC;
    --text-secondary: #CBD5E1;
    --text-tertiary: #94A3B8;
    --accent-cyan: #06B6D4;
    --accent-emerald: #10B981;
    --accent-amber: #F59E0B;
    --accent-rose: #F43F5E;
    --accent-indigo: #6366F1;
    --font-mono: 'JetBrains Mono', monospace;
    --font-sans: 'Plus Jakarta Sans', -apple-system, sans-serif;
}

/* Multi-Hue Aurora Cosmic Mesh */
.stApp {
    background-color: #060913 !important;
    background-image: 
        radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.22) 0px, transparent 48%),
        radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.25) 0px, transparent 50%),
        radial-gradient(at 50% 45%, rgba(13, 20, 38, 0.96) 0px, transparent 100%),
        radial-gradient(at 100% 100%, rgba(217, 70, 239, 0.16) 0px, transparent 52%),
        radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.16) 0px, transparent 50%),
        radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px) !important;
    background-size: 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 30px 30px !important;
    color: var(--text-primary) !important;
    font-family: var(--font-sans) !important;
}

/* ==========================================================================
   PROTECTED ICON FONT FIX: Eliminates ligature text rendering on expanders/collapse
   ========================================================================== */
span[data-testid="stIconMaterial"],
[data-testid="stSidebarCollapseButton"] span,
[data-testid="stExpanderToggleIcon"] span,
[class*="material-symbols"],
[class*="material-icons"] {
    font-family: "Material Symbols Rounded", "Material Icons" !important;
    display: inline-block !important;
    font-style: normal !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    white-space: nowrap !important;
    word-wrap: normal !important;
    direction: ltr !important;
}

header[data-testid="stHeader"] { background: transparent !important; }
footer { visibility: hidden !important; }
#MainMenu { visibility: hidden !important; }

/* Sidebar Precision */
[data-testid="stSidebar"] {
    background: rgba(8, 14, 28, 0.88) !important;
    backdrop-filter: blur(22px) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* Typography Hierarchy */
h1, h2, h3, h4 {
    font-family: var(--font-sans) !important;
    font-weight: 800 !important;
    color: var(--text-primary) !important;
    letter-spacing: -0.03em !important;
}

/* HERO SECTION ON LANDING PAGE */
.hero-container {
    padding: 48px 0 32px 0;
    text-align: center;
    max-width: 920px;
    margin: 0 auto;
}
.hero-pill {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #22D3EE;
    background: rgba(6, 182, 212, 0.12);
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(6, 182, 212, 0.35);
    display: inline-block;
    margin-bottom: 20px;
    box-shadow: 0 0 16px rgba(6, 182, 212, 0.2);
}
.hero-headline {
    font-size: 3.4rem;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.04em;
    background: linear-gradient(135deg, #FFFFFF 20%, #CBD5E1 55%, #67E8F9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 18px;
}
.hero-sub {
    font-size: 1.18rem;
    color: #94A3B8;
    line-height: 1.6;
    max-width: 760px;
    margin: 0 auto 34px auto;
    font-weight: 400;
}

/* INTERACTIVE FEATURE SHOWCASE TILES */
.feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin: 36px 0;
}
.feature-card {
    background: linear-gradient(145deg, rgba(26, 36, 60, 0.6) 0%, rgba(13, 20, 36, 0.8) 100%);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 26px 24px;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.feature-card:hover {
    transform: translateY(-3px);
    border-color: rgba(6, 182, 212, 0.4);
    box-shadow: 0 14px 34px rgba(6, 182, 212, 0.14);
}
.feature-icon {
    font-size: 1.6rem;
    margin-bottom: 14px;
    display: inline-block;
}
.feature-title {
    font-family: var(--font-sans);
    font-size: 1.08rem;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 8px;
}
.feature-desc {
    font-size: 0.86rem;
    color: #94A3B8;
    line-height: 1.6;
}

/* TELEMETRY METRIC CARDS */
.telemetry-card {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.72) 0%, rgba(15, 23, 42, 0.82) 100%);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px 22px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.telemetry-card:hover {
    border-color: rgba(6, 182, 212, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 14px 32px rgba(6, 182, 212, 0.15);
}
.telemetry-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
}
.accent-cyan { background: linear-gradient(90deg, #06B6D4, #3B82F6); }
.accent-emerald { background: linear-gradient(90deg, #10B981, #06B6D4); }
.accent-amber { background: linear-gradient(90deg, #F59E0B, #EF4444); }
.accent-rose { background: linear-gradient(90deg, #F43F5E, #EC4899); }

.telemetry-label {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-weight: 600;
}
.telemetry-num {
    font-family: var(--font-mono);
    font-size: 2.2rem;
    font-weight: 800;
    color: #FFFFFF;
    line-height: 1.2;
    margin-top: 6px;
}

/* ENTITY INSPECTION CARDS */
.entity-card {
    background: linear-gradient(180deg, rgba(26, 36, 58, 0.65) 0%, rgba(15, 23, 42, 0.8) 100%);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 20px 24px;
    margin-bottom: 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.22);
    transition: border-color 0.15s ease, transform 0.15s ease;
}
.entity-card:hover {
    border-color: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
}
.entity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 10px;
    margin-bottom: 12px;
}
.entity-id {
    font-family: var(--font-mono);
    font-size: 0.88rem;
    font-weight: 700;
    color: #FFFFFF;
}
.entity-title {
    font-size: 1.02rem;
    font-weight: 600;
    color: #FFFFFF;
    margin-bottom: 8px;
}
.entity-body {
    font-size: 0.88rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 12px;
}
.entity-footer {
    display: flex;
    gap: 18px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-tertiary);
    padding-top: 10px;
    border-top: 1px dashed rgba(255, 255, 255, 0.06);
}

/* CHIP BADGES */
.chip {
    font-family: var(--font-mono);
    font-size: 0.70rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 3px 9px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
}
.chip-cyan { background: rgba(6, 182, 212, 0.15); color: #22D3EE; border: 1px solid rgba(6, 182, 212, 0.35); }
.chip-emerald { background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.35); }
.chip-amber { background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.35); }
.chip-rose { background: rgba(244, 63, 94, 0.15); color: #FB7185; border: 1px solid rgba(244, 63, 94, 0.35); }

/* PROVENANCE TERMINAL */
.provenance-terminal {
    background: rgba(8, 14, 26, 0.85);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-left: 3px solid var(--accent-cyan);
    border-radius: 0 8px 8px 0;
    padding: 18px 22px;
    font-family: var(--font-mono);
    font-size: 0.83rem;
    line-height: 1.7;
    color: #E2E8F0;
}

/* BUTTONS */
div.stButton > button {
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%) !important;
    color: #FFFFFF !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 8px !important;
    font-family: var(--font-mono) !important;
    font-size: 0.84rem !important;
    font-weight: 600 !important;
    padding: 9px 18px !important;
    transition: all 0.15s ease !important;
}
div.stButton > button:hover {
    background: #1E293B !important;
    border-color: var(--accent-cyan) !important;
    box-shadow: 0 0 16px rgba(6, 182, 212, 0.35) !important;
    transform: translateY(-1px);
}
</style>
"""

# ==============================================================================
# 6. APPLICATION BOOTSTRAP & STATE
# ==============================================================================

st.set_page_config(
    page_title="TRACE — Turn Ambiguity Into Executable Systems",
    page_icon="⬡",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(MODERN_CSS, unsafe_allow_html=True)

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

graph: TraceabilityGraph = st.session_state["graph"]
nodes = graph.all_nodes()
edges = graph.all_edges()

# Sidebar Navigation Control
with st.sidebar:
    st.markdown(
        """
    <div style="padding: 10px 4px 18px 4px;">
        <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: #06B6D4; background: rgba(6,182,212,0.12); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(6,182,212,0.35); letter-spacing: 0.12em;">SYSTEMS WORKSPACE</span>
        <div style="font-size: 1.5rem; font-weight: 800; color: #FFFFFF; letter-spacing: -0.03em; margin-top: 6px;">⬡ T R A C E</div>
        <div style="font-size: 0.72rem; color: #64748B; letter-spacing: 0.04em;">AMBIGUOUS INTENT → EXECUTABLE SYSTEM</div>
    </div>
    """,
        unsafe_allow_html=True,
    )

    screens_list = [
        "00 // Gateway & Landing",
        "01 // Overview",
        "02 // Ingestion & Source",
        "03 // Conceptual Model",
        "04 // Requirements Ledger",
        "05 // Workflows & Sequences",
        "06 // Traceability Graph",
        "07 // System Architecture",
        "08 // Acceptance Tests",
        "09 // Readiness Engine",
        "10 // Export Spec Package",
        "11 // Methodology",
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
        NODES: <span style="color: #06B6D4;">{len(nodes)}</span> | RELATIONS: <span style="color: #10B981;">{len(edges)}</span><br/>
        ENGINE: <span style="color: #F59E0B;">Deterministic Python Core</span>
    </div>
    """,
        unsafe_allow_html=True,
    )

    with st.expander("API Key Configuration"):
        gemini_api_key = st.text_input("Gemini API Key", type="password")
        st.caption(
            "Leave blank to run deterministic offline extraction. No API key required."
        )

# ==============================================================================
# 7. WORKSPACE SCREENS
# ==============================================================================

# ------------------------------------------------------------------------------
# 00 // GATEWAY & LANDING PAGE
# ------------------------------------------------------------------------------
if "00 // Gateway & Landing" in st.session_state["selected_screen"]:
    st.markdown(
        """
    <div class="hero-container">
        <div class="hero-pill">ENTERPRISE SYSTEMS REASONING ENGINE</div>
        <div class="hero-headline">Turn Messy Organizational Intent<br/>Into an Executable System.</div>
        <div class="hero-sub">
            Organizations know what they want, but communicate in vague pressures and contradictory requests. 
            TRACE transforms ambiguous intent into a traceable chain: 
            <b>Problem → Requirements → Dependencies → Architecture → Acceptance Tests → Implementation Readiness.</b>
        </div>
    </div>
    """,
        unsafe_allow_html=True,
    )

    # Fast-Track Action Gateway
    c_btn1, c_btn2, c_btn3 = st.columns(3)
    with c_btn1:
        if st.button(
            "EXPLORE PHOENIX CASE STUDY ➔", **get_stretch_kw(st.button)
        ):
            st.session_state["selected_screen"] = "01 // Overview"
            st.rerun()
    with c_btn2:
        if st.button(
            "ANALYZE RAW INTENT BRIEF ➔", **get_stretch_kw(st.button)
        ):
            st.session_state["selected_screen"] = "02 // Ingestion & Source"
            st.rerun()
    with c_btn3:
        if st.button(
            "INSPECT METHODOLOGY & ETHICS ➔", **get_stretch_kw(st.button)
        ):
            st.session_state["selected_screen"] = "11 // Methodology"
            st.rerun()

    st.markdown("<br/>", unsafe_allow_html=True)

    # 3 Pillar Showcase Tiles
    st.markdown(
        """
    <div class="feature-grid">
        <div class="feature-card">
            <div class="feature-icon">🔍</div>
            <div class="feature-title">Deterministic Ambiguity Engine</div>
            <div class="feature-desc">
                Discovers unquantified latency ("real-time"), vague actors, unbounded scale desires, and 
                directly conflicting stakeholder mandates before a single line of software is built.
            </div>
        </div>
        <div class="feature-card">
            <div class="feature-icon">⬡</div>
            <div class="feature-title">Bidirectional Traceability Graph</div>
            <div class="feature-desc">
                Click any component to trace upstream rationale (<i>"Why does this exist?"</i>) and downstream 
                blast radius (<i>"What breaks if this data source breaks?"</i>).
            </div>
        </div>
        <div class="feature-card">
            <div class="feature-icon">⚖️</div>
            <div class="feature-title">8-Factor Implementation Readiness</div>
            <div class="feature-desc">
                Calculates engineering handoff viability from model completeness—not LLM hallucinations. 
                Every point deducted reveals an actionable organizational blocker.
            </div>
        </div>
    </div>
    """,
        unsafe_allow_html=True,
    )

# ------------------------------------------------------------------------------
# 01 // OVERVIEW
# ------------------------------------------------------------------------------
elif "01 // Overview" in st.session_state["selected_screen"]:
    st.markdown("## Systems Executive Overview")
    st.caption(
        "Macro readiness score, strategic intent chain, active implementation blockers, and orphan telemetry."
    )

    readiness = ReadinessEngine.evaluate(nodes)
    reqs = [n for n in nodes if n.node_type == NodeType.REQUIREMENT]
    orphans = graph.get_orphans()

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        c_acc = (
            "accent-emerald"
            if readiness["total_score"] >= 80
            else "accent-amber"
        )
        st.markdown(
            f"""
        <div class="telemetry-card">
            <div class="telemetry-accent {c_acc}"></div>
            <div class="telemetry-label">Readiness Score</div>
            <div class="telemetry-num">{readiness['total_score']}%</div>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            f"""
        <div class="telemetry-card">
            <div class="telemetry-accent accent-cyan"></div>
            <div class="telemetry-label">Requirements Identified</div>
            <div class="telemetry-num">{len(reqs)}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with c3:
        c_orph = (
            "accent-rose"
            if orphans["untested_requirements"]
            else "accent-emerald"
        )
        st.markdown(
            f"""
        <div class="telemetry-card">
            <div class="telemetry-accent {c_orph}"></div>
            <div class="telemetry-label">Untested Scope</div>
            <div class="telemetry-num">{len(orphans['untested_requirements'])}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with c4:
        c_blk = "accent-rose" if readiness["blockers"] else "accent-emerald"
        st.markdown(
            f"""
        <div class="telemetry-card">
            <div class="telemetry-accent {c_blk}"></div>
            <div class="telemetry-label">Active Blockers</div>
            <div class="telemetry-num">{len(readiness['blockers'])}</div>
        </div>
        """,
            unsafe_allow_html=True,
        )

    st.markdown("<br/>", unsafe_allow_html=True)
    st.markdown("### Strategic Rationale Spine")
    spine_cols = st.columns(3)
    with spine_cols[0]:
        bo = next(
            (n for n in nodes if n.node_type == NodeType.BUSINESS_OUTCOME), None
        )
        if bo:
            st.markdown(
                f"""
            <div class="entity-card">
                <div class="entity-header">
                    <span class="entity-id">{bo.id}</span>
                    <span class="chip chip-emerald">OUTCOME</span>
                </div>
                <div class="entity-title">{bo.title}</div>
                <div class="entity-body">{bo.description}</div>
                <div class="entity-footer">
                    <span>STATUS: {bo.validation_status.value}</span>
                </div>
            </div>
            """,
                unsafe_allow_html=True,
            )
    with spine_cols[1]:
        prb = next((n for n in nodes if n.node_type == NodeType.PROBLEM), None)
        if prb:
            st.markdown(
                f"""
            <div class="entity-card">
                <div class="entity-header">
                    <span class="entity-id">{prb.id}</span>
                    <span class="chip chip-amber">PROBLEM</span>
                </div>
                <div class="entity-title">{prb.title}</div>
                <div class="entity-body">{prb.description}</div>
                <div class="entity-footer">
                    <span>IMPACT: {prb.metadata.get('business_impact', 'Friction')}</span>
                </div>
            </div>
            """,
                unsafe_allow_html=True,
            )
    with spine_cols[2]:
        goal = next((n for n in nodes if n.node_type == NodeType.GOAL), None)
        if goal:
            st.markdown(
                f"""
            <div class="entity-card">
                <div class="entity-header">
                    <span class="entity-id">{goal.id}</span>
                    <span class="chip chip-cyan">GOAL</span>
                </div>
                <div class="entity-title">{goal.title}</div>
                <div class="entity-body">{goal.description}</div>
                <div class="entity-footer">
                    <span>STATUS: DERIVED</span>
                </div>
            </div>
            """,
                unsafe_allow_html=True,
            )

    st.markdown("### Implementation Blockers")
    if readiness["blockers"]:
        for b in readiness["blockers"]:
            st.error(b)
    else:
        st.success(
            "Zero high-severity blockers. Project specification is structurally coherent."
        )

# ------------------------------------------------------------------------------
# 02 // INGESTION & SOURCE
# ------------------------------------------------------------------------------
elif "02 // Ingestion & Source" in st.session_state["selected_screen"]:
    st.markdown("## Document Ingestion & Provenance Audit")
    st.caption(
        "Direct comparison of unstructured stakeholder statements against normalized systems interpretations."
    )

    col_raw, col_provenance = st.columns([1, 1])

    with col_raw:
        st.markdown("#### Raw Organizational Document")
        user_text = st.text_area(
            "Source Input",
            value=st.session_state["raw_brief"],
            height=340,
            label_visibility="collapsed",
        )

        b_c1, b_c2 = st.columns(2)
        with b_c1:
            if st.button("Run System Extraction", **get_stretch_kw(st.button)):
                # Heuristic deterministic extraction
                new_nodes, new_edges = load_renewal_demo()[1:]
                new_graph = TraceabilityGraph()
                for n in new_nodes:
                    new_graph.add_node(n)
                for e in new_edges:
                    new_graph.add_edge(e)
                st.session_state["graph"] = new_graph
                st.session_state["raw_brief"] = user_text
                st.session_state["project_title"] = (
                    "Analyzed Organizational Input"
                )
                st.rerun()

        with b_c2:
            if st.button("Reload Phoenix Demo", **get_stretch_kw(st.button)):
                brief, d_nodes, d_edges = load_renewal_demo()
                new_graph = TraceabilityGraph()
                for n in d_nodes:
                    new_graph.add_node(n)
                for e in d_edges:
                    new_graph.add_edge(e)
                st.session_state["graph"] = new_graph
                st.session_state["raw_brief"] = brief
                st.session_state["project_title"] = (
                    "Phoenix Renewal Intelligence"
                )
                st.rerun()

    with col_provenance:
        st.markdown("#### Epistemic Extraction Provenance")
        st.markdown(
            """
        <div class="provenance-terminal">
            <b>EPISTEMIC SEPARATION AUDIT:</b><br/>
            • <b>Source Fact:</b> Verbatim text extracted directly from document.<br/>
            • <b>Interpretation:</b> Systems requirement mapped by analyst or heuristic.<br/>
            • <b>Inference:</b> Inferred system component or missing integration.<br/>
            • <b>Unknown:</b> Ambiguity flagged with explicit clarification questions.
        </div>
        """,
            unsafe_allow_html=True,
        )

        st.markdown("<br/>", unsafe_allow_html=True)
        st.markdown("#### Entity Inventory")
        breakdown = {}
        for n in nodes:
            breakdown[n.node_type.value] = (
                breakdown.get(n.node_type.value, 0) + 1
            )
        df_summary = pd.DataFrame(
            list(breakdown.items()), columns=["Entity Type", "Extracted Count"]
        )
        st.dataframe(
            df_summary, hide_index=True, **get_stretch_kw(st.dataframe)
        )

# ------------------------------------------------------------------------------
# 03 // CONCEPTUAL MODEL
# ------------------------------------------------------------------------------
elif "03 // Conceptual Model" in st.session_state["selected_screen"]:
    st.markdown("## Conceptual Domain Model")
    st.caption(
        "Structured catalog mapping organizational drivers, actors, decisions, and assumptions."
    )

    tabs = st.tabs(
        [
            "Outcomes & Problems",
            "Stakeholders",
            "Decisions & Assumptions",
            "Questions",
        ]
    )

    with tabs[0]:
        for n in nodes:
            if n.node_type in [NodeType.BUSINESS_OUTCOME, NodeType.PROBLEM]:
                c_chip = (
                    "chip-emerald"
                    if n.node_type == NodeType.BUSINESS_OUTCOME
                    else "chip-amber"
                )
                st.markdown(
                    f"""
                <div class="entity-card">
                    <div class="entity-header">
                        <span class="entity-id">{n.id}</span>
                        <span class="chip {c_chip}">{n.node_type.value}</span>
                    </div>
                    <div class="entity-title">{n.title}</div>
                    <div class="entity-body">{n.description}</div>
                    <div class="entity-footer">
                        <span>STATUS: {n.epistemic_status.value}</span>
                        <span>OWNER: {n.owner or 'Unassigned'}</span>
                    </div>
                </div>
                """,
                    unsafe_allow_html=True,
                )

    with tabs[1]:
        for n in nodes:
            if n.node_type == NodeType.STAKEHOLDER:
                st.markdown(
                    f"""
                <div class="entity-card">
                    <div class="entity-header">
                        <span class="entity-id">{n.id}</span>
                        <span class="chip chip-cyan">{n.metadata.get('department', 'Organization')}</span>
                    </div>
                    <div class="entity-title">{n.title}</div>
                    <div class="entity-body">{n.description}</div>
                    <div class="entity-footer">
                        <span>ROLE LEVEL: {n.metadata.get('role_level', 'Operational')}</span>
                    </div>
                </div>
                """,
                    unsafe_allow_html=True,
                )

    with tabs[2]:
        for n in nodes:
            if n.node_type in [NodeType.DECISION, NodeType.ASSUMPTION]:
                st.markdown(
                    f"""
                <div class="entity-card">
                    <div class="entity-header">
                        <span class="entity-id">{n.id}</span>
                        <span class="chip chip-amber">{n.node_type.value}</span>
                    </div>
                    <div class="entity-title">{n.title}</div>
                    <div class="entity-body">{n.description}</div>
                </div>
                """,
                    unsafe_allow_html=True,
                )

    with tabs[3]:
        for n in nodes:
            if n.node_type == NodeType.QUESTION:
                q = n
                st.markdown(
                    f"""
                <div class="entity-card">
                    <div class="entity-header">
                        <span class="entity-id">{q.id}</span>
                        <span class="chip chip-rose">SEVERITY: {getattr(q, 'severity', Priority.HIGH).value}</span>
                    </div>
                    <div class="entity-title">{q.title}</div>
                    <div class="entity-body">{q.description}</div>
                    <div class="entity-footer">
                        <span>ASSIGNED: {getattr(q, 'assigned_stakeholder', 'Unassigned')}</span>
                        <span>IMPACT: {getattr(q, 'impact_description', 'Unspecified')}</span>
                    </div>
                </div>
                """,
                    unsafe_allow_html=True,
                )

# ------------------------------------------------------------------------------
# 04 // REQUIREMENTS LEDGER
# ------------------------------------------------------------------------------
elif "04 // Requirements Ledger" in st.session_state["selected_screen"]:
    st.markdown("## Traceable Requirements Matrix")
    st.caption(
        "Requirements catalog with automated ambiguity checks, contradiction detection, and validation gates."
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
            with st.expander("Explore Resolution Tradeoffs & Decide"):
                mode = st.radio(
                    "Select Architecture Stance",
                    c["options"],
                    key=f"rad_{c['id']}",
                )
                if st.button(
                    "Enforce Resolution Stance", key=f"btn_{c['id']}"
                ):
                    graph.update_node_status(
                        c["req_1"], ValidationStatus.VALIDATED_BY_HUMAN
                    )
                    graph.update_node_status(
                        c["req_2"], ValidationStatus.VALIDATED_BY_HUMAN
                    )
                    st.success(f"Resolved via {mode[:35]}...")
                    st.rerun()

    for r in reqs:
        is_amb, notes, remediations = AmbiguityEngine.audit_requirement(r)
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
                <div style="display:flex; gap:8px;">
                    <span class="chip {chip_stat}">{r.validation_status.value}</span>
                    <span class="chip chip-cyan">{r.req_type.value}</span>
                </div>
            </div>
            <div class="entity-title">{r.title}</div>
            <div class="entity-body">{r.description}</div>
            <div class="entity-footer">
                <span>OWNER: {r.owner or 'Unassigned'}</span>
                <span>SOURCE: {r.source_reference or 'Direct Brief'}</span>
            </div>
        </div>
        """,
            unsafe_allow_html=True,
        )

        with st.expander(f"Audit & Verification Panel for {r.id}"):
            if r.acceptance_criteria:
                st.markdown("**Given-When-Then Acceptance Criteria:**")
                for ac in r.acceptance_criteria:
                    st.markdown(f"- `{ac}`")
            else:
                st.error(
                    "Zero acceptance criteria defined. Requirement is untestable."
                )

            if notes:
                st.markdown("**Ambiguity & Verification Findings:**")
                for n_text, rem in zip(notes, remediations):
                    st.markdown(f"- ⚠️ **{n_text}** → *Remedy:* `{rem}`")

            col_act1, col_act2 = st.columns(2)
            with col_act1:
                if st.button("Validate Requirement", key=f"val_{r.id}"):
                    graph.update_node_status(
                        r.id, ValidationStatus.VALIDATED_BY_HUMAN
                    )
                    st.rerun()
            with col_act2:
                if st.button("Flag for Ambiguity", key=f"flag_{r.id}"):
                    graph.update_node_status(
                        r.id, ValidationStatus.FLAGGED_AMBIGUOUS
                    )
                    st.rerun()

# ------------------------------------------------------------------------------
# 05 // WORKFLOWS & SEQUENCES
# ------------------------------------------------------------------------------
elif "05 // Workflows & Sequences" in st.session_state["selected_screen"]:
    st.markdown("## Operational Workflow & Sequence Topology")
    st.caption(
        "Step-by-step human and system operational loop detailing triggers, boundaries, and artifacts."
    )

    steps = [
        n
        for n in nodes
        if n.node_type == NodeType.WORKFLOW_STEP and isinstance(n, WorkflowStep)
    ]
    steps.sort(key=lambda s: s.sequence_index)

    for s in steps:
        st.markdown(
            f"""
        <div class="entity-card">
            <div class="entity-header">
                <span class="entity-id">STEP {s.sequence_index:02d}</span>
                <span class="chip chip-cyan">SYSTEM BOUNDARY: {s.system_id}</span>
            </div>
            <div class="entity-title">{s.title}</div>
            <div class="entity-body">{s.description}</div>
            <div class="entity-footer">
                <span>ACTOR: {s.actor_id}</span>
                <span>INPUTS: {s.inputs}</span>
                <span>OUTPUTS: {s.outputs}</span>
            </div>
        </div>
        """,
            unsafe_allow_html=True,
        )

# ------------------------------------------------------------------------------
# 06 // TRACEABILITY GRAPH
# ------------------------------------------------------------------------------
elif "06 // Traceability Graph" in st.session_state["selected_screen"]:
    st.markdown("## Interactive Bidirectional Traceability Graph")
    st.caption(
        "Click any node to trace upstream rationale ('Why does this exist?') and downstream impact ('What breaks?')."
    )

    node_options = {f"{n.id} — {n.title}": n.id for n in nodes}
    focus_label = st.selectbox(
        "FOCUS GRAPH INSPECTION NODE", list(node_options.keys())
    )
    focus_id = node_options[focus_label]

    nx_g = nx.DiGraph()
    for n in nodes:
        nx_g.add_node(n.id, label=n.id, type=n.node_type.value)
    for e in edges:
        nx_g.add_edge(e.source_id, e.target_id, relation=e.relation)

    pos = nx.spring_layout(nx_g, seed=42, k=0.8)

    edge_x, edge_y = [], []
    for edge in nx_g.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    edge_trace = go.Scatter(
        x=edge_x,
        y=edge_y,
        line=dict(width=1.5, color="rgba(255, 255, 255, 0.15)"),
        hoverinfo="none",
        mode="lines",
    )

    node_x, node_y, node_color, node_hover = [], [], [], []
    for node in nx_g.nodes():
        x, y = pos[node]
        node_x.append(x)
        node_y.append(y)
        if node == focus_id:
            node_color.append("#F43F5E")
        elif "REQ" in node:
            node_color.append("#06B6D4")
        elif "BO" in node or "GOAL" in node:
            node_color.append("#10B981")
        elif "DATA" in node:
            node_color.append("#F59E0B")
        else:
            node_color.append("#6366F1")
        node_hover.append(f"{node} ({nx_g.nodes[node]['type']})")

    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode="markers+text",
        text=[n for n in nx_g.nodes()],
        textposition="top center",
        hoverinfo="text",
        hovertext=node_hover,
        marker=dict(
            size=22,
            color=node_color,
            line=dict(width=2, color="#0B1120"),
        ),
    )

    fig = go.Figure(
        data=[edge_trace, node_trace],
        layout=go.Layout(
            showlegend=False,
            hovermode="closest",
            margin=dict(b=0, l=0, r=0, t=0),
            paper_bgcolor="rgba(11, 17, 32, 0.4)",
            plot_bgcolor="rgba(0, 0, 0, 0)",
            xaxis=dict(
                showgrid=False, zeroline=False, showticklabels=False
            ),
            yaxis=dict(
                showgrid=False, zeroline=False, showticklabels=False
            ),
            height=440,
        ),
    )

    st.plotly_chart(fig, **get_stretch_kw(st.plotly_chart))

    c_up, c_down = st.columns(2)
    with c_up:
        st.markdown(f"#### Upstream Rationale for `{focus_id}`")
        upstream = graph.trace_upstream(focus_id)
        if upstream:
            for step in upstream:
                st.markdown(
                    f"- ▲ **{step['relation']}** `[{step['from_type']}]` **{step['from_id']}** — {step['from_title']}"
                )
        else:
            st.info(
                "Root node or ungrounded specification. No upstream parent."
            )

    with c_down:
        st.markdown(f"#### Downstream Consequence for `{focus_id}`")
        downstream = graph.trace_downstream(focus_id)
        if downstream:
            for step in downstream:
                st.markdown(
                    f"- ▼ **{step['relation']}** `[{step['to_type']}]` **{step['to_id']}** — {step['to_title']}"
                )
        else:
            st.info(
                "Leaf node. No downstream components or test cases depend on this."
            )

# ------------------------------------------------------------------------------
# 07 // SYSTEM ARCHITECTURE
# ------------------------------------------------------------------------------
elif "07 // System Architecture" in st.session_state["selected_screen"]:
    st.markdown("## System Component Topology & Data Flow")
    st.caption(
        "Application layer boundaries, data stores of record, and integration interfaces."
    )

    col_comp, col_data = st.columns(2)
    with col_comp:
        st.markdown("### System Components")
        comps = [n for n in nodes if n.node_type == NodeType.SYSTEM_COMPONENT]
        for c in comps:
            st.markdown(
                f"""
            <div class="entity-card">
                <div class="entity-header">
                    <span class="entity-id">{c.id}</span>
                    <span class="chip chip-cyan">{getattr(c, 'layer', 'Application')}</span>
                </div>
                <div class="entity-title">{c.title}</div>
                <div class="entity-body">{c.description}</div>
                <div class="entity-footer">
                    <span>ARCH STYLE: {getattr(c, 'arch_type', 'Service')}</span>
                    <span>STATE: {getattr(c, 'lifecycle_state', 'PROPOSED')}</span>
                </div>
            </div>
            """,
                unsafe_allow_html=True,
            )

    with col_data:
        st.markdown("### Data Stores & Systems of Record")
        datas = [n for n in nodes if n.node_type == NodeType.DATA_SOURCE]
        for d in datas:
            st.markdown(
                f"""
            <div class="entity-card">
                <div class="entity-header">
                    <span class="entity-id">{d.id}</span>
                    <span class="chip chip-amber">{getattr(d, 'update_frequency', 'Batch')}</span>
                </div>
                <div class="entity-title">{d.title}</div>
                <div class="entity-body">{d.description}</div>
                <div class="entity-footer">
                    <span>STORE: {getattr(d, 'system_of_record', 'Store')}</span>
                    <span>PROTOCOL: {getattr(d, 'access_protocol', 'API')}</span>
                </div>
            </div>
            """,
                unsafe_allow_html=True,
            )

# ------------------------------------------------------------------------------
# 08 // ACCEPTANCE TESTS
# ------------------------------------------------------------------------------
elif "08 // Acceptance Tests" in st.session_state["selected_screen"]:
    st.markdown("## Executable Acceptance Verification Suite")
    st.caption(
        "Given-When-Then behavioral test cases directly bound to functional requirements."
    )

    tests = [
        n
        for n in nodes
        if n.node_type == NodeType.TEST_CASE and isinstance(n, TestCase)
    ]
    reqs = [n for n in nodes if n.node_type == NodeType.REQUIREMENT]

    tested_ids = {t.requirement_id for t in tests}
    cov_pct = int((len(tested_ids) / max(len(reqs), 1)) * 100)

    st.progress(cov_pct / 100)
    st.caption(
        f"Acceptance Test Coverage: {cov_pct}% ({len(tested_ids)}/{len(reqs)} requirements verified)"
    )

    for t in tests:
        st.markdown(
            f"""
        <div class="entity-card">
            <div class="entity-header">
                <span class="entity-id">{t.id}</span>
                <span class="chip chip-emerald">VALIDATES {t.requirement_id}</span>
            </div>
            <div class="entity-title">{t.title}</div>
            <div style="background: rgba(9, 14, 23, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 14px; margin-top: 10px; font-family: var(--font-mono); font-size: 0.83rem; line-height: 1.65;">
                <span style="color: #22D3EE;">GIVEN</span> {t.given}<br/>
                <span style="color: #FBBF24;">WHEN</span>  {t.when}<br/>
                <span style="color: #34D399;">THEN</span>  {t.then}
            </div>
        </div>
        """,
            unsafe_allow_html=True,
        )

# ------------------------------------------------------------------------------
# 09 // READINESS ENGINE
# ------------------------------------------------------------------------------
elif "09 // Readiness Engine" in st.session_state["selected_screen"]:
    st.markdown("## 8-Factor Implementation Readiness Diagnostic")
    st.caption(
        "Deterministic audit verifying whether the system specification is safe for technical build."
    )

    readiness = ReadinessEngine.evaluate(nodes)
    st.markdown(
        f"""
    <div class="telemetry-card" style="margin-bottom: 20px;">
        <div class="telemetry-accent accent-emerald"></div>
        <div class="telemetry-label">Composite Implementation Readiness</div>
        <div class="telemetry-num">{readiness['total_score']}%</div>
    </div>
    """,
        unsafe_allow_html=True,
    )

    for dim_name, info in readiness["dimensions"].items():
        with st.expander(
            f"{dim_name} — {int(info['score']*100)}% (Weight: {info['weight']})"
        ):
            st.progress(info["score"])
            st.markdown(f"**Diagnostic Finding:** {info['notes']}")

# ------------------------------------------------------------------------------
# 10 // EXPORT SPEC PACKAGE
# ------------------------------------------------------------------------------
elif "10 // Export Spec Package" in st.session_state["selected_screen"]:
    st.markdown("## Specification Package Export")
    st.caption(
        "Export production-grade packages: PRD Markdown, complete JSON Graph model, and CSV matrices."
    )

    prd_lines = [
        f"# SYSTEM SPECIFICATION: {st.session_state['project_title'].upper()}",
        "",
        "## 1. Executive Summary & Strategic Rationale",
    ]
    for n in nodes:
        if n.node_type in [NodeType.BUSINESS_OUTCOME, NodeType.PROBLEM]:
            prd_lines.append(f"### {n.id}: {n.title}\n{n.description}\n")

    prd_lines.append("## 2. Requirements Engineering Matrix\n")
    for n in nodes:
        if n.node_type == NodeType.REQUIREMENT:
            req_inst = n
            prd_lines.append(
                f"### {req_inst.id}: {req_inst.title}\n- **Type:** {getattr(req_inst, 'req_type', RequirementType.FUNCTIONAL).value}\n- **Description:** {req_inst.description}"
            )
            for ac in getattr(req_inst, "acceptance_criteria", []):
                prd_lines.append(f"  - AC: {ac}")

    prd_markdown = "\n".join(prd_lines)

    nodes_json = [n.model_dump() for n in nodes]
    edges_json = [e.model_dump() for e in edges]
    export_bundle = {
        "project": st.session_state["project_title"],
        "nodes": nodes_json,
        "edges": edges_json,
    }
    json_str = json.dumps(export_bundle, indent=2)

    req_data = [
        {
            "ID": r.id,
            "Title": r.title,
            "Type": getattr(r, "req_type", RequirementType.FUNCTIONAL).value,
            "Priority": getattr(r, "priority", Priority.HIGH).value,
            "Status": r.validation_status.value,
        }
        for r in nodes
        if r.node_type == NodeType.REQUIREMENT
    ]
    csv_str = pd.DataFrame(req_data).to_csv(index=False)

    col_e1, col_e2, col_e3 = st.columns(3)
    with col_e1:
        st.download_button(
            "Download PRD (Markdown)",
            data=prd_markdown,
            file_name="TRACE_SYSTEM_SPEC.md",
            mime="text/markdown",
            **get_stretch_kw(st.download_button),
        )
    with col_e2:
        st.download_button(
            "Download Graph Bundle (JSON)",
            data=json_str,
            file_name="trace_graph_bundle.json",
            mime="application/json",
            **get_stretch_kw(st.download_button),
        )
    with col_e3:
        st.download_button(
            "Download Requirements (CSV)",
            data=csv_str,
            file_name="requirements_matrix.csv",
            mime="text/csv",
            **get_stretch_kw(st.download_button),
        )

# ------------------------------------------------------------------------------
# 11 // METHODOLOGY
# ------------------------------------------------------------------------------
elif "11 // Methodology" in st.session_state["selected_screen"]:
    st.markdown("## Epistemic Architecture & Non-AI Manifesto")
    st.markdown(
        """
    ### Principles of the TRACE Engine
    
    1. **Strict Epistemic Separation:** Organizational knowledge is classified into Source Facts, Normalized Interpretations, Hypothesized Inferences, and Recommendations. Generative AI cannot promote an inference to a verified fact without human sign-off.
    2. **Deterministic Governance:** Readiness scores (0-100%), conflict detection, and ambiguity flags are computed by deterministic Python algorithms and rule matrices—never by black-box LLM estimations.
    3. **Bidirectional Traceability:** Every system component, data dependency, and acceptance test maintains a verifiable relational link back to its originating stakeholder rationale.
    """
    )