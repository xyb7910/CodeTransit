import {
  AlgoCanvasItem,
  AlgoComponentType,
  AlgoGraphData,
  AlgoStep,
  SceneSchema,
} from '../types/algorithmStudio';
import { ContestTier } from '../types/workspace';
import {
  runBFS,
  runBacktrackingPermutations,
  runBinarySearch,
  runBubbleSort,
  runDFS,
  runDijkstra,
  runDiscretization,
  runFenwickTree,
  runFloydWarshall,
  runIntervalDP,
  runKnapsack01,
  runKnapsackUnbounded,
  runKruskal,
  runLIS,
  runPrefixSumDiff,
  runPrim,
  runSegmentTree,
  runTopologicalSort,
  runTwoPointers,
  runUnionFind,
} from '../utils/algorithmEngine';
import {
  competitionInputToArrayData,
  competitionInputToKnapsack,
  parseNumberArrayInput,
} from '../utils/sampleConverter';
import { applyGraphLayout, parseTextToGraph } from '../utils/graphLayouts';

export interface AlgoPaletteCategory {
  id: string;
  nameZh: string;
  nameEn: string;
  items: Array<{
    type: AlgoComponentType;
    labelZh: string;
    labelEn: string;
  }>;
}

export const ALGO_COMPONENT_CATEGORIES: AlgoPaletteCategory[] = [
  {
    id: 'array-matrix',
    nameZh: '1. 数组 / 矩阵 / 网格',
    nameEn: '1. Array / Matrix / Grid',
    items: [
      { type: 'array', labelZh: '一维数组', labelEn: '1D Array' },
      { type: 'matrix', labelZh: '二维矩阵', labelEn: '2D Matrix' },
      { type: 'string', labelZh: '字符串', labelEn: 'String' },
      { type: 'grid2d', labelZh: '迷宫/二维网格', labelEn: '2D Grid' },
    ],
  },
  {
    id: 'linear',
    nameZh: '2. 线性结构',
    nameEn: '2. Linear Structures',
    items: [
      { type: 'stack', labelZh: '栈 Stack', labelEn: 'Stack' },
      { type: 'queue', labelZh: '队列 Queue', labelEn: 'Queue' },
      { type: 'deque', labelZh: '双端队列', labelEn: 'Deque' },
      { type: 'linked-list', labelZh: '链表', labelEn: 'Linked List' },
      { type: 'monotonic-stack', labelZh: '单调栈', labelEn: 'Monotonic Stack' },
      { type: 'monotonic-queue', labelZh: '单调队列', labelEn: 'Monotonic Queue' },
    ],
  },
  {
    id: 'hash-dsu',
    nameZh: '3. 哈希 / 集合 / 并查集',
    nameEn: '3. Hash / Set / DSU',
    items: [
      { type: 'hash-table', labelZh: '哈希表', labelEn: 'Hash Table' },
      { type: 'set', labelZh: '集合 Set', labelEn: 'Set' },
      { type: 'dsu', labelZh: '并查集 DSU', labelEn: 'Union-Find' },
    ],
  },
  {
    id: 'tree-heap',
    nameZh: '4. 树 / 堆 / Trie',
    nameEn: '4. Tree / Heap / Trie',
    items: [
      { type: 'binary-tree', labelZh: '二叉树', labelEn: 'Binary Tree' },
      { type: 'general-tree', labelZh: '普通多叉树', labelEn: 'General Tree' },
      { type: 'heap', labelZh: '二叉堆', labelEn: 'Heap' },
      { type: 'trie', labelZh: '字典树 Trie', labelEn: 'Trie' },
    ],
  },
  {
    id: 'range-tree',
    nameZh: '5. 高级区间树',
    nameEn: '5. Range & Balanced Trees',
    items: [
      { type: 'fenwick-tree', labelZh: '树状数组 BIT', labelEn: 'Fenwick Tree' },
      { type: 'segment-tree', labelZh: '线段树', labelEn: 'Segment Tree' },
      { type: 'persistent-segtree', labelZh: '主席树', labelEn: 'Persistent SegTree' },
      { type: 'balanced-tree', labelZh: '平衡树 BST', labelEn: 'Balanced Tree' },
    ],
  },
  {
    id: 'graph',
    nameZh: '6. 图论模型',
    nameEn: '6. Graph Models',
    items: [{ type: 'graph', labelZh: '可交互图论画板', labelEn: 'Interactive Graph' }],
  },
  {
    id: 'dp',
    nameZh: '7. 动态规划表',
    nameEn: '7. Dynamic Programming',
    items: [
      { type: 'dp-1d', labelZh: '一维 DP', labelEn: '1D DP' },
      { type: 'dp-2d', labelZh: '二维 DP', labelEn: '2D DP' },
      { type: 'dp-interval', labelZh: '区间 DP', labelEn: 'Interval DP' },
      { type: 'dp-tree', labelZh: '树形 DP', labelEn: 'Tree DP' },
      { type: 'dp-bitmask', labelZh: '状压 DP', labelEn: 'Bitmask DP' },
    ],
  },
  {
    id: 'search-rec',
    nameZh: '8. 搜索与递归',
    nameEn: '8. Search & Recursion',
    items: [
      { type: 'search-tree', labelZh: '搜索状态树', labelEn: 'Search Tree' },
      { type: 'recursion-tree', labelZh: '递归调用树', labelEn: 'Recursion Tree' },
      { type: 'call-stack', labelZh: '递归调用栈', labelEn: 'Call Stack' },
    ],
  },
  {
    id: 'math-geo',
    nameZh: '9. 数学与计算几何',
    nameEn: '9. Math & Geometry',
    items: [
      { type: 'number-line', labelZh: '数轴区间', labelEn: 'Number Line' },
      { type: 'coordinate-system', labelZh: '平面坐标系', labelEn: 'Coordinate Grid' },
      { type: 'math-formula', labelZh: 'KaTeX 公式', labelEn: 'LaTeX Formula' },
      { type: 'geometry', labelZh: '计算几何图形', labelEn: 'Geometry Canvas' },
    ],
  },
  {
    id: 'teaching',
    nameZh: '10. 教学与注释',
    nameEn: '10. Teaching & Annotations',
    items: [
      { type: 'variable-watcher', labelZh: '变量监视器', labelEn: 'Variable Watcher' },
      { type: 'complexity-card', labelZh: '复杂度卡片', labelEn: 'Complexity Card' },
      { type: 'text-box', labelZh: '文本框', labelEn: 'Text Box' },
      { type: 'data-table', labelZh: '状态表格', labelEn: 'Data Table' },
      { type: 'arrow', labelZh: '引导箭头', labelEn: 'Arrow' },
      { type: 'callout', labelZh: '重点批注', labelEn: 'Coach Callout' },
      { type: 'flowchart', labelZh: '流程图节点', labelEn: 'Flowchart' },
    ],
  },
  {
    id: 'shapes-code',
    nameZh: '11. 图形 / 画笔 / 代码块',
    nameEn: '11. Shapes / Ink / Code',
    items: [
      { type: 'rect-shape', labelZh: '矩形框', labelEn: 'Rectangle' },
      { type: 'circle-shape', labelZh: '椭圆 / 圆', labelEn: 'Circle' },
      { type: 'code-block', labelZh: '嵌入式代码块', labelEn: 'Code Block' },
      { type: 'freehand-stroke', labelZh: '手绘笔迹', labelEn: 'Freehand Ink' },
    ],
  },
];

export function createDefaultAlgoItem(
  type: AlgoComponentType,
  x = 80,
  y = 80,
  idOverride?: string
): AlgoCanvasItem {
  const id = idOverride || `item-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const baseStyle = {
    background: '#111827',
    borderColor: '#334155',
    accentColor: '#3B82F6',
    fontSize: 13,
    opacity: 1,
    borderRadius: 10,
  };

  switch (type) {
    case 'array':
    case 'fenwick-tree':
      return {
        id,
        type,
        name: type === 'fenwick-tree' ? '树状数组 BIT' : '一维数组',
        x,
        y,
        width: 460,
        height: 118,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'array',
          data: {
            items: type === 'fenwick-tree' ? [0, 3, 5, 2, 10, 6] : [5, 2, 9, 1, 5, 6],
            indices: true,
            highlightedIndices: { 0: 'blue' },
          },
        },
      };
    case 'string':
      return {
        id,
        type,
        name: '字符串',
        x,
        y,
        width: 420,
        height: 110,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'array',
          data: {
            items: ['a', 'b', 'a', 'c', 'a', 'b', 'a'],
            indices: true,
            pointers: [{ index: 0, label: 'i', color: 'blue' }],
          },
        },
      };
    case 'matrix':
    case 'grid2d':
      return {
        id,
        type,
        name: type === 'grid2d' ? '二维网格' : '二维矩阵',
        x,
        y,
        width: 340,
        height: 220,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'matrix',
          data: {
            rows: [
              [0, 1, 0, 0],
              [0, 0, 1, 0],
              [1, 0, 0, 0],
            ],
            highlightedCells: { '0,0': 'green', '2,3': 'orange' },
          },
        },
      };
    case 'stack':
    case 'queue':
    case 'deque':
    case 'linked-list':
    case 'monotonic-stack':
    case 'monotonic-queue':
      return {
        id,
        type,
        name: type,
        x,
        y,
        width: type.includes('stack') ? 160 : 380,
        height: type.includes('stack') ? 240 : 112,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'linear',
          data: {
            items: [12, 18, 25, 31],
            direction: type.includes('stack') ? 'vertical' : 'horizontal',
            caption: type.toUpperCase(),
            highlightedIndices: { 3: 'blue' },
          },
        },
      };
    case 'hash-table':
    case 'set':
      return {
        id,
        type,
        name: type === 'hash-table' ? '哈希表' : '集合 Set',
        x,
        y,
        width: 300,
        height: 200,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'hashset',
          data: {
            buckets: [
              { key: '0', values: ['14', '28'] },
              { key: '1', values: ['15'] },
              { key: '2', values: ['9', '23'] },
            ],
            highlightedKeys: { '0': 'blue' },
          },
        },
      };
    case 'dsu':
      return {
        id,
        type,
        name: '并查集 DSU',
        x,
        y,
        width: 440,
        height: 140,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'dsu',
          data: { parent: [0, 0, 1, 3, 3, 4], highlightedNodes: { 0: 'green', 3: 'purple' } },
        },
      };
    case 'binary-tree':
    case 'general-tree':
    case 'heap':
    case 'trie':
    case 'segment-tree':
    case 'persistent-segtree':
    case 'balanced-tree':
    case 'search-tree':
    case 'recursion-tree':
      return {
        id,
        type,
        name: type,
        x,
        y,
        width: 460,
        height: 260,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'tree',
          data: {
            rootId: 'n1',
            nodes: [
              { id: 'n1', label: '10', left: 'n2', right: 'n3', range: [1, 4] },
              { id: 'n2', label: '4', left: 'n4', right: 'n5', range: [1, 2] },
              { id: 'n3', label: '6', range: [3, 4] },
              { id: 'n4', label: '1', range: [1, 1] },
              { id: 'n5', label: '3', range: [2, 2] },
            ],
            highlightedNodeIds: { n1: 'blue' },
          },
        },
      };
    case 'graph':
      return {
        id,
        type,
        name: '图论画板',
        x,
        y,
        width: 480,
        height: 300,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'graph',
          data: applyGraphLayout(
            {
              variant: 'weighted',
              allowMultiEdge: true,
              allowSelfLoop: true,
              layout: 'circular',
              nodes: [
                { id: '1', label: '1', x: 80, y: 120 },
                { id: '2', label: '2', x: 220, y: 60 },
                { id: '3', label: '3', x: 220, y: 200 },
                { id: '4', label: '4', x: 380, y: 120 },
              ],
              edges: [
                { id: 'e1', from: '1', to: '2', weight: 2, directed: true },
                { id: 'e2', from: '1', to: '3', weight: 5, directed: true },
                { id: 'e3', from: '2', to: '3', weight: 1, directed: true },
                { id: 'e4', from: '2', to: '4', weight: 4, directed: true },
                { id: 'e5', from: '3', to: '4', weight: 2, directed: true },
              ],
            },
            'circular'
          ),
        },
      };
    case 'dp-1d':
    case 'dp-2d':
    case 'dp-interval':
    case 'dp-tree':
    case 'dp-bitmask':
      return {
        id,
        type,
        name: type.toUpperCase(),
        x,
        y,
        width: 480,
        height: 250,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'dp',
          data: {
            variant: type === 'dp-1d' ? '1d' : type === 'dp-interval' ? 'interval' : '2d',
            rows:
              type === 'dp-1d'
                ? [[0, 1, 2, 3, 5]]
                : [
                    [0, 0, 0, 0],
                    [0, 3, 3, 4],
                    [0, 3, 4, 7],
                  ],
            rowLabels: type === 'dp-1d' ? ['dp'] : ['0', '#1', '#2'],
            colLabels: type === 'dp-1d' ? ['0', '1', '2', '3', '4'] : ['0', '1', '2', '3'],
            formula: 'dp[i][j] = \\max(dp[i-1][j],\\; dp[i-1][j-w]+v)',
            highlightedCells: { '0,0': 'blue' },
          },
        },
      };
    case 'call-stack':
      return {
        id,
        type,
        name: '递归调用栈',
        x,
        y,
        width: 260,
        height: 210,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'recursion',
          data: {
            frames: [
              { id: 'f1', fnName: 'dfs', args: 'u=1, dep=0', depth: 0 },
              { id: 'f2', fnName: 'dfs', args: 'u=2, dep=1', depth: 1, highlight: 'blue' },
            ],
          },
        },
      };
    case 'number-line':
    case 'coordinate-system':
    case 'math-formula':
    case 'geometry':
      return {
        id,
        type,
        name: type === 'math-formula' ? 'KaTeX 公式' : type,
        x,
        y,
        width: 360,
        height: type === 'math-formula' ? 110 : 210,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'mathgeo',
          data: {
            kind:
              type === 'number-line'
                ? 'number-line'
                : type === 'coordinate-system'
                ? 'coordinate'
                : type === 'geometry'
                ? 'geometry'
                : 'formula',
            latex: 'dp[i] = \\max_{j < i}(dp[j] + 1)',
            formulaNumber: '(1)',
            min: 0,
            max: 10,
            points: [
              { x: 2, y: 3, label: 'A(2,3)', color: 'blue' },
              { x: 7, y: 6, label: 'B(7,6)', color: 'green' },
            ],
            segments: [{ x1: 2, y1: 3, x2: 7, y2: 6, label: 'd' }],
          },
        },
      };
    case 'rect-shape':
    case 'circle-shape':
      return {
        id,
        type,
        name: type === 'circle-shape' ? '椭圆图形' : '矩形框',
        x,
        y,
        width: type === 'circle-shape' ? 140 : 180,
        height: type === 'circle-shape' ? 140 : 110,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        style: {
          ...baseStyle,
          background: 'rgba(59, 130, 246, 0.12)',
          borderColor: '#3B82F6',
          borderWidth: 2,
          borderStyle: 'solid',
          borderRadius: type === 'circle-shape' ? 999 : 10,
        },
        payload: {
          kind: 'shape',
          data: {
            shape: type === 'circle-shape' ? 'circle' : 'rect',
            label: type === 'circle-shape' ? '状态' : '区域框',
          },
        },
      };
    case 'freehand-stroke':
      return {
        id,
        type,
        name: '自由笔迹',
        x,
        y,
        width: 200,
        height: 100,
        rotation: 0,
        zIndex: 3,
        visible: true,
        locked: false,
        style: {
          ...baseStyle,
          background: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        },
        payload: {
          kind: 'freehand',
          data: {
            points: [
              { x: 16, y: 72 },
              { x: 64, y: 26 },
              { x: 120, y: 66 },
              { x: 182, y: 22 },
            ],
            strokeColor: '#F59E0B',
            strokeWidth: 3,
            isHighlighter: false,
          },
        },
      };
    case 'code-block':
      return {
        id,
        type,
        name: '嵌入式代码块',
        x,
        y,
        width: 360,
        height: 210,
        rotation: 0,
        zIndex: 2,
        visible: true,
        locked: false,
        style: baseStyle,
        payload: {
          kind: 'codeblock',
          data: {
            code: [
              'for (int i = 0; i < n; ++i) {',
              '  if (a[i] > best) best = a[i];',
              '}',
            ].join('\n'),
            language: 'cpp17',
            highlightedLines: [2],
            fontSize: 12,
            themeName: 'carbon-dark',
            lineNotes: { 2: '更新最优解' },
          },
        },
      };
    default:
      return {
        id,
        type,
        name:
          type === 'variable-watcher'
            ? '变量监视器'
            : type === 'complexity-card'
            ? '复杂度卡片'
            : type === 'callout'
            ? '教练重点批注'
            : type === 'data-table'
            ? '数据表格'
            : '教学文本',
        x,
        y,
        width: 280,
        height: 150,
        rotation: 0,
        zIndex: 2,
        visible: true,
        locked: false,
        coachOnly: type === 'callout',
        style: baseStyle,
        payload: {
          kind: 'annotation',
          data: {
            kind:
              type === 'variable-watcher'
                ? 'variable-watcher'
                : type === 'complexity-card'
                ? 'complexity'
                : type === 'data-table'
                ? 'table'
                : type === 'arrow'
                ? 'arrow'
                : type === 'callout'
                ? 'callout'
                : type === 'flowchart'
                ? 'flowchart'
                : 'text',
            title: type === 'callout' ? '易错点提示' : type === 'complexity-card' ? '时空复杂度' : '说明卡片',
            text: '点击右侧属性面板编辑内容与样式，支持教练/学生视角切换隐藏。',
            timeComplexity: 'O(N \\log N)',
            spaceComplexity: 'O(N)',
            coachOnly: type === 'callout',
            accentColor: 'yellow',
            tableHeaders: ['变量', '含义', '范围'],
            tableRows: [
              ['L, R', '二分左右边界', '0..n-1'],
              ['mid', '中点下标', '(L+R)/2'],
            ],
            flowNodes: [
              { id: 's', label: '初始化', shape: 'oval' },
              { id: 'c', label: 'L <= R ?', shape: 'diamond' },
              { id: 'u', label: '收缩边界', shape: 'rect' },
            ],
          },
        },
      };
  }
}

export interface AlgoTemplateInputParams {
  arrayInput?: string;
  target?: number;
  capacity?: number;
  knapsackInput?: string;
  graphText?: string;
  graphDirected?: boolean;
  graphWeighted?: boolean;
  startNode?: string;
  permN?: number;
  dsuN?: number;
  dsuOpsText?: string;
}

export interface AlgoTemplateDefinition {
  id: string;
  nameZh: string;
  nameEn: string;
  tier: ContestTier;
  categoryZh: string;
  descriptionZh: string;
  cppCode: string;
  formulaLatex: string;
  timeComplexity: string;
  spaceComplexity: string;
  defaultParams: AlgoTemplateInputParams;
  buildScene: (
    params: AlgoTemplateInputParams,
    authorName: string
  ) => { scene: SceneSchema; error?: string };
}

function makeBaseScene(
  tpl: Omit<AlgoTemplateDefinition, 'buildScene'>,
  items: AlgoCanvasItem[],
  steps: AlgoStep[],
  authorName: string
): SceneSchema {
  return {
    version: '1.0.0',
    id: `scene-${tpl.id}-${Date.now()}`,
    name: tpl.nameZh,
    tier: tpl.tier,
    templateId: tpl.id,
    traceMode: 'builtin',
    language: 'cpp17',
    linkedCode: tpl.cppCode,
    formulaLatex: tpl.formulaLatex,
    artboards: [
      {
        id: 'artboard-main',
        name: '主推演画板',
        width: 980,
        height: 620,
        background: '#0F141E',
        items,
      },
    ],
    activeArtboardId: 'artboard-main',
    steps,
    currentStepIndex: 0,
    author: { enabled: true, name: authorName || 'Yanpb' },
    updatedAt: Date.now(),
  };
}

export const ALGORITHM_TEMPLATES: AlgoTemplateDefinition[] = [
  {
    id: 'bubble-sort',
    nameZh: '冒泡排序 Bubble Sort',
    nameEn: 'Bubble Sort',
    tier: 'CSP-J',
    categoryZh: '基础排序',
    descriptionZh: '相邻元素两两比较交换，每轮将最大值沉底，直观展示比较与交换事件。',
    timeComplexity: 'O(n^2)',
    spaceComplexity: 'O(1)',
    formulaLatex: '\\text{if } a[j] > a[j+1] \\Rightarrow \\text{swap}(a[j], a[j+1])',
    cppCode: `void bubbleSort(vector<int>& a) {
  int n = a.size();
  for (int i = 0; i < n - 1; i++) {
    bool swapped = false;
    for (int j = 0; j < n - 1 - i; j++) {
      if (a[j] > a[j + 1]) {
        swap(a[j], a[j + 1]);
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}`,
    defaultParams: { arrayInput: '6\n5 2 9 1 5 6' },
    buildScene(params, authorName) {
      const arr = competitionInputToArrayData(params.arrayInput || '5 2 9 1 5 6').items.map(Number);
      const safeArr = arr.length > 0 ? arr.slice(0, 12) : [5, 2, 9, 1, 5, 6];
      const arrItem = createDefaultAlgoItem('array', 60, 80, 'main-arr');
      const card = createDefaultAlgoItem('complexity-card', 60, 260, 'cx-card');
      card.payload = {
        kind: 'annotation',
        data: {
          kind: 'complexity',
          title: '冒泡排序复杂度',
          timeComplexity: 'O(n^2)',
          spaceComplexity: 'O(1)',
        },
      };
      const steps = runBubbleSort(safeArr, 'main-arr');
      if (steps[0]?.snapshot.artboardItems['main-arr']) {
        arrItem.payload = steps[0].snapshot.artboardItems['main-arr'];
      }
      return { scene: makeBaseScene(this, [arrItem, card], steps, authorName) };
    },
  },
  {
    id: 'binary-search',
    nameZh: '二分查找 Binary Search',
    nameEn: 'Binary Search',
    tier: 'CSP-J',
    categoryZh: '二分与双指针',
    descriptionZh: '维护有序区间 [L, R]，依据 mid 与 target 大小关系单调收缩查找范围。',
    timeComplexity: 'O(\\log n)',
    spaceComplexity: 'O(1)',
    formulaLatex: 'mid = L + \\lfloor (R - L) / 2 \\rfloor',
    cppCode: `int binarySearch(vector<int>& a, int target) {
  int L = 0, R = (int)a.size() - 1;
  while (L <= R) {
    int mid = L + (R - L) / 2;
    if (a[mid] == target) return mid;
    if (a[mid] < target) L = mid + 1;
    else R = mid - 1;
  }
  return -1;
}`,
    defaultParams: { arrayInput: '2 5 8 12 16 23 38 56 72', target: 23 },
    buildScene(params, authorName) {
      const arr = parseNumberArrayInput(params.arrayInput || '2 5 8 12 16 23 38 56 72').slice(0, 14);
      const safeArr = arr.length > 0 ? arr : [2, 5, 8, 12, 16, 23, 38];
      const target = params.target ?? 23;
      const arrItem = createDefaultAlgoItem('array', 50, 90, 'bs-arr');
      arrItem.width = 620;
      const note = createDefaultAlgoItem('callout', 50, 265, 'bs-note');
      note.width = 400;
      note.payload = {
        kind: 'annotation',
        data: {
          kind: 'callout',
          title: '边界防溢出写法',
          text: '使用 L + (R - L) / 2 代替 (L + R) / 2，避免大整数相加溢出。',
          coachOnly: true,
          accentColor: 'yellow',
        },
      };
      const steps = runBinarySearch(safeArr, target, 'bs-arr');
      if (steps[0]?.snapshot.artboardItems['bs-arr']) {
        arrItem.payload = steps[0].snapshot.artboardItems['bs-arr'];
      }
      return { scene: makeBaseScene(this, [arrItem, note], steps, authorName) };
    },
  },
  {
    id: 'bfs',
    nameZh: '广度优先搜索 BFS',
    nameEn: 'Breadth-First Search',
    tier: 'CSP-J',
    categoryZh: '图论与搜索',
    descriptionZh: '图画板与队列组件双联动，展示按层扩展与无权图最短路计算。',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    formulaLatex: 'dist[v] = dist[u] + 1',
    cppCode: `void bfs(int s) {
  queue<int> q;
  dist[s] = 0; q.push(s);
  while (!q.empty()) {
    int u = q.front(); q.pop();
    for (int v : adj[u]) {
      if (dist[v] == -1) {
        dist[v] = dist[u] + 1;
        q.push(v);
      }
    }
  }
}`,
    defaultParams: {
      graphText: '5 5\n1 2\n1 3\n2 4\n3 4\n4 5',
      graphDirected: false,
      graphWeighted: false,
      startNode: '1',
    },
    buildScene(params, authorName) {
      const gData = parseTextToGraph(
        params.graphText || '5 5\n1 2\n1 3\n2 4\n3 4\n4 5',
        'oi',
        Boolean(params.graphDirected),
        Boolean(params.graphWeighted)
      );
      const gItem = createDefaultAlgoItem('graph', 40, 50, 'bfs-graph');
      gItem.width = 500;
      gItem.height = 310;
      gItem.payload = { kind: 'graph', data: gData };
      const qItem = createDefaultAlgoItem('queue', 40, 390, 'bfs-queue');
      qItem.width = 500;
      qItem.height = 115;
      const steps = runBFS(gData, params.startNode || '1', 'bfs-graph', 'bfs-queue');
      if (steps[0]) {
        gItem.payload = steps[0].snapshot.artboardItems['bfs-graph'];
        qItem.payload = steps[0].snapshot.artboardItems['bfs-queue'];
      }
      return { scene: makeBaseScene(this, [gItem, qItem], steps, authorName) };
    },
  },
  {
    id: 'dijkstra',
    nameZh: 'Dijkstra 最短路',
    nameEn: 'Dijkstra Shortest Path',
    tier: 'CSP-S',
    categoryZh: '图论最短路',
    descriptionZh: '非负权图贪心松弛与 dist[] 距离数组同步更新（自动拦截负权边）。',
    timeComplexity: 'O((V + E)\\log V)',
    spaceComplexity: 'O(V + E)',
    formulaLatex: 'dist[v] = \\min(dist[v],\\; dist[u] + w(u,v))',
    cppCode: `void dijkstra(int s) {
  fill(dist, dist + n + 1, INF);
  dist[s] = 0;
  pq.push({0, s});
  while (!pq.empty()) {
    auto [d, u] = pq.top(); pq.pop();
    if (d > dist[u]) continue;
    for (auto [v, w] : adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        pq.push({dist[v], v});
      }
    }
  }
}`,
    defaultParams: {
      graphText: '5 6\n1 2 2\n1 3 5\n2 3 1\n2 4 6\n3 4 2\n4 5 3',
      graphDirected: true,
      graphWeighted: true,
      startNode: '1',
    },
    buildScene(params, authorName) {
      const gData = parseTextToGraph(
        params.graphText || '5 6\n1 2 2\n1 3 5\n2 3 1\n2 4 6\n3 4 2\n4 5 3',
        'oi',
        params.graphDirected ?? true,
        true
      );
      const gItem = createDefaultAlgoItem('graph', 40, 48, 'dij-graph');
      gItem.width = 500;
      gItem.height = 310;
      gItem.payload = { kind: 'graph', data: gData };
      const distItem = createDefaultAlgoItem('array', 40, 385, 'dij-dist');
      distItem.name = 'dist[] 最短距离数组';
      distItem.width = 500;
      const res = runDijkstra(gData, params.startNode || '1', 'dij-graph', 'dij-dist');
      if (res.error) {
        return {
          scene: makeBaseScene(this, [gItem, distItem], [], authorName),
          error: res.error,
        };
      }
      if (res.steps[0]) {
        gItem.payload = res.steps[0].snapshot.artboardItems['dij-graph'];
        distItem.payload = res.steps[0].snapshot.artboardItems['dij-dist'];
      }
      return { scene: makeBaseScene(this, [gItem, distItem], res.steps, authorName) };
    },
  },
  {
    id: 'knapsack-01',
    nameZh: '0/1 背包问题',
    nameEn: '0/1 Knapsack DP',
    tier: 'CSP-S',
    categoryZh: '动态规划',
    descriptionZh: '二维 DP 状态转移矩阵与回溯最优物品方案，自动标出转移依赖箭头。',
    timeComplexity: 'O(N \\cdot C)',
    spaceComplexity: 'O(N \\cdot C)',
    formulaLatex: 'dp[i][j] = \\max(dp[i-1][j],\\; dp[i-1][j - w_i] + v_i)',
    cppCode: `int knapsack01(int N, int C, vector<int>& w, vector<int>& v) {
  vector<vector<int>> dp(N + 1, vector<int>(C + 1, 0));
  for (int i = 1; i <= N; i++) {
    for (int j = 0; j <= C; j++) {
      dp[i][j] = dp[i - 1][j];
      if (j >= w[i - 1]) {
        dp[i][j] = max(dp[i][j], dp[i - 1][j - w[i - 1]] + v[i - 1]);
      }
    }
  }
  return dp[N][C];
}`,
    defaultParams: {
      knapsackInput: '4 7\n2 3\n3 4\n4 5\n5 8',
    },
    buildScene(params, authorName) {
      const { capacity, weights, values } = competitionInputToKnapsack(
        params.knapsackInput || '4 7\n2 3\n3 4\n4 5\n5 8'
      );
      const dpItem = createDefaultAlgoItem('dp-2d', 40, 50, 'knap-dp');
      dpItem.width = 680;
      dpItem.height = 360;
      const steps = runKnapsack01(capacity, weights, values, 'knap-dp');
      if (steps[0]) {
        dpItem.payload = steps[0].snapshot.artboardItems['knap-dp'];
      }
      return { scene: makeBaseScene(this, [dpItem], steps, authorName) };
    },
  },
  {
    id: 'prefix-sum',
    nameZh: '前缀和与差分',
    nameEn: 'Prefix Sum',
    tier: 'CSP-J',
    categoryZh: '基础算法',
    descriptionZh: '原数组与前缀和数组双栏对照，O(1) 完成区间和查询。',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    formulaLatex: 'S[r] - S[l-1] = \\sum_{k=l}^{r} a[k]',
    cppCode: `for (int i = 1; i <= n; i++) {
  pref[i] = pref[i - 1] + a[i - 1];
}`,
    defaultParams: { arrayInput: '3 1 4 1 5 9' },
    buildScene(params, authorName) {
      const arr = parseNumberArrayInput(params.arrayInput || '3 1 4 1 5 9').slice(0, 10);
      const aItem = createDefaultAlgoItem('array', 60, 60, 'ps-a');
      aItem.name = '原数组 a[]';
      const pItem = createDefaultAlgoItem('array', 60, 210, 'ps-p');
      pItem.name = '前缀和 pref[]';
      const steps = runPrefixSumDiff(arr, 'ps-a', 'ps-p');
      if (steps[0]) {
        aItem.payload = steps[0].snapshot.artboardItems['ps-a'];
        pItem.payload = steps[0].snapshot.artboardItems['ps-p'];
      }
      return { scene: makeBaseScene(this, [aItem, pItem], steps, authorName) };
    },
  },
  {
    id: 'two-pointers',
    nameZh: '双指针 Two Pointers',
    nameEn: 'Two Pointers',
    tier: 'CSP-J',
    categoryZh: '二分与双指针',
    descriptionZh: '有序数组两端向中间单调夹逼查找两数之和。',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    formulaLatex: 'a[L] + a[R] = target',
    cppCode: `int L = 0, R = n - 1;
while (L < R) {
  int sum = a[L] + a[R];
  if (sum == target) break;
  if (sum < target) L++; else R--;
}`,
    defaultParams: { arrayInput: '1 3 4 6 8 11 15', target: 14 },
    buildScene(params, authorName) {
      const arr = parseNumberArrayInput(params.arrayInput || '1 3 4 6 8 11 15').slice(0, 12);
      const item = createDefaultAlgoItem('array', 50, 100, 'tp-arr');
      item.width = 560;
      const steps = runTwoPointers(arr, params.target ?? 14, 'tp-arr');
      if (steps[0]) item.payload = steps[0].snapshot.artboardItems['tp-arr'];
      return { scene: makeBaseScene(this, [item], steps, authorName) };
    },
  },
  {
    id: 'discretization',
    nameZh: '离散化 Discretization',
    nameEn: 'Coordinate Compression',
    tier: 'CSP-S',
    categoryZh: '基础算法',
    descriptionZh: '排序去重后通过 lower_bound 映射为紧凑值域排名。',
    timeComplexity: 'O(n \\log n)',
    spaceComplexity: 'O(n)',
    formulaLatex: '\\text{rank}(x) = \\text{lower\\_bound}(uniq, x) + 1',
    cppCode: `sort(uniq.begin(), uniq.end());
uniq.erase(unique(uniq.begin(), uniq.end()), uniq.end());
for (int x : a) mapped.push_back(lower_bound(...) + 1);`,
    defaultParams: { arrayInput: '1000 25 100000 25 400' },
    buildScene(params, authorName) {
      const arr = parseNumberArrayInput(params.arrayInput || '1000 25 100000 25 400').slice(0, 10);
      const oItem = createDefaultAlgoItem('array', 60, 70, 'disc-o');
      oItem.name = '原始值域';
      const dItem = createDefaultAlgoItem('array', 60, 220, 'disc-d');
      dItem.name = '离散化排名';
      const steps = runDiscretization(arr, 'disc-o', 'disc-d');
      if (steps[0]) {
        oItem.payload = steps[0].snapshot.artboardItems['disc-o'];
        dItem.payload = steps[0].snapshot.artboardItems['disc-d'];
      }
      return { scene: makeBaseScene(this, [oItem, dItem], steps, authorName) };
    },
  },
  {
    id: 'dfs',
    nameZh: '深度优先搜索 DFS',
    nameEn: 'Depth-First Search',
    tier: 'CSP-J',
    categoryZh: '图论与搜索',
    descriptionZh: '展示图节点递归深入与回溯过程中的调用栈实时变化。',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    formulaLatex: 'dfs(u) \\rightarrow dfs(v),\\; v \\in adj[u]',
    cppCode: `void dfs(int u) {
  vis[u] = true;
  for (int v : adj[u]) {
    if (!vis[v]) dfs(v);
  }
}`,
    defaultParams: { graphText: '5 5\n1 2\n1 3\n2 4\n2 5\n3 5', graphDirected: false, startNode: '1' },
    buildScene(params, authorName) {
      const gData = parseTextToGraph(params.graphText || '5 5\n1 2\n1 3\n2 4\n2 5\n3 5', 'oi', Boolean(params.graphDirected), false);
      const gItem = createDefaultAlgoItem('graph', 40, 50, 'dfs-g');
      const sItem = createDefaultAlgoItem('stack', 550, 50, 'dfs-s');
      const steps = runDFS(gData, params.startNode || '1', 'dfs-g', 'dfs-s');
      if (steps[0]) {
        gItem.payload = steps[0].snapshot.artboardItems['dfs-g'];
        sItem.payload = steps[0].snapshot.artboardItems['dfs-s'];
      }
      return { scene: makeBaseScene(this, [gItem, sItem], steps, authorName) };
    },
  },
  {
    id: 'backtracking',
    nameZh: '回溯全排列搜索树',
    nameEn: 'Backtracking Search Tree',
    tier: 'CSP-J',
    categoryZh: '图论与搜索',
    descriptionZh: '动态生长状态搜索树，清晰展现选择、递归与撤销现场过程。',
    timeComplexity: 'O(n \\cdot n!)',
    spaceComplexity: 'O(n)',
    formulaLatex: 'P(n, n) = n!',
    cppCode: `void dfs(int dep) {
  if (dep == n) { record(path); return; }
  for (int x = 1; x <= n; x++) {
    if (!used[x]) { used[x]=1; path.push_back(x); dfs(dep+1); ... }
  }
}`,
    defaultParams: { permN: 3 },
    buildScene(params, authorName) {
      const tItem = createDefaultAlgoItem('search-tree', 50, 50, 'bt-tree');
      tItem.width = 720;
      tItem.height = 380;
      const steps = runBacktrackingPermutations(params.permN ?? 3, 'bt-tree');
      if (steps[0]) tItem.payload = steps[0].snapshot.artboardItems['bt-tree'];
      return { scene: makeBaseScene(this, [tItem], steps, authorName) };
    },
  },
  {
    id: 'union-find',
    nameZh: '并查集 Union-Find',
    nameEn: 'Disjoint Set Union',
    tier: 'CSP-S',
    categoryZh: '数据结构',
    descriptionZh: '展示父指针数组 fa[] 合并与路径压缩结果。',
    timeComplexity: 'O(\\alpha(n))',
    spaceComplexity: 'O(n)',
    formulaLatex: 'fa[find(u)] = find(v)',
    cppCode: `int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }
void unite(int u, int v) { fa[find(u)] = find(v); }`,
    defaultParams: { dsuN: 6, dsuOpsText: '0 1\n1 2\n3 4\n2 4' },
    buildScene(params, authorName) {
      const ops = (params.dsuOpsText || '0 1\n1 2\n3 4\n2 4')
        .trim()
        .split('\n')
        .map((l) => l.trim().split(/\s+/).map(Number))
        .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) as Array<[number, number]>;
      const dItem = createDefaultAlgoItem('dsu', 60, 100, 'dsu-main');
      dItem.width = 520;
      const steps = runUnionFind(params.dsuN ?? 6, ops, 'dsu-main');
      if (steps[0]) dItem.payload = steps[0].snapshot.artboardItems['dsu-main'];
      return { scene: makeBaseScene(this, [dItem], steps, authorName) };
    },
  },
  {
    id: 'topological-sort',
    nameZh: '拓扑排序 Kahn 算法',
    nameEn: 'Topological Sort',
    tier: 'CSP-S',
    categoryZh: '图论',
    descriptionZh: '实时维护节点入度与零入度队列（自动检测无向边与有向环）。',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V + E)',
    formulaLatex: 'indeg[v] = indeg[v] - 1',
    cppCode: `for (int i = 1; i <= n; i++) if (indeg[i] == 0) q.push(i);
while (!q.empty()) {
  int u = q.front(); q.pop();
  order.push_back(u);
  for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
}`,
    defaultParams: { graphText: '5 5\n1 2\n1 3\n2 4\n3 4\n4 5', graphDirected: true, graphWeighted: false },
    buildScene(params, authorName) {
      const gData = parseTextToGraph(params.graphText || '5 5\n1 2\n1 3\n2 4\n3 4\n4 5', 'oi', true, false);
      const gItem = createDefaultAlgoItem('graph', 40, 50, 'topo-g');
      const qItem = createDefaultAlgoItem('queue', 40, 385, 'topo-q');
      const res = runTopologicalSort(gData, 'topo-g', 'topo-q');
      if (res.error) {
        gItem.payload = { kind: 'graph', data: gData };
        return { scene: makeBaseScene(this, [gItem, qItem], [], authorName), error: res.error };
      }
      if (res.steps[0]) {
        gItem.payload = res.steps[0].snapshot.artboardItems['topo-g'];
        qItem.payload = res.steps[0].snapshot.artboardItems['topo-q'];
      }
      return { scene: makeBaseScene(this, [gItem, qItem], res.steps, authorName) };
    },
  },
  {
    id: 'kruskal',
    nameZh: 'Kruskal 最小生成树',
    nameEn: 'Kruskal MST',
    tier: 'CSP-S',
    categoryZh: '图论生成树',
    descriptionZh: '按边权升序贪心加边，红色标出成环舍弃边，绿色标出树边。',
    timeComplexity: 'O(E \\log E)',
    spaceComplexity: 'O(V + E)',
    formulaLatex: '\\min \\sum_{e \\in T} w(e)',
    cppCode: `sort(edges.begin(), edges.end());
for (auto& e : edges) {
  if (find(e.u) != find(e.v)) { unite(e.u, e.v); ans += e.w; }
}`,
    defaultParams: { graphText: '4 5\n1 2 1\n2 3 2\n1 3 4\n3 4 3\n2 4 5', graphDirected: false, graphWeighted: true },
    buildScene(params, authorName) {
      const gData = parseTextToGraph(params.graphText || '4 5\n1 2 1\n2 3 2\n1 3 4\n3 4 3\n2 4 5', 'oi', false, true);
      const gItem = createDefaultAlgoItem('graph', 60, 60, 'kruskal-g');
      const steps = runKruskal(gData, 'kruskal-g');
      if (steps[0]) gItem.payload = steps[0].snapshot.artboardItems['kruskal-g'];
      return { scene: makeBaseScene(this, [gItem], steps, authorName) };
    },
  },
  {
    id: 'prim',
    nameZh: 'Prim 最小生成树',
    nameEn: 'Prim MST',
    tier: 'CSP-S',
    categoryZh: '图论生成树',
    descriptionZh: '从起点出发逐步扩展权值最小的割边构造生成树。',
    timeComplexity: 'O(E \\log V)',
    spaceComplexity: 'O(V + E)',
    formulaLatex: '\\min_{u \\in T, v \\notin T} w(u, v)',
    cppCode: `inTree[s] = true;
while (cnt < n) { pick min cut edge (u, v); ans += w; inTree[v] = true; }`,
    defaultParams: { graphText: '4 5\n1 2 2\n1 3 3\n2 3 1\n2 4 4\n3 4 5', graphDirected: false, graphWeighted: true, startNode: '1' },
    buildScene(params, authorName) {
      const gData = parseTextToGraph(params.graphText || '4 5\n1 2 2\n1 3 3\n2 3 1\n2 4 4\n3 4 5', 'oi', false, true);
      const gItem = createDefaultAlgoItem('graph', 60, 60, 'prim-g');
      const steps = runPrim(gData, params.startNode || '1', 'prim-g');
      if (steps[0]) gItem.payload = steps[0].snapshot.artboardItems['prim-g'];
      return { scene: makeBaseScene(this, [gItem], steps, authorName) };
    },
  },
  {
    id: 'floyd',
    nameZh: 'Floyd 全源最短路',
    nameEn: 'Floyd-Warshall',
    tier: 'CSP-S',
    categoryZh: '图论最短路',
    descriptionZh: '矩阵视角逐一引入中转点 k 完成任意两点最短路松弛。',
    timeComplexity: 'O(V^3)',
    spaceComplexity: 'O(V^2)',
    formulaLatex: 'd[i][j] = \\min(d[i][j],\\; d[i][k] + d[k][j])',
    cppCode: `for (int k = 1; k <= n; k++)
  for (int i = 1; i <= n; i++)
    for (int j = 1; j <= n; j++)
      d[i][j] = min(d[i][j], d[i][k] + d[k][j]);`,
    defaultParams: { graphText: '4 5\n1 2 3\n2 3 2\n1 3 8\n3 4 1\n2 4 6', graphDirected: true, graphWeighted: true },
    buildScene(params, authorName) {
      const gData = parseTextToGraph(params.graphText || '4 5\n1 2 3\n2 3 2\n1 3 8\n3 4 1\n2 4 6', 'oi', true, true);
      const mItem = createDefaultAlgoItem('matrix', 80, 70, 'floyd-m');
      mItem.width = 460;
      mItem.height = 280;
      const steps = runFloydWarshall(gData, 'floyd-m');
      if (steps[0]) mItem.payload = steps[0].snapshot.artboardItems['floyd-m'];
      return { scene: makeBaseScene(this, [mItem], steps, authorName) };
    },
  },
  {
    id: 'knapsack-unbounded',
    nameZh: '完全背包问题',
    nameEn: 'Unbounded Knapsack',
    tier: 'CSP-S',
    categoryZh: '动态规划',
    descriptionZh: '一维滚动数组正序枚举容量，允许同一物品重复选取。',
    timeComplexity: 'O(N \\cdot C)',
    spaceComplexity: 'O(C)',
    formulaLatex: 'dp[j] = \\max(dp[j],\\; dp[j - w_i] + v_i)',
    cppCode: `for (int i = 0; i < n; i++)
  for (int j = w[i]; j <= C; j++)
    dp[j] = max(dp[j], dp[j - w[i]] + v[i]);`,
    defaultParams: { knapsackInput: '3 7\n2 3\n3 5\n4 6' },
    buildScene(params, authorName) {
      const { capacity, weights, values } = competitionInputToKnapsack(params.knapsackInput || '3 7\n2 3\n3 5\n4 6');
      const dpItem = createDefaultAlgoItem('dp-1d', 50, 90, 'uk-dp');
      dpItem.width = 640;
      dpItem.height = 200;
      const steps = runKnapsackUnbounded(capacity, weights, values, 'uk-dp');
      if (steps[0]) dpItem.payload = steps[0].snapshot.artboardItems['uk-dp'];
      return { scene: makeBaseScene(this, [dpItem], steps, authorName) };
    },
  },
  {
    id: 'lis',
    nameZh: '最长上升子序列 LIS',
    nameEn: 'Longest Increasing Subsequence',
    tier: 'NOIP',
    categoryZh: '动态规划',
    descriptionZh: '序列元素与 DP 长度表双视图联动求解 LIS。',
    timeComplexity: 'O(n^2)',
    spaceComplexity: 'O(n)',
    formulaLatex: 'dp[i] = \\max_{j < i,\\; a_j < a_i}(dp[j] + 1)',
    cppCode: `for (int i = 0; i < n; i++)
  for (int j = 0; j < i; j++)
    if (a[j] < a[i]) dp[i] = max(dp[i], dp[j] + 1);`,
    defaultParams: { arrayInput: '10 9 2 5 3 7 101 18' },
    buildScene(params, authorName) {
      const arr = parseNumberArrayInput(params.arrayInput || '10 9 2 5 3 7 101 18').slice(0, 10);
      const aItem = createDefaultAlgoItem('array', 50, 60, 'lis-a');
      aItem.name = '输入序列 a[]';
      const dItem = createDefaultAlgoItem('dp-1d', 50, 210, 'lis-dp');
      dItem.name = 'LIS 长度状态 dp[]';
      const steps = runLIS(arr, 'lis-a', 'lis-dp');
      if (steps[0]) {
        aItem.payload = steps[0].snapshot.artboardItems['lis-a'];
        dItem.payload = steps[0].snapshot.artboardItems['lis-dp'];
      }
      return { scene: makeBaseScene(this, [aItem, dItem], steps, authorName) };
    },
  },
  {
    id: 'interval-dp',
    nameZh: '区间 DP（石子合并）',
    nameEn: 'Interval DP',
    tier: 'NOIP',
    categoryZh: '动态规划',
    descriptionZh: '按区间长度 len 由小到大枚举分割点 k 求解最小合并代价。',
    timeComplexity: 'O(n^3)',
    spaceComplexity: 'O(n^2)',
    formulaLatex: 'dp[l][r] = \\min_{k=l}^{r-1}(dp[l][k] + dp[k+1][r]) + sum(l, r)',
    cppCode: `for (int len = 2; len <= n; len++)
  for (int l = 1; l + len - 1 <= n; l++) {
    int r = l + len - 1;
    for (int k = l; k < r; k++) dp[l][r] = min(...);
  }`,
    defaultParams: { arrayInput: '4 1 3 2' },
    buildScene(params, authorName) {
      const stones = parseNumberArrayInput(params.arrayInput || '4 1 3 2').slice(0, 6);
      const dpItem = createDefaultAlgoItem('dp-interval', 50, 50, 'id-dp');
      dpItem.width = 580;
      dpItem.height = 330;
      const steps = runIntervalDP(stones, 'id-dp');
      if (steps[0]) dpItem.payload = steps[0].snapshot.artboardItems['id-dp'];
      return { scene: makeBaseScene(this, [dpItem], steps, authorName) };
    },
  },
  {
    id: 'fenwick-tree',
    nameZh: '树状数组 Fenwick Tree',
    nameEn: 'Fenwick Tree',
    tier: 'CSP-S',
    categoryZh: '高级数据结构',
    descriptionZh: '基于 lowbit(x) = x & -x 实现单点更新与前缀和查询。',
    timeComplexity: 'O(\\log n)',
    spaceComplexity: 'O(n)',
    formulaLatex: 'lowbit(x) = x \\& (-x)',
    cppCode: `void add(int x, int v) {
  for (; x <= n; x += x & -x) c[x] += v;
}`,
    defaultParams: { arrayInput: '2 5 3 8 1 6' },
    buildScene(params, authorName) {
      const arr = parseNumberArrayInput(params.arrayInput || '2 5 3 8 1 6').slice(0, 8);
      const aItem = createDefaultAlgoItem('array', 50, 60, 'bit-a');
      aItem.name = '原数组 a[]';
      const bItem = createDefaultAlgoItem('fenwick-tree', 50, 210, 'bit-c');
      bItem.name = '树状数组 C[1..n]';
      const steps = runFenwickTree(arr, 'bit-a', 'bit-c');
      if (steps[0]) {
        aItem.payload = steps[0].snapshot.artboardItems['bit-a'];
        bItem.payload = steps[0].snapshot.artboardItems['bit-c'];
      }
      return { scene: makeBaseScene(this, [aItem, bItem], steps, authorName) };
    },
  },
  {
    id: 'segment-tree',
    nameZh: '线段树 Segment Tree',
    nameEn: 'Segment Tree',
    tier: 'ACM',
    categoryZh: '高级数据结构',
    descriptionZh: '分治建树与区间分裂查询可视化，标出区间覆盖路径。',
    timeComplexity: 'O(\\log n)',
    spaceComplexity: 'O(4n)',
    formulaLatex: 'sum[p] = sum[2p] + sum[2p+1]',
    cppCode: `void build(int p, int l, int r) {
  if (l == r) { tr[p] = a[l]; return; }
  int mid = (l + r) >> 1;
  build(p*2, l, mid); build(p*2+1, mid+1, r);
  tr[p] = tr[p*2] + tr[p*2+1];
}`,
    defaultParams: { arrayInput: '3 5 2 7 4 1' },
    buildScene(params, authorName) {
      const arr = parseNumberArrayInput(params.arrayInput || '3 5 2 7 4 1').slice(0, 8);
      const tItem = createDefaultAlgoItem('segment-tree', 40, 48, 'seg-tree');
      tItem.width = 680;
      tItem.height = 350;
      const steps = runSegmentTree(arr, 'seg-tree');
      if (steps[0]) tItem.payload = steps[0].snapshot.artboardItems['seg-tree'];
      return { scene: makeBaseScene(this, [tItem], steps, authorName) };
    },
  },
];

export function createInitialAlgorithmScene(authorName = 'Yanpb'): SceneSchema {
  const first = ALGORITHM_TEMPLATES[0];
  return first.buildScene(first.defaultParams, authorName).scene;
}
