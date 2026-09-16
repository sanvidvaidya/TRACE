import React, { useState, useEffect } from 'react';
import { ScreenId } from './SidebarNav';
import { PersonaLens, TraceNode } from '../types/trace';
import { Search, Compass, Terminal, ArrowRight, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScreen: (screen: ScreenId) => void;
  onSelectLens: (lens: PersonaLens) => void;
  onSelectNode: (node: TraceNode) => void;
  nodes: TraceNode[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectScreen,
  onSelectLens,
  onSelectNode,
  nodes,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const screens: Array<{ id: ScreenId; label: string; group: string }> = [
    { id: '00_GATEWAY', label: '00 // Gateway & Landing', group: 'Navigation' },
    { id: '01_OVERVIEW', label: '01 // Executive Overview', group: 'Navigation' },
    { id: '02_INGESTION', label: '02 // Data Ingestion Hub', group: 'Navigation' },
    { id: '03_CONCEPTUAL_MODEL', label: '03 // Conceptual Domain Model', group: 'Navigation' },
    { id: '04_REQUIREMENTS', label: '04 // Requirements & Ambiguity Resolvers', group: 'Navigation' },
    { id: '05_WORKFLOWS', label: '05 // Workflows & Sequences', group: 'Navigation' },
    { id: '06_TRACEABILITY_GRAPH', label: '06 // Traceability Graph (Interactive)', group: 'Navigation' },
    { id: '07_ARCHITECTURE', label: '07 // Architecture, What-If & ADRs', group: 'Navigation' },
    { id: '08_ACCEPTANCE_TESTS', label: '08 // Acceptance Verification Suite', group: 'Navigation' },
    { id: '09_READINESS_ENGINE', label: '09 // 8-Factor Readiness Diagnostic', group: 'Navigation' },
    { id: '10_GOVERNANCE', label: '10 // Governance & Compliance Heatmap', group: 'Navigation' },
    { id: '11_SPRINT_SIZING', label: '11 // Sprint Sizing & Cloud Cost', group: 'Navigation' },
    { id: '12_EXECUTIVE_MEMO', label: '12 // Executive Sign-Off Memo', group: 'Navigation' },
    { id: '13_SNAPSHOTS', label: '13 // Version Snapshots & Diff', group: 'Navigation' },
    { id: '14_METHODOLOGY', label: '14 // Epistemic Methodology & Non-AI', group: 'Navigation' },
  ];

  const lenses: Array<{ id: PersonaLens; label: string }> = [
    { id: 'ALL_SYSTEMS', label: 'Lens: All Systems (Full Workbench)' },
    { id: 'EXECUTIVE', label: 'Lens: Executive Sponsor' },
    { id: 'ARCHITECT', label: 'Lens: Solutions Architect' },
    { id: 'QA_LEAD', label: 'Lens: QA & Test Lead' },
    { id: 'GOVERNANCE', label: 'Lens: Security & Governance' },
  ];

  const filteredScreens = screens.filter((s) =>
    s.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredLenses = lenses.filter((l) =>
    l.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredNodes = nodes
    .filter(
      (n) =>
        n.id.toLowerCase().includes(query.toLowerCase()) ||
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.node_type.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center pt-24 px-4">
      <div 
        className="w-full max-w-xl bg-[#0f1013] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a screen name, entity ID, or persona lens..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent text-zinc-100 text-sm placeholder-zinc-500 w-full focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3 text-xs">
          {filteredScreens.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono-code uppercase text-zinc-500 font-semibold">
                Screens & Workspaces
              </div>
              {filteredScreens.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelectScreen(s.id);
                    onClose();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-lime-400/10 hover:text-lime-300 text-zinc-300 flex items-center justify-between group transition-colors"
                >
                  <span>{s.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-lime-400 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {filteredLenses.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono-code uppercase text-zinc-500 font-semibold">
                Persona Lenses
              </div>
              {filteredLenses.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    onSelectLens(l.id);
                    onClose();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-purple-500/10 hover:text-purple-300 text-zinc-300 flex items-center justify-between group transition-colors"
                >
                  <span>{l.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {filteredNodes.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono-code uppercase text-zinc-500 font-semibold">
                Entities & Requirements
              </div>
              {filteredNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    onSelectNode(n);
                    onClose();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-zinc-800/80 text-zinc-300 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono-code text-lime-400 text-[11px] shrink-0">{n.id}</span>
                    <span className="truncate">{n.title}</span>
                  </div>
                  <span className="text-[10px] font-mono-code text-zinc-500 shrink-0 uppercase">
                    {n.node_type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
