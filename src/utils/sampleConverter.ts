import {
  AlgoArrayData,
  AlgoDpData,
  AlgoGraphData,
  AlgoMatrixData,
  AlgoTreeData,
} from '../types/algorithmStudio';

export function parseNumberArrayInput(text: string): number[] {
  const nums = text
    .trim()
    .split(/[\s,，;；]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  return nums;
}

export function arrayDataToCompetitionInput(data: AlgoArrayData): string {
  return `${data.items.length}\n${data.items.join(' ')}`;
}

export function competitionInputToArrayData(text: string): AlgoArrayData {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    const firstNums = parseNumberArrayInput(lines[0]);
    const restNums = parseNumberArrayInput(lines.slice(1).join(' '));
    if (firstNums.length === 1 && firstNums[0] === restNums.length) {
      return { items: restNums, indices: true };
    }
  }
  const all = parseNumberArrayInput(text);
  return { items: all.length > 0 ? all : [5, 2, 9, 1, 5, 6], indices: true };
}

export function matrixDataToCompetitionInput(data: AlgoMatrixData): string {
  const r = data.rows.length;
  const c = data.rows[0]?.length ?? 0;
  return `${r} ${c}\n${data.rows.map((row) => row.join(' ')).join('\n')}`;
}

export function competitionInputToMatrixData(text: string, customDelimiter?: string): AlgoMatrixData {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [[1, 2], [3, 4]] };

  const sep = customDelimiter ? new RegExp(`[${customDelimiter}\\s]+`) : /[\s,]+/;
  const firstTokens = lines[0].split(sep).filter(Boolean);
  let startLine = 0;
  if (
    lines.length > 1 &&
    firstTokens.length === 2 &&
    Number(firstTokens[0]) === lines.length - 1
  ) {
    startLine = 1;
  }

  const rows = lines.slice(startLine).map((line) =>
    line
      .split(sep)
      .filter(Boolean)
      .map((v) => {
        const n = Number(v);
        return Number.isFinite(n) && v !== '' ? n : v;
      })
  );
  return { rows: rows.length > 0 ? rows : [[0]] };
}

export function stringToArrayData(text: string): AlgoArrayData {
  const chars = text.trim().split('');
  return { items: chars.length > 0 ? chars : ['A', 'B', 'A', 'B', 'C'], indices: true };
}

export function dpKnapsackToCompetitionInput(
  capacity: number,
  weights: number[],
  values: number[]
): string {
  const n = Math.min(weights.length, values.length);
  const lines = [`${n} ${capacity}`];
  for (let i = 0; i < n; i++) {
    lines.push(`${weights[i]} ${values[i]}`);
  }
  return lines.join('\n');
}

export function competitionInputToKnapsack(text: string): {
  capacity: number;
  weights: number[];
  values: number[];
} {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { capacity: 7, weights: [2, 3, 4, 5], values: [3, 4, 5, 8] };
  }
  const header = parseNumberArrayInput(lines[0]);
  const n = header[0] || lines.length - 1;
  const capacity = header[1] ?? 7;
  const weights: number[] = [];
  const values: number[] = [];
  for (let i = 1; i <= Math.min(n, lines.length - 1); i++) {
    const pair = parseNumberArrayInput(lines[i]);
    if (pair.length >= 2) {
      weights.push(Math.max(1, pair[0]));
      values.push(pair[1]);
    }
  }
  return weights.length > 0
    ? { capacity: Math.max(1, Math.min(20, capacity)), weights, values }
    : { capacity: 7, weights: [2, 3, 4, 5], values: [3, 4, 5, 8] };
}

export function treeDataToCompetitionInput(data: AlgoTreeData): string {
  const lines: string[] = [`${data.nodes.length}`];
  for (const n of data.nodes) {
    if (n.left) lines.push(`${n.label} ${n.left} L`);
    if (n.right) lines.push(`${n.label} ${n.right} R`);
    if (n.children) {
      for (const ch of n.children) {
        lines.push(`${n.label} ${ch}`);
      }
    }
  }
  return lines.join('\n');
}

export function dpDataToMatrixText(data: AlgoDpData): string {
  return data.rows.map((r) => r.join(' ')).join('\n');
}

export function graphDataToCompetitionInput(graph: AlgoGraphData): string {
  const idToIdx = new Map(graph.nodes.map((n, i) => [n.id, i + 1]));
  const lines = [`${graph.nodes.length} ${graph.edges.length}`];
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
