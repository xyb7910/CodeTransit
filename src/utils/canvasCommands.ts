import {
  AlgoCanvasItem,
  Artboard,
  CanvasGroup,
  InnerSubSelection,
  SceneSchema,
  SmartConnector,
} from '../types/algorithmStudio';
import { HighlightColor } from '../types/workspace';

export type LayerZAction = 'top' | 'bottom' | 'up' | 'down';

export function cloneItemsWithNewIds(
  sourceItems: AlgoCanvasItem[],
  offsetX = 24,
  offsetY = 24,
  zBase = 10
): AlgoCanvasItem[] {
  return sourceItems.map((it, idx) => ({
    ...structuredClone(it),
    id: `item-${it.type}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
    x: it.x + offsetX,
    y: it.y + offsetY,
    zIndex: zBase + idx + 1,
  }));
}

export function selectAllItemIds(board: Artboard): string[] {
  return board.items.filter((it) => it.visible).map((it) => it.id);
}

export function invertSelectedIds(board: Artboard, currentIds: string[]): string[] {
  const cur = new Set(currentIds);
  return board.items.filter((it) => it.visible && !cur.has(it.id)).map((it) => it.id);
}

export function groupSelectedItems(
  board: Artboard,
  selectedIds: string[],
  groupName?: string
): Artboard {
  if (selectedIds.length < 1) return board;
  const gid = `grp-${Date.now()}`;
  const selectedSet = new Set(selectedIds);

  // Support nested group: if items already share a parent group, make new group's parentGroupId if nesting
  const existingGroups = board.groups || [];
  const firstItem = board.items.find((it) => selectedSet.has(it.id));
  const parentGroupId =
    firstItem?.groupId && existingGroups.some((g) => g.id === firstItem.groupId)
      ? undefined
      : undefined;

  const newGroup: CanvasGroup = {
    id: gid,
    name: groupName || `组合 (${selectedIds.length})`,
    parentGroupId,
    collapsed: false,
  };

  return {
    ...board,
    groups: [...existingGroups, newGroup],
    items: board.items.map((it) => (selectedSet.has(it.id) ? { ...it, groupId: gid } : it)),
  };
}

export function ungroupSelectedItems(board: Artboard, selectedIds: string[]): Artboard {
  const selectedSet = new Set(selectedIds);
  const nextItems = board.items.map((it) =>
    selectedSet.has(it.id) ? { ...it, groupId: undefined } : it
  );
  const activeGids = new Set(nextItems.map((it) => it.groupId).filter(Boolean));
  const nextGroups = (board.groups || []).filter((g) => activeGids.has(g.id));
  return { ...board, groups: nextGroups, items: nextItems };
}

export function reorderLayerZ(
  items: AlgoCanvasItem[],
  selectedIds: string[],
  action: LayerZAction
): AlgoCanvasItem[] {
  if (selectedIds.length === 0) return items;
  const sel = new Set(selectedIds);
  const sorted = [...items].sort((a, b) => a.zIndex - b.zIndex);

  if (action === 'top') {
    const rest = sorted.filter((i) => !sel.has(i.id));
    const picked = sorted.filter((i) => sel.has(i.id));
    return [...rest, ...picked].map((it, idx) => ({ ...it, zIndex: idx + 1 }));
  }
  if (action === 'bottom') {
    const picked = sorted.filter((i) => sel.has(i.id));
    const rest = sorted.filter((i) => !sel.has(i.id));
    return [...picked, ...rest].map((it, idx) => ({ ...it, zIndex: idx + 1 }));
  }
  if (action === 'up') {
    const arr = [...sorted];
    for (let i = arr.length - 2; i >= 0; i--) {
      if (sel.has(arr[i].id) && !sel.has(arr[i + 1].id)) {
        const tmp = arr[i];
        arr[i] = arr[i + 1];
        arr[i + 1] = tmp;
      }
    }
    return arr.map((it, idx) => ({ ...it, zIndex: idx + 1 }));
  }
  // down
  const arr = [...sorted];
  for (let i = 1; i < arr.length; i++) {
    if (sel.has(arr[i].id) && !sel.has(arr[i - 1].id)) {
      const tmp = arr[i];
      arr[i] = arr[i - 1];
      arr[i - 1] = tmp;
    }
  }
  return arr.map((it, idx) => ({ ...it, zIndex: idx + 1 }));
}

export function deleteItemsWithBoundConnectors(
  board: Artboard,
  deleteIds: string[]
): Artboard {
  const delSet = new Set(deleteIds);
  const nextItems = board.items.filter((it) => !delSet.has(it.id) || it.locked);
  const remainingIds = new Set(nextItems.map((it) => it.id));
  const nextConnectors = (board.connectors || []).filter(
    (c) => remainingIds.has(c.fromId) && remainingIds.has(c.toId)
  );
  return {
    ...board,
    items: nextItems,
    connectors: nextConnectors,
  };
}

export function createConnectorBetween(
  fromId: string,
  toId: string,
  options?: Partial<SmartConnector>
): SmartConnector {
  return {
    id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    fromId,
    toId,
    fromAnchor: options?.fromAnchor || 'auto',
    toAnchor: options?.toAnchor || 'auto',
    routing: options?.routing || 'bezier',
    arrowKind: options?.arrowKind || 'single',
    label: options?.label || '',
    color: options?.color || '#60A5FA',
    strokeWidth: options?.strokeWidth || 2,
    dashed: Boolean(options?.dashed),
  };
}

export type CopiedStyle = AlgoCanvasItem['style'];

export function applyCopiedStyleToItems(
  items: AlgoCanvasItem[],
  targetIds: string[],
  style: CopiedStyle
): AlgoCanvasItem[] {
  const set = new Set(targetIds);
  return items.map((it) => (set.has(it.id) && !it.locked ? { ...it, style: { ...it.style, ...style } } : it));
}

export function getDefaultItemStyle(): AlgoCanvasItem['style'] {
  return {
    background: '#111827',
    borderColor: '#334155',
    borderWidth: 1,
    borderStyle: 'solid',
    accentColor: '#3B82F6',
    fontSize: 13,
    opacity: 1,
    borderRadius: 10,
    shadow: 'md',
  };
}

export type SemanticSubEditAction =
  | { kind: 'array-insert-left'; index: number; value: number | string }
  | { kind: 'array-insert-right'; index: number; value: number | string }
  | { kind: 'array-delete'; index: number }
  | { kind: 'array-set'; index: number; value: number | string }
  | { kind: 'array-swap'; indexA: number; indexB: number }
  | { kind: 'array-set-pointer'; index: number; label: string; color: HighlightColor }
  | { kind: 'array-clear-pointers' }
  | { kind: 'cell-set'; row: number; col: number; value: number | string }
  | { kind: 'cell-set-active'; row: number; col: number }
  | { kind: 'cell-highlight'; row: number; col: number; color: HighlightColor | null }
  | { kind: 'graph-toggle-highlight'; nodeId: string; color: HighlightColor }
  | { kind: 'graph-set-role'; nodeId: string; role: 'start' | 'end' }
  | { kind: 'graph-set-weight'; nodeId: string; weight: string }
  | { kind: 'graph-connect'; fromId: string; toId: string; weight: number };

export function applySemanticSubEdit(
  scene: SceneSchema,
  itemId: string,
  action: SemanticSubEditAction,
  editMode: 'visual' | 'data' | 'step'
): SceneSchema {
  const next = structuredClone(scene);
  const board = next.artboards.find((a) => a.id === next.activeArtboardId) || next.artboards[0];
  if (!board) return scene;

  board.items = board.items.map((it) => {
    if (it.id !== itemId || it.locked) return it;
    const p = structuredClone(it.payload);

    if (p.kind === 'array') {
      if (action.kind === 'array-insert-left') {
        p.data.items.splice(action.index, 0, action.value);
      } else if (action.kind === 'array-insert-right') {
        p.data.items.splice(action.index + 1, 0, action.value);
      } else if (action.kind === 'array-delete' && p.data.items.length > 1) {
        p.data.items.splice(action.index, 1);
      } else if (action.kind === 'array-set') {
        p.data.items[action.index] = action.value;
      } else if (
        action.kind === 'array-swap' &&
        action.indexA >= 0 &&
        action.indexB >= 0 &&
        action.indexA < p.data.items.length &&
        action.indexB < p.data.items.length
      ) {
        const tmp = p.data.items[action.indexA];
        p.data.items[action.indexA] = p.data.items[action.indexB];
        p.data.items[action.indexB] = tmp;
      } else if (action.kind === 'array-set-pointer') {
        const rest = (p.data.pointers || []).filter((ptr) => ptr.label !== action.label);
        p.data.pointers = [...rest, { index: action.index, label: action.label, color: action.color }];
      } else if (action.kind === 'array-clear-pointers') {
        p.data.pointers = [];
      }
    } else if (p.kind === 'matrix' || p.kind === 'dp') {
      if (action.kind === 'cell-set' && p.data.rows[action.row]) {
        p.data.rows[action.row][action.col] = action.value;
      } else if (action.kind === 'cell-set-active') {
        p.data.activeCell = { r: action.row, c: action.col };
      } else if (action.kind === 'cell-highlight') {
        const map = { ...(p.data.highlightedCells || {}) };
        const key = `${action.row},${action.col}`;
        if (action.color) map[key] = action.color;
        else delete map[key];
        p.data.highlightedCells = map;
      }
    } else if (p.kind === 'graph') {
      if (action.kind === 'graph-toggle-highlight') {
        p.data.nodes = p.data.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, highlight: n.highlight ? undefined : action.color } : n
        );
      } else if (action.kind === 'graph-set-role') {
        p.data.nodes = p.data.nodes.map((n) =>
          n.id === action.nodeId
            ? {
                ...n,
                highlight: action.role === 'start' ? 'green' : 'red',
                weight: action.role === 'start' ? 'S' : 'T',
              }
            : n
        );
      } else if (action.kind === 'graph-set-weight') {
        p.data.nodes = p.data.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, weight: action.weight } : n
        );
      } else if (action.kind === 'graph-connect') {
        p.data.edges.push({
          id: `edge-${Date.now()}`,
          from: action.fromId,
          to: action.toId,
          weight: action.weight,
          directed: p.data.variant !== 'undirected',
        });
      }
    }
    return { ...it, payload: p };
  });

  // Strict Edit Mode Semantics
  const isDataMutating = [
    'array-insert-left',
    'array-insert-right',
    'array-delete',
    'array-set',
    'array-swap',
    'cell-set',
    'graph-connect',
  ].includes(action.kind);

  if (editMode === 'data' && isDataMutating) {
    next.traceStale = true;
    next.traceStaleReason = '原始语义数据已手动修改，当前时间轴轨迹可能已过期，可点击「重新推演」同步最新状态。';
  } else if (editMode === 'step' && next.steps[next.currentStepIndex]) {
    const editedItem = board.items.find((it) => it.id === itemId);
    if (editedItem) {
      next.steps[next.currentStepIndex].snapshot.artboardItems[itemId] = structuredClone(editedItem.payload);
      if (next.traceMode === 'builtin' || next.traceMode === 'dsl') {
        next.traceMode = 'manual';
        next.traceSource = 'manual';
      }
    }
  }

  next.updatedAt = Date.now();
  return next;
}

export function formatSubSelectionLabel(sub: InnerSubSelection | null): string {
  if (!sub) return '';
  if (sub.kind === 'array-cell') return `Array[${sub.index}]`;
  if (sub.kind === 'dp-cell') return `DP[${sub.row}][${sub.col}]`;
  if (sub.kind === 'matrix-cell') return `Matrix[${sub.row}][${sub.col}]`;
  if (sub.kind === 'graph-node') return `Node(${sub.nodeId})`;
  return sub.kind;
}
