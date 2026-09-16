import React, { useState } from 'react';
import { TraceNode, TraceEdge } from '../../types/trace';
import { simulateFailureImpact } from '../../lib/readinessEngine';
import { Server, AlertOctagon, ArrowRight, ShieldCheck, DollarSign, Activity } from 'lucide-react';

interface Screen07ArchitectureProps {
  nodes: TraceNode[];
  edges: TraceEdge[];
  onSelectNode: (node: TraceNode) => void;
  simulatedFailures: Set<string>;
  onToggleSimulatedFailure: (nodeId: string) => void;
}

export const Screen07Architecture: React.FC<Screen07ArchitectureProps> = ({
  nodes,
  edges,
  onSelectNode,
  simulatedFailures,
  onToggleSimulatedFailure,
}) => {
  const components = nodes.filter((n) => n.node_type === 'SYSTEM_COMPONENT');
  const decisions = nodes.filter((n) => n.node_type === 'DECISION');
  const [selectedCompForWhatIf, setSelectedCompForWhatIf] = useState<string>('COMP-001');

  // Compute blast radius for currently selected component in simulator
  const impact = simulateFailureImpact(selectedCompForWhatIf, nodes, edges);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono-code text-[11px] mb-2 border border-amber-500/20">
          <span>07 // SYSTEM ARCHITECTURE & ADRS</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          System Components, What-If Outage Simulator & ADRs
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Cataloged physical tiers, dynamic failure blast-radius analysis, and immutable Architectural Decision Records.
        </p>
      </div>

      {/* What-If Blast Radius Simulator */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-[#14161a] to-[#0c0d10] border border-zinc-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                What-If Failure & Outage Simulator
              </h3>
              <p className="text-xs text-zinc-400">
                Inject synthetic component failure to compute immediate relational blast radius.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono-code">Inject Outage:</span>
            <select
              value={selectedCompForWhatIf}
              onChange={(e) => setSelectedCompForWhatIf(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-lime-300 font-mono-code focus:outline-none"
            >
              {components.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0e1013]">
                  {c.id} - {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Blast Radius Result */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono-code text-zinc-500 uppercase">Blast Severity</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold font-mono-code px-2 py-0.5 rounded border ${
                impact.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                impact.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {impact.severity}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 pt-1">
              {impact.affectedNodeIds.length} entities in dependency path
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono-code text-zinc-500 uppercase">Impacted Requirements</span>
            <p className="text-2xl font-bold font-mono-code text-lime-400">
              {impact.affectedRequirements.length}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">
              {impact.affectedRequirements.map((r) => r.id).join(', ') || 'None'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono-code text-zinc-500 uppercase">Impacted Workflows</span>
            <p className="text-2xl font-bold font-mono-code text-amber-400">
              {impact.affectedWorkflows.length}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">
              {impact.affectedWorkflows.map((w) => w.id).join(', ') || 'None'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono-code text-zinc-500 uppercase">Impacted Test Suites</span>
            <p className="text-2xl font-bold font-mono-code text-teal-400">
              {impact.affectedTests.length}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">
              {impact.affectedTests.map((t) => t.id).join(', ') || 'None'}
            </p>
          </div>
        </div>

        {/* Action button to inject globally */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-400">
            {simulatedFailures.has(selectedCompForWhatIf)
              ? 'This component is currently active in failure mode across the workbench.'
              : 'Component operating under normal nominal parameters.'}
          </span>
          <button
            onClick={() => onToggleSimulatedFailure(selectedCompForWhatIf)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono-code font-semibold pressable transition-all ${
              simulatedFailures.has(selectedCompForWhatIf)
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-rose-500 text-black hover:bg-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
            }`}
          >
            {simulatedFailures.has(selectedCompForWhatIf)
              ? 'Restore Component'
              : 'Inject Simulated Failure'}
          </button>
        </div>
      </div>

      {/* System Components Catalog */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-200">Cataloged System Components</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {components.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectNode(c)}
              className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-code font-bold text-lime-400 text-xs">{c.id}</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono-code text-[10px]">
                  {c.layer || 'SERVICE_TIER'}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-lime-300 transition-colors">
                {c.title}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{c.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 font-mono-code">
                <span>STATE: {c.lifecycle_state || 'PROPOSED'}</span>
                <span>EST INFRA: ${c.monthly_infra_cost || 200}/mo</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architectural Decision Records (ADRs) */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-200">Architectural Decision Records (ADRs)</h3>
        <div className="space-y-3">
          {decisions.map((d) => (
            <div
              key={d.id}
              onClick={() => onSelectNode(d)}
              className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 hover:border-purple-500/40 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono-code font-bold text-purple-400 text-xs">{d.id}</span>
                  <span className="text-xs font-semibold text-zinc-200">{d.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono-code text-[10px]">
                  ACCEPTED ADR
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{d.description}</p>
              {d.rationale && (
                <p className="text-xs text-zinc-300 font-mono-code bg-zinc-900/60 p-2 rounded border border-zinc-800">
                  <strong className="text-purple-300">Rationale:</strong> {d.rationale}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
