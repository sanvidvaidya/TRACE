import React, { useState } from 'react';
import { TraceNode, TraceEdge } from '../../types/trace';
import { auditRequirement, detectConflicts } from '../../lib/readinessEngine';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Layers,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface AmbiguityRadarModeProps {
  nodes: TraceNode[];
  edges: TraceEdge[];
  onSelectNode: (node: TraceNode) => void;
  onUpdateRequirement: (req: TraceNode) => void;
  onResolveContradiction: (contradictionId: string, chosenOption: string) => void;
}

export const AmbiguityRadarMode: React.FC<AmbiguityRadarModeProps> = ({
  nodes,
  edges,
  onSelectNode,
  onUpdateRequirement,
  onResolveContradiction,
}) => {
  const reqs = nodes.filter((n) => n.node_type === 'REQUIREMENT');
  const conflicts = detectConflicts(reqs);

  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({
    'REQ-002': true,
  });

  const toggleExpand = (id: string) => {
    setExpandedReqs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApplyResolution = (req: TraceNode, chosenOption: string) => {
    const updatedCriteria = [...(req.acceptance_criteria || [])];
    const newCriteria = `Approved Rule: ${chosenOption}`;
    if (!updatedCriteria.includes(newCriteria)) {
      updatedCriteria.push(newCriteria);
    }

    const updatedReq: TraceNode = {
      ...req,
      acceptance_criteria: updatedCriteria,
      validation_status: 'VALIDATED_BY_HUMAN',
      is_ambiguous: false,
    };

    onUpdateRequirement(updatedReq);

    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#38bdf8', '#34d399', '#ffffff'],
    });

    toast.success(`Rule set for ${req.id}. Conflict resolved.`);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 pt-8 font-sans select-none">
      {/* Header */}
      <div className="space-y-2 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Rule Conflict Checker</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Spot mismatched rules before writing code
        </h1>

        <p className="text-slate-300 text-sm leading-relaxed">
          When two teams define conflicting rules for timeouts, data formats, or retries, bugs sneak into production. TRACE detects these mismatches early so your team stays aligned.
        </p>
      </div>

      {/* Contradiction Detection Banners */}
      {conflicts.map((c) => (
        <div
          key={c.id}
          className="p-5 sm:p-6 rounded-[4px] bg-[#070b16] border border-amber-500/40 space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-[3px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                  Conflicting Rule Detected
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-slate-900 text-slate-300 border border-slate-700">
                  {c.req_1} vs {c.req_2}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{c.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>
            </div>
          </div>

          <div className="pt-2 pl-0 sm:pl-11 space-y-2">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Choose the rule your team wants to follow:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {c.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => onResolveContradiction(c.id, opt)}
                  className="p-3 rounded-[3px] bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-400/50 text-left text-xs text-slate-200 transition-colors flex flex-col justify-between gap-2.5 group cursor-pointer"
                >
                  <span className="text-xs leading-snug">{opt}</span>
                  <span className="text-[10px] font-mono text-sky-400 group-hover:text-sky-300 flex items-center gap-1 font-semibold">
                    <span>Select this rule</span> →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Requirements List */}
      <div className="space-y-3">
        <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
          All System Requirements & Verification Status
        </div>

        {reqs.map((r) => {
          const audit = auditRequirement(r);
          const isExpanded = !!expandedReqs[r.id];

          return (
            <div
              key={r.id}
              className="p-4 rounded-[4px] bg-[#070b16] border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
            >
              <div
                onClick={() => toggleExpand(r.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">{r.id}</span>
                  <h4 className="text-sm font-semibold text-white">{r.title}</h4>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border ${
                    r.is_ambiguous
                      ? 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {r.is_ambiguous ? 'Needs Clarification' : 'Clear & Verified'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs">
                  <p className="text-slate-300 leading-relaxed">{r.description}</p>

                  {r.acceptance_criteria && r.acceptance_criteria.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                        Verification Checklist
                      </div>
                      <div className="space-y-1">
                        {r.acceptance_criteria.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {audit.notes && audit.notes.length > 0 && (
                    <div className="p-2.5 rounded-[3px] bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs">
                      <strong>Attention needed:</strong> {audit.notes.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
