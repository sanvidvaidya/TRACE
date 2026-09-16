import React, { useState, useRef, useEffect } from 'react';
import { TraceNode, TraceEdge, NodeType } from '../../types/trace';
import { Share2, Filter, ZoomIn, ZoomOut, RotateCcw, Eye, Search } from 'lucide-react';

interface Screen06TraceGraphProps {
  nodes: TraceNode[];
  edges: TraceEdge[];
  selectedNode: TraceNode | null;
  onSelectNode: (node: TraceNode) => void;
}

interface NodePosition {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export const Screen06TraceGraph: React.FC<Screen06TraceGraphProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Draggable Node positions state
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initial layout: Arrange nodes logically by type in columns
  useEffect(() => {
    const newPos: Record<string, NodePosition> = {};
    const colMap: Record<NodeType, number> = {
      BUSINESS_OUTCOME: 80,
      PROBLEM: 80,
      GOAL: 280,
      REQUIREMENT: 480,
      SYSTEM_COMPONENT: 740,
      DATA_SOURCE: 740,
      WORKFLOW_STEP: 980,
      TEST_CASE: 1200,
      DECISION: 480,
      ASSUMPTION: 740,
      QUESTION: 480,
      STAKEHOLDER: 80,
    };

    const typeCounters: Record<string, number> = {};

    nodes.forEach((n) => {
      const type = n.node_type;
      const x = colMap[type] || 500;
      const row = typeCounters[type] || 0;
      typeCounters[type] = row + 1;
      const y = 80 + row * 110;
      newPos[n.id] = { x, y };
    });

    setPositions(newPos);
  }, [nodes]);

  // Color mapper by node type
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case 'BUSINESS_OUTCOME':
        return { bg: 'fill-purple-950/80', stroke: 'stroke-purple-500', text: 'text-purple-300' };
      case 'REQUIREMENT':
        return { bg: 'fill-lime-950/80', stroke: 'stroke-lime-400', text: 'text-lime-300' };
      case 'SYSTEM_COMPONENT':
        return { bg: 'fill-emerald-950/80', stroke: 'stroke-emerald-400', text: 'text-emerald-300' };
      case 'DATA_SOURCE':
        return { bg: 'fill-blue-950/80', stroke: 'stroke-blue-400', text: 'text-blue-300' };
      case 'TEST_CASE':
        return { bg: 'fill-teal-950/80', stroke: 'stroke-teal-400', text: 'text-teal-300' };
      case 'WORKFLOW_STEP':
        return { bg: 'fill-amber-950/80', stroke: 'stroke-amber-400', text: 'text-amber-300' };
      case 'QUESTION':
        return { bg: 'fill-rose-950/80', stroke: 'stroke-rose-400', text: 'text-rose-300' };
      default:
        return { bg: 'fill-zinc-900', stroke: 'stroke-zinc-600', text: 'text-zinc-300' };
    }
  };

  const filteredNodes = nodes.filter((n) => {
    if (filterType !== 'ALL' && n.node_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.id.toLowerCase().includes(q) || n.title.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.source_id) && filteredNodeIds.has(e.target_id)
  );

  // Mouse Handlers for Pan
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

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d0e11] p-3 rounded-xl hairline-border text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#0d0e11]">All Node Types</option>
              <option value="REQUIREMENT" className="bg-[#0d0e11]">Requirements</option>
              <option value="SYSTEM_COMPONENT" className="bg-[#0d0e11]">System Components</option>
              <option value="DATA_SOURCE" className="bg-[#0d0e11]">Data Sources</option>
              <option value="WORKFLOW_STEP" className="bg-[#0d0e11]">Workflows</option>
              <option value="TEST_CASE" className="bg-[#0d0e11]">Test Cases</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search node..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Zoom and Reset Controls */}
        <div className="flex items-center gap-2">
          <span className="font-mono-code text-[11px] text-zinc-500">
            {filteredNodes.length} Nodes / {filteredEdges.length} Edges
          </span>

          <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono-code text-[10px] px-2 text-zinc-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 40, y: 30 });
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 ml-1 border-l border-zinc-800"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div
        className="flex-1 bg-[#07080a] rounded-xl hairline-border relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDownSvg}
        onMouseMove={handleMouseMoveSvg}
        onMouseUp={handleMouseUpSvg}
      >
        {/* Background Grid Dots */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#71717a" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* Graph Transform Container */}
        <svg
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="16"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#bef264" opacity="0.6" />
            </marker>
            <marker
              id="arrow-conf"
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

          {/* Edges */}
          {filteredEdges.map((e, idx) => {
            const src = positions[e.source_id];
            const tgt = positions[e.target_id];
            if (!src || !tgt) return null;

            const isConf = e.relation === 'CONFLICTS_WITH';
            const strokeColor = isConf ? '#ef4444' : 'rgba(190, 242, 100, 0.4)';
            const markerId = isConf ? 'url(#arrow-conf)' : 'url(#arrow)';

            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2;

            return (
              <g key={idx}>
                <line
                  x1={src.x + 85}
                  y1={src.y + 35}
                  x2={tgt.x + 85}
                  y2={tgt.y + 35}
                  stroke={strokeColor}
                  strokeWidth={isConf ? 2.5 : 1.5}
                  strokeDasharray={isConf ? '4 4' : undefined}
                  markerEnd={markerId}
                />
                <text
                  x={midX + 85}
                  y={midY + 30}
                  fill={isConf ? '#ef4444' : '#71717a'}
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                  className="pointer-events-none select-none bg-black"
                >
                  {e.relation}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((n) => {
            const pos = positions[n.id] || { x: 100, y: 100 };
            const isSelected = selectedNode?.id === n.id;
            const color = getNodeColor(n.node_type);

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
                {/* Node Box */}
                <rect
                  width="180"
                  height="72"
                  rx="10"
                  fill="#0e1013"
                  stroke={isSelected ? '#bef264' : '#27272a'}
                  strokeWidth={isSelected ? 2 : 1}
                  className="transition-colors group-hover:stroke-lime-400/80 filter drop-shadow-md"
                />

                {/* Left accent color bar */}
                <rect
                  x="0"
                  y="0"
                  width="5"
                  height="72"
                  rx="2"
                  className={color.stroke}
                  fill="currentColor"
                />

                {/* Node ID & Type */}
                <text
                  x="14"
                  y="20"
                  fill="#bef264"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="ui-monospace, monospace"
                >
                  {n.id}
                </text>
                <text
                  x="170"
                  y="20"
                  fill="#71717a"
                  fontSize="8"
                  textAnchor="end"
                  fontFamily="ui-monospace, monospace"
                >
                  {n.node_type.replace('_', ' ')}
                </text>

                {/* Title */}
                <text
                  x="14"
                  y="38"
                  fill="#f4f4f5"
                  fontSize="10.5"
                  fontWeight="600"
                  className="truncate"
                >
                  {n.title.length > 22 ? `${n.title.substring(0, 22)}...` : n.title}
                </text>

                {/* Epistemic Chip */}
                <text
                  x="14"
                  y="56"
                  fill="#a1a1aa"
                  fontSize="8.5"
                  fontFamily="ui-monospace, monospace"
                >
                  {n.epistemic_status}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Helper Hint */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-[#0f1013]/90 border border-zinc-800 text-[10px] text-zinc-400 font-mono-code pointer-events-none">
          Click to inspect node • Drag nodes to reposition • Pan canvas freely
        </div>
      </div>
    </div>
  );
};
