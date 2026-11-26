import React, { useEffect, useRef, useState } from 'react';
import {
  AlgoCanvasItem,
  AlgoVariable,
  Artboard,
  CanvasToolMode,
  CustomGuide,
  InnerSubSelection,
  SmartConnector,
} from '../../types/algorithmStudio';
import {
  computeFitViewTransform,
  resolveConnectorGeometry,
  zoomAtCursor,
} from '../../utils/canvasViewport';
import { cloneItemsWithNewIds, createConnectorBetween } from '../../utils/canvasCommands';
import { createDefaultAlgoItem } from '../../constants/algorithmTemplates';
import { AlgoComponentRenderer } from './AlgoComponentRenderer';

export interface CanvasContextMenuRequest {
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
  itemId?: string;
  subSelection?: InnerSubSelection;
}

interface StudioCanvasProps {
  artboard: Artboard;
  selectedIds: string[];
  selectedConnectorId: string | null;
  toolMode: CanvasToolMode;
  innerEditItemId: string | null;
  activeSubSelection: InnerSubSelection | null;
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  snapThreshold?: number;
  guideColor?: string;
  stepVariables?: AlgoVariable[];
  artboardRef?: React.RefObject<HTMLDivElement | null>;
  onZoomPanChange: (z: number, p: { x: number; y: number }) => void;
  onSelectIds: (ids: string[]) => void;
  onSelectConnectorId: (id: string | null) => void;
  onEnterInnerEdit: (itemId: string | null) => void;
  onSubSelect: (sub: InnerSubSelection | null) => void;
  onSubDoubleClickEdit: (sub: InnerSubSelection, newValue: string) => void;
  onUpdateItemsLive: (items: AlgoCanvasItem[]) => void;
  onCommitTransaction: (beforeBoard: Artboard, afterBoard: Artboard) => void;
  onAddConnector: (conn: SmartConnector) => void;
  onUpdateConnectorLive: (conn: SmartConnector) => void;
  onUpdateGuides: (guides: CustomGuide[]) => void;
  onMoveGraphNode: (itemId: string, nodeId: string, x: number, y: number) => void;
  onRequestContextMenu: (req: CanvasContextMenuRequest) => void;
  onResetToolToSelect: () => void;
  onViewportRectChange?: (rect: { width: number; height: number }) => void;
}

type DragMode =
  | { kind: 'none' }
  | { kind: 'pan'; startX: number; startY: number; origPan: { x: number; y: number } }
  | {
      kind: 'move';
      startX: number;
      startY: number;
      origPositions: Record<string, { x: number; y: number }>;
      snapshotBefore: Artboard;
      altCloned: boolean;
    }
  | {
      kind: 'resize';
      itemId: string;
      handle: string;
      startX: number;
      startY: number;
      orig: { x: number; y: number; width: number; height: number };
      snapshotBefore: Artboard;
    }
  | {
      kind: 'rotate';
      itemId: string;
      cx: number;
      cy: number;
      snapshotBefore: Artboard;
    }
  | {
      kind: 'marquee';
      startX: number;
      startY: number;
      curX: number;
      curY: number;
    }
  | {
      kind: 'draw-shape';
      tool: 'rect' | 'circle' | 'arrow' | 'text';
      startX: number;
      startY: number;
      curX: number;
      curY: number;
      snapshotBefore: Artboard;
    }
  | {
      kind: 'draw-ink';
      isHighlighter: boolean;
      points: Array<{ x: number; y: number }>;
      snapshotBefore: Artboard;
    }
  | {
      kind: 'draw-connector';
      fromId: string;
      startX: number;
      startY: number;
      curX: number;
      curY: number;
    }
  | {
      kind: 'drag-connector-ctrl';
      connId: string;
      startX: number;
      startY: number;
      origOffset: { dx: number; dy: number };
      snapshotBefore: Artboard;
    };

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  artboard,
  selectedIds,
  selectedConnectorId,
  toolMode,
  innerEditItemId,
  activeSubSelection,
  zoom,
  pan,
  showGrid,
  snapToGrid,
  gridSize,
  snapThreshold = 6,
  guideColor = '#F43F5E',
  stepVariables,
  artboardRef,
  onZoomPanChange,
  onSelectIds,
  onSelectConnectorId,
  onEnterInnerEdit,
  onSubSelect,
  onSubDoubleClickEdit,
  onUpdateItemsLive,
  onCommitTransaction,
  onAddConnector,
  onUpdateConnectorLive,
  onUpdateGuides,
  onMoveGraphNode,
  onRequestContextMenu,
  onResetToolToSelect,
  onViewportRectChange,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>({ kind: 'none' });
  const [spacePressed, setSpacePressed] = useState(false);
  const [guides, setGuides] = useState<{ x?: number; y?: number; spacingLabel?: string }>({});
  const [viewportSize, setViewportSize] = useState({ width: 900, height: 600 });

  const originX = artboard.originX ?? 0;
  const originY = artboard.originY ?? 0;

  // ResizeObserver keeps viewport tracking responsive without touching logical world coordinates
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        setViewportSize({ width: w, height: h });
        onViewportRectChange?.({ width: w, height: h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onViewportRectChange]);

  // Temporary Space-bar Hand Pan + Esc Drag Cancel
  useEffect(() => {
    const isInputTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toUpperCase();
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isInputTarget(e.target)) {
        setSpacePressed(true);
      }
      if (e.key === 'Escape' && dragMode.kind !== 'none') {
        if ('snapshotBefore' in dragMode) {
          onUpdateItemsLive(dragMode.snapshotBefore.items);
        }
        setDragMode({ kind: 'none' });
        setGuides({});
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [dragMode, onUpdateItemsLive]);

  const snapVal = (v: number) => (snapToGrid ? Math.round(v / gridSize) * gridSize : Math.round(v));

  const toWorldCoords = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const nextZoom = zoom * Math.exp(-e.deltaY * 0.0022);
      const res = zoomAtCursor(zoom, pan, nextZoom, cursorX, cursorY, 0.2, 3.0);
      onZoomPanChange(res.zoom, res.pan);
    } else {
      onZoomPanChange(zoom, { x: pan.x - e.deltaX * 0.75, y: pan.y - e.deltaY * 0.75 });
    }
  };

  const hitItemAt = (wx: number, wy: number): AlgoCanvasItem | null => {
    const desc = [...artboard.items].sort((a, b) => b.zIndex - a.zIndex);
    return (
      desc.find(
        (it) =>
          it.visible &&
          wx >= it.x &&
          wx <= it.x + it.width &&
          wy >= it.y &&
          wy <= it.y + it.height
      ) || null
    );
  };

  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    if (e.button === 1 || spacePressed || toolMode === 'hand') {
      setDragMode({ kind: 'pan', startX: e.clientX, startY: e.clientY, origPan: pan });
      return;
    }

    const pt = toWorldCoords(e.clientX, e.clientY);

    if (toolMode === 'rect' || toolMode === 'circle' || toolMode === 'arrow' || toolMode === 'text') {
      setDragMode({
        kind: 'draw-shape',
        tool: toolMode,
        startX: pt.x,
        startY: pt.y,
        curX: pt.x,
        curY: pt.y,
        snapshotBefore: structuredClone(artboard),
      });
      return;
    }

    if (toolMode === 'brush' || toolMode === 'highlight') {
      setDragMode({
        kind: 'draw-ink',
        isHighlighter: toolMode === 'highlight',
        points: [pt],
        snapshotBefore: structuredClone(artboard),
      });
      return;
    }

    onEnterInnerEdit(null);
    onSubSelect(null);
    onSelectConnectorId(null);
    setDragMode({
      kind: 'marquee',
      startX: pt.x,
      startY: pt.y,
      curX: pt.x,
      curY: pt.y,
    });
    if (!e.shiftKey) {
      onSelectIds([]);
    }
  };

  const handleItemPointerDown = (e: React.PointerEvent, item: AlgoCanvasItem) => {
    if (e.button === 2) return;
    if (e.button === 1 || spacePressed || toolMode === 'hand') {
      e.stopPropagation();
      setDragMode({ kind: 'pan', startX: e.clientX, startY: e.clientY, origPan: pan });
      return;
    }

    e.stopPropagation();
    const pt = toWorldCoords(e.clientX, e.clientY);

    if (toolMode === 'connector') {
      setDragMode({
        kind: 'draw-connector',
        fromId: item.id,
        startX: pt.x,
        startY: pt.y,
        curX: pt.x,
        curY: pt.y,
      });
      return;
    }

    onSelectConnectorId(null);

    if (item.locked || item.aiLocked) {
      onSelectIds([item.id]);
      return;
    }

    // Alt/Option + Drag clones selected item(s) cleanly
    if (e.altKey) {
      const snapshotBefore = structuredClone(artboard);
      const sourceIds = selectedIds.includes(item.id) ? selectedIds : [item.id];
      const sources = artboard.items.filter((it) => sourceIds.includes(it.id) && !it.locked);
      const maxZ = artboard.items.reduce((m, it) => Math.max(m, it.zIndex), 0);
      const clones = cloneItemsWithNewIds(sources, 0, 0, maxZ);
      const nextItems = [...artboard.items, ...clones];
      const nextSelected = clones.map((c) => c.id);
      const origPositions: Record<string, { x: number; y: number }> = {};
      for (const c of clones) origPositions[c.id] = { x: c.x, y: c.y };
      onUpdateItemsLive(nextItems);
      onSelectIds(nextSelected);
      setDragMode({
        kind: 'move',
        startX: e.clientX,
        startY: e.clientY,
        origPositions,
        snapshotBefore,
        altCloned: true,
      });
      return;
    }

    let nextSelected = selectedIds;
    if (e.shiftKey) {
      nextSelected = selectedIds.includes(item.id)
        ? selectedIds.filter((id) => id !== item.id)
        : [...selectedIds, item.id];
      onSelectIds(nextSelected);
    } else if (!selectedIds.includes(item.id)) {
      nextSelected = item.groupId
        ? artboard.items.filter((it) => it.groupId === item.groupId).map((it) => it.id)
        : [item.id];
      onSelectIds(nextSelected);
      if (innerEditItemId && innerEditItemId !== item.id) {
        onEnterInnerEdit(null);
      }
    }

    const origPositions: Record<string, { x: number; y: number }> = {};
    for (const it of artboard.items) {
      if (nextSelected.includes(it.id) && !it.locked && !it.aiLocked) {
        origPositions[it.id] = { x: it.x, y: it.y };
      }
    }
    setDragMode({
      kind: 'move',
      startX: e.clientX,
      startY: e.clientY,
      origPositions,
      snapshotBefore: structuredClone(artboard),
      altCloned: false,
    });
  };

  const applyEdgeAutoScroll = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const edge = 28;
    let dx = 0;
    let dy = 0;
    if (clientX < rect.left + edge) dx = 10;
    else if (clientX > rect.right - edge) dx = -10;
    if (clientY < rect.top + edge) dy = 10;
    else if (clientY > rect.bottom - edge) dy = -10;
    if (dx !== 0 || dy !== 0) {
      onZoomPanChange(zoom, { x: pan.x + dx, y: pan.y + dy });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMode.kind === 'none') return;

    if (dragMode.kind === 'pan') {
      onZoomPanChange(zoom, {
        x: dragMode.origPan.x + (e.clientX - dragMode.startX),
        y: dragMode.origPan.y + (e.clientY - dragMode.startY),
      });
      return;
    }

    if (dragMode.kind === 'marquee') {
      applyEdgeAutoScroll(e.clientX, e.clientY);
      const pt = toWorldCoords(e.clientX, e.clientY);
      setDragMode({ ...dragMode, curX: pt.x, curY: pt.y });
      return;
    }

    if (dragMode.kind === 'draw-shape') {
      const pt = toWorldCoords(e.clientX, e.clientY);
      setDragMode({ ...dragMode, curX: pt.x, curY: pt.y });
      return;
    }

    if (dragMode.kind === 'draw-ink') {
      const pt = toWorldCoords(e.clientX, e.clientY);
      setDragMode({ ...dragMode, points: [...dragMode.points, pt] });
      return;
    }

    if (dragMode.kind === 'draw-connector') {
      const pt = toWorldCoords(e.clientX, e.clientY);
      setDragMode({ ...dragMode, curX: pt.x, curY: pt.y });
      return;
    }

    if (dragMode.kind === 'drag-connector-ctrl') {
      const dx = (e.clientX - dragMode.startX) / zoom;
      const dy = (e.clientY - dragMode.startY) / zoom;
      const conn = (artboard.connectors || []).find((c) => c.id === dragMode.connId);
      if (conn) {
        onUpdateConnectorLive({
          ...conn,
          routing: 'bezier',
          controlOffset: {
            dx: Math.round(dragMode.origOffset.dx + dx),
            dy: Math.round(dragMode.origOffset.dy + dy),
          },
        });
      }
      return;
    }

    if (dragMode.kind === 'move') {
      applyEdgeAutoScroll(e.clientX, e.clientY);
      let dx = (e.clientX - dragMode.startX) / zoom;
      let dy = (e.clientY - dragMode.startY) / zoom;
      if (e.shiftKey) {
        if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
        else dx = 0;
      }

      let guideX: number | undefined;
      let guideY: number | undefined;
      let spacingLabel: string | undefined;

      const movedIds = Object.keys(dragMode.origPositions);
      const others = artboard.items.filter((it) => !movedIds.includes(it.id) && it.visible);
      const customGuides = artboard.guides || [];

      const nextItems = artboard.items.map((it) => {
        const orig = dragMode.origPositions[it.id];
        if (!orig) return it;
        let nx = snapVal(orig.x + dx);
        let ny = snapVal(orig.y + dy);

        const cx = nx + it.width / 2;
        const cy = ny + it.height / 2;
        const boardMidX = originX + artboard.width / 2;
        const boardMidY = originY + artboard.height / 2;

        if (Math.abs(cx - boardMidX) < snapThreshold) {
          nx = Math.round(boardMidX - it.width / 2);
          guideX = boardMidX;
        }
        if (Math.abs(cy - boardMidY) < snapThreshold) {
          ny = Math.round(boardMidY - it.height / 2);
          guideY = boardMidY;
        }
        for (const cg of customGuides) {
          if (cg.axis === 'x' && Math.abs(nx - cg.pos) < snapThreshold) {
            nx = cg.pos;
            guideX = cg.pos;
          }
          if (cg.axis === 'y' && Math.abs(ny - cg.pos) < snapThreshold) {
            ny = cg.pos;
            guideY = cg.pos;
          }
        }
        for (const o of others) {
          if (Math.abs(nx - o.x) < snapThreshold) {
            nx = o.x;
            guideX = o.x;
          } else if (Math.abs(nx + it.width - (o.x + o.width)) < snapThreshold) {
            nx = o.x + o.width - it.width;
            guideX = o.x + o.width;
          }
          if (Math.abs(ny - o.y) < snapThreshold) {
            ny = o.y;
            guideY = o.y;
          } else if (Math.abs(ny + it.height - (o.y + o.height)) < snapThreshold) {
            ny = o.y + o.height - it.height;
            guideY = o.y + o.height;
          }
          const gapX = nx > o.x + o.width ? nx - (o.x + o.width) : o.x > nx + it.width ? o.x - (nx + it.width) : null;
          if (gapX !== null && gapX >= 0 && gapX <= 120 && Math.abs(ny - o.y) < 40) {
            spacingLabel = `ΔX ${Math.round(gapX)}px`;
          }
        }
        return { ...it, x: nx, y: ny };
      });
      setGuides({ x: guideX, y: guideY, spacingLabel });
      onUpdateItemsLive(nextItems);
      return;
    }

    if (dragMode.kind === 'resize') {
      applyEdgeAutoScroll(e.clientX, e.clientY);
      const dx = (e.clientX - dragMode.startX) / zoom;
      const dy = (e.clientY - dragMode.startY) / zoom;
      const { orig, handle, itemId } = dragMode;
      let { x, y, width, height } = orig;
      const aspect = orig.width / Math.max(1, orig.height);

      if (handle.includes('e')) width = Math.max(60, snapVal(orig.width + dx));
      if (handle.includes('s')) height = Math.max(40, snapVal(orig.height + dy));
      if (handle.includes('w')) {
        const nw = Math.max(60, snapVal(orig.width - dx));
        x = orig.x + (orig.width - nw);
        width = nw;
      }
      if (handle.includes('n')) {
        const nh = Math.max(40, snapVal(orig.height - dy));
        y = orig.y + (orig.height - nh);
        height = nh;
      }

      if (e.shiftKey && handle.length === 2) {
        height = Math.max(40, Math.round(width / aspect));
      }

      onUpdateItemsLive(
        artboard.items.map((it) => (it.id === itemId ? { ...it, x, y, width, height } : it))
      );
      return;
    }

    if (dragMode.kind === 'rotate') {
      const pt = toWorldCoords(e.clientX, e.clientY);
      let deg = Math.round((Math.atan2(pt.y - dragMode.cy, pt.x - dragMode.cx) * 180) / Math.PI + 90);
      if (e.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }
      onUpdateItemsLive(
        artboard.items.map((it) => (it.id === dragMode.itemId ? { ...it, rotation: deg } : it))
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMode.kind === 'marquee') {
      const x1 = Math.min(dragMode.startX, dragMode.curX);
      const y1 = Math.min(dragMode.startY, dragMode.curY);
      const x2 = Math.max(dragMode.startX, dragMode.curX);
      const y2 = Math.max(dragMode.startY, dragMode.curY);
      if (x2 - x1 > 6 || y2 - y1 > 6) {
        const hits = artboard.items
          .filter(
            (it) =>
              it.visible &&
              it.x < x2 &&
              it.x + it.width > x1 &&
              it.y < y2 &&
              it.y + it.height > y1
          )
          .map((it) => it.id);
        onSelectIds(hits);
      }
    } else if (dragMode.kind === 'draw-shape') {
      const x = Math.round(Math.min(dragMode.startX, dragMode.curX));
      const y = Math.round(Math.min(dragMode.startY, dragMode.curY));
      const w = Math.max(120, Math.round(Math.abs(dragMode.curX - dragMode.startX)));
      const h = Math.max(64, Math.round(Math.abs(dragMode.curY - dragMode.startY)));
      const compType =
        dragMode.tool === 'rect'
          ? 'rect-shape'
          : dragMode.tool === 'circle'
          ? 'circle-shape'
          : dragMode.tool === 'arrow'
          ? 'arrow'
          : 'text-box';
      const item = createDefaultAlgoItem(compType, x, y);
      item.width = w;
      item.height = h;
      item.zIndex = artboard.items.length + 1;
      const afterBoard: Artboard = { ...artboard, items: [...artboard.items, item] };
      onCommitTransaction(dragMode.snapshotBefore, afterBoard);
      onSelectIds([item.id]);
      onResetToolToSelect();
    } else if (dragMode.kind === 'draw-ink') {
      if (dragMode.points.length >= 2) {
        const xs = dragMode.points.map((p) => p.x);
        const ys = dragMode.points.map((p) => p.y);
        const minX = Math.min(...xs) - 8;
        const minY = Math.min(...ys) - 8;
        const maxX = Math.max(...xs) + 8;
        const maxY = Math.max(...ys) + 8;
        const localPts = dragMode.points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
        const strokeItem = createDefaultAlgoItem('freehand-stroke', Math.round(minX), Math.round(minY));
        strokeItem.width = Math.max(40, Math.round(maxX - minX));
        strokeItem.height = Math.max(40, Math.round(maxY - minY));
        strokeItem.zIndex = artboard.items.length + 1;
        strokeItem.name = dragMode.isHighlighter ? '荧光标记' : '画笔批注';
        strokeItem.payload = {
          kind: 'freehand',
          data: {
            points: localPts,
            strokeColor: dragMode.isHighlighter ? '#FACC15' : '#F59E0B',
            strokeWidth: dragMode.isHighlighter ? 14 : 3,
            isHighlighter: dragMode.isHighlighter,
          },
        };
        onCommitTransaction(dragMode.snapshotBefore, {
          ...artboard,
          items: [...artboard.items, strokeItem],
        });
        onSelectIds([strokeItem.id]);
      }
    } else if (dragMode.kind === 'draw-connector') {
      const pt = toWorldCoords(e.clientX, e.clientY);
      const hitTarget = hitItemAt(pt.x, pt.y);
      if (hitTarget) {
        const conn = createConnectorBetween(dragMode.fromId, hitTarget.id);
        onAddConnector(conn);
        onSelectConnectorId(conn.id);
        onResetToolToSelect();
      }
    } else if (
      dragMode.kind === 'move' ||
      dragMode.kind === 'resize' ||
      dragMode.kind === 'rotate' ||
      dragMode.kind === 'drag-connector-ctrl'
    ) {
      const beforeJson = JSON.stringify(dragMode.snapshotBefore);
      const afterJson = JSON.stringify(artboard);
      if (beforeJson !== afterJson) {
        onCommitTransaction(dragMode.snapshotBefore, artboard);
      }
    }

    setDragMode({ kind: 'none' });
    setGuides({});
  };

  const sortedItems = [...artboard.items].sort((a, b) => a.zIndex - b.zIndex);
  const connectors = artboard.connectors || [];
  const customGuides = artboard.guides || [];

  // Parallel count grouping for smart connectors
  const connPairCounts = new Map<string, number>();
  const connPairIndexes = new Map<string, number>();
  for (const c of connectors) {
    const k = [c.fromId, c.toId].sort().join('::');
    connPairCounts.set(k, (connPairCounts.get(k) ?? 0) + 1);
  }

  // Multi-selection combined bounding box
  const selectedItemsList = sortedItems.filter((it) => selectedIds.includes(it.id) && it.visible);
  const multiBox =
    selectedItemsList.length > 1
      ? {
          x: Math.min(...selectedItemsList.map((i) => i.x)),
          y: Math.min(...selectedItemsList.map((i) => i.y)),
          maxX: Math.max(...selectedItemsList.map((i) => i.x + i.width)),
          maxY: Math.max(...selectedItemsList.map((i) => i.y + i.height)),
        }
      : null;

  const cursorClass =
    dragMode.kind === 'pan'
      ? 'cursor-grabbing'
      : spacePressed || toolMode === 'hand'
      ? 'cursor-grab'
      : toolMode === 'select'
      ? 'cursor-default'
      : 'cursor-crosshair';

  return (
    <div
      ref={viewportRef}
      onWheel={handleWheel}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => {
        e.preventDefault();
        const pt = toWorldCoords(e.clientX, e.clientY);
        const hit = hitItemAt(pt.x, pt.y);
        if (hit && !selectedIds.includes(hit.id)) {
          onSelectIds([hit.id]);
        }
        onRequestContextMenu({
          clientX: e.clientX,
          clientY: e.clientY,
          worldX: Math.round(pt.x),
          worldY: Math.round(pt.y),
          itemId: hit?.id,
        });
      }}
      className={`relative flex-1 h-full overflow-hidden bg-slate-100 dark:bg-[#080B10] select-none ${cursorClass}`}
    >
      {/* Top Ruler Guide Creator */}
      <div
        data-export-ignore="true"
        onDoubleClick={(e) => {
          e.stopPropagation();
          const pt = toWorldCoords(e.clientX, e.clientY);
          onUpdateGuides([
            ...customGuides,
            { id: `guide-${Date.now()}`, axis: 'y', pos: Math.round(pt.y) },
          ]);
        }}
        title="双击添加水平参考线"
        className="absolute top-0 left-4 right-0 h-3.5 bg-slate-200/80 dark:bg-white/[0.04] border-b border-slate-300 dark:border-white/10 z-20 flex items-center px-3 text-[9px] font-mono text-slate-400 cursor-row-resize"
      >
        <span>H-Ruler · Double-click for Guide</span>
      </div>
      <div
        data-export-ignore="true"
        onDoubleClick={(e) => {
          e.stopPropagation();
          const pt = toWorldCoords(e.clientX, e.clientY);
          onUpdateGuides([
            ...customGuides,
            { id: `guide-${Date.now()}`, axis: 'x', pos: Math.round(pt.x) },
          ]);
        }}
        title="双击添加垂直参考线"
        className="absolute top-3.5 left-0 bottom-0 w-3.5 bg-slate-200/80 dark:bg-white/[0.04] border-r border-slate-300 dark:border-white/10 z-20 cursor-col-resize"
      />

      {/* Transformed Infinite Canvas Layer */}
      <div
        style={{
          transform: `translate(${pan.x + originX * zoom}px, ${pan.y + originY * zoom}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute top-0 left-0"
      >
        <div
          ref={artboardRef}
          style={{
            width: `${artboard.width}px`,
            height: `${artboard.height}px`,
            backgroundColor: artboard.background || '#0F141E',
            backgroundImage: showGrid
              ? `radial-gradient(circle, rgba(148,163,184,0.22) 1px, transparent 1px)`
              : undefined,
            backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : undefined,
          }}
          className="relative rounded-xl border border-slate-700/80 shadow-2xl overflow-hidden"
        >
          {/* Inner Origin Stage Shift (so negative coordinates export/render cleanly inside artboardRef) */}
          <div
            style={{
              transform: `translate(${-originX}px, ${-originY}px)`,
            }}
            className="absolute inset-0"
          >
            {/* Smart Connectors SVG Layer */}
            <svg
              className="absolute top-0 left-0 overflow-visible pointer-events-none"
              style={{ width: 1, height: 1, zIndex: 1 }}
            >
              <defs>
                <marker id="smart-arrow-end" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#60A5FA" />
                </marker>
                <marker id="smart-arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#60A5FA" />
                </marker>
              </defs>
              {connectors.map((conn) => {
                const k = [conn.fromId, conn.toId].sort().join('::');
                const total = connPairCounts.get(k) ?? 1;
                const idx = connPairIndexes.get(k) ?? 0;
                connPairIndexes.set(k, idx + 1);
                const geom = resolveConnectorGeometry(conn, sortedItems, idx, total);
                if (!geom) return null;
                const isSel = selectedConnectorId === conn.id;
                return (
                  <g key={conn.id} className="pointer-events-auto cursor-pointer">
                    <path
                      d={geom.d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onSelectConnectorId(conn.id);
                        onSelectIds([]);
                      }}
                    />
                    <path
                      d={geom.d}
                      fill="none"
                      stroke={isSel ? '#FBBF24' : conn.color || '#60A5FA'}
                      strokeWidth={(conn.strokeWidth || 2) + (isSel ? 1 : 0)}
                      strokeDasharray={conn.dashed ? '6 4' : undefined}
                      markerEnd={conn.arrowKind !== 'none' ? 'url(#smart-arrow-end)' : undefined}
                      markerStart={conn.arrowKind === 'double' ? 'url(#smart-arrow-start)' : undefined}
                    />
                    {conn.label && (
                      <g transform={`translate(${geom.labelPos.x}, ${geom.labelPos.y})`}>
                        <rect x={-26} y={-9} width={52} height={18} rx={4} fill="#0F141E" stroke="#334155" strokeWidth={1} />
                        <text textAnchor="middle" dominantBaseline="central" fill="#E2E8F0" fontSize={10} fontFamily="monospace">
                          {conn.label}
                        </text>
                      </g>
                    )}
                    {isSel && !conn.locked && (
                      <circle
                        data-export-ignore="true"
                        cx={geom.labelPos.x}
                        cy={geom.labelPos.y}
                        r={5}
                        fill="#FBBF24"
                        stroke="#0F141E"
                        strokeWidth={1.5}
                        className="cursor-grab"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setDragMode({
                            kind: 'drag-connector-ctrl',
                            connId: conn.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            origOffset: conn.controlOffset || { dx: 0, dy: 0 },
                            snapshotBefore: structuredClone(artboard),
                          });
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Live connector drawing preview */}
              {dragMode.kind === 'draw-connector' && (
                <line
                  data-export-ignore="true"
                  x1={dragMode.startX}
                  y1={dragMode.startY}
                  x2={dragMode.curX}
                  y2={dragMode.curY}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              )}
            </svg>

            {/* Canvas Elements */}
            {sortedItems.map((item) => {
              if (!item.visible) return null;
              const isSelected = selectedIds.includes(item.id);
              const isInner = innerEditItemId === item.id;
              return (
                <div
                  key={item.id}
                  onPointerDown={(e) => handleItemPointerDown(e, item)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onSelectIds([item.id]);
                    onEnterInnerEdit(item.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!selectedIds.includes(item.id)) onSelectIds([item.id]);
                    const pt = toWorldCoords(e.clientX, e.clientY);
                    onRequestContextMenu({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      worldX: Math.round(pt.x),
                      worldY: Math.round(pt.y),
                      itemId: item.id,
                    });
                  }}
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    width: `${item.width}px`,
                    height: `${item.height}px`,
                    transform: `rotate(${item.rotation}deg)`,
                    zIndex: item.zIndex + 2,
                  }}
                  className={`group absolute ${
                    item.locked || item.aiLocked ? 'cursor-not-allowed' : 'cursor-move'
                  } ${
                    isInner
                      ? 'ring-2 ring-amber-400 rounded-[10px]'
                      : isSelected
                      ? 'ring-2 ring-blue-500 rounded-[10px]'
                      : ''
                  }`}
                >
                  <AlgoComponentRenderer
                    item={item}
                    stepVariables={stepVariables}
                    interactiveGraphDrag={isSelected && item.type === 'graph'}
                    innerEditMode={isInner}
                    activeSubSelection={activeSubSelection}
                    onMoveGraphNode={onMoveGraphNode}
                    onSubSelect={onSubSelect}
                    onSubDoubleClickEdit={onSubDoubleClickEdit}
                    onSubContextMenu={(e, sub) => {
                      const pt = toWorldCoords(e.clientX, e.clientY);
                      onSelectIds([item.id]);
                      onSubSelect(sub);
                      onRequestContextMenu({
                        clientX: e.clientX,
                        clientY: e.clientY,
                        worldX: Math.round(pt.x),
                        worldY: Math.round(pt.y),
                        itemId: item.id,
                        subSelection: sub,
                      });
                    }}
                  />

                  {/* Live Size Readout Badge & Handles (Hidden cleanly in Export) */}
                  {isSelected && (
                    <div
                      data-export-ignore="true"
                      className="absolute -bottom-6 left-0 px-1.5 py-0.5 rounded bg-slate-900/95 border border-blue-500/40 text-[10px] font-mono text-blue-200 whitespace-nowrap tabular-nums pointer-events-none"
                    >
                      {Math.round(item.width)}×{Math.round(item.height)}
                      {item.rotation ? ` · ${item.rotation}°` : ''}
                      {isInner ? ' · 双击编辑内部元素' : ''}
                    </div>
                  )}

                  {isSelected && !item.locked && !item.aiLocked && !isInner && (
                    <>
                      {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((h) => {
                        const posClass: Record<string, string> = {
                          nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
                          n: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                          ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
                          e: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize',
                          se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
                          s: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                          sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
                          w: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize',
                        };
                        return (
                          <div
                            key={h}
                            data-export-ignore="true"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragMode({
                                kind: 'resize',
                                itemId: item.id,
                                handle: h,
                                startX: e.clientX,
                                startY: e.clientY,
                                orig: {
                                  x: item.x,
                                  y: item.y,
                                  width: item.width,
                                  height: item.height,
                                },
                                snapshotBefore: structuredClone(artboard),
                              });
                            }}
                            className={`absolute w-2.5 h-2.5 bg-white border border-blue-600 rounded-xs ${posClass[h]}`}
                          />
                        );
                      })}

                      <div
                        data-export-ignore="true"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setDragMode({
                            kind: 'rotate',
                            itemId: item.id,
                            cx: item.x + item.width / 2,
                            cy: item.y + item.height / 2,
                            snapshotBefore: structuredClone(artboard),
                          });
                        }}
                        title="旋转组件 (按住 Shift 15°吸附)"
                        className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500 border border-white cursor-grab"
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* Combined Multi-Select Outline */}
            {multiBox && (
              <div
                data-export-ignore="true"
                style={{
                  left: `${multiBox.x - 4}px`,
                  top: `${multiBox.y - 4}px`,
                  width: `${multiBox.maxX - multiBox.x + 8}px`,
                  height: `${multiBox.maxY - multiBox.y + 8}px`,
                }}
                className="absolute border border-dashed border-blue-400/70 pointer-events-none z-30"
              />
            )}

            {/* Custom Persistent Guides */}
            {customGuides.map((g) => (
              <div
                key={g.id}
                data-export-ignore="true"
                style={
                  g.axis === 'x'
                    ? { left: `${g.pos}px`, top: `${originY}px`, height: `${artboard.height}px` }
                    : { top: `${g.pos}px`, left: `${originX}px`, width: `${artboard.width}px` }
                }
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onUpdateGuides(customGuides.filter((x) => x.id !== g.id));
                }}
                title="双击删除参考线"
                className={`absolute ${
                  g.axis === 'x' ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'
                } bg-cyan-400/70 z-30`}
              />
            ))}

            {/* Dynamic Smart Alignment Guides */}
            {guides.x !== undefined && (
              <div
                data-export-ignore="true"
                style={{
                  left: `${guides.x}px`,
                  top: `${originY}px`,
                  height: `${artboard.height}px`,
                  backgroundColor: guideColor,
                }}
                className="absolute w-px pointer-events-none z-40"
              />
            )}
            {guides.y !== undefined && (
              <div
                data-export-ignore="true"
                style={{
                  top: `${guides.y}px`,
                  left: `${originX}px`,
                  width: `${artboard.width}px`,
                  backgroundColor: guideColor,
                }}
                className="absolute h-px pointer-events-none z-40"
              />
            )}
            {guides.spacingLabel && guides.x !== undefined && (
              <div
                data-export-ignore="true"
                style={{ left: `${guides.x + 8}px`, top: `${(guides.y ?? 40) + 8}px` }}
                className="absolute px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono z-40 pointer-events-none"
              >
                {guides.spacingLabel}
              </div>
            )}

            {/* Marquee Selection Box */}
            {dragMode.kind === 'marquee' && (
              <div
                data-export-ignore="true"
                style={{
                  left: `${Math.min(dragMode.startX, dragMode.curX)}px`,
                  top: `${Math.min(dragMode.startY, dragMode.curY)}px`,
                  width: `${Math.abs(dragMode.curX - dragMode.startX)}px`,
                  height: `${Math.abs(dragMode.curY - dragMode.startY)}px`,
                }}
                className="absolute border border-blue-400 bg-blue-500/15 pointer-events-none z-50"
              />
            )}

            {/* Shape Draw Ghost Preview */}
            {dragMode.kind === 'draw-shape' && (
              <div
                data-export-ignore="true"
                style={{
                  left: `${Math.min(dragMode.startX, dragMode.curX)}px`,
                  top: `${Math.min(dragMode.startY, dragMode.curY)}px`,
                  width: `${Math.max(20, Math.abs(dragMode.curX - dragMode.startX))}px`,
                  height: `${Math.max(20, Math.abs(dragMode.curY - dragMode.startY))}px`,
                  borderRadius: dragMode.tool === 'circle' ? '9999px' : '10px',
                }}
                className="absolute border-2 border-dashed border-blue-400 bg-blue-500/15 pointer-events-none z-50"
              />
            )}

            {/* Live Ink Draw Stroke Preview */}
            {dragMode.kind === 'draw-ink' && dragMode.points.length >= 2 && (
              <svg
                data-export-ignore="true"
                className="absolute top-0 left-0 overflow-visible pointer-events-none z-50"
                style={{ width: 1, height: 1 }}
              >
                <path
                  d={dragMode.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                  fill="none"
                  stroke={dragMode.isHighlighter ? '#FACC15' : '#F59E0B'}
                  strokeWidth={dragMode.isHighlighter ? 14 : 3}
                  strokeLinecap="round"
                  opacity={dragMode.isHighlighter ? 0.45 : 1}
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Bottom-right Zoom & Fit Controls */}
      <div
        data-export-ignore="true"
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/95 border border-white/10 text-xs text-slate-200 shadow-lg z-30"
      >
        <button
          type="button"
          onClick={() =>
            onZoomPanChange(Math.max(0.2, Number((zoom - 0.15).toFixed(2))), pan)
          }
          className="px-1.5 py-0.5 hover:bg-white/10 rounded cursor-pointer"
        >
          -
        </button>
        <span className="w-12 text-center font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() =>
            onZoomPanChange(Math.min(3.0, Number((zoom + 0.15).toFixed(2))), pan)
          }
          className="px-1.5 py-0.5 hover:bg-white/10 rounded cursor-pointer"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            const next = computeFitViewTransform(
              { x: originX, y: originY, width: artboard.width, height: artboard.height },
              viewportSize
            );
            onZoomPanChange(next.zoom, next.pan);
          }}
          className="px-1.5 py-0.5 text-[11px] text-slate-400 hover:text-white cursor-pointer"
          title="适应全画板 (Shift+1)"
        >
          适应
        </button>
        <button
          type="button"
          onClick={() => onZoomPanChange(1, { x: 40 - originX, y: 32 - originY })}
          className="px-1.5 py-0.5 text-[11px] text-slate-400 hover:text-white font-mono cursor-pointer"
          title="100% 原始尺寸 (Shift+0)"
        >
          100%
        </button>
      </div>
    </div>
  );
};
