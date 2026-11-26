import {
  AlgoGraphData,
  AlgoGraphEdge,
  AlgoGraphNode,
  GraphLayoutType,
} from '../types/algorithmStudio';

export type GraphTextFormat = 'oi' | 'edgelist' | 'adjlist' | 'matrix';

export function applyGraphLayout(
  graph: AlgoGraphData,
  layout: GraphLayoutType,
  width = 480,
  height = 300
): AlgoGraphData {
  const n = graph.nodes.length;
  if (n === 0 || layout === 'manual') {
    return { ...graph, layout };
  }

  const pad = 48;
  const cx = width / 2;
  const cy = height / 2;
  const nodes: AlgoGraphNode[] = graph.nodes.map((node) => ({ ...node }));

  if (layout === 'circular') {
    const r = Math.max(60, Math.min(width, height) / 2 - pad);
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      node.x = Math.round(cx + r * Math.cos(angle));
      node.y = Math.round(cy + r * Math.sin(angle));
    });
    return { ...graph, nodes, layout };
  }

  if (layout === 'hierarchical' || layout === 'tree') {
    const indeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const nd of nodes) {
      indeg.set(nd.id, 0);
      adj.set(nd.id, []);
    }
    for (const e of graph.edges) {
      if (e.from === e.to) continue;
      adj.get(e.from)?.push(e.to);
      indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
      if (!e.directed) {
        adj.get(e.to)?.push(e.from);
      }
    }

    const level = new Map<string, number>();
    const queue: string[] = [];
    if (layout === 'hierarchical') {
      for (const nd of nodes) {
        if ((indeg.get(nd.id) ?? 0) === 0) {
          level.set(nd.id, 0);
          queue.push(nd.id);
        }
      }
    }
    if (queue.length === 0) {
      level.set(nodes[0].id, 0);
      queue.push(nodes[0].id);
    }

    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      const lu = level.get(u) ?? 0;
      for (const v of adj.get(u) ?? []) {
        if (!level.has(v)) {
          level.set(v, lu + 1);
          queue.push(v);
        }
      }
    }
    for (const nd of nodes) {
      if (!level.has(nd.id)) level.set(nd.id, 0);
    }

    const buckets = new Map<number, AlgoGraphNode[]>();
    let maxLayer = 0;
    for (const nd of nodes) {
      const l = level.get(nd.id) ?? 0;
      maxLayer = Math.max(maxLayer, l);
      const list = buckets.get(l) ?? [];
      list.push(nd);
      buckets.set(l, list);
    }

    const layerCount = maxLayer + 1;
    for (const [l, list] of buckets.entries()) {
      const y =
        layerCount === 1
          ? cy
          : pad + (l * (height - pad * 2)) / (layerCount - 1);
      list.forEach((nd, idx) => {
        const x =
          list.length === 1
            ? cx
            : pad + (idx * (width - pad * 2)) / (list.length - 1);
        nd.x = Math.round(x);
        nd.y = Math.round(y);
        nd.layer = l;
      });
    }
    return { ...graph, nodes, layout };
  }

  // Force-directed (Fruchterman-Reingold deterministic pass)
  const rInit = Math.max(55, Math.min(width, height) / 2 - pad);
  nodes.forEach((nd, i) => {
    const angle = (2 * Math.PI * i) / n;
    nd.x = cx + rInit * Math.cos(angle);
    nd.y = cy + rInit * Math.sin(angle);
  });

  const area = (width - pad * 2) * (height - pad * 2);
  const k = Math.sqrt(area / Math.max(1, n));
  const nodeMap = new Map(nodes.map((nd) => [nd.id, nd]));
  const disp = new Map<string, { dx: number; dy: number }>();

  for (let iter = 0; iter < 80; iter++) {
    for (const nd of nodes) disp.set(nd.id, { dx: 0, dy: 0 });

    // Repulsive forces
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const u = nodes[i];
        const v = nodes[j];
        const dx = u.x - v.x;
        const dy = u.y - v.y;
        const dist = Math.max(0.01, Math.hypot(dx, dy));
        const force = (k * k) / dist;
        const ux = (dx / dist) * force;
        const uy = (dy / dist) * force;
        disp.get(u.id)!.dx += ux;
        disp.get(u.id)!.dy += uy;
        disp.get(v.id)!.dx -= ux;
        disp.get(v.id)!.dy -= uy;
      }
    }

    // Attractive forces along edges
    for (const e of graph.edges) {
      const u = nodeMap.get(e.from);
      const v = nodeMap.get(e.to);
      if (!u || !v || u.id === v.id) continue;
      const dx = u.x - v.x;
      const dy = u.y - v.y;
      const dist = Math.max(0.01, Math.hypot(dx, dy));
      const force = (dist * dist) / k;
      const ux = (dx / dist) * force;
      const uy = (dy / dist) * force;
      disp.get(u.id)!.dx -= ux;
      disp.get(u.id)!.dy -= uy;
      disp.get(v.id)!.dx += ux;
      disp.get(v.id)!.dy += uy;
    }

    const temp = Math.max(2, (width / 10) * (1 - iter / 80));
    for (const nd of nodes) {
      const d = disp.get(nd.id)!;
      const len = Math.max(0.01, Math.hypot(d.dx, d.dy));
      nd.x += (d.dx / len) * Math.min(len, temp);
      nd.y += (d.dy / len) * Math.min(len, temp);
      nd.x = Math.round(Math.max(pad, Math.min(width - pad, nd.x)));
      nd.y = Math.round(Math.max(pad, Math.min(height - pad, nd.y)));
    }
  }

  return { ...graph, nodes, layout };
}

export function validateGraphForAlgorithm(
  graph: AlgoGraphData,
  algoId: string
): { valid: boolean; reason?: string } {
  if (graph.nodes.length === 0) {
    return { valid: false, reason: '图中至少需要 1 个节点' };
  }

  if (algoId === 'dijkstra') {
    const negEdge = graph.edges.find((e) => (e.weight ?? 1) < 0);
    if (negEdge) {
      return {
        valid: false,
        reason: `Dijkstra 算法不允许负权边（发现边 ${negEdge.from} → ${negEdge.to} 权值为 ${negEdge.weight}）`,
      };
    }
  }

  if (algoId === 'topological-sort') {
    const undirected = graph.edges.find((e) => !e.directed);
    if (undirected) {
      return {
        valid: false,
        reason: '拓扑排序仅适用于有向无环图 (DAG)，请将边设置为有向边',
      };
    }
    // Check directed cycle via Kahn's algorithm
    const indeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const nd of graph.nodes) {
      indeg.set(nd.id, 0);
      adj.set(nd.id, []);
    }
    for (const e of graph.edges) {
      if (e.from === e.to) {
        return { valid: false, reason: `检测到自环 ${e.from} → ${e.to}，有向环无法拓扑排序` };
      }
      adj.get(e.from)?.push(e.to);
      indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    }
    const q: string[] = [];
    for (const [id, deg] of indeg.entries()) {
      if (deg === 0) q.push(id);
    }
    let visited = 0;
    while (q.length > 0) {
      const u = q.shift()!;
      visited++;
      for (const v of adj.get(u) ?? []) {
        const nextDeg = (indeg.get(v) ?? 0) - 1;
        indeg.set(v, nextDeg);
        if (nextDeg === 0) q.push(v);
      }
    }
    if (visited < graph.nodes.length) {
      return {
        valid: false,
        reason: '检测到有向环！拓扑排序要求图必须是有向无环图 (DAG)',
      };
    }
  }

  return { valid: true };
}

export function exportGraphToText(graph: AlgoGraphData, format: GraphTextFormat): string {
  const idToIdx = new Map(graph.nodes.map((n, i) => [n.id, i + 1]));
  const n = graph.nodes.length;
  const m = graph.edges.length;

  if (format === 'oi') {
    const lines = [`${n} ${m}`];
    for (const e of graph.edges) {
      const u = idToIdx.get(e.from) ?? e.from;
      const v = idToIdx.get(e.to) ?? e.to;
      if (graph.variant === 'network-flow' && e.capacity !== undefined) {
        lines.push(`${u} ${v} ${e.capacity}`);
      } else if (e.weight !== undefined) {
        lines.push(`${u} ${v} ${e.weight}`);
      } else {
        lines.push(`${u} ${v}`);
      }
    }
    return lines.join('\n');
  }

  if (format === 'edgelist') {
    return graph.edges
      .map((e) => {
        const u = idToIdx.get(e.from) ?? e.from;
        const v = idToIdx.get(e.to) ?? e.to;
        return e.weight !== undefined ? `${u} ${v} ${e.weight}` : `${u} ${v}`;
      })
      .join('\n');
  }

  if (format === 'adjlist') {
    const adj = new Map<string, string[]>();
    for (const nd of graph.nodes) adj.set(nd.id, []);
    for (const e of graph.edges) {
      const vLabel = idToIdx.get(e.to) ?? e.to;
      const wStr = e.weight !== undefined ? `(${e.weight})` : '';
      adj.get(e.from)?.push(`${vLabel}${wStr}`);
      if (!e.directed && e.from !== e.to) {
        const uLabel = idToIdx.get(e.from) ?? e.from;
        adj.get(e.to)?.push(`${uLabel}${wStr}`);
      }
    }
    return graph.nodes
      .map((nd) => `${idToIdx.get(nd.id)}: ${(adj.get(nd.id) ?? []).join(' ')}`)
      .join('\n');
  }

  // Adjacency Matrix
  const mat: string[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? '0' : 'INF'))
  );
  const idxMap = new Map(graph.nodes.map((nd, i) => [nd.id, i]));
  for (const e of graph.edges) {
    const u = idxMap.get(e.from);
    const v = idxMap.get(e.to);
    if (u === undefined || v === undefined) continue;
    const val = String(e.weight ?? 1);
    mat[u][v] = val;
    if (!e.directed) mat[v][u] = val;
  }
  return mat.map((row) => row.join(' ')).join('\n');
}

export function parseTextToGraph(
  text: string,
  format: GraphTextFormat,
  directed: boolean,
  weighted: boolean
): AlgoGraphData {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const nodeSet = new Set<string>();
  const rawEdges: Array<{ u: string; v: string; w?: number }> = [];

  if (format === 'matrix') {
    const n = lines.length;
    for (let i = 1; i <= n; i++) nodeSet.add(String(i));
    lines.forEach((line, r) => {
      const cols = line.split(/\s+/);
      cols.forEach((tok, c) => {
        if (r === c && (tok === '0' || tok === 'INF' || tok === '-')) return;
        if (!directed && c < r) return;
        if (tok !== 'INF' && tok !== 'inf' && tok !== '-' && tok !== '0') {
          const w = Number(tok);
          rawEdges.push({
            u: String(r + 1),
            v: String(c + 1),
            w: Number.isFinite(w) ? w : 1,
          });
        }
      });
    });
  } else if (format === 'adjlist') {
    for (const line of lines) {
      const [uPart, restPart = ''] = line.split(':');
      const u = uPart.trim();
      if (!u) continue;
      nodeSet.add(u);
      for (const tok of restPart.trim().split(/\s+/).filter(Boolean)) {
        const m = tok.match(/^([^\(]+)(?:\(([^)]+)\))?$/);
        if (m) {
          const v = m[1].trim();
          const w = m[2] !== undefined ? Number(m[2]) : undefined;
          nodeSet.add(v);
          rawEdges.push({ u, v, w: Number.isFinite(w) ? w : undefined });
        }
      }
    }
  } else {
    let startIdx = 0;
    if (format === 'oi' && lines.length > 0) {
      const head = lines[0].split(/\s+/).map(Number);
      if (head.length >= 2 && Number.isFinite(head[0])) {
        for (let i = 1; i <= Math.min(24, head[0]); i++) nodeSet.add(String(i));
        startIdx = 1;
      }
    }
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/);
      if (parts.length < 2) continue;
      const u = parts[0];
      const v = parts[1];
      const w = parts[2] !== undefined ? Number(parts[2]) : undefined;
      nodeSet.add(u);
      nodeSet.add(v);
      rawEdges.push({ u, v, w: Number.isFinite(w) ? w : weighted ? 1 : undefined });
    }
  }

  const sortedIds = Array.from(nodeSet).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });

  const nodes: AlgoGraphNode[] = sortedIds.map((id) => ({
    id,
    label: id,
    x: 100,
    y: 100,
  }));

  const edges: AlgoGraphEdge[] = rawEdges.map((re, idx) => ({
    id: `e-${idx + 1}`,
    from: re.u,
    to: re.v,
    weight: re.w,
    directed,
  }));

  return applyGraphLayout(
    {
      variant: directed ? (weighted ? 'weighted' : 'directed') : weighted ? 'weighted' : 'undirected',
      nodes,
      edges,
      allowMultiEdge: true,
      allowSelfLoop: true,
      layout: 'circular',
    },
    'circular'
  );
}
