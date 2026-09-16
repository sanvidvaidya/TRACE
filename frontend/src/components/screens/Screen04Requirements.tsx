import React, { useState } from 'react';
import { TraceNode, TraceEdge, Contradiction } from '../../types/trace';
import { auditRequirement, detectConflicts } from '../../lib/readinessEngine';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Zap, 
  Layers,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Screen04RequirementsProps {
  nodes: TraceNode[];
  edges: TraceEdge[];
  onSelectNode: (node: TraceNode) => void;
  onUpdateRequirement: (req: TraceNode) => void;
  onResolveContradiction: (contradictionId: string, chosenOption: string) => void;
}

export const Screen04Requirements: React.FC<Screen04RequirementsProps> = ({
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

  const handleApplyResolution = (
    req: TraceNode,
    chosenOption: string
  ) => {
    const updatedCriteria = [...(req.acceptance_criteria || [])];
    const newCriteria = `Operational Boundary: ${chosenOption}`;
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

    // Emil Kowalski celebration effect
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#bef264', '#e4f222', '#10b981'],
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-400/10 text-lime-300 font-mono-code text-[11px] mb-2 border border-lime-400/20">
          <span>04 // REQUIREMENTS LEDGER</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Traceable Requirements Matrix & Interactive Resolvers
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Automated ambiguity detection with one-click architectural remedies. Stamped with Given-When-Then criteria.
        </p>
      </div>

      {/* Contradiction Alert Banners (if any) */}
      {conflicts.map((c) => (
        <div
          key={c.id}
          className="p-5 rounded-xl bg-gradient-to-r from-rose-950/40 to-zinc-900 border border-rose-500/40 shadow-xl space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code font-bold text-rose-300">
                  ARCHITECTURAL CONTRADICTION DETECTED
                </span>
                <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {c.req_1} ⟷ {c.req_2}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{c.description}</p>
            </div>
          </div>

          <div className="pt-2 pl-8 space-y-2">
            <span className="text-[11px] font-mono-code text-zinc-400 uppercase">
              Select Stance & Enforce Resolution:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {c.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => onResolveContradiction(c.id, opt)}
                  className="p-2.5 rounded-lg bg-zinc-900/80 hover:bg-rose-900/20 border border-zinc-700/80 hover:border-rose-500/40 text-left text-xs text-zinc-200 transition-all pressable flex flex-col justify-between gap-2"
                >
                  <span className="text-[11px] leading-snug">{opt}</span>
                  <span className="text-[10px] font-mono-code text-rose-400 flex items-center gap-1 font-semibold">
                    <Zap className="w-3 h-3" /> Enforce Stance
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Requirements List */}
      <div className="space-y-3">
        {reqs.map((r) => {
          const audit = auditRequirement(r);
          const isExpanded = !!expandedReqs[r.id];

          const statusChip =
            audit.isAmbiguous || r.has_conflict
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : r.validation_status === 'VALIDATED_BY_HUMAN'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30';

          return (
            <div
              key={r.id}
              className={`rounded-xl border transition-all ${
                audit.isAmbiguous
                  ? 'bg-[#121316] border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                  : 'bg-[#0f1012] border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => toggleExpand(r.id)}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <span
                    onClick={() => onSelectNode(r)}
                    className="font-mono-code font-bold text-lime-400 text-xs cursor-pointer hover:underline"
                  >
                    {r.id}
                  </span>

                  <span className={`px-2 py-0.5 rounded font-mono-code text-[10px] border ${statusChip}`}>
                    {audit.isAmbiguous ? 'AMBIGUOUS' : r.validation_status}
                  </span>

                  {r.req_type && (
                    <span className="px-2 py-0.5 rounded font-mono-code text-[10px] bg-lime-400/10 text-lime-300 border border-lime-400/20">
                      {r.req_type}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono-code text-[10px] bg-zinc-800 text-zinc-300">
                    EST: {r.story_points || 5} pts ({r.t_shirt_size || 'M'})
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono-code">
                    OWNER: {r.owner || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-zinc-200">{r.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{r.description}</p>
              </div>

              {/* Expandable Criteria & Ambiguity Resolvers */}
              {isExpanded && (
                <div className="p-4 pt-2 border-t border-zinc-800/80 bg-black/20 space-y-4">
                  {/* Defined Criteria */}
                  {r.acceptance_criteria && r.acceptance_criteria.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono-code uppercase text-zinc-500 tracking-wider">
                        Verified Acceptance Criteria:
                      </span>
                      <ul className="space-y-1">
                        {r.acceptance_criteria.map((ac, idx) => (
                          <li
                            key={idx}
                            className="p-2 rounded bg-zinc-900/60 border border-zinc-800 text-zinc-300 font-mono-code text-[11px] flex items-start gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{ac}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ambiguity Audit & One-Click Remedies */}
                  {audit.isAmbiguous && (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-mono-code font-bold text-amber-300">
                          AMBIGUITY AUDIT & 1-CLICK RESOLUTION
                        </span>
                      </div>

                      {audit.notes.map((noteText, idx) => {
                        const remedy = audit.remediations[idx];
                        const options = audit.resolutionOptions[idx] || [];

                        return (
                          <div key={idx} className="space-y-2 pt-1 border-t border-amber-500/10">
                            <p className="text-xs text-zinc-300">
                              <strong className="text-amber-300">Issue:</strong> {noteText}  - {' '}
                              <em className="text-zinc-400">{remedy}</em>
                            </p>

                            {options.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono-code text-zinc-400 uppercase">
                                  Select Operational SLA Stance:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {options.map((opt, oIdx) => (
                                    <button
                                      key={oIdx}
                                      onClick={() => handleApplyResolution(r, opt)}
                                      className="p-2 rounded bg-zinc-900 hover:bg-lime-950/40 border border-zinc-700 hover:border-lime-400/40 text-left text-xs text-zinc-200 transition-all pressable flex items-center justify-between group"
                                    >
                                      <span className="text-[11px] leading-snug">{opt}</span>
                                      <Check className="w-3.5 h-3.5 text-zinc-600 group-hover:text-lime-400 shrink-0 ml-2" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
