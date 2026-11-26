import {
  AlgoCanvasItem,
  AlgoComponentPayload,
  AlgoComponentType,
  AlgorithmEvent,
  AlgoVariable,
} from '../types/algorithmStudio';
import {
  SemanticComponentKind,
  SemanticOperation,
  SemanticOperationResult,
} from '../types/algorithmDsl';
import { HighlightColor } from '../types/workspace';

export interface SemanticDescriptor {
  semanticType: SemanticComponentKind;
  defaultComponentType: AlgoComponentType;
  labelZh: string;
  labelEn: string;
  capabilities: Array<'read' | 'write' | 'highlight' | 'validate' | 'snapshot'>;
}

export const SEMANTIC_COMPONENT_REGISTRY: Record<SemanticComponentKind, SemanticDescriptor> = {
  SmartArray: {
    semanticType: 'SmartArray',
    defaultComponentType: 'array',
    labelZh: '智能数组 Smart Array',
    labelEn: 'Smart Array',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartMatrix: {
    semanticType: 'SmartMatrix',
    defaultComponentType: 'matrix',
    labelZh: '智能矩阵 Smart Matrix',
    labelEn: 'Smart Matrix',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartStack: {
    semanticType: 'SmartStack',
    defaultComponentType: 'stack',
    labelZh: '智能栈 Smart Stack',
    labelEn: 'Smart Stack',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartQueue: {
    semanticType: 'SmartQueue',
    defaultComponentType: 'queue',
    labelZh: '智能队列 Smart Queue',
    labelEn: 'Smart Queue',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartLinkedList: {
    semanticType: 'SmartLinkedList',
    defaultComponentType: 'linked-list',
    labelZh: '智能链表 Smart Linked List',
    labelEn: 'Smart Linked List',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartTree: {
    semanticType: 'SmartTree',
    defaultComponentType: 'binary-tree',
    labelZh: '智能树 Smart Tree',
    labelEn: 'Smart Tree',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartGraph: {
    semanticType: 'SmartGraph',
    defaultComponentType: 'graph',
    labelZh: '智能图 Smart Graph',
    labelEn: 'Smart Graph',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartDPTable: {
    semanticType: 'SmartDPTable',
    defaultComponentType: 'dp-2d',
    labelZh: '智能 DP 表 Smart DP Table',
    labelEn: 'Smart DP Table',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartRecursion: {
    semanticType: 'SmartRecursion',
    defaultComponentType: 'recursion-tree',
    labelZh: '智能递归树 Smart Recursion',
    labelEn: 'Smart Recursion',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartHeap: {
    semanticType: 'SmartHeap',
    defaultComponentType: 'heap',
    labelZh: '智能堆 Smart Heap',
    labelEn: 'Smart Heap',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartUnionFind: {
    semanticType: 'SmartUnionFind',
    defaultComponentType: 'dsu',
    labelZh: '智能并查集 Smart Union Find',
    labelEn: 'Smart Union Find',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartPointer: {
    semanticType: 'SmartPointer',
    defaultComponentType: 'number-line',
    labelZh: '智能指针/数轴 Smart Pointer',
    labelEn: 'Smart Pointer',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
  SmartVariable: {
    semanticType: 'SmartVariable',
    defaultComponentType: 'variable-watcher',
    labelZh: '智能变量监视 Smart Variable',
    labelEn: 'Smart Variable',
    capabilities: ['read', 'write', 'validate', 'snapshot'],
  },
  SmartFormula: {
    semanticType: 'SmartFormula',
    defaultComponentType: 'math-formula',
    labelZh: '智能公式 Smart Formula',
    labelEn: 'Smart Formula',
    capabilities: ['read', 'write', 'snapshot'],
  },
  SmartGrid: {
    semanticType: 'SmartGrid',
    defaultComponentType: 'grid2d',
    labelZh: '智能网格 Smart Grid',
    labelEn: 'Smart Grid',
    capabilities: ['read', 'write', 'highlight', 'validate', 'snapshot'],
  },
};

export function componentTypeToSemanticKind(type: AlgoComponentType): SemanticComponentKind {
  switch (type) {
    case 'array':
    case 'string':
    case 'fenwick-tree':
      return 'SmartArray';
    case 'matrix':
      return 'SmartMatrix';
    case 'grid2d':
      return 'SmartGrid';
    case 'stack':
    case 'monotonic-stack':
      return 'SmartStack';
    case 'queue':
    case 'deque':
    case 'monotonic-queue':
      return 'SmartQueue';
    case 'linked-list':
      return 'SmartLinkedList';
    case 'binary-tree':
    case 'general-tree':
    case 'trie':
    case 'segment-tree':
    case 'persistent-segtree':
    case 'balanced-tree':
      return 'SmartTree';
    case 'heap':
      return 'SmartHeap';
    case 'dsu':
      return 'SmartUnionFind';
    case 'graph':
      return 'SmartGraph';
    case 'dp-1d':
    case 'dp-2d':
    case 'dp-interval':
    case 'dp-tree':
    case 'dp-bitmask':
      return 'SmartDPTable';
    case 'search-tree':
    case 'recursion-tree':
    case 'call-stack':
      return 'SmartRecursion';
    case 'number-line':
    case 'coordinate-system':
    case 'geometry':
      return 'SmartPointer';
    case 'math-formula':
      return 'SmartFormula';
    default:
      return 'SmartVariable';
  }
}

export function readComponentValue(
  payload: AlgoComponentPayload,
  coords?: { index?: number; row?: number; col?: number }
): unknown {
  if (payload.kind === 'array') {
    if (typeof coords?.index === 'number') {
      return payload.data.items[coords.index];
    }
    return payload.data.items;
  }
  if (payload.kind === 'matrix' || payload.kind === 'dp') {
    if (typeof coords?.row === 'number' && typeof coords?.col === 'number') {
      return payload.data.rows[coords.row]?.[coords.col];
    }
    return payload.data.rows;
  }
  if (payload.kind === 'linear') {
    return payload.data.items;
  }
  if (payload.kind === 'dsu') {
    return payload.data.parent;
  }
  if (payload.kind === 'graph') {
    return { nodes: payload.data.nodes.length, edges: payload.data.edges.length };
  }
  if (payload.kind === 'annotation' && payload.data.kind === 'variable-watcher') {
    return payload.data.variables || [];
  }
  return payload.data;
}

export function validateComponentPayload(item: AlgoCanvasItem): string[] {
  const issues: string[] = [];
  const p = item.payload;
  if (p.kind === 'array') {
    for (const ptr of p.data.pointers || []) {
      if (ptr.index < 0 || ptr.index >= p.data.items.length) {
        issues.push(`${item.name}: 指针 ${ptr.label} 越界 (${ptr.index})`);
      }
    }
  } else if (p.kind === 'matrix' || p.kind === 'dp') {
    const rowLen = p.data.rows[0]?.length ?? 0;
    for (let r = 0; r < p.data.rows.length; r++) {
      if (p.data.rows[r].length !== rowLen) {
        issues.push(`${item.name}: 第 ${r} 行列数不一致`);
      }
    }
  } else if (p.kind === 'graph') {
    const nodeIds = new Set(p.data.nodes.map((n) => n.id));
    for (const e of p.data.edges) {
      if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) {
        issues.push(`${item.name}: 边 ${e.from}->${e.to} 引用了不存在的节点`);
      }
    }
  }
  return issues;
}

function makeEvent(
  type: AlgorithmEvent['type'],
  targetId: string,
  message: string,
  stepIndex: number
): AlgorithmEvent {
  return {
    id: `ev-${stepIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    targetId,
    message,
    timestampStep: stepIndex,
  };
}

/**
 * Applies a semantic operation to a component payload and returns:
 * - deep-cloned next payload (preserving immutability for timeline snapshots)
 * - unified AlgorithmEvent[]
 * - validation status
 */
export function applySemanticOperation(
  item: AlgoCanvasItem,
  op: SemanticOperation
): SemanticOperationResult {
  const next = structuredClone(item.payload);
  const events: AlgorithmEvent[] = [];
  const color: HighlightColor = op.color || 'yellow';

  if (op.kind === 'write-array' && next.kind === 'array') {
    const idx = op.index ?? -1;
    if (idx < 0 || idx >= next.data.items.length) {
      return {
        payload: item.payload,
        events: [makeEvent('error', item.id, `${item.name}[${idx}] 写入越界`, op.stepIndex)],
        valid: false,
        error: `Array index out of bounds: ${idx}`,
      };
    }
    next.data.items[idx] = op.value ?? 0;
    next.data.highlightedIndices = { ...(next.data.highlightedIndices || {}), [idx]: color };
    events.push(makeEvent('assign', item.id, `${item.name}[${idx}] = ${op.value}`, op.stepIndex));
    return { payload: next, events, valid: true };
  }

  if (op.kind === 'swap' && next.kind === 'array') {
    const i = op.index ?? -1;
    const j = op.index2 ?? -1;
    if (i < 0 || j < 0 || i >= next.data.items.length || j >= next.data.items.length) {
      return {
        payload: item.payload,
        events: [makeEvent('error', item.id, `swap(${i}, ${j}) 越界`, op.stepIndex)],
        valid: false,
        error: `Swap indices out of bounds: ${i}, ${j}`,
      };
    }
    const tmp = next.data.items[i];
    next.data.items[i] = next.data.items[j];
    next.data.items[j] = tmp;
    next.data.highlightedIndices = { [i]: 'red', [j]: 'red' };
    events.push(makeEvent('swap', item.id, `交换 ${item.name}[${i}] ↔ ${item.name}[${j}]`, op.stepIndex));
    return { payload: next, events, valid: true };
  }

  if (op.kind === 'write-cell' && (next.kind === 'matrix' || next.kind === 'dp')) {
    const r = op.row ?? -1;
    const c = op.col ?? -1;
    if (r < 0 || r >= next.data.rows.length || c < 0 || c >= (next.data.rows[r]?.length ?? 0)) {
      return {
        payload: item.payload,
        events: [makeEvent('error', item.id, `${item.name}[${r}][${c}] 写入越界`, op.stepIndex)],
        valid: false,
        error: `Matrix cell out of bounds: (${r}, ${c})`,
      };
    }
    next.data.rows[r][c] = op.value ?? 0;
    next.data.activeCell = { r, c };
    next.data.highlightedCells = { ...(next.data.highlightedCells || {}), [`${r},${c}`]: color };
    events.push(
      makeEvent('transition', item.id, `${item.name}[${r}][${c}] ← ${op.value}`, op.stepIndex)
    );
    return { payload: next, events, valid: true };
  }

  if ((op.kind === 'push' || op.kind === 'enqueue') && next.kind === 'linear') {
    next.data.items.push(op.value ?? 0);
    next.data.highlightedIndices = { [next.data.items.length - 1]: color };
    events.push(
      makeEvent('push', item.id, `${item.name} 入队/入栈 ${op.value}`, op.stepIndex)
    );
    return { payload: next, events, valid: true };
  }

  if ((op.kind === 'pop' || op.kind === 'dequeue') && next.kind === 'linear') {
    if (next.data.items.length === 0) {
      return {
        payload: item.payload,
        events: [makeEvent('error', item.id, `${item.name} 为空，无法弹出`, op.stepIndex)],
        valid: false,
        error: `${item.name} underflow`,
      };
    }
    const removed = op.kind === 'dequeue' ? next.data.items.shift() : next.data.items.pop();
    events.push(makeEvent('pop', item.id, `${item.name} 弹出 ${removed}`, op.stepIndex));
    return { payload: next, events, valid: true };
  }

  if (op.kind === 'highlight') {
    if (next.kind === 'array' && op.indices) {
      const map: Record<number, HighlightColor> = {};
      for (const idx of op.indices) {
        if (idx >= 0 && idx < next.data.items.length) map[idx] = color;
      }
      next.data.highlightedIndices = map;
    } else if ((next.kind === 'matrix' || next.kind === 'dp') && op.cells) {
      const map: Record<string, HighlightColor> = {};
      for (const [r, c] of op.cells) {
        if (r >= 0 && r < next.data.rows.length && c >= 0 && c < (next.data.rows[r]?.length ?? 0)) {
          map[`${r},${c}`] = color;
        }
      }
      next.data.highlightedCells = map;
      if (op.cells.length > 0) {
        next.data.activeCell = { r: op.cells[0][0], c: op.cells[0][1] };
      }
    }
    events.push(makeEvent('select', item.id, `高亮 ${item.name}`, op.stepIndex));
    return { payload: next, events, valid: true };
  }

  if (op.kind === 'set-vars' && next.kind === 'annotation' && next.data.kind === 'variable-watcher') {
    next.data.variables = op.variables || [];
    events.push(makeEvent('assign', item.id, `更新变量监视 (${next.data.variables.length})`, op.stepIndex));
    return { payload: next, events, valid: true };
  }

  return { payload: next, events, valid: true };
}

export function createSnapshotMap(items: AlgoCanvasItem[]): Record<string, AlgoComponentPayload> {
  const map: Record<string, AlgoComponentPayload> = {};
  for (const it of items) {
    map[it.id] = structuredClone(it.payload);
  }
  return map;
}

export function syncVariableWatcherInItems(
  items: AlgoCanvasItem[],
  variables: AlgoVariable[]
): AlgoCanvasItem[] {
  return items.map((it) => {
    if (it.payload.kind === 'annotation' && it.payload.data.kind === 'variable-watcher') {
      return {
        ...it,
        payload: {
          kind: 'annotation',
          data: {
            ...it.payload.data,
            variables: structuredClone(variables),
          },
        },
      };
    }
    return it;
  });
}
