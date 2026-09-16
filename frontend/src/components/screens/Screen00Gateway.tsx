import React from 'react';
import { ReadinessResult, TraceNode } from '../../types/trace';
import { ScreenId } from '../SidebarNav';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  FileSpreadsheet, 
  Award,
  Terminal
} from 'lucide-react';

interface Screen00GatewayProps {
  readiness: ReadinessResult;
  onNavigate: (screen: ScreenId) => void;
  nodes: TraceNode[];
}

export const Screen00Gateway: React.FC<Screen00GatewayProps> = ({
  readiness,
  onNavigate,
  nodes,
}) => {
  const reqCount = nodes.filter((n) => n.node_type === 'REQUIREMENT').length;
  const compCount = nodes.filter((n) => n.node_type === 'SYSTEM_COMPONENT').length;
  const testCount = nodes.filter((n) => n.node_type === 'TEST_CASE').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Hero Banner with Refero Linear dark gradient */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-[#121417] to-[#0a0b0d] p-8 md:p-10 shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-300 font-mono-code text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
              <span>PROJECT PHOENIX - RENEWAL INTELLIGENCE SYSTEM</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
              Turn Unstructured Ambiguity into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-teal-300 to-lime-300">
                Verifiable Systems
              </span>
            </h1>

            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              Deterministic systems workbench bridging executive strategy and production architecture. 
              Eliminate software delivery failure by enforcing bidirectional traceability, resolving hidden contradictions, 
              and certifying readiness before code is written.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('01_OVERVIEW')}
                className="px-4 py-2 rounded-lg bg-lime-400 text-black font-semibold text-xs flex items-center gap-2 hover:bg-lime-400 pressable transition-all shadow-[0_0_20px_rgba(190,242,100,0.3)]"
              >
                <span>Explore Phoenix Brief</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('04_REQUIREMENTS')}
                className="px-4 py-2 rounded-lg bg-[#181a1f] border border-zinc-700 text-zinc-200 font-medium text-xs flex items-center gap-2 hover:bg-zinc-800 pressable transition-all"
              >
                <span>Inspect Ambiguity Resolvers</span>
              </button>

              <button
                onClick={() => onNavigate('06_TRACEABILITY_GRAPH')}
                className="px-4 py-2 rounded-lg bg-[#181a1f] border border-zinc-700 text-zinc-200 font-medium text-xs flex items-center gap-2 hover:bg-zinc-800 pressable transition-all"
              >
                <span>Open Trace Graph</span>
              </button>
            </div>
          </div>

          {/* Radial Readiness Score Dial */}
          <div className="shrink-0 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0e1013]/80 border border-zinc-800 backdrop-blur-md w-64 shadow-xl">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={readiness.total_score >= 80 ? '#bef264' : '#f59e0b'}
                  strokeWidth="8"
                  strokeDasharray={`${(readiness.total_score / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold font-mono-code text-zinc-100">
                  {readiness.total_score}%
                </span>
                <span className="text-[10px] font-mono-code text-zinc-400 uppercase tracking-widest">
                  Readiness
                </span>
              </div>
            </div>

            <div className="mt-4 text-center space-y-1">
              <span className={`text-xs font-mono-code font-semibold px-2 py-0.5 rounded border ${
                readiness.total_score >= 80 ? 'bg-lime-400/10 text-lime-300 border-lime-400/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {readiness.total_score >= 80 ? 'SYSTEM CERTIFIED' : 'CONDITIONAL READINESS'}
              </span>
              <p className="text-[11px] text-zinc-400 pt-1">
                {readiness.blockers.length === 0 
                  ? 'Zero architectural blockers detected.' 
                  : `${readiness.blockers.length} governance blockers pending.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 8-Factor Dimension Pulse Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-200">8-Factor Implementation Diagnostics</h2>
            <p className="text-xs text-zinc-500">Deterministic scoring weights across all systems engineering dimensions</p>
          </div>
          <button
            onClick={() => onNavigate('09_READINESS_ENGINE')}
            className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1 font-mono-code"
          >
            <span>Full Diagnostic Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(readiness.dimensions).map(([name, dim]) => {
            const pct = Math.round(dim.score * 100);
            return (
              <div
                key={name}
                className="p-3.5 rounded-xl bg-[#0f1013] border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300">{name}</span>
                  <span className="font-mono-code text-lime-400 font-semibold">{pct}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-lime-400 to-lime-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono-code pt-0.5">
                  <span>Weight: {(dim.weight * 100).toFixed(0)}%</span>
                  <span className="truncate max-w-[120px]" title={dim.notes}>{dim.notes}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Access Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigate('02_INGESTION')}
          className="p-5 rounded-xl bg-[#0f1012] border border-zinc-800 hover:border-lime-400/40 cursor-pointer transition-all group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-lime-300 transition-colors">
            Upload & Ingest Specifications
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ingest PRDs, CSV requirements, or JSON schemas to automatically extract traceable entities and edges.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('07_ARCHITECTURE')}
          className="p-5 rounded-xl bg-[#0f1012] border border-zinc-800 hover:border-amber-500/40 cursor-pointer transition-all group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors">
            What-If Blast Radius Simulator
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Simulate outages across CRM, Snowflake, or Zendesk and observe cascading failure across downstream requirements.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('12_EXECUTIVE_MEMO')}
          className="p-5 rounded-xl bg-[#0f1012] border border-zinc-800 hover:border-lime-500/40 cursor-pointer transition-all group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 group-hover:scale-105 transition-transform">
            <Award className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-lime-300 transition-colors">
            Executive Sign-Off Memo
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Generate an audit-proof implementation memorandum ready for VP Engineering and executive sponsorship sign-off.
          </p>
        </div>
      </div>
    </div>
  );
};
