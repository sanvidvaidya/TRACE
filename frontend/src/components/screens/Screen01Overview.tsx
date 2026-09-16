import React from 'react';
import { TraceNode } from '../../types/trace';
import { ScreenId } from '../SidebarNav';
import { Compass, TrendingDown, Target, Users, AlertCircle, ArrowRight } from 'lucide-react';

interface Screen01OverviewProps {
  nodes: TraceNode[];
  rawBrief: string;
  onNavigate: (screen: ScreenId) => void;
  onSelectNode: (node: TraceNode) => void;
}

export const Screen01Overview: React.FC<Screen01OverviewProps> = ({
  nodes,
  rawBrief,
  onNavigate,
  onSelectNode,
}) => {
  const problems = nodes.filter((n) => n.node_type === 'PROBLEM');
  const outcomes = nodes.filter((n) => n.node_type === 'BUSINESS_OUTCOME');
  const stakeholders = nodes.filter((n) => n.node_type === 'STAKEHOLDER');

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-400/10 text-lime-300 font-mono-code text-[11px] mb-2 border border-lime-400/20">
          <span>01 // SYSTEMS EXECUTIVE OVERVIEW</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Project Phoenix: Renewal Intelligence Executive Strategy
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Root cause analysis of B2B SaaS NRR degradation and quantifiable target turnaround metrics.
        </p>
      </div>

      {/* Trailing Performance Alert Banner */}
      <div className="p-6 rounded-2xl bg-[#0f1013] border border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
          <span className="text-[10px] font-mono-code text-zinc-400 uppercase">Trailing NRR Drop</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-code text-rose-400">91%</span>
            <span className="text-xs text-zinc-500 line-through font-mono-code">108% peak</span>
          </div>
          <p className="text-xs text-zinc-400">17% drop over trailing 4 quarters</p>
        </div>

        <div className="p-4 rounded-xl bg-lime-950/20 border border-lime-400/30 space-y-1">
          <span className="text-[10px] font-mono-code text-zinc-400 uppercase">Target Rebound</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-code text-lime-400">105%+</span>
            <span className="text-xs text-zinc-400 font-mono-code">Q4 Target</span>
          </div>
          <p className="text-xs text-zinc-400">Preventable churn intervention</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono-code text-zinc-400 uppercase">Lead Time Window</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-code text-zinc-100">&ge;60</span>
            <span className="text-xs text-zinc-400 font-mono-code">Days in Advance</span>
          </div>
          <p className="text-xs text-zinc-400">Runway for proactive CS intervention</p>
        </div>
      </div>

      {/* Raw Executive Brief Text */}
      <div className="p-6 rounded-2xl bg-[#0f1013] border border-zinc-800 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200">Raw Problem Narrative</h3>
        <p className="text-xs text-zinc-300 leading-relaxed font-mono-code bg-black/40 p-4 rounded-xl border border-zinc-800/80 whitespace-pre-line">
          {rawBrief}
        </p>
      </div>

      {/* Quantified Problems & Business Outcomes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Quantified Problems</span>
          </h3>
          <div className="space-y-2">
            {problems.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectNode(p)}
                className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 hover:border-rose-500/40 cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-code font-bold text-rose-400 text-xs">{p.id}</span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    PROBLEM
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-zinc-200">{p.title}</h4>
                <p className="text-xs text-zinc-400">{p.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Target className="w-4 h-4 text-lime-400" />
            <span>Target Business Outcomes</span>
          </h3>
          <div className="space-y-2">
            {outcomes.map((bo) => (
              <div
                key={bo.id}
                onClick={() => onSelectNode(bo)}
                className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 hover:border-lime-400/40 cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-code font-bold text-lime-400 text-xs">{bo.id}</span>
                  <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    OUTCOME
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-zinc-200">{bo.title}</h4>
                <p className="text-xs text-zinc-400">{bo.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
