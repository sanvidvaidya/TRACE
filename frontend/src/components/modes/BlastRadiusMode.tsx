import React, { useState } from 'react';
import { TraceNode, TraceEdge } from '../../types/trace';
import { simulateFailureImpact } from '../../lib/readinessEngine';
import { 
  AlertCircle, 
  Server, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  RotateCcw,
  ZapOff,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface BlastRadiusModeProps {
  nodes: TraceNode[];
  edges: TraceEdge[];
  onSelectNode: (node: TraceNode) => void;
  simulatedFailures: Set<string>;
  onToggleSimulatedFailure: (nodeId: string) => void;
}

export const BlastRadiusMode: React.FC<BlastRadiusModeProps> = ({
  nodes,
  edges,
  onSelectNode,
  simulatedFailures,
  onToggleSimulatedFailure,
}) => {
  const components = nodes.filter((n) => n.node_type === 'SYSTEM_COMPONENT');
  const [selectedCompId, setSelectedCompId] = useState<string>('COMP-001');

  const impact = simulateFailureImpact(selectedCompId, nodes, edges);
  const isFailed = simulatedFailures.has(selectedCompId);
  const selectedNode = components.find((c) => c.id === selectedCompId);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 pt-8 font-sans select-none">
      {/* Header */}
      <div className="space-y-2 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Downtime Impact Tester</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          See what happens when a service goes offline
        </h1>

        <p className="text-slate-300 text-sm leading-relaxed">
          Pick any database, queue, or API to simulate an outage. TRACE shows you which customer features stop working, which services degrade gracefully, and what remains fully operational.
        </p>
      </div>

      {/* Main Interactive Testing Workspace */}
      <div className="p-6 rounded-[4px] bg-[#070b16] border border-slate-800 space-y-6">
        
        {/* Component Selector Bar */}
        <div className="space-y-2.5 border-b border-slate-800 pb-5">
          <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
            Choose a service to test:
          </span>
          <div className="flex flex-wrap gap-2">
            {components.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCompId(c.id)}
                className={`px-3 py-1.5 rounded-[3px] font-mono text-xs font-semibold transition-colors cursor-pointer border ${
                  selectedCompId === c.id
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Service Test Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[4px] bg-slate-900 border border-slate-800">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-500">Currently Testing</div>
            <h3 className="text-lg font-bold text-white mt-0.5">{selectedNode?.title || selectedCompId}</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              {selectedNode?.description || 'Core service running in your system topology.'}
            </p>
          </div>

          <button
            onClick={() => onToggleSimulatedFailure(selectedCompId)}
            className={`px-4 py-2 rounded-[3px] font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 shrink-0 border ${
              isFailed
                ? 'bg-rose-950/60 border-rose-500 text-rose-200 hover:bg-rose-900/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            <ZapOff className="w-4 h-4" />
            <span>{isFailed ? 'Restore Service (End Test)' : 'Simulate Outage on This Service'}</span>
          </button>
        </div>

        {/* Impact Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Affected Services & Tasks */}
          <div className="p-4 rounded-[4px] bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                Services Affected Directly
              </span>
              <span className="text-xs font-mono text-rose-400 font-bold">
                {impact.affectedComponents.length} connected
              </span>
            </div>

            {impact.affectedComponents.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                No downstream dependencies. This service can fail without stopping other core services.
              </p>
            ) : (
              <div className="space-y-2">
                {impact.affectedComponents.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => onSelectNode(node)}
                    className="p-2.5 rounded-[3px] bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{node.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{node.node_type}</div>
                    </div>
                    <span className="text-[10px] text-rose-400 font-mono bg-rose-950/40 px-2 py-0.5 rounded-[2px] border border-rose-900/50">
                      Degraded
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Impact Summary */}
          <div className="p-4 rounded-[4px] bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                Customer Experience Impact
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {impact.affectedRequirements.length} User Features
              </span>
            </div>

            {impact.affectedRequirements.length === 0 ? (
              <p className="text-xs text-emerald-400 py-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero customer-facing user flows are interrupted by this service.</span>
              </p>
            ) : (
              <div className="space-y-2">
                {impact.affectedRequirements.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => onSelectNode(req)}
                    className="p-2.5 rounded-[3px] bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-white">{req.title}</div>
                      <div className="text-[10px] text-slate-400">{req.description?.slice(0, 75)}...</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Takeaway Recommendation */}
        <div className="p-4 rounded-[4px] bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
          <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-white font-semibold">How to prevent downtime:</strong>
            <p className="text-slate-400 leading-relaxed">
              If a service affects 2 or more downstream tools, ensure it has a configured read replica or automated container scaling. In Project Phoenix, configuring a replica on the database eliminates 80% of systemic downtime risk.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
