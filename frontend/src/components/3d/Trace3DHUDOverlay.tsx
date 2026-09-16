import React from 'react';
import { CameraPreset } from './Trace3DTopologyCanvas';
import { 
  Box, 
  Orbit, 
  Layers, 
  Focus, 
  RotateCcw, 
  Radio, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert 
} from 'lucide-react';

interface Trace3DHUDOverlayProps {
  currentPreset: CameraPreset;
  onPresetSelect: (preset: CameraPreset) => void;
  scenario: 'NORMAL' | 'POSTGRES_DOWN' | 'STRIPE_LATENCY' | 'AUTH_DRIFT';
  onScenarioChange: (scenario: 'NORMAL' | 'POSTGRES_DOWN' | 'STRIPE_LATENCY' | 'AUTH_DRIFT') => void;
  selectedNodeId: string;
  className?: string;
}

export const Trace3DHUDOverlay: React.FC<Trace3DHUDOverlayProps> = ({
  currentPreset,
  onPresetSelect,
  scenario,
  onScenarioChange,
  selectedNodeId,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-[3px] bg-slate-900/90 border border-slate-800 text-xs font-mono ${className}`}>
      {/* Left: Viewport Camera Controls */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Orbit className="w-3.5 h-3.5 text-sky-400" />
          <span>Camera Mode:</span>
        </span>

        <div className="flex items-center gap-1 p-0.5 rounded-[2px] bg-slate-950 border border-slate-800">
          <button
            onClick={() => onPresetSelect('ISOMETRIC')}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              currentPreset === 'ISOMETRIC'
                ? 'bg-sky-500 text-black shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Box className="w-3 h-3" />
            <span>Isometric (45°)</span>
          </button>

          <button
            onClick={() => onPresetSelect('TOP_DOWN')}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              currentPreset === 'TOP_DOWN'
                ? 'bg-sky-500 text-black shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Top-Down (Blueprint)</span>
          </button>

          <button
            onClick={() => onPresetSelect('FOCUS_NODE')}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              currentPreset === 'FOCUS_NODE'
                ? 'bg-sky-500 text-black shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Focus className="w-3 h-3" />
            <span>Track: {selectedNodeId}</span>
          </button>
        </div>
      </div>

      {/* Right: 3D Outage Blast Injection Quick-Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Blast Simulation:</span>
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onScenarioChange('NORMAL')}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              scenario === 'NORMAL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>All Clear</span>
          </button>

          <button
            onClick={() => onScenarioChange('POSTGRES_DOWN')}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              scenario === 'POSTGRES_DOWN'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Sever DB (Postgres)</span>
          </button>

          <button
            onClick={() => onScenarioChange('STRIPE_LATENCY')}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              scenario === 'STRIPE_LATENCY'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Activity className="w-3 h-3 text-amber-400" />
            <span>Payment Delay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
