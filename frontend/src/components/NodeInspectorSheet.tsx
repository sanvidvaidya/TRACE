import React from 'react';
import { TraceNode, TraceEdge, ValidationStatus } from '../types/trace';
import { X, CheckCircle2, Shield, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

interface NodeInspectorSheetProps {
  node: TraceNode | null;
  onClose: () => void;
  edges: TraceEdge[];
  allNodes: TraceNode[];
  onPromoteValidation: (nodeId: string) => void;
  onSelectConnectedNode: (nodeId: string) => void;
}

export const NodeInspectorSheet: React.FC<NodeInspectorSheetProps> = ({
  node,
  onClose,
  edges,
  allNodes,
  onPromoteValidation,
  onSelectConnectedNode,
}) => {
  if (!node) return null;

  const outgoing = edges.filter((e) => e.source_id === node.id);
  const incoming = edges.filter((e) => e.target_id === node.id);
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0a0c10]/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 text-xs">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lime-400 text-sm">{node.id}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-[10px] text-zinc-300">
              {node.node_type}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white leading-snug">{node.title}</h3>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
            Description
          </span>
          <p className="text-zinc-300 text-xs leading-relaxed">{node.description}</p>
        </div>

        {/* Epistemic Status Card */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
            Epistemic Governance Tier
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Epistemic Status:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono font-bold text-[10px]">
              {node.epistemic_status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Validation Level:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
              node.validation_status === 'VALIDATED_BY_HUMAN'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              {node.validation_status}
            </span>
          </div>

          {node.validation_status !== 'VALIDATED_BY_HUMAN' && (
            <button
              onClick={() => onPromoteValidation(node.id)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 flex items-center justify-center gap-1.5 font-semibold font-mono text-xs spring-press"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Promote to Human-Validated Ground Truth</span>
            </button>
          )}
        </div>

        {/* Acceptance Criteria */}
        {node.acceptance_criteria && node.acceptance_criteria.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
              Given-When-Then Criteria
            </span>
            <div className="space-y-1.5">
              {node.acceptance_criteria.map((ac, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-zinc-300">
                  {ac}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected Outbound & Inbound links */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
            Connected Topology
          </span>
          {outgoing.map((e, idx) => {
            const target = nodeMap.get(e.target_id);
            return (
              <button
                key={idx}
                onClick={() => onSelectConnectedNode(e.target_id)}
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-lime-400/40 flex items-center justify-between text-left group"
              >
                <div>
                  <span className="font-mono text-lime-400 text-[10px] font-bold">{e.relation}</span>
                  <div className="text-zinc-200 text-xs font-semibold truncate max-w-[220px]">
                    {target?.title || e.target_id}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-lime-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
