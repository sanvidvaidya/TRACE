"""TRACE Automated Architecture Ingestion Engine.

Parses OpenAPI 3.x / Swagger specifications, Terraform infrastructure definitions,
and Docker Compose / Kubernetes container manifests directly into TRACE components,
data sources, security requirements, and blast-radius dependency edges.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
import re
from typing import Any, Dict, List, Optional, Set, Tuple

import yaml

from trace_storage import TraceStorage


@dataclass
class IngestionSummary:
    """Summary of architecture nodes and edges ingested into a project."""

    project_id: str
    source_type: str
    title: str
    nodes_created: int
    edges_created: int
    node_ids: List[str]
    edge_ids: List[str]
    details: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _safe_id(prefix: str, raw: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\-]", "-", raw).strip("-")
    cleaned = re.sub(r"-+", "-", cleaned)
    return f"{prefix}-{cleaned}"[:64]


def _parse_spec_input(spec_input: str | dict) -> dict:
    if isinstance(spec_input, dict):
        return spec_input
    if not isinstance(spec_input, str):
        raise ValueError("Specification must be a JSON/YAML string or dictionary")

    # Try JSON first, then YAML
    try:
        return json.loads(spec_input)
    except Exception:
        try:
            parsed = yaml.safe_load(spec_input)
            if isinstance(parsed, dict):
                return parsed
            raise ValueError("Parsed YAML document root must be a mapping/object")
        except Exception as e:
            raise ValueError(f"Failed to parse specification as JSON or YAML: {str(e)}")


def ingest_openapi(
    spec_input: str | dict,
    project_id: str,
    storage: Optional[TraceStorage] = None,
) -> IngestionSummary:
    """Ingest OpenAPI 3.x / Swagger 2.0 specification into a TRACE project."""
    spec = _parse_spec_input(spec_input)
    info = spec.get("info", {})
    api_title = info.get("title", "OpenAPI Architecture")
    version = info.get("version", "1.0.0")

    nodes_to_save: List[Dict[str, Any]] = []
    edges_to_save: List[Dict[str, Any]] = []
    schemas_seen: Set[str] = set()
    services_seen: Set[str] = set()

    paths = spec.get("paths", {})

    for path_str, path_item in paths.items():
        if not isinstance(path_item, dict):
            continue

        for method in ("get", "post", "put", "delete", "patch", "options", "head"):
            operation = path_item.get(method)
            if not isinstance(operation, dict):
                continue

            op_id = operation.get("operationId") or f"{method.upper()}-{path_str}"
            node_id = _safe_id("COMP-API", op_id)
            summary = operation.get("summary") or operation.get("description") or f"{method.upper()} {path_str}"
            tags = operation.get("tags", [])

            # 1. API Endpoint SystemComponent
            nodes_to_save.append({
                "id": node_id,
                "node_type": "SYSTEM_COMPONENT",
                "title": f"{method.upper()} {path_str}",
                "description": summary,
                "layer": "API / Interface",
                "arch_type": "REST Endpoint",
                "epistemic_status": "FACT",
                "validation_status": "VALIDATED_BY_HUMAN",
                "tags": tags,
                "metadata": {
                    "method": method.upper(),
                    "path": path_str,
                    "operation_id": op_id,
                },
            })

            # 2. Tag / Microservice Component
            for tag in tags:
                tag_id = _safe_id("COMP-SVC", tag)
                if tag_id not in services_seen:
                    services_seen.add(tag_id)
                    nodes_to_save.append({
                        "id": tag_id,
                        "node_type": "SYSTEM_COMPONENT",
                        "title": f"Service: {tag}",
                        "description": f"Microservice module handling {tag} endpoints",
                        "layer": "Service Layer",
                        "arch_type": "Microservice",
                        "epistemic_status": "INTERPRETATION",
                        "validation_status": "PROPOSED_BY_AI",
                    })

                edges_to_save.append({
                    "from_id": node_id,
                    "to_id": tag_id,
                    "relation_type": "DEPENDS_ON",
                })

            # 3. Request / Response Schemas
            def _extract_schema_refs(obj: Any):
                if isinstance(obj, dict):
                    if "$ref" in obj:
                        ref_val = str(obj["$ref"])
                        schema_name = ref_val.split("/")[-1]
                        if schema_name and schema_name not in schemas_seen:
                            schemas_seen.add(schema_name)
                            schema_id = _safe_id("DATA-SCHEMA", schema_name)
                            nodes_to_save.append({
                                "id": schema_id,
                                "node_type": "DATA_SOURCE",
                                "title": f"Schema: {schema_name}",
                                "description": f"Domain schema model '{schema_name}' from OpenAPI specification",
                                "system_of_record": "API Domain Model",
                                "access_protocol": "JSON",
                            })
                        if schema_name:
                            edges_to_save.append({
                                "from_id": node_id,
                                "to_id": _safe_id("DATA-SCHEMA", schema_name),
                                "relation_type": "READS_FROM" if method in ("get", "head") else "WRITES_TO",
                            })
                    for v in obj.values():
                        _extract_schema_refs(v)
                elif isinstance(obj, list):
                    for item in obj:
                        _extract_schema_refs(item)

            if "parameters" in operation:
                _extract_schema_refs(operation["parameters"])
            if "requestBody" in operation:
                _extract_schema_refs(operation["requestBody"])
            if "responses" in operation:
                _extract_schema_refs(operation["responses"])

            # 4. Security Requirement nodes
            sec_reqs = operation.get("security", spec.get("security", []))
            for sec_dict in sec_reqs:
                if isinstance(sec_dict, dict):
                    for sec_scheme in sec_dict.keys():
                        sec_id = _safe_id("REQ-SEC", sec_scheme)
                        nodes_to_save.append({
                            "id": sec_id,
                            "node_type": "REQUIREMENT",
                            "title": f"Security Policy: {sec_scheme}",
                            "description": f"Enforces {sec_scheme} authentication on endpoint",
                            "priority": "HIGH",
                            "epistemic_status": "FACT",
                            "validation_status": "VALIDATED_BY_HUMAN",
                        })
                        edges_to_save.append({
                            "from_id": sec_id,
                            "to_id": node_id,
                            "relation_type": "IMPLEMENTED_BY",
                        })

    # Deduplicate nodes by id
    unique_nodes: Dict[str, Dict[str, Any]] = {}
    for n in nodes_to_save:
        unique_nodes[n["id"]] = n

    # Save to storage if available
    saved_node_ids = list(unique_nodes.keys())
    saved_edge_ids = []

    if storage:
        if not storage.get_project(project_id):
            storage.create_project(
                project_id=project_id,
                name=f"{api_title} (v{version})",
                description=f"Auto-ingested OpenAPI specification with {len(saved_node_ids)} components.",
            )

        for n in unique_nodes.values():
            storage.save_node(project_id, n)

        for e in edges_to_save:
            res = storage.save_edge(project_id, e)
            saved_edge_ids.append(res["edge_id"])

    return IngestionSummary(
        project_id=project_id,
        source_type="openapi",
        title=f"{api_title} v{version}",
        nodes_created=len(unique_nodes),
        edges_created=len(edges_to_save),
        node_ids=saved_node_ids,
        edge_ids=saved_edge_ids,
        details={
            "api_title": api_title,
            "version": version,
            "schemas_count": len(schemas_seen),
            "services_count": len(services_seen),
        },
    )


def ingest_terraform(
    tf_input: str | dict,
    project_id: str,
    storage: Optional[TraceStorage] = None,
) -> IngestionSummary:
    """Ingest Terraform state, plan, or configuration JSON into a TRACE project."""
    tf = _parse_spec_input(tf_input)

    nodes_to_save: Dict[str, Dict[str, Any]] = {}
    edges_to_save: List[Dict[str, Any]] = []

    # Handle terraform plan/state JSON (values -> root_module -> resources or resource_changes)
    resources: List[Dict[str, Any]] = []

    if "resource_changes" in tf and isinstance(tf["resource_changes"], list):
        for rc in tf["resource_changes"]:
            resources.append({
                "type": rc.get("type", "resource"),
                "name": rc.get("name", "res"),
                "address": rc.get("address", f"{rc.get('type')}.{rc.get('name')}"),
                "values": rc.get("change", {}).get("after", {}),
                "depends_on": rc.get("change", {}).get("depends_on", []),
            })
    elif "values" in tf and "root_module" in tf["values"]:
        for r in tf["values"]["root_module"].get("resources", []):
            resources.append({
                "type": r.get("type", "resource"),
                "name": r.get("name", "res"),
                "address": r.get("address", f"{r.get('type')}.{r.get('name')}"),
                "values": r.get("values", {}),
                "depends_on": r.get("depends_on", []),
            })
    elif "resource" in tf and isinstance(tf["resource"], dict):
        for res_type, instances in tf["resource"].items():
            if isinstance(instances, dict):
                for res_name, res_body in instances.items():
                    resources.append({
                        "type": res_type,
                        "name": res_name,
                        "address": f"{res_type}.{res_name}",
                        "values": res_body if isinstance(res_body, dict) else {},
                        "depends_on": res_body.get("depends_on", []) if isinstance(res_body, dict) else [],
                    })

    for r in resources:
        res_type = r["type"]
        res_name = r["name"]
        addr = r["address"]
        node_id = _safe_id("COMP-TF", addr)

        # Categorize cloud infrastructure layer
        layer = "Cloud Infrastructure"
        arch_type = "Managed Resource"
        if "rds" in res_type or "db" in res_type or "sql" in res_type:
            layer = "Data Layer"
            arch_type = "Relational Database"
        elif "s3" in res_type or "bucket" in res_type or "storage" in res_type:
            layer = "Storage Layer"
            arch_type = "Object Store"
        elif "ecs" in res_type or "eks" in res_type or "instance" in res_type or "lambda" in res_type or "function" in res_type:
            layer = "Compute Layer"
            arch_type = "Serverless / Compute"
        elif "alb" in res_type or "gateway" in res_type or "lb" in res_type or "route" in res_type:
            layer = "Network & Ingress"
            arch_type = "Load Balancer"

        nodes_to_save[node_id] = {
            "id": node_id,
            "node_type": "SYSTEM_COMPONENT",
            "title": addr,
            "description": f"Terraform managed cloud resource '{res_type}.{res_name}'",
            "layer": layer,
            "arch_type": arch_type,
            "epistemic_status": "FACT",
            "validation_status": "VALIDATED_BY_HUMAN",
            "metadata": {
                "terraform_type": res_type,
                "terraform_name": res_name,
                "terraform_address": addr,
            },
        }

        # Add explicit depends_on edges
        for dep in r.get("depends_on", []):
            dep_id = _safe_id("COMP-TF", dep)
            edges_to_save.append({
                "from_id": node_id,
                "to_id": dep_id,
                "relation_type": "DEPENDS_ON",
            })

    saved_edge_ids = []
    if storage:
        if not storage.get_project(project_id):
            storage.create_project(
                project_id=project_id,
                name="Terraform Cloud Architecture",
                description=f"Auto-ingested Terraform infrastructure ({len(nodes_to_save)} resources).",
            )

        for n in nodes_to_save.values():
            storage.save_node(project_id, n)

        for e in edges_to_save:
            res = storage.save_edge(project_id, e)
            saved_edge_ids.append(res["edge_id"])

    return IngestionSummary(
        project_id=project_id,
        source_type="terraform",
        title="Terraform Infrastructure",
        nodes_created=len(nodes_to_save),
        edges_created=len(edges_to_save),
        node_ids=list(nodes_to_save.keys()),
        edge_ids=saved_edge_ids,
        details={"resource_count": len(resources)},
    )


def ingest_container_manifest(
    manifest_input: str | dict,
    project_id: str,
    storage: Optional[TraceStorage] = None,
) -> IngestionSummary:
    """Ingest Docker Compose or Kubernetes YAML/JSON manifest into a TRACE project."""
    nodes_to_save: Dict[str, Dict[str, Any]] = {}
    edges_to_save: List[Dict[str, Any]] = []
    manifest_type = "compose"

    # Multi-document YAML support
    import textwrap
    docs: List[dict] = []
    if isinstance(manifest_input, dict):
        docs = [manifest_input]
    elif isinstance(manifest_input, str):
        dedented = textwrap.dedent(manifest_input).strip()
        try:
            parsed = list(yaml.safe_load_all(dedented))
            docs = [d for d in parsed if isinstance(d, dict)]
        except Exception:
            try:
                docs = [json.loads(manifest_input)]
            except Exception as e:
                raise ValueError(f"Failed to parse manifest: {str(e)}")

    if not docs:
        raise ValueError("Manifest contains no valid JSON/YAML documents")

    # Detect whether Docker Compose or Kubernetes
    first_doc = docs[0]
    if "apiVersion" in first_doc or "kind" in first_doc:
        manifest_type = "kubernetes"
        services_by_selector: Dict[str, str] = {}
        deployments_by_label: Dict[str, str] = {}

        for doc in docs:
            kind = doc.get("kind", "Resource")
            metadata = doc.get("metadata", {})
            name = metadata.get("name", "unnamed")
            node_id = _safe_id("COMP-K8S", f"{kind}-{name}")

            layer = "Container Workload"
            arch_type = kind
            if kind in ("Service", "Ingress"):
                layer = "Network & Routing"
            elif kind in ("ConfigMap", "Secret"):
                layer = "Configuration & Secrets"

            nodes_to_save[node_id] = {
                "id": node_id,
                "node_type": "DATA_SOURCE" if kind in ("ConfigMap", "Secret") else "SYSTEM_COMPONENT",
                "title": f"{kind}: {name}",
                "description": f"Kubernetes {kind} resource in namespace '{metadata.get('namespace', 'default')}'",
                "layer": layer,
                "arch_type": arch_type,
                "epistemic_status": "FACT",
                "validation_status": "VALIDATED_BY_HUMAN",
                "metadata": {
                    "kind": kind,
                    "name": name,
                    "namespace": metadata.get("namespace", "default"),
                },
            }

            # Map selectors for Service -> Deployment dependency linking
            if kind == "Service":
                selector = doc.get("spec", {}).get("selector", {})
                for k, v in selector.items():
                    services_by_selector[f"{k}={v}"] = node_id

            if kind in ("Deployment", "StatefulSet", "DaemonSet"):
                labels = doc.get("spec", {}).get("template", {}).get("metadata", {}).get("labels", {})
                for k, v in labels.items():
                    deployments_by_label[f"{k}={v}"] = node_id

        # Connect Services to matching Deployments
        for sel_key, svc_id in services_by_selector.items():
            if sel_key in deployments_by_label:
                dep_id = deployments_by_label[sel_key]
                edges_to_save.append({
                    "from_id": svc_id,
                    "to_id": dep_id,
                    "relation_type": "DEPENDS_ON",
                })

    else:
        # Docker Compose
        manifest_type = "compose"
        services = first_doc.get("services", {})
        for svc_name, svc_conf in services.items():
            node_id = _safe_id("COMP-SVC", svc_name)
            nodes_to_save[node_id] = {
                "id": node_id,
                "node_type": "SYSTEM_COMPONENT",
                "title": f"Service: {svc_name}",
                "description": f"Docker Compose container service using image '{svc_conf.get('image', 'local-build')}'",
                "layer": "Container Workload",
                "arch_type": "Container Service",
                "epistemic_status": "FACT",
                "validation_status": "VALIDATED_BY_HUMAN",
                "metadata": {"service_name": svc_name},
            }

            # depends_on relationships
            depends_on = svc_conf.get("depends_on", [])
            if isinstance(depends_on, dict):
                depends_on = list(depends_on.keys())
            elif isinstance(depends_on, str):
                depends_on = [depends_on]

            for dep_name in depends_on:
                dep_id = _safe_id("COMP-SVC", dep_name)
                edges_to_save.append({
                    "from_id": node_id,
                    "to_id": dep_id,
                    "relation_type": "DEPENDS_ON",
                })

    saved_edge_ids = []
    if storage:
        if not storage.get_project(project_id):
            storage.create_project(
                project_id=project_id,
                name=f"{manifest_type.capitalize()} Architecture",
                description=f"Auto-ingested {manifest_type} manifest ({len(nodes_to_save)} workloads).",
            )

        for n in nodes_to_save.values():
            storage.save_node(project_id, n)

        for e in edges_to_save:
            res = storage.save_edge(project_id, e)
            saved_edge_ids.append(res["edge_id"])

    return IngestionSummary(
        project_id=project_id,
        source_type=manifest_type,
        title=f"{manifest_type.capitalize()} Manifest",
        nodes_created=len(nodes_to_save),
        edges_created=len(edges_to_save),
        node_ids=list(nodes_to_save.keys()),
        edge_ids=saved_edge_ids,
        details={"manifest_type": manifest_type, "document_count": len(docs)},
    )
