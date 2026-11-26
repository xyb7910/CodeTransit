import { AlgoComponentType, TeachingTier } from '../types/algorithmStudio';
import {
  AlgorithmDesignPlan,
  CreationMode,
  SemanticComponentKind,
  StaticAnalysisResult,
} from '../types/algorithmDsl';

export interface UnifiedCreationInput {
  mode: CreationMode;
  naturalLanguage: string;
  cppCode: string;
  markdownSolution: string;
  sampleInput: string;
  sampleOutput: string;
  formulaLatex: string;
  teachingTier: TeachingTier;
}

export function analyzeCppAndProblemStatic(input: UnifiedCreationInput): StaticAnalysisResult {
  const code = input.cppCode || '';
  const combinedText = `${input.naturalLanguage}\n${input.markdownSolution}\n${code}`.toLowerCase();

  const containers: StaticAnalysisResult['containers'] = [];
  const addContainer = (
    cppType: string,
    suggestedComponent: AlgoComponentType,
    semanticKind: SemanticComponentKind
  ) => {
    if (!containers.some((c) => c.suggestedComponent === suggestedComponent)) {
      containers.push({ cppType, suggestedComponent, semanticKind });
    }
  };

  if (/\bpriority_queue\b/.test(code)) addContainer('std::priority_queue', 'heap', 'SmartHeap');
  if (/\bqueue\b/.test(code)) addContainer('std::queue', 'queue', 'SmartQueue');
  if (/\bdeque\b/.test(code)) addContainer('std::deque', 'deque', 'SmartQueue');
  if (/\bstack\b/.test(code)) addContainer('std::stack', 'stack', 'SmartStack');
  if (/\bvector\s*<\s*vector/.test(code) || /\[\s*\w+\s*\]\s*\[\s*\w+\s*\]/.test(code)) {
    if (/\bdp\[|\bf\[/.test(code)) {
      addContainer('int dp[][]', 'dp-2d', 'SmartDPTable');
    } else {
      addContainer('2D array / matrix', 'matrix', 'SmartMatrix');
    }
  } else if (/\bvector\b|\bint\s+\w+\[\s*[\w+]+\s*\]/.test(code)) {
    if (/\bdp\[|\bf\[/.test(code)) {
      addContainer('int dp[]', 'dp-1d', 'SmartDPTable');
    } else {
      addContainer('std::vector / array', 'array', 'SmartArray');
    }
  }
  if (/\bunordered_map\b|\bmap\b/.test(code)) addContainer('std::map', 'hash-table', 'SmartArray');
  if (/\bset\b/.test(code)) addContainer('std::set', 'set', 'SmartArray');

  // Extract variable names statically
  const variables: StaticAnalysisResult['variables'] = [];
  const varMatches = code.matchAll(/\b(?:int|long\s+long|double|bool|string)\s+([a-zA-Z_]\w*)/g);
  const seenVar = new Set<string>();
  for (const m of varMatches) {
    const v = m[1];
    if (v === 'main' || seenVar.has(v)) continue;
    seenVar.add(v);
    variables.push({
      name: v,
      typeHint: m[0].replace(/\s+\w+$/, '').trim(),
      role: v.includes('dp') || v === 'f' ? '状态表' : v === 'ans' || v === 'res' ? '答案输出' : '控制/状态变量',
    });
    if (variables.length >= 12) break;
  }

  const loopCount = (code.match(/\b(for|while)\s*\(/g) || []).length;
  const hasRecursion = /\bvoid\s+dfs\s*\(|\bint\s+dfs\s*\(|\bsolve\s*\(/.test(code) &&
    (code.match(/\bdfs\s*\(/g) || []).length >= 2;
  const hasDpRecurrence = /\bdp\[|\bf\[/.test(code) || /动态规划|状态转移|dp\[|knapsack|背包/.test(combinedText);

  const candidates: string[] = [];
  if (/dijkstra|最短路|priority_queue/.test(combinedText)) candidates.push('Dijkstra 最短路');
  if (/bfs|广度优先|层序/.test(combinedText)) candidates.push('BFS 广度优先搜索');
  if (/dfs|深度优先|回溯/.test(combinedText) || hasRecursion) candidates.push('DFS / 递归回溯');
  if (/二维前缀和|prefix.*2d|pre\[i\]\[j\]/.test(combinedText)) candidates.push('二维前缀和');
  if (/前缀和|差分|prefix/.test(combinedText)) candidates.push('前缀和与差分');
  if (/二分|binary\s*search|lower_bound|mid\s*=/.test(combinedText)) candidates.push('二分查找');
  if (/并查集|union\s*find|\bfind\s*\(\s*int/.test(combinedText)) candidates.push('并查集 DSU');
  if (/背包|knapsack/.test(combinedText)) candidates.push('背包动态规划');
  if (/区间\s*dp|dp\[l\]\[r\]/.test(combinedText)) candidates.push('区间 DP');
  if (/线段树|segment\s*tree|pushup|pushdown/.test(combinedText)) candidates.push('线段树');
  if (/拓扑|indeg|topo/.test(combinedText)) candidates.push('拓扑排序');
  if (/sort\(|排序|冒泡|快排|归并/.test(combinedText)) candidates.push('排序算法');
  if (candidates.length === 0) {
    candidates.push(hasDpRecurrence ? '自定义动态规划' : loopCount > 0 ? '自定义迭代模拟' : '自定义算法模型');
  }

  const recommendedComponents: AlgoComponentType[] = [];
  for (const c of containers) {
    recommendedComponents.push(c.suggestedComponent);
  }
  if (/图|edge|边表|dijkstra|bfs|topo|kruskal|prim/.test(combinedText) && !recommendedComponents.includes('graph')) {
    recommendedComponents.push('graph');
  }
  if (hasRecursion && !recommendedComponents.includes('recursion-tree')) {
    recommendedComponents.push('recursion-tree');
  }
  if (recommendedComponents.length === 0) {
    recommendedComponents.push('array');
  }
  recommendedComponents.push('variable-watcher');
  if (input.formulaLatex.trim() || hasDpRecurrence) {
    recommendedComponents.push('math-formula');
  }

  const warnings: string[] = [];
  if (code.includes('scanf') || code.includes('freopen')) {
    warnings.push('检测到竞赛文件/标准 I/O 语句 (freopen/scanf)，已识别为静态语义参考');
  }
  if (!code.trim() && input.mode === 'cpp-source') {
    warnings.push('尚未粘贴 C++17 源码，将基于自然语言与样例进行建模');
  }

  return {
    detectedParadigm: candidates[0],
    candidateAlgorithms: candidates,
    variables,
    containers,
    loopCount,
    hasRecursion,
    hasDpRecurrence,
    recommendedComponents: Array.from(new Set(recommendedComponents)),
    warnings,
    disclaimer:
      '以上结果来自 C++17 / 题面静态语义分析与可视化建模建议，并非真实 C++ 编译器执行；若需精确步进轨迹，请使用内置引擎、DSL 规则解释器或导入外部 Trace JSON。',
  };
}

export function buildLocalDesignPlan(input: UnifiedCreationInput): AlgorithmDesignPlan {
  const analysis = analyzeCppAndProblemStatic(input);
  const titleSeed =
    input.naturalLanguage.trim().split('\n')[0]?.slice(0, 28) ||
    analysis.detectedParadigm ||
    '自定义算法演示';

  return {
    id: `plan-${Date.now()}`,
    title: titleSeed,
    creationMode: input.mode,
    detectedAlgorithm: analysis.detectedParadigm,
    confidenceNote:
      input.mode === 'cpp-source'
        ? '基于 C++17 静态词法与容器识别（非真实 C++ 运行时执行）'
        : '基于题目语义、样例结构与规则推理生成的设计方案',
    teachingTier: input.teachingTier,
    teachingStyle: 'deductive',
    recommendedComponents: analysis.recommendedComponents,
    isStaticAnalysisOnly: input.mode === 'cpp-source',
    createdAt: Date.now(),
    stages: [
      {
        key: 'inputUnderstanding',
        title: '1. 输入理解',
        summary: `提取输入规模与样例目标 (${input.sampleInput ? '已提供测试样例' : '默认小规模教学样例'})`,
        details: [
          input.sampleInput ? `输入样例预览: ${input.sampleInput.slice(0, 60)}` : '建议采用 n <= 8 的小规模可观测输入',
          input.sampleOutput ? `期望输出: ${input.sampleOutput}` : '可在验证报告中核对实际与期望输出',
        ],
        editableText: input.sampleInput || 'n = 5, 序列 [5, 3, 8, 1, 4]',
        approved: true,
      },
      {
        key: 'algorithmRecognition',
        title: '2. 算法识别',
        summary: `主算法范式：${analysis.detectedParadigm}`,
        details: [
          `候选识别：${analysis.candidateAlgorithms.join('、')}`,
          analysis.disclaimer,
        ],
        editableText: analysis.detectedParadigm,
        approved: true,
      },
      {
        key: 'dsModeling',
        title: '3. 数据结构建模',
        summary: `推荐可视化组件：${analysis.recommendedComponents.join(', ')}`,
        details: analysis.containers.map((c) => `${c.cppType} → ${c.semanticKind}`),
        editableText: analysis.recommendedComponents.join(', '),
        approved: true,
      },
      {
        key: 'stateDesign',
        title: '4. 状态与变量设计',
        summary: `跟踪关键变量 ${analysis.variables.slice(0, 5).map((v) => v.name).join(', ') || 'i, j, ans'}`,
        details: analysis.variables.map((v) => `${v.name} (${v.typeHint}): ${v.role}`),
        editableText: analysis.variables.map((v) => v.name).join(', ') || 'i, j, cur, ans',
        approved: true,
      },
      {
        key: 'opsAndEvents',
        title: '5. 操作与事件设计',
        summary: '定义 compare / assign / transition / highlight / done 语义事件',
        details: ['每次状态写入自动触发 AlgorithmEvent 并生成不可变 Snapshot'],
        editableText: 'assign, compare, transition, highlight, done',
        approved: true,
      },
      {
        key: 'visualLayout',
        title: '6. 可视化布局与教学设计',
        summary: `教学层级 ${input.teachingTier} · 无重叠智能分区排版`,
        details: ['主数据结构居中左侧，变量监视器与状态转移公式置于右侧栏'],
        editableText: `面向 ${input.teachingTier} 的分步启发式教学讲解`,
        approved: true,
      },
    ],
  };
}
