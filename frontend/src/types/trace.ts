export type NodeType =
  | 'BUSINESS_OUTCOME'
  | 'PROBLEM'
  | 'STAKEHOLDER'
  | 'GOAL'
  | 'REQUIREMENT'
  | 'DATA_SOURCE'
  | 'SYSTEM_COMPONENT'
  | 'WORKFLOW_STEP'
  | 'TEST_CASE'
  | 'QUESTION'
  | 'ASSUMPTION'
  | 'DECISION';

export type EpistemicStatus =
  | 'SOURCE_FACT'
  | 'INTERPRETATION'
  | 'INFERENCE'
  | 'RECOMMENDATION';

export type ValidationStatus =
  | 'PROPOSED_BY_AI'
  | 'VALIDATED_BY_HUMAN'
  | 'CONTESTED'
  | 'REJECTED';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RequirementType =
  | 'FUNCTIONAL'
  | 'NON_FUNCTIONAL'
  | 'INTEGRATION'
  | 'SECURITY_COMPLIANCE'
  | 'OBSERVABILITY';

export type RelationType =
  | 'JUSTIFIES'
  | 'ADDRESSES'
  | 'IMPLEMENTED_BY'
  | 'DEPENDS_ON'
  | 'VALIDATED_BY'
  | 'CONFLICTS_WITH'
  | 'CLARIFIED_BY'
  | 'FOUNDED_ON';

export type PersonaLens =
  | 'ALL_SYSTEMS'
  | 'EXECUTIVE'
  | 'ARCHITECT'
  | 'QA_LEAD'
  | 'GOVERNANCE';

export interface TraceNode {
  id: string;
  node_type: NodeType;
  title: string;
  description: string;
  epistemic_status: EpistemicStatus;
  validation_status: ValidationStatus;
  source_reference?: string | null;
  raw_source_text?: string | null;
  confidence: number;
  owner?: string | null;
  tags?: string[];
  metadata?: Record<string, any>;

  // Requirement specific
  req_type?: RequirementType;
  priority?: Priority;
  acceptance_criteria?: string[];
  is_ambiguous?: boolean;
  ambiguity_notes?: string[];
  has_conflict?: boolean;
  story_points?: number;
  t_shirt_size?: string;

  // DataSource specific
  system_of_record?: string;
  update_frequency?: string;
  access_protocol?: string;
  is_confirmed?: boolean;
  contains_pii?: boolean;

  // SystemComponent specific
  layer?: string;
  lifecycle_state?: string;
  monthly_infra_cost?: number;

  // WorkflowStep specific
  order?: number;
  actor_id?: string;
  system_id?: string;

  // TestCase specific
  requirement_id?: string;
  given?: string;
  when?: string;
  then?: string;
  is_automated?: boolean;
  test_status?: 'PASSED' | 'FAILED' | 'PENDING';

  // Question specific
  severity?: string;
  assigned_stakeholder?: string;

  // Assumption specific
  risk_level?: string;

  // Decision specific
  rationale?: string;
  consequences?: string[];
}

export interface TraceEdge {
  source_id: string;
  relation: RelationType | string;
  target_id: string;
  confidence: number;
}

export interface ReadinessDimension {
  score: number;
  weight: number;
  notes: string;
}

export interface ReadinessResult {
  total_score: number;
  pass_rate: number;
  blockers: string[];
  dimensions: Record<string, ReadinessDimension>;
}

export interface Contradiction {
  id: string;
  req_1: string;
  req_2: string;
  title: string;
  description: string;
  options: string[];
}

export interface EstimationResult {
  total_story_points: number;
  estimated_sprints: number;
  estimated_calendar_weeks: number;
  monthly_infra_cost: number;
}

export interface VersionSnapshot {
  id: string;
  title: string;
  timestamp: string;
  nodesCount: number;
  score: number;
  nodes: TraceNode[];
  edges: TraceEdge[];
}
