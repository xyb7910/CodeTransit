import assert from 'node:assert/strict';
import type { Artboard } from '../src/types/algorithmStudio';
import { createDefaultAlgoItem, ALGORITHM_TEMPLATES } from '../src/constants/algorithmTemplates';
import {
  applyCopiedStyleToItems,
  applySemanticSubEdit,
  cloneItemsWithNewIds,
  createConnectorBetween,
  deleteItemsWithBoundConnectors,
  groupSelectedItems,
  invertSelectedIds,
  reorderLayerZ,
  selectAllItemIds,
  ungroupSelectedItems,
} from '../src/utils/canvasCommands';
import {
  computeAutoFitArtboardBounds,
  computeFitViewTransform,
  computeItemTransformedBounds,
  detectArtboardOverflow,
  resolveConnectorGeometry,
  zoomAtCursor,
} from '../src/utils/canvasViewport';
import {
  DEFAULT_SHORTCUTS,
  detectShortcutConflicts,
  formatShortcutCombo,
  matchShortcut,
} from '../src/utils/shortcutRegistry';

function run() {
  console.log('=== Algorithm Studio 2.1 Verification Suite ===');

  // 1. New 2.1 Component Factories
  const rect = createDefaultAlgoItem('rect-shape', 100, 80, 'rect-1');
  const circle = createDefaultAlgoItem('circle-shape', 400, 120, 'circle-1');
  const stroke = createDefaultAlgoItem('freehand-stroke', 40, 200, 'ink-1');
  const codeBlock = createDefaultAlgoItem('code-block', 200, 260, 'code-1');
  assert.equal(rect.payload.kind, 'shape');
  assert.equal(circle.payload.kind, 'shape');
  assert.equal(stroke.payload.kind, 'freehand');
  assert.equal(codeBlock.payload.kind, 'codeblock');

  // 2. Multi-select, Invert, Clone, Group/Ungroup, Z-Order, Style Clipboard
  let board: Artboard = {
    id: 'ab-test',
    name: 'Test Board',
    width: 980,
    height: 620,
    background: '#0F141E',
    items: [rect, circle, codeBlock],
    connectors: [createConnectorBetween(rect.id, circle.id)],
    groups: [],
    guides: [],
  };

  const allIds = selectAllItemIds(board);
  assert.deepEqual(allIds, ['rect-1', 'circle-1', 'code-1']);
  assert.deepEqual(invertSelectedIds(board, ['rect-1']), ['circle-1', 'code-1']);

  const cloned = cloneItemsWithNewIds([rect], 24, 24, 5);
  assert.equal(cloned.length, 1);
  assert.notEqual(cloned[0].id, rect.id);
  assert.equal(cloned[0].x, 124);

  board = groupSelectedItems(board, ['rect-1', 'circle-1'], 'Test Group');
  assert.equal(board.groups?.length, 1);
  assert.equal(board.items[0].groupId, board.groups?.[0].id);
  assert.equal(board.items[1].groupId, board.groups?.[0].id);

  board = ungroupSelectedItems(board, ['rect-1', 'circle-1']);
  assert.equal(board.groups?.length, 0);
  assert.equal(board.items[0].groupId, undefined);

  const zTop = reorderLayerZ(board.items, ['rect-1'], 'top');
  assert.equal(zTop.find((x) => x.id === 'rect-1')?.zIndex, 3);
  const zBottom = reorderLayerZ(zTop, ['rect-1'], 'bottom');
  assert.equal(zBottom.find((x) => x.id === 'rect-1')?.zIndex, 1);

  const styled = applyCopiedStyleToItems(board.items, ['circle-1'], {
    background: '#1E3A8A',
    borderRadius: 18,
  });
  assert.equal(styled.find((x) => x.id === 'circle-1')?.style.background, '#1E3A8A');

  // 3. SmartConnector Tracking & Cascading Cleanup
  const geomBefore = resolveConnectorGeometry(board.connectors![0], board.items);
  assert.ok(geomBefore);
  const movedItems = board.items.map((it) => (it.id === 'circle-1' ? { ...it, x: 560 } : it));
  const geomAfter = resolveConnectorGeometry(board.connectors![0], movedItems);
  assert.ok(geomAfter);
  assert.ok(geomAfter.end.x > geomBefore.end.x, 'Connector endpoint tracks moved node');

  const boardAfterDel = deleteItemsWithBoundConnectors(board, ['circle-1']);
  assert.equal(boardAfterDel.items.length, 2);
  assert.equal(boardAfterDel.connectors?.length, 0, 'Deleting node cascades to clean bound connectors');

  // 4. Cursor-Centered Zoom Zero-Drift Invariant
  const cursorX = 437;
  const cursorY = 289;
  const startZoom = 0.85;
  const startPan = { x: 42, y: -18 };
  const logicalBeforeX = (cursorX - startPan.x) / startZoom;
  const logicalBeforeY = (cursorY - startPan.y) / startZoom;
  const zoomed = zoomAtCursor(startZoom, startPan, 1.45, cursorX, cursorY);
  const logicalAfterX = (cursorX - zoomed.pan.x) / zoomed.zoom;
  const logicalAfterY = (cursorY - zoomed.pan.y) / zoomed.zoom;
  assert.ok(Math.abs(logicalAfterX - logicalBeforeX) < 1e-6, 'Zero horizontal cursor drift');
  assert.ok(Math.abs(logicalAfterY - logicalBeforeY) < 1e-6, 'Zero vertical cursor drift');

  // 5. Adaptive Artboard Negative Coords + Rotation Bounds + Overflow Detection
  const negRotItem = createDefaultAlgoItem('rect-shape', -120, -90, 'neg-1');
  negRotItem.rotation = 45;
  const rotBounds = computeItemTransformedBounds(negRotItem);
  assert.ok(rotBounds.width > negRotItem.width, 'Rotated bounding box expands for 45deg');

  const autoBoard = computeAutoFitArtboardBounds({
    ...board,
    items: [negRotItem, circle],
  });
  assert.ok(autoBoard.originX < -120, 'Auto-fit artboard encapsulates negative originX');
  assert.ok(autoBoard.originY < -90, 'Auto-fit artboard encapsulates negative originY');

  const fixedOverflow = detectArtboardOverflow({
    ...board,
    width: 300,
    height: 300,
    items: [negRotItem, circle],
  });
  assert.equal(fixedOverflow.hasOverflow, true);
  assert.equal(fixedOverflow.overflowingIds.length, 2);

  const fitView = computeFitViewTransform(
    { x: autoBoard.originX, y: autoBoard.originY, width: autoBoard.width, height: autoBoard.height },
    { width: 1000, height: 700 }
  );
  assert.ok(fitView.zoom >= 0.2 && fitView.zoom <= 2.0);

  // 6. ShortcutRegistry IME Guard, Focus Guard, Platform Formatting & Conflict Detection
  const imeBlocked = matchShortcut(
    {
      key: 'v',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      isComposing: true,
      keyCode: 229,
      target: null,
    },
    DEFAULT_SHORTCUTS,
    ['canvas', 'global']
  );
  assert.equal(imeBlocked, null, 'CJK IME composition blocks single-key tool shortcuts');

  const inputFocusedBlocked = matchShortcut(
    {
      key: 'r',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      target: { tagName: 'INPUT' } as unknown as EventTarget,
    },
    DEFAULT_SHORTCUTS,
    ['canvas', 'global']
  );
  assert.equal(inputFocusedBlocked, null, 'Text input focus blocks single-key tool shortcuts');

  const modSAllowed = matchShortcut(
    {
      key: 's',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      target: { tagName: 'TEXTAREA' } as unknown as EventTarget,
    },
    DEFAULT_SHORTCUTS,
    ['canvas', 'global']
  );
  assert.equal(modSAllowed?.id, 'save');

  assert.equal(formatShortcutCombo('mod+shift+z', true), '⌘ ⇧ Z');
  assert.equal(formatShortcutCombo('mod+shift+z', false), 'Ctrl + Shift + Z');

  const baseConflicts = detectShortcutConflicts(DEFAULT_SHORTCUTS);
  assert.equal(baseConflicts.length, 0, 'Default shortcuts have zero scope/combo conflicts');

  const fakeConflict = detectShortcutConflicts([
    ...DEFAULT_SHORTCUTS,
    {
      id: 'dup-conflict',
      scope: 'canvas',
      combo: 'v',
      labelZh: '冲突测试',
      labelEn: 'Conflict',
      category: 'tools',
      priority: 1,
    },
  ]);
  assert.equal(fakeConflict.length, 1);

  // 7. Edit Mode Semantics (data -> traceStale, step -> manual snapshot override)
  const { scene } = ALGORITHM_TEMPLATES[0].buildScene(ALGORITHM_TEMPLATES[0].defaultParams, 'Yanpb');
  const arrItem = scene.artboards[0].items.find((it) => it.payload.kind === 'array');
  assert.ok(arrItem);

  const dataMutated = applySemanticSubEdit(
    scene,
    arrItem.id,
    { kind: 'array-set', index: 0, value: 999 },
    'data'
  );
  assert.equal(dataMutated.traceStale, true, 'Data mode edit marks traceStale = true');

  const stepMutated = applySemanticSubEdit(
    scene,
    arrItem.id,
    { kind: 'array-set', index: 0, value: 777 },
    'step'
  );
  assert.equal(stepMutated.traceMode, 'manual', 'Step override marks traceMode = manual');
  const snapPayload = stepMutated.steps[stepMutated.currentStepIndex].snapshot.artboardItems[arrItem.id];
  assert.equal(snapPayload.kind, 'array');
  if (snapPayload.kind === 'array') {
    assert.equal(snapPayload.data.items[0], 777);
  }

  console.log('ALL STUDIO 2.1 VERIFICATION CHECKS PASSED!');
}

run();
