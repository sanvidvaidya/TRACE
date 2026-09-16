import React from 'react';
import { TraceNode } from '../../types/trace';
import { Network, Users, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Screen03ConceptualModelProps {
  nodes: TraceNode[];
  onSelectNode: (node: TraceNode) => void;
}

export const Screen03ConceptualModel: React.FC<Screen03ConceptualModelProps> = ({
  nodes,
  onSelectNode,
}) => {
  const stakeholders = nodes.filter((n) => n.node_type === 'STAKEHOLDER');
  const goals = nodes.filter((n) => n.node_type === 'GOAL');
  const assumptions = nodes.filter((n) => n.node_type === 'ASSUMPTION');

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-400/10 text-lime-300 font-mono-code text-[11px] mb-2 border border-lime-400/20">
          <span>03 // CONCEPTUAL DOMAIN MODEL</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Stakeholder Discovery, Strategic Goals & Explicit Assumptions
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Cataloged organizational personas, business goals, and epistemic assumptions underpinning the architecture.
        </p>
      </div>

      {/* Stakeholders Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span>Key Stakeholders & Accountable Teams</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stakeholders.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectNode(s)}
              className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 hover:border-purple-500/40 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-code font-bold text-purple-400 text-xs">{s.id}</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono-code text-[10px]">
                  {s.owner || 'ORG'}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-zinc-200">{s.title}</h4>
              <p className="text-xs text-zinc-400">{s.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 font-mono-code">
                <span>EPISTEMIC: {s.epistemic_status}</span>
                <span>DEPT: {s.metadata?.department || 'Executive'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Goals & Explicit Assumptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Derived System Goals</h3>
          <div className="space-y-2">
            {goals.map((g) => (
              <div
                key={g.id}
                onClick={() => onSelectNode(g)}
                className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 hover:border-lime-400/40 cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-code font-bold text-lime-400 text-xs">{g.id}</span>
                  <span className="text-[10px] font-mono-code text-zinc-500">GOAL</span>
                </div>
                <h4 className="text-xs font-semibold text-zinc-200">{g.title}</h4>
                <p className="text-xs text-zinc-400">{g.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Cataloged Architectural Assumptions</h3>
          <div className="space-y-2">
            {assumptions.map((a) => (
              <div
                key={a.id}
                onClick={() => onSelectNode(a)}
                className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 hover:border-amber-500/40 cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-code font-bold text-amber-400 text-xs">{a.id}</span>
                  <span className="text-[10px] font-mono-code text-zinc-500">ASSUMPTION</span>
                </div>
                <h4 className="text-xs font-semibold text-zinc-200">{a.title}</h4>
                <p className="text-xs text-zinc-400">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
