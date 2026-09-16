import React from 'react';
import { ReadinessResult } from '../types/trace';
import { 
  Terminal,
  Activity, 
  Cpu, 
  ShieldAlert, 
  CheckSquare, 
  UploadCloud, 
  Camera, 
  RotateCcw,
  Sliders
} from 'lucide-react';

export type SpatialMode = 'LANDING' | 'CANVAS' | 'AMBIGUITY' | 'BLAST_RADIUS' | 'CERTIFICATION';

interface AvionicsFlightHUDProps {
  activeMode: SpatialMode;
  onSelectMode: (mode: SpatialMode) => void;
  readiness: ReadinessResult;
  onOpenIngest: () => void;
  onTakeSnapshot: () => void;
  hasSimulatedFailures: boolean;
  onResetFailures: () => void;
}

export const AvionicsFlightHUD: React.FC<AvionicsFlightHUDProps> = ({
  activeMode,
  onSelectMode,
  readiness,
  onOpenIngest,
  onTakeSnapshot,
  hasSimulatedFailures,
  onResetFailures,
}) => {
  const modes: Array<{ id: SpatialMode; index: string; label: string; icon: React.ElementType }> = [
    { id: 'LANDING', index: '00', label: 'OVERVIEW', icon: Activity },
    { id: 'CANVAS', index: '01', label: 'CANVAS', icon: Cpu },
    { id: 'AMBIGUITY', index: '02', label: 'RADAR', icon: Sliders },
    { id: 'BLAST_RADIUS', index: '03', label: 'SIMULATOR', icon: ShieldAlert },
    { id: 'CERTIFICATION', index: '04', label: 'AUDIT', icon: CheckSquare },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-[#091124]/95 backdrop-blur-md border-b border-sky-400/20 px-3 sm:px-6 flex items-center justify-between text-slate-100 font-mono select-none">
      {/* Left: Tactical Callsign & Coordinate Telemetry */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSelectMode('LANDING')}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
        >
          <div className="w-7 h-7 rounded-[2px] bg-sky-950 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-black transition-colors">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-xs tracking-wider text-white">TRACE</span>
              <span className="text-[10px] text-sky-400 font-bold tracking-widest">// AVIONICS</span>
            </div>
            <div className="text-[9px] text-sky-300/60 tracking-tight hidden md:block">
              LAT: 47.37 // LON: 08.54 // BUF_OK
            </div>
          </div>
        </button>

        {/* Tactical Status LED Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-sky-950/60 border border-sky-400/20 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-none bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span className="text-sky-300/80 font-bold uppercase tracking-wider">TELEMETRY_ONLINE</span>
        </div>
      </div>

      {/* Center: Rack-Mount Mode Switches (Zero Pills, Flat Chamfered Tabs) */}
      <nav className="flex items-center gap-1 bg-[#060d1d] p-1 rounded-[3px] border border-sky-400/20">
        {modes.map((m) => {
          const isActive = activeMode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[2px] text-[11px] font-mono tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-500 text-slate-950 font-black shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                  : 'text-sky-200/70 hover:text-white hover:bg-sky-950/50'
              }`}
            >
              <span className={`text-[9px] ${isActive ? 'text-slate-950' : 'text-sky-400/60'}`}>
                [{m.index}]
              </span>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Telemetry Readiness Meter & Tactical Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Outage Warning Banner if active */}
        {hasSimulatedFailures && (
          <button
            onClick={onResetFailures}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-orange-950/80 border border-orange-500 text-orange-300 text-[10px] font-bold hover:bg-orange-500 hover:text-black transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">CLEAR_OUTAGE</span>
          </button>
        )}

        {/* Readiness Monospace Gauge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[#060d1d] border border-sky-400/25 text-[11px]">
          <span className="text-[10px] text-sky-400/70 uppercase">READINESS</span>
          <span className="font-black text-sky-300">[{readiness.total_score}%]</span>
          {/* 3-segment bar graph */}
          <div className="flex items-center gap-0.5">
            <span className={`w-1 h-3 rounded-none ${readiness.total_score > 30 ? 'bg-sky-400' : 'bg-slate-700'}`} />
            <span className={`w-1 h-3 rounded-none ${readiness.total_score > 60 ? 'bg-sky-400' : 'bg-slate-700'}`} />
            <span className={`w-1 h-3 rounded-none ${readiness.total_score > 85 ? 'bg-sky-400' : 'bg-slate-700'}`} />
          </div>
        </div>

        {/* Snapshot trigger */}
        <button
          onClick={onTakeSnapshot}
          title="Take system snapshot"
          className="p-1.5 rounded-[2px] bg-sky-950/80 border border-sky-400/30 text-sky-300 hover:bg-sky-500 hover:text-slate-950 transition-colors cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* Ingest trigger button */}
        <button
          onClick={onOpenIngest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.3)]"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">INGEST</span>
        </button>
      </div>
    </header>
  );
};

export const AppleDynamicIsland = AvionicsFlightHUD;
