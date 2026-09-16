import React from 'react';
import { PersonaLens, ReadinessResult } from '../types/trace';
import { 
  ShieldCheck, 
  Terminal, 
  Layers, 
  Sparkles, 
  Camera, 
  FileText,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

interface HeaderHUDProps {
  projectTitle: string;
  activeLens: PersonaLens;
  onSelectLens: (lens: PersonaLens) => void;
  readiness: ReadinessResult;
  onOpenCommandPalette: () => void;
  onTakeSnapshot: () => void;
  onExportMemo: () => void;
  hasSimulatedFailures: boolean;
  onResetSimulatedFailures: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  projectTitle,
  activeLens,
  onSelectLens,
  readiness,
  onOpenCommandPalette,
  onTakeSnapshot,
  onExportMemo,
  hasSimulatedFailures,
  onResetSimulatedFailures,
}) => {
  const lenses: Array<{ id: PersonaLens; label: string; icon: string }> = [
    { id: 'ALL_SYSTEMS', label: 'All Systems', icon: '⬡' },
    { id: 'EXECUTIVE', label: 'Executive', icon: '◈' },
    { id: 'ARCHITECT', label: 'Architect', icon: '⬢' },
    { id: 'QA_LEAD', label: 'QA Lead', icon: '✓' },
    { id: 'GOVERNANCE', label: 'Governance', icon: '🛡' },
  ];

  const scoreColor = 
    readiness.total_score >= 80 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
    readiness.total_score >= 60 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
    'text-rose-400 border-rose-500/30 bg-rose-500/10';

  return (
    <header className="sticky top-0 z-40 hairline-border-b bg-[#08090a]/90 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
      {/* Left: Branding and Project Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-lime-400/10 border border-lime-400/30 flex items-center justify-center font-mono-code text-lime-400 text-sm font-bold shadow-[0_0_12px_rgba(190,242,100,0.25)]">
            ⬡
          </div>
          <span className="font-semibold tracking-wider text-zinc-100 uppercase text-[11px] font-mono-code">TRACE</span>
          <span className="text-zinc-600 font-mono-code text-[11px]">/</span>
        </div>

        <div className="flex items-center gap-2 bg-[#141517] hairline-border px-2.5 py-1 rounded-md text-zinc-200 font-medium">
          <span>{projectTitle}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono-code">v1.2</span>
        </div>

        {hasSimulatedFailures && (
          <button
            onClick={onResetSimulatedFailures}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono-code animate-pulse hover:bg-rose-500/30 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>FAILURE ACTIVE (Click to Reset)</span>
          </button>
        )}
      </div>

      {/* Center: Persona Lens Switcher (Refero Segmented Pill) */}
      <div className="flex items-center bg-[#0f1011] p-0.5 rounded-lg hairline-border">
        {lenses.map((lens) => {
          const isActive = activeLens === lens.id;
          return (
            <button
              key={lens.id}
              onClick={() => onSelectLens(lens.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#1e2024] text-zinc-100 shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <span className="opacity-70 text-[10px]">{lens.icon}</span>
              <span>{lens.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Readiness Score Gauge & Quick Action Tooling */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141517] hairline-border text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 pressable transition-all"
          title="Open Command Palette (Ctrl+K or Cmd+K)"
        >
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-mono-code text-[11px]">⌘K</span>
        </button>

        <button
          onClick={onTakeSnapshot}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141517] hairline-border text-zinc-300 hover:text-lime-400 hover:border-lime-400/30 pressable transition-all font-mono-code"
          title="Save Snapshot Checkpoint"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Snapshot</span>
        </button>

        <button
          onClick={onExportMemo}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141517] hairline-border text-zinc-300 hover:text-lime-400 hover:border-lime-500/30 pressable transition-all font-mono-code"
          title="Executive Sign-Off Memo"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Memo</span>
        </button>

        {/* Live Readiness Indicator */}
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border font-mono-code ${scoreColor}`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span className="font-semibold text-xs">{readiness.total_score}%</span>
          <span className="text-[10px] opacity-75 uppercase">Readiness</span>
        </div>
      </div>
    </header>
  );
};
