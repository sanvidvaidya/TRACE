import React, { useState } from 'react';
import { TraceNode } from '../../types/trace';
import { CheckCircle2, Play, Check, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Screen08AcceptanceTestsProps {
  nodes: TraceNode[];
  onSelectNode: (node: TraceNode) => void;
  onUpdateTestStatus: (testId: string, status: 'PASSED' | 'FAILED' | 'PENDING') => void;
}

export const Screen08AcceptanceTests: React.FC<Screen08AcceptanceTestsProps> = ({
  nodes,
  onSelectNode,
  onUpdateTestStatus,
}) => {
  const tests = nodes.filter((n) => n.node_type === 'TEST_CASE');
  const [isRunningAll, setIsRunningAll] = useState(false);

  const passedCount = tests.filter((t) => t.test_status === 'PASSED').length;
  const passRate = tests.length > 0 ? Math.round((passedCount / tests.length) * 100) : 100;

  const handleRunAll = () => {
    setIsRunningAll(true);
    let delay = 0;
    tests.forEach((t, idx) => {
      setTimeout(() => {
        onUpdateTestStatus(t.id, 'PASSED');
        if (idx === tests.length - 1) {
          setIsRunningAll(false);
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#bef264', '#10b981', '#e4f222'],
          });
        }
      }, delay);
      delay += 350;
    });
  };

  const handleResetAll = () => {
    tests.forEach((t) => {
      onUpdateTestStatus(t.id, 'PENDING');
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-mono-code text-[11px] mb-2 border border-teal-500/20">
            <span>08 // ACCEPTANCE VERIFICATION</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
            Executable Acceptance Verification Suite
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Deterministic Given-When-Then behavioral criteria linked back to originating requirements.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetAll}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-mono-code flex items-center gap-1.5 pressable transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="px-4 py-1.5 rounded-lg bg-teal-500 text-black font-semibold text-xs font-mono-code flex items-center gap-1.5 hover:bg-teal-400 pressable transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)] disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunningAll ? 'Executing Suite...' : 'Run All Tests'}</span>
          </button>
        </div>
      </div>

      {/* Progress & Pass Rate Banner */}
      <div className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-zinc-400 font-mono-code">SUITE PASS RATE</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono-code text-teal-400">{passRate}%</span>
            <span className="text-xs text-zinc-500 font-mono-code">
              ({passedCount}/{tests.length} tests verified)
            </span>
          </div>
        </div>

        <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-400 rounded-full transition-all duration-300"
            style={{ width: `${passRate}%` }}
          />
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {tests.map((t) => {
          const isPassed = t.test_status === 'PASSED';
          return (
            <div
              key={t.id}
              className={`p-4 rounded-xl border transition-all ${
                isPassed
                  ? 'bg-[#0b1210] border-teal-500/30'
                  : 'bg-[#0f1013] border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                  <span
                    onClick={() => onSelectNode(t)}
                    className="font-mono-code font-bold text-teal-400 text-xs cursor-pointer hover:underline"
                  >
                    {t.id}
                  </span>
                  {t.requirement_id && (
                    <span className="px-2 py-0.5 rounded bg-lime-400/10 text-lime-300 border border-lime-400/20 font-mono-code text-[10px]">
                      VERIFIES {t.requirement_id}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-mono-code text-[10px] border ${
                      isPassed
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {t.test_status || 'PENDING'}
                  </span>

                  <button
                    onClick={() => onUpdateTestStatus(t.id, isPassed ? 'PENDING' : 'PASSED')}
                    className={`px-2.5 py-1 rounded text-xs font-mono-code flex items-center gap-1 pressable transition-all ${
                      isPassed
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30'
                    }`}
                  >
                    {isPassed ? <RotateCcw className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isPassed ? 'Reset' : 'Execute'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 space-y-2">
                <h4 className="text-sm font-semibold text-zinc-200">{t.title}</h4>

                {/* Given When Then formatting */}
                <div className="space-y-1 font-mono-code text-xs bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                  {t.given && (
                    <div>
                      <span className="text-lime-400 font-bold">GIVEN:</span>{' '}
                      <span className="text-zinc-300">{t.given}</span>
                    </div>
                  )}
                  {t.when && (
                    <div>
                      <span className="text-amber-400 font-bold">WHEN:</span>{' '}
                      <span className="text-zinc-300">{t.when}</span>
                    </div>
                  )}
                  {t.then && (
                    <div>
                      <span className="text-emerald-400 font-bold">THEN:</span>{' '}
                      <span className="text-zinc-300">{t.then}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
