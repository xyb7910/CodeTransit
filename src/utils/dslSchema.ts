import { dump as yamlDump, JSON_SCHEMA, load as yamlLoad } from 'js-yaml';
import { SceneSchema } from '../types/algorithmStudio';
import {
  AlgorithmSceneDSL,
  DEFAULT_DSL_LIMITS,
} from '../types/algorithmDsl';

export interface DslParseResult {
  ok: boolean;
  dsl?: AlgorithmSceneDSL;
  errors: string[];
}

const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

function hasForbiddenKeys(obj: unknown, depth = 0): boolean {
  if (depth > 25 || !obj || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) {
    return obj.some((x) => hasForbiddenKeys(x, depth + 1));
  }
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.includes(key)) return true;
    if (hasForbiddenKeys((obj as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}

export function serializeDsl(dsl: AlgorithmSceneDSL, format: 'json' | 'yaml'): string {
  if (format === 'yaml') {
    return yamlDump(dsl, { noRefs: true, lineWidth: 110, sortKeys: false });
  }
  return JSON.stringify(dsl, null, 2);
}

export function validateDslObject(raw: unknown): DslParseResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['DSL 根节点必须是对象'] };
  }
  if (hasForbiddenKeys(raw)) {
    return { ok: false, errors: ['检测到非法原型链保留字段 (__proto__ / constructor / prototype)'] };
  }

  const d = raw as Partial<AlgorithmSceneDSL>;
  if (d.version !== '2.0.0') {
    errors.push(`version 必须为 "2.0.0" (当前: ${String(d.version)})`);
  }
  if (!d.scene || typeof d.scene.name !== 'string' || !d.scene.name.trim()) {
    errors.push('缺少有效的 scene.name');
  }
  if (!d.input || !Array.isArray(d.input.fields)) {
    errors.push('缺少 input.fields 数组');
  }
  if (!d.state || !Array.isArray(d.state.variables)) {
    errors.push('缺少 state.variables 数组');
  }
  if (!Array.isArray(d.components)) {
    errors.push('缺少 components 数组');
  }
  if (!Array.isArray(d.operations)) {
    errors.push('缺少 operations 语句列表');
  }

  // Validate bounds on limits
  const maxSteps = d.limits?.maxSteps ?? DEFAULT_DSL_LIMITS.maxSteps;
  const maxDepth = d.limits?.maxDepth ?? DEFAULT_DSL_LIMITS.maxDepth;
  if (maxSteps <= 0 || maxSteps > 500) {
    errors.push('limits.maxSteps 必须在 1..500 之间');
  }
  if (maxDepth <= 0 || maxDepth > 64) {
    errors.push('limits.maxDepth 必须在 1..64 之间');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const normalized: AlgorithmSceneDSL = {
    version: '2.0.0',
    scene: {
      id: d.scene?.id || `dsl-${Date.now()}`,
      name: d.scene?.name || 'Custom Algorithm',
      tier: d.scene?.tier || 'CSP-J',
      teachingTier: d.scene?.teachingTier || 'CSP-J',
      teachingStyle: d.scene?.teachingStyle || 'deductive',
      author: d.scene?.author || 'Yanpb',
      description: d.scene?.description || '',
      language:
        (d.scene?.language as string) === 'cpp' ? 'cpp17' : d.scene?.language || 'cpp17',
      linkedCode: d.scene?.linkedCode || '',
      formulaLatex: d.scene?.formulaLatex || '',
    },
    input: {
      fields: d.input?.fields || [],
      expectedOutput: d.input?.expectedOutput,
      sampleNote: d.input?.sampleNote,
    },
    state: {
      variables: d.state?.variables || [],
    },
    components: d.components || [],
    operations: d.operations || [],
    conditions: Array.isArray(d.conditions) ? d.conditions : [],
    transitions: Array.isArray(d.transitions) ? d.transitions : [],
    events: Array.isArray(d.events) ? d.events : [],
    bindings: Array.isArray(d.bindings) ? d.bindings : [],
    timeline: d.timeline || {
      defaultDurationMs: 750,
      animationStyle: 'smooth',
      autoSnapshotOnStep: true,
    },
    annotations: Array.isArray(d.annotations) ? d.annotations : [],
    output: d.output || { expression: 'ans', label: '结果' },
    theme: d.theme || {
      mode: 'dark',
      accentColor: '#3B82F6',
      background: '#0F141E',
      gridSize: 16,
    },
    limits: {
      ...DEFAULT_DSL_LIMITS,
      ...(d.limits || {}),
    },
  };

  return { ok: true, dsl: normalized, errors: [] };
}

export function parseDsl(text: string, format: 'json' | 'yaml'): DslParseResult {
  if (!text.trim()) {
    return { ok: false, errors: ['DSL 文本为空'] };
  }
  try {
    const parsed =
      format === 'yaml'
        ? yamlLoad(text, { schema: JSON_SCHEMA })
        : JSON.parse(text);
    return validateDslObject(parsed);
  } catch (err) {
    return {
      ok: false,
      errors: [`${format.toUpperCase()} 解析失败: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

export function migrateSceneSchema(raw: SceneSchema): SceneSchema {
  return {
    ...raw,
    version: '2.0.0',
    traceSource:
      raw.traceSource ||
      (raw.traceMode === 'external'
        ? 'external_cpp'
        : raw.traceMode === 'dsl'
          ? 'dsl'
          : raw.traceMode === 'ai_draft'
            ? 'ai_draft'
            : raw.traceMode === 'manual'
              ? 'manual'
              : 'builtin'),
    teaching: raw.teaching || {
      tier: raw.tier === 'CSP-S' ? 'CSP-S' : raw.tier === 'NOIP' ? 'NOIP' : raw.tier === 'ACM' ? 'ACM' : 'CSP-J',
      style: 'deductive',
      viewRole: 'coach',
    },
    lockedStepIds: raw.lockedStepIds || [],
  };
}

/**
 * Unpreset Generalization Benchmark #1: 2D Prefix Sum (not in the 20 built-in templates)
 */
export const CUSTOM_DSL_2D_PREFIX_SUM: AlgorithmSceneDSL = {
  version: '2.0.0',
  scene: {
    id: 'custom-2d-prefix-sum',
    name: '自定义算法：二维前缀和与子矩阵求和',
    tier: 'CSP-J',
    teachingTier: 'CSP-J',
    teachingStyle: 'deductive',
    author: 'Yanpb',
    description: '演示如何在不依赖内置模板的情况下，通过 Algorithm Scene DSL 从零构建二维前缀和状态转移。',
    language: 'cpp17',
    linkedCode: [
      'int mat[3][3] = {{1,2,3},{4,5,6},{7,8,9}};',
      'int pre[4][4] = {0};',
      'for (int i = 1; i <= 3; ++i) {',
      '  for (int j = 1; j <= 3; ++j) {',
      '    pre[i][j] = pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1] + mat[i-1][j-1];',
      '  }',
      '}',
      '// 查询子矩阵 (2,2)~(3,3)',
      'int ans = pre[3][3] - pre[1][3] - pre[3][1] + pre[1][1];',
    ].join('\n'),
    formulaLatex: 'pre[i][j] = pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1] + mat[i-1][j-1]',
  },
  input: {
    fields: [
      {
        name: 'mat',
        type: 'number[][]',
        defaultValue: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
        description: '3x3 原矩阵',
      },
      { name: 'n', type: 'number', defaultValue: 3 },
      { name: 'm', type: 'number', defaultValue: 3 },
      { name: 'r1', type: 'number', defaultValue: 2 },
      { name: 'c1', type: 'number', defaultValue: 2 },
      { name: 'r2', type: 'number', defaultValue: 3 },
      { name: 'c2', type: 'number', defaultValue: 3 },
    ],
    expectedOutput: '28',
    sampleNote: '子矩阵 (2,2)~(3,3) = 5+6+8+9 = 28',
  },
  state: {
    variables: [
      { name: 'pre', type: 'number[][]', initial: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], componentId: 'cmp-pre' },
      { name: 'i', type: 'number', initial: 0 },
      { name: 'j', type: 'number', initial: 0 },
      { name: 'ans', type: 'number', initial: 0 },
    ],
  },
  components: [
    {
      id: 'cmp-mat',
      semanticType: 'SmartMatrix',
      componentType: 'matrix',
      name: '原矩阵 mat',
      x: 36,
      y: 36,
      width: 280,
      height: 220,
      boundVar: 'mat',
      initialPayload: {
        kind: 'matrix',
        data: {
          rows: [[1,2,3],[4,5,6],[7,8,9]],
          rowLabels: ['0', '1', '2'],
          colLabels: ['0', '1', '2'],
        },
      },
    },
    {
      id: 'cmp-pre',
      semanticType: 'SmartDPTable',
      componentType: 'dp-2d',
      name: '前缀和表 pre[i][j]',
      x: 344,
      y: 36,
      width: 340,
      height: 250,
      boundVar: 'pre',
      initialPayload: {
        kind: 'dp',
        data: {
          variant: '2d',
          rows: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],
          rowLabels: ['0', '1', '2', '3'],
          colLabels: ['0', '1', '2', '3'],
          formula: 'pre[i][j] = pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1] + mat[i-1][j-1]',
        },
      },
    },
    {
      id: 'cmp-vars',
      semanticType: 'SmartVariable',
      componentType: 'variable-watcher',
      name: '变量监视',
      x: 710,
      y: 36,
      width: 230,
      height: 220,
    },
    {
      id: 'cmp-formula',
      semanticType: 'SmartFormula',
      componentType: 'math-formula',
      name: '二维容斥公式',
      x: 36,
      y: 310,
      width: 648,
      height: 110,
      initialPayload: {
        kind: 'mathgeo',
        data: {
          kind: 'formula',
          latex: 'S(r_1,c_1,r_2,c_2)=pre[r_2][c_2]-pre[r_1-1][c_2]-pre[r_2][c_1-1]+pre[r_1-1][c_1-1]',
        },
      },
    },
  ],
  operations: [
    {
      op: 'step',
      titleExpr: '"初始化 pre[0..n][0..m] = 0"',
      explanationExpr: '"第 0 行和第 0 列作为边界哨兵置 0，避免下标越界判断"',
      codeLines: [1, 2],
    },
    {
      op: 'for',
      varName: 'i',
      fromExpr: '1',
      toExpr: 'n',
      inclusive: true,
      body: [
        {
          op: 'for',
          varName: 'j',
          fromExpr: '1',
          toExpr: 'm',
          inclusive: true,
          body: [
            {
              op: 'matrixSet',
              target: 'pre',
              rowExpr: 'i',
              colExpr: 'j',
              valueExpr: 'pre[i - 1][j] + pre[i][j - 1] - pre[i - 1][j - 1] + mat[i - 1][j - 1]',
              componentId: 'cmp-pre',
              highlight: 'yellow',
            },
            {
              op: 'highlight',
              componentId: 'cmp-mat',
              cellExpr: ['i - 1', 'j - 1'],
              color: 'blue',
            },
            {
              op: 'step',
              titleExpr: '"计算 pre[" + i + "][" + j + "]"',
              explanationExpr: '"容斥递推：上(" + pre[i - 1][j] + ") + 左(" + pre[i][j - 1] + ") - 左上(" + pre[i - 1][j - 1] + ") + 原值(" + mat[i - 1][j - 1] + ") = " + pre[i][j]',
              codeLines: [3, 4, 5],
            },
          ],
        },
      ],
    },
    {
      op: 'set',
      varName: 'ans',
      expr: 'pre[r2][c2] - pre[r1 - 1][c2] - pre[r2][c1 - 1] + pre[r1 - 1][c1 - 1]',
    },
    {
      op: 'highlight',
      componentId: 'cmp-pre',
      cellExpr: ['r2', 'c2'],
      color: 'green',
    },
    {
      op: 'emit',
      eventType: 'done',
      targetId: 'cmp-pre',
      messageExpr: '"子矩阵查询结果 ans = " + ans',
    },
    {
      op: 'step',
      titleExpr: '"O(1) 子矩阵求和完成"',
      explanationExpr: '"ans = pre[" + r2 + "][" + c2 + "] - pre[" + (r1 - 1) + "][" + c2 + "] - pre[" + r2 + "][" + (c1 - 1) + "] + pre[" + (r1 - 1) + "][" + (c1 - 1) + "] = " + ans',
      codeLines: [8, 9],
    },
  ],
  conditions: [
    { id: 'c1', name: '坐标合法', expr: 'r1 >= 1 && c1 >= 1 && r2 <= n && c2 <= m' },
  ],
  transitions: [
    {
      id: 't1',
      name: '二维前缀和状态转移',
      formula: 'pre[i][j] = pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1] + mat[i-1][j-1]',
      action: {
        op: 'matrixSet',
        target: 'pre',
        rowExpr: 'i',
        colExpr: 'j',
        valueExpr: 'pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1] + mat[i-1][j-1]',
        componentId: 'cmp-pre',
      },
    },
  ],
  events: [
    { type: 'transition', description: '更新前缀和单元格' },
    { type: 'done', description: '输出子矩阵求和结果' },
  ],
  bindings: [
    { componentId: 'cmp-mat', stateVar: 'mat', role: 'primary' },
    { componentId: 'cmp-pre', stateVar: 'pre', codeLines: [5], role: 'auxiliary' },
    { componentId: 'cmp-vars', stateVar: 'ans', role: 'watcher' },
  ],
  timeline: {
    defaultDurationMs: 750,
    animationStyle: 'smooth',
    autoSnapshotOnStep: true,
  },
  annotations: [
    {
      id: 'ann-1',
      title: '为什么减去 pre[i-1][j-1]？',
      text: 'pre[i-1][j] 与 pre[i][j-1] 都包含左上角矩形 pre[i-1][j-1]，因此按容斥原理需要减去重复计算的一次。',
      coachOnly: false,
    },
  ],
  output: {
    expression: 'ans',
    label: '子矩阵和',
  },
  theme: {
    mode: 'dark',
    accentColor: '#3B82F6',
    background: '#0F141E',
    gridSize: 16,
  },
  limits: DEFAULT_DSL_LIMITS,
};

/**
 * Unpreset Generalization Benchmark #2: Kadane Max Subarray DP
 */
export const CUSTOM_DSL_KADANE: AlgorithmSceneDSL = {
  version: '2.0.0',
  scene: {
    id: 'custom-kadane-dp',
    name: '自定义算法：最大子段和 (Kadane 线性 DP)',
    tier: 'CSP-J',
    teachingTier: 'CSP-J',
    teachingStyle: 'heuristic',
    author: 'Yanpb',
    description: '线性动态规划经典题：维护以当前元素结尾的最大子段和 cur 与全局答案 best。',
    language: 'cpp17',
    linkedCode: [
      'int a[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};',
      'int cur = 0, best = -1e9;',
      'for (int i = 0; i < n; ++i) {',
      '  cur = max(a[i], cur + a[i]);',
      '  best = max(best, cur);',
      '}',
    ].join('\n'),
    formulaLatex: 'dp[i] = \\max(a[i], dp[i-1] + a[i])',
  },
  input: {
    fields: [
      { name: 'a', type: 'number[]', defaultValue: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
      { name: 'n', type: 'number', defaultValue: 9 },
    ],
    expectedOutput: '6',
    sampleNote: '最优子段 [4, -1, 2, 1] 和为 6',
  },
  state: {
    variables: [
      { name: 'dp', type: 'number[]', initial: [0, 0, 0, 0, 0, 0, 0, 0, 0], componentId: 'cmp-dp' },
      { name: 'cur', type: 'number', initial: 0 },
      { name: 'best', type: 'number', initial: -999999 },
      { name: 'i', type: 'number', initial: 0 },
    ],
  },
  components: [
    {
      id: 'cmp-a',
      semanticType: 'SmartArray',
      componentType: 'array',
      name: '输入序列 a',
      x: 36,
      y: 36,
      width: 600,
      height: 150,
      boundVar: 'a',
      initialPayload: {
        kind: 'array',
        data: { items: [-2, 1, -3, 4, -1, 2, 1, -5, 4], indices: true },
      },
    },
    {
      id: 'cmp-dp',
      semanticType: 'SmartArray',
      componentType: 'array',
      name: '状态数组 dp[i]',
      x: 36,
      y: 210,
      width: 600,
      height: 150,
      boundVar: 'dp',
      initialPayload: {
        kind: 'array',
        data: { items: [0, 0, 0, 0, 0, 0, 0, 0, 0], indices: true },
      },
    },
    {
      id: 'cmp-vars',
      semanticType: 'SmartVariable',
      componentType: 'variable-watcher',
      name: '实时变量',
      x: 660,
      y: 36,
      width: 240,
      height: 220,
    },
  ],
  operations: [
    {
      op: 'step',
      titleExpr: '"初始化 cur = 0, best = -∞"',
      explanationExpr: '"枚举子段右端点 i，决定接在前面的子段后还是另起炉灶"',
      codeLines: [1, 2],
    },
    {
      op: 'for',
      varName: 'i',
      fromExpr: '0',
      toExpr: 'n - 1',
      inclusive: true,
      body: [
        { op: 'set', varName: 'cur', expr: 'max(a[i], cur + a[i])' },
        { op: 'set', varName: 'best', expr: 'max(best, cur)' },
        {
          op: 'arraySet',
          target: 'dp',
          indexExpr: 'i',
          valueExpr: 'cur',
          componentId: 'cmp-dp',
          highlight: 'green',
        },
        {
          op: 'highlight',
          componentId: 'cmp-a',
          indicesExpr: ['i'],
          color: 'yellow',
        },
        {
          op: 'step',
          titleExpr: '"处理下标 i = " + i',
          explanationExpr: '"a[" + i + "]=" + a[i] + "，更新 cur=" + cur + "，当前最优 best=" + best',
          codeLines: [3, 4, 5],
        },
      ],
    },
  ],
  conditions: [],
  transitions: [],
  events: [{ type: 'transition', description: '线性 DP 状态转移' }],
  bindings: [],
  timeline: { defaultDurationMs: 700, animationStyle: 'smooth', autoSnapshotOnStep: true },
  annotations: [],
  output: { expression: 'best', label: '最大子段和' },
  theme: { mode: 'dark', accentColor: '#3B82F6', background: '#0F141E', gridSize: 16 },
  limits: DEFAULT_DSL_LIMITS,
};
