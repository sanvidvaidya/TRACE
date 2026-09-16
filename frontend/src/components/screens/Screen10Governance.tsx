import React from 'react';
import { TraceNode } from '../../types/trace';
import { ShieldAlert, ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface Screen10GovernanceProps {
  nodes: TraceNode[];
  onSelectNode: (node: TraceNode) => void;
}

export const Screen10Governance: React.FC<Screen10GovernanceProps> = ({
  nodes,
  onSelectNode,
}) => {
  const dataSources = nodes.filter((n) => n.node_type === 'DATA_SOURCE');

  const complianceFrameworks = [
    { name: 'SOC 2 Type II', score: 92, status: 'CERTIFIED', color: 'text-emerald-400' },
    { name: 'GDPR / CCPA Data Privacy', score: 88, status: 'COMPLIANT', color: 'text-emerald-400' },
    { name: 'HIPAA Security Rule', score: 78, status: 'REVIEW_REQUIRED', color: 'text-amber-400' },
    { name: 'ISO 27001 ISMS', score: 94, status: 'CERTIFIED', color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono-code text-[11px] mb-2 border border-blue-500/20">
          <span>10 // SECURITY & GOVERNANCE</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Data Governance, Privacy Exposure & Compliance Scorecard
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Cryptographic privacy audit, PII blast-radius assessment, and regulatory policy mapping.
        </p>
      </div>

      {/* Compliance Framework Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {complianceFrameworks.map((cf) => (
          <div
            key={cf.name}
            className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 space-y-2"
          >
            <div className="text-xs text-zinc-400 font-medium truncate">{cf.name}</div>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono-code ${cf.color}`}>
                {cf.score}%
              </span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {cf.status}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full"
                style={{ width: `${cf.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Data Source Inventory Table */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-200">Cataloged Enterprise Data Stores</h3>
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#0f1013]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141518] text-zinc-400 font-mono-code text-[11px] border-b border-zinc-800">
              <tr>
                <th className="p-3">SOURCE ID</th>
                <th className="p-3">SYSTEM OF RECORD</th>
                <th className="p-3">UPDATE CADENCE</th>
                <th className="p-3">PROTOCOL</th>
                <th className="p-3">PII SENSITIVITY</th>
                <th className="p-3">CONFIRMED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {dataSources.map((ds) => (
                <tr
                  key={ds.id}
                  onClick={() => onSelectNode(ds)}
                  className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-mono-code text-lime-400 font-bold">{ds.id}</td>
                  <td className="p-3 font-medium text-zinc-200">
                    {ds.system_of_record || ds.title}
                  </td>
                  <td className="p-3 font-mono-code text-zinc-400">
                    {ds.update_frequency || 'Batch Scheduled'}
                  </td>
                  <td className="p-3 font-mono-code text-zinc-400">
                    {ds.access_protocol || 'REST API'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-mono-code text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {ds.contains_pii !== false ? 'CONFIDENTIAL / PII' : 'NON-PII'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-mono-code text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
