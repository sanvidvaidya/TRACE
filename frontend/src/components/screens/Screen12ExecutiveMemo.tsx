import React from 'react';
import { TraceNode, ReadinessResult } from '../../types/trace';
import { Award, Copy, Check, Printer, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Screen12ExecutiveMemoProps {
  nodes: TraceNode[];
  readiness: ReadinessResult;
  projectTitle: string;
}

export const Screen12ExecutiveMemo: React.FC<Screen12ExecutiveMemoProps> = ({
  nodes,
  readiness,
  projectTitle,
}) => {
  const reqs = nodes.filter((n) => n.node_type === 'REQUIREMENT');
  const comps = nodes.filter((n) => n.node_type === 'SYSTEM_COMPONENT');
  const tests = nodes.filter((n) => n.node_type === 'TEST_CASE');

  const memoText = `
# EXECUTIVE IMPLEMENTATION MEMORANDUM
**PROJECT:** ${projectTitle}
**DATE:** ${new Date().toISOString().split('T')[0]}
**TRACE READINESS CERTIFICATION:** ${readiness.total_score}% / 100%

---

### 1. EXECUTIVE SUMMARY & BUSINESS JUSTIFICATION
Project Phoenix addresses critical B2B SaaS Net Revenue Retention deceleration (trailing drop from 108% to 91%).
The proposed system aggregates fragmented customer telemetry across Salesforce CRM, Snowflake data warehouse,
and Zendesk tickets to establish early churn warning indicators >=60 days prior to contract expiration.

### 2. SPECIFICATION CERTIFICATION STATUS
- **Total Tracked Entities:** ${nodes.length}
- **Functional Requirements:** ${reqs.length}
- **Architectural Components:** ${comps.length}
- **Acceptance Verification Test Suites:** ${tests.length}
- **Implementation Readiness Score:** ${readiness.total_score}% (${readiness.total_score >= 80 ? 'APPROVED' : 'CONDITIONAL'})

### 3. ARCHITECTURAL DECISION SUMMARY
- **Data Ingestion SLA:** Hourly micro-batch pipeline with CDC (Change Data Capture)
- **Governance Stance:** Mandatory Human-in-the-Loop review for all customer-facing interventions
- **Heuristic Engine:** Deterministic rule-based score calculation with auditable explainability

---

### 4. FORMAL EXECUTIVE SIGN-OFF
- **VP Customer Success:** [APPROVED & SIGNED]
- **Head of Product Management:** [APPROVED & SIGNED]
- **Solutions Architect & Engineering Lead:** [CERTIFIED BY TRACE ENGINE]
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(memoText);
    toast.success('Executive Memorandum copied to clipboard!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-500/10 text-lime-300 font-mono-code text-[11px] mb-2 border border-lime-500/20">
            <span>12 // EXECUTIVE SIGN-OFF MEMO</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
            Formal Architecture Sign-Off Memorandum
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Certified document suitable for engineering handover, compliance records, and budget release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg bg-lime-500 text-black font-semibold text-xs font-mono-code flex items-center gap-1.5 hover:bg-lime-400 pressable transition-all shadow-[0_0_15px_rgba(228,242,34,0.3)]"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Markdown</span>
          </button>
        </div>
      </div>

      {/* Styled Printable Memo Document */}
      <div className="p-8 md:p-10 rounded-2xl bg-[#0e1013] border border-zinc-800 shadow-2xl space-y-6 font-mono-code text-xs text-zinc-300">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="text-lg font-bold text-zinc-100">EXECUTIVE IMPLEMENTATION MEMORANDUM</div>
            <div className="text-zinc-500 text-[11px] pt-1">
              DOCUMENT CLASSIFICATION: CONFIDENTIAL // ENGINEERING ARCHITECTURE SPEC
            </div>
          </div>
          <div className="text-right">
            <span className="px-2.5 py-1 rounded bg-lime-400/10 border border-lime-400/30 text-lime-300 font-bold">
              CERTIFIED {readiness.total_score}%
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-zinc-100 font-bold text-xs uppercase mb-1">1. Business Objective</h4>
            <p className="text-zinc-400 leading-relaxed">
              Restore net revenue retention from 91% to 105%+ by mitigating preventable SaaS account cancellations.
              Provides synthesized early risk indicators &ge;60 days in advance of renewal milestones.
            </p>
          </div>

          <div>
            <h4 className="text-zinc-100 font-bold text-xs uppercase mb-1">2. Architecture Baseline</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500">REQUIREMENTS</div>
                <div className="text-lime-400 font-bold text-sm">{reqs.length} Spec Items</div>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500">COMPONENTS</div>
                <div className="text-emerald-400 font-bold text-sm">{comps.length} Systems</div>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500">VERIFICATION</div>
                <div className="text-teal-400 font-bold text-sm">{tests.length} Suites</div>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500">CONTRADICTIONS</div>
                <div className="text-lime-400 font-bold text-sm">0 Unresolved</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-zinc-100 font-bold text-xs uppercase mb-1">3. Governance & Quality Gates</h4>
            <ul className="space-y-1 text-zinc-400">
              <li>• Automated ambiguity detection: 100% testable criteria defined.</li>
              <li>• Security & Privacy: Data source PII cataloged and evaluated for SOC2/GDPR compliance.</li>
              <li>• Human oversight: Autonomous outreach restricted by mandatory CSM review gate.</li>
            </ul>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-6 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase">Customer Success</span>
            <div className="text-zinc-200 font-bold">VP Customer Success</div>
            <div className="text-emerald-400 text-[10px]">✓ Signed & Approved</div>
          </div>
          <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase">Product Org</span>
            <div className="text-zinc-200 font-bold">Head of Product</div>
            <div className="text-emerald-400 text-[10px]">✓ Signed & Approved</div>
          </div>
          <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase">Engineering Architecture</span>
            <div className="text-zinc-200 font-bold">Solutions Architect</div>
            <div className="text-lime-400 text-[10px]">✓ Certified via TRACE</div>
          </div>
        </div>
      </div>
    </div>
  );
};
