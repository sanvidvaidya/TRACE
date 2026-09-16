import React from 'react';
import { ReadinessResult } from '../../types/trace';
import { ScreenId } from '../SidebarNav';
import { Activity, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface Screen09ReadinessProps {
  readiness: ReadinessResult;
  onNavigate: (screen: ScreenId) => void;
}

export const Screen09Readiness: React.FC<Screen09ReadinessProps> = ({
  readiness,
  onNavigate,
}) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-400/10 text-lime-300 font-mono-code text-[11px] mb-2 border border-lime-400/20">
          <span>09 // 8-FACTOR READINESS ENGINE</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Deterministic 8-Factor Implementation Diagnostic
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Objective readiness algorithm evaluating specification completeness, architectural soundness, and testability.
        </p>
      </div>

      {/* Main Readiness Score Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#111317] to-[#0c0d0f] border border-zinc-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-mono-code text-zinc-400 uppercase tracking-wider">
            Composite Certification Score
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl md:text-5xl font-bold font-mono-code text-lime-400">
              {readiness.total_score}%
            </span>
            <span className={`text-xs font-mono-code font-semibold px-2.5 py-1 rounded border ${
              readiness.total_score >= 80
                ? 'bg-lime-400/10 text-lime-300 border-lime-400/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              {readiness.total_score >= 80 ? 'SYSTEM READY FOR BUILD' : 'ACTION REQUIRED'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-lg">
            Calculated as the weighted linear combination of 8 discrete verification dimensions. 
            All scores are derived mathematically from the live entity and relation graph.
          </p>
        </div>

        {/* Blockers alert box */}
        {readiness.blockers.length > 0 ? (
          <div className="w-full md:w-80 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold font-mono-code">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{readiness.blockers.length} CRITICAL BLOCKERS</span>
            </div>
            <ul className="space-y-1">
              {readiness.blockers.map((b, idx) => (
                <li key={idx} className="text-[11px] text-zinc-300 leading-snug">
                  • {b}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="w-full md:w-80 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold font-mono-code text-emerald-300">
                NO BLOCKERS DETECTED
              </div>
              <p className="text-[11px] text-zinc-400">
                All mandatory quality gates satisfied.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 8 Dimensions Detailed Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-zinc-200">Dimension Score Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(readiness.dimensions).map(([name, dim]) => {
            const pct = Math.round(dim.score * 100);
            return (
              <div
                key={name}
                className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-zinc-200">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code text-zinc-400">
                      Weight: {(dim.weight * 100).toFixed(0)}%
                    </span>
                    <span className="text-sm font-bold font-mono-code text-lime-400">{pct}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-zinc-800/90 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lime-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono-code">
                  <span>{dim.notes}</span>
                  <span className="text-[10px] text-zinc-500">
                    Weighted Contribution: {(dim.score * dim.weight * 100).toFixed(1)} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
