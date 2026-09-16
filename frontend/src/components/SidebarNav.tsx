import React from 'react';
import {
  Compass,
  FileSpreadsheet,
  Network,
  ListTodo,
  GitFork,
  Share2,
  Server,
  CheckCircle2,
  Activity,
  ShieldAlert,
  Calculator,
  Award,
  History,
  BookOpen,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { TraceNode } from '../types/trace';

export type ScreenId =
  | '00_GATEWAY'
  | '01_OVERVIEW'
  | '02_INGESTION'
  | '03_CONCEPTUAL_MODEL'
  | '04_REQUIREMENTS'
  | '05_WORKFLOWS'
  | '06_TRACEABILITY_GRAPH'
  | '07_ARCHITECTURE'
  | '08_ACCEPTANCE_TESTS'
  | '09_READINESS_ENGINE'
  | '10_GOVERNANCE'
  | '11_SPRINT_SIZING'
  | '12_EXECUTIVE_MEMO'
  | '13_SNAPSHOTS'
  | '14_METHODOLOGY';

interface NavItem {
  id: ScreenId;
  indexStr: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  section: string;
}

interface SidebarNavProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  nodes: TraceNode[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentScreen,
  onSelectScreen,
  nodes,
  isCollapsed,
  onToggleCollapse,
}) => {
  const reqCount = nodes.filter((n) => n.node_type === 'REQUIREMENT').length;
  const ambCount = nodes.filter((n) => n.node_type === 'REQUIREMENT' && n.is_ambiguous).length;
  const testCount = nodes.filter((n) => n.node_type === 'TEST_CASE').length;
  const compCount = nodes.filter((n) => n.node_type === 'SYSTEM_COMPONENT').length;

  const navItems: NavItem[] = [
    // Core Entry
    { id: '00_GATEWAY', indexStr: '00', label: 'Gateway & Landing', icon: LayoutDashboard, section: 'MISSION CONTROL' },
    { id: '01_OVERVIEW', indexStr: '01', label: 'Executive Overview', icon: Compass, section: 'MISSION CONTROL' },
    { id: '02_INGESTION', indexStr: '02', label: 'Data Ingestion Hub', icon: FileSpreadsheet, section: 'MISSION CONTROL' },
    
    // Systems Engineering
    { id: '03_CONCEPTUAL_MODEL', indexStr: '03', label: 'Conceptual Model', icon: Network, section: 'SYSTEM ONTOLOGY' },
    { 
      id: '04_REQUIREMENTS', 
      indexStr: '04', 
      label: 'Requirements & Resolvers', 
      icon: ListTodo, 
      badge: ambCount > 0 ? `${ambCount} AMB` : reqCount,
      badgeColor: ambCount > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-zinc-800 text-zinc-300',
      section: 'SYSTEM ONTOLOGY' 
    },
    { id: '05_WORKFLOWS', indexStr: '05', label: 'Workflows & Sequences', icon: GitFork, section: 'SYSTEM ONTOLOGY' },
    { id: '06_TRACEABILITY_GRAPH', indexStr: '06', label: 'Traceability Graph', icon: Share2, badge: `${nodes.length} N`, badgeColor: 'bg-lime-400/20 text-lime-300 border-lime-400/30', section: 'SYSTEM ONTOLOGY' },
    
    // Architecture & Verification
    { id: '07_ARCHITECTURE', indexStr: '07', label: 'Architecture & ADRs', icon: Server, badge: compCount, section: 'EXECUTION & VERIFICATION' },
    { id: '08_ACCEPTANCE_TESTS', indexStr: '08', label: 'Acceptance Verification', icon: CheckCircle2, badge: testCount, section: 'EXECUTION & VERIFICATION' },
    { id: '09_READINESS_ENGINE', indexStr: '09', label: '8-Factor Readiness', icon: Activity, section: 'EXECUTION & VERIFICATION' },
    { id: '10_GOVERNANCE', indexStr: '10', label: 'Governance & Compliance', icon: ShieldAlert, section: 'EXECUTION & VERIFICATION' },

    // Delivery & Governance
    { id: '11_SPRINT_SIZING', indexStr: '11', label: 'Sprint Sizing & Cost', icon: Calculator, section: 'DELIVERY & GOVERNANCE' },
    { id: '12_EXECUTIVE_MEMO', indexStr: '12', label: 'Executive Sign-Off Memo', icon: Award, section: 'DELIVERY & GOVERNANCE' },
    { id: '13_SNAPSHOTS', indexStr: '13', label: 'Version Snapshots & Diff', icon: History, section: 'DELIVERY & GOVERNANCE' },
    { id: '14_METHODOLOGY', indexStr: '14', label: 'Epistemic Methodology', icon: BookOpen, section: 'DELIVERY & GOVERNANCE' },
  ];

  // Group items by section
  const sections = Array.from(new Set(navItems.map((item) => item.section)));

  return (
    <aside
      className={`relative shrink-0 hairline-border-r bg-[#0b0c0e] flex flex-col justify-between transition-all duration-200 z-30 ${
        isCollapsed ? 'w-14' : 'w-64'
      }`}
    >
      {/* Top Header toggle */}
      <div className="flex items-center justify-between p-3 hairline-border-b">
        {!isCollapsed && (
          <span className="text-[10px] font-mono-code font-bold tracking-wider text-zinc-500 uppercase">
            EXPLORER / SCREENS
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-auto"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List with Sections */}
      <div className="flex-1 overflow-y-auto py-2 space-y-4 px-2">
        {sections.map((secName) => {
          const items = navItems.filter((i) => i.section === secName);
          return (
            <div key={secName} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 py-1 text-[9px] font-mono-code tracking-widest text-zinc-600 uppercase font-semibold">
                  {secName}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectScreen(item.id)}
                    title={isCollapsed ? `${item.indexStr} // ${item.label}` : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 text-left ${
                      isActive
                        ? 'bg-lime-400/10 text-lime-300 font-medium border border-lime-400/20 shadow-[0_0_12px_rgba(190,242,100,0.1)]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-lime-400' : 'text-zinc-500'}`} />

                    {!isCollapsed && (
                      <>
                        <span className="font-mono-code text-[10px] text-zinc-500 shrink-0">
                          {item.indexStr}
                        </span>
                        <span className="truncate flex-1 text-[11px]">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`text-[9px] font-mono-code px-1.5 py-0.5 rounded border shrink-0 ${
                              item.badgeColor || 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 hairline-border-t bg-[#08090a] text-[10px] text-zinc-500 font-mono-code flex items-center justify-between">
          <span>TRACE ENGINE</span>
          <span className="text-lime-400">100% NON-AI</span>
        </div>
      )}
    </aside>
  );
};
