"""Comprehensive Test Suite for TRACE Persistence and Automated Ingestion."""

from __future__ import annotations

import json
from unittest.mock import MagicMock
import pytest

from trace_storage import TraceStorage
from trace_ingest import ingest_openapi, ingest_terraform, ingest_container_manifest


@pytest.fixture
def storage() -> TraceStorage:
    """Provide a fresh in-memory SQLite storage engine."""
    return TraceStorage(":memory:")


def test_project_crud(storage: TraceStorage):
    """Verify project lifecycle operations."""
    p = storage.create_project("proj-alpha", "Alpha Architecture", "First test project", {"env": "prod"})
    assert p["project_id"] == "proj-alpha"
    assert p["name"] == "Alpha Architecture"

    fetched = storage.get_project("proj-alpha")
    assert fetched is not None
    assert fetched["name"] == "Alpha Architecture"
    assert fetched["node_count"] == 0
    assert fetched["edge_count"] == 0

    all_projs = storage.list_projects()
    assert any(x["project_id"] == "proj-alpha" for x in all_projs)

    deleted = storage.delete_project("proj-alpha")
    assert deleted is True
    assert storage.get_project("proj-alpha") is None


def test_node_and_edge_persistence(storage: TraceStorage):
    """Verify incremental node and edge saves, updates, and cascading deletes."""
    storage.create_project("proj-beta", "Beta Architecture")

    # Save node
    n1 = storage.save_node("proj-beta", {
        "id": "COMP-GATEWAY",
        "node_type": "SYSTEM_COMPONENT",
        "title": "API Gateway",
        "layer": "Edge Layer",
        "confidence": 0.95,
    })
    assert n1["id"] == "COMP-GATEWAY"
    assert n1["layer"] == "Edge Layer"

    # Save second node
    storage.save_node("proj-beta", {
        "id": "DATA-USERS",
        "node_type": "DATA_SOURCE",
        "title": "Postgres User DB",
        "layer": "Data Layer",
    })

    # Save edge
    edge = storage.save_edge("proj-beta", {
        "from_id": "COMP-GATEWAY",
        "to_id": "DATA-USERS",
        "relation_type": "DEPENDS_ON",
    })
    assert edge["source_id"] == "COMP-GATEWAY"
    assert edge["target_id"] == "DATA-USERS"

    graph_data = storage.load_graph_data("proj-beta")
    assert graph_data["total_nodes"] == 2
    assert graph_data["total_edges"] == 1

    # Deleting node should cascade remove incident edge
    storage.delete_node("proj-beta", "DATA-USERS")
    after_del = storage.load_graph_data("proj-beta")
    assert after_del["total_nodes"] == 1
    assert after_del["total_edges"] == 0


def test_persistent_blast_radius(storage: TraceStorage):
    """Verify blast radius graph traversal on persistent multi-node topology."""
    storage.create_project("proj-gamma", "Gamma Blast Testing")

    # Topology: REQ-01 -> COMP-WEB -> COMP-CORE -> DATA-REDIS
    storage.save_node("proj-gamma", {"id": "REQ-01", "node_type": "REQUIREMENT", "title": "Realtime Latency SLA"})
    storage.save_node("proj-gamma", {"id": "COMP-WEB", "node_type": "SYSTEM_COMPONENT", "title": "Web Frontend"})
    storage.save_node("proj-gamma", {"id": "COMP-CORE", "node_type": "SYSTEM_COMPONENT", "title": "Core Service"})
    storage.save_node("proj-gamma", {"id": "DATA-REDIS", "node_type": "DATA_SOURCE", "title": "Redis Cache"})

    storage.save_edge("proj-gamma", {"from_id": "REQ-01", "to_id": "COMP-WEB", "relation_type": "IMPLEMENTED_BY"})
    storage.save_edge("proj-gamma", {"from_id": "COMP-WEB", "to_id": "COMP-CORE", "relation_type": "DEPENDS_ON"})
    storage.save_edge("proj-gamma", {"from_id": "COMP-CORE", "to_id": "DATA-REDIS", "relation_type": "DEPENDS_ON"})

    # When DATA-REDIS fails, predecessor COMP-CORE and transitive upstream nodes are impacted
    blast = storage.compute_project_blast_radius("proj-gamma", ["DATA-REDIS"])
    assert "COMP-CORE" in blast["affected_node_ids"]
    assert blast["project_id"] == "proj-gamma"


def test_snapshots(storage: TraceStorage):
    """Verify versioned point-in-time snapshots."""
    storage.create_project("proj-snap", "Snapshot Test")
    storage.save_node("proj-snap", {"id": "NODE-1", "node_type": "SYSTEM_COMPONENT", "title": "Component 1"})
    storage.save_node("proj-snap", {"id": "NODE-2", "node_type": "SYSTEM_COMPONENT", "title": "Component 2"})
    storage.save_edge("proj-snap", {"from_id": "NODE-1", "to_id": "NODE-2", "relation_type": "DEPENDS_ON"})

    snap1 = storage.create_snapshot("proj-snap", "v1 Release")
    assert snap1["version"] == 1
    assert snap1["nodes_count"] == 2
    assert snap1["edges_count"] == 1

    storage.save_node("proj-snap", {"id": "NODE-3", "node_type": "SYSTEM_COMPONENT", "title": "Component 3"})
    snap2 = storage.create_snapshot("proj-snap", "v2 Update")
    assert snap2["version"] == 2
    assert snap2["nodes_count"] == 3

    history = storage.list_snapshots("proj-snap")
    assert len(history) == 2
    assert history[0]["version"] == 2
    assert history[1]["version"] == 1


def test_openapi_ingestion(storage: TraceStorage):
    """Verify parsing OpenAPI 3.0 specification into components, schemas, and security requirements."""
    spec = {
        "openapi": "3.0.0",
        "info": {"title": "Clinical EHR Gateway", "version": "1.4.0"},
        "paths": {
            "/patients/{id}/vitals": {
                "get": {
                    "operationId": "getPatientVitals",
                    "summary": "Retrieve continuous patient vitals",
                    "tags": ["VitalsTelemetry"],
                    "security": [{"BearerAuth": []}],
                    "responses": {
                        "200": {
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/VitalsRecord"}
                                }
                            }
                        }
                    },
                }
            }
        },
    }

    summary = ingest_openapi(spec, "proj-ehr", storage)
    assert summary.nodes_created >= 4  # Endpoint, Service, Schema, Security Policy
    assert summary.edges_created >= 3

    graph = storage.load_graph_data("proj-ehr")
    node_ids = {n["id"] for n in graph["nodes"]}
    assert "COMP-API-getPatientVitals" in node_ids
    assert "COMP-SVC-VitalsTelemetry" in node_ids
    assert "DATA-SCHEMA-VitalsRecord" in node_ids
    assert "REQ-SEC-BearerAuth" in node_ids


def test_terraform_ingestion(storage: TraceStorage):
    """Verify parsing Terraform plan infrastructure into system components and dependencies."""
    tf_data = {
        "values": {
            "root_module": {
                "resources": [
                    {
                        "type": "aws_alb",
                        "name": "ingress_lb",
                        "address": "aws_alb.ingress_lb",
                        "depends_on": ["aws_ecs_service.app_core"],
                    },
                    {
                        "type": "aws_ecs_service",
                        "name": "app_core",
                        "address": "aws_ecs_service.app_core",
                        "depends_on": ["aws_rds_cluster.aurora_db"],
                    },
                    {
                        "type": "aws_rds_cluster",
                        "name": "aurora_db",
                        "address": "aws_rds_cluster.aurora_db",
                    },
                ]
            }
        }
    }

    summary = ingest_terraform(tf_data, "proj-cloud", storage)
    assert summary.nodes_created == 3
    assert summary.edges_created == 2

    graph = storage.load_graph_data("proj-cloud")
    nodes_by_id = {n["id"]: n for n in graph["nodes"]}
    assert nodes_by_id["COMP-TF-aws-alb-ingress-lb"]["layer"] == "Network & Ingress"
    assert nodes_by_id["COMP-TF-aws-rds-cluster-aurora-db"]["layer"] == "Data Layer"

    blast = storage.compute_project_blast_radius("proj-cloud", ["COMP-TF-aws-rds-cluster-aurora-db"])
    assert "COMP-TF-aws-ecs-service-app-core" in blast["affected_node_ids"]


def test_container_manifest_ingestion(storage: TraceStorage):
    """Verify Docker Compose and Kubernetes manifest ingestion."""
    # 1. Docker Compose
    compose_yaml = """
    version: '3.8'
    services:
      frontend:
        image: custom-ui:v1
        depends_on:
          - backend
      backend:
        image: custom-api:v1
        depends_on:
          - postgres
      postgres:
        image: postgres:15
    """
    summary_compose = ingest_container_manifest(compose_yaml, "proj-compose", storage)
    assert summary_compose.nodes_created == 3
    assert summary_compose.edges_created == 2

    # 2. Kubernetes Multi-Document
    k8s_yaml = """
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: payments-processor
      namespace: prod
      labels:
        app: payments
    spec:
      template:
        metadata:
          labels:
            app: payments
    ---
    apiVersion: v1
    kind: Service
    metadata:
      name: payments-svc
      namespace: prod
    spec:
      selector:
        app: payments
    """
    summary_k8s = ingest_container_manifest(k8s_yaml, "proj-k8s", storage)
    assert summary_k8s.nodes_created == 2
    assert summary_k8s.edges_created == 1  # Service -> Deployment via selector

    graph = storage.load_graph_data("proj-k8s")
    assert graph["total_nodes"] == 2
    assert graph["total_edges"] == 1


def test_api_routes_integration():
    """Verify backend_api integration with project persistence and ingestion endpoints."""
    from backend_api import STORAGE, TraceAPIHandler

    # Create dummy project via storage
    p = STORAGE.create_project("test-api-proj", "API Test Architecture")
    STORAGE.save_node("test-api-proj", {"id": "N-1", "title": "Node 1"})
    STORAGE.save_node("test-api-proj", {"id": "N-2", "title": "Node 2"})
    STORAGE.save_edge("test-api-proj", {"from_id": "N-1", "to_id": "N-2", "relation_type": "DEPENDS_ON"})

    graph = STORAGE.load_graph_data("test-api-proj")
    assert graph["total_nodes"] == 2
    assert graph["total_edges"] == 1

    # Cleanup
    STORAGE.delete_project("test-api-proj")
    assert STORAGE.get_project("test-api-proj") is None
