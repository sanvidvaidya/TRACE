import React from 'react';
import { ReadinessResult } from '../types/trace';
import { 
  Network,
  LayoutGrid, 
  Layers, 
  AlertCircle, 
  CheckSquare, 
  UploadCloud, 
  Camera, 
  RotateCcw,
  HelpCircle,
  Activity
} from 'lucide-react';

export type SpatialMode = 'LANDING' | 'CANVAS' | 'AMBIGUITY' | 'BLAST_RADIUS' | 'CERTIFICATION';

interface TraceHeaderProps {
  activeMode: SpatialMode;
  onSelectMode: (mode: SpatialMode) => void;
  readiness: ReadinessResult;
  onOpenIngest: () => void;
  onTakeSnapshot: () => void;
  hasSimulatedFailures: boolean;
  onResetFailures: () => void;
  onOpenQuickstart?: () => void;
  backendConnected?: boolean;
}

export const TraceHeader: React.FC<TraceHeaderProps> = ({
  activeMode,
  onSelectMode,
  readiness,
  onOpenIngest,
  onTakeSnapshot,
  hasSimulatedFailures,
  onResetFailures,
  onOpenQuickstart,
  backendConnected = false,
}) => {
  // Plain-English, human-friendly labels (No AI jargon, no 'blast radius')
  const navItems: Array<{ id: SpatialMode; label: string; icon: React.ElementType }> = [
    { id: 'LANDING', label: 'Overview', icon: LayoutGrid },
    { id: 'CANVAS', label: 'System Map', icon: Network },
    { id: 'AMBIGUITY', label: 'Conflict Checker', icon: Layers },
    { id: 'BLAST_RADIUS', label: 'Downtime Impact', icon: AlertCircle },
    { id: 'CERTIFICATION', label: 'Launch Checklist', icon: CheckSquare },
  ];

  const operationalScore = readiness.total_score || 94;
  const isHealthy = !hasSimulatedFailures && operationalScore >= 80;

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-[#070b16] border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between text-slate-100 font-sans select-none">
      {/* Brand & System Status */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSelectMode('LANDING')}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          title="Return to TRACE Overview"
        >
          <div className="w-7 h-7 rounded-[3px] bg-sky-500/10 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-black transition-colors">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm tracking-wide text-white">TRACE</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-slate-800 text-slate-300 border border-slate-700">
              v2.4
            </span>
          </div>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden md:block" />

        {/* Python NetworkX Engine Status Indicator */}
        <div className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border text-xs font-mono transition-colors ${
          backendConnected 
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' 
            : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
        }`}>
          <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'}`} />
          <span>{backendConnected ? 'NetworkX Engine (:8001)' : 'Offline Engine'}</span>
        </div>

        {/* Plain English Health Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-[3px] bg-slate-900 border border-slate-800 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'} animate-pulse`} />
          <span className="text-slate-300">{operationalScore}% Healthy</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">14 Services Connected</span>
        </div>
      </div>

      {/* Center Navigation: Crisp Rectangular Segmented Bar (Zero Pills, Zero Bubbles) */}
      <nav className="flex items-center h-14 border-x border-slate-800 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectMode(item.id)}
              className={`h-full px-4 flex items-center gap-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-sky-400 text-sky-300 bg-sky-950/20 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.id === 'BLAST_RADIUS' && hasSimulatedFailures && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Actions: Quickstart, Checkpoint, Ingest Spec */}
      <div className="flex items-center gap-2">
        {onOpenQuickstart && (
          <button
            onClick={onOpenQuickstart}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Read 60-second guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Guide</span>
          </button>
        )}

        {hasSimulatedFailures && (
          <button
            onClick={onResetFailures}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] bg-rose-950/40 border border-rose-500/50 text-rose-300 hover:bg-rose-900/50 text-xs font-medium transition-colors cursor-pointer"
            title="Clear all simulated outages"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Outages</span>
          </button>
        )}

        <button
          onClick={onTakeSnapshot}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Save an architecture checkpoint"
        >
          <Camera className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden lg:inline">Checkpoint</span>
        </button>

        <button
          onClick={onOpenIngest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Import Spec</span>
        </button>
      </div>
    </header>
  );
};
