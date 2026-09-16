import React from 'react';
import { BookOpen, ShieldCheck, Binary, GitMerge, FileCode, CheckCircle2 } from 'lucide-react';

export const Screen14Methodology: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono-code text-[11px] mb-2 border border-zinc-700">
          <span>14 // EPISTEMIC ARCHITECTURE & METHODOLOGY</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          The Non-AI Manifesto: Principles of Deterministic Systems Governance
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Why generative AI cannot be trusted to certify software architecture without mathematically verifiable ground truth.
        </p>
      </div>

      {/* Manifesto Principles Grid */}
      <div className="space-y-4">
        <div className="p-6 rounded-2xl bg-[#0f1013] border border-zinc-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">
              1. Strict Epistemic Separation
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Organizational knowledge is categorized into four immutable epistemic tiers:{' '}
            <strong className="text-zinc-200">Source Facts</strong> (ground truth telemetry),{' '}
            <strong className="text-zinc-200">Normalized Interpretations</strong> (structured specifications),{' '}
            <strong className="text-zinc-200">Hypothesized Inferences</strong> (algorithmic predictions), and{' '}
            <strong className="text-zinc-200">Recommendations</strong>. Generative AI is barred from promoting an inference
            to a verified fact without explicit human cryptographic signature.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0f1013] border border-zinc-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400">
              <Binary className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">
              2. Deterministic Governance
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Readiness scores (0-100%), contradiction detection, and ambiguity flags are computed by deterministic
            graph algorithms and rule matrices - never by black-box LLM estimations. Every score is mathematically
            reproducible, explainable, and provable.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0f1013] border border-zinc-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <GitMerge className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">
              3. Bidirectional Traceability
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Every system component, database dependency, and Given-When-Then test suite maintains a verifiable relational link
            back to its originating business outcome. Orphaned code and untested requirements are instantly flagged as structural defects.
          </p>
        </div>
      </div>
    </div>
  );
};
