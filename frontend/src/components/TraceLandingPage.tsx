import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReadinessResult } from '../types/trace';
import { SpatialMode } from './TraceHeader';
import { 
  Network,
  Layers, 
  AlertCircle, 
  CheckSquare, 
  ArrowRight, 
  RotateCcw, 
  Server, 
  Check, 
  ExternalLink,
  ChevronRight,
  Database,
  ShieldCheck,
  UploadCloud,
  FileCode2,
  HardDrive,
  AlertTriangle,
  HelpCircle,
  Activity,
  Boxes,
  Lock,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  Zap,
  TrendingUp,
  Cpu,
  Radio,
  CreditCard,
  Sliders,
  Maximize2,
  Play,
  Terminal,
  Compass,
  AlertOctagon,
  RefreshCw,
  Box
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trace3DTopologyCanvas, CameraPreset } from './3d/Trace3DTopologyCanvas';
import { Trace3DHUDOverlay } from './3d/Trace3DHUDOverlay';

interface TraceLandingPageProps {
  onSelectMode: (mode: SpatialMode) => void;
  readiness: ReadinessResult;
  onOpenIngest: () => void;
  onOpenQuickstart?: () => void;
}

type StageView = 'TOPOLOGY' | 'PIE_CHARTS' | 'TELEMETRY' | 'WORKFLOW';

type DisasterScenario = 'NORMAL' | 'POSTGRES_DOWN' | 'STRIPE_LATENCY' | 'AUTH_DRIFT';

interface SubsystemSlice {
  label: string;
  percent: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface SubsystemDossier {
  id: string;
  name: string;
  category: 'CORE' | 'DATA' | 'EXTERNAL';
  categoryLabel: string;
  verdict: 'GOOD' | 'WATCHLIST' | 'NOT_GOOD';
  verdictLabel: string;
  score: number;
  rps: string;
  latency: string;
  monthlyCost: number;
  hasPii: boolean;
  hasReplica: boolean;
  slices: SubsystemSlice[];
  keyInsight: string;
}

interface SimulationState {
  healthScore: number;
  p95Latency: string;
  rps: string;
  failedNode: string | null;
  degradedNodes: string[];
  alertTitle: string | null;
  alertDesc: string | null;
  cascadeImpact: string | null;
}

function computeSlices(raw: Array<{ label: string; percent: number; color: string }>): SubsystemSlice[] {
  const circum = 2 * Math.PI * 36; // radius = 36, circum ≈ 226.19
  let currentOffset = 0;
  return raw.map((s) => {
    const strokeLen = (s.percent / 100) * circum;
    const dashArray = `${strokeLen.toFixed(1)} ${(circum - strokeLen).toFixed(1)}`;
    const dashOffset = -currentOffset;
    currentOffset += strokeLen;
    return {
      ...s,
      dashArray,
      dashOffset,
    };
  });
}

export const TraceLandingPage: React.FC<TraceLandingPageProps> = ({
  onSelectMode,
  readiness,
  onOpenIngest,
  onOpenQuickstart,
}) => {
  // Compartmentalized Workspace Stage Tab
  const [activeStage, setActiveStage] = useState<StageView>('TOPOLOGY');

  // Active Disaster Simulation Scenario
  const [scenario, setScenario] = useState<DisasterScenario>('NORMAL');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('SYS-DB');

  // 3D Spatial Topology Mode ('3D' vs '2D')
  const [topologyViewMode, setTopologyViewMode] = useState<'3D' | '2D'>('3D');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('ISOMETRIC');
  const [heroDisplayMode, setHeroDisplayMode] = useState<'3D' | 'METRICS'>('3D');

  // Interactive Filter for Subsystems
  const [subsystemFilter, setSubsystemFilter] = useState<'ALL' | 'GOOD' | 'WATCHLIST' | 'NOT_GOOD'>('ALL');

  // Simulated metrics based on active scenario
  const simulationState: SimulationState = useMemo(() => {
    switch (scenario) {
      case 'POSTGRES_DOWN':
        return {
          healthScore: 74,
          p95Latency: '320ms',
          rps: '1,120 req/s',
          failedNode: 'SYS-DB',
          degradedNodes: ['SYS-CORE', 'SYS-STRIPE'],
          alertTitle: 'Database Connection Timeout: Postgres DB Severed',
          alertDesc: 'Primary database is offline with no read replica. Phoenix Core API and Stripe Billing are queuing unhandled transactions.',
          cascadeImpact: '+302ms latency spike across 2 upstream services',
        };
      case 'STRIPE_LATENCY':
        return {
          healthScore: 82,
          p95Latency: '850ms',
          rps: '1,380 req/s',
          failedNode: 'SYS-STRIPE',
          degradedNodes: ['SYS-CORE'],
          alertTitle: 'Payment Gateway Degradation: Stripe Webhook Timeout',
          alertDesc: 'Stripe API latency spiked to 850ms. Asynchronous retry queue buffer is 84% saturated.',
          cascadeImpact: 'Checkout operations degraded, Kafka event buffer filling',
        };
      case 'AUTH_DRIFT':
        return {
          healthScore: 78,
          p95Latency: '145ms',
          rps: '940 req/s',
          failedNode: 'SYS-AUTH',
          degradedNodes: ['SYS-CORE'],
          alertTitle: 'Breaking Schema Drift: Auth0 JWT Spec Mismatch',
          alertDesc: 'Auth0 token claim structure does not match Phoenix Core API protobuf schema. 18% of login requests rejected.',
          cascadeImpact: 'Breaking contract drift detected across ingress conduit',
        };
      case 'NORMAL':
      default:
        return {
          healthScore: 94,
          p95Latency: '18ms',
          rps: '1,420 req/s',
          failedNode: null,
          degradedNodes: [],
          alertTitle: null,
          alertDesc: null,
          cascadeImpact: null,
        };
    }
  }, [scenario]);

  const handleRestoreNormal = () => {
    setScenario('NORMAL');
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#38bdf8', '#34d399', '#f8fafc'],
    });
  };

  // 6 Core Subsystems with Authentic Pie Slices
  const subsystems: SubsystemDossier[] = useMemo(() => [
    {
      id: 'SYS-AUTH',
      name: 'Auth0 Login Service',
      category: 'EXTERNAL',
      categoryLabel: 'Identity Gateway',
      verdict: scenario === 'AUTH_DRIFT' ? 'NOT_GOOD' : 'GOOD',
      verdictLabel: scenario === 'AUTH_DRIFT' ? 'SCHEMA DRIFT' : 'GOOD TO GO',
      score: scenario === 'AUTH_DRIFT' ? 62 : 96,
      rps: '980 req/s',
      latency: scenario === 'AUTH_DRIFT' ? '145ms' : '14ms',
      monthlyCost: 90,
      hasPii: true,
      hasReplica: true,
      slices: computeSlices([
        { label: 'Verified Code Paths', percent: scenario === 'AUTH_DRIFT' ? 52 : 80, color: '#38bdf8' },
        { label: 'Token Security SLA', percent: scenario === 'AUTH_DRIFT' ? 10 : 16, color: '#34d399' },
        { label: 'Latency Margin', percent: scenario === 'AUTH_DRIFT' ? 38 : 4, color: scenario === 'AUTH_DRIFT' ? '#ef4444' : '#f59e0b' },
      ]),
      keyInsight: scenario === 'AUTH_DRIFT' 
        ? 'JWT token claim mismatch rejected by Phoenix Core API.' 
        : 'Passes SOC2 & GDPR token verification with zero plaintext credentials stored.',
    },
    {
      id: 'SYS-CORE',
      name: 'Phoenix Core App Engine',
      category: 'CORE',
      categoryLabel: 'Application Engine',
      verdict: scenario !== 'NORMAL' ? 'WATCHLIST' : 'GOOD',
      verdictLabel: scenario !== 'NORMAL' ? 'DEGRADED' : 'GOOD TO GO',
      score: scenario === 'POSTGRES_DOWN' ? 68 : scenario !== 'NORMAL' ? 76 : 94,
      rps: simulationState.rps,
      latency: simulationState.p95Latency,
      monthlyCost: 520,
      hasPii: false,
      hasReplica: true,
      slices: computeSlices([
        { label: 'Code Execution', percent: 74, color: '#38bdf8' },
        { label: 'Route Coverage', percent: 20, color: '#34d399' },
        { label: 'Outage Degraded', percent: 6, color: scenario !== 'NORMAL' ? '#ef4444' : '#f59e0b' },
      ]),
      keyInsight: scenario === 'POSTGRES_DOWN'
        ? 'Downstream Postgres timeout causing thread pool backpressure.'
        : 'Horizontal container cluster running across 3 regions with zero single points of failure.',
    },
    {
      id: 'SYS-DB',
      name: 'Primary Postgres Database',
      category: 'DATA',
      categoryLabel: 'Transactional Storage',
      verdict: scenario === 'POSTGRES_DOWN' ? 'NOT_GOOD' : 'NOT_GOOD',
      verdictLabel: scenario === 'POSTGRES_DOWN' ? 'OFFLINE' : 'NEEDS BACKUP',
      score: scenario === 'POSTGRES_DOWN' ? 12 : 58,
      rps: scenario === 'POSTGRES_DOWN' ? '0 req/s' : '480 req/s',
      latency: scenario === 'POSTGRES_DOWN' ? 'TIMEOUT' : '8ms',
      monthlyCost: 680,
      hasPii: true,
      hasReplica: false,
      slices: computeSlices([
        { label: 'Storage Health', percent: scenario === 'POSTGRES_DOWN' ? 10 : 58, color: '#38bdf8' },
        { label: 'Single-Point Risk', percent: 28, color: '#ef4444' },
        { label: 'Missing Replica', percent: scenario === 'POSTGRES_DOWN' ? 62 : 14, color: '#f59e0b' },
      ]),
      keyInsight: scenario === 'POSTGRES_DOWN'
        ? 'Simulated disaster: Primary database severed. Zero read replicas available.'
        : 'Stores customer orders. Currently running without a standby read replica.',
    },
    {
      id: 'SYS-STRIPE',
      name: 'Stripe Payment Processor',
      category: 'EXTERNAL',
      categoryLabel: 'Payment Gateway',
      verdict: scenario === 'STRIPE_LATENCY' ? 'NOT_GOOD' : 'WATCHLIST',
      verdictLabel: scenario === 'STRIPE_LATENCY' ? 'TIMEOUT SPIKE' : 'WATCHLIST',
      score: scenario === 'STRIPE_LATENCY' ? 44 : 72,
      rps: '120 req/s',
      latency: scenario === 'STRIPE_LATENCY' ? '850ms' : '48ms',
      monthlyCost: 310,
      hasPii: true,
      hasReplica: true,
      slices: computeSlices([
        { label: 'Payment API SLA', percent: scenario === 'STRIPE_LATENCY' ? 40 : 62, color: '#38bdf8' },
        { label: 'Retry Pool SLA', percent: 23, color: '#34d399' },
        { label: 'Webhook Delay', percent: scenario === 'STRIPE_LATENCY' ? 37 : 15, color: '#f59e0b' },
      ]),
      keyInsight: scenario === 'STRIPE_LATENCY'
        ? 'Webhook timeout spiked to 850ms. Transaction retry queue buffering.'
        : 'Direct credit card processing. Needs fallback asynchronous queue during peak traffic.',
    },
    {
      id: 'SYS-REDIS',
      name: 'Redis Fast Memory Cache',
      category: 'DATA',
      categoryLabel: 'In-Memory Store',
      verdict: 'GOOD',
      verdictLabel: 'GOOD TO GO',
      score: 92,
      rps: '3,200 req/s',
      latency: '2ms',
      monthlyCost: 140,
      hasPii: false,
      hasReplica: true,
      slices: computeSlices([
        { label: 'Cache Hit Rate', percent: 82, color: '#38bdf8' },
        { label: 'Memory Redundancy', percent: 12, color: '#34d399' },
        { label: 'Eviction Margin', percent: 6, color: '#f59e0b' },
      ]),
      keyInsight: 'Maintains 82% cache hit ratio across session keys with automatic memory eviction.',
    },
    {
      id: 'SYS-KAFKA',
      name: 'Kafka Event Queue',
      category: 'DATA',
      categoryLabel: 'Message Queue',
      verdict: 'GOOD',
      verdictLabel: 'GOOD TO GO',
      score: 88,
      rps: '12,000 msg/s',
      latency: '5ms',
      monthlyCost: 420,
      hasPii: false,
      hasReplica: true,
      slices: computeSlices([
        { label: 'Queue Throughput', percent: 76, color: '#38bdf8' },
        { label: 'Replica Quorum', percent: 14, color: '#34d399' },
        { label: 'Backpressure Limit', percent: 10, color: '#f59e0b' },
      ]),
      keyInsight: 'Distributed log broker across 3 nodes for audit logging and async billing events.',
    },
  ], [scenario, simulationState]);

  const filteredSubsystems = useMemo(() => {
    if (subsystemFilter === 'ALL') return subsystems;
    if (subsystemFilter === 'GOOD') return subsystems.filter(s => s.verdict === 'GOOD');
    if (subsystemFilter === 'WATCHLIST') return subsystems.filter(s => s.verdict === 'WATCHLIST');
    return subsystems.filter(s => s.verdict === 'NOT_GOOD');
  }, [subsystems, subsystemFilter]);

  const selectedDossier = useMemo(() => {
    return subsystems.find(s => s.id === selectedNodeId) || subsystems[2];
  }, [subsystems, selectedNodeId]);

  return (
    <div className="space-y-10 pb-20 select-none">

      {/* ============================================================ */}
      {/* 1. HERO SECTION: Compelling Problem Statement & Telemetry HUD */}
      {/* ============================================================ */}
      <section className="relative pt-6 pb-2">
        {/* Subtle Ambient Studio Glow */}
        <div className="absolute -top-12 left-1/4 w-96 h-96 bg-sky-500/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left 6 Cols: Punchy Value Prop & Problem-Solution Journey */}
          <div className="md:col-span-6 space-y-5">
            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] bg-slate-900/90 border border-slate-700/80 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${simulationState.healthScore >= 85 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'} animate-pulse`} />
              <span className="text-slate-300 font-semibold">TRACE v2.4</span>
              <span className="text-slate-600">|</span>
              <span className="text-sky-400">Software Architecture &amp; Outage Simulator</span>
            </div>

            {/* Main Punchy Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-[1.08]">
              See what breaks{' '}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                before your customers do.
              </span>
            </h1>

            {/* Humane, Plain-English Problem Explainer */}
            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-xl">
              Modern microservices look clean on whiteboards, but undeclared schema drifts and database timeouts cause silent, cascading blackouts in production. TRACE maps live topology, simulates disaster outages with 1 click, and certifies resilience before you merge code.
            </p>

            {/* Interactive 4-Step Visual Workflow Mini-Rail */}
            <div className="p-3.5 rounded-[3px] bg-[#070d1a] border border-slate-800 space-y-2">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-3 h-3 text-sky-400" />
                <span>How TRACE Protects Your Production Architecture</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-[2px] bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition-colors">
                  <div className="font-mono text-[10px] text-sky-400 font-bold">01 INGEST</div>
                  <div className="text-slate-300 font-medium text-[11px] mt-0.5">Parse OpenAPI &amp; Protobuf</div>
                </div>
                <div className="p-2 rounded-[2px] bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition-colors">
                  <div className="font-mono text-[10px] text-emerald-400 font-bold">02 MAP MESH</div>
                  <div className="text-slate-300 font-medium text-[11px] mt-0.5">Live 3-tier dependency graph</div>
                </div>
                <div className="p-2 rounded-[2px] bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition-colors">
                  <div className="font-mono text-[10px] text-amber-400 font-bold">03 SIMULATE</div>
                  <div className="text-slate-300 font-medium text-[11px] mt-0.5">Test database severing</div>
                </div>
                <div className="p-2 rounded-[2px] bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition-colors">
                  <div className="font-mono text-[10px] text-cyan-400 font-bold">04 CERTIFY</div>
                  <div className="text-slate-300 font-medium text-[11px] mt-0.5">Export pre-launch memo</div>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => onSelectMode('CANVAS')}
                className="px-5 py-2.5 rounded-[3px] bg-sky-500 text-black font-semibold text-xs tracking-wide hover:bg-sky-400 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.3)]"
              >
                <Network className="w-4 h-4" />
                <span>Launch Full Canvas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setScenario(scenario === 'POSTGRES_DOWN' ? 'NORMAL' : 'POSTGRES_DOWN')}
                className={`px-4 py-2.5 rounded-[3px] font-semibold text-xs tracking-wide border transition-all flex items-center gap-2 cursor-pointer ${
                  scenario === 'POSTGRES_DOWN'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'bg-slate-900/90 text-amber-300 border-amber-500/40 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{scenario === 'POSTGRES_DOWN' ? 'Severed: Restore DB' : 'Simulate DB Outage'}</span>
              </button>

              {onOpenQuickstart && (
                <button
                  onClick={onOpenQuickstart}
                  className="px-4 py-2.5 rounded-[3px] bg-slate-900 text-slate-300 hover:text-white font-medium text-xs border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                  <span>15-Sec Guide</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 6 Cols: Live Interactive 3D Systems Matrix & Telemetry */}
          <div className="md:col-span-6">
            <div className="p-4 rounded-[3px] bg-[#070d1a] border border-slate-800/90 shadow-2xl relative overflow-hidden space-y-3">
              {/* Header with 3D vs Metrics Toggle */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-sky-400" />
                    <span>Live 3D Systems Matrix</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-0.5 rounded-[2px] bg-slate-900 border border-slate-800 text-[10px] font-mono">
                    <button
                      onClick={() => setHeroDisplayMode('3D')}
                      className={`px-2.5 py-1 rounded-[2px] font-semibold transition-all cursor-pointer ${
                        heroDisplayMode === '3D'
                          ? 'bg-sky-500 text-black shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3D Spatial View
                    </button>
                    <button
                      onClick={() => setHeroDisplayMode('METRICS')}
                      className={`px-2.5 py-1 rounded-[2px] font-semibold transition-all cursor-pointer ${
                        heroDisplayMode === 'METRICS'
                          ? 'bg-sky-500 text-black shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Telemetry Numbers
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold hidden sm:inline">60 FPS</span>
                </div>
              </div>

              {/* Viewport Content: 3D Hologram vs Metrics */}
              {heroDisplayMode === '3D' ? (
                <div className="space-y-2">
                  <Trace3DTopologyCanvas
                    scenario={scenario}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    cameraPreset={cameraPreset}
                    onPresetChange={setCameraPreset}
                    className="h-[360px] w-full border-0"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 pt-1">
                    <span>Selected: <strong className="text-sky-400">{selectedNodeId}</strong></span>
                    <span>Rotate: Drag • Zoom: Scroll • Select: Click</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Dynamic Health Score Arc & Latency Counter */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Radial Gauge */}
                    <div className="p-3.5 rounded-[3px] bg-slate-900/90 border border-slate-800 flex items-center gap-3.5">
                      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-14 h-14 -rotate-90">
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1e293b" strokeWidth="12" />
                          <motion.circle 
                            cx="50" 
                            cy="50" 
                            r="38" 
                            fill="transparent" 
                            stroke={simulationState.healthScore >= 85 ? '#34d399' : '#ef4444'} 
                            strokeWidth="12"
                            strokeDasharray={2 * Math.PI * 38}
                            animate={{ strokeDashoffset: (2 * Math.PI * 38) * (1 - simulationState.healthScore / 100) }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-white tabular-nums">
                          {simulationState.healthScore}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Health Score</div>
                        <div className="text-xs font-bold text-slate-200 mt-0.5">
                          {simulationState.healthScore >= 85 ? 'Production Ready' : 'Degraded Alert'}
                        </div>
                      </div>
                    </div>

                    {/* Cross-Service Latency */}
                    <div className="p-3.5 rounded-[3px] bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">p95 Latency</span>
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                      </div>
                      <div>
                        <div className={`text-2xl font-black font-mono tabular-nums ${simulationState.healthScore >= 85 ? 'text-sky-400' : 'text-rose-400'}`}>
                          {simulationState.p95Latency}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {simulationState.healthScore >= 85 ? 'Sub-20ms SLA' : '+302ms Spike'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service Grid Summary */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-[2px] bg-slate-900/60 border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">SERVICES</div>
                      <div className="text-sm font-bold text-slate-100 tabular-nums">14 Active</div>
                    </div>
                    <div className="p-2 rounded-[2px] bg-slate-900/60 border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">THROUGHPUT</div>
                      <div className="text-sm font-bold text-emerald-400 tabular-nums">{simulationState.rps}</div>
                    </div>
                    <div className="p-2 rounded-[2px] bg-slate-900/60 border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">DRIFTS</div>
                      <div className="text-sm font-bold text-sky-400 tabular-nums">0 Breaking</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Outage Warning Alert Banner */}
              <AnimatePresence>
                {simulationState.alertTitle && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="p-3 rounded-[3px] bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400">
                        <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{simulationState.alertTitle}</span>
                      </div>
                      <button
                        onClick={handleRestoreNormal}
                        className="text-[10px] font-mono text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      {simulationState.alertDesc}
                    </p>
                    <div className="text-[10px] font-mono text-rose-400 font-semibold">
                      ⚡ Cascade: {simulationState.cascadeImpact}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. COMPARTMENTALIZED WORKSPACE STAGE CONTROLLER             */}
      {/* ============================================================ */}
      <section className="space-y-6">
        {/* Crisp Rectangular Segmented Stage Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-[3px] bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveStage('TOPOLOGY')}
              className={`px-4 py-2 rounded-[2px] text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeStage === 'TOPOLOGY'
                  ? 'bg-sky-500 text-black shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>1. Live Animated Topology</span>
            </button>

            <button
              onClick={() => setActiveStage('PIE_CHARTS')}
              className={`px-4 py-2 rounded-[2px] text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeStage === 'PIE_CHARTS'
                  ? 'bg-sky-500 text-black shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>2. Subsystem Donut Pie Charts (6)</span>
            </button>

            <button
              onClick={() => setActiveStage('TELEMETRY')}
              className={`px-4 py-2 rounded-[2px] text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeStage === 'TELEMETRY'
                  ? 'bg-sky-500 text-black shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>3. Latency &amp; SLAs</span>
            </button>

            <button
              onClick={() => setActiveStage('WORKFLOW')}
              className={`px-4 py-2 rounded-[2px] text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeStage === 'WORKFLOW'
                  ? 'bg-sky-500 text-black shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>4. Release Workflow</span>
            </button>
          </div>

          {/* Quick Sandbox Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 hidden lg:inline">Crisis Scenarios:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setScenario('NORMAL')}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono transition-all cursor-pointer ${
                  scenario === 'NORMAL'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Operational
              </button>
              <button
                onClick={() => setScenario('POSTGRES_DOWN')}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono transition-all cursor-pointer ${
                  scenario === 'POSTGRES_DOWN'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                DB Severed
              </button>
              <button
                onClick={() => setScenario('STRIPE_LATENCY')}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono transition-all cursor-pointer ${
                  scenario === 'STRIPE_LATENCY'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Stripe Delay
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* STAGE 1: LIVE ANIMATED TOPOLOGY MESH WITH GLOWING CONDUITS   */}
        {/* ============================================================ */}
        {activeStage === 'TOPOLOGY' && (
          <div className="space-y-6">
            <div className="p-6 rounded-[3px] bg-[#070c18] border border-slate-800 relative overflow-hidden">
              {/* Header Bar inside Sandbox */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                    <h2 className="text-base font-bold text-white font-mono tracking-wide">
                      MULTI-TIER DISTRIBUTED TOPOLOGY CONDUIT
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 font-sans">
                    Click any microservice to inspect contracts, view live latency waveforms, or trigger an outage.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  {/* 3D vs 2D View Switcher */}
                  <div className="flex items-center p-0.5 rounded-[2px] bg-slate-900 border border-slate-800">
                    <button
                      onClick={() => setTopologyViewMode('3D')}
                      className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        topologyViewMode === '3D'
                          ? 'bg-sky-500 text-black shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>3D Spatial Matrix</span>
                    </button>
                    <button
                      onClick={() => setTopologyViewMode('2D')}
                      className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        topologyViewMode === '2D'
                          ? 'bg-sky-500 text-black shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>2D Schematic</span>
                    </button>
                  </div>

                  <span className="px-2.5 py-1 rounded-[2px] bg-slate-900 text-slate-300 border border-slate-800 hidden sm:inline-block">
                    Active Node: <strong className="text-sky-400">{selectedNodeId}</strong>
                  </span>
                  <button
                    onClick={() => onSelectMode('CANVAS')}
                    className="px-3 py-1 rounded-[2px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand Canvas</span>
                  </button>
                </div>
              </div>

              {/* 3D Spatial Matrix View */}
              {topologyViewMode === '3D' ? (
                <div className="space-y-4 pt-4">
                  <Trace3DHUDOverlay
                    currentPreset={cameraPreset}
                    onPresetSelect={setCameraPreset}
                    scenario={scenario}
                    onScenarioChange={setScenario}
                    selectedNodeId={selectedNodeId}
                  />
                  <Trace3DTopologyCanvas
                    scenario={scenario}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    cameraPreset={cameraPreset}
                    onPresetChange={setCameraPreset}
                  />
                </div>
              ) : (
                /* Animated 2D Topology Canvas Area */
                <div className="py-8 relative min-h-[460px] flex flex-col justify-between">
                {/* SVG Animated Conduits Layer (Overlay connecting all 3 tiers) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="cyanConduit" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="hazardConduit" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>

                  {/* Conduit Tier 1 -> Tier 2 (Auth0 -> Phoenix Core) */}
                  <path 
                    d="M 50% 60 L 30% 190" 
                    stroke={scenario === 'AUTH_DRIFT' ? 'url(#hazardConduit)' : '#1e293b'} 
                    strokeWidth="2" 
                    fill="none" 
                  />
                  {/* Glowing Animated Flow Bead */}
                  <circle r="4" fill={scenario === 'AUTH_DRIFT' ? '#ef4444' : '#38bdf8'} className="filter drop-shadow-[0_0_6px_#38bdf8]">
                    <animateMotion 
                      path="M 50% 60 L 30% 190" 
                      dur={scenario === 'AUTH_DRIFT' ? '3s' : '1.8s'} 
                      repeatCount="indefinite" 
                    />
                  </circle>

                  {/* Conduit Tier 2 Core -> Stripe */}
                  <path 
                    d="M 35% 210 L 65% 210" 
                    stroke={scenario === 'STRIPE_LATENCY' ? 'url(#hazardConduit)' : '#1e293b'} 
                    strokeWidth="2" 
                    fill="none" 
                  />
                  <circle r="3.5" fill={scenario === 'STRIPE_LATENCY' ? '#f59e0b' : '#34d399'} className="filter drop-shadow-[0_0_6px_#34d399]">
                    <animateMotion 
                      path="M 35% 210 L 65% 210" 
                      dur={scenario === 'STRIPE_LATENCY' ? '4s' : '1.5s'} 
                      repeatCount="indefinite" 
                    />
                  </circle>

                  {/* Conduit Tier 2 Core -> Postgres DB */}
                  <path 
                    d="M 30% 230 L 20% 360" 
                    stroke={scenario === 'POSTGRES_DOWN' ? '#ef4444' : '#1e293b'} 
                    strokeWidth={scenario === 'POSTGRES_DOWN' ? '3' : '2'}
                    strokeDasharray={scenario === 'POSTGRES_DOWN' ? '6 4' : 'none'}
                    fill="none" 
                  />
                  {scenario !== 'POSTGRES_DOWN' && (
                    <circle r="4" fill="#38bdf8" className="filter drop-shadow-[0_0_6px_#38bdf8]">
                      <animateMotion path="M 30% 230 L 20% 360" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Conduit Tier 2 Core -> Redis Cache */}
                  <path d="M 30% 230 L 50% 360" stroke="#1e293b" strokeWidth="2" fill="none" />
                  <circle r="4" fill="#34d399" className="filter drop-shadow-[0_0_6px_#34d399]">
                    <animateMotion path="M 30% 230 L 50% 360" dur="1.2s" repeatCount="indefinite" />
                  </circle>

                  {/* Conduit Tier 2 Core -> Kafka Queue */}
                  <path d="M 30% 230 L 80% 360" stroke="#1e293b" strokeWidth="2" fill="none" />
                  <circle r="4" fill="#38bdf8" className="filter drop-shadow-[0_0_6px_#38bdf8]">
                    <animateMotion path="M 30% 230 L 80% 360" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                </svg>

                {/* TIER 1: Ingress Gateway */}
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Tier 1: Ingress Gateway Layer (Edge Ingress)
                  </span>
                  <div
                    onClick={() => setSelectedNodeId('SYS-AUTH')}
                    className={`w-72 p-3.5 rounded-[3px] transition-all cursor-pointer flex items-center justify-between border ${
                      selectedNodeId === 'SYS-AUTH'
                        ? 'bg-slate-900 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                        : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center ${scenario === 'AUTH_DRIFT' ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/10 text-sky-400'}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">Auth0 Identity Gateway</div>
                        <div className="text-[10px] text-slate-400">JWT Token Validation</div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <div className={scenario === 'AUTH_DRIFT' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {scenario === 'AUTH_DRIFT' ? '145ms' : '14ms'}
                      </div>
                      <span className={`inline-block w-2 h-2 rounded-full ${scenario === 'AUTH_DRIFT' ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                    </div>
                  </div>
                </div>

                {/* TIER 2: Processing & Business Mesh */}
                <div className="relative z-10 my-8">
                  <div className="text-center text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Tier 2: Business Logic &amp; Financial Settlement Mesh
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Phoenix Core */}
                    <div
                      onClick={() => setSelectedNodeId('SYS-CORE')}
                      className={`p-3.5 rounded-[3px] transition-all cursor-pointer flex items-center justify-between border ${
                        selectedNodeId === 'SYS-CORE'
                          ? 'bg-slate-900 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center ${simulationState.degradedNodes.includes('SYS-CORE') ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/10 text-sky-400'}`}>
                          <Server className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">Phoenix Core API</div>
                          <div className="text-[10px] text-slate-400">Application Cluster</div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className={simulationState.degradedNodes.includes('SYS-CORE') ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                          {simulationState.p95Latency}
                        </div>
                        <span className={`inline-block w-2 h-2 rounded-full ${simulationState.degradedNodes.includes('SYS-CORE') ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                      </div>
                    </div>

                    {/* Stripe Billing */}
                    <div
                      onClick={() => setSelectedNodeId('SYS-STRIPE')}
                      className={`p-3.5 rounded-[3px] transition-all cursor-pointer flex items-center justify-between border ${
                        selectedNodeId === 'SYS-STRIPE'
                          ? 'bg-slate-900 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center ${scenario === 'STRIPE_LATENCY' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">Stripe Billing Gateway</div>
                          <div className="text-[10px] text-slate-400">PCI-DSS Payment Flow</div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className={scenario === 'STRIPE_LATENCY' ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                          {scenario === 'STRIPE_LATENCY' ? '850ms' : '48ms'}
                        </div>
                        <span className={`inline-block w-2 h-2 rounded-full ${scenario === 'STRIPE_LATENCY' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* TIER 3: Persistence, Cache & Event Streams */}
                <div className="relative z-10">
                  <div className="text-center text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Tier 3: Persistence, Distributed Cache &amp; Event Log Layer
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Postgres DB */}
                    <div
                      onClick={() => setSelectedNodeId('SYS-DB')}
                      className={`p-3.5 rounded-[3px] transition-all cursor-pointer flex items-center justify-between border relative ${
                        selectedNodeId === 'SYS-DB'
                          ? 'bg-slate-900 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Shockwave ripple when severed */}
                      {scenario === 'POSTGRES_DOWN' && (
                        <div className="absolute inset-0 border-2 border-rose-500 rounded-[3px] animate-ping pointer-events-none" />
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center ${scenario === 'POSTGRES_DOWN' ? 'bg-rose-500/30 text-rose-400' : 'bg-sky-500/10 text-sky-400'}`}>
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">Postgres DB</div>
                          <div className="text-[10px] text-slate-400">
                            {scenario === 'POSTGRES_DOWN' ? 'SEVERED' : 'Single Point of Failure'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className={scenario === 'POSTGRES_DOWN' ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {scenario === 'POSTGRES_DOWN' ? 'TIMEOUT' : '8ms'}
                        </div>
                        <span className={`inline-block w-2 h-2 rounded-full ${scenario === 'POSTGRES_DOWN' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
                      </div>
                    </div>

                    {/* Redis Cache */}
                    <div
                      onClick={() => setSelectedNodeId('SYS-REDIS')}
                      className={`p-3.5 rounded-[3px] transition-all cursor-pointer flex items-center justify-between border ${
                        selectedNodeId === 'SYS-REDIS'
                          ? 'bg-slate-900 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[2px] bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">Redis Cache</div>
                          <div className="text-[10px] text-slate-400">82% Hit Rate</div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className="text-emerald-400">2ms</div>
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    </div>

                    {/* Kafka Queue */}
                    <div
                      onClick={() => setSelectedNodeId('SYS-KAFKA')}
                      className={`p-3.5 rounded-[3px] transition-all cursor-pointer flex items-center justify-between border ${
                        selectedNodeId === 'SYS-KAFKA'
                          ? 'bg-slate-900 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[2px] bg-sky-500/10 text-sky-400 flex items-center justify-center">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">Kafka Event Queue</div>
                          <div className="text-[10px] text-slate-400">3 Broker Quorum</div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className="text-emerald-400">5ms</div>
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Integrated Micro-Telemetry Dossier Drawer */}
              <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950/60 p-4 rounded-[2px]">
                <div className="md:col-span-4 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Selected Microservice</div>
                  <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span>{selectedDossier.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 border border-slate-700">
                      {selectedDossier.categoryLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans">
                    {selectedDossier.keyInsight}
                  </p>
                </div>

                <div className="md:col-span-5 grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">THROUGHPUT</div>
                    <div className="text-slate-100 font-bold tabular-nums">{selectedDossier.rps}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">LATENCY</div>
                    <div className="text-sky-400 font-bold tabular-nums">{selectedDossier.latency}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">MONTHLY COST</div>
                    <div className="text-emerald-400 font-bold tabular-nums">${selectedDossier.monthlyCost}</div>
                  </div>
                </div>

                <div className="md:col-span-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      if (selectedDossier.id === 'SYS-DB') {
                        setScenario(scenario === 'POSTGRES_DOWN' ? 'NORMAL' : 'POSTGRES_DOWN');
                      } else if (selectedDossier.id === 'SYS-STRIPE') {
                        setScenario(scenario === 'STRIPE_LATENCY' ? 'NORMAL' : 'STRIPE_LATENCY');
                      } else if (selectedDossier.id === 'SYS-AUTH') {
                        setScenario(scenario === 'AUTH_DRIFT' ? 'NORMAL' : 'AUTH_DRIFT');
                      }
                    }}
                    className="w-full py-2 px-3 rounded-[2px] bg-slate-900 hover:bg-slate-800 text-xs font-mono font-semibold text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    <span>Test Disaster on {selectedDossier.id}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 2: SUBSYSTEM DOSSIERS WITH CIRCULAR DONUT PIE CHARTS   */}
        {/* ============================================================ */}
        {activeStage === 'PIE_CHARTS' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                  <PieIcon className="w-3.5 h-3.5" />
                  <span>Subsystem Reliability Part-to-Whole Breakdown</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-mono mt-1">
                  Six Core Services &amp; Pie Chart Ratios
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5 max-w-xl">
                  Color-coded slices represent verified code paths, redundancy margins, and downtime risks.
                </p>
              </div>

              {/* Subsystem Filter Bar */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <button
                  onClick={() => setSubsystemFilter('ALL')}
                  className={`px-3 py-1.5 rounded-[2px] transition-all cursor-pointer ${
                    subsystemFilter === 'ALL'
                      ? 'bg-sky-500 text-black font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  All ({subsystems.length})
                </button>
                <button
                  onClick={() => setSubsystemFilter('GOOD')}
                  className={`px-3 py-1.5 rounded-[2px] transition-all cursor-pointer ${
                    subsystemFilter === 'GOOD'
                      ? 'bg-emerald-500 text-black font-bold'
                      : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  🟢 Healthy
                </button>
                <button
                  onClick={() => setSubsystemFilter('WATCHLIST')}
                  className={`px-3 py-1.5 rounded-[2px] transition-all cursor-pointer ${
                    subsystemFilter === 'WATCHLIST'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  🟡 Watchlist
                </button>
                <button
                  onClick={() => setSubsystemFilter('NOT_GOOD')}
                  className={`px-3 py-1.5 rounded-[2px] transition-all cursor-pointer ${
                    subsystemFilter === 'NOT_GOOD'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  🔴 At Risk
                </button>
              </div>
            </div>

            {/* 6 Subsystems Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubsystems.map((subsystem) => {
                const isGood = subsystem.verdict === 'GOOD';
                const isWatch = subsystem.verdict === 'WATCHLIST';
                const isNotGood = subsystem.verdict === 'NOT_GOOD';

                return (
                  <div
                    key={subsystem.id}
                    className="p-5 rounded-[3px] bg-[#070c18] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Header & Verdict Stamp */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                            {subsystem.categoryLabel}
                          </div>
                          <h4 className="text-sm font-bold text-white font-mono mt-0.5">
                            {subsystem.name}
                          </h4>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {subsystem.id} • ${subsystem.monthlyCost}/mo
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold border ${
                            isGood
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isWatch
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {subsystem.verdictLabel}
                        </span>
                      </div>

                      {/* SVG Circular Donut Pie Chart & Legend */}
                      <div className="mt-4 p-3 rounded-[2px] bg-slate-950/80 border border-slate-800/80 flex items-center gap-4">
                        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
                            <circle cx="50" cy="50" r="36" fill="transparent" stroke="#1e293b" strokeWidth="12" />
                            {subsystem.slices.map((slice, idx) => (
                              <circle
                                key={idx}
                                cx="50"
                                cy="50"
                                r="36"
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth="12"
                                strokeDasharray={slice.dashArray}
                                strokeDashoffset={slice.dashOffset}
                              />
                            ))}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                            <span className="text-xs font-black text-white">{subsystem.score}%</span>
                            <span className="text-[8px] text-slate-400 uppercase">HEALTH</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px] font-mono flex-1">
                          {subsystem.slices.map((slice, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-1">
                              <span className="flex items-center gap-1.5 truncate text-slate-300">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                                <span className="truncate">{slice.label}</span>
                              </span>
                              <span className="text-slate-400 font-bold shrink-0">{slice.percent}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-300 font-sans leading-relaxed">
                        {subsystem.keyInsight}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Latency: <strong className="text-sky-400">{subsystem.latency}</strong></span>
                      <span>Throughput: <strong className="text-emerald-400">{subsystem.rps}</strong></span>
                      {subsystem.hasPii && (
                        <span className="text-sky-400 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> PII
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 3: HEALTH & LATENCY BENCHMARKS                         */}
        {/* ============================================================ */}
        {activeStage === 'TELEMETRY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-[3px] bg-[#070c18] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>ARCHITECTURE HEALTH</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-400 border-t-transparent flex items-center justify-center font-mono font-bold text-sm text-white">
                  94%
                </div>
                <div>
                  <div className="text-sm font-bold text-white font-mono">Production Ready</div>
                  <div className="text-[11px] text-slate-400 font-mono">0 Cyclic Loops Detected</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[3px] bg-[#070c18] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>RELIABILITY BREAKDOWN</span>
                <PieIcon className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-sky-400 border-l-amber-400 border-b-rose-500 flex items-center justify-center font-mono font-bold text-sm text-white">
                  6
                </div>
                <div className="space-y-0.5 text-[11px] font-mono">
                  <div className="text-emerald-400 font-semibold">• 4 Good to Go</div>
                  <div className="text-amber-400 font-semibold">• 1 Watchlist</div>
                  <div className="text-rose-400 font-semibold">• 1 At Risk</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[3px] bg-[#070c18] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>LATENCY BENCHMARK</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-white">18ms</div>
                <div className="text-[11px] text-slate-400 font-mono">p95 Cross-Service Response</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[18%]" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[3px] bg-[#070c18] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>CONTRACT VERIFICATION</span>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-cyan-400">100%</div>
                <div className="text-[11px] text-slate-400 font-mono">18/18 API Schemas Verified</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-1">Zero Breaking Schema Drifts</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 4: RELEASE WORKFLOW (3-STEP GUIDE)                     */}
        {/* ============================================================ */}
        {activeStage === 'WORKFLOW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-[3px] bg-[#070c18] border border-slate-800 space-y-3">
              <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-[2px] border border-sky-500/30">
                01
              </span>
              <h4 className="text-sm font-bold text-white font-mono">Connect OpenAPI or Protobuf Specs</h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Ingest your raw API contracts or connect your repository. TRACE parses schemas and automatically graphs all microservice dependencies.
              </p>
            </div>

            <div className="p-6 rounded-[3px] bg-[#070c18] border border-slate-800 space-y-3">
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-[2px] border border-amber-500/30">
                02
              </span>
              <h4 className="text-sm font-bold text-white font-mono">Detect Hidden Single Points of Failure</h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Automatically detect unhandled timeouts, missing read replicas, unencrypted PII in transit, and circular cascading bottlenecks.
              </p>
            </div>

            <div className="p-6 rounded-[3px] bg-[#070c18] border border-slate-800 space-y-3">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-[2px] border border-emerald-500/30">
                03
              </span>
              <h4 className="text-sm font-bold text-white font-mono">Simulate Outages &amp; Export Memo</h4>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Sever components with 1 click to test disaster recovery. Export a signed readiness checklist before merging into master.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* BOTTOM CTA: READY TO TEST ARCHITECTURE                      */}
      {/* ============================================================ */}
      <section className="p-6 rounded-[3px] bg-[#070c18] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white font-mono">Ready to test your system architecture?</h3>
          <p className="text-xs text-slate-400 font-sans">
            Open the full canvas to inspect Project Phoenix, or import your own OpenAPI spec in seconds.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectMode('CANVAS')}
            className="px-4 py-2 rounded-[2px] bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.25)]"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Launch Canvas</span>
          </button>
          <button
            onClick={onOpenIngest}
            className="px-4 py-2 rounded-[2px] bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Spec</span>
          </button>
        </div>
      </section>

    </div>
  );
};
