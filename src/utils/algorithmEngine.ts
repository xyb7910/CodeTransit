import {
  AlgoComponentPayload,
  AlgoDpData,
  AlgoGraphData,
  AlgoStep,
  AlgoTreeData,
  AlgoTreeNode,
  AlgoVariable,
  AlgorithmEvent,
} from '../types/algorithmStudio';
import { HighlightColor } from '../types/workspace';
import { validateGraphForAlgorithm } from './graphLayouts';

function clonePayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function makeStep(
  index: number,
  title: string,
  explanation: string,
  codeLines: number[],
  artboardItems: Record<string, AlgoComponentPayload>,
  variables: AlgoVariable[],
  events: AlgorithmEvent[],
  highlights: AlgoStep['highlights'] = {},
  formulaLatex?: string,
  coachNote?: string
): AlgoStep {
  return {
    id: `step-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    index,
    title,
    explanation,
    coachNote,
    formulaLatex,
    codeLines,
    durationMs: 750,
    animationStyle: 'smooth',
    highlights,
    events,
    snapshot: {
      artboardItems: clonePayload(artboardItems),
      variables: clonePayload(variables),
    },
  };
}

function makeEvt(
  stepIdx: number,
  type: AlgorithmEvent['type'],
  message: string,
  targetId?: string
): AlgorithmEvent {
  return {
    id: `evt-${stepIdx}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    targetId,
    message,
    timestampStep: stepIdx,
  };
}

/* ============================================================================
 * 1. BUBBLE SORT (Real Execution)
 * ============================================================================ */
export function runBubbleSort(inputArr: number[], compId: string): AlgoStep[] {
  const arr = [...inputArr];
  const n = arr.length;
  const steps: AlgoStep[] = [];
  const sortedSet = new Set<number>();

  const buildPayload = (hl: Record<number, HighlightColor>, ptrs: Array<{ index: number; label: string; color: HighlightColor }> = []): AlgoComponentPayload => ({
    kind: 'array',
    data: { items: [...arr], indices: true, highlightedIndices: hl, pointers: ptrs },
  });

  steps.push(
    makeStep(
      0,
      '初始化待排序数组',
      `共有 ${n} 个元素，准备执行冒泡排序。`,
      [4, 5],
      { [compId]: buildPayload({}) },
      [{ name: 'n', value: String(n) }],
      [makeEvt(0, 'assign', `初始化数组 [${arr.join(', ')}]`)]
    )
  );

  let stepIdx = 1;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      const cmpHl: Record<number, HighlightColor> = { [j]: 'blue', [j + 1]: 'blue' };
      for (const s of sortedSet) cmpHl[s] = 'green';
      steps.push(
        makeStep(
          stepIdx,
          `第 ${i + 1} 轮比较 a[${j}] 与 a[${j + 1}]`,
          `比较 ${arr[j]} 和 ${arr[j + 1]}${arr[j] > arr[j + 1] ? '，前者更大，需要交换' : '，满足升序，不交换'}。`,
          [8, 9],
          {
            [compId]: buildPayload(cmpHl, [
              { index: j, label: 'j', color: 'blue' },
              { index: j + 1, label: 'j+1', color: 'orange' },
            ]),
          },
          [
            { name: 'i', value: String(i) },
            { name: 'j', value: String(j), changed: true },
            { name: 'a[j]', value: String(arr[j]), changed: true },
            { name: 'a[j+1]', value: String(arr[j + 1]), changed: true },
          ],
          [makeEvt(stepIdx, 'compare', `比较 a[${j}]=${arr[j]} 与 a[${j + 1}]=${arr[j + 1]}`)],
          { arrayIndices: cmpHl },
          arr[j] > arr[j + 1] ? `a[${j}] > a[${j + 1}] \\Rightarrow \\text{swap}` : `a[${j}] \\le a[${j + 1}]`
        )
      );
      stepIdx++;

      if (arr[j] > arr[j + 1]) {
        const tmp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = tmp;
        swapped = true;
        const swapHl: Record<number, HighlightColor> = { [j]: 'red', [j + 1]: 'red' };
        for (const s of sortedSet) swapHl[s] = 'green';
        steps.push(
          makeStep(
            stepIdx,
            `交换 a[${j}] 与 a[${j + 1}]`,
            `完成交换，当前序列为 [${arr.join(', ')}]。`,
            [10, 11],
            {
              [compId]: buildPayload(swapHl, [
                { index: j, label: 'j', color: 'red' },
                { index: j + 1, label: 'j+1', color: 'red' },
              ]),
            },
            [
              { name: 'i', value: String(i) },
              { name: 'j', value: String(j) },
              { name: 'swapped', value: 'true', changed: true },
            ],
            [makeEvt(stepIdx, 'swap', `交换下标 ${j} 与 ${j + 1}`)],
            { arrayIndices: swapHl }
          )
        );
        stepIdx++;
      }
    }
    sortedSet.add(n - 1 - i);
    if (!swapped) break;
  }

  const finalHl: Record<number, HighlightColor> = {};
  for (let k = 0; k < n; k++) finalHl[k] = 'green';
  steps.push(
    makeStep(
      stepIdx,
      '排序完成',
      `所有元素已有序：[${arr.join(', ')}]。`,
      [15],
      { [compId]: buildPayload(finalHl) },
      [{ name: 'sorted', value: 'true', changed: true }],
      [makeEvt(stepIdx, 'done', '冒泡排序结束')],
      { arrayIndices: finalHl }
    )
  );
  return steps;
}

/* ============================================================================
 * 2. BINARY SEARCH (Real Execution)
 * ============================================================================ */
export function runBinarySearch(inputArr: number[], target: number, compId: string): AlgoStep[] {
  const arr = [...inputArr].sort((a, b) => a - b);
  const steps: AlgoStep[] = [];
  let l = 0;
  let r = arr.length - 1;
  let foundIdx = -1;

  const makePayload = (
    hl: Record<number, HighlightColor>,
    mid?: number
  ): AlgoComponentPayload => {
    const ptrs: Array<{ index: number; label: string; color: HighlightColor }> = [];
    if (l >= 0 && l < arr.length) ptrs.push({ index: l, label: 'L', color: 'blue' });
    if (r >= 0 && r < arr.length) ptrs.push({ index: r, label: 'R', color: 'orange' });
    if (mid !== undefined && mid >= 0 && mid < arr.length) ptrs.push({ index: mid, label: 'mid', color: 'purple' });
    return {
      kind: 'array',
      data: {
        items: arr,
        indices: true,
        highlightedIndices: hl,
        pointers: ptrs,
        rangeHighlight: l <= r ? { start: l, end: r, color: 'yellow', label: '[L, R]' } : undefined,
      },
    };
  };

  steps.push(
    makeStep(
      0,
      '初始化二分搜索区间',
      `在有序数组中查找目标值 target = ${target}，初始区间 [0, ${r}]。`,
      [4, 5],
      { [compId]: makePayload({}) },
      [
        { name: 'target', value: String(target) },
        { name: 'L', value: String(l), changed: true },
        { name: 'R', value: String(r), changed: true },
      ],
      [makeEvt(0, 'assign', `L=0, R=${r}, target=${target}`)],
      {},
      `[L, R] = [0, ${r}]`
    )
  );

  let stepIdx = 1;
  while (l <= r) {
    const mid = l + ((r - l) >> 1);
    const hl: Record<number, HighlightColor> = { [mid]: 'purple' };
    steps.push(
      makeStep(
        stepIdx,
        `检查中点 mid = ${mid}`,
        `a[${mid}] = ${arr[mid]}，与 target = ${target} 比较。`,
        [7, 8],
        { [compId]: makePayload(hl, mid) },
        [
          { name: 'L', value: String(l) },
          { name: 'R', value: String(r) },
          { name: 'mid', value: String(mid), changed: true },
          { name: 'a[mid]', value: String(arr[mid]), changed: true },
        ],
        [makeEvt(stepIdx, 'compare', `比较 a[${mid}]=${arr[mid]} 与 ${target}`)],
        { arrayIndices: hl },
        `mid = L + \\lfloor(R-L)/2\\rfloor = ${mid}`
      )
    );
    stepIdx++;

    if (arr[mid] === target) {
      foundIdx = mid;
      const winHl: Record<number, HighlightColor> = { [mid]: 'green' };
      steps.push(
        makeStep(
          stepIdx,
          `命中目标值！下标 ${mid}`,
          `a[${mid}] == ${target}，二分查找成功返回 ${mid}。`,
          [9],
          { [compId]: makePayload(winHl, mid) },
          [
            { name: 'ans', value: String(foundIdx), changed: true },
          ],
          [makeEvt(stepIdx, 'done', `找到目标下标 ${mid}`)],
          { arrayIndices: winHl }
        )
      );
      return steps;
    } else if (arr[mid] < target) {
      l = mid + 1;
      steps.push(
        makeStep(
          stepIdx,
          `a[mid] < target，收缩左边界`,
          `${arr[mid]} < ${target}，舍弃左半区间，令 L = mid + 1 = ${l}。`,
          [10, 11],
          { [compId]: makePayload({}) },
          [
            { name: 'L', value: String(l), changed: true },
            { name: 'R', value: String(r) },
          ],
          [makeEvt(stepIdx, 'transition', `L 更新为 ${l}`)]
        )
      );
      stepIdx++;
    } else {
      r = mid - 1;
      steps.push(
        makeStep(
          stepIdx,
          `a[mid] > target，收缩右边界`,
          `${arr[mid]} > ${target}，舍弃右半区间，令 R = mid - 1 = ${r}。`,
          [12, 13],
          { [compId]: makePayload({}) },
          [
            { name: 'L', value: String(l) },
            { name: 'R', value: String(r), changed: true },
          ],
          [makeEvt(stepIdx, 'transition', `R 更新为 ${r}`)]
        )
      );
      stepIdx++;
    }
  }

  steps.push(
    makeStep(
      stepIdx,
      '区间为空，未找到目标',
      `L (${l}) > R (${r})，数组中不存在 ${target}，返回 -1。`,
      [15],
      { [compId]: makePayload({}) },
      [{ name: 'ans', value: '-1', changed: true }],
      [makeEvt(stepIdx, 'done', '未找到目标值，返回 -1')]
    )
  );
  return steps;
}

/* ============================================================================
 * 3. BFS GRAPH TRAVERSAL (Real Execution)
 * ============================================================================ */
export function runBFS(
  graphInput: AlgoGraphData,
  startId: string,
  graphCompId: string,
  queueCompId: string
): AlgoStep[] {
  const graph = clonePayload(graphInput);
  const start = graph.nodes.find((n) => n.id === startId)?.id || graph.nodes[0]?.id;
  if (!start) return [];

  const adj = new Map<string, Array<{ to: string; edgeId: string }>>();
  for (const nd of graph.nodes) adj.set(nd.id, []);
  for (const e of graph.edges) {
    adj.get(e.from)?.push({ to: e.to, edgeId: e.id });
    if (!e.directed) adj.get(e.to)?.push({ to: e.from, edgeId: e.id });
  }

  const dist = new Map<string, number>();
  const queue: string[] = [start];
  dist.set(start, 0);

  const steps: AlgoStep[] = [];
  const makeSnapshot = (
    nodeHl: Record<string, HighlightColor>,
    edgeHl: Record<string, HighlightColor>
  ): Record<string, AlgoComponentPayload> => {
    const gCopy = clonePayload(graph);
    gCopy.nodes.forEach((nd) => {
      nd.highlight = nodeHl[nd.id];
      nd.weight = dist.has(nd.id) ? `d=${dist.get(nd.id)}` : '∞';
    });
    gCopy.edges.forEach((ed) => {
      ed.highlight = edgeHl[ed.id];
    });
    return {
      [graphCompId]: { kind: 'graph', data: gCopy },
      [queueCompId]: {
        kind: 'linear',
        data: { items: [...queue], direction: 'horizontal', caption: 'BFS Queue' },
      },
    };
  };

  steps.push(
    makeStep(
      0,
      `起点 ${start} 入队`,
      `设置 dist[${start}] = 0，并将起点 ${start} 压入队列。`,
      [5, 6],
      makeSnapshot({ [start]: 'blue' }, {}),
      [
        { name: 'queue', value: `[${queue.join(', ')}]`, changed: true },
        { name: `dist[${start}]`, value: '0', changed: true },
      ],
      [makeEvt(0, 'push', `起点 ${start} 入队`)],
      { nodes: { [start]: 'blue' } }
    )
  );

  let stepIdx = 1;
  const visitedOrder: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    visitedOrder.push(u);
    const nodeHl: Record<string, HighlightColor> = {};
    for (const v of visitedOrder) nodeHl[v] = 'green';
    for (const qn of queue) nodeHl[qn] = 'yellow';
    nodeHl[u] = 'blue';

    steps.push(
      makeStep(
        stepIdx,
        `节点 ${u} 出队扩展`,
        `从队首取出节点 ${u}（dist = ${dist.get(u)}），准备扫描其所有邻接节点。`,
        [9, 10],
        makeSnapshot(nodeHl, {}),
        [
          { name: 'u', value: u, changed: true },
          { name: 'queue', value: `[${queue.join(', ')}]`, changed: true },
          { name: 'visited', value: visitedOrder.join(' → ') },
        ],
        [makeEvt(stepIdx, 'pop', `出队 ${u}`)],
        { nodes: nodeHl }
      )
    );
    stepIdx++;

    for (const { to: v, edgeId } of adj.get(u) ?? []) {
      if (!dist.has(v)) {
        dist.set(v, (dist.get(u) ?? 0) + 1);
        queue.push(v);
        const expHl: Record<string, HighlightColor> = { ...nodeHl, [v]: 'yellow' };
        steps.push(
          makeStep(
            stepIdx,
            `发现新节点 ${v}，入队`,
            `经过边 ${u} → ${v} 更新 dist[${v}] = ${dist.get(v)}，并将 ${v} 加入队列尾部。`,
            [13, 14, 15],
            makeSnapshot(expHl, { [edgeId]: 'orange' }),
            [
              { name: 'u → v', value: `${u} → ${v}`, changed: true },
              { name: `dist[${v}]`, value: String(dist.get(v)), changed: true },
              { name: 'queue', value: `[${queue.join(', ')}]`, changed: true },
            ],
            [makeEvt(stepIdx, 'push', `节点 ${v} 入队，dist=${dist.get(v)}`)],
            { nodes: expHl, edges: { [edgeId]: 'orange' } },
            `dist[${v}] = dist[${u}] + 1 = ${dist.get(v)}`
          )
        );
        stepIdx++;
      }
    }
  }

  const doneHl: Record<string, HighlightColor> = {};
  for (const v of visitedOrder) doneHl[v] = 'green';
  steps.push(
    makeStep(
      stepIdx,
      'BFS 遍历完成',
      `访问顺序：${visitedOrder.join(' → ')}。`,
      [18],
      makeSnapshot(doneHl, {}),
      [{ name: 'order', value: visitedOrder.join(' → '), changed: true }],
      [makeEvt(stepIdx, 'done', 'BFS 搜索结束')],
      { nodes: doneHl }
    )
  );
  return steps;
}

/* ============================================================================
 * 4. DIJKSTRA SHORTEST PATH (Real Execution + Negative Weight Validation)
 * ============================================================================ */
export function runDijkstra(
  graphInput: AlgoGraphData,
  startId: string,
  graphCompId: string,
  distCompId: string
): { steps: AlgoStep[]; error?: string } {
  const validation = validateGraphForAlgorithm(graphInput, 'dijkstra');
  if (!validation.valid) {
    return { steps: [], error: validation.reason };
  }

  const graph = clonePayload(graphInput);
  const start = graph.nodes.find((n) => n.id === startId)?.id || graph.nodes[0]?.id;
  if (!start) return { steps: [], error: '空图无法执行 Dijkstra' };

  const adj = new Map<string, Array<{ to: string; w: number; edgeId: string }>>();
  for (const nd of graph.nodes) adj.set(nd.id, []);
  for (const e of graph.edges) {
    const w = e.weight ?? 1;
    adj.get(e.from)?.push({ to: e.to, w, edgeId: e.id });
    if (!e.directed) adj.get(e.to)?.push({ to: e.from, w, edgeId: e.id });
  }

  const dist = new Map<string, number>();
  const vis = new Set<string>();
  for (const nd of graph.nodes) dist.set(nd.id, nd.id === start ? 0 : Infinity);

  const steps: AlgoStep[] = [];
  const makeSnapshot = (
    nodeHl: Record<string, HighlightColor>,
    edgeHl: Record<string, HighlightColor>
  ): Record<string, AlgoComponentPayload> => {
    const gCopy = clonePayload(graph);
    gCopy.nodes.forEach((nd) => {
      const d = dist.get(nd.id) ?? Infinity;
      nd.weight = Number.isFinite(d) ? String(d) : '∞';
      nd.highlight = nodeHl[nd.id];
    });
    gCopy.edges.forEach((ed) => {
      ed.highlight = edgeHl[ed.id];
    });
    const distArr = graph.nodes.map((nd) => {
      const d = dist.get(nd.id) ?? Infinity;
      return `${nd.label}:${Number.isFinite(d) ? d : '∞'}`;
    });
    const arrHl: Record<number, HighlightColor> = {};
    graph.nodes.forEach((nd, i) => {
      if (nodeHl[nd.id]) arrHl[i] = nodeHl[nd.id];
    });
    return {
      [graphCompId]: { kind: 'graph', data: gCopy },
      [distCompId]: {
        kind: 'array',
        data: { items: distArr, indices: false, highlightedIndices: arrHl },
      },
    };
  };

  steps.push(
    makeStep(
      0,
      `初始化源点 ${start}`,
      `dist[${start}] = 0，其余所有节点距离初始化为 +∞。`,
      [8, 9],
      makeSnapshot({ [start]: 'blue' }, {}),
      [{ name: `dist[${start}]`, value: '0', changed: true }],
      [makeEvt(0, 'assign', `源点 ${start} 距离设为 0`)],
      { nodes: { [start]: 'blue' } }
    )
  );

  let stepIdx = 1;
  for (let round = 0; round < graph.nodes.length; round++) {
    let u: string | null = null;
    let best = Infinity;
    for (const nd of graph.nodes) {
      const d = dist.get(nd.id) ?? Infinity;
      if (!vis.has(nd.id) && d < best) {
        best = d;
        u = nd.id;
      }
    }
    if (!u || !Number.isFinite(best)) break;
    vis.add(u);

    const pickHl: Record<string, HighlightColor> = {};
    for (const v of vis) pickHl[v] = 'green';
    pickHl[u] = 'blue';

    steps.push(
      makeStep(
        stepIdx,
        `选出当前最小未确定节点 ${u}`,
        `节点 ${u} 拥有当前最小距离 dist[${u}] = ${best}，将其标记为已确定最短路。`,
        [13, 14, 15],
        makeSnapshot(pickHl, {}),
        [
          { name: 'u', value: u, changed: true },
          { name: `dist[${u}]`, value: String(best) },
        ],
        [makeEvt(stepIdx, 'select', `确定节点 ${u} 最短路为 ${best}`)],
        { nodes: pickHl }
      )
    );
    stepIdx++;

    for (const { to: v, w, edgeId } of adj.get(u) ?? []) {
      if (vis.has(v)) continue;
      const oldD = dist.get(v) ?? Infinity;
      const cand = best + w;
      if (cand < oldD) {
        dist.set(v, cand);
        const relaxHl: Record<string, HighlightColor> = { ...pickHl, [v]: 'orange' };
        steps.push(
          makeStep(
            stepIdx,
            `松弛边 ${u} → ${v} (w=${w})`,
            `dist[${u}] + ${w} = ${cand} < ${Number.isFinite(oldD) ? oldD : '∞'}，更新 dist[${v}] = ${cand}。`,
            [17, 18, 19],
            makeSnapshot(relaxHl, { [edgeId]: 'orange' }),
            [
              { name: 'edge', value: `${u} → ${v} (w=${w})`, changed: true },
              { name: `dist[${v}]`, value: `${Number.isFinite(oldD) ? oldD : '∞'} → ${cand}`, changed: true },
            ],
            [makeEvt(stepIdx, 'relax', `松弛成功：dist[${v}] = ${cand}`)],
            { nodes: relaxHl, edges: { [edgeId]: 'orange' } },
            `dist[${v}] = \\min(${Number.isFinite(oldD) ? oldD : '\\infty'},\\; ${best} + ${w}) = ${cand}`
          )
        );
        stepIdx++;
      }
    }
  }

  const finalHl: Record<string, HighlightColor> = {};
  for (const v of vis) finalHl[v] = 'green';
  steps.push(
    makeStep(
      stepIdx,
      'Dijkstra 最短路求解完成',
      `所有可达节点最短路径均已确定。`,
      [23],
      makeSnapshot(finalHl, {}),
      [{ name: 'done', value: 'true', changed: true }],
      [makeEvt(stepIdx, 'done', 'Dijkstra 完成')],
      { nodes: finalHl }
    )
  );
  return { steps };
}

/* ============================================================================
 * 5. 0/1 KNAPSACK (Real 2D DP Execution + Backtracking)
 * ============================================================================ */
export function runKnapsack01(
  capacity: number,
  weights: number[],
  values: number[],
  dpCompId: string
): AlgoStep[] {
  const n = Math.min(weights.length, values.length);
  const C = Math.max(1, Math.min(14, capacity));
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(C + 1).fill(0));
  const steps: AlgoStep[] = [];

  const rowLabels = ['0', ...Array.from({ length: n }, (_, i) => `#${i + 1}(w=${weights[i]},v=${values[i]})`)];
  const colLabels = Array.from({ length: C + 1 }, (_, j) => `j=${j}`);

  const buildDpPayload = (
    hl: Record<string, HighlightColor>,
    active?: { r: number; c: number },
    deps: AlgoDpData['dependencies'] = []
  ): AlgoComponentPayload => ({
    kind: 'dp',
    data: {
      variant: '2d',
      rows: dp.map((r) => [...r]),
      rowLabels,
      colLabels,
      formula: 'dp[i][j] = \\max(dp[i-1][j],\\; dp[i-1][j-w_i] + v_i)',
      highlightedCells: hl,
      activeCell: active,
      dependencies: deps,
    },
  });

  steps.push(
    makeStep(
      0,
      '初始化 0/1 背包 DP 表',
      `${n} 个物品，背包容量 C = ${C}，第 0 行全部初始化为 0。`,
      [7, 8],
      { [dpCompId]: buildDpPayload({}) },
      [
        { name: 'N', value: String(n) },
        { name: 'C', value: String(C) },
      ],
      [makeEvt(0, 'assign', `初始化 (${n + 1})×(${C + 1}) 状态表`)]
    )
  );

  let stepIdx = 1;
  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1];
    const v = values[i - 1];
    for (let j = 0; j <= C; j++) {
      const notTake = dp[i - 1][j];
      if (j < w) {
        dp[i][j] = notTake;
        const hl: Record<string, HighlightColor> = {
          [`${i},${j}`]: 'yellow',
          [`${i - 1},${j}`]: 'blue',
        };
        steps.push(
          makeStep(
            stepIdx,
            `物品 #${i} 容量不足 (j=${j} < w=${w})`,
            `无法装入第 ${i} 件物品，直接继承上一行 dp[${i - 1}][${j}] = ${notTake}。`,
            [11],
            { [dpCompId]: buildDpPayload(hl, { r: i, c: j }, [{ from: [i - 1, j], to: [i, j] }]) },
            [
              { name: 'i', value: String(i) },
              { name: 'j', value: String(j), changed: true },
              { name: `dp[${i}][${j}]`, value: String(dp[i][j]), changed: true },
            ],
            [makeEvt(stepIdx, 'transition', `dp[${i}][${j}] = ${dp[i][j]} (不选)`)]
          )
        );
      } else {
        const take = dp[i - 1][j - w] + v;
        dp[i][j] = Math.max(notTake, take);
        const chose = take > notTake;
        const hl: Record<string, HighlightColor> = {
          [`${i},${j}`]: chose ? 'green' : 'blue',
          [`${i - 1},${j}`]: 'blue',
          [`${i - 1},${j - w}`]: 'purple',
        };
        steps.push(
          makeStep(
            stepIdx,
            `计算 dp[${i}][${j}] (${chose ? '选择物品' : '不选更优'})`,
            `不选=${notTake}，选物品#${i}(+${v})=${take}，取较大值 ${dp[i][j]}。`,
            [12, 13],
            {
              [dpCompId]: buildDpPayload(hl, { r: i, c: j }, [
                { from: [i - 1, j], to: [i, j] },
                { from: [i - 1, j - w], to: [i, j] },
              ]),
            },
            [
              { name: 'i', value: String(i) },
              { name: 'j', value: String(j), changed: true },
              { name: '不选 / 选', value: `${notTake} / ${take}`, changed: true },
              { name: `dp[${i}][${j}]`, value: String(dp[i][j]), changed: true },
            ],
            [makeEvt(stepIdx, 'transition', `dp[${i}][${j}] = max(${notTake}, ${take}) = ${dp[i][j]}`)],
            { dpCells: hl },
            `dp[${i}][${j}] = \\max(${notTake},\\; ${dp[i - 1][j - w]} + ${v}) = ${dp[i][j]}`
          )
        );
      }
      stepIdx++;
    }
  }

  // Backtrack optimal items
  const chosenItems: number[] = [];
  const finalHl: Record<string, HighlightColor> = { [`${n},${C}`]: 'green' };
  let rem = C;
  for (let i = n; i >= 1; i--) {
    if (dp[i][rem] !== dp[i - 1][rem]) {
      chosenItems.push(i);
      rem -= weights[i - 1];
    }
    finalHl[`${i - 1},${rem}`] = 'orange';
  }
  chosenItems.reverse();

  steps.push(
    makeStep(
      stepIdx,
      `求解完成：最大价值 ${dp[n][C]}`,
      `最优方案选取物品编号：[${chosenItems.join(', ') || '无'}]，总价值 ${dp[n][C]}。`,
      [17],
      { [dpCompId]: buildDpPayload(finalHl, { r: n, c: C }) },
      [
        { name: 'max_value', value: String(dp[n][C]), changed: true },
        { name: 'chosen', value: `[${chosenItems.join(', ')}]`, changed: true },
      ],
      [makeEvt(stepIdx, 'done', `最大总价值 = ${dp[n][C]}`)],
      { dpCells: finalHl }
    )
  );
  return steps;
}

/* ============================================================================
 * 6–20. ADDITIONAL REAL CSP-J / CSP-S / NOIP / ACM ALGORITHMS
 * ============================================================================ */
export function runPrefixSumDiff(inputArr: number[], compArrId: string, compPrefId: string): AlgoStep[] {
  const arr = [...inputArr];
  const n = arr.length;
  const pref = Array(n + 1).fill(0);
  const steps: AlgoStep[] = [];

  const makeSnap = (hlA: Record<number, HighlightColor>, hlP: Record<number, HighlightColor>): Record<string, AlgoComponentPayload> => ({
    [compArrId]: { kind: 'array', data: { items: arr, indices: true, highlightedIndices: hlA } },
    [compPrefId]: { kind: 'array', data: { items: [...pref], indices: true, highlightedIndices: hlP } },
  });

  steps.push(makeStep(0, '初始化前缀和数组 pref[0] = 0', '构建长度 n+1 的前缀和数组。', [4], makeSnap({}, { 0: 'green' }), [{ name: 'pref[0]', value: '0' }], [makeEvt(0, 'assign', 'pref[0] = 0')]));
  for (let i = 1; i <= n; i++) {
    pref[i] = pref[i - 1] + arr[i - 1];
    steps.push(
      makeStep(
        i,
        `计算前缀和 pref[${i}]`,
        `pref[${i}] = pref[${i - 1}] + a[${i - 1}] = ${pref[i - 1]} + ${arr[i - 1]} = ${pref[i]}。`,
        [6],
        makeSnap({ [i - 1]: 'blue' }, { [i - 1]: 'purple', [i]: 'green' }),
        [
          { name: 'i', value: String(i), changed: true },
          { name: `pref[${i}]`, value: String(pref[i]), changed: true },
        ],
        [makeEvt(i, 'transition', `pref[${i}] = ${pref[i]}`)],
        {},
        `pref[${i}] = pref[${i - 1}] + a[${i - 1}] = ${pref[i]}`
      )
    );
  }
  return steps;
}

export function runTwoPointers(inputArr: number[], target: number, compId: string): AlgoStep[] {
  const arr = [...inputArr].sort((a, b) => a - b);
  const steps: AlgoStep[] = [];
  let l = 0;
  let r = arr.length - 1;
  let idx = 0;

  const snap = (hl: Record<number, HighlightColor>): Record<string, AlgoComponentPayload> => ({
    [compId]: {
      kind: 'array',
      data: {
        items: arr,
        indices: true,
        highlightedIndices: hl,
        pointers: [
          { index: l, label: 'L', color: 'blue' },
          { index: r, label: 'R', color: 'orange' },
        ],
      },
    },
  });

  steps.push(makeStep(idx++, '初始化双指针 L, R', `有序数组目标和 target = ${target}。`, [4], snap({ [l]: 'blue', [r]: 'orange' }), [{ name: 'L', value: String(l) }, { name: 'R', value: String(r) }], [makeEvt(0, 'assign', `L=${l}, R=${r}`)]));

  while (l < r) {
    const s = arr[l] + arr[r];
    if (s === target) {
      steps.push(makeStep(idx++, `命中目标和 ${target}`, `a[${l}] + a[${r}] = ${arr[l]} + ${arr[r]} = ${target}。`, [7], snap({ [l]: 'green', [r]: 'green' }), [{ name: 'sum', value: String(s), changed: true }], [makeEvt(idx, 'done', `找到解 (${l}, ${r})`)]));
      return steps;
    }
    steps.push(makeStep(idx++, `a[${l}] + a[${r}] = ${s}`, s < target ? `${s} < ${target}，左指针右移` : `${s} > ${target}，右指针左移`, [8, 9], snap({ [l]: 'blue', [r]: 'orange' }), [{ name: 'sum', value: String(s), changed: true }], [makeEvt(idx, 'compare', `sum=${s}`)]));
    if (s < target) l++;
    else r--;
  }
  steps.push(makeStep(idx++, '未找到满足和为 target 的数对', '双指针相遇，结束搜索。', [12], snap({}), [{ name: 'found', value: 'false' }], [makeEvt(idx, 'done', '无解')]));
  return steps;
}

export function runDiscretization(inputArr: number[], compOrigId: string, compDiscId: string): AlgoStep[] {
  const uniq = Array.from(new Set(inputArr)).sort((a, b) => a - b);
  const mapped = inputArr.map((x) => uniq.indexOf(x) + 1);
  return [
    makeStep(0, '原始数据', `共 ${inputArr.length} 个整数。`, [4], {
      [compOrigId]: { kind: 'array', data: { items: inputArr, indices: true } },
      [compDiscId]: { kind: 'array', data: { items: uniq, indices: true } },
    }, [{ name: 'unique_cnt', value: String(uniq.length) }], [makeEvt(0, 'assign', '排序并去重')]),
    makeStep(1, '二分映射为紧凑排名 (1..k)', `离散化后结果：[${mapped.join(', ')}]。`, [7, 8], {
      [compOrigId]: { kind: 'array', data: { items: inputArr, indices: true, highlightedIndices: { 0: 'blue' } } },
      [compDiscId]: { kind: 'array', data: { items: mapped, indices: true, highlightedIndices: { 0: 'green' } } },
    }, [{ name: 'mapped', value: `[${mapped.join(', ')}]`, changed: true }], [makeEvt(1, 'done', '离散化完成')]),
  ];
}

export function runDFS(graphInput: AlgoGraphData, startId: string, graphCompId: string, stackCompId: string): AlgoStep[] {
  const graph = clonePayload(graphInput);
  const start = graph.nodes.find((n) => n.id === startId)?.id || graph.nodes[0]?.id;
  if (!start) return [];

  const adj = new Map<string, Array<{ to: string; edgeId: string }>>();
  for (const nd of graph.nodes) adj.set(nd.id, []);
  for (const e of graph.edges) {
    adj.get(e.from)?.push({ to: e.to, edgeId: e.id });
    if (!e.directed) adj.get(e.to)?.push({ to: e.from, edgeId: e.id });
  }

  const vis = new Set<string>();
  const callStack: string[] = [];
  const order: string[] = [];
  const steps: AlgoStep[] = [];
  let idx = 0;

  const snap = (cur?: string, edgeId?: string): Record<string, AlgoComponentPayload> => {
    const gCopy = clonePayload(graph);
    gCopy.nodes.forEach((nd) => {
      nd.highlight = nd.id === cur ? 'blue' : vis.has(nd.id) ? 'green' : undefined;
    });
    gCopy.edges.forEach((ed) => {
      ed.highlight = ed.id === edgeId ? 'orange' : undefined;
    });
    return {
      [graphCompId]: { kind: 'graph', data: gCopy },
      [stackCompId]: { kind: 'linear', data: { items: [...callStack], direction: 'vertical', caption: 'DFS Stack' } },
    };
  };

  function dfs(u: string, viaEdge?: string) {
    vis.add(u);
    callStack.push(`dfs(${u})`);
    order.push(u);
    steps.push(makeStep(idx++, `进入 dfs(${u})`, `标记节点 ${u} 已访问并压入递归栈。`, [5, 6], snap(u, viaEdge), [{ name: 'u', value: u, changed: true }, { name: 'order', value: order.join(' → ') }], [makeEvt(idx, 'visit', `访问 ${u}`)]));
    for (const { to: v, edgeId } of adj.get(u) ?? []) {
      if (!vis.has(v)) dfs(v, edgeId);
    }
    callStack.pop();
    steps.push(makeStep(idx++, `回溯离开 dfs(${u})`, `节点 ${u} 所有邻接分支已遍历完毕，出栈回溯。`, [10], snap(), [{ name: 'backtrack', value: u, changed: true }], [makeEvt(idx, 'pop', `回溯 ${u}`)]));
  }

  dfs(start);
  return steps;
}

export function runBacktrackingPermutations(nInput: number, treeCompId: string): AlgoStep[] {
  const n = Math.max(2, Math.min(3, nInput));
  const nodes: AlgoTreeNode[] = [{ id: 'root', label: '[]', children: [] }];
  const steps: AlgoStep[] = [];
  let idx = 0;

  const snap = (hl: Record<string, HighlightColor>): Record<string, AlgoComponentPayload> => ({
    [treeCompId]: { kind: 'tree', data: { nodes: clonePayload(nodes), rootId: 'root', highlightedNodeIds: hl } },
  });

  steps.push(makeStep(idx++, '初始化回溯搜索树根节点', `生成 1..${n} 的全排列搜索树。`, [4], snap({ root: 'blue' }), [{ name: 'path', value: '[]' }], [makeEvt(0, 'assign', '根状态 []')]));

  const used = new Set<number>();
  const path: number[] = [];

  function backtrack(parentId: string) {
    if (path.length === n) {
      steps.push(makeStep(idx++, `找到合法排列 [${path.join(',')}]`, '达到叶子深度 n，记录一组完整解。', [6], snap({ [parentId]: 'green' }), [{ name: 'solution', value: `[${path.join(',')}]`, changed: true }], [makeEvt(idx, 'done', `叶子解 [${path.join(',')}]`)]));
      return;
    }
    for (let x = 1; x <= n; x++) {
      if (used.has(x)) continue;
      used.add(x);
      path.push(x);
      const nid = `n-${path.join('-')}`;
      nodes.push({ id: nid, label: `[${path.join(',')}]`, children: [] });
      nodes.find((nd) => nd.id === parentId)?.children?.push(nid);
      steps.push(makeStep(idx++, `选择数字 ${x}`, `向状态 [${path.join(',')}] 递归深入。`, [9, 10], snap({ [nid]: 'blue' }), [{ name: 'path', value: `[${path.join(',')}]`, changed: true }], [makeEvt(idx, 'push', `选择 ${x}`)]));
      backtrack(nid);
      path.pop();
      used.delete(x);
    }
  }

  backtrack('root');
  return steps;
}

export function runUnionFind(n: number, ops: Array<[number, number]>, dsuCompId: string): AlgoStep[] {
  const size = Math.max(3, Math.min(8, n));
  const parent = Array.from({ length: size }, (_, i) => i);
  const steps: AlgoStep[] = [];
  let idx = 0;

  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));

  steps.push(makeStep(idx++, '初始化并查集', `每个元素自成一个集合：fa[i] = i。`, [4], {
    [dsuCompId]: { kind: 'dsu', data: { parent: [...parent] } },
  }, [{ name: 'sets', value: String(size) }], [makeEvt(0, 'assign', 'fa[i]=i')]));

  for (const [u, v] of ops) {
    if (u >= size || v >= size || u < 0 || v < 0) continue;
    const ru = find(u);
    const rv = find(v);
    if (ru !== rv) {
      parent[ru] = rv;
    }
    steps.push(
      makeStep(
        idx++,
        `合并 Union(${u}, ${v})`,
        ru === rv ? `${u} 与 ${v} 已在同一集合 (root=${ru})。` : `将根 ${ru} 挂载到 ${rv} 下完成合并。`,
        [8, 9],
        {
          [dsuCompId]: {
            kind: 'dsu',
            data: { parent: [...parent], highlightedNodes: { [u]: 'blue', [v]: 'green', [rv]: 'purple' } },
          },
        },
        [
          { name: 'u, v', value: `${u}, ${v}`, changed: true },
          { name: 'roots', value: `${ru} -> ${rv}`, changed: true },
        ],
        [makeEvt(idx, 'transition', `Union(${u}, ${v})`)]
      )
    );
  }
  return steps;
}

export function runTopologicalSort(graphInput: AlgoGraphData, graphCompId: string, queueCompId: string): { steps: AlgoStep[]; error?: string } {
  const v = validateGraphForAlgorithm(graphInput, 'topological-sort');
  if (!v.valid) return { steps: [], error: v.reason };

  const graph = clonePayload(graphInput);
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const nd of graph.nodes) {
    indeg.set(nd.id, 0);
    adj.set(nd.id, []);
  }
  for (const e of graph.edges) {
    adj.get(e.from)?.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  const q: string[] = [];
  for (const nd of graph.nodes) {
    if ((indeg.get(nd.id) ?? 0) === 0) q.push(nd.id);
  }

  const order: string[] = [];
  const steps: AlgoStep[] = [];
  let idx = 0;

  const snap = (active?: string): Record<string, AlgoComponentPayload> => {
    const gCopy = clonePayload(graph);
    gCopy.nodes.forEach((nd) => {
      nd.weight = `in=${indeg.get(nd.id) ?? 0}`;
      nd.highlight = nd.id === active ? 'blue' : order.includes(nd.id) ? 'green' : q.includes(nd.id) ? 'yellow' : undefined;
    });
    return {
      [graphCompId]: { kind: 'graph', data: gCopy },
      [queueCompId]: { kind: 'linear', data: { items: [...q], direction: 'horizontal', caption: 'InDeg=0 Queue' } },
    };
  };

  steps.push(makeStep(idx++, '统计所有节点入度，入度为 0 者入队', `初始队列：[${q.join(', ')}]。`, [6, 7], snap(), [{ name: 'queue', value: `[${q.join(', ')}]`, changed: true }], [makeEvt(0, 'push', '初始化入度为0队列')]));

  while (q.length > 0) {
    const u = q.shift()!;
    order.push(u);
    for (const nxt of adj.get(u) ?? []) {
      const nextDeg = (indeg.get(nxt) ?? 0) - 1;
      indeg.set(nxt, nextDeg);
      if (nextDeg === 0) q.push(nxt);
    }
    steps.push(
      makeStep(
        idx++,
        `输出拓扑节点 ${u} 并消去出边`,
        `当前拓扑序：${order.join(' → ')}。`,
        [10, 11, 12],
        snap(u),
        [
          { name: 'u', value: u, changed: true },
          { name: 'order', value: order.join(' → '), changed: true },
        ],
        [makeEvt(idx, 'pop', `拓扑输出 ${u}`)]
      )
    );
  }
  return { steps };
}

export function runKruskal(graphInput: AlgoGraphData, graphCompId: string): AlgoStep[] {
  const graph = clonePayload(graphInput);
  const sortedEdges = [...graph.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));
  const parent = new Map<string, string>(graph.nodes.map((n) => [n.id, n.id]));
  const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));

  const chosen = new Set<string>();
  const steps: AlgoStep[] = [];
  let mstWeight = 0;
  let idx = 0;

  const snap = (testingId?: string, testingColor?: HighlightColor): Record<string, AlgoComponentPayload> => {
    const gCopy = clonePayload(graph);
    gCopy.edges.forEach((ed) => {
      if (ed.id === testingId && testingColor) ed.highlight = testingColor;
      else if (chosen.has(ed.id)) ed.highlight = 'green';
      else ed.highlight = undefined;
    });
    return { [graphCompId]: { kind: 'graph', data: gCopy } };
  };

  steps.push(makeStep(idx++, '将所有边按边权升序排列', `共有 ${sortedEdges.length} 条候选边，准备按 Kruskal 贪心加边。`, [5], snap(), [{ name: 'mst_weight', value: '0' }], [makeEvt(0, 'assign', '边权升序排序')]));

  for (const e of sortedEdges) {
    const ru = find(e.from);
    const rv = find(e.to);
    if (ru !== rv) {
      parent.set(ru, rv);
      chosen.add(e.id);
      mstWeight += e.weight ?? 1;
      steps.push(makeStep(idx++, `选取边 ${e.from}–${e.to} (w=${e.weight ?? 1})`, `两端点不连通，加入最小生成树，累计权值 = ${mstWeight}。`, [8, 9], snap(e.id, 'green'), [{ name: 'edge', value: `${e.from}-${e.to}`, changed: true }, { name: 'mst_weight', value: String(mstWeight), changed: true }], [makeEvt(idx, 'select', `选取边 ${e.from}-${e.to}`)]));
    } else {
      steps.push(makeStep(idx++, `跳过边 ${e.from}–${e.to}（成环）`, `${e.from} 与 ${e.to} 已连通，加入会形成环，舍弃。`, [7], snap(e.id, 'red'), [{ name: 'skip', value: `${e.from}-${e.to}`, changed: true }], [makeEvt(idx, 'compare', `跳过成环边 ${e.from}-${e.to}`)]));
    }
  }
  return steps;
}

export function runPrim(graphInput: AlgoGraphData, startId: string, graphCompId: string): AlgoStep[] {
  const graph = clonePayload(graphInput);
  const start = graph.nodes.find((n) => n.id === startId)?.id || graph.nodes[0]?.id;
  if (!start) return [];
  const inTree = new Set<string>([start]);
  const chosenEdges = new Set<string>();
  const steps: AlgoStep[] = [];
  let total = 0;
  let idx = 0;

  const snap = (): Record<string, AlgoComponentPayload> => {
    const gCopy = clonePayload(graph);
    gCopy.nodes.forEach((n) => {
      n.highlight = inTree.has(n.id) ? 'green' : undefined;
    });
    gCopy.edges.forEach((e) => {
      e.highlight = chosenEdges.has(e.id) ? 'green' : undefined;
    });
    return { [graphCompId]: { kind: 'graph', data: gCopy } };
  };

  steps.push(makeStep(idx++, `Prim 从起点 ${start} 出发`, `将 ${start} 加入生成树集合。`, [5], snap(), [{ name: 'total', value: '0' }], [makeEvt(0, 'assign', `起点 ${start}`)]));

  while (inTree.size < graph.nodes.length) {
    let bestEdge = null as AlgoGraphData['edges'][number] | null;
    let targetNode = '';
    for (const e of graph.edges) {
      const uIn = inTree.has(e.from);
      const vIn = inTree.has(e.to);
      if (uIn !== vIn) {
        if (!bestEdge || (e.weight ?? 1) < (bestEdge.weight ?? 1)) {
          bestEdge = e;
          targetNode = uIn ? e.to : e.from;
        }
      }
    }
    if (!bestEdge) break;
    inTree.add(targetNode);
    chosenEdges.add(bestEdge.id);
    total += bestEdge.weight ?? 1;
    steps.push(makeStep(idx++, `扩展最小割边连接节点 ${targetNode}`, `选取权值 ${bestEdge.weight ?? 1} 的边，累计权值 ${total}。`, [10, 11], snap(), [{ name: 'added', value: targetNode, changed: true }, { name: 'total', value: String(total), changed: true }], [makeEvt(idx, 'select', `加入 ${targetNode}`)]));
  }
  return steps;
}

export function runFloydWarshall(graphInput: AlgoGraphData, matrixCompId: string): AlgoStep[] {
  const n = graphInput.nodes.length;
  const idxMap = new Map(graphInput.nodes.map((nd, i) => [nd.id, i]));
  const INF = 999999;
  const dist: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : INF))
  );
  for (const e of graphInput.edges) {
    const u = idxMap.get(e.from);
    const v = idxMap.get(e.to);
    if (u === undefined || v === undefined) continue;
    const w = e.weight ?? 1;
    dist[u][v] = Math.min(dist[u][v], w);
    if (!e.directed) dist[v][u] = Math.min(dist[v][u], w);
  }

  const fmt = () => dist.map((r) => r.map((v) => (v >= INF / 2 ? '∞' : v)));
  const labels = graphInput.nodes.map((nd) => nd.label);
  const steps: AlgoStep[] = [];
  let idx = 0;

  steps.push(makeStep(idx++, '初始化全源距离矩阵', '直连边赋边权，其余设为 ∞。', [4], {
    [matrixCompId]: { kind: 'matrix', data: { rows: fmt(), rowLabels: labels, colLabels: labels } },
  }, [{ name: 'k', value: '-' }], [makeEvt(0, 'assign', '初始化邻接矩阵')]));

  for (let k = 0; k < n; k++) {
    const hl: Record<string, HighlightColor> = {};
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          hl[`${i},${j}`] = 'green';
        }
      }
    }
    steps.push(
      makeStep(
        idx++,
        `以节点 ${labels[k]} 作为中转点松弛`,
        `更新所有经过 ${labels[k]} 更短的点对距离。`,
        [7, 8, 9],
        { [matrixCompId]: { kind: 'matrix', data: { rows: fmt(), rowLabels: labels, colLabels: labels, highlightedCells: hl } } },
        [{ name: 'k', value: labels[k], changed: true }],
        [makeEvt(idx, 'relax', `完成中转点 k=${labels[k]}`)],
        {},
        `d[i][j] = \\min(d[i][j],\\; d[i][${labels[k]}] + d[${labels[k]}][j])`
      )
    );
  }
  return steps;
}

export function runKnapsackUnbounded(capacity: number, weights: number[], values: number[], dpCompId: string): AlgoStep[] {
  const n = Math.min(weights.length, values.length);
  const C = Math.max(1, Math.min(14, capacity));
  const dp = Array(C + 1).fill(0);
  const steps: AlgoStep[] = [];
  let idx = 0;

  const snap = (hl: Record<string, HighlightColor>): AlgoComponentPayload => ({
    kind: 'dp',
    data: {
      variant: '1d',
      rows: [[...dp]],
      rowLabels: ['dp'],
      colLabels: Array.from({ length: C + 1 }, (_, j) => String(j)),
      formula: 'dp[j] = \\max(dp[j],\\; dp[j - w_i] + v_i)',
      highlightedCells: hl,
    },
  });

  steps.push(makeStep(idx++, '初始化完全背包一维数组', `容量 C=${C}，所有状态初始为 0。`, [4], { [dpCompId]: snap({}) }, [{ name: 'C', value: String(C) }], [makeEvt(0, 'assign', '初始化 dp[0..C]=0')]));

  for (let i = 0; i < n; i++) {
    const w = weights[i];
    const v = values[i];
    for (let j = w; j <= C; j++) {
      const cand = dp[j - w] + v;
      if (cand > dp[j]) dp[j] = cand;
      steps.push(
        makeStep(
          idx++,
          `正序更新物品 #${i + 1}: dp[${j}]`,
          `完全背包内层正序枚举 j=${j}，允许重复选取当前物品，dp[${j}] = ${dp[j]}。`,
          [7, 8],
          { [dpCompId]: snap({ [`0,${j}`]: 'green', [`0,${j - w}`]: 'purple' }) },
          [
            { name: 'item', value: `#${i + 1} (w=${w},v=${v})` },
            { name: 'j', value: String(j), changed: true },
            { name: `dp[${j}]`, value: String(dp[j]), changed: true },
          ],
          [makeEvt(idx, 'transition', `dp[${j}] = ${dp[j]}`)]
        )
      );
    }
  }
  return steps;
}

export function runLIS(inputArr: number[], arrCompId: string, dpCompId: string): AlgoStep[] {
  const n = inputArr.length;
  const dp = Array(n).fill(1);
  const steps: AlgoStep[] = [];
  let idx = 0;

  const snap = (arrHl: Record<number, HighlightColor>, dpHl: Record<string, HighlightColor>): Record<string, AlgoComponentPayload> => ({
    [arrCompId]: { kind: 'array', data: { items: inputArr, indices: true, highlightedIndices: arrHl } },
    [dpCompId]: { kind: 'dp', data: { variant: '1d', rows: [[...dp]], rowLabels: ['dp'], colLabels: inputArr.map((_, i) => String(i)), highlightedCells: dpHl, formula: 'dp[i] = \\max_{j<i, a_j < a_i}(dp[j] + 1)' } },
  });

  steps.push(makeStep(idx++, '初始化每个元素单独构成长度 1 的序列', 'dp[i] 全部初始化为 1。', [4], snap({}, {}), [{ name: 'maxLen', value: '1' }], [makeEvt(0, 'assign', 'dp[0..n-1]=1')]));

  let best = 1;
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (inputArr[j] < inputArr[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        best = Math.max(best, dp[i]);
        steps.push(
          makeStep(
            idx++,
            `状态转移：a[${j}](${inputArr[j]}) < a[${i}](${inputArr[i]})`,
            `更新 dp[${i}] = dp[${j}] + 1 = ${dp[i]}。`,
            [7, 8],
            snap({ [j]: 'purple', [i]: 'green' }, { [`0,${j}`]: 'purple', [`0,${i}`]: 'green' }),
            [
              { name: 'i, j', value: `${i}, ${j}`, changed: true },
              { name: `dp[${i}]`, value: String(dp[i]), changed: true },
              { name: 'best', value: String(best), changed: true },
            ],
            [makeEvt(idx, 'transition', `dp[${i}] = ${dp[i]}`)]
          )
        );
      }
    }
  }
  return steps;
}

export function runIntervalDP(stones: number[], dpCompId: string): AlgoStep[] {
  const n = Math.min(6, stones.length);
  const a = stones.slice(0, n);
  const pref = [0];
  for (let i = 0; i < n; i++) pref.push(pref[i] + a[i]);
  const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const labels = a.map((v, i) => `${i + 1}(${v})`);
  const steps: AlgoStep[] = [];
  let idx = 0;

  const snap = (hl: Record<string, HighlightColor>): AlgoComponentPayload => ({
    kind: 'dp',
    data: {
      variant: 'interval',
      rows: dp.map((r) => [...r]),
      rowLabels: labels,
      colLabels: labels,
      formula: 'dp[l][r] = \\min_{k=l}^{r-1}(dp[l][k] + dp[k+1][r]) + \\sum_{t=l}^{r} a_t',
      highlightedCells: hl,
    },
  });

  steps.push(makeStep(idx++, '初始化区间长度为 1 的石子代价为 0', '单个石子堆无需合并，dp[i][i] = 0。', [4], { [dpCompId]: snap({}) }, [{ name: 'n', value: String(n) }], [makeEvt(0, 'assign', 'dp[i][i]=0')]));

  for (let len = 2; len <= n; len++) {
    for (let l = 0; l + len - 1 < n; l++) {
      const r = l + len - 1;
      const sumLR = pref[r + 1] - pref[l];
      dp[l][r] = Infinity;
      for (let k = l; k < r; k++) {
        dp[l][r] = Math.min(dp[l][r], dp[l][k] + dp[k + 1][r] + sumLR);
      }
      steps.push(
        makeStep(
          idx++,
          `合并区间 [${l + 1}, ${r + 1}] (len=${len})`,
          `区间总和 ${sumLR}，最优合并代价 dp[${l + 1}][${r + 1}] = ${dp[l][r]}。`,
          [8, 9, 10],
          { [dpCompId]: snap({ [`${l},${r}`]: 'green' }) },
          [
            { name: 'len', value: String(len) },
            { name: '[l, r]', value: `[${l + 1}, ${r + 1}]`, changed: true },
            { name: `dp[l][r]`, value: String(dp[l][r]), changed: true },
          ],
          [makeEvt(idx, 'transition', `dp[${l + 1}][${r + 1}] = ${dp[l][r]}`)]
        )
      );
    }
  }
  return steps;
}

export function runFenwickTree(inputArr: number[], compArrId: string, compBitId: string): AlgoStep[] {
  const n = Math.min(8, inputArr.length);
  const a = inputArr.slice(0, n);
  const bit = Array(n + 1).fill(0);
  const steps: AlgoStep[] = [];
  let idx = 0;

  const snap = (hlBit: Record<number, HighlightColor>): Record<string, AlgoComponentPayload> => ({
    [compArrId]: { kind: 'array', data: { items: a, indices: true } },
    [compBitId]: { kind: 'array', data: { items: bit, indices: true, highlightedIndices: hlBit } },
  });

  steps.push(makeStep(idx++, '初始化树状数组 C[1..n] = 0', '树状数组下标从 1 开始，利用 lowbit(x) = x & -x 跳跃维护前缀信息。', [4], snap({}), [{ name: 'n', value: String(n) }], [makeEvt(0, 'assign', 'C[1..n]=0')]));

  for (let i = 1; i <= n; i++) {
    const touched: Record<number, HighlightColor> = {};
    for (let x = i; x <= n; x += x & -x) {
      bit[x] += a[i - 1];
      touched[x] = x === i ? 'blue' : 'green';
    }
    steps.push(
      makeStep(
        idx++,
        `单点累加 add(${i}, ${a[i - 1]})`,
        `沿 lowbit 路径更新树状数组节点：${Object.keys(touched).join(', ')}。`,
        [7, 8],
        snap(touched),
        [
          { name: 'pos', value: String(i), changed: true },
          { name: 'val', value: String(a[i - 1]), changed: true },
        ],
        [makeEvt(idx, 'transition', `add(${i}, ${a[i - 1]})`)]
      )
    );
  }
  return steps;
}

export function runSegmentTree(inputArr: number[], treeCompId: string): AlgoStep[] {
  const n = Math.min(8, inputArr.length);
  const a = inputArr.slice(0, n);
  const nodes: AlgoTreeNode[] = [];
  const steps: AlgoStep[] = [];
  let idx = 0;

  function build(p: number, l: number, r: number): number {
    const id = `seg-${p}`;
    if (l === r) {
      nodes.push({ id, label: String(a[l]), range: [l + 1, r + 1] });
      return a[l];
    }
    const mid = (l + r) >> 1;
    const leftId = `seg-${p * 2}`;
    const rightId = `seg-${p * 2 + 1}`;
    const sumL = build(p * 2, l, mid);
    const sumR = build(p * 2 + 1, mid + 1, r);
    const total = sumL + sumR;
    nodes.push({ id, label: String(total), left: leftId, right: rightId, range: [l + 1, r + 1] });
    return total;
  }

  build(1, 0, n - 1);
  nodes.sort((x, y) => Number(x.id.slice(4)) - Number(y.id.slice(4)));

  const treeData: AlgoTreeData = { nodes, rootId: 'seg-1' };
  steps.push(makeStep(idx++, '递归建树 Build(1, 1, n)', `自底向上合并区间和，根节点 [1,${n}] 总和为 ${nodes[0]?.label}。`, [6, 7, 8], {
    [treeCompId]: { kind: 'tree', data: treeData },
  }, [{ name: 'root_sum', value: String(nodes[0]?.label ?? 0), changed: true }], [makeEvt(0, 'done', '线段树建树完成')]));

  // Simulate a range query [1, Math.max(1, Math.floor(n/2))]
  const qr = Math.max(1, Math.floor(n / 2));
  const hl: Record<string, HighlightColor> = {};
  let ans = 0;
  function query(p: number, l: number, r: number) {
    const id = `seg-${p}`;
    if (1 <= l && r <= qr) {
      hl[id] = 'green';
      ans += Number(nodes.find((nd) => nd.id === id)?.label ?? 0);
      return;
    }
    hl[id] = 'blue';
    const mid = (l + r) >> 1;
    if (1 <= mid) query(p * 2, l, mid);
    if (qr > mid) query(p * 2 + 1, mid + 1, r);
  }
  query(1, 1, n);
  steps.push(makeStep(idx++, `区间查询 Query(1, ${qr})`, `绿色节点直接返回区间和，蓝色节点继续向下拆分区间，查询结果 = ${ans}。`, [12, 13], {
    [treeCompId]: { kind: 'tree', data: { ...treeData, highlightedNodeIds: hl } },
  }, [{ name: `sum[1..${qr}]`, value: String(ans), changed: true }], [makeEvt(1, 'select', `区间查询结果 ${ans}`)]));

  return steps;
}
