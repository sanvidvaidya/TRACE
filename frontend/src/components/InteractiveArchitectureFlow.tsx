import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  ShieldCheck, 
  CreditCard, 
  Radio, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Layers,
  Lock,
  HardDrive
} from 'lucide-react';

interface ServiceNode {
  id: string;
  name: string;
  category: 'GATEWAY' | 'SERVICE' | 'DATA';
  status: 'HEALTHY' | 'WARNING' | 'FAILED';
  statusText: string;
  latency: string;
  owner: string;
  hasPii: boolean;
  hasReplica: boolean;
  summary: string;
  dependencies: string[];
}

export const InteractiveArchitectureFlow: React.FC = () => {
  // Active selected node
  const [selectedId, setSelectedId] = useState<string>('SYS-DB');
  const [isDbOutageActive, setIsDbOutageActive] = useState<boolean>(false);

  const services: ServiceNode[] = [
    {
      id: 'SYS-AUTH',
      name: 'Auth0 Identity Gateway',
      category: 'GATEWAY',
      status: 'HEALTHY',
      statusText: 'Operational',
      latency: '14ms',
      owner: 'SecOps Team',
      hasPii: true,
      hasReplica: true,
      summary: 'Verifies user logins and signs temporary access tokens. Does not store plain text passwords.',
      dependencies: ['SYS-CORE'],
    },
    {
      id: 'SYS-CORE',
      name: 'Phoenix Core API',
      category: 'SERVICE',
      status: isDbOutageActive ? 'WARNING' : 'HEALTHY',
      statusText: isDbOutageActive ? 'Slow Responses' : 'Operational',
      latency: isDbOutageActive ? '450ms' : '28ms',
      owner: 'Platform Team',
      hasPii: false,
      hasReplica: true,
      summary: 'Main web engine that handles user clicks and orders. Scales across three cloud regions.',
      dependencies: ['SYS-DB', 'SYS-STRIPE', 'SYS-REDIS', 'SYS-KAFKA'],
    },
    {
      id: 'SYS-STRIPE',
      name: 'Stripe Billing Gateway',
      category: 'SERVICE',
      status: 'WARNING',
      statusText: 'Needs Retry Cap',
      latency: '85ms',
      owner: 'Billing Core',
      hasPii: true,
      hasReplica: true,
      summary: 'Charges customer cards. When card networks slow down, retries need a hard stop to prevent memory pileups.',
      dependencies: ['SYS-DB'],
    },
    {
      id: 'SYS-DB',
      name: 'Primary Postgres Database',
      category: 'DATA',
      status: isDbOutageActive ? 'FAILED' : 'WARNING',
      statusText: isDbOutageActive ? 'Offline (Simulated)' : 'No Backup Copy',
      latency: isDbOutageActive ? 'Unreachable' : '8ms',
      owner: 'Data Infrastructure',
      hasPii: true,
      hasReplica: false,
      summary: 'Stores customer account records and paid orders. Currently has no backup server ready to take over if it fails.',
      dependencies: [],
    },
    {
      id: 'SYS-REDIS',
      name: 'Redis Fast Memory Cache',
      category: 'DATA',
      status: 'HEALTHY',
      statusText: 'Operational',
      latency: '2ms',
      owner: 'Platform Team',
      hasPii: false,
      hasReplica: true,
      summary: 'Answers 82% of read requests directly from memory so the main database does not get overwhelmed.',
      dependencies: [],
    },
    {
      id: 'SYS-KAFKA',
      name: 'Kafka Message Queue',
      category: 'DATA',
      status: 'HEALTHY',
      statusText: 'Operational',
      latency: '5ms',
      owner: 'Event Infra',
      hasPii: false,
      hasReplica: true,
      summary: 'Holds background jobs and order notifications so they can be processed safely without slowing down the site.',
      dependencies: [],
    },
  ];

  const selectedNode = services.find((s) => s.id === selectedId) || services[3];

  return (
    <div className="w-full rounded-[4px] border border-slate-800 bg-[#080d1a] p-5 sm:p-6 shadow-xl relative overflow-hidden select-none">
      
      {/* Top Controller Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-xs font-mono font-bold tracking-wide text-sky-400 uppercase">
              Live Software Map & Dependency Graph
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click any service to inspect its connections, health, and customer impact.
          </p>
        </div>

        {/* Sharp Outage Simulator Button (No Pills!) */}
        <button
          onClick={() => {
            setIsDbOutageActive((prev) => !prev);
            setSelectedId('SYS-DB');
          }}
          className={`px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
            isDbOutageActive
              ? 'bg-rose-950/60 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${isDbOutageActive ? 'text-rose-400' : 'text-amber-400'}`} />
          <span>{isDbOutageActive ? 'Restore Database (End Test)' : 'Simulate Database Outage'}</span>
        </button>
      </div>

      {/* Outage Impact Banner if active */}
      {isDbOutageActive && (
        <div className="mt-4 p-3 rounded-[3px] bg-rose-950/40 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Downtime Impact:</strong> The primary database is offline. Customer checkouts and new signups are paused. Redis cache and Auth0 remain online for existing visitors.
            </span>
          </div>
          <span className="font-mono text-[11px] text-rose-400 uppercase font-bold shrink-0 bg-rose-950 px-2 py-0.5 rounded-[2px] border border-rose-700/50">
            2 Services Affected
          </span>
        </div>
      )}

      {/* Main Architecture Diagram & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-start">
        
        {/* Visual Architecture Graph (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Customer Logins & Gateways</span>
            <span className="text-slate-500">Tier 1</span>
          </div>

          {/* Tier 1 Node */}
          <div
            onClick={() => setSelectedId('SYS-AUTH')}
            className={`p-3 rounded-[4px] border transition-all cursor-pointer flex items-center justify-between ${
              selectedId === 'SYS-AUTH'
                ? 'bg-slate-900 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-[3px] bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Auth0 Identity Gateway</div>
                <div className="text-[10px] text-slate-400 font-mono">User Login & Security</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-slate-400">14ms</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Connection Vector */}
          <div className="flex justify-center py-0.5">
            <div className="w-0.5 h-3 bg-slate-700" />
          </div>

          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Application Logic & Payments</span>
            <span className="text-slate-500">Tier 2</span>
          </div>

          {/* Tier 2 Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              onClick={() => setSelectedId('SYS-CORE')}
              className={`p-3 rounded-[4px] border transition-all cursor-pointer flex items-center justify-between ${
                selectedId === 'SYS-CORE'
                  ? 'bg-slate-900 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[3px] bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Server className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Phoenix Core API</div>
                  <div className="text-[10px] text-slate-400 font-mono">Main App Engine</div>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full ${isDbOutageActive ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            </div>

            <div
              onClick={() => setSelectedId('SYS-STRIPE')}
              className={`p-3 rounded-[4px] border transition-all cursor-pointer flex items-center justify-between ${
                selectedId === 'SYS-STRIPE'
                  ? 'bg-slate-900 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[3px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Stripe Billing</div>
                  <div className="text-[10px] text-slate-400 font-mono">Credit Card Payments</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
          </div>

          {/* Connection Vector */}
          <div className="flex justify-center py-0.5">
            <div className="w-0.5 h-3 bg-slate-700" />
          </div>

          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Storage & Message Queues</span>
            <span className="text-slate-500">Tier 3</span>
          </div>

          {/* Tier 3 Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div
              onClick={() => setSelectedId('SYS-DB')}
              className={`p-3 rounded-[4px] border transition-all cursor-pointer ${
                selectedId === 'SYS-DB'
                  ? isDbOutageActive 
                    ? 'bg-rose-950/60 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]' 
                    : 'bg-slate-900 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : isDbOutageActive 
                    ? 'bg-rose-950/30 border-rose-800 text-rose-300' 
                    : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Database className={`w-3.5 h-3.5 ${isDbOutageActive ? 'text-rose-400' : 'text-sky-400'}`} />
                <span className={`w-2 h-2 rounded-full ${isDbOutageActive ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
              </div>
              <div className="text-xs font-bold text-white">Postgres DB</div>
              <div className="text-[9px] text-slate-400 font-mono">
                {isDbOutageActive ? 'Offline' : 'Needs Backup'}
              </div>
            </div>

            <div
              onClick={() => setSelectedId('SYS-REDIS')}
              className={`p-3 rounded-[4px] border transition-all cursor-pointer ${
                selectedId === 'SYS-REDIS'
                  ? 'bg-slate-900 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs font-bold text-white">Redis Cache</div>
              <div className="text-[9px] text-slate-400 font-mono">Fast Memory</div>
            </div>

            <div
              onClick={() => setSelectedId('SYS-KAFKA')}
              className={`p-3 rounded-[4px] border transition-all cursor-pointer ${
                selectedId === 'SYS-KAFKA'
                  ? 'bg-slate-900 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs font-bold text-white">Kafka Queue</div>
              <div className="text-[9px] text-slate-400 font-mono">Order Messages</div>
            </div>
          </div>
        </div>

        {/* Live Service Inspector Card (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-[4px] border border-slate-800 bg-slate-900 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-[10px] font-mono text-sky-400 uppercase font-bold tracking-wider">
              Service Health Details
            </span>
            <span className="font-mono text-xs text-slate-400">[{selectedNode.id}]</span>
          </div>

          <div>
            <h4 className="text-base font-bold text-white">{selectedNode.name}</h4>
            <div className="text-xs text-slate-400 mt-0.5">
              Responsible Team: <strong>{selectedNode.owner}</strong>
            </div>
          </div>

          {/* Simple Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-[3px] bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Response Speed</div>
              <div className="font-bold text-white mt-0.5">{selectedNode.latency}</div>
            </div>
            <div className="p-2 rounded-[3px] bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Sensitive Data</div>
              <div className={`font-bold mt-0.5 ${selectedNode.hasPii ? 'text-amber-400' : 'text-emerald-400'}`}>
                {selectedNode.hasPii ? 'Customer PII' : 'None'}
              </div>
            </div>
          </div>

          {/* Plain English Reliability Summary */}
          <div className="space-y-1.5 text-xs">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              What This Service Does
            </div>
            <div className={`p-2.5 rounded-[3px] border text-xs leading-relaxed ${
              selectedNode.status === 'FAILED'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : selectedNode.status === 'WARNING'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              {selectedNode.summary}
            </div>
          </div>

          {/* Failover status */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 text-slate-300">
            <span className="text-slate-400">Backup Server Configured:</span>
            <span className={selectedNode.hasReplica ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {selectedNode.hasReplica ? 'Yes (Automatic Takeover)' : 'No (Single Point of Failure)'}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
