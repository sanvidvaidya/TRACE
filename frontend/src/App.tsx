import React, { useState, useMemo, useEffect } from 'react';
import { TraceNode, TraceEdge, ReadinessResult, VersionSnapshot } from './types/trace';
import { INITIAL_NODES, INITIAL_EDGES, INITIAL_READINESS } from './data/phoenixData';
import { evaluateReadiness } from './lib/readinessEngine';
import { TraceHeader, SpatialMode } from './components/TraceHeader';
import { TraceLandingPage } from './components/TraceLandingPage';
import { TraceQuickstartModal } from './components/TraceQuickstartModal';
import { SystemsCanvasMode } from './components/modes/SystemsCanvasMode';
import { AmbiguityRadarMode } from './components/modes/AmbiguityRadarMode';
import { BlastRadiusMode } from './components/modes/BlastRadiusMode';
import { ExecutiveCertificationMode } from './components/modes/ExecutiveCertificationMode';
import { IngestModal } from './components/IngestModal';
import { NodeInspectorSheet } from './components/NodeInspectorSheet';
import { checkTraceHealth, fetchTraceGraph, simulateBlastRadius } from './services/traceApi';
import { Toaster, toast } from 'sonner';

export const App: React.FC = () => {
  // Active Navigation Mode
  const [activeMode, setActiveMode] = useState<SpatialMode>('LANDING');

  // Core State
  const [nodes, setNodes] = useState<TraceNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<TraceEdge[]>(INITIAL_EDGES);
  const [projectTitle, setProjectTitle] = useState<string>('Project Phoenix Architecture');
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);

  // Simulation & Snapshots
  const [simulatedFailures, setSimulatedFailures] = useState<Set<string>>(new Set());
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([
    {
      id: 'snap-001',
      title: 'Initial Architecture Ingest',
      timestamp: '2026-09-08 14:00',
      nodesCount: INITIAL_NODES.length,
      score: INITIAL_READINESS.total_score,
      nodes: INITIAL_NODES,
      edges: INITIAL_EDGES,
    },
  ]);

  // Modals
  const [isIngestOpen, setIsIngestOpen] = useState<boolean>(false);
  const [isQuickstartOpen, setIsQuickstartOpen] = useState<boolean>(false);

  // Live Python NetworkX Backend Connection
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    checkTraceHealth().then((health) => {
      if (!mounted) return;
      if (health && health.status === 'ok') {
        setBackendConnected(true);
        console.log('[TRACE] Connected to Python NetworkX Engine on port 8001');
      }
    });
    return () => { mounted = false; };
  }, []);

  // Computed Dynamic Readiness Score (sub-millisecond evaluation in TS)
  const readiness: ReadinessResult = useMemo(() => {
    return evaluateReadiness(nodes, simulatedFailures);
  }, [nodes, simulatedFailures]);

  // Actions
  const handleToggleSimulatedFailure = (nodeId: string) => {
    setSimulatedFailures((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleResetFailures = () => {
    setSimulatedFailures(new Set());
    toast.success('All simulated outages cleared. System operational.');
  };

  const handleTakeSnapshot = (title?: string) => {
    const newSnapshot: VersionSnapshot = {
      id: `snap-${Date.now().toString().slice(-4)}`,
      title: title || `Checkpoint v${snapshots.length + 1}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      nodesCount: nodes.length,
      score: readiness.total_score,
      nodes: [...nodes],
      edges: [...edges],
    };
    setSnapshots((prev) => [newSnapshot, ...prev]);
    toast.success(`Snapshot captured: ${newSnapshot.title} (Readiness: ${readiness.total_score}%)`);
  };

  const handleUpdateRequirement = (updatedReq: TraceNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updatedReq.id ? updatedReq : n)));
  };

  const handleResolveContradiction = (contradictionId: string, chosenOption: string) => {
    toast.success(`Contradiction ${contradictionId} resolved: Selected "${chosenOption}"`);
  };

  const handleUpdateTestStatus = (testId: string, status: 'PASSED' | 'FAILED' | 'PENDING') => {
    setNodes((prev) =>
      prev.map((n) => (n.id === testId ? { ...n, test_status: status } : n))
    );
  };

  const handlePromoteValidation = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, validation_status: 'VALIDATED_BY_HUMAN' } : n))
    );
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, validation_status: 'VALIDATED_BY_HUMAN' } : null);
    }
    toast.success(`Node ${nodeId} promoted to Human Validated status!`);
  };

  const handleSelectConnectedNode = (nodeId: string) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (target) {
      setSelectedNode(target);
    }
  };

  const handleIngest = (text: string, title: string) => {
    setProjectTitle(title);
    setIsIngestOpen(false);
    toast.success(`Ingested "${title}" successfully`);
  };

  const handleResetPhoenix = () => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setProjectTitle('Project Phoenix Architecture');
    setSimulatedFailures(new Set());
    setIsIngestOpen(false);
    toast.info('Restored Project Phoenix architecture baseline');
  };

  return (
    <div className="min-h-screen bg-[#091124] text-slate-100 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-200">
      <Toaster position="bottom-right" theme="dark" richColors />

      {/* Top Engineering Navigation Header */}
      <TraceHeader
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        readiness={readiness}
        onOpenIngest={() => setIsIngestOpen(true)}
        onTakeSnapshot={() => handleTakeSnapshot()}
        hasSimulatedFailures={simulatedFailures.size > 0}
        onResetFailures={handleResetFailures}
        onOpenQuickstart={() => setIsQuickstartOpen(true)}
        backendConnected={backendConnected}
      />

      {/* Main Spatial Stage */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-16">
        {activeMode === 'LANDING' && (
          <TraceLandingPage
            onSelectMode={setActiveMode}
            readiness={readiness}
            onOpenIngest={() => setIsIngestOpen(true)}
            onOpenQuickstart={() => setIsQuickstartOpen(true)}
          />
        )}

        {activeMode === 'CANVAS' && (
          <div className="pt-6 pb-12">
            <SystemsCanvasMode
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              projectTitle={projectTitle}
            />
          </div>
        )}

        {activeMode === 'AMBIGUITY' && (
          <div className="pt-6 pb-12">
            <AmbiguityRadarMode
              nodes={nodes}
              edges={edges}
              onSelectNode={setSelectedNode}
              onUpdateRequirement={handleUpdateRequirement}
              onResolveContradiction={handleResolveContradiction}
            />
          </div>
        )}

        {activeMode === 'BLAST_RADIUS' && (
          <div className="pt-6 pb-12">
            <BlastRadiusMode
              nodes={nodes}
              edges={edges}
              onSelectNode={setSelectedNode}
              simulatedFailures={simulatedFailures}
              onToggleSimulatedFailure={handleToggleSimulatedFailure}
            />
          </div>
        )}

        {activeMode === 'CERTIFICATION' && (
          <div className="pt-6 pb-12">
            <ExecutiveCertificationMode
              nodes={nodes}
              edges={edges}
              readiness={readiness}
              projectTitle={projectTitle}
              onUpdateTestStatus={handleUpdateTestStatus}
              snapshots={snapshots}
              onTakeSnapshot={handleTakeSnapshot}
            />
          </div>
        )}
      </main>

      {/* Slide-Over Node Inspector Sheet */}
      <NodeInspectorSheet
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        edges={edges}
        allNodes={nodes}
        onPromoteValidation={handlePromoteValidation}
        onSelectConnectedNode={handleSelectConnectedNode}
      />

      {/* Ingest Spec Modal */}
      <IngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onIngest={handleIngest}
        onResetPhoenix={handleResetPhoenix}
      />

      {/* 3-Step Quickstart Guide Modal */}
      <TraceQuickstartModal
        isOpen={isQuickstartOpen}
        onClose={() => setIsQuickstartOpen(false)}
        onSelectMode={setActiveMode}
        onOpenIngest={() => {
          setIsQuickstartOpen(false);
          setIsIngestOpen(true);
        }}
      />
    </div>
  );
};

export default App;
