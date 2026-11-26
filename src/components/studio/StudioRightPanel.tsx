import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Code2,
  Copy,
  GitBranch,
  Lock,
  Paintbrush,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import {
  AlgoCanvasItem,
  AlgoGraphData,
  AlgoStep,
  Artboard,
  ArtboardMode,
  ConnectorAnchorSide,
  ConnectorRouting,
  EditSemanticMode,
  FixedBoardPreset,
  GraphLayoutType,
  InnerSubSelection,
  SceneSchema,
  SmartConnector,
  TeachingStyle,
  TeachingTier,
} from '../../types/algorithmStudio';
import { Locale, SampleCase } from '../../types/workspace';
import {
  CopiedStyle,
  SemanticSubEditAction,
  applyCopiedStyleToItems,
  getDefaultItemStyle,
} from '../../utils/canvasCommands';
import {
  FIXED_BOARD_PRESETS,
  computeAutoFitArtboardBounds,
  detectArtboardOverflow,
} from '../../utils/canvasViewport';
import {
  GraphTextFormat,
  applyGraphLayout,
  exportGraphToText,
  parseTextToGraph,
  validateGraphForAlgorithm,
} from '../../utils/graphLayouts';
import {
  arrayDataToCompetitionInput,
  competitionInputToArrayData,
  competitionInputToMatrixData,
  graphDataToCompetitionInput,
  matrixDataToCompetitionInput,
} from '../../utils/sampleConverter';
import { validateSceneAndDsl } from '../../utils/validationEngine';

interface StudioRightPanelProps {
  locale: Locale;
  scene: SceneSchema;
  editMode: EditSemanticMode;
  selectedIds: string[];
  selectedItem: AlgoCanvasItem | null;
  selectedConnector: SmartConnector | null;
  activeSubSelection: InnerSubSelection | null;
  copiedStyle: CopiedStyle | null;
  currentStep: AlgoStep | null;
  codeStudioSamples: SampleCase[];
  onChangeEditMode: (m: EditSemanticMode) => void;
  onUpdateItem: (updated: AlgoCanvasItem) => void;
  onUpdateItems: (items: AlgoCanvasItem[], pushUndo?: boolean) => void;
  onUpdateArtboard: (patch: Partial<Artboard>, pushUndo?: boolean) => void;
  onUpdateConnector: (conn: SmartConnector) => void;
  onDeleteConnector: (id: string) => void;
  onCopyStyle: (style: CopiedStyle) => void;
  onSemanticAction: (itemId: string, action: SemanticSubEditAction) => void;
  onRecalculateTrace: () => void;
  onAutoLayout: () => void;
  onUpdateScene: (patch: Partial<SceneSchema>) => void;
  onToggleStepCodeLine: (lineNum: number) => void;
  onSyncSampleToCodeStudio: (inputText: string, label: string) => void;
  onImportExternalTrace: (jsonText: string) => void;
}

type RightTab = 'props' | 'graph' | 'code' | 'vars' | 'verify';

function handleNumericNudge(
  e: React.KeyboardEvent<HTMLInputElement>,
  cur: number,
  onChange: (next: number) => void
) {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
  onChange(Math.round(cur + delta));
}

export const StudioRightPanel: React.FC<StudioRightPanelProps> = ({
  locale,
  scene,
  editMode,
  selectedIds,
  selectedItem,
  selectedConnector,
  activeSubSelection,
  copiedStyle,
  currentStep,
  codeStudioSamples,
  onChangeEditMode,
  onUpdateItem,
  onUpdateItems,
  onUpdateArtboard,
  onUpdateConnector,
  onDeleteConnector,
  onCopyStyle,
  onSemanticAction,
  onRecalculateTrace,
  onAutoLayout,
  onUpdateScene,
  onToggleStepCodeLine,
  onSyncSampleToCodeStudio,
  onImportExternalTrace,
}) => {
  const [tab, setTab] = useState<RightTab>('props');
  const [sampleInputText, setSampleInputText] = useState('');
  const [graphTextFmt, setGraphTextFmt] = useState<GraphTextFormat>('oi');
  const [graphTextDraft, setGraphTextDraft] = useState('');
  const [newEdgeFrom, setNewEdgeFrom] = useState('1');
  const [newEdgeTo, setNewEdgeTo] = useState('2');
  const [newEdgeWeight, setNewEdgeWeight] = useState('1');
  const [traceJsonInput, setTraceJsonInput] = useState('');

  const zh = locale === 'zh-CN';

  const activeBoard =
    scene.artboards.find((a) => a.id === scene.activeArtboardId) || scene.artboards[0];
  const overflowReport = useMemo(
    () => (activeBoard ? detectArtboardOverflow(activeBoard) : { overflowingIds: [], hasOverflow: false }),
    [activeBoard]
  );

  const graphItem =
    selectedItem?.payload.kind === 'graph'
      ? selectedItem
      : activeBoard?.items.find((it) => it.payload.kind === 'graph') || null;
  const graphData: AlgoGraphData | null =
    graphItem && graphItem.payload.kind === 'graph' ? graphItem.payload.data : null;

  const updateGraphData = (nextGraph: AlgoGraphData) => {
    if (!graphItem) return;
    onUpdateItem({
      ...graphItem,
      payload: { kind: 'graph', data: nextGraph },
    });
  };

  const graphValidation = graphData
    ? validateGraphForAlgorithm(graphData, scene.templateId)
    : { valid: true };

  const codeLines = scene.linkedCode.split('\n');

  const handleLoadFromItemToText = () => {
    if (!selectedItem) return;
    if (selectedItem.payload.kind === 'array') {
      setSampleInputText(arrayDataToCompetitionInput(selectedItem.payload.data));
    } else if (selectedItem.payload.kind === 'matrix') {
      setSampleInputText(matrixDataToCompetitionInput(selectedItem.payload.data));
    } else if (selectedItem.payload.kind === 'graph') {
      setSampleInputText(graphDataToCompetitionInput(selectedItem.payload.data));
    }
  };

  const handleApplyTextToItem = () => {
    if (!selectedItem || !sampleInputText.trim()) return;
    if (selectedItem.payload.kind === 'array') {
      onUpdateItem({
        ...selectedItem,
        payload: { kind: 'array', data: competitionInputToArrayData(sampleInputText) },
      });
    } else if (selectedItem.payload.kind === 'matrix') {
      onUpdateItem({
        ...selectedItem,
        payload: { kind: 'matrix', data: competitionInputToMatrixData(sampleInputText) },
      });
    } else if (selectedItem.payload.kind === 'graph') {
      const nextG = parseTextToGraph(
        sampleInputText,
        'oi',
        selectedItem.payload.data.variant !== 'undirected',
        true
      );
      onUpdateItem({ ...selectedItem, payload: { kind: 'graph', data: nextG } });
    }
  };

  const validationReport = useMemo(() => validateSceneAndDsl(scene), [scene]);
  const selectedMultiItems = activeBoard.items.filter((it) => selectedIds.includes(it.id));

  return (
    <aside className="h-full flex flex-col border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F141E] text-xs select-none">
      {/* 5-Tab Header */}
      <div className="grid grid-cols-5 border-b border-slate-200 dark:border-white/10 shrink-0">
        {(
          [
            ['props', zh ? '属性' : 'Props'],
            ['graph', zh ? '图论' : 'Graph'],
            ['code', zh ? '代码' : 'Code'],
            ['vars', zh ? '监视' : 'Watch'],
            ['verify', zh ? '验证' : 'Verify'],
          ] as Array<[RightTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`py-2.5 text-[11px] font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Edit Mode Strip + traceStale notice */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 space-y-1.5 shrink-0">
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              ['visual', zh ? '视觉编辑' : 'Visual'],
              ['data', zh ? '数据编辑' : 'Data'],
              ['step', zh ? '步骤覆盖' : 'Step'],
            ] as Array<[EditSemanticMode, string]>
          ).map(([mode, lbl]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeEditMode(mode)}
              className={`py-1 rounded border text-[10px] font-semibold cursor-pointer ${
                editMode === mode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        {scene.traceStale && (
          <div className="p-1.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-center justify-between gap-2 text-[10px]">
            <span className="truncate">{zh ? '数据已改，轨迹可能过期' : 'Data mutated, trace stale'}</span>
            <button
              type="button"
              onClick={onRecalculateTrace}
              className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              {zh ? '重算' : 'Recalc'}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: COMPONENT PROPERTIES, MULTI-SELECT, CONNECTOR & ARTBOARD SETTINGS */}
        {tab === 'props' && (
          <>
            {/* Selected SmartConnector Inspector */}
            {selectedConnector && (
              <div className="p-2.5 rounded-lg border border-blue-500/40 bg-blue-500/5 space-y-2">
                <div className="flex items-center justify-between font-semibold text-blue-300">
                  <span>{zh ? '智能连线属性' : 'Smart Connector'}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteConnector(selectedConnector.id)}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Routing</label>
                    <select
                      value={selectedConnector.routing}
                      onChange={(e) =>
                        onUpdateConnector({
                          ...selectedConnector,
                          routing: e.target.value as ConnectorRouting,
                        })
                      }
                      className="w-full rounded border border-white/15 bg-[#0B0E14] px-1.5 py-1 text-[11px]"
                    >
                      <option value="straight">直线 Straight</option>
                      <option value="orthogonal">折线 Orthogonal</option>
                      <option value="bezier">曲线 Bezier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Arrow</label>
                    <select
                      value={selectedConnector.arrowKind}
                      onChange={(e) =>
                        onUpdateConnector({
                          ...selectedConnector,
                          arrowKind: e.target.value as SmartConnector['arrowKind'],
                        })
                      }
                      className="w-full rounded border border-white/15 bg-[#0B0E14] px-1.5 py-1 text-[11px]"
                    >
                      <option value="single">单向 →</option>
                      <option value="double">双向 ↔</option>
                      <option value="none">无箭头 —</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">From Anchor</label>
                    <select
                      value={selectedConnector.fromAnchor}
                      onChange={(e) =>
                        onUpdateConnector({
                          ...selectedConnector,
                          fromAnchor: e.target.value as ConnectorAnchorSide,
                        })
                      }
                      className="w-full rounded border border-white/15 bg-[#0B0E14] px-1.5 py-1 text-[11px]"
                    >
                      {(['auto', 'top', 'right', 'bottom', 'left', 'center'] as const).map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">To Anchor</label>
                    <select
                      value={selectedConnector.toAnchor}
                      onChange={(e) =>
                        onUpdateConnector({
                          ...selectedConnector,
                          toAnchor: e.target.value as ConnectorAnchorSide,
                        })
                      }
                      className="w-full rounded border border-white/15 bg-[#0B0E14] px-1.5 py-1 text-[11px]"
                    >
                      {(['auto', 'top', 'right', 'bottom', 'left', 'center'] as const).map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={selectedConnector.label || ''}
                    onChange={(e) =>
                      onUpdateConnector({ ...selectedConnector, label: e.target.value })
                    }
                    placeholder={zh ? '连线注释标签...' : 'Label...'}
                    className="flex-1 rounded border border-white/15 bg-[#0B0E14] px-2 py-1 text-[11px]"
                  />
                  <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedConnector.dashed)}
                      onChange={(e) =>
                        onUpdateConnector({ ...selectedConnector, dashed: e.target.checked })
                      }
                    />
                    <span>虚线</span>
                  </label>
                </div>
              </div>
            )}

            {/* Multi-select Batch Editor */}
            {selectedMultiItems.length > 1 && (
              <div className="p-2.5 rounded-lg border border-blue-500/35 bg-blue-500/5 space-y-2.5">
                <div className="font-semibold text-blue-300">
                  {zh ? `批量编辑 (${selectedMultiItems.length} 个已选)` : `Batch Edit (${selectedMultiItems.length})`}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const targetW = selectedMultiItems[0].width;
                      onUpdateItems(
                        activeBoard.items.map((it) =>
                          selectedIds.includes(it.id) && !it.locked ? { ...it, width: targetW } : it
                        ),
                        true
                      );
                    }}
                    className="py-1 rounded border border-white/15 hover:bg-white/10 text-[11px] cursor-pointer"
                  >
                    {zh ? '统一等宽' : 'Match Width'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetH = selectedMultiItems[0].height;
                      onUpdateItems(
                        activeBoard.items.map((it) =>
                          selectedIds.includes(it.id) && !it.locked ? { ...it, height: targetH } : it
                        ),
                        true
                      );
                    }}
                    className="py-1 rounded border border-white/15 hover:bg-white/10 text-[11px] cursor-pointer"
                  >
                    {zh ? '统一等高' : 'Match Height'}
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    {zh ? '批量透明度' : 'Batch Opacity'}
                  </label>
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={selectedMultiItems[0].style.opacity ?? 1}
                    onChange={(e) => {
                      const op = Number(e.target.value);
                      onUpdateItems(
                        activeBoard.items.map((it) =>
                          selectedIds.includes(it.id) ? { ...it, style: { ...it.style, opacity: op } } : it
                        )
                      );
                    }}
                    className="w-full"
                  />
                </div>
                {copiedStyle && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateItems(applyCopiedStyleToItems(activeBoard.items, selectedIds, copiedStyle), true)
                    }
                    className="w-full py-1 rounded bg-blue-600 text-white text-[11px] cursor-pointer"
                  >
                    {zh ? '粘贴已复制样式到全部选中' : 'Paste Style to Selected'}
                  </button>
                )}
              </div>
            )}

            {/* Artboard Mode & Adaptive Settings when no item is selected */}
            {!selectedItem && !selectedConnector && selectedMultiItems.length <= 1 && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/25 space-y-2.5">
                  <div className="font-semibold text-slate-200">
                    {zh ? '画板自适应模式与预设' : 'Artboard Adaptive Settings'}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ['auto-fit', zh ? '自适应包络' : 'Auto Fit'],
                        ['infinite', zh ? '无限画布' : 'Infinite'],
                        ['fixed', zh ? '固定规格' : 'Fixed Size'],
                        ['multi', zh ? '多画板视图' : 'Multi Board'],
                      ] as Array<[ArtboardMode, string]>
                    ).map(([m, lbl]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (m === 'auto-fit') {
                            const b = computeAutoFitArtboardBounds(activeBoard);
                            onUpdateArtboard({ mode: m, ...b }, true);
                          } else {
                            onUpdateArtboard({ mode: m, originX: 0, originY: 0 }, true);
                          }
                        }}
                        className={`py-1.5 rounded border text-[11px] cursor-pointer ${
                          (activeBoard.mode || 'infinite') === m
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-white/15 text-slate-400'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      {zh ? '画板规格预设' : 'Size Preset'}
                    </label>
                    <select
                      value={activeBoard.preset || 'custom'}
                      onChange={(e) => {
                        const preset = e.target.value as FixedBoardPreset;
                        const spec = FIXED_BOARD_PRESETS[preset];
                        onUpdateArtboard(
                          {
                            mode: preset === 'custom' ? activeBoard.mode : 'fixed',
                            preset,
                            width: spec.width,
                            height: spec.height,
                          },
                          true
                        );
                      }}
                      className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 text-[11px]"
                    >
                      {(Object.keys(FIXED_BOARD_PRESETS) as FixedBoardPreset[]).map((k) => (
                        <option key={k} value={k}>
                          {FIXED_BOARD_PRESETS[k].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Width</label>
                      <input
                        type="number"
                        value={activeBoard.width}
                        onChange={(e) => onUpdateArtboard({ width: Math.max(320, Number(e.target.value)) })}
                        className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Height</label>
                      <input
                        type="number"
                        value={activeBoard.height}
                        onChange={(e) => onUpdateArtboard({ height: Math.max(240, Number(e.target.value)) })}
                        className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {overflowReport.hasOverflow && (
                  <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 space-y-2 text-[11px]">
                    <div className="flex items-start gap-1.5 font-semibold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        {zh
                          ? `检测到 ${overflowReport.overflowingIds.length} 个元素超出画板边界`
                          : `${overflowReport.overflowingIds.length} items overflow artboard`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={onAutoLayout}
                        className="py-1 rounded bg-amber-500 text-slate-950 font-semibold cursor-pointer"
                      >
                        {zh ? '重排适应画板' : 'Auto Arrange'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const b = computeAutoFitArtboardBounds(activeBoard);
                          onUpdateArtboard({ mode: 'auto-fit', ...b }, true);
                        }}
                        className="py-1 rounded border border-amber-400/50 hover:bg-amber-500/20 cursor-pointer"
                      >
                        {zh ? '扩板包裹全部' : 'Expand Board'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Single Selected Item Properties & Style & Semantic Editors */}
            {selectedItem && (
              <div className="space-y-3">
                {activeSubSelection && activeSubSelection.itemId === selectedItem.id && (
                  <div className="p-2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[11px] font-mono">
                    内部焦点：{activeSubSelection.kind}{' '}
                    {activeSubSelection.index !== undefined ? `[${activeSubSelection.index}]` : ''}
                    {activeSubSelection.row !== undefined
                      ? `[${activeSubSelection.row},${activeSubSelection.col}]`
                      : ''}
                    {activeSubSelection.nodeId ? `Node(${activeSubSelection.nodeId})` : ''}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {zh ? '组件名称' : 'Name'}
                  </label>
                  <input
                    type="text"
                    value={selectedItem.name}
                    onChange={(e) => onUpdateItem({ ...selectedItem, name: e.target.value })}
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1"
                  />
                </div>

                {/* Geometry X / Y / W / H / R with ArrowUp/Down numeric nudging */}
                <div className="grid grid-cols-3 gap-1.5 font-mono">
                  {(
                    [
                      ['X', 'x'],
                      ['Y', 'y'],
                      ['R°', 'rotation'],
                      ['W', 'width'],
                      ['H', 'height'],
                    ] as const
                  ).map(([lbl, key]) => (
                    <div key={key}>
                      <label className="block text-[10px] text-slate-400 mb-0.5">{lbl}</label>
                      <input
                        type="number"
                        value={Math.round(selectedItem[key])}
                        onKeyDown={(e) =>
                          handleNumericNudge(e, selectedItem[key], (v) =>
                            onUpdateItem({
                              ...selectedItem,
                              [key]: key === 'width' ? Math.max(40, v) : key === 'height' ? Math.max(30, v) : v,
                            })
                          )
                        }
                        onChange={(e) =>
                          onUpdateItem({ ...selectedItem, [key]: Number(e.target.value) })
                        }
                        className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 tabular-nums"
                      />
                    </div>
                  ))}
                </div>

                {/* Visual Style Panel (Fill, Border, Radius, Shadow, Opacity + Style Clipboard) */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1">
                      <Paintbrush className="w-3.5 h-3.5 text-blue-400" />
                      {zh ? '视觉样式' : 'Visual Style'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title={zh ? '复制样式' : 'Copy Style'}
                        onClick={() => onCopyStyle(selectedItem.style)}
                        className="p-1 rounded border border-white/15 hover:bg-white/10 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={!copiedStyle}
                        title={zh ? '粘贴样式' : 'Paste Style'}
                        onClick={() =>
                          copiedStyle &&
                          onUpdateItem({ ...selectedItem, style: { ...selectedItem.style, ...copiedStyle } })
                        }
                        className="px-1.5 py-0.5 rounded border border-white/15 hover:bg-white/10 disabled:opacity-40 text-[10px] cursor-pointer"
                      >
                        粘贴
                      </button>
                      <button
                        type="button"
                        title={zh ? '重置样式' : 'Reset Style'}
                        onClick={() =>
                          onUpdateItem({ ...selectedItem, style: getDefaultItemStyle() })
                        }
                        className="p-1 rounded border border-white/15 hover:bg-white/10 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">填充色</label>
                      <input
                        type="color"
                        value={
                          selectedItem.style.background?.startsWith('#')
                            ? selectedItem.style.background
                            : '#111827'
                        }
                        onChange={(e) =>
                          onUpdateItem({
                            ...selectedItem,
                            style: { ...selectedItem.style, background: e.target.value },
                          })
                        }
                        className="w-full h-7 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">边框色</label>
                      <input
                        type="color"
                        value={
                          selectedItem.style.borderColor?.startsWith('#')
                            ? selectedItem.style.borderColor
                            : '#334155'
                        }
                        onChange={(e) =>
                          onUpdateItem({
                            ...selectedItem,
                            style: { ...selectedItem.style, borderColor: e.target.value },
                          })
                        }
                        className="w-full h-7 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 font-mono">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">线宽</label>
                      <input
                        type="number"
                        min={0}
                        max={8}
                        value={selectedItem.style.borderWidth ?? 1}
                        onChange={(e) =>
                          onUpdateItem({
                            ...selectedItem,
                            style: { ...selectedItem.style, borderWidth: Number(e.target.value) },
                          })
                        }
                        className="w-full rounded border border-white/15 bg-[#0B0E14] px-1.5 py-1 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">圆角</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={selectedItem.style.borderRadius ?? 10}
                        onChange={(e) =>
                          onUpdateItem({
                            ...selectedItem,
                            style: { ...selectedItem.style, borderRadius: Number(e.target.value) },
                          })
                        }
                        className="w-full rounded border border-white/15 bg-[#0B0E14] px-1.5 py-1 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">阴影</label>
                      <select
                        value={selectedItem.style.shadow || 'md'}
                        onChange={(e) =>
                          onUpdateItem({
                            ...selectedItem,
                            style: {
                              ...selectedItem.style,
                              shadow: e.target.value as AlgoCanvasItem['style']['shadow'],
                            },
                          })
                        }
                        className="w-full rounded border border-white/15 bg-[#0B0E14] px-1 py-1 text-[10px]"
                      >
                        <option value="none">无</option>
                        <option value="sm">轻</option>
                        <option value="md">中</option>
                        <option value="lg">深</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{zh ? '透明度' : 'Opacity'}</span>
                      <span className="font-mono tabular-nums">
                        {Math.round((selectedItem.style.opacity ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.15}
                      max={1}
                      step={0.05}
                      value={selectedItem.style.opacity ?? 1}
                      onChange={(e) =>
                        onUpdateItem({
                          ...selectedItem,
                          style: { ...selectedItem.style, opacity: Number(e.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedItem.coachOnly)}
                    onChange={(e) =>
                      onUpdateItem({ ...selectedItem, coachOnly: e.target.checked })
                    }
                  />
                  <span>{zh ? '仅教练模式可见（学生视角自动隐藏）' : 'Coach-only component'}</span>
                </label>

                {/* Payload Quick Editors */}
                {selectedItem.payload.kind === 'array' && (() => {
                  const arrData = selectedItem.payload.data;
                  return (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {zh ? '数组元素（逗号分隔）' : 'Array Items'}
                        </label>
                        <input
                          type="text"
                          value={arrData.items.join(', ')}
                          onChange={(e) => {
                            const arr = e.target.value
                              .split(/[,，\s]+/)
                              .filter(Boolean)
                              .map((t) => (Number.isFinite(Number(t)) ? Number(t) : t));
                            onUpdateItem({
                              ...selectedItem,
                              payload: { kind: 'array', data: { ...arrData, items: arr } },
                            });
                          }}
                          className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono"
                        />
                      </div>
                      {arrData.items.length >= 2 && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onSemanticAction(selectedItem.id, {
                                kind: 'array-swap',
                                indexA: 0,
                                indexB: 1,
                              })
                            }
                            className="flex-1 py-1 rounded border border-white/15 hover:bg-white/5 text-[11px] cursor-pointer"
                          >
                            交换 [0] ↔ [1]
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onSemanticAction(selectedItem.id, { kind: 'array-clear-pointers' })
                            }
                            className="px-2 py-1 rounded border border-white/15 hover:bg-white/5 text-[11px] cursor-pointer"
                          >
                            清空指针
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {selectedItem.payload.kind === 'linear' && (() => {
                  const linData = selectedItem.payload.data;
                  return (
                    <div className="space-y-2">
                      <label className="block text-[11px] text-slate-400">
                        {zh ? '线性结构元素（逗号分隔）' : 'Linear Items'}
                      </label>
                      <input
                        type="text"
                        value={linData.items.join(', ')}
                        onChange={(e) => {
                          const arr = e.target.value
                            .split(/[,，\s]+/)
                            .filter(Boolean)
                            .map((t) => (Number.isFinite(Number(t)) ? Number(t) : t));
                          onUpdateItem({
                            ...selectedItem,
                            payload: { kind: 'linear', data: { ...linData, items: arr } },
                          });
                        }}
                        className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono"
                      />
                    </div>
                  );
                })()}

                {selectedItem.payload.kind === 'shape' && (() => {
                  const shData = selectedItem.payload.data;
                  return (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {zh ? '图形文本标签' : 'Shape Label'}
                      </label>
                      <input
                        type="text"
                        value={shData.label || ''}
                        onChange={(e) =>
                          onUpdateItem({
                            ...selectedItem,
                            payload: { kind: 'shape', data: { ...shData, label: e.target.value } },
                          })
                        }
                        className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1"
                      />
                    </div>
                  );
                })()}

                {selectedItem.payload.kind === 'codeblock' && (() => {
                  const cb = selectedItem.payload.data;
                  return (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {zh ? '嵌入代码块源码' : 'Embedded Code'}
                        </label>
                        <textarea
                          rows={4}
                          value={cb.code}
                          onChange={(e) =>
                            onUpdateItem({
                              ...selectedItem,
                              payload: { kind: 'codeblock', data: { ...cb, code: e.target.value } },
                            })
                          }
                          className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {zh ? '高亮行号（逗号分隔）' : 'Highlighted Lines'}
                        </label>
                        <input
                          type="text"
                          value={cb.highlightedLines.join(', ')}
                          onChange={(e) => {
                            const lines = e.target.value
                              .split(/[,，\s]+/)
                              .map((x) => Number(x))
                              .filter((n) => Number.isFinite(n) && n > 0);
                            onUpdateItem({
                              ...selectedItem,
                              payload: {
                                kind: 'codeblock',
                                data: { ...cb, highlightedLines: lines },
                              },
                            });
                          }}
                          className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  );
                })()}

                {selectedItem.payload.kind === 'mathgeo' && (() => {
                  const mathData = selectedItem.payload.data;
                  return (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">LaTeX 公式</label>
                      <textarea
                        rows={2}
                        value={mathData.latex || ''}
                        onChange={(e) =>
                          onUpdateItem({
                            ...selectedItem,
                            payload: {
                              kind: 'mathgeo',
                              data: { ...mathData, latex: e.target.value },
                            },
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono"
                      />
                    </div>
                  );
                })()}

                {selectedItem.payload.kind === 'annotation' && (() => {
                  const annoData = selectedItem.payload.data;
                  return (
                    <div className="space-y-2">
                      <label className="block text-[11px] text-slate-400">
                        {zh ? '批注内容' : 'Annotation Text'}
                      </label>
                      <textarea
                        rows={3}
                        value={annoData.text || ''}
                        onChange={(e) =>
                          onUpdateItem({
                            ...selectedItem,
                            payload: {
                              kind: 'annotation',
                              data: { ...annoData, text: e.target.value },
                            },
                          })
                        }
                        className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1"
                      />
                    </div>
                  );
                })()}

                {/* OI Sample <-> Component Bidirectional Converter */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/25 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                    <span>{zh ? '竞赛样例双向转换' : 'OI Sample Converter'}</span>
                  </div>

                  {codeStudioSamples.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {codeStudioSamples.map((sc, idx) => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setSampleInputText(sc.input)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 cursor-pointer"
                        >
                          {zh ? `导入样例 #${idx + 1}` : `Sample #${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    rows={3}
                    value={sampleInputText}
                    onChange={(e) => setSampleInputText(e.target.value)}
                    placeholder={zh ? '粘贴标准竞赛输入文本...' : 'Paste OI sample input...'}
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                  />

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={handleApplyTextToItem}
                      className="py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium cursor-pointer"
                    >
                      {zh ? '应用到当前组件' : 'Apply to Item'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLoadFromItemToText();
                        if (sampleInputText.trim()) {
                          onSyncSampleToCodeStudio(sampleInputText, selectedItem.name);
                        }
                      }}
                      className="py-1.5 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 text-[11px] font-medium cursor-pointer"
                    >
                      {zh ? '提取 / 同步样例' : 'Extract / Sync'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: DEDICATED GRAPH EDITOR */}
        {tab === 'graph' && (
          <>
            {!graphData || !graphItem ? (
              <div className="text-slate-500 text-center py-8">
                {zh
                  ? '请先在画布中选中或添加一个图论组件'
                  : 'Add or select a Graph component on the canvas'}
              </div>
            ) : (
              <div className="space-y-3">
                {!graphValidation.valid && (
                  <div className="p-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 flex items-start gap-2 text-[11px]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{graphValidation.reason}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      {zh ? '图类型' : 'Variant'}
                    </label>
                    <select
                      value={graphData.variant}
                      onChange={(e) =>
                        updateGraphData({
                          ...graphData,
                          variant: e.target.value as AlgoGraphData['variant'],
                        })
                      }
                      className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1"
                    >
                      <option value="directed">有向图 Directed</option>
                      <option value="undirected">无向图 Undirected</option>
                      <option value="weighted">带权图 Weighted</option>
                      <option value="dag">DAG</option>
                      <option value="layered">分层图 Layered</option>
                      <option value="network-flow">网络流 Flow/Cap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      {zh ? '自动排版' : 'Layout'}
                    </label>
                    <select
                      value={graphData.layout}
                      onChange={(e) => {
                        const l = e.target.value as GraphLayoutType;
                        updateGraphData(
                          applyGraphLayout(graphData, l, graphItem.width - 8, graphItem.height - 32)
                        );
                      }}
                      className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1"
                    >
                      <option value="circular">环形 Circular</option>
                      <option value="force">力导向 Force</option>
                      <option value="hierarchical">分层 Hierarchical</option>
                      <option value="tree">树形 Tree</option>
                      <option value="manual">自由 Manual</option>
                    </select>
                  </div>
                </div>

                {/* Add Node */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-300">
                    {zh ? `节点 (${graphData.nodes.length})` : `Nodes (${graphData.nodes.length})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextId = String(graphData.nodes.length + 1);
                      const uniqueId = graphData.nodes.some((n) => n.id === nextId)
                        ? `v${Date.now().toString().slice(-3)}`
                        : nextId;
                      updateGraphData({
                        ...graphData,
                        nodes: [
                          ...graphData.nodes,
                          {
                            id: uniqueId,
                            label: uniqueId,
                            x: 120 + (graphData.nodes.length * 35) % 240,
                            y: 120 + (graphData.nodes.length * 25) % 120,
                          },
                        ],
                      });
                    }}
                    className="px-2 py-1 rounded bg-blue-600 text-white text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {zh ? '添加节点' : 'Add Node'}
                  </button>
                </div>

                {/* Add Edge */}
                <div className="p-2 rounded border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="font-semibold text-[11px] flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                    <span>{zh ? '添加边 (支持重边 / 自环)' : 'Add Edge'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 font-mono">
                    <input
                      value={newEdgeFrom}
                      onChange={(e) => setNewEdgeFrom(e.target.value)}
                      placeholder="u"
                      className="rounded border border-white/15 bg-[#0B0E14] px-2 py-1"
                    />
                    <input
                      value={newEdgeTo}
                      onChange={(e) => setNewEdgeTo(e.target.value)}
                      placeholder="v"
                      className="rounded border border-white/15 bg-[#0B0E14] px-2 py-1"
                    />
                    <input
                      value={newEdgeWeight}
                      onChange={(e) => setNewEdgeWeight(e.target.value)}
                      placeholder="w"
                      className="rounded border border-white/15 bg-[#0B0E14] px-2 py-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const u = newEdgeFrom.trim();
                      const v = newEdgeTo.trim();
                      if (!u || !v) return;
                      const w = Number(newEdgeWeight);
                      const directed = graphData.variant !== 'undirected';
                      updateGraphData({
                        ...graphData,
                        edges: [
                          ...graphData.edges,
                          {
                            id: `edge-${Date.now()}`,
                            from: u,
                            to: v,
                            weight: Number.isFinite(w) ? w : 1,
                            capacity: graphData.variant === 'network-flow' ? (Number.isFinite(w) ? w : 5) : undefined,
                            flow: 0,
                            directed,
                          },
                        ],
                      });
                    }}
                    className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] cursor-pointer"
                  >
                    {zh ? '添加连边' : 'Add Edge'}
                  </button>
                </div>

                {/* Edge List */}
                <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px]">
                  {graphData.edges.map((ed) => (
                    <div
                      key={ed.id}
                      className="px-2 py-1 rounded border border-white/10 flex items-center justify-between gap-2"
                    >
                      <span>
                        {ed.from} {ed.directed ? '→' : '—'} {ed.to}
                        {ed.weight !== undefined ? ` (w=${ed.weight})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateGraphData({
                            ...graphData,
                            edges: graphData.edges.filter((x) => x.id !== ed.id),
                          })
                        }
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 4 Graph Text Formats */}
                <div className="p-2 rounded border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold">
                      {zh ? '文本导入 / 导出' : 'Graph Text I/O'}
                    </span>
                    <select
                      value={graphTextFmt}
                      onChange={(e) => setGraphTextFmt(e.target.value as GraphTextFormat)}
                      className="rounded border border-white/15 bg-[#0B0E14] px-1.5 py-0.5 text-[10px]"
                    >
                      <option value="oi">竞赛 n m</option>
                      <option value="edgelist">边表</option>
                      <option value="adjlist">邻接表</option>
                      <option value="matrix">邻接矩阵</option>
                    </select>
                  </div>
                  <textarea
                    rows={4}
                    value={graphTextDraft}
                    onChange={(e) => setGraphTextDraft(e.target.value)}
                    placeholder={exportGraphToText(graphData, graphTextFmt)}
                    className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGraphTextDraft(exportGraphToText(graphData, graphTextFmt))}
                      className="py-1 rounded border border-white/15 hover:bg-white/5 text-[11px] cursor-pointer"
                    >
                      {zh ? '导出到文本框' : 'Export Text'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!graphTextDraft.trim()) return;
                        const parsed = parseTextToGraph(
                          graphTextDraft,
                          graphTextFmt,
                          graphData.variant !== 'undirected',
                          graphData.variant === 'weighted' || graphData.variant === 'network-flow'
                        );
                        updateGraphData(parsed);
                      }}
                      className="py-1 rounded bg-blue-600 text-white text-[11px] cursor-pointer"
                    >
                      {zh ? '解析生成图' : 'Parse Graph'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 3: CODE & FORMULA LINKAGE + EXTERNAL TRACE IMPORT */}
        {tab === 'code' && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  {zh ? '点击代码行绑定当前步骤高亮' : 'Click lines to link current step'}
                </span>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0B0E14] p-2 font-mono text-[11px] max-h-56 overflow-y-auto">
                {codeLines.map((ln, idx) => {
                  const lineNum = idx + 1;
                  const active = currentStep?.codeLines.includes(lineNum);
                  return (
                    <div
                      key={lineNum}
                      onClick={() => onToggleStepCodeLine(lineNum)}
                      className={`px-1.5 py-0.5 rounded flex items-start gap-2 cursor-pointer transition-colors ${
                        active
                          ? 'bg-blue-500/25 text-white'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="w-5 text-right text-slate-500 select-none shrink-0 tabular-nums">
                        {lineNum}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{ln || ' '}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] text-slate-400">
                  {zh ? '源码编辑' : 'Linked Code'}
                </label>
                <button
                  type="button"
                  onClick={() => onUpdateScene({ lockedCode: !scene.lockedCode })}
                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                    scene.lockedCode
                      ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                      : 'border-white/15 text-slate-400'
                  }`}
                >
                  {scene.lockedCode ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                  <span>{scene.lockedCode ? (zh ? '已锁定' : 'Locked') : zh ? '锁定源码' : 'Lock'}</span>
                </button>
              </div>
              <textarea
                rows={5}
                disabled={Boolean(scene.lockedCode)}
                value={scene.linkedCode}
                onChange={(e) => onUpdateScene({ linkedCode: e.target.value })}
                className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1.5 font-mono text-[11px] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {zh ? '全局状态转移公式 (LaTeX)' : 'Transition Formula (LaTeX)'}
              </label>
              <input
                type="text"
                value={scene.formulaLatex}
                onChange={(e) => onUpdateScene({ formulaLatex: e.target.value })}
                className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
              />
            </div>

            <div className="p-2 rounded border border-white/10 bg-black/25 space-y-2">
              <div className="font-semibold text-[11px] flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{zh ? '外部执行轨迹导入 (JSON)' : 'External Trace Import (JSON)'}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {zh
                  ? '已为未来 Yanpb CodeLab 沙盒预留标准轨迹协议接口；支持粘贴外部 Trace JSON 驱动画布推演。'
                  : 'Reserved protocol for future Yanpb CodeLab sandbox traces.'}
              </p>
              <textarea
                rows={3}
                value={traceJsonInput}
                onChange={(e) => setTraceJsonInput(e.target.value)}
                placeholder='{"steps":[{"title":"Step 1","explanation":"...","codeLines":[1],"variables":[{"name":"i","value":"0"}]}]}'
                className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono text-[10px]"
              />
              <button
                type="button"
                onClick={() => onImportExternalTrace(traceJsonInput)}
                className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium cursor-pointer"
              >
                {zh ? '载入外部轨迹 JSON' : 'Load Trace JSON'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE VARIABLE WATCHER & EVENT LOG */}
        {tab === 'vars' && (
          <div className="space-y-3">
            <div>
              <div className="font-semibold text-slate-300 mb-1.5">
                {zh ? '当前步骤变量监视' : 'Variable Watcher'}
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {(currentStep?.snapshot.variables || []).length === 0 ? (
                  <div className="text-slate-500">{zh ? '暂无变量快照' : 'No variables'}</div>
                ) : (
                  currentStep?.snapshot.variables.map((v, i) => (
                    <div
                      key={i}
                      className={`px-2 py-1 rounded border flex items-center justify-between tabular-nums ${
                        v.changed
                          ? 'bg-blue-500/15 border-blue-400/50 text-blue-200'
                          : 'bg-[#0B0E14] border-white/10 text-slate-300'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="font-semibold">{v.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-300 mb-1.5">
                {zh ? '算法执行事件日志' : 'Algorithm Event Log'}
              </div>
              <div className="space-y-1 text-[11px]">
                {(currentStep?.events || []).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2 rounded border border-white/10 bg-[#0B0E14] flex items-start justify-between gap-2"
                  >
                    <span className="font-mono text-[10px] uppercase text-blue-400 shrink-0">
                      {ev.type}
                    </span>
                    <span className="text-slate-200 flex-1">{ev.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: VALIDATION REPORT & TEACHING DESIGN (2.0) */}
        {tab === 'verify' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg border border-white/10 bg-[#0B0E14] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{zh ? '验证状态与轨迹来源' : 'Validation & Trace Source'}</span>
                </span>
                <span
                  className={`font-mono text-[10px] font-bold uppercase ${
                    validationReport.status === 'verified'
                      ? 'text-emerald-400'
                      : validationReport.status === 'error'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                  }`}
                >
                  {validationReport.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                轨迹来源：<span className="font-mono text-slate-200">{validationReport.traceSource}</span>
              </div>
              <div className="text-[11px] text-slate-300">{validationReport.summary}</div>
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono text-[10px] tabular-nums">
                <div className="p-1.5 rounded bg-white/[0.03]">
                  组件 {validationReport.stats.componentCount}
                </div>
                <div className="p-1.5 rounded bg-white/[0.03]">
                  步骤 {validationReport.stats.stepCount}
                </div>
                <div className="p-1.5 rounded bg-white/[0.03]">
                  事件 {validationReport.stats.eventCount}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-white/10 bg-[#0B0E14] space-y-2">
              <div className="font-semibold text-[11px]">
                {zh ? '输出一致性核验' : 'Output Verification'}
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">
                    {zh ? '期望输出' : 'Expected'}
                  </label>
                  <input
                    value={scene.expectedOutput || ''}
                    onChange={(e) => onUpdateScene({ expectedOutput: e.target.value })}
                    placeholder="如 28"
                    className="w-full rounded border border-white/15 bg-black/30 px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">
                    {zh ? '实际输出' : 'Actual'}
                  </label>
                  <input
                    value={scene.actualOutput || ''}
                    onChange={(e) => onUpdateScene({ actualOutput: e.target.value })}
                    placeholder="DSL/计算结果"
                    className="w-full rounded border border-white/15 bg-black/30 px-2 py-1"
                  />
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-white/10 bg-[#0B0E14] space-y-2">
              <div className="font-semibold text-[11px]">
                {zh ? '课堂教学与视图模式' : 'Teaching Design'}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={scene.teaching?.tier || 'CSP-J'}
                  onChange={(e) =>
                    onUpdateScene({
                      teaching: {
                        tier: e.target.value as TeachingTier,
                        style: scene.teaching?.style || 'deductive',
                        viewRole: scene.teaching?.viewRole || 'coach',
                      },
                    })
                  }
                  className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px]"
                >
                  {(['GESP', 'CSP-J', 'CSP-S', 'NOIP', 'ACM', '省选基础'] as TeachingTier[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={scene.teaching?.style || 'deductive'}
                  onChange={(e) =>
                    onUpdateScene({
                      teaching: {
                        tier: scene.teaching?.tier || 'CSP-J',
                        style: e.target.value as TeachingStyle,
                        viewRole: scene.teaching?.viewRole || 'coach',
                      },
                    })
                  }
                  className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px]"
                >
                  <option value="heuristic">启发式教学</option>
                  <option value="deductive">推导型讲解</option>
                  <option value="comparative">双解法对比</option>
                  <option value="diagnosis">错误诊断对比</option>
                  <option value="interactive_qa">课堂问答互动</option>
                  <option value="presentation">简洁演示模式</option>
                </select>
              </div>
              <div className="flex gap-1.5">
                {(['coach', 'student'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      onUpdateScene({
                        teaching: {
                          tier: scene.teaching?.tier || 'CSP-J',
                          style: scene.teaching?.style || 'deductive',
                          viewRole: role,
                        },
                      })
                    }
                    className={`flex-1 py-1 rounded border text-[11px] font-medium cursor-pointer ${
                      (scene.teaching?.viewRole || 'coach') === role
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-white/15 text-slate-400'
                    }`}
                  >
                    {role === 'coach' ? (zh ? '教练视角 (全批注)' : 'Coach') : zh ? '学生视角 (隐藏提示)' : 'Student'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-[11px] text-slate-300">
                {zh ? `校验明细 (${validationReport.issues.length})` : `Issues (${validationReport.issues.length})`}
              </div>
              {validationReport.issues.length === 0 ? (
                <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{zh ? '所有边界、数据结构与快照校验均已通过。' : 'All checks passed.'}</span>
                </div>
              ) : (
                validationReport.issues.map((iss) => (
                  <div
                    key={iss.id}
                    className={`p-2 rounded border text-[11px] space-y-1 ${
                      iss.severity === 'error'
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                        : iss.severity === 'warning'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                          : 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                    }`}
                  >
                    <div className="font-semibold">
                      [{iss.location}] {iss.message}
                    </div>
                    <div className="text-[10px] opacity-85">建议：{iss.suggestion}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
