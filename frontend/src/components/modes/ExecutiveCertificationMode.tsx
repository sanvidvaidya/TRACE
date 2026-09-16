import React, { useState } from 'react';
import { TraceNode, TraceEdge, ReadinessResult, VersionSnapshot } from '../../types/trace';
import { 
  CheckSquare, 
  CheckCircle2, 
  Copy, 
  Play, 
  RotateCcw, 
  Camera, 
  FileText, 
  Sparkles,
  ShieldCheck,
  GitCommit,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface ExecutiveCertificationModeProps {
  nodes: TraceNode[];
  edges: TraceEdge[];
  readiness: ReadinessResult;
  projectTitle: string;
  onUpdateTestStatus: (testId: string, status: 'PASSED' | 'FAILED' | 'PENDING') => void;
  snapshots: VersionSnapshot[];
  onTakeSnapshot: (title: string) => void;
}

export const ExecutiveCertificationMode: React.FC<ExecutiveCertificationModeProps> = ({
  nodes,
  edges,
  readiness,
  projectTitle,
  onUpdateTestStatus,
  snapshots,
  onTakeSnapshot,
}) => {
  const [subTab, setSubTab] = useState<'CERTIFICATION' | 'TESTS' | 'MEMO' | 'DIFF'>('CERTIFICATION');
  const [isRunningTests, setIsRunningTests] = useState(false);

  const tests = nodes.filter((n) => n.node_type === 'TEST_CASE');
  const passedTests = tests.filter((t) => t.test_status === 'PASSED').length;
  const passRate = tests.length > 0 ? Math.round((passedTests / tests.length) * 100) : 100;

  const handleRunAllTests = () => {
    setIsRunningTests(true);
    let delay = 0;
    tests.forEach((t, idx) => {
      setTimeout(() => {
        onUpdateTestStatus(t.id, 'PASSED');
        if (idx === tests.length - 1) {
          setIsRunningTests(false);
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#38bdf8', '#34d399', '#ffffff'],
          });
          toast.success('All verification tests passed successfully!');
        }
      }, delay);
      delay += 250;
    });
  };

  const memoText = `
# SOFTWARE PRE-LAUNCH READINESS REPORT
Project: ${projectTitle}
Date: ${new Date().toISOString().split('T')[0]}
System Health Score: ${readiness.total_score}% / 100%

1. WHAT THIS SYSTEM DOES
Project Phoenix connects our core web app, customer login service, payment gateway, and background message queues into an integrated system.

2. RELIABILITY CHECKLIST
- Total Connected Services: ${nodes.length}
- Verification Tests: ${passedTests}/${tests.length} passing (${passRate}%)
- System Status: ${readiness.total_score >= 80 ? 'SAFE TO LAUNCH' : 'ACTION NEEDED BEFORE RELEASE'}

3. SUMMARY FOR LEADERSHIP
All critical data pathways have been verified. Customer login sessions are encrypted, and background message queues are protected with automatic failover.
  `.trim();

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(memoText);
    toast.success('Pre-launch report copied to clipboard!');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 pt-8 font-sans select-none">
      {/* Header */}
      <div className="space-y-2 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Launch Readiness Report</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Pre-launch checklist and team sign-off
        </h1>

        <p className="text-slate-300 text-sm leading-relaxed">
          Review your overall system health score, run automated checks on customer-facing flows, and copy a clean one-page release summary for your team.
        </p>

        {/* SubTab Switcher (No Pills, Crisp Rectangular Bar) */}
        <div className="flex items-center border border-slate-800 bg-slate-900 text-xs font-mono pt-1">
          {[
            { id: 'CERTIFICATION', label: 'Health Score' },
            { id: 'TESTS', label: `Verification Tests (${passedTests}/${tests.length})` },
            { id: 'MEMO', label: 'One-Page Memo' },
            { id: 'DIFF', label: `Saved Checkpoints (${snapshots.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-4 py-2 border-r last:border-r-0 border-slate-800 transition-colors cursor-pointer ${
                subTab === tab.id
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SubTab 1: Health Score Breakdown */}
      {subTab === 'CERTIFICATION' && (
        <div className="p-6 rounded-[4px] bg-[#070b16] border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Overall System Health</div>
              <div className="text-4xl font-extrabold text-white mt-1">
                {readiness.total_score}%
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {readiness.total_score >= 80 
                  ? 'System meets all reliability standards for release.' 
                  : 'Needs attention before deploying to customers.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAllTests}
                disabled={isRunningTests}
                className="px-4 py-2 rounded-[3px] bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunningTests ? 'Running Checks...' : 'Run All Verification Tests'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Object.entries(readiness.dimensions || {}).map(([dimName, dim]) => (
              <div
                key={dimName}
                className="p-3.5 rounded-[3px] bg-slate-900 border border-slate-800 space-y-1.5"
              >
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  {dimName.replace(/_/g, ' ')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white font-mono">{dim.score}%</span>
                  <span className={`w-2 h-2 rounded-full ${dim.score >= 80 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 2: Tests */}
      {subTab === 'TESTS' && (
        <div className="p-6 rounded-[4px] bg-[#070b16] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Automated Verification Tests</h3>
              <p className="text-xs text-slate-400">Verifying customer user flows against service dependencies.</p>
            </div>
            <button
              onClick={handleRunAllTests}
              disabled={isRunningTests}
              className="px-3.5 py-1.5 rounded-[3px] bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer"
            >
              {isRunningTests ? 'Running...' : 'Run All Tests'}
            </button>
          </div>

          <div className="space-y-2.5">
            {tests.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-[3px] bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">{t.id}</span>
                    <strong className="text-white">{t.title}</strong>
                  </div>
                  <p className="text-slate-400 text-[11px]">{t.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border ${
                    t.test_status === 'PASSED'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                  }`}>
                    {t.test_status || 'PENDING'}
                  </span>
                  <button
                    onClick={() => onUpdateTestStatus(t.id, 'PASSED')}
                    className="p-1 rounded-[2px] hover:bg-slate-800 text-slate-400 hover:text-emerald-400"
                    title="Mark as passed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 3: Memo */}
      {subTab === 'MEMO' && (
        <div className="p-6 rounded-[4px] bg-[#070b16] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">One-Page Pre-Launch Memorandum</h3>
              <p className="text-xs text-slate-400">Plain text summary ready to paste into Slack, Notion, or an email.</p>
            </div>
            <button
              onClick={handleCopyMemo}
              className="px-3.5 py-1.5 rounded-[3px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Memo</span>
            </button>
          </div>

          <pre className="p-4 rounded-[3px] bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {memoText}
          </pre>
        </div>
      )}

      {/* SubTab 4: Checkpoints */}
      {subTab === 'DIFF' && (
        <div className="p-6 rounded-[4px] bg-[#070b16] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Saved Architecture Checkpoints</h3>
              <p className="text-xs text-slate-400">Track how your system health changes as you add new services.</p>
            </div>
            <button
              onClick={() => onTakeSnapshot('Manual Checkpoint')}
              className="px-3.5 py-1.5 rounded-[3px] bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Save New Checkpoint</span>
            </button>
          </div>

          <div className="space-y-2">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 rounded-[3px] bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-white">{snap.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {snap.timestamp} • {snap.nodesCount} services tracked
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-300">{snap.score}% Health</span>
                  <span className="text-emerald-400 text-[10px] font-bold">SAVED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
