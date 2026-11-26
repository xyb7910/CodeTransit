import { ContestTier, HighlightColor, ProgrammingLanguage } from './workspace';

export type StudioMode = 'code' | 'algorithm';

export type AlgoComponentType =
  // 1. Array / Matrix / String / Grid
  | 'array'
  | 'matrix'
  | 'string'
  | 'grid2d'
  // 2. Linear structures
  | 'stack'
  | 'queue'
  | 'deque'
  | 'linked-list'
  | 'monotonic-stack'
  | 'monotonic-queue'
  // 3. Hash / Set / DSU
  | 'hash-table'
  | 'set'
  | 'dsu'
  // 4. Trees & Heaps
  | 'binary-tree'
  | 'general-tree'
  | 'heap'
  | 'trie'
  // 5. Range / Advanced Trees
  | 'fenwick-tree'
  | 'segment-tree'
  | 'persistent-segtree'
  | 'balanced-tree'
  // 6. Graphs
  | 'graph'
  // 7. Dynamic Programming
  | 'dp-1d'
  | 'dp-2d'
  | 'dp-interval'
  | 'dp-tree'
  | 'dp-bitmask'
  // 8. Search & Recursion
  | 'search-tree'
  | 'recursion-tree'
  | 'call-stack'
  // 9. Math & Geometry
  | 'number-line'
  | 'coordinate-system'
  | 'math-formula'
  | 'geometry'
  // 10. Teaching & Annotations
  | 'variable-watcher'
  | 'complexity-card'
  | 'text-box'
  | 'data-table'
  | 'arrow'
  | 'callout'
  | 'flowchart'
  // 11. Freeform Draw, Shapes & Embedded Code (2.1)
  | 'rect-shape'
  | 'circle-shape'
  | 'freehand-stroke'
  | 'code-block';

export interface AlgoArrayData {
  items: Array<string | number>;
  indices?: boolean;
  pointers?: Array<{ index: number; label: string; color: HighlightColor }>;
  highlightedIndices?: Record<number, HighlightColor>;
  rangeHighlight?: { start: number; end: number; color: HighlightColor; label?: string };
}

export interface AlgoMatrixData {
  rows: Array<Array<string | number>>;
  rowLabels?: string[];
  colLabels?: string[];
  highlightedCells?: Record<string, HighlightColor>; // "r,c" -> color
  activeCell?: { r: number; c: number };
  dependencyArrows?: Array<{ from: [number, number]; to: [number, number]; label?: string }>;
}

export interface AlgoLinearData {
  items: Array<string | number>;
  direction?: 'vertical' | 'horizontal';
  highlightedIndices?: Record<number, HighlightColor>;
  caption?: string;
}

export interface AlgoHashSetData {
  buckets: Array<{ key: string; values: string[] }>;
  highlightedKeys?: Record<string, HighlightColor>;
}

export interface AlgoDsuData {
  parent: number[];
  rank?: number[];
  highlightedNodes?: Record<number, HighlightColor>;
}

export interface AlgoTreeNode {
  id: string;
  label: string;
  left?: string | null;
  right?: string | null;
  children?: string[];
  weight?: string | number;
  range?: [number, number]; // for segment tree / persistent segtree
  lazy?: string | number;
  highlight?: HighlightColor;
}

export interface AlgoTreeData {
  nodes: AlgoTreeNode[];
  rootId: string | null;
  highlightedNodeIds?: Record<string, HighlightColor>;
}

export interface AlgoGraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  weight?: string | number;
  layer?: number;
  highlight?: HighlightColor;
}

export interface AlgoGraphEdge {
  id: string;
  from: string;
  to: string;
  weight?: number;
  capacity?: number;
  flow?: number;
  directed: boolean;
  highlight?: HighlightColor;
  label?: string;
}

export type GraphLayoutType = 'manual' | 'force' | 'hierarchical' | 'tree' | 'circular';

export interface AlgoGraphData {
  variant: 'directed' | 'undirected' | 'weighted' | 'dag' | 'layered' | 'network-flow';
  nodes: AlgoGraphNode[];
  edges: AlgoGraphEdge[];
  allowMultiEdge: boolean;
  allowSelfLoop: boolean;
  layout: GraphLayoutType;
}

export interface AlgoDpData {
  variant: '1d' | '2d' | 'interval' | 'tree' | 'bitmask';
  rows: Array<Array<string | number>>;
  rowLabels?: string[];
  colLabels?: string[];
  formula?: string;
  highlightedCells?: Record<string, HighlightColor>;
  activeCell?: { r: number; c: number };
  dependencies?: Array<{ from: [number, number]; to: [number, number] }>;
}

export interface AlgoRecursionData {
  frames: Array<{
    id: string;
    fnName: string;
    args: string;
    retVal?: string;
    depth: number;
    parentId?: string;
    highlight?: HighlightColor;
  }>;
}

export interface AlgoMathGeoData {
  kind: 'number-line' | 'coordinate' | 'formula' | 'geometry';
  latex?: string;
  formulaNumber?: string;
  min?: number;
  max?: number;
  points?: Array<{ x: number; y: number; label: string; color?: HighlightColor }>;
  segments?: Array<{ x1: number; y1: number; x2: number; y2: number; label?: string }>;
  polygons?: Array<{ points: Array<[number, number]>; label?: string }>;
}

export interface AlgoAnnotationData {
  kind: 'variable-watcher' | 'complexity' | 'text' | 'table' | 'arrow' | 'callout' | 'flowchart';
  title?: string;
  text?: string;
  coachOnly?: boolean;
  timeComplexity?: string;
  spaceComplexity?: string;
  variables?: AlgoVariable[];
  tableHeaders?: string[];
  tableRows?: string[][];
  arrowStyle?: 'straight' | 'curved' | 'dashed';
  accentColor?: HighlightColor;
  flowNodes?: Array<{ id: string; label: string; shape: 'rect' | 'diamond' | 'oval' }>;
}

export type CanvasToolMode =
  | 'select'
  | 'hand'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'connector'
  | 'text'
  | 'brush'
  | 'highlight';

export type ArtboardMode = 'infinite' | 'auto-fit' | 'fixed' | 'multi';

export type FixedBoardPreset = 'custom' | '16:9' | '4:3' | '1:1' | '9:16' | 'A4' | 'A3';

export type ConnectorRouting = 'straight' | 'orthogonal' | 'bezier';

export type ConnectorAnchorSide = 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'center';

export type EditSemanticMode = 'visual' | 'data' | 'step';

export interface AlgoShapeData {
  shape: 'rect' | 'circle' | 'highlight-zone';
  label?: string;
}

export interface AlgoFreehandData {
  points: Array<{ x: number; y: number }>;
  strokeColor: string;
  strokeWidth: number;
  isHighlighter?: boolean;
}

export interface AlgoCodeBlockData {
  code: string;
  language: ProgrammingLanguage;
  highlightedLines: number[];
  fontSize?: number;
  themeName?: string;
  lineNotes?: Record<number, string>;
}

export interface SmartConnector {
  id: string;
  fromId: string;
  toId: string;
  fromAnchor: ConnectorAnchorSide;
  toAnchor: ConnectorAnchorSide;
  routing: ConnectorRouting;
  arrowKind: 'none' | 'single' | 'double';
  label?: string;
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
  controlOffset?: { dx: number; dy: number };
  locked?: boolean;
}

export interface CanvasGroup {
  id: string;
  name: string;
  parentGroupId?: string;
  collapsed?: boolean;
  locked?: boolean;
  visible?: boolean;
}

export interface CustomGuide {
  id: string;
  axis: 'x' | 'y';
  pos: number;
}

export interface InnerSubSelection {
  itemId: string;
  kind: 'array-cell' | 'matrix-cell' | 'dp-cell' | 'graph-node' | 'graph-edge' | 'tree-node';
  index?: number;
  row?: number;
  col?: number;
  nodeId?: string;
  edgeId?: string;
}

export type AlgoComponentPayload =
  | { kind: 'array'; data: AlgoArrayData }
  | { kind: 'matrix'; data: AlgoMatrixData }
  | { kind: 'linear'; data: AlgoLinearData }
  | { kind: 'hashset'; data: AlgoHashSetData }
  | { kind: 'dsu'; data: AlgoDsuData }
  | { kind: 'tree'; data: AlgoTreeData }
  | { kind: 'graph'; data: AlgoGraphData }
  | { kind: 'dp'; data: AlgoDpData }
  | { kind: 'recursion'; data: AlgoRecursionData }
  | { kind: 'mathgeo'; data: AlgoMathGeoData }
  | { kind: 'annotation'; data: AlgoAnnotationData }
  | { kind: 'shape'; data: AlgoShapeData }
  | { kind: 'freehand'; data: AlgoFreehandData }
  | { kind: 'codeblock'; data: AlgoCodeBlockData };

export interface AlgoCanvasItem {
  id: string;
  type: AlgoComponentType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  aiLocked?: boolean;
  groupId?: string;
  coachOnly?: boolean;
  style: {
    background?: string;
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    accentColor?: string;
    textColor?: string;
    fontSize?: number;
    opacity?: number;
    borderRadius?: number;
    shadow?: 'none' | 'sm' | 'md' | 'lg';
  };
  payload: AlgoComponentPayload;
}

export interface Artboard {
  id: string;
  name: string;
  width: number;
  height: number;
  originX?: number;
  originY?: number;
  mode?: ArtboardMode;
  preset?: FixedBoardPreset;
  background: string;
  items: AlgoCanvasItem[];
  connectors?: SmartConnector[];
  groups?: CanvasGroup[];
  guides?: CustomGuide[];
}

export interface AlgoVariable {
  name: string;
  value: string;
  type?: string;
  changed?: boolean;
}

export interface AlgorithmEvent {
  id: string;
  type:
    | 'compare'
    | 'swap'
    | 'assign'
    | 'visit'
    | 'relax'
    | 'push'
    | 'pop'
    | 'transition'
    | 'select'
    | 'error'
    | 'done';
  targetId?: string;
  message: string;
  timestampStep: number;
}

export interface AlgoSnapshot {
  artboardItems: Record<string, AlgoComponentPayload>; // componentId -> deep snapshot payload
  variables: AlgoVariable[];
}

export interface AlgoStep {
  id: string;
  index: number;
  title: string;
  explanation: string;
  coachNote?: string;
  formulaLatex?: string;
  codeLines: number[];
  durationMs: number;
  animationStyle: 'smooth' | 'snappy' | 'instant';
  highlights: {
    nodes?: Record<string, HighlightColor>;
    edges?: Record<string, HighlightColor>;
    arrayIndices?: Record<number, HighlightColor>;
    dpCells?: Record<string, HighlightColor>;
  };
  events: AlgorithmEvent[];
  snapshot: AlgoSnapshot;
}

export type TraceSourceMode = 'builtin' | 'dsl' | 'manual' | 'external' | 'ai_draft';

export type ExecutionTraceSource = 'builtin' | 'dsl' | 'manual' | 'external_cpp' | 'ai_draft';

export type TeachingTier = 'GESP' | 'CSP-J' | 'CSP-S' | 'NOIP' | 'ACM' | '省选基础';

export type TeachingStyle =
  | 'heuristic'
  | 'deductive'
  | 'comparative'
  | 'diagnosis'
  | 'interactive_qa'
  | 'presentation';

export interface SceneSchema {
  version: '1.0.0' | '2.0.0';
  id: string;
  name: string;
  tier: ContestTier;
  templateId: string;
  traceMode: TraceSourceMode;
  traceSource?: ExecutionTraceSource;
  language: ProgrammingLanguage;
  linkedCode: string;
  formulaLatex: string;
  artboards: Artboard[];
  activeArtboardId: string;
  steps: AlgoStep[];
  currentStepIndex: number;
  lockedCode?: boolean;
  lockedStepIds?: string[];
  teaching?: {
    tier: TeachingTier;
    style: TeachingStyle;
    viewRole: 'coach' | 'student';
    questionPrompt?: string;
    expectedAnswer?: string;
  };
  dslText?: string;
  dslFormat?: 'json' | 'yaml';
  expectedOutput?: string;
  actualOutput?: string;
  traceStale?: boolean;
  traceStaleReason?: string;
  author: {
    enabled: boolean;
    name: string;
  };
  updatedAt: number;
}

export interface StudioLayoutPrefs {
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  snapThreshold?: number;
  guideColor?: string;
}

export interface AlgoAssetItem {
  id: string;
  name: string;
  category: string;
  item: AlgoCanvasItem;
  createdAt: number;
}
