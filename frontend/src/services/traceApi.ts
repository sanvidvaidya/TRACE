export interface TraceNodeData {
  id: string;
  node_type: string;
  title: string;
  description: string;
  epistemic_status: string;
  validation_status: string;
  confidence: number;
  priority?: string;
  system_type?: string;
}

export interface TraceEdgeData {
  from_id: string;
  to_id: string;
  relation_type: string;
}

export interface TraceGraphData {
  title: string;
  total_nodes: number;
  total_edges: number;
  nodes: TraceNodeData[];
  edges: TraceEdgeData[];
}

export interface BlastRadiusResult {
  severed_node_ids: string[];
  affected_requirements: string[];
  affected_components: string[];
  affected_tests: string[];
  degraded_readiness_score: number;
  is_ready: boolean;
}

export interface ReadinessScoreResult {
  total_score: number;
  dimensions: Record<string, any>;
  blockers: string[];
  is_ready: boolean;
}

const TRACE_API_BASE = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8001/api` : 'http://127.0.0.1:8001/api';

export async function checkTraceHealth(): Promise<{ status: string; system: string; graph_backend: string } | null> {
  try {
    const res = await fetch(`${TRACE_API_BASE}/health`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

export async function fetchTraceGraph(): Promise<TraceGraphData | null> {
  try {
    const res = await fetch(`${TRACE_API_BASE}/graph`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

export async function fetchTraceReadiness(): Promise<ReadinessScoreResult | null> {
  try {
    const res = await fetch(`${TRACE_API_BASE}/readiness`, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

export async function simulateBlastRadius(severedNodeIds: string[]): Promise<BlastRadiusResult | null> {
  try {
    const res = await fetch(`${TRACE_API_BASE}/blast-radius`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ severed_node_ids: severedNodeIds }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

export async function auditRequirement(title: string, description: string): Promise<any | null> {
  try {
    const res = await fetch(`${TRACE_API_BASE}/audit-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}
