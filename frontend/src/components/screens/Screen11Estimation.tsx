import React, { useState } from 'react';
import { TraceNode } from '../../types/trace';
import { calculateEstimation } from '../../lib/readinessEngine';
import { Calculator, Calendar, DollarSign, Server, Clock } from 'lucide-react';

interface Screen11EstimationProps {
  nodes: TraceNode[];
}

export const Screen11Estimation: React.FC<Screen11EstimationProps> = ({ nodes }) => {
  const [velocity, setVelocity] = useState<number>(22);
  const [hourlyRate, setHourlyRate] = useState<number>(160);

  const reqs = nodes.filter((n) => n.node_type === 'REQUIREMENT');
  const comps = nodes.filter((n) => n.node_type === 'SYSTEM_COMPONENT');

  const sizing = calculateEstimation(reqs, comps, velocity, hourlyRate);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-500/10 text-lime-300 font-mono-code text-[11px] mb-2 border border-lime-500/20">
          <span>11 // SPRINT SIZING & CLOUD ESTIMATION</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Algorithmic Sprint Sizing & Total Cost of Ownership
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Parametric software estimation derived directly from Given-When-Then criteria complexity.
        </p>
      </div>

      {/* Interactive Sliders */}
      <div className="p-6 rounded-2xl bg-[#0f1013] border border-zinc-800 space-y-6">
        <h3 className="text-sm font-semibold text-zinc-200">Delivery Velocity & Rate Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">Team Velocity per 2-Week Sprint:</span>
              <span className="font-mono-code text-lime-400 font-bold">{velocity} pts / sprint</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="2"
              value={velocity}
              onChange={(e) => setVelocity(Number(e.target.value))}
              className="w-full accent-lime-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono-code">
              <span>10 pts (Small Squad)</span>
              <span>50 pts (Full Enterprise Pod)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">Blended Engineering Rate:</span>
              <span className="font-mono-code text-lime-400 font-bold">${hourlyRate} / hr</span>
            </div>
            <input
              type="range"
              min="80"
              max="280"
              step="10"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full accent-lime-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono-code">
              <span>$80/hr (Nearshore)</span>
              <span>$280/hr (Principal US)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#0f1013] border border-zinc-800 space-y-2">
          <span className="text-[10px] font-mono-code text-zinc-500 uppercase">Story Points Total</span>
          <p className="text-3xl font-bold font-mono-code text-zinc-100">
            {sizing.total_story_points} <span className="text-xs text-zinc-500 font-normal">pts</span>
          </p>
          <p className="text-xs text-zinc-400">{reqs.length} functional requirements</p>
        </div>

        <div className="p-5 rounded-xl bg-[#0f1013] border border-zinc-800 space-y-2">
          <span className="text-[10px] font-mono-code text-zinc-500 uppercase">Estimated Delivery</span>
          <p className="text-3xl font-bold font-mono-code text-lime-400">
            {sizing.estimated_sprints} <span className="text-xs text-zinc-500 font-normal">sprints</span>
          </p>
          <p className="text-xs text-zinc-400">~{sizing.estimated_calendar_weeks} calendar weeks</p>
        </div>

        <div className="p-5 rounded-xl bg-[#0f1013] border border-zinc-800 space-y-2">
          <span className="text-[10px] font-mono-code text-zinc-500 uppercase">Monthly Cloud Infra</span>
          <p className="text-3xl font-bold font-mono-code text-amber-400">
            ${sizing.monthly_infra_cost.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">/mo</span>
          </p>
          <p className="text-xs text-zinc-400">{comps.length} cloud components</p>
        </div>

        <div className="p-5 rounded-xl bg-[#0f1013] border border-zinc-800 space-y-2">
          <span className="text-[10px] font-mono-code text-zinc-500 uppercase">Estimated Build Budget</span>
          <p className="text-3xl font-bold font-mono-code text-lime-400">
            ${sizing.estimatedCost.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-400">Fixed labor projection</p>
        </div>
      </div>
    </div>
  );
};
