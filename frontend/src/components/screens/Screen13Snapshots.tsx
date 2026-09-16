import React, { useState } from 'react';
import { VersionSnapshot, TraceNode, TraceEdge } from '../../types/trace';
import { Camera, History, ArrowRight, GitCommit, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Screen13SnapshotsProps {
  snapshots: VersionSnapshot[];
  onTakeSnapshot: (title: string) => void;
  currentNodes: TraceNode[];
  currentEdges: TraceEdge[];
  currentScore: number;
}

export const Screen13Snapshots: React.FC<Screen13SnapshotsProps> = ({
  snapshots,
  onTakeSnapshot,
  currentNodes,
  currentEdges,
  currentScore,
}) => {
  const [newSnapshotTitle, setNewSnapshotTitle] = useState('');
  const [baseSnapId, setBaseSnapId] = useState<string>(snapshots[0]?.id || '');
  const [compareSnapId, setCompareSnapId] = useState<string>(
    snapshots[snapshots.length - 1]?.id || ''
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotTitle.trim()) return;
    onTakeSnapshot(newSnapshotTitle.trim());
    setNewSnapshotTitle('');
    toast.success(`Snapshot '${newSnapshotTitle}' created successfully!`);
  };

  const baseSnap = snapshots.find((s) => s.id === baseSnapId) || snapshots[0];
  const compareSnap = snapshots.find((s) => s.id === compareSnapId) || snapshots[snapshots.length - 1];

  const nodeDiff = compareSnap && baseSnap ? compareSnap.nodesCount - baseSnap.nodesCount : 0;
  const scoreDiff = compareSnap && baseSnap ? compareSnap.score - baseSnap.score : 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono-code text-[11px] mb-2 border border-purple-500/20">
          <span>13 // VERSION SNAPSHOTS & DIFF</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Specification Revision Checkpoints & Structural Diff
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Capture point-in-time architecture snapshots and inspect delta evolution between design iterations.
        </p>
      </div>

      {/* Snapshot creation bar */}
      <div className="p-6 rounded-2xl bg-[#0f1013] border border-zinc-800 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200">Capture Live Specification Checkpoint</h3>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="e.g. v1.2 Post-Stakeholder Alignment"
            value={newSnapshotTitle}
            onChange={(e) => setNewSnapshotTitle(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 px-3.5 py-2 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lime-500"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-lime-400 text-black font-semibold text-xs font-mono-code flex items-center justify-center gap-1.5 hover:bg-lime-400 pressable transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Save Snapshot</span>
          </button>
        </form>
      </div>

      {/* Structural Diff Comparison */}
      {snapshots.length >= 2 && (
        <div className="p-6 rounded-2xl bg-[#111317] border border-zinc-800 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200">Structural Revision Diff Inspector</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-zinc-400 font-mono-code">Compare From (Base):</span>
              <select
                value={baseSnapId}
                onChange={(e) => setBaseSnapId(e.target.value)}
                className="w-full p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 font-mono-code focus:outline-none"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.timestamp})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-zinc-400 font-mono-code">Compare To (Target):</span>
              <select
                value={compareSnapId}
                onChange={(e) => setCompareSnapId(e.target.value)}
                className="w-full p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-lime-300 font-mono-code focus:outline-none"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.timestamp})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diff Result Card */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 font-mono-code text-xs">
            <div className="text-lime-400 font-bold">
              DIFF REPORT ({baseSnap?.title} ⟷ {compareSnap?.title})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-2.5 rounded bg-black/40 border border-zinc-800">
                <div className="text-zinc-500 text-[10px]">NODE DELTA</div>
                <div className={`text-base font-bold ${nodeDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {nodeDiff >= 0 ? `+${nodeDiff}` : nodeDiff} entities
                </div>
              </div>
              <div className="p-2.5 rounded bg-black/40 border border-zinc-800">
                <div className="text-zinc-500 text-[10px]">READINESS SCORE DELTA</div>
                <div className={`text-base font-bold ${scoreDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {scoreDiff >= 0 ? `+${scoreDiff.toFixed(1)}%` : `${scoreDiff.toFixed(1)}%`}
                </div>
              </div>
              <div className="p-2.5 rounded bg-black/40 border border-zinc-800">
                <div className="text-zinc-500 text-[10px]">STRUCTURAL STABILITY</div>
                <div className="text-base font-bold text-zinc-200">
                  {nodeDiff === 0 ? 'Stable Baseline' : 'Active Refactor'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkpoints History */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-200">Checkpoint History</h3>
        <div className="space-y-2">
          {snapshots.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-lime-400" />
                  <span className="text-sm font-semibold text-zinc-200">{s.title}</span>
                </div>
                <p className="text-xs text-zinc-500 font-mono-code">
                  Saved: {s.timestamp} • {s.nodesCount} Tracked Entities
                </p>
              </div>

              <div className="px-3 py-1 rounded-md bg-lime-400/10 border border-lime-400/30 text-lime-300 font-mono-code text-xs font-bold">
                {s.score}% Readiness
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
