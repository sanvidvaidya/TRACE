import React from 'react';
import { TraceNode } from '../../types/trace';
import { GitFork, ArrowDown, UserCheck, Cpu, CheckCircle2 } from 'lucide-react';

interface Screen05WorkflowsProps {
  nodes: TraceNode[];
  onSelectNode: (node: TraceNode) => void;
}

export const Screen05Workflows: React.FC<Screen05WorkflowsProps> = ({
  nodes,
  onSelectNode,
}) => {
  const steps = nodes
    .filter((n) => n.node_type === 'WORKFLOW_STEP')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono-code text-[11px] mb-2 border border-amber-500/20">
          <span>05 // WORKFLOWS & SEQUENCE TOPOLOGY</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Operational Workflow & Interaction Sequence
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Chronological execution topology binding human operators to autonomous service boundaries.
        </p>
      </div>

      {/* Sequence Topology Chain */}
      <div className="space-y-4 relative">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div
              onClick={() => onSelectNode(step)}
              className="p-5 rounded-xl bg-[#0f1013] border border-zinc-800 hover:border-amber-500/40 cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono-code text-amber-400 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-mono-code font-bold text-lime-400 text-xs">{step.id}</span>
                </div>

                <div className="flex items-center gap-2">
                  {step.actor_id && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono-code text-[10px]">
                      <UserCheck className="w-3 h-3 text-purple-400" />
                      <span>{step.actor_id}</span>
                    </span>
                  )}

                  {step.system_id && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono-code text-[10px]">
                      <Cpu className="w-3 h-3 text-emerald-400" />
                      <span>{step.system_id}</span>
                    </span>
                  )}
                </div>
              </div>

              <h4 className="text-sm font-semibold text-zinc-200">{step.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{step.description}</p>
            </div>

            {idx < steps.length - 1 && (
              <div className="flex justify-center -my-1">
                <ArrowDown className="w-4 h-4 text-zinc-600" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
