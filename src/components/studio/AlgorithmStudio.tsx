import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowUpRight,
  Bot,
  Circle,
  Command,
  Copy,
  Download,
  FileCode2,
  GitMerge,
  Grid,
  Group,
  Hand,
  Highlighter,
  Keyboard,
  LayoutGrid,
  Magnet,
  Maximize2,
  Minimize2,
  MousePointer2,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PenTool,
  Plus,
  Presentation,
  Redo2,
  Save,
  Scan,
  Share2,
  Square,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  Workflow,
} from 'lucide-react';
import {
  ALGORITHM_TEMPLATES,
  AlgoTemplateDefinition,
  AlgoTemplateInputParams,
  createDefaultAlgoItem,
  createInitialAlgorithmScene,
} from '../../constants/algorithmTemplates';
import { AlgorithmSceneDSL } from '../../types/algorithmDsl';
import {
  AlgoAssetItem,
  AlgoCanvasItem,
  AlgoComponentType,
  AlgoStep,
  Artboard,
  CanvasToolMode,
  EditSemanticMode,
  InnerSubSelection,
  SceneSchema,
  SmartConnector,
  StudioLayoutPrefs,
  TraceSourceMode,
} from '../../types/algorithmStudio';
import { Locale, SampleCase } from '../../types/workspace';
import {
  CopiedStyle,
  SemanticSubEditAction,
  applyCopiedStyleToItems,
  applySemanticSubEdit,
  cloneItemsWithNewIds,
  deleteItemsWithBoundConnectors,
  groupSelectedItems,
  invertSelectedIds,
  reorderLayerZ,
  selectAllItemIds,
  ungroupSelectedItems,
} from '../../utils/canvasCommands';
import {
  computeAutoFitArtboardBounds,
  computeFitViewTransform,
  computeItemTransformedBounds,
} from '../../utils/canvasViewport';
import { compileDslToScene } from '../../utils/dslInterpreter';
import { migrateSceneSchema } from '../../utils/dslSchema';
import {
  ShortcutBinding,
  ShortcutScope,
  formatShortcutCombo,
  loadUserShortcuts,
  matchShortcut,
  saveUserShortcuts,
} from '../../utils/shortcutRegistry';
import { smartArrangeArtboard } from '../../utils/smartLayout';
import { StudioExportTarget } from '../../utils/studioExport';
import {
  deleteAlgoAsset,
  loadActiveStudioScene,
  loadAlgoAssets,
  loadStudioPrefs,
  saveActiveStudioScene,
  saveAlgoAsset,
  saveSceneSnapshot,
  saveStudioPrefs,
} from '../../utils/studioStorage';
import { AICopilotDrawer } from './AICopilotDrawer';
import { AlgoComponentRenderer } from './AlgoComponentRenderer';
import { AlgorithmBuilderModal } from './AlgorithmBuilderModal';
import { CanvasContextMenu } from './CanvasContextMenu';
import { CommandPaletteModal, PaletteCommandItem } from './CommandPaletteModal';
import { DslEditorModal } from './DslEditorModal';
import { PresentationOverlay } from './PresentationOverlay';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import { CanvasContextMenuRequest, StudioCanvas } from './StudioCanvas';
import { StudioExportModal } from './StudioExportModal';
import { StudioLeftPanel } from './StudioLeftPanel';
import { StudioRightPanel } from './StudioRightPanel';
import { StudioTimeline } from './StudioTimeline';
import { UserAIConfig } from '../../types/aiConfig';
import { hasConfiguredAiKey } from '../../utils/aiConfig';

interface AlgorithmStudioProps {
  locale: Locale;
  authorName: string;
  aiConfig: UserAIConfig;
  codeStudioSamples: SampleCase[];
  externalSceneSignal?: SceneSchema | null;
  openExportSignal?: number;
  onOpenApiKeyModal: () => void;
  onSyncSampleToCodeStudio: (inputText: string, label: string) => void;
  onSyncCodeToCodeStudio?: (code: string, title: string) => void;
  onShareViaTransit: (scene: SceneSchema) => void;
  onNotify: (msg: string) => void;
}

const DEFAULT_PREFS: StudioLayoutPrefs = {
  leftOpen: true,
  rightOpen: true,
  bottomOpen: true,
  leftWidth: 270,
  rightWidth: 320,
  bottomHeight: 196,
  showGrid: true,
  snapToGrid: true,
  gridSize: 16,
  snapThreshold: 6,
  guideColor: '#F43F5E',
};

const TOOL_BUTTONS: Array<{
  id: CanvasToolMode;
  key: string;
  labelZh: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'select', key: 'V', labelZh: '选择工具', labelEn: 'Select', icon: MousePointer2 },
  { id: 'hand', key: 'H', labelZh: '抓手平移', labelEn: 'Hand', icon: Hand },
  { id: 'rect', key: 'R', labelZh: '矩形框', labelEn: 'Rectangle', icon: Square },
  { id: 'circle', key: 'O', labelZh: '椭圆框', labelEn: 'Circle', icon: Circle },
  { id: 'arrow', key: 'A', labelZh: '箭头', labelEn: 'Arrow', icon: ArrowUpRight },
  { id: 'connector', key: 'L', labelZh: '智能连线', labelEn: 'Connector', icon: GitMerge },
  { id: 'text', key: 'T', labelZh: '文本框', labelEn: 'Text', icon: Type },
  { id: 'brush', key: 'P', labelZh: '画笔标注', labelEn: 'Brush', icon: PenTool },
  { id: 'highlight', key: 'M', labelZh: '荧光重点', labelEn: 'Highlighter', icon: Highlighter },
];

export const AlgorithmStudio: React.FC<AlgorithmStudioProps> = ({
  locale,
  authorName,
  aiConfig,
  codeStudioSamples,
  externalSceneSignal,
  openExportSignal = 0,
  onOpenApiKeyModal,
  onSyncSampleToCodeStudio,
  onShareViaTransit,
  onNotify,
}) => {
  const zh = locale === 'zh-CN';
  const hasAiKey = hasConfiguredAiKey(aiConfig);
  const [scene, setScene] = useState<SceneSchema>(() => createInitialAlgorithmScene(authorName));
  const [history, setHistory] = useState<SceneSchema[]>([]);
  const [future, setFuture] = useState<SceneSchema[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [prefs, setPrefs] = useState<StudioLayoutPrefs>(DEFAULT_PREFS);
  const [assets, setAssets] = useState<AlgoAssetItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<CanvasToolMode>('select');
  const [editMode, setEditMode] = useState<EditSemanticMode>('visual');
  const [innerEditItemId, setInnerEditItemId] = useState<string | null>(null);
  const [activeSubSelection, setActiveSubSelection] = useState<InnerSubSelection | null>(null);
  const [clipboard, setClipboard] = useState<AlgoCanvasItem[]>([]);
  const [copiedStyle, setCopiedStyle] = useState<CopiedStyle | null>(null);
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>(() => loadUserShortcuts());

  const [zoom, setZoom] = useState(0.86);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [viewportRect, setViewportRect] = useState({ width: 900, height: 600 });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAiCopilot, setShowAiCopilot] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showDslEditor, setShowDslEditor] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuRequest | null>(null);
  const [activeDsl, setActiveDsl] = useState<AlgorithmSceneDSL | null>(null);

  const artboardRef = useRef<HTMLDivElement | null>(null);
  const selectedExportRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef<'left' | 'right' | 'bottom' | null>(null);

  // Hydrate Studio IndexedDB
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [savedScene, savedPrefs, savedAssets] = await Promise.all([
        loadActiveStudioScene(),
        loadStudioPrefs(),
        loadAlgoAssets(),
      ]);
      if (!mounted) return;
      if (savedScene && savedScene.artboards?.length > 0) {
        setScene(migrateSceneSchema(savedScene));
      }
      setPrefs({ ...DEFAULT_PREFS, ...savedPrefs });
      setAssets(savedAssets);
      setHydrated(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load external scene if provided from Transit/CodeStudio
  useEffect(() => {
    if (externalSceneSignal) {
      setScene(migrateSceneSchema(externalSceneSignal));
      setSelectedIds([]);
      setSelectedConnectorId(null);
      setPlaying(false);
    }
  }, [externalSceneSignal]);

  // Open Studio export modal when triggered from global header CTA
  useEffect(() => {
    if (openExportSignal > 0) {
      setShowExportModal(true);
    }
  }, [openExportSignal]);

  // Immediately close AI Copilot if API Key is cleared
  useEffect(() => {
    if (!hasAiKey && showAiCopilot) {
      setShowAiCopilot(false);
    }
  }, [hasAiKey, showAiCopilot]);

  // Persist active scene & prefs
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      void saveActiveStudioScene(scene);
    }, 300);
    return () => clearTimeout(t);
  }, [scene, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void saveStudioPrefs(prefs);
  }, [prefs, hydrated]);

  const commitScene = useCallback((updater: (prev: SceneSchema) => SceneSchema) => {
    setScene((prev) => {
      const next = updater(prev);
      setHistory((h) => [...h.slice(-39), structuredClone(prev)]);
      setFuture([]);
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setScene((cur) => {
        setFuture((f) => [structuredClone(cur), ...f]);
        return prev;
      });
      return h.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setScene((cur) => {
        setHistory((h) => [...h, structuredClone(cur)]);
        return next;
      });
      return f.slice(1);
    });
  }, []);

  const activeBoard =
    scene.artboards.find((a) => a.id === scene.activeArtboardId) || scene.artboards[0];

  const syncAutoFitIfEnabled = (board: Artboard): Artboard => {
    if (board.mode !== 'auto-fit') return board;
    const fitted = computeAutoFitArtboardBounds(board);
    return { ...board, ...fitted };
  };

  const updateActiveBoard = useCallback(
    (updater: (ab: Artboard) => Artboard, pushUndo = false) => {
      const apply = (prev: SceneSchema): SceneSchema => ({
        ...prev,
        updatedAt: Date.now(),
        artboards: prev.artboards.map((ab) => {
          if (ab.id !== prev.activeArtboardId) return ab;
          const updated = updater(ab);
          return syncAutoFitIfEnabled(updated);
        }),
      });
      if (pushUndo) commitScene(apply);
      else setScene(apply);
    },
    [commitScene]
  );

  const updateActiveBoardItems = useCallback(
    (items: AlgoCanvasItem[], pushUndo = false) => {
      updateActiveBoard((ab) => ({ ...ab, items }), pushUndo);
    },
    [updateActiveBoard]
  );

  // Playback step switch: intentionally does NOT mutate zoom, pan, or artboard geometry (zero camera jitter)
  const selectStep = useCallback((index: number) => {
    setScene((prev) => {
      if (prev.steps.length === 0) return prev;
      const clamped = Math.max(0, Math.min(prev.steps.length - 1, index));
      const step = prev.steps[clamped];
      if (!step) return prev;
      const snapItems = step.snapshot.artboardItems;
      return {
        ...prev,
        currentStepIndex: clamped,
        artboards: prev.artboards.map((ab) =>
          ab.id === prev.activeArtboardId
            ? {
                ...ab,
                items: ab.items.map((it) =>
                  snapItems[it.id] ? { ...it, payload: structuredClone(snapItems[it.id]) } : it
                ),
              }
            : ab
        ),
      };
    });
  }, []);

  // Playback interval
  useEffect(() => {
    if (!playing || scene.steps.length <= 1) return;
    const curStep = scene.steps[scene.currentStepIndex];
    const waitMs = Math.max(120, Math.round((curStep?.durationMs || 700) / speed));
    const timer = setTimeout(() => {
      if (scene.currentStepIndex + 1 < scene.steps.length) {
        selectStep(scene.currentStepIndex + 1);
      } else {
        setPlaying(false);
      }
    }, waitMs);
    return () => clearTimeout(timer);
  }, [playing, scene.currentStepIndex, scene.steps, speed, selectStep]);

  // Panel drag resizing
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizingRef.current) return;
      if (resizingRef.current === 'left') {
        setPrefs((p) => ({ ...p, leftWidth: Math.max(210, Math.min(420, e.clientX)) }));
      } else if (resizingRef.current === 'right') {
        setPrefs((p) => ({
          ...p,
          rightWidth: Math.max(250, Math.min(480, window.innerWidth - e.clientX)),
        }));
      } else if (resizingRef.current === 'bottom') {
        setPrefs((p) => ({
          ...p,
          bottomHeight: Math.max(130, Math.min(340, window.innerHeight - e.clientY)),
        }));
      }
    };
    const onUp = () => {
      resizingRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const handleFitContent = useCallback(() => {
    const ox = activeBoard.originX ?? 0;
    const oy = activeBoard.originY ?? 0;
    const next = computeFitViewTransform(
      { x: ox, y: oy, width: activeBoard.width, height: activeBoard.height },
      viewportRect
    );
    setZoom(next.zoom);
    setPan(next.pan);
  }, [activeBoard, viewportRect]);

  const handleFitSelection = useCallback(() => {
    const sel = activeBoard.items.filter((it) => selectedIds.includes(it.id) && it.visible);
    if (sel.length === 0) {
      handleFitContent();
      return;
    }
    const boxes = sel.map(computeItemTransformedBounds);
    const minX = Math.min(...boxes.map((b) => b.minX));
    const minY = Math.min(...boxes.map((b) => b.minY));
    const maxX = Math.max(...boxes.map((b) => b.maxX));
    const maxY = Math.max(...boxes.map((b) => b.maxY));
    const next = computeFitViewTransform(
      { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      viewportRect,
      48
    );
    setZoom(next.zoom);
    setPan(next.pan);
  }, [activeBoard.items, selectedIds, viewportRect, handleFitContent]);

  const handleZoom100 = useCallback(() => {
    const ox = activeBoard.originX ?? 0;
    const oy = activeBoard.originY ?? 0;
    setZoom(1);
    setPan({ x: 40 - ox, y: 32 - oy });
  }, [activeBoard]);

  const handleLoadTemplate = (tpl: AlgoTemplateDefinition, params: AlgoTemplateInputParams) => {
    setPlaying(false);
    const { scene: built, error } = tpl.buildScene(params, authorName);
    if (error) {
      onNotify(error);
    } else {
      onNotify(
        zh
          ? `已加载「${tpl.nameZh}」，生成 ${built.steps.length} 个执行步骤`
          : `Loaded ${tpl.nameEn} (${built.steps.length} steps)`
      );
    }
    commitScene(() => built);
    setSelectedIds([]);
  };

  const handleAddComponent = (type: AlgoComponentType) => {
    const offset = (activeBoard.items.length * 24) % 160;
    const item = createDefaultAlgoItem(type, 60 + offset, 60 + offset);
    item.zIndex = activeBoard.items.length + 1;
    updateActiveBoardItems([...activeBoard.items, item], true);
    setSelectedIds([item.id]);
  };

  const handleAlign = useCallback(
    (mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => {
      const sel = activeBoard.items.filter((it) => selectedIds.includes(it.id));
      if (sel.length === 0) return;
      const ox = activeBoard.originX ?? 0;
      const oy = activeBoard.originY ?? 0;
      const minX = sel.length === 1 ? ox : Math.min(...sel.map((s) => s.x));
      const maxX = sel.length === 1 ? ox + activeBoard.width : Math.max(...sel.map((s) => s.x + s.width));
      const minY = sel.length === 1 ? oy : Math.min(...sel.map((s) => s.y));
      const maxY = sel.length === 1 ? oy + activeBoard.height : Math.max(...sel.map((s) => s.y + s.height));
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      updateActiveBoardItems(
        activeBoard.items.map((it) => {
          if (!selectedIds.includes(it.id) || it.locked) return it;
          if (mode === 'left') return { ...it, x: Math.round(minX) };
          if (mode === 'right') return { ...it, x: Math.round(maxX - it.width) };
          if (mode === 'centerX') return { ...it, x: Math.round(midX - it.width / 2) };
          if (mode === 'top') return { ...it, y: Math.round(minY) };
          if (mode === 'bottom') return { ...it, y: Math.round(maxY - it.height) };
          return { ...it, y: Math.round(midY - it.height / 2) };
        }),
        true
      );
    },
    [activeBoard, selectedIds, updateActiveBoardItems]
  );

  const handleDistribute = useCallback(
    (axis: 'h' | 'v') => {
      const sel = activeBoard.items.filter((it) => selectedIds.includes(it.id) && !it.locked);
      if (sel.length < 3) return;
      if (axis === 'h') {
        const sorted = [...sel].sort((a, b) => a.x - b.x);
        const first = sorted[0].x;
        const last = sorted[sorted.length - 1].x;
        const step = (last - first) / (sorted.length - 1);
        const map = new Map(sorted.map((s, i) => [s.id, Math.round(first + i * step)]));
        updateActiveBoardItems(
          activeBoard.items.map((it) => (map.has(it.id) ? { ...it, x: map.get(it.id)! } : it)),
          true
        );
      } else {
        const sorted = [...sel].sort((a, b) => a.y - b.y);
        const first = sorted[0].y;
        const last = sorted[sorted.length - 1].y;
        const step = (last - first) / (sorted.length - 1);
        const map = new Map(sorted.map((s, i) => [s.id, Math.round(first + i * step)]));
        updateActiveBoardItems(
          activeBoard.items.map((it) => (map.has(it.id) ? { ...it, y: map.get(it.id)! } : it)),
          true
        );
      }
    },
    [activeBoard.items, selectedIds, updateActiveBoardItems]
  );

  const handleAutoLayout = useCallback(() => {
    const next = smartArrangeArtboard(activeBoard.items, activeBoard.width, activeBoard.height);
    updateActiveBoardItems(next, true);
    onNotify(zh ? '已完成智能防重叠分区排版' : 'Smart non-overlapping layout applied');
  }, [activeBoard, updateActiveBoardItems, onNotify, zh]);

  const handleGroupToggle = useCallback(
    (group: boolean) => {
      if (selectedIds.length === 0) return;
      updateActiveBoard(
        (ab) => (group ? groupSelectedItems(ab, selectedIds) : ungroupSelectedItems(ab, selectedIds)),
        true
      );
    },
    [selectedIds, updateActiveBoard]
  );

  const handleCopySelected = useCallback(() => {
    const sel = activeBoard.items.filter((it) => selectedIds.includes(it.id));
    if (sel.length === 0) return;
    setClipboard(structuredClone(sel));
    onNotify(zh ? `已复制 ${sel.length} 个元素` : `Copied ${sel.length} items`);
  }, [activeBoard.items, selectedIds, onNotify, zh]);

  const handleCutSelected = useCallback(() => {
    const sel = activeBoard.items.filter((it) => selectedIds.includes(it.id) && !it.locked);
    if (sel.length === 0) return;
    setClipboard(structuredClone(sel));
    updateActiveBoard((ab) => deleteItemsWithBoundConnectors(ab, sel.map((s) => s.id)), true);
    setSelectedIds([]);
  }, [activeBoard.items, selectedIds, updateActiveBoard]);

  const handlePaste = useCallback(
    (inPlace = false) => {
      if (clipboard.length === 0) return;
      const zBase = activeBoard.items.reduce((m, it) => Math.max(m, it.zIndex), 0);
      const pasted = cloneItemsWithNewIds(clipboard, inPlace ? 0 : 24, inPlace ? 0 : 24, zBase);
      updateActiveBoardItems([...activeBoard.items, ...pasted], true);
      setSelectedIds(pasted.map((p) => p.id));
    },
    [clipboard, activeBoard.items, updateActiveBoardItems]
  );

  const handleDuplicateSelected = useCallback(() => {
    const sel = activeBoard.items.filter((it) => selectedIds.includes(it.id));
    if (sel.length === 0) return;
    const zBase = activeBoard.items.reduce((m, it) => Math.max(m, it.zIndex), 0);
    const copies = cloneItemsWithNewIds(sel, 24, 24, zBase);
    updateActiveBoardItems([...activeBoard.items, ...copies], true);
    setSelectedIds(copies.map((c) => c.id));
  }, [activeBoard.items, selectedIds, updateActiveBoardItems]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedConnectorId) {
      updateActiveBoard(
        (ab) => ({
          ...ab,
          connectors: (ab.connectors || []).filter((c) => c.id !== selectedConnectorId),
        }),
        true
      );
      setSelectedConnectorId(null);
      return;
    }
    if (selectedIds.length === 0) return;
    updateActiveBoard((ab) => deleteItemsWithBoundConnectors(ab, selectedIds), true);
    setSelectedIds([]);
    setInnerEditItemId(null);
    setActiveSubSelection(null);
  }, [selectedConnectorId, selectedIds, updateActiveBoard]);

  const handleMoveGraphNode = (itemId: string, nodeId: string, x: number, y: number) => {
    setScene((prev) => ({
      ...prev,
      artboards: prev.artboards.map((ab) =>
        ab.id === prev.activeArtboardId
          ? {
              ...ab,
              items: ab.items.map((it) => {
                if (it.id !== itemId || it.payload.kind !== 'graph') return it;
                return {
                  ...it,
                  payload: {
                    kind: 'graph',
                    data: {
                      ...it.payload.data,
                      layout: 'manual',
                      nodes: it.payload.data.nodes.map((nd) =>
                        nd.id === nodeId ? { ...nd, x, y } : nd
                      ),
                    },
                  },
                };
              }),
            }
          : ab
      ),
    }));
  };

  const handleSemanticAction = useCallback(
    (itemId: string, action: SemanticSubEditAction) => {
      commitScene((prev) => applySemanticSubEdit(prev, itemId, action, editMode));
    },
    [commitScene, editMode]
  );

  const handleRecalculateTrace = useCallback(() => {
    if (activeDsl) {
      const res = compileDslToScene(activeDsl, authorName);
      if (res.ok && res.scene) {
        commitScene(() => ({ ...res.scene!, traceStale: false, traceStaleReason: undefined }));
        onNotify(zh ? '已基于最新规则重新推演轨迹' : 'Recalculated trace from DSL');
        return;
      }
    }
    const tpl = ALGORITHM_TEMPLATES.find((t) => t.id === scene.templateId);
    if (tpl) {
      const { scene: built } = tpl.buildScene(tpl.defaultParams, authorName);
      commitScene(() => ({ ...built, traceStale: false, traceStaleReason: undefined }));
      onNotify(zh ? `已重新计算「${tpl.nameZh}」执行轨迹` : 'Recalculated template trace');
      return;
    }
    commitScene((prev) => ({ ...prev, traceStale: false, traceStaleReason: undefined }));
  }, [activeDsl, authorName, commitScene, onNotify, scene.templateId, zh]);

  const handleInsertKeyframe = () => {
    const snapMap: Record<string, AlgoCanvasItem['payload']> = {};
    for (const it of activeBoard.items) snapMap[it.id] = structuredClone(it.payload);
    const nextIdx = scene.steps.length;
    const newStep: AlgoStep = {
      id: `step-manual-${Date.now()}`,
      index: nextIdx,
      title: zh ? `关键帧 #${nextIdx + 1}` : `Keyframe #${nextIdx + 1}`,
      explanation: zh ? '手动记录的画布状态关键帧' : 'Manual canvas snapshot keyframe',
      codeLines: [],
      durationMs: 750,
      animationStyle: 'smooth',
      highlights: {},
      events: [],
      snapshot: {
        artboardItems: snapMap,
        variables: scene.steps[scene.currentStepIndex]?.snapshot.variables || [],
      },
    };
    commitScene((prev) => ({
      ...prev,
      traceMode: 'manual',
      traceSource: 'manual',
      steps: [...prev.steps, newStep],
      currentStepIndex: prev.steps.length,
    }));
  };

  const handleImportExternalTrace = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText) as {
        steps?: Array<{
          title?: string;
          explanation?: string;
          codeLines?: number[];
          variables?: Array<{ name: string; value: string }>;
        }>;
      };
      if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
        onNotify(zh ? '外部 Trace JSON 格式需包含非空 steps 数组' : 'Invalid Trace JSON');
        return;
      }
      const baseSnap: Record<string, AlgoCanvasItem['payload']> = {};
      for (const it of activeBoard.items) baseSnap[it.id] = structuredClone(it.payload);

      const importedSteps: AlgoStep[] = parsed.steps.map((st, idx) => ({
        id: `ext-step-${idx}-${Date.now()}`,
        index: idx,
        title: st.title || `Trace #${idx + 1}`,
        explanation: st.explanation || '',
        codeLines: Array.isArray(st.codeLines) ? st.codeLines : [],
        durationMs: 750,
        animationStyle: 'smooth',
        highlights: {},
        events: [],
        snapshot: {
          artboardItems: structuredClone(baseSnap),
          variables: Array.isArray(st.variables) ? st.variables : [],
        },
      }));
      commitScene((prev) => ({
        ...prev,
        traceMode: 'external',
        traceSource: 'external_cpp',
        steps: importedSteps,
        currentStepIndex: 0,
      }));
      onNotify(
        zh
          ? `已载入 ${importedSteps.length} 步外部执行轨迹`
          : `Loaded ${importedSteps.length} external steps`
      );
    } catch {
      onNotify(zh ? 'JSON 解析失败' : 'Invalid JSON');
    }
  };

  const handleExportSceneJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.templateId || 'yanpb-algo'}-scene.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scene]);

  // Unified Shortcut Registry Keyboard Listener (IME + Text Input Guarded)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('dialog, [role="dialog"]')) return;
      if (showCommandPalette || showShortcutHelp || showExportModal || showBuilder || showDslEditor) {
        return;
      }
      const scopes: ShortcutScope[] = showPresentation
        ? ['global', 'presentation']
        : ['global', 'canvas'];
      const hit = matchShortcut(e, shortcuts, scopes);
      if (!hit) return;

      e.preventDefault();
      e.stopPropagation();

      switch (hit.id) {
        case 'undo':
          handleUndo();
          break;
        case 'redo':
          handleRedo();
          break;
        case 'copy':
          handleCopySelected();
          break;
        case 'cut':
          handleCutSelected();
          break;
        case 'paste':
          handlePaste(false);
          break;
        case 'paste-in-place':
          handlePaste(true);
          break;
        case 'duplicate':
          handleDuplicateSelected();
          break;
        case 'select-all':
          setSelectedIds(selectAllItemIds(activeBoard));
          break;
        case 'invert-select':
          setSelectedIds(invertSelectedIds(activeBoard, selectedIds));
          break;
        case 'delete':
        case 'backspace-delete':
          handleDeleteSelected();
          break;
        case 'escape':
          if (innerEditItemId) {
            setInnerEditItemId(null);
            setActiveSubSelection(null);
          } else if (toolMode !== 'select') {
            setToolMode('select');
          } else {
            setSelectedIds([]);
            setSelectedConnectorId(null);
          }
          break;
        case 'enter-edit':
          if (selectedIds.length === 1) {
            setInnerEditItemId(selectedIds[0]);
          }
          break;
        case 'group':
          handleGroupToggle(true);
          break;
        case 'ungroup':
          handleGroupToggle(false);
          break;
        case 'toggle-lock':
          if (selectedIds.length > 0) {
            updateActiveBoardItems(
              activeBoard.items.map((it) =>
                selectedIds.includes(it.id) ? { ...it, locked: !it.locked } : it
              ),
              true
            );
          }
          break;
        case 'nudge-up':
        case 'nudge-down':
        case 'nudge-left':
        case 'nudge-right':
        case 'nudge-up-fast':
        case 'nudge-down-fast':
        case 'nudge-left-fast':
        case 'nudge-right-fast': {
          if (selectedIds.length === 0) break;
          const step = hit.id.endsWith('-fast') ? 10 : 1;
          const dx = hit.id.includes('-left') ? -step : hit.id.includes('-right') ? step : 0;
          const dy = hit.id.includes('-up') ? -step : hit.id.includes('-down') ? step : 0;
          updateActiveBoardItems(
            activeBoard.items.map((it) =>
              selectedIds.includes(it.id) && !it.locked ? { ...it, x: it.x + dx, y: it.y + dy } : it
            ),
            true
          );
          break;
        }
        case 'tool-select':
          setToolMode('select');
          break;
        case 'tool-hand':
          setToolMode('hand');
          break;
        case 'tool-rect':
          setToolMode('rect');
          break;
        case 'tool-circle':
          setToolMode('circle');
          break;
        case 'tool-arrow':
          setToolMode('arrow');
          break;
        case 'tool-connector':
          setToolMode('connector');
          break;
        case 'tool-text':
          setToolMode('text');
          break;
        case 'tool-brush':
          setToolMode('brush');
          break;
        case 'tool-highlight':
          setToolMode('highlight');
          break;
        case 'zoom-in':
          setZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))));
          break;
        case 'zoom-out':
          setZoom((z) => Math.max(0.2, Number((z - 0.15).toFixed(2))));
          break;
        case 'fit-content':
          handleFitContent();
          break;
        case 'fit-selection':
          handleFitSelection();
          break;
        case 'zoom-100':
          handleZoom100();
          break;
        case 'present-mode':
          setShowPresentation(true);
          break;
        case 'save':
          void saveSceneSnapshot(scene);
          onNotify(zh ? '已保存算法场景快照' : 'Scene snapshot saved');
          break;
        case 'save-as':
          handleExportSceneJson();
          break;
        case 'export':
          setShowExportModal(true);
          break;
        case 'command-palette':
          setShowCommandPalette(true);
          break;
        case 'shortcut-help':
          setShowShortcutHelp(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    shortcuts,
    showPresentation,
    showCommandPalette,
    showShortcutHelp,
    showExportModal,
    showBuilder,
    showDslEditor,
    activeBoard,
    selectedIds,
    innerEditItemId,
    toolMode,
    scene,
    handleUndo,
    handleRedo,
    handleCopySelected,
    handleCutSelected,
    handlePaste,
    handleDuplicateSelected,
    handleDeleteSelected,
    handleGroupToggle,
    handleFitContent,
    handleFitSelection,
    handleZoom100,
    handleExportSceneJson,
    updateActiveBoardItems,
    onNotify,
    zh,
  ]);

  const paletteCommands: PaletteCommandItem[] = useMemo(
    () => [
      {
        id: 'cmd-fit-content',
        category: zh ? '视图' : 'View',
        title: zh ? '适应全画板内容' : 'Fit Artboard Content',
        shortcut: 'Shift+1',
        run: handleFitContent,
      },
      {
        id: 'cmd-fit-sel',
        category: zh ? '视图' : 'View',
        title: zh ? '适应当前选中元素' : 'Fit Selected Items',
        shortcut: 'Shift+2',
        run: handleFitSelection,
      },
      {
        id: 'cmd-zoom-100',
        category: zh ? '视图' : 'View',
        title: zh ? '恢复 100% 实际尺寸' : 'Reset Zoom 100%',
        shortcut: 'Shift+0',
        run: handleZoom100,
      },
      {
        id: 'cmd-auto-layout',
        category: zh ? '布局' : 'Layout',
        title: zh ? '智能防重叠自动排版' : 'Smart Non-overlapping Layout',
        run: handleAutoLayout,
      },
      {
        id: 'cmd-group',
        category: zh ? '编辑' : 'Edit',
        title: zh ? '组合选中元素' : 'Group Selected',
        shortcut: formatShortcutCombo('mod+g'),
        run: () => handleGroupToggle(true),
      },
      {
        id: 'cmd-ungroup',
        category: zh ? '编辑' : 'Edit',
        title: zh ? '取消组合' : 'Ungroup Selected',
        shortcut: formatShortcutCombo('mod+shift+g'),
        run: () => handleGroupToggle(false),
      },
      ...(hasAiKey
        ? [
            {
              id: 'cmd-ai',
              category: 'AI',
              title: zh ? '打开 AI 创作助手抽屉' : 'Open AI Studio Copilot',
              run: () => setShowAiCopilot(true),
            },
          ]
        : []),
      {
        id: 'cmd-builder',
        category: 'DSL',
        title: zh ? '打开自定义算法规则设计器' : 'Open Algorithm Builder',
        run: () => setShowBuilder(true),
      },
      {
        id: 'cmd-dsl',
        category: 'DSL',
        title: zh ? '打开 JSON / YAML Scene DSL 编辑器' : 'Open DSL Editor',
        run: () => setShowDslEditor(true),
      },
      {
        id: 'cmd-export',
        category: zh ? '导出' : 'Export',
        title: zh ? '打开多媒体高清导出面板' : 'Open Export Modal',
        shortcut: formatShortcutCombo('mod+e'),
        run: () => setShowExportModal(true),
      },
      {
        id: 'cmd-present',
        category: zh ? '教学' : 'Teach',
        title: zh ? '进入全屏课堂激光笔演示模式' : 'Enter Presentation Mode',
        shortcut: 'F',
        run: () => setShowPresentation(true),
      },
      {
        id: 'cmd-shortcuts',
        category: zh ? '设置' : 'Settings',
        title: zh ? '快捷键帮助与自定义绑定' : 'Shortcut Registry & Custom Keys',
        shortcut: '?',
        run: () => setShowShortcutHelp(true),
      },
    ],
    [
      zh,
      hasAiKey,
      handleFitContent,
      handleFitSelection,
      handleZoom100,
      handleAutoLayout,
      handleGroupToggle,
    ]
  );

  const selectedItem =
    selectedIds.length === 1
      ? activeBoard.items.find((it) => it.id === selectedIds[0]) || null
      : null;
  const selectedConnector =
    (activeBoard.connectors || []).find((c) => c.id === selectedConnectorId) || null;
  const currentStep = scene.steps[scene.currentStepIndex] || null;
  const isStudentView = scene.teaching?.viewRole === 'student';
  const renderedBoard = isStudentView
    ? { ...activeBoard, items: activeBoard.items.map((it) => (it.coachOnly ? { ...it, visible: false } : it)) }
    : activeBoard;
  const traceSource = scene.traceSource || scene.traceMode;
  const traceLabel =
    traceSource === 'builtin'
      ? zh ? '内置计算' : 'Built-in'
      : traceSource === 'dsl'
        ? zh ? 'DSL 规则' : 'DSL'
        : traceSource === 'ai_draft'
          ? zh ? 'AI 草稿' : 'AI Draft'
          : traceSource === 'external' || traceSource === 'external_cpp'
            ? zh ? '外部 Trace' : 'External'
            : zh ? '手动帧' : 'Manual';

  return (
    <div
      className={`${
        fullscreen ? 'fixed inset-0 z-40' : 'h-[calc(100vh-3.5rem)]'
      } flex flex-col bg-slate-50 text-slate-900 dark:bg-[#080B10] dark:text-slate-100 overflow-hidden`}
    >
      {/* Top Studio Workbench Bar */}
      <div className="min-h-11 px-3 py-1.5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F141E] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        {/* Undo / Redo + Artboards + Creation Tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            title={zh ? '撤销 (Ctrl+Z)' : 'Undo'}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-35 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={future.length === 0}
            onClick={handleRedo}
            title={zh ? '重做 (Ctrl+Shift+Z)' : 'Redo'}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-35 cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/15 mx-1" />

          {/* Multi-Artboard Tabs */}
          <div className="flex items-center gap-1 max-w-[260px] overflow-x-auto">
            {scene.artboards.map((ab) => (
              <button
                key={ab.id}
                type="button"
                onClick={() => {
                  setScene((p) => ({ ...p, activeArtboardId: ab.id }));
                  setSelectedIds([]);
                  setSelectedConnectorId(null);
                }}
                className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                  ab.id === scene.activeArtboardId
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-300'
                }`}
              >
                {ab.name}
              </button>
            ))}
            <button
              type="button"
              title={zh ? '新建画板' : 'New Artboard'}
              onClick={() =>
                commitScene((p) => {
                  const id = `ab-${Date.now()}`;
                  return {
                    ...p,
                    activeArtboardId: id,
                    artboards: [
                      ...p.artboards,
                      {
                        id,
                        name: zh ? `画板 ${p.artboards.length + 1}` : `Board ${p.artboards.length + 1}`,
                        width: 980,
                        height: 620,
                        mode: 'infinite',
                        background: '#0F141E',
                        items: [],
                        connectors: [],
                        groups: [],
                        guides: [],
                      },
                    ],
                  };
                })
              }
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-blue-400 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/15 mx-1" />

          {/* Studio 2.0 Creation Entries */}
          {hasAiKey && (
            <button
              type="button"
              onClick={() => setShowAiCopilot(true)}
              className="px-2 py-1 rounded bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/35 text-blue-500 dark:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{zh ? 'AI 创作' : 'AI Studio'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className="px-2 py-1 rounded border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>{zh ? '规则设计器' : 'Builder'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDslEditor(true)}
            className="px-2 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
            <span>DSL</span>
          </button>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.5 border rounded ${
              traceSource === 'ai_draft'
                ? 'border-amber-500/40 text-amber-400'
                : traceSource === 'dsl' || traceSource === 'builtin'
                  ? 'border-emerald-500/40 text-emerald-400'
                  : 'border-slate-500/40 text-slate-400'
            }`}
          >
            {traceLabel}
          </span>
        </div>

        {/* Center Align / Distribute / Group / Snap */}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => handleAlign('left')} title={zh ? '左对齐' : 'Align Left'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <AlignStartVertical className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleAlign('centerX')} title={zh ? '水平居中' : 'Align Center X'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <AlignCenterVertical className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleAlign('right')} title={zh ? '右对齐' : 'Align Right'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <AlignEndVertical className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleAlign('top')} title={zh ? '顶对齐' : 'Align Top'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <AlignStartHorizontal className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleAlign('centerY')} title={zh ? '垂直居中' : 'Align Center Y'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <AlignCenterHorizontal className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleAlign('bottom')} title={zh ? '底对齐' : 'Align Bottom'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <AlignEndHorizontal className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/15 mx-1" />

          <button type="button" onClick={() => handleDistribute('h')} title={zh ? '水平等距分布' : 'Distribute H'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleDistribute('v')} title={zh ? '垂直等距分布' : 'Distribute V'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleGroupToggle(true)} title={zh ? '组合选中 (Ctrl+G)' : 'Group'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <Group className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleGroupToggle(false)} title={zh ? '取消组合 (Ctrl+Shift+G)' : 'Ungroup'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <Ungroup className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={handleDuplicateSelected} title={zh ? '创建副本 (Ctrl+D)' : 'Duplicate'} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={handleDeleteSelected} title={zh ? '删除 (Del)' : 'Delete'} className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/15 mx-1" />

          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, showGrid: !p.showGrid }))}
            title={zh ? '显示网格' : 'Grid'}
            className={`p-1.5 rounded cursor-pointer ${prefs.showGrid ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10'}`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, snapToGrid: !p.snapToGrid }))}
            title={zh ? '网格吸附' : 'Snap'}
            className={`p-1.5 rounded cursor-pointer ${prefs.snapToGrid ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10'}`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleAutoLayout}
            title={zh ? '画板自动排版' : 'Auto Layout'}
            className="p-1.5 rounded hover:bg-white/10 cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitContent}
            title={zh ? '适应画布内容 (Shift+1)' : 'Fit Content (Shift+1)'}
            className="p-1.5 rounded hover:bg-white/10 cursor-pointer"
          >
            <Scan className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Actions: Command / Shortcuts / Panels / Save / Share / Present / Export */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCommandPalette(true)}
            title={zh ? '命令面板 (Ctrl/Cmd+K)' : 'Command Palette'}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 cursor-pointer"
          >
            <Command className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowShortcutHelp(true)}
            title={zh ? '快捷键帮助与自定义 (?)' : 'Shortcuts (?)'}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-guide-target="algorithm-sidebar"
            onClick={() => setPrefs((p) => ({ ...p, leftOpen: !p.leftOpen }))}
            title={zh ? '折叠左侧栏' : 'Toggle Left'}
            className={`p-1.5 rounded cursor-pointer ${prefs.leftOpen ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, rightOpen: !p.rightOpen }))}
            title={zh ? '折叠右侧栏' : 'Toggle Right'}
            className={`p-1.5 rounded cursor-pointer ${prefs.rightOpen ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, bottomOpen: !p.bottomOpen }))}
            title={zh ? '折叠时间轴' : 'Toggle Timeline'}
            className={`p-1.5 rounded cursor-pointer ${prefs.bottomOpen ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <PanelBottom className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            title={zh ? '全屏工作台' : 'Fullscreen'}
            className="p-1.5 rounded hover:bg-white/10 cursor-pointer"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              void saveSceneSnapshot(scene);
              onNotify(zh ? '已保存算法场景快照' : 'Scene snapshot saved');
            }}
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>{zh ? '保存' : 'Save'}</span>
          </button>

          <button
            type="button"
            data-guide-target="algorithm-transit"
            onClick={() => onShareViaTransit(scene)}
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{zh ? '中转分享' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPresentation(true)}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>{zh ? '教学演示' : 'Present'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{zh ? '导出' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column + Bottom Timeline Workbench */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {prefs.leftOpen && (
            <>
              <div style={{ width: `${prefs.leftWidth}px` }} className="h-full shrink-0 overflow-hidden">
                <StudioLeftPanel
                  locale={locale}
                  artboard={activeBoard}
                  selectedIds={selectedIds}
                  activeTemplateId={scene.templateId}
                  assets={assets}
                  hasAiKey={hasAiKey}
                  onAddComponent={handleAddComponent}
                  onSelectIds={setSelectedIds}
                  onUpdateItems={(items) => updateActiveBoardItems(items, true)}
                  onDeleteItemWithConnectors={(itemId) => {
                    updateActiveBoard((ab) => deleteItemsWithBoundConnectors(ab, [itemId]), true);
                    setSelectedIds((prev) => prev.filter((id) => id !== itemId));
                  }}
                  onLoadTemplate={handleLoadTemplate}
                  onSaveAsset={(item) => {
                    const asset: AlgoAssetItem = {
                      id: `asset-${Date.now()}`,
                      name: item.name,
                      category: item.type,
                      item: structuredClone(item),
                      createdAt: Date.now(),
                    };
                    void saveAlgoAsset(asset);
                    setAssets((prev) => [asset, ...prev]);
                    onNotify(zh ? `已保存「${item.name}」到复用资产` : 'Saved to Assets');
                  }}
                  onInsertAsset={(asset) => {
                    const cloned: AlgoCanvasItem = {
                      ...structuredClone(asset.item),
                      id: `item-${asset.item.type}-${Date.now()}`,
                      x: 64,
                      y: 64,
                      zIndex: activeBoard.items.length + 1,
                    };
                    updateActiveBoardItems([...activeBoard.items, cloned], true);
                    setSelectedIds([cloned.id]);
                  }}
                  onDeleteAsset={(id) => {
                    void deleteAlgoAsset(id);
                    setAssets((prev) => prev.filter((a) => a.id !== id));
                  }}
                />
              </div>
              <div
                onPointerDown={() => {
                  resizingRef.current = 'left';
                }}
                className="w-1 cursor-col-resize bg-transparent hover:bg-blue-500/50 transition-colors shrink-0"
              />
            </>
          )}

          {/* Left Compact Canvas Tool Dock (V, H, R, O, A, L, T, P, M) */}
          <div className="w-10 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D111A] flex flex-col items-center py-2 gap-1 shrink-0">
            {TOOL_BUTTONS.map((tb) => {
              const Icon = tb.icon;
              const active = toolMode === tb.id;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setToolMode(tb.id)}
                  title={`${zh ? tb.labelZh : tb.labelEn} (${tb.key})`}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          {/* Center Freeform Canvas */}
          <StudioCanvas
            artboard={renderedBoard}
            selectedIds={selectedIds}
            selectedConnectorId={selectedConnectorId}
            toolMode={toolMode}
            innerEditItemId={innerEditItemId}
            activeSubSelection={activeSubSelection}
            zoom={zoom}
            pan={pan}
            showGrid={prefs.showGrid}
            snapToGrid={prefs.snapToGrid}
            gridSize={prefs.gridSize}
            snapThreshold={prefs.snapThreshold}
            guideColor={prefs.guideColor}
            stepVariables={currentStep?.snapshot.variables}
            artboardRef={artboardRef}
            onZoomPanChange={(nextZoom, nextPan) => {
              setZoom(nextZoom);
              setPan(nextPan);
            }}
            onSelectIds={setSelectedIds}
            onSelectConnectorId={setSelectedConnectorId}
            onEnterInnerEdit={setInnerEditItemId}
            onSubSelect={setActiveSubSelection}
            onSubDoubleClickEdit={(sub, newVal) => {
              const parsed = Number.isFinite(Number(newVal)) && newVal.trim() !== '' ? Number(newVal) : newVal;
              if (sub.kind === 'array-cell' && sub.index !== undefined) {
                handleSemanticAction(sub.itemId, { kind: 'array-set', index: sub.index, value: parsed });
              } else if (
                (sub.kind === 'matrix-cell' || sub.kind === 'dp-cell') &&
                sub.row !== undefined &&
                sub.col !== undefined
              ) {
                handleSemanticAction(sub.itemId, {
                  kind: 'cell-set',
                  row: sub.row,
                  col: sub.col,
                  value: parsed,
                });
              }
            }}
            onUpdateItemsLive={(items) => updateActiveBoardItems(items, false)}
            onCommitTransaction={(beforeBoard, afterBoard) => {
              setHistory((h) => [
                ...h.slice(-39),
                structuredClone({
                  ...scene,
                  artboards: scene.artboards.map((ab) =>
                    ab.id === scene.activeArtboardId ? beforeBoard : ab
                  ),
                }),
              ]);
              setFuture([]);
              updateActiveBoard(() => afterBoard, false);
            }}
            onAddConnector={(conn) => {
              updateActiveBoard(
                (ab) => ({ ...ab, connectors: [...(ab.connectors || []), conn] }),
                true
              );
            }}
            onUpdateConnectorLive={(conn) => {
              updateActiveBoard(
                (ab) => ({
                  ...ab,
                  connectors: (ab.connectors || []).map((c) => (c.id === conn.id ? conn : c)),
                }),
                false
              );
            }}
            onUpdateGuides={(guides) => {
              updateActiveBoard((ab) => ({ ...ab, guides }), true);
            }}
            onMoveGraphNode={handleMoveGraphNode}
            onRequestContextMenu={(req) => setContextMenu(req)}
            onResetToolToSelect={() => setToolMode('select')}
            onViewportRectChange={setViewportRect}
          />

          {prefs.rightOpen && (
            <>
              <div
                onPointerDown={() => {
                  resizingRef.current = 'right';
                }}
                className="w-1 cursor-col-resize bg-transparent hover:bg-blue-500/50 transition-colors shrink-0"
              />
              <div style={{ width: `${prefs.rightWidth}px` }} className="h-full shrink-0 overflow-hidden">
                <StudioRightPanel
                  locale={locale}
                  scene={scene}
                  editMode={editMode}
                  selectedIds={selectedIds}
                  selectedItem={selectedItem}
                  selectedConnector={selectedConnector}
                  activeSubSelection={activeSubSelection}
                  copiedStyle={copiedStyle}
                  currentStep={currentStep}
                  codeStudioSamples={codeStudioSamples}
                  onChangeEditMode={setEditMode}
                  onUpdateItem={(updated) =>
                    updateActiveBoardItems(
                      activeBoard.items.map((it) => (it.id === updated.id ? updated : it)),
                      false
                    )
                  }
                  onUpdateItems={updateActiveBoardItems}
                  onUpdateArtboard={(patch, pushUndo = false) =>
                    updateActiveBoard((ab) => ({ ...ab, ...patch }), pushUndo)
                  }
                  onUpdateConnector={(conn) =>
                    updateActiveBoard(
                      (ab) => ({
                        ...ab,
                        connectors: (ab.connectors || []).map((c) => (c.id === conn.id ? conn : c)),
                      }),
                      true
                    )
                  }
                  onDeleteConnector={(id) => {
                    updateActiveBoard(
                      (ab) => ({
                        ...ab,
                        connectors: (ab.connectors || []).filter((c) => c.id !== id),
                      }),
                      true
                    );
                    setSelectedConnectorId(null);
                  }}
                  onCopyStyle={(style) => {
                    setCopiedStyle(structuredClone(style));
                    onNotify(zh ? '已复制组件视觉样式' : 'Style copied');
                  }}
                  onSemanticAction={handleSemanticAction}
                  onRecalculateTrace={handleRecalculateTrace}
                  onAutoLayout={handleAutoLayout}
                  onUpdateScene={(patch) => setScene((p) => ({ ...p, ...patch }))}
                  onToggleStepCodeLine={(lineNum) => {
                    if (!currentStep) return;
                    const exists = currentStep.codeLines.includes(lineNum);
                    const nextLines = exists
                      ? currentStep.codeLines.filter((l) => l !== lineNum)
                      : [...currentStep.codeLines, lineNum].sort((a, b) => a - b);
                    setScene((p) => ({
                      ...p,
                      steps: p.steps.map((s, idx) =>
                        idx === p.currentStepIndex ? { ...s, codeLines: nextLines } : s
                      ),
                    }));
                  }}
                  onSyncSampleToCodeStudio={(inputText, label) => {
                    onSyncSampleToCodeStudio(inputText, label);
                    onNotify(zh ? '已同步样例到 Code Studio' : 'Sample synced to Code Studio');
                  }}
                  onImportExternalTrace={handleImportExternalTrace}
                />
              </div>
            </>
          )}
        </div>

        {/* Bottom Timeline */}
        {prefs.bottomOpen && (
          <>
            <div
              onPointerDown={() => {
                resizingRef.current = 'bottom';
              }}
              className="h-1 cursor-row-resize bg-transparent hover:bg-blue-500/50 transition-colors shrink-0"
            />
            <div style={{ height: `${prefs.bottomHeight}px` }} className="w-full shrink-0 overflow-hidden">
              <StudioTimeline
                locale={locale}
                steps={scene.steps}
                currentIndex={scene.currentStepIndex}
                playing={playing}
                speed={speed}
                traceMode={scene.traceMode}
                hasAiKey={hasAiKey}
                onSelectStep={(idx) => {
                  setPlaying(false);
                  selectStep(idx);
                }}
                onTogglePlay={() => {
                  if (!playing && scene.currentStepIndex >= scene.steps.length - 1) {
                    selectStep(0);
                  }
                  setPlaying((v) => !v);
                }}
                onSpeedChange={setSpeed}
                onModeChange={(mode: TraceSourceMode) =>
                  setScene((p) => ({ ...p, traceMode: mode }))
                }
                onInsertKeyframe={handleInsertKeyframe}
                onDuplicateKeyframe={(idx) =>
                  commitScene((prev) => {
                    const copy = structuredClone(prev.steps[idx]);
                    if (!copy) return prev;
                    copy.id = `step-dup-${Date.now()}`;
                    const next = [...prev.steps];
                    next.splice(idx + 1, 0, copy);
                    return { ...prev, steps: next, currentStepIndex: idx + 1 };
                  })
                }
                onDeleteKeyframe={(idx) =>
                  commitScene((prev) => {
                    if (prev.steps.length <= 1) return prev;
                    const next = prev.steps.filter((_, i) => i !== idx);
                    const nextIdx = Math.min(idx, next.length - 1);
                    return { ...prev, steps: next, currentStepIndex: nextIdx };
                  })
                }
                onUpdateStepMeta={(idx, patch) =>
                  setScene((prev) => ({
                    ...prev,
                    steps: prev.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
                  }))
                }
                onBatchSetDuration={(ms) =>
                  setScene((prev) => ({
                    ...prev,
                    steps: prev.steps.map((s) => ({ ...s, durationMs: ms })),
                  }))
                }
              />
            </div>
          </>
        )}
      </div>

      {/* Hidden isolated node for single-component clean PNG/SVG export */}
      {selectedItem && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
          <div
            ref={selectedExportRef}
            style={{ width: `${selectedItem.width}px`, height: `${selectedItem.height}px` }}
          >
            <AlgoComponentRenderer
              item={selectedItem}
              stepVariables={currentStep?.snapshot.variables}
            />
          </div>
        </div>
      )}

      {/* Presentation Mode */}
      {showPresentation && (
        <PresentationOverlay
          locale={locale}
          scene={scene}
          currentStepIndex={scene.currentStepIndex}
          onSelectStep={selectStep}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {/* Export Studio Modal */}
      {showExportModal && (
        <StudioExportModal
          locale={locale}
          scene={scene}
          hasSelectedComponent={Boolean(selectedItem)}
          onSelectStepAndWait={async (idx) => {
            selectStep(idx);
            await new Promise((r) => setTimeout(r, 80));
          }}
          onSelectArtboardAndWait={async (abId) => {
            setScene((p) => ({ ...p, activeArtboardId: abId }));
            await new Promise((r) => setTimeout(r, 80));
          }}
          getCaptureNode={(target: StudioExportTarget) => {
            if (target === 'selectedComponent') return selectedExportRef.current;
            return artboardRef.current;
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Dynamic Right-Click Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          locale={locale}
          x={contextMenu.clientX}
          y={contextMenu.clientY}
          worldX={contextMenu.worldX}
          worldY={contextMenu.worldY}
          targetItem={
            contextMenu.itemId
              ? activeBoard.items.find((it) => it.id === contextMenu.itemId) || null
              : null
          }
          subSelection={contextMenu.subSelection}
          selectedCount={selectedIds.length}
          hasClipboard={clipboard.length > 0}
          hasCopiedStyle={Boolean(copiedStyle)}
          onClose={() => setContextMenu(null)}
          onEnterInnerEdit={(id) => {
            setSelectedIds([id]);
            setInnerEditItemId(id);
          }}
          onSemanticAction={handleSemanticAction}
          onCopy={handleCopySelected}
          onCut={handleCutSelected}
          onPaste={handlePaste}
          onDuplicate={handleDuplicateSelected}
          onDelete={handleDeleteSelected}
          onGroup={handleGroupToggle}
          onLayerZ={(action) =>
            updateActiveBoardItems(reorderLayerZ(activeBoard.items, selectedIds, action), true)
          }
          onCopyStyle={() => {
            const first = activeBoard.items.find((it) => selectedIds.includes(it.id));
            if (first) setCopiedStyle(structuredClone(first.style));
          }}
          onPasteStyle={() => {
            if (!copiedStyle) return;
            updateActiveBoardItems(
              applyCopiedStyleToItems(activeBoard.items, selectedIds, copiedStyle),
              true
            );
          }}
          onToggleLock={() =>
            updateActiveBoardItems(
              activeBoard.items.map((it) =>
                selectedIds.includes(it.id) ? { ...it, locked: !it.locked } : it
              ),
              true
            )
          }
          onToggleHide={() => {
            updateActiveBoardItems(
              activeBoard.items.map((it) =>
                selectedIds.includes(it.id) ? { ...it, visible: false } : it
              ),
              true
            );
            setSelectedIds([]);
          }}
          onSelectAll={() => setSelectedIds(selectAllItemIds(activeBoard))}
          onFitContent={handleFitContent}
          onZoom100={handleZoom100}
          onAutoLayout={handleAutoLayout}
        />
      )}

      {/* Command Palette (Ctrl/Cmd+K) */}
      {showCommandPalette && (
        <CommandPaletteModal
          locale={locale}
          commands={paletteCommands}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {/* Shortcut Help & Custom Keybinding Registry (?) */}
      {showShortcutHelp && (
        <ShortcutHelpModal
          locale={locale}
          shortcuts={shortcuts}
          onUpdateShortcuts={(next) => {
            setShortcuts(next);
            saveUserShortcuts(next);
          }}
          onClose={() => setShowShortcutHelp(false)}
        />
      )}

      {/* Algorithm Studio 2.0: AI Copilot Drawer (only shown when frontend API key is configured) */}
      {hasAiKey && showAiCopilot && (
        <AICopilotDrawer
          locale={locale}
          scene={scene}
          authorName={authorName}
          aiConfig={aiConfig}
          onOpenApiKeyModal={onOpenApiKeyModal}
          onApplyGeneratedScene={(nextScene, nextDsl) => {
            setPlaying(false);
            commitScene(() => nextScene);
            if (nextDsl) setActiveDsl(nextDsl);
            setSelectedIds([]);
            onNotify(
              zh
                ? `已载入 AI 推演草稿场景「${nextScene.name}」（共 ${nextScene.steps.length} 步）`
                : `Loaded AI draft scene (${nextScene.steps.length} steps)`
            );
          }}
          onApplyPatchScene={(nextScene, message) => {
            commitScene(() => nextScene);
            onNotify(message);
          }}
          onOpenBuilderWithInput={(analysis, input) => {
            const firstComp = analysis.recommendedComponents[0] || 'array';
            const customDsl: AlgorithmSceneDSL = {
              version: '2.0.0',
              scene: {
                id: `custom-${Date.now()}`,
                name: analysis.detectedParadigm || '自定义算法规则',
                tier: scene.tier,
                teachingTier: input.teachingTier,
                teachingStyle: 'deductive',
                author: authorName,
                description: input.naturalLanguage || analysis.disclaimer,
                language: 'cpp17',
                linkedCode: input.cppCode || '// 在此处补充关联代码',
                formulaLatex: input.formulaLatex || '',
              },
              input: {
                fields: [{ name: 'a', type: 'number[]', defaultValue: [3, 1, 4, 1, 5] }],
                expectedOutput: input.sampleOutput || undefined,
              },
              state: {
                variables: [
                  { name: 'ans', type: 'number', initial: 0 },
                  { name: 'i', type: 'number', initial: 0 },
                ],
              },
              components: [
                {
                  id: 'cmp-main',
                  semanticType: 'SmartArray',
                  componentType: firstComp,
                  name: analysis.detectedParadigm || '主数据结构',
                  x: 36,
                  y: 36,
                  width: 580,
                  height: 170,
                },
                {
                  id: 'cmp-vars',
                  semanticType: 'SmartVariable',
                  componentType: 'variable-watcher',
                  name: '变量监视器',
                  x: 640,
                  y: 36,
                  width: 240,
                  height: 200,
                },
              ],
              operations: [
                {
                  op: 'step',
                  titleExpr: '"初始化算法状态"',
                  explanationExpr: '"从静态识别转换的可自定义规则起点"',
                  codeLines: [1],
                },
              ],
              conditions: [],
              transitions: [],
              events: [],
              bindings: [],
              timeline: { defaultDurationMs: 750, animationStyle: 'smooth', autoSnapshotOnStep: true },
              annotations: [],
              output: { expression: 'ans', label: '结果' },
              theme: { mode: 'dark', accentColor: '#3B82F6', background: '#0F141E', gridSize: 16 },
            };
            setActiveDsl(customDsl);
            setShowBuilder(true);
          }}
          onClose={() => setShowAiCopilot(false)}
        />
      )}

      {/* Algorithm Studio 2.0: Visual Algorithm Builder */}
      {showBuilder && (
        <AlgorithmBuilderModal
          locale={locale}
          authorName={authorName}
          initialDsl={activeDsl}
          onApplyBuiltScene={(nextScene, nextDsl) => {
            setPlaying(false);
            commitScene(() => nextScene);
            setActiveDsl(nextDsl);
            setSelectedIds([]);
            setShowBuilder(false);
            onNotify(
              zh
                ? `DSL 规则执行完成：生成 ${nextScene.steps.length} 步动画`
                : `DSL built ${nextScene.steps.length} steps`
            );
          }}
          onNotify={onNotify}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {/* Algorithm Studio 2.0: JSON/YAML DSL Editor */}
      {showDslEditor && (
        <DslEditorModal
          locale={locale}
          authorName={authorName}
          initialDsl={activeDsl}
          onApplyDslScene={(nextScene, nextDsl, fmt, rawText) => {
            setPlaying(false);
            commitScene(() => ({ ...nextScene, dslFormat: fmt, dslText: rawText }));
            setActiveDsl(nextDsl);
            setSelectedIds([]);
            onNotify(
              zh
                ? `已从 ${fmt.toUpperCase()} DSL 安全构建 ${nextScene.steps.length} 步算法场景`
                : `Built scene from ${fmt.toUpperCase()} DSL`
            );
          }}
          onClose={() => setShowDslEditor(false)}
        />
      )}
    </div>
  );
};
