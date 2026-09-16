import data from './phoenixData.json';
import { TraceNode, TraceEdge, ReadinessResult } from '../types/trace';

export const INITIAL_BRIEF: string = data.brief;
export const INITIAL_NODES: TraceNode[] = data.nodes as unknown as TraceNode[];
export const INITIAL_EDGES: TraceEdge[] = data.edges as unknown as TraceEdge[];
export const INITIAL_READINESS: ReadinessResult = data.readiness as unknown as ReadinessResult;
