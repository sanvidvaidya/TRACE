import React, { useState, useEffect } from 'react';
import { TraceNode, TraceEdge, NodeType } from '../../types/trace';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  GitFork, 
  Eye, 
  Search,
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Box
} from 'lucide-react';
import { Trace3DTopologyCanvas, CameraPreset } from '../3d/Trace3DTopologyCanvas';
import { Trace3DHUDOverlay } from '../3d/Trace3DHUDOverlay';

interface SystemsCanvasModeProps {
  nodes: TraceNode[];
  edges: TraceEdge[];
  selectedNode: TraceNode | null;
  onSelectNode: (node: TraceNode) => void;
  projectTitle: string;
}

interface NodePos {
  x: number;
  y: number;
}

export const SystemsCanvasMode: React.FC<SystemsCanvasModeProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  projectTitle,
}) => {
  const [subView, setSubView] = useState<'GRAPH' | 'WORKFLOWS' | 'ONTOLOGY' | '3D_MATRIX'>('GRAPH');
  const [canvasScenario, setCanvasScenario] = useState<'NORMAL' | 'POSTGRES_DOWN' | 'STRIPE_LATENCY' | 'AUTH_DRIFT'>('NORMAL');
  const [canvasPreset, setCanvasPreset] = useState<CameraPreset>('ISOMETRIC');
  const [selected3DNodeId, setSelected3DNodeId] = useState<string>('SYS-DB');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoom, setZoom] = useState<number>(0.95);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Draggable Node positions state
  const [positions, setPositions] = useState<Record<string, NodePos>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const newPos: Record<string, NodePos> = {};
    const colMap: Record<NodeType, number> = {
      BUSINESS_OUTCOME: 60,
      PROBLEM: 60,
      GOAL: 260,
      REQUIREMENT: 480,
      SYSTEM_COMPONENT: 740,
      DATA_SOURCE: 740,
      WORKFLOW_STEP: 990,
      TEST_CASE: 1220,
      DECISION: 480,
      ASSUMPTION: 740,
      QUESTION: 480,
      STAKEHOLDER: 60,
    };

    const typeCounters: Record<string, number> = {};

    nodes.forEach((n) => {
      const type = n.node_type;
      const x = colMap[type] || 500;
      const row = typeCounters[type] || 0;
      typeCounters[type] = row + 1;
      const y = 60 + row * 105;
      newPos[n.id] = { x, y };
    });

    setPositions(newPos);
  }, [nodes]);

  const filteredNodes = nodes.filter((n) => {
    if (filterType !== 'ALL' && n.node_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.id.toLowerCase().includes(q) || n.title.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => filteredIds.has(e.source_id) && filteredIds.has(e.target_id)
  );

  const handleMouseDownSvg = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMoveSvg = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (draggingNodeId) {
      setPositions((prev) => ({
        ...prev,
        [draggingNodeId]: {
          x: (e.clientX - pan.x) / zoom - dragOffset.x,
          y: (e.clientY - pan.y) / zoom - dragOffset.y,
        },
      }));
    }
  };

  const handleMouseUpSvg = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleStartDragNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingNodeId(id);
    const pos = positions[id] || { x: 100, y: 100 };
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - pos.x,
      y: (e.clientY - pan.y) / zoom - pos.y,
    });
  };

  const workflows = nodes
    .filter((n) => n.node_type === 'WORKFLOW_STEP')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const stakeholders = nodes.filter((n) => n.node_type === 'STAKEHOLDER');
  const goals = nodes.filter((n) => n.node_type === 'GOAL');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 pt-16">
      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-500/25 text-lime-300 text-xs font-mono font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-lime-400" />
          <span>Spatial Systems Architecture Canvas</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight kinetic-gradient-text leading-tight">
          Bidirectional Systems Graph
        </h1>

        <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
          {projectTitle}: Interactive relational topology binding business outcomes, 
          operational workflows, and test verification criteria. Zero unmapped assumptions.
        </p>

        {/* Segmented Sub-View Switcher */}
        <div className="inline-flex items-center bg-[#0d0f14] p-1 rounded-full border border-white/10 shadow-lg">
          <button
            onClick={() => setSubView('GRAPH')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              subView === 'GRAPH'
                ? 'bg-gradient-to-r from-lime-400 to-teal-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Interactive Graph
          </button>
          <button
            onClick={() => setSubView('WORKFLOWS')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              subView === 'WORKFLOWS'
                ? 'bg-gradient-to-r from-lime-400 to-teal-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Execution Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setSubView('ONTOLOGY')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              subView === 'ONTOLOGY'
                ? 'bg-gradient-to-r from-lime-400 to-teal-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Domain Ontology
          </button>
          <button
            onClick={() => setSubView('3D_MATRIX')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              subView === '3D_MATRIX'
                ? 'bg-gradient-to-r from-sky-400 to-cyan-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Spatial Matrix</span>
          </button>
        </div>
      </div>

      {subView === 'GRAPH' && (
        <div className="space-y-4">
          {/* Canvas Controls Bar */}
          <div className="apple-card p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-zinc-300">
                <Layers className="w-3.5 h-3.5 text-lime-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#0e1014]">All Entity Layers</option>
                  <option value="REQUIREMENT" className="bg-[#0e1014]">Requirements</option>
                  <option value="SYSTEM_COMPONENT" className="bg-[#0e1014]">System Components</option>
                  <option value="DATA_SOURCE" className="bg-[#0e1014]">Data Sources</option>
                  <option value="WORKFLOW_STEP" className="bg-[#0e1014]">Workflows</option>
                  <option value="TEST_CASE" className="bg-[#0e1014]">Test Cases</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-zinc-300 w-52">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search entity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Zoom & Pan Tools */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-zinc-500">
                {filteredNodes.length} Nodes • {filteredEdges.length} Relations
              </span>

              <div className="flex items-center bg-black/40 rounded-xl border border-white/10 p-0.5">
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-2 text-zinc-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setZoom(0.95);
                    setPan({ x: 30, y: 20 });
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white ml-1 border-l border-white/10"
                  title="Reset View"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <div
            className="apple-card h-[600px] rounded-3xl relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDownSvg}
            onMouseMove={handleMouseMoveSvg}
            onMouseUp={handleMouseUpSvg}
          >
            {/* Mesh Glow Spots */}
            <div className="absolute top-10 left-10 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl pointer-events-none ambient-glow-1" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none ambient-glow-2" />

            {/* Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <defs>
                <pattern id="canvas-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#71717a" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#canvas-grid)" />
            </svg>

            {/* Canvas Transformation Container */}
            <svg
              className="w-full h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              <defs>
                <marker
                  id="canvas-arrow"
                  viewBox="0 0 10 10"
                  refX="16"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#bef264" opacity="0.7" />
                </marker>
                <marker
                  id="canvas-arrow-conflict"
                  viewBox="0 0 10 10"
                  refX="16"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" opacity="0.9" />
                </marker>
              </defs>

              {/* Edges with glowing path */}
              {filteredEdges.map((e, idx) => {
                const src = positions[e.source_id];
                const tgt = positions[e.target_id];
                if (!src || !tgt) return null;

                const isConf = e.relation === 'CONFLICTS_WITH';
                const strokeColor = isConf ? '#ef4444' : '#bef264';
                const marker = isConf ? 'url(#canvas-arrow-conflict)' : 'url(#canvas-arrow)';

                const midX = (src.x + tgt.x) / 2;
                const midY = (src.y + tgt.y) / 2;

                return (
                  <g key={idx}>
                    <line
                      x1={src.x + 90}
                      y1={src.y + 36}
                      x2={tgt.x + 90}
                      y2={tgt.y + 36}
                      stroke={strokeColor}
                      strokeWidth={isConf ? 2.5 : 1.5}
                      strokeOpacity={isConf ? 0.9 : 0.45}
                      strokeDasharray={isConf ? '4 4' : undefined}
                      markerEnd={marker}
                    />
                    <text
                      x={midX + 90}
                      y={midY + 30}
                      fill={isConf ? '#ef4444' : '#94a3b8'}
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {e.relation}
                    </text>
                  </g>
                );
              })}

              {/* Spatial Nodes */}
              {filteredNodes.map((n) => {
                const pos = positions[n.id] || { x: 100, y: 100 };
                const isSelected = selectedNode?.id === n.id;

                let borderGlow = 'rgba(255,255,255,0.08)';
                let accentColor = '#bef264';
                if (n.node_type === 'BUSINESS_OUTCOME') accentColor = '#c084fc';
                if (n.node_type === 'REQUIREMENT') accentColor = '#38bdf8';
                if (n.node_type === 'SYSTEM_COMPONENT') accentColor = '#34d399';
                if (n.node_type === 'DATA_SOURCE') accentColor = '#60a5fa';
                if (n.node_type === 'TEST_CASE') accentColor = '#2dd4bf';
                if (n.node_type === 'WORKFLOW_STEP') accentColor = '#fbbf24';

                if (isSelected) borderGlow = '#bef264';

                return (
                  <g
                    key={n.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseDown={(e) => handleStartDragNode(e, n.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode(n);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Node Glass Card */}
                    <rect
                      width="190"
                      height="74"
                      rx="16"
                      fill="#0c0e14"
                      stroke={isSelected ? '#bef264' : borderGlow}
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-colors filter drop-shadow-xl"
                    />

                    {/* Top Specular Line */}
                    <line
                      x1="16"
                      y1="1"
                      x2="174"
                      y2="1"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="1"
                    />

                    {/* Accent Left Pill */}
                    <rect
                      x="0"
                      y="0"
                      width="5"
                      height="74"
                      rx="3"
                      fill={accentColor}
                    />

                    {/* Node ID */}
                    <text
                      x="16"
                      y="22"
                      fill={accentColor}
                      fontSize="10.5"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {n.id}
                    </text>

                    {/* Type Badge */}
                    <text
                      x="176"
                      y="22"
                      fill="#71717a"
                      fontSize="8"
                      textAnchor="end"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {n.node_type.replace('_', ' ')}
                    </text>

                    {/* Title */}
                    <text
                      x="16"
                      y="40"
                      fill="#f8fafc"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {n.title.length > 22 ? `${n.title.substring(0, 22)}...` : n.title}
                    </text>

                    {/* Epistemic Status Chip */}
                    <text
                      x="16"
                      y="58"
                      fill="#94a3b8"
                      fontSize="8.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {n.epistemic_status}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Micro Interaction Hint */}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-400">
              💡 Drag nodes to model layout • Click node to open deep inspector
            </div>
          </div>
        </div>
      )}

      {/* Workflows Sub-View */}
      {subView === 'WORKFLOWS' && (
        <div className="apple-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-xl font-display font-bold text-white">
              Operational Sequence Topology
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Chronological execution sequence binding human operators to autonomous service boundaries.
            </p>
          </div>

          <div className="space-y-4">
            {workflows.map((step, idx) => (
              <div
                key={step.id}
                onClick={() => onSelectNode(step)}
                className="p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-400/40 cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center font-mono font-bold text-lime-400 text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lime-400 font-bold text-xs">{step.id}</span>
                      <h4 className="text-sm font-semibold text-white group-hover:text-lime-300 transition-colors">
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{step.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {step.actor_id && (
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px]">
                      {step.actor_id}
                    </span>
                  )}
                  {step.system_id && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                      {step.system_id}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ontology Sub-View */}
      {subView === 'ONTOLOGY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="apple-card p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-display font-bold text-white border-b border-white/10 pb-3">
              Stakeholders & Accountability
            </h3>
            <div className="space-y-3">
              {stakeholders.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectNode(s)}
                  className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-purple-500/40 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-purple-400 font-bold">{s.id}</span>
                    <span className="text-zinc-500">{s.owner}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">{s.title}</h4>
                  <p className="text-[11px] text-zinc-400">{s.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="apple-card p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-display font-bold text-white border-b border-white/10 pb-3">
              Derived Strategic Goals
            </h3>
            <div className="space-y-3">
              {goals.map((g) => (
                <div
                  key={g.id}
                  onClick={() => onSelectNode(g)}
                  className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-400/40 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-lime-400 font-bold">{g.id}</span>
                    <span className="text-zinc-500">GOAL</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">{g.title}</h4>
                  <p className="text-[11px] text-zinc-400">{g.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3D Spatial Systems Matrix View */}
      {subView === '3D_MATRIX' && (
        <div className="space-y-4">
          <Trace3DHUDOverlay
            currentPreset={canvasPreset}
            onPresetSelect={setCanvasPreset}
            scenario={canvasScenario}
            onScenarioChange={setCanvasScenario}
            selectedNodeId={selected3DNodeId}
          />
          <Trace3DTopologyCanvas
            scenario={canvasScenario}
            selectedNodeId={selected3DNodeId}
            onSelectNode={setSelected3DNodeId}
            cameraPreset={canvasPreset}
            onPresetChange={setCanvasPreset}
          />
        </div>
      )}
    </div>
  );
};
