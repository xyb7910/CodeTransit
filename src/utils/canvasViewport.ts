import {
  AlgoCanvasItem,
  Artboard,
  ConnectorAnchorSide,
  FixedBoardPreset,
  SmartConnector,
} from '../types/algorithmStudio';

export interface BoundsBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export const FIXED_BOARD_PRESETS: Record<FixedBoardPreset, { label: string; width: number; height: number }> = {
  custom: { label: '自定义', width: 980, height: 620 },
  '16:9': { label: '16:9 演示屏 (1280×720)', width: 1280, height: 720 },
  '4:3': { label: '4:3 课堂屏 (1024×768)', width: 1024, height: 768 },
  '1:1': { label: '1:1 题卡方图 (880×880)', width: 880, height: 880 },
  '9:16': { label: '9:16 竖屏讲解 (720×1280)', width: 720, height: 1280 },
  A4: { label: 'A4 讲义纵向 (794×1123)', width: 794, height: 1123 },
  A3: { label: 'A3 大幅讲义 (1123×1587)', width: 1123, height: 1587 },
};

/**
 * Cursor-centered zoom math: keeps the logical point under (cursorX, cursorY)
 * invariant across zoom transitions (zero cursor drift).
 */
export function zoomAtCursor(
  currentZoom: number,
  currentPan: { x: number; y: number },
  nextZoomRaw: number,
  cursorX: number,
  cursorY: number,
  minZoom = 0.2,
  maxZoom = 3.0
): { zoom: number; pan: { x: number; y: number } } {
  const nextZoom = Math.max(minZoom, Math.min(maxZoom, Number(nextZoomRaw.toFixed(3))));
  const logicalX = (cursorX - currentPan.x) / currentZoom;
  const logicalY = (cursorY - currentPan.y) / currentZoom;
  return {
    zoom: nextZoom,
    pan: {
      x: cursorX - logicalX * nextZoom,
      y: cursorY - logicalY * nextZoom,
    },
  };
}

/**
 * Computes axis-aligned bounding box of a rotated item including border/shadow/padding margin.
 */
export function computeItemTransformedBounds(item: AlgoCanvasItem): BoundsBox {
  const margin = (item.style.borderWidth ?? 1) + (item.style.shadow && item.style.shadow !== 'none' ? 10 : 2);
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  const rad = (item.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rw = item.width * cos + item.height * sin;
  const rh = item.width * sin + item.height * cos;

  const minX = cx - rw / 2 - margin;
  const minY = cy - rh / 2 - margin;
  const maxX = cx + rw / 2 + margin;
  const maxY = cy + rh / 2 + margin;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Computes tight adaptive bounds for all visible items in an artboard (supports negative coordinates).
 */
export function computeAutoFitArtboardBounds(
  artboard: Artboard,
  padding = 36
): { originX: number; originY: number; width: number; height: number } {
  const visible = artboard.items.filter((it) => it.visible);
  if (visible.length === 0) {
    return { originX: 0, originY: 0, width: Math.max(640, artboard.width), height: Math.max(420, artboard.height) };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const it of visible) {
    const b = computeItemTransformedBounds(it);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  const originX = Math.round(minX - padding);
  const originY = Math.round(minY - padding);
  const width = Math.max(360, Math.round(maxX - minX + padding * 2));
  const height = Math.max(260, Math.round(maxY - minY + padding * 2));
  return { originX, originY, width, height };
}

/**
 * Computes camera zoom & pan to fit a world-space bounds rectangle into viewportRect.
 */
export function computeFitViewTransform(
  bounds: { x: number; y: number; width: number; height: number },
  viewportRect: { width: number; height: number },
  padding = 36
): { zoom: number; pan: { x: number; y: number } } {
  const availW = Math.max(120, viewportRect.width - padding * 2);
  const availH = Math.max(120, viewportRect.height - padding * 2);
  const scaleX = availW / Math.max(1, bounds.width);
  const scaleY = availH / Math.max(1, bounds.height);
  const zoom = Math.max(0.2, Math.min(2.0, Number(Math.min(scaleX, scaleY).toFixed(2))));

  const panX = (viewportRect.width - bounds.width * zoom) / 2 - bounds.x * zoom;
  const panY = (viewportRect.height - bounds.height * zoom) / 2 - bounds.y * zoom;
  return { zoom, pan: { x: Math.round(panX), y: Math.round(panY) } };
}

export function detectArtboardOverflow(artboard: Artboard): {
  overflowingIds: string[];
  hasOverflow: boolean;
} {
  const ox = artboard.originX ?? 0;
  const oy = artboard.originY ?? 0;
  const right = ox + artboard.width;
  const bottom = oy + artboard.height;
  const overflowingIds: string[] = [];

  for (const it of artboard.items) {
    if (!it.visible) continue;
    const b = computeItemTransformedBounds(it);
    if (b.minX < ox || b.minY < oy || b.maxX > right || b.maxY > bottom) {
      overflowingIds.push(it.id);
    }
  }
  return { overflowingIds, hasOverflow: overflowingIds.length > 0 };
}

function getAnchorPoint(item: AlgoCanvasItem, side: ConnectorAnchorSide): { x: number; y: number } {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  let local = { x: 0, y: 0 };
  if (side === 'top') local = { x: 0, y: -item.height / 2 };
  else if (side === 'right') local = { x: item.width / 2, y: 0 };
  else if (side === 'bottom') local = { x: 0, y: item.height / 2 };
  else if (side === 'left') local = { x: -item.width / 2, y: 0 };

  if (!item.rotation) {
    return { x: cx + local.x, y: cy + local.y };
  }
  const rad = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + local.x * cos - local.y * sin,
    y: cy + local.x * sin + local.y * cos,
  };
}

function resolveAutoSides(from: AlgoCanvasItem, to: AlgoCanvasItem): [ConnectorAnchorSide, ConnectorAnchorSide] {
  const fcx = from.x + from.width / 2;
  const fcy = from.y + from.height / 2;
  const tcx = to.x + to.width / 2;
  const tcy = to.y + to.height / 2;
  const dx = tcx - fcx;
  const dy = tcy - fcy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? ['right', 'left'] : ['left', 'right'];
  }
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom'];
}

export interface ResolvedConnectorPath {
  d: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  labelPos: { x: number; y: number };
}

export function resolveConnectorGeometry(
  conn: SmartConnector,
  items: AlgoCanvasItem[],
  parallelIndex = 0,
  parallelCount = 1
): ResolvedConnectorPath | null {
  const from = items.find((i) => i.id === conn.fromId);
  const to = items.find((i) => i.id === conn.toId);
  if (!from || !to) return null;

  // Self-loop connector
  if (from.id === to.id) {
    const start = getAnchorPoint(from, 'top');
    const end = getAnchorPoint(from, 'right');
    const c1x = start.x - 10;
    const c1y = start.y - 60;
    const c2x = end.x + 60;
    const c2y = end.y - 10;
    return {
      d: `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`,
      start,
      end,
      labelPos: { x: (c1x + c2x) / 2, y: (c1y + c2y) / 2 },
    };
  }

  const [autoFrom, autoTo] = resolveAutoSides(from, to);
  const start = getAnchorPoint(from, conn.fromAnchor === 'auto' ? autoFrom : conn.fromAnchor);
  const end = getAnchorPoint(to, conn.toAnchor === 'auto' ? autoTo : conn.toAnchor);

  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const parallelSpread = parallelCount > 1 ? (parallelIndex - (parallelCount - 1) / 2) * 30 : 0;
  const ctrlDx = (conn.controlOffset?.dx ?? 0) + nx * parallelSpread;
  const ctrlDy = (conn.controlOffset?.dy ?? 0) + ny * parallelSpread;

  if (conn.routing === 'orthogonal') {
    const midX = mx + ctrlDx;
    const d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
    return { d, start, end, labelPos: { x: midX, y: my } };
  }

  if (conn.routing === 'bezier' || parallelSpread !== 0 || conn.controlOffset) {
    const cx = mx + ctrlDx;
    const cy = my + ctrlDy;
    const d = `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
    return { d, start, end, labelPos: { x: (mx + cx) / 2, y: (my + cy) / 2 } };
  }

  return {
    d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    start,
    end,
    labelPos: { x: mx, y: my },
  };
}
