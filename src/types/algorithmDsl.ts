import {
  AlgoCanvasItem,
  AlgoComponentPayload,
  AlgoComponentType,
  AlgoStep,
  AlgoVariable,
  AlgorithmEvent,
  ExecutionTraceSource,
  SceneSchema,
  TeachingStyle,
  TeachingTier,
} from './algorithmStudio';
import { ContestTier, HighlightColor, ProgrammingLanguage } from './workspace';

export type DslVersion = '2.0.0';

export type CreationMode =
  | 'natural-language'
  | 'cpp-source'
  | 'markdown-solution'
  | 'test-samples'
  | 'custom-rules'
  | 'ai-reedit';

export interface DslLimits {
  maxSteps: number;
  maxDepth: number;
  maxMemoryCells: number;
  maxArraySize: number;
  maxTimeMs: number;
}

export const DEFAULT_DSL_LIMITS: DslLimits = {
  maxSteps: 180,
  maxDepth: 24,
  maxMemoryCells: 4096,
  maxArraySize: 256,
  maxTimeMs: 1200,
};

export interface DslInputField {
  name: string;
  type: 'number' | 'number[]' | 'number[][]' | 'string' | 'graph';
  defaultValue: unknown;
  sampleText?: string;
  description?: string;
}

export interface DslStateVarDef {
  name: string;
  type: 'number' | 'number[]' | 'number[][]' | 'string' | 'boolean';
  initial: unknown;
  componentId?: string;
}

export interface DslComponentDef {
  id: string;
  semanticType: SemanticComponentKind;
  componentType: AlgoComponentType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  boundVar?: string;
  coachOnly?: boolean;
  initialPayload?: AlgoComponentPayload;
}

export type DslStatement =
  | {
      id?: string;
      op: 'set';
      varName: string;
      expr: string;
      label?: string;
    }
  | {
      id?: string;
      op: 'arraySet';
      target: string;
      indexExpr: string;
      valueExpr: string;
      componentId?: string;
      highlight?: HighlightColor;
    }
  | {
      id?: string;
      op: 'matrixSet';
      target: string;
      rowExpr: string;
      colExpr: string;
      valueExpr: string;
      componentId?: string;
      highlight?: HighlightColor;
    }
  | {
      id?: string;
      op: 'swap';
      target: string;
      iExpr: string;
      jExpr: string;
      componentId?: string;
    }
  | {
      id?: string;
      op: 'push' | 'enqueue';
      target: string;
      valueExpr: string;
      componentId?: string;
    }
  | {
      id?: string;
      op: 'pop' | 'dequeue';
      target: string;
      assignVar?: string;
      componentId?: string;
    }
  | {
      id?: string;
      op: 'if';
      condition: string;
      thenOps: DslStatement[];
      elseOps?: DslStatement[];
    }
  | {
      id?: string;
      op: 'for';
      varName: string;
      fromExpr: string;
      toExpr: string;
      inclusive?: boolean;
      stepExpr?: string;
      body: DslStatement[];
    }
  | {
      id?: string;
      op: 'while';
      condition: string;
      maxIter?: number;
      body: DslStatement[];
    }
  | {
      id?: string;
      op: 'highlight';
      componentId: string;
      indicesExpr?: string[];
      cellExpr?: [string, string];
      color?: HighlightColor;
    }
  | {
      id?: string;
      op: 'emit';
      eventType: AlgorithmEvent['type'];
      targetId?: string;
      messageExpr: string;
    }
  | {
      id?: string;
      op: 'step';
      titleExpr: string;
      explanationExpr: string;
      codeLines?: number[];
      formulaLatex?: string;
      coachNote?: string;
      durationMs?: number;
    };

export interface DslConditionDef {
  id: string;
  name: string;
  expr: string;
  description?: string;
}

export interface DslTransitionDef {
  id: string;
  name: string;
  formula?: string;
  when?: string;
  action: DslStatement;
}

export interface DslBindingDef {
  componentId: string;
  stateVar: string;
  codeLines?: number[];
  role: 'primary' | 'auxiliary' | 'watcher' | 'formula' | 'output';
}

export interface DslAnnotationDef {
  id: string;
  stepIndex?: number;
  title: string;
  text: string;
  coachOnly?: boolean;
  level?: TeachingTier;
}

export interface AlgorithmSceneDSL {
  version: DslVersion;
  scene: {
    id: string;
    name: string;
    tier: ContestTier;
    teachingTier?: TeachingTier;
    teachingStyle?: TeachingStyle;
    author: string;
    description?: string;
    language: ProgrammingLanguage;
    linkedCode: string;
    formulaLatex: string;
  };
  input: {
    fields: DslInputField[];
    expectedOutput?: string;
    sampleNote?: string;
  };
  state: {
    variables: DslStateVarDef[];
  };
  components: DslComponentDef[];
  operations: DslStatement[];
  conditions: DslConditionDef[];
  transitions: DslTransitionDef[];
  events: Array<{
    type: AlgorithmEvent['type'];
    description: string;
  }>;
  bindings: DslBindingDef[];
  timeline: {
    defaultDurationMs: number;
    animationStyle: 'smooth' | 'snappy' | 'instant';
    autoSnapshotOnStep: boolean;
  };
  annotations: DslAnnotationDef[];
  output: {
    expression: string;
    label?: string;
  };
  theme: {
    mode: 'dark' | 'light';
    accentColor: string;
    background: string;
    gridSize: number;
  };
  limits?: Partial<DslLimits>;
}

export type SemanticComponentKind =
  | 'SmartArray'
  | 'SmartMatrix'
  | 'SmartStack'
  | 'SmartQueue'
  | 'SmartLinkedList'
  | 'SmartTree'
  | 'SmartGraph'
  | 'SmartDPTable'
  | 'SmartRecursion'
  | 'SmartHeap'
  | 'SmartUnionFind'
  | 'SmartPointer'
  | 'SmartVariable'
  | 'SmartFormula'
  | 'SmartGrid';

export interface SemanticOperation {
  kind: 'write-array' | 'write-cell' | 'swap' | 'push' | 'pop' | 'enqueue' | 'dequeue' | 'highlight' | 'set-vars';
  index?: number;
  index2?: number;
  row?: number;
  col?: number;
  value?: string | number;
  color?: HighlightColor;
  indices?: number[];
  cells?: Array<[number, number]>;
  variables?: AlgoVariable[];
  stepIndex: number;
}

export interface SemanticOperationResult {
  payload: AlgoComponentPayload;
  events: AlgorithmEvent[];
  valid: boolean;
  error?: string;
}

export interface PlanStageItem {
  key:
    | 'inputUnderstanding'
    | 'algorithmRecognition'
    | 'dsModeling'
    | 'stateDesign'
    | 'opsAndEvents'
    | 'deduction'
    | 'visualLayout'
    | 'teachingSteps';
  title: string;
  summary: string;
  details: string[];
  editableText: string;
  approved: boolean;
}

export interface AlgorithmDesignPlan {
  id: string;
  title: string;
  creationMode: CreationMode;
  detectedAlgorithm: string;
  confidenceNote: string;
  teachingTier: TeachingTier;
  teachingStyle: TeachingStyle;
  recommendedComponents: AlgoComponentType[];
  isStaticAnalysisOnly: boolean;
  stages: PlanStageItem[];
  createdAt: number;
}

export interface ScenePatchOp {
  id: string;
  op: 'update-meta' | 'add-item' | 'update-item' | 'remove-item' | 'add-step' | 'update-step' | 'remove-step' | 'update-code' | 'update-dsl';
  targetId?: string;
  stepIndex?: number;
  summary: string;
  beforePreview?: string;
  afterPreview?: string;
  payload: Record<string, unknown>;
}

export interface ScenePatchBundle {
  id: string;
  prompt: string;
  explanation: string;
  ops: ScenePatchOp[];
  createdAt: number;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: 'schema' | 'bounds' | 'precondition' | 'transition' | 'limits' | 'snapshot' | 'output' | 'export' | 'trace-honesty';
  location: string;
  message: string;
  suggestion: string;
}

export interface ValidationReport {
  status: 'verified' | 'draft' | 'warning' | 'error';
  traceSource: ExecutionTraceSource;
  checkedAt: number;
  summary: string;
  issues: ValidationIssue[];
  stats: {
    componentCount: number;
    stepCount: number;
    eventCount: number;
    expectedOutput?: string;
    actualOutput?: string;
    outputMatched?: boolean;
  };
}

export interface StaticAnalysisResult {
  detectedParadigm: string;
  candidateAlgorithms: string[];
  variables: Array<{ name: string; typeHint: string; role: string }>;
  containers: Array<{ cppType: string; suggestedComponent: AlgoComponentType; semanticKind: SemanticComponentKind }>;
  loopCount: number;
  hasRecursion: boolean;
  hasDpRecurrence: boolean;
  recommendedComponents: AlgoComponentType[];
  warnings: string[];
  disclaimer: string;
}

export interface CustomAlgorithmRecord {
  id: string;
  name: string;
  description: string;
  tier: ContestTier;
  dsl: AlgorithmSceneDSL;
  createdAt: number;
  updatedAt: number;
}

export interface DslExecutionResult {
  ok: boolean;
  scene?: SceneSchema;
  steps?: AlgoStep[];
  items?: AlgoCanvasItem[];
  actualOutput?: string;
  error?: string;
  stats: {
    stepsGenerated: number;
    opsExecuted: number;
    elapsedMs: number;
    maxDepthReached: number;
  };
}
