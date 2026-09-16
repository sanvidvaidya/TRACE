import { TraceNode, TraceEdge, ReadinessResult, Contradiction, EstimationResult } from '../types/trace';

export const AMBIGUITY_PATTERNS: Array<{
  regex: RegExp;
  reason: string;
  fix: string;
  options: string[];
}> = [
  {
    regex: /\b(real[\s\-]time|instantaneous|zero latency)\b/i,
    reason: "Operational Latency Undefined",
    fix: "Specify acceptable SLA bounds in milliseconds, seconds, or minutes.",
    options: [
      "Sub-second Event Stream (<500ms SLA via WebSockets/Kafka)",
      "Hourly Micro-batch Ingestion (<60 min SLA via CDC)",
      "24-Hour Nightly Scheduled Warehouse Refresh",
    ],
  },
  {
    regex: /\b(seamless|frictionless|intuitive)\b/i,
    reason: "Subjective Quality Metric",
    fix: "Formulate testable UI/system handoff criteria.",
    options: [
      "Standardized OpenAPI 3.0 REST Contract with JSON schema validation",
      "Single Sign-On (SSO) with OAuth 2.0 / OIDC Session Token",
      "Asynchronous Event Notification with guaranteed delivery and retry",
    ],
  },
  {
    regex: /\b(as much as needed|huge scale|all data)\b/i,
    reason: "Unbounded Capacity Bounds",
    fix: "Provide explicit throughput or storage bounds (e.g., GB/day, peak QPS).",
    options: [
      "Peak Throughput Capped at 5,000 QPS with rate limiting",
      "Daily Ingestion Target bounded at 50 GB/day with warm retention",
      "Autoscaling horizontal tier capped at 8 replicas",
    ],
  },
  {
    regex: /\b(smart|intelligent|ai-powered)\b/i,
    reason: "Unspecified Mechanism",
    fix: "State whether logic requires deterministic rules, statistical ML, or human evaluation.",
    options: [
      "Deterministic Rule Heuristics Engine with inspectable criteria",
      "Statistical ML Model (XGBoost) with offline feature store",
      "LLM RAG Pipeline with human approval validation gate",
    ],
  },
  {
    regex: /\b(users?|stakeholders?|someone)\b/i,
    reason: "Ambiguous Actor Identity",
    fix: "Specify the explicit role, persona, or permission profile.",
    options: [
      "Dedicated Customer Success Manager (Role: CSM_OPERATOR)",
      "Sales Account Executive (Role: SALES_REP)",
      "Platform Engineering Administrator (Role: PLATFORM_ADMIN)",
    ],
  },
];

export function auditRequirement(req: TraceNode): {
  isAmbiguous: boolean;
  notes: string[];
  remediations: string[];
  resolutionOptions: string[][];
} {
  const notes: string[] = [];
  const remediations: string[] = [];
  const resolutionOptions: string[][] = [];

  const text = `${req.title} ${req.description}`.toLowerCase();

  for (const pat of AMBIGUITY_PATTERNS) {
    const match = pat.regex.exec(text);
    if (match) {
      notes.push(`${pat.reason} ('${match[0]}')`);
      remediations.push(pat.fix);
      resolutionOptions.push(pat.options);
    }
  }

  const ac = req.acceptance_criteria || [];
  if (ac.length === 0) {
    notes.push("No acceptance criteria formulated");
    remediations.push("Formulate at least one Given-When-Then testable condition.");
    resolutionOptions.push([
      "Standard Happy Path: Given valid input, when evaluated, then assert state change.",
      "Boundary Test: Given null data, when evaluated, then surface explicit validation error.",
    ]);
  }

  if (!req.owner) {
    notes.push("Unassigned ownership");
    remediations.push("Assign a responsible stakeholder department or role.");
    resolutionOptions.push([
      "Assign to Customer Success Org",
      "Assign to Data Platform Engineering",
      "Assign to Architecture Core Team",
    ]);
  }

  return {
    isAmbiguous: notes.length > 0,
    notes,
    remediations,
    resolutionOptions,
  };
}

export function detectConflicts(requirements: TraceNode[]): Contradiction[] {
  const conflicts: Contradiction[] = [];

  for (let i = 0; i < requirements.length; i++) {
    for (let j = i + 1; j < requirements.length; j++) {
      const ra = requirements[i];
      const rb = requirements[j];
      const ta = `${ra.title} ${ra.description}`.toLowerCase();
      const tb = `${rb.title} ${rb.description}`.toLowerCase();

      const autoTerms = ["automatic", "autonomous", "automatically", "direct outreach"];
      const manualTerms = ["manual approval", "human sign-off", "must approve", "human review"];

      const autoA = autoTerms.some((w) => ta.includes(w));
      const manualB = manualTerms.some((w) => tb.includes(w));
      const autoB = autoTerms.some((w) => tb.includes(w));
      const manualA = manualTerms.some((w) => ta.includes(w));

      if ((autoA && manualB) || (autoB && manualA)) {
        conflicts.push({
          id: `CONF-${ra.id}-${rb.id}`,
          req_1: ra.id,
          req_2: rb.id,
          title: "Full Automation vs. Mandatory Manual Gate",
          description: `Autonomous trigger in ${ra.id} directly violates mandatory human gate in ${rb.id}.`,
          options: [
            "Human-in-the-loop: Automated draft generation with mandatory human trigger gate.",
            "Human-on-the-loop: Autonomous execution with real-time audit feed and rollback.",
            "Confidence Tiering: Full automation if confidence > 92%, human review otherwise.",
          ],
        });
      }
    }
  }

  return conflicts;
}

export function evaluateReadiness(
  nodes: TraceNode[],
  disabledNodeIds?: Set<string>
): ReadinessResult {
  const disabled = disabledNodeIds || new Set<string>();
  const activeNodes = nodes.filter((n) => !disabled.has(n.id));

  const problems = activeNodes.filter((n) => n.node_type === 'PROBLEM');
  const stakeholders = activeNodes.filter((n) => n.node_type === 'STAKEHOLDER');
  const reqs = activeNodes.filter((n) => n.node_type === 'REQUIREMENT');
  const dataSources = activeNodes.filter((n) => n.node_type === 'DATA_SOURCE');
  const components = activeNodes.filter((n) => n.node_type === 'SYSTEM_COMPONENT');
  const workflows = activeNodes.filter((n) => n.node_type === 'WORKFLOW_STEP');
  const tests = activeNodes.filter((n) => n.node_type === 'TEST_CASE');

  // 1. Problem Clarity (0.15)
  const score1 =
    problems.length > 0
      ? problems.filter((p) => p.metadata?.business_impact || p.description.length > 30).length /
        problems.length
      : 0.0;

  // 2. Stakeholder Alignment (0.10)
  const score2 =
    stakeholders.length > 0
      ? stakeholders.filter((s) => s.owner || s.metadata?.department).length /
        stakeholders.length
      : 0.0;

  // 3. Requirement Precision (0.20)
  const score3 =
    reqs.length > 0
      ? reqs.filter((r) => {
          const audit = auditRequirement(r);
          return !audit.isAmbiguous && (r.acceptance_criteria || []).length > 0;
        }).length / reqs.length
      : 0.0;

  // 4. Data Readiness (0.15)
  const score4 =
    dataSources.length > 0
      ? dataSources.filter((d) => d.is_confirmed && d.system_of_record !== 'Unknown').length /
        dataSources.length
      : 0.0;

  // 5. Workflow Precision (0.10)
  const score5 =
    workflows.length > 0
      ? workflows.filter((w) => w.actor_id && w.system_id).length / workflows.length
      : 0.0;

  // 6. Architecture Bounds (0.10)
  const score6 =
    components.length > 0
      ? components.filter((c) => c.layer && c.lifecycle_state).length / components.length
      : 0.0;

  // 7. Testability Coverage (0.10)
  const testedReqIds = new Set(tests.map((t) => t.requirement_id).filter(Boolean));
  const score7 =
    reqs.length > 0
      ? reqs.filter((r) => testedReqIds.has(r.id)).length / reqs.length
      : 0.0;

  // 8. Governance & Security (0.10)
  const score8 =
    dataSources.length > 0
      ? dataSources.filter((d) => d.contains_pii !== undefined).length / dataSources.length
      : 0.5;

  const dimensions = {
    'Problem Clarity': {
      score: Math.round(score1 * 100) / 100,
      weight: 0.15,
      notes: `${Math.round(score1 * problems.length)}/${problems.length} problems quantified.`,
    },
    'Stakeholder Alignment': {
      score: Math.round(score2 * 100) / 100,
      weight: 0.1,
      notes: `${Math.round(score2 * stakeholders.length)}/${stakeholders.length} stakeholders verified.`,
    },
    'Requirement Precision': {
      score: Math.round(score3 * 100) / 100,
      weight: 0.2,
      notes: `${Math.round(score3 * reqs.length)}/${reqs.length} unambiguous with testable criteria.`,
    },
    'Data Readiness': {
      score: Math.round(score4 * 100) / 100,
      weight: 0.15,
      notes: `${Math.round(score4 * dataSources.length)}/${dataSources.length} confirmed systems of record.`,
    },
    'Workflow Precision': {
      score: Math.round(score5 * 100) / 100,
      weight: 0.1,
      notes: `${Math.round(score5 * workflows.length)}/${workflows.length} steps mapped to actor/system.`,
    },
    'Architecture Bounds': {
      score: Math.round(score6 * 100) / 100,
      weight: 0.1,
      notes: `${Math.round(score6 * components.length)}/${components.length} components structurally bounded.`,
    },
    'Testability Coverage': {
      score: Math.round(score7 * 100) / 100,
      weight: 0.1,
      notes: `${Math.round(score7 * reqs.length)}/${reqs.length} requirements have verified tests.`,
    },
    'Governance & Security': {
      score: Math.round(score8 * 100) / 100,
      weight: 0.1,
      notes: `${Math.round(score8 * dataSources.length)}/${dataSources.length} sources cataloged for privacy.`,
    },
  };

  const totalScore = Math.round(
    Object.values(dimensions).reduce((acc, dim) => acc + dim.score * dim.weight, 0) * 1000
  ) / 10;

  const passedTests = tests.filter((t) => t.test_status === 'PASSED').length;
  const passRate = tests.length > 0 ? Math.round((passedTests / tests.length) * 100) : 100;

  const blockers: string[] = [];
  if (score3 < 0.6) {
    blockers.push("CRITICAL: Low requirement precision. Ambiguities or missing AC must be resolved.");
  }
  if (score4 < 0.6) {
    blockers.push("DATA BLOCKER: Systems of record or access mechanisms unconfirmed.");
  }
  if (score7 < 0.5) {
    blockers.push("TEST BLOCKER: Under 50% test coverage for defined requirements.");
  }

  return {
    total_score: totalScore,
    pass_rate: passRate,
    blockers,
    dimensions,
  };
}

export function calculateEstimation(
  requirements: TraceNode[],
  components: TraceNode[],
  velocity: number = 22,
  ratePerHour: number = 160
): EstimationResult & { estimatedCost: number } {
  let totalPoints = 0;

  requirements.forEach((r) => {
    const acCount = (r.acceptance_criteria || []).length;
    let pts = 3 + acCount * 2;
    if (r.priority === 'CRITICAL') pts += 3;

    r.story_points = pts;
    if (pts <= 4) r.t_shirt_size = 'S';
    else if (pts <= 7) r.t_shirt_size = 'M';
    else if (pts <= 11) r.t_shirt_size = 'L';
    else r.t_shirt_size = 'XL';

    totalPoints += pts;
  });

  const sprints = Math.max(1, Math.round(totalPoints / velocity));
  const weeks = sprints * 2;
  const infraTotal = components.reduce((acc, c) => acc + (c.monthly_infra_cost || 0), 0) || 650;
  // Assume each story point is approx 6 engineering hours
  const estimatedCost = totalPoints * 6 * ratePerHour;

  return {
    total_story_points: totalPoints,
    estimated_sprints: sprints,
    estimated_calendar_weeks: weeks,
    monthly_infra_cost: infraTotal,
    estimatedCost,
  };
}

export function simulateFailureImpact(
  failedNodeId: string,
  nodes: TraceNode[],
  edges: TraceEdge[]
): {
  affectedNodeIds: string[];
  affectedRequirements: TraceNode[];
  affectedComponents: TraceNode[];
  affectedWorkflows: TraceNode[];
  affectedTests: TraceNode[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
} {
  const affected = new Set<string>([failedNodeId]);
  let changed = true;

  while (changed) {
    changed = false;
    edges.forEach((e) => {
      if (affected.has(e.target_id) && !affected.has(e.source_id)) {
        affected.add(e.source_id);
        changed = true;
      }
      if (affected.has(e.source_id) && !affected.has(e.target_id) && e.relation === 'DEPENDS_ON') {
        affected.add(e.target_id);
        changed = true;
      }
    });
  }

  const affectedList = Array.from(affected);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const affectedRequirements = affectedList
    .map((id) => nodeMap.get(id))
    .filter((n): n is TraceNode => n?.node_type === 'REQUIREMENT');

  const affectedComponents = affectedList
    .map((id) => nodeMap.get(id))
    .filter((n): n is TraceNode => n?.node_type === 'SYSTEM_COMPONENT');

  const affectedWorkflows = affectedList
    .map((id) => nodeMap.get(id))
    .filter((n): n is TraceNode => n?.node_type === 'WORKFLOW_STEP');

  const affectedTests = affectedList
    .map((id) => nodeMap.get(id))
    .filter((n): n is TraceNode => n?.node_type === 'TEST_CASE');

  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (affectedRequirements.length > 2 || affectedComponents.length > 1) {
    severity = 'CRITICAL';
  } else if (affectedRequirements.length > 0) {
    severity = 'HIGH';
  } else if (affectedWorkflows.length > 0) {
    severity = 'MEDIUM';
  }

  return {
    affectedNodeIds: affectedList,
    affectedRequirements,
    affectedComponents,
    affectedWorkflows,
    affectedTests,
    severity,
  };
}
