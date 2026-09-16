import React from 'react';
import { TraceNode, TraceEdge, ValidationStatus } from '../types/trace';
import { X, ExternalLink, Shield, CheckCircle, AlertTriangle, Cpu, Database, Check } from 'lucide-react';

interface NodeInspectorProps {
  node: TraceNode | null;
  onClose: () => void;
  edges: TraceEdge[];
  allNodes: TraceNode[];
  onUpdateValidationStatus?: (nodeId: string, status: ValidationStatus) => void;
  onSelectConnectedNode?: (nodeId: string) => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  onClose,
  edges,
  allNodes,
  onUpdateValidationStatus,
  onSelectConnectedNode,
}) => {
  if (!node) return null;

  // Find incoming and outgoing edges
  const outgoing = edges.filter((e) => e.source_id === node.id);
  const incoming = edges.filter((e) => e.target_id === node.id);
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#0e1013] border-l border-zinc-800/90 shadow-2xl z-50 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono-code font-bold text-lime-400 text-xs">{node.id}</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono-code text-[10px]">
            {node.node_type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title and Description */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{node.title}</h3>
          <p className="text-zinc-400 text-xs leading-relaxed">{node.description}</p>
        </div>

        {/* Epistemic & Validation Status Card */}
        <div className="bg-[#14161a] p-3 rounded-lg border border-zinc-800/80 space-y-2.5">
          <div className="text-[10px] font-mono-code text-zinc-500 uppercase tracking-wider">
            Epistemic Classification
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Epistemic Status:</span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono-code text-[10px]">
              {node.epistemic_status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Validation:</span>
            <span className={`px-2 py-0.5 rounded font-mono-code text-[10px] border ${
              node.validation_status === 'VALIDATED_BY_HUMAN'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              {node.validation_status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Confidence:</span>
            <span className="text-zinc-200 font-mono-code">{(node.confidence * 100).toFixed(0)}%</span>
          </div>

          {/* Stance promotion button */}
          {onUpdateValidationStatus && node.validation_status !== 'VALIDATED_BY_HUMAN' && (
            <button
              onClick={() => onUpdateValidationStatus(node.id, 'VALIDATED_BY_HUMAN')}
              className="w-full mt-2 py-1.5 px-2.5 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 flex items-center justify-center gap-1.5 font-medium pressable transition-colors text-[11px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Promote to Human Verified Fact</span>
            </button>
          )}
        </div>

        {/* Metadata Details */}
        {node.owner && (
          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
            <span className="text-zinc-400">Owner:</span>
            <span className="text-zinc-200 font-medium">{node.owner}</span>
          </div>
        )}

        {node.req_type && (
          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
            <span className="text-zinc-400">Requirement Type:</span>
            <span className="text-lime-400 font-mono-code">{node.req_type}</span>
          </div>
        )}

        {node.story_points !== undefined && (
          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
            <span className="text-zinc-400">Story Points / Size:</span>
            <span className="text-zinc-200 font-mono-code">
              {node.story_points} pts ({node.t_shirt_size})
            </span>
          </div>
        )}

        {node.system_of_record && (
          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
            <span className="text-zinc-400">System of Record:</span>
            <span className="text-zinc-200">{node.system_of_record}</span>
          </div>
        )}

        {node.access_protocol && (
          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
            <span className="text-zinc-400">Protocol:</span>
            <span className="text-zinc-200 font-mono-code">{node.access_protocol}</span>
          </div>
        )}

        {node.layer && (
          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
            <span className="text-zinc-400">Arch Layer:</span>
            <span className="text-zinc-200 font-mono-code">{node.layer}</span>
          </div>
        )}

        {/* Acceptance Criteria */}
        {node.acceptance_criteria && node.acceptance_criteria.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono-code text-zinc-500 uppercase tracking-wider">
              Acceptance Criteria
            </div>
            <ul className="space-y-1">
              {node.acceptance_criteria.map((ac, idx) => (
                <li key={idx} className="p-2 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-mono-code text-[11px] leading-relaxed">
                  {ac}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Relations (Outgoing & Incoming) */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono-code text-zinc-500 uppercase tracking-wider">
            Traceability Topology
          </div>

          {outgoing.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400">Outbound Dependencies:</span>
              {outgoing.map((e, idx) => {
                const target = nodeMap.get(e.target_id);
                return (
                  <button
                    key={idx}
                    onClick={() => onSelectConnectedNode && onSelectConnectedNode(e.target_id)}
                    className="w-full text-left p-2 rounded bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <span className="text-lime-400 font-mono-code text-[10px]">{e.relation}</span>
                      <p className="text-zinc-300 text-xs truncate max-w-[220px]">
                        {target ? target.title : e.target_id}
                      </p>
                    </div>
                    <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors font-mono-code text-[10px]">
                      {e.target_id} →
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {incoming.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-zinc-400">Inbound Links:</span>
              {incoming.map((e, idx) => {
                const src = nodeMap.get(e.source_id);
                return (
                  <button
                    key={idx}
                    onClick={() => onSelectConnectedNode && onSelectConnectedNode(e.source_id)}
                    className="w-full text-left p-2 rounded bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <span className="text-amber-400 font-mono-code text-[10px]">{e.relation} BY</span>
                      <p className="text-zinc-300 text-xs truncate max-w-[220px]">
                        {src ? src.title : e.source_id}
                      </p>
                    </div>
                    <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors font-mono-code text-[10px]">
                      ← {e.source_id}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
