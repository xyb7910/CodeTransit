import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Bot,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  Folder,
  Layers,
  Lock,
  Play,
  Plus,
  Search,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  ALGO_COMPONENT_CATEGORIES,
  ALGORITHM_TEMPLATES,
  AlgoTemplateDefinition,
  AlgoTemplateInputParams,
} from '../../constants/algorithmTemplates';
import {
  AlgoAssetItem,
  AlgoCanvasItem,
  AlgoComponentType,
  Artboard,
} from '../../types/algorithmStudio';
import { ContestTier, Locale } from '../../types/workspace';
import { reorderLayerZ } from '../../utils/canvasCommands';

interface StudioLeftPanelProps {
  locale: Locale;
  artboard: Artboard;
  selectedIds: string[];
  activeTemplateId: string;
  assets: AlgoAssetItem[];
  hasAiKey?: boolean;
  onAddComponent: (type: AlgoComponentType) => void;
  onSelectIds: (ids: string[]) => void;
  onUpdateItems: (items: AlgoCanvasItem[]) => void;
  onDeleteItemWithConnectors?: (itemId: string) => void;
  onLoadTemplate: (tpl: AlgoTemplateDefinition, params: AlgoTemplateInputParams) => void;
  onSaveAsset: (item: AlgoCanvasItem) => void;
  onInsertAsset: (asset: AlgoAssetItem) => void;
  onDeleteAsset: (id: string) => void;
}

type LeftTab = 'palette' | 'layers' | 'templates' | 'assets';

export const StudioLeftPanel: React.FC<StudioLeftPanelProps> = ({
  locale,
  artboard,
  selectedIds,
  activeTemplateId,
  assets,
  hasAiKey = false,
  onAddComponent,
  onSelectIds,
  onUpdateItems,
  onDeleteItemWithConnectors,
  onLoadTemplate,
  onSaveAsset,
  onInsertAsset,
  onDeleteAsset,
}) => {
  const [tab, setTab] = useState<LeftTab>('templates');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    'array-matrix': true,
    linear: true,
    graph: true,
    dp: true,
    'shapes-code': true,
  });
  const [tierFilter, setTierFilter] = useState<'ALL' | ContestTier>('ALL');
  const [selectedTplId, setSelectedTplId] = useState<string>(
    activeTemplateId || ALGORITHM_TEMPLATES[0].id
  );
  const [paramDrafts, setParamDrafts] = useState<Record<string, AlgoTemplateInputParams>>({});
  const [layerQuery, setLayerQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const zh = locale === 'zh-CN';
  const sortedLayers = [...artboard.items]
    .sort((a, b) => b.zIndex - a.zIndex)
    .filter((it) => {
      const q = layerQuery.trim().toLowerCase();
      if (!q) return true;
      return it.name.toLowerCase().includes(q) || it.type.toLowerCase().includes(q);
    });

  const groups = artboard.groups || [];
  const selectedTpl =
    ALGORITHM_TEMPLATES.find((t) => t.id === selectedTplId) || ALGORITHM_TEMPLATES[0];
  const currentParams = paramDrafts[selectedTpl.id] || selectedTpl.defaultParams;

  const updateParam = (patch: Partial<AlgoTemplateInputParams>) => {
    setParamDrafts((prev) => ({
      ...prev,
      [selectedTpl.id]: { ...(prev[selectedTpl.id] || selectedTpl.defaultParams), ...patch },
    }));
  };

  const filteredTemplates = ALGORITHM_TEMPLATES.filter(
    (t) => tierFilter === 'ALL' || t.tier === tierFilter
  );

  const handleToggleIsolate = (targetId: string) => {
    if (isolatedId === targetId) {
      setIsolatedId(null);
      onUpdateItems(artboard.items.map((x) => ({ ...x, visible: true })));
    } else {
      setIsolatedId(targetId);
      onUpdateItems(artboard.items.map((x) => ({ ...x, visible: x.id === targetId })));
      onSelectIds([targetId]);
    }
  };

  const handleDropReorder = (targetId: string) => {
    if (!draggingLayerId || draggingLayerId === targetId) return;
    const desc = [...artboard.items].sort((a, b) => b.zIndex - a.zIndex);
    const fromIdx = desc.findIndex((x) => x.id === draggingLayerId);
    const toIdx = desc.findIndex((x) => x.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = desc.splice(fromIdx, 1);
    desc.splice(toIdx, 0, moved);
    const asc = desc.reverse().map((it, idx) => ({ ...it, zIndex: idx + 1 }));
    onUpdateItems(asc);
    setDraggingLayerId(null);
  };

  const renderLayerRow = (item: AlgoCanvasItem, indented = false) => {
    const isSel = selectedIds.includes(item.id);
    const isRenaming = renamingId === item.id;
    return (
      <div
        key={item.id}
        draggable={!isRenaming}
        onDragStart={() => setDraggingLayerId(item.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDropReorder(item.id)}
        onClick={(e) => {
          if (e.shiftKey) {
            onSelectIds(
              isSel ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id]
            );
          } else {
            onSelectIds([item.id]);
          }
        }}
        className={`px-2 py-1.5 rounded-lg border flex items-center justify-between gap-1 cursor-pointer ${
          indented ? 'ml-3' : ''
        } ${
          isSel
            ? 'border-blue-500 bg-blue-500/10 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Layers className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          {isRenaming ? (
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onBlur={() => {
                if (renameDraft.trim()) {
                  onUpdateItems(
                    artboard.items.map((x) =>
                      x.id === item.id ? { ...x, name: renameDraft.trim() } : x
                    )
                  );
                }
                setRenamingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (renameDraft.trim()) {
                    onUpdateItems(
                      artboard.items.map((x) =>
                        x.id === item.id ? { ...x, name: renameDraft.trim() } : x
                      )
                    );
                  }
                  setRenamingId(null);
                } else if (e.key === 'Escape') {
                  setRenamingId(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-blue-500 bg-[#0B0E14] px-1 text-[11px] text-white outline-none"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setRenamingId(item.id);
                setRenameDraft(item.name);
              }}
              title={zh ? '双击重命名 · 支持拖拽调整层级' : 'Double-click to rename · Drag to reorder'}
              className="truncate font-medium"
            >
              {item.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title={zh ? '上移一层' : 'Bring Forward'}
            onClick={() => onUpdateItems(reorderLayerZ(artboard.items, [item.id], 'up'))}
            className="p-0.5 hover:bg-white/10 rounded cursor-pointer"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            title={zh ? '下移一层' : 'Send Backward'}
            onClick={() => onUpdateItems(reorderLayerZ(artboard.items, [item.id], 'down'))}
            className="p-0.5 hover:bg-white/10 rounded cursor-pointer"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            title={zh ? '隔离显示此图层' : 'Isolate Layer'}
            onClick={() => handleToggleIsolate(item.id)}
            className={`p-0.5 rounded cursor-pointer ${
              isolatedId === item.id ? 'text-amber-400 bg-amber-500/20' : 'hover:bg-white/10 text-slate-400'
            }`}
          >
            <Crosshair className="w-3 h-3" />
          </button>
          {hasAiKey && (
            <button
              type="button"
              title={zh ? '防 AI 覆盖保护锁 (aiLocked)' : 'Protect from AI edits'}
              onClick={() =>
                onUpdateItems(
                  artboard.items.map((x) =>
                    x.id === item.id ? { ...x, aiLocked: !x.aiLocked } : x
                  )
                )
              }
              className={`p-0.5 rounded cursor-pointer ${
                item.aiLocked ? 'text-purple-400 bg-purple-500/20' : 'hover:bg-white/10 text-slate-400'
              }`}
            >
              <Bot className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            title={zh ? '保存为复用组件' : 'Save Asset'}
            onClick={() => onSaveAsset(item)}
            className="p-0.5 hover:bg-white/10 rounded cursor-pointer"
          >
            <BookmarkPlus className="w-3 h-3 text-blue-400" />
          </button>
          <button
            type="button"
            title={zh ? '显隐切换' : 'Toggle Visibility'}
            onClick={() =>
              onUpdateItems(
                artboard.items.map((x) =>
                  x.id === item.id ? { ...x, visible: !x.visible } : x
                )
              )
            }
            className="p-0.5 hover:bg-white/10 rounded cursor-pointer"
          >
            {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
          </button>
          <button
            type="button"
            title={zh ? '锁定 / 解锁位置' : 'Lock Position'}
            onClick={() =>
              onUpdateItems(
                artboard.items.map((x) =>
                  x.id === item.id ? { ...x, locked: !x.locked } : x
                )
              )
            }
            className="p-0.5 hover:bg-white/10 rounded cursor-pointer"
          >
            {item.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
          </button>
          <button
            type="button"
            title={zh ? '删除组件' : 'Delete'}
            onClick={() => {
              if (onDeleteItemWithConnectors) onDeleteItemWithConnectors(item.id);
              else onUpdateItems(artboard.items.filter((x) => x.id !== item.id));
            }}
            className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="h-full flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F141E] text-xs select-none">
      {/* 4-Tab Header */}
      <div className="grid grid-cols-4 border-b border-slate-200 dark:border-white/10 shrink-0">
        {(
          [
            ['templates', zh ? '模板' : 'Algos'],
            ['palette', zh ? '组件' : 'Blocks'],
            ['layers', zh ? '图层' : 'Layers'],
            ['assets', zh ? '资产' : 'Assets'],
          ] as Array<[LeftTab, string]>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'palette' && (
          <div className="space-y-2">
            {ALGO_COMPONENT_CATEGORIES.map((cat) => {
              const isOpen = !!openCats[cat.id];
              return (
                <div
                  key={cat.id}
                  className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenCats((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                    className="w-full px-2.5 py-2 flex items-center justify-between bg-slate-50 dark:bg-white/[0.03] text-left font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <span>{zh ? cat.nameZh : cat.nameEn}</span>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  {isOpen && (
                    <div className="p-1.5 grid grid-cols-2 gap-1.5">
                      {cat.items.map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => onAddComponent(item.type)}
                          className="px-2 py-1.5 rounded border border-slate-200 dark:border-white/10 hover:border-blue-500/60 hover:bg-blue-500/10 text-left text-[11px] text-slate-700 dark:text-slate-200 flex items-center justify-between gap-1 cursor-pointer transition-colors"
                        >
                          <span className="truncate">{zh ? item.labelZh : item.labelEn}</span>
                          <Plus className="w-3 h-3 shrink-0 text-blue-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'layers' && (
          <div className="space-y-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
              <input
                value={layerQuery}
                onChange={(e) => setLayerQuery(e.target.value)}
                placeholder={zh ? '搜索图层名称或类型...' : 'Search layers...'}
                className="w-full pl-7 pr-2 py-1 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] text-[11px]"
              />
            </div>

            {sortedLayers.length === 0 && (
              <div className="text-slate-500 text-center py-6">
                {zh ? '当前画板暂无匹配图层' : 'No matching layers'}
              </div>
            )}

            {/* Grouped Layers */}
            {groups.map((grp) => {
              const children = sortedLayers.filter((it) => it.groupId === grp.id);
              if (children.length === 0) return null;
              const isCol = !!collapsedGroups[grp.id];
              return (
                <div key={grp.id} className="space-y-1">
                  <div
                    onClick={() => onSelectIds(children.map((c) => c.id))}
                    className="px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsedGroups((p) => ({ ...p, [grp.id]: !p[grp.id] }));
                        }}
                        className="cursor-pointer"
                      >
                        {isCol ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <Folder className="w-3 h-3 text-blue-400" />
                      <span>{grp.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{children.length}</span>
                  </div>
                  {!isCol && children.map((child) => renderLayerRow(child, true))}
                </div>
              );
            })}

            {/* Ungrouped Layers */}
            {sortedLayers
              .filter((it) => !it.groupId || !groups.some((g) => g.id === it.groupId))
              .map((item) => renderLayerRow(item, false))}
          </div>
        )}

        {tab === 'templates' && (
          <div className="space-y-3">
            {/* Tier Filter */}
            <div className="flex flex-wrap gap-1">
              {(['ALL', 'CSP-J', 'CSP-S', 'NOIP', 'ACM'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setTierFilter(tier)}
                  className={`px-2 py-1 rounded text-[11px] font-mono border cursor-pointer ${
                    tierFilter === tier
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tier === 'ALL' ? (zh ? '全部' : 'All') : tier}
                </button>
              ))}
            </div>

            {/* Algorithm List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredTemplates.map((tpl) => {
                const active = tpl.id === selectedTpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTplId(tpl.id)}
                    className={`w-full p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {zh ? tpl.nameZh : tpl.nameEn}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{tpl.tier}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {tpl.descriptionZh}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Live Input Params for Selected Algorithm */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/25 space-y-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {zh ? '输入数据参数' : 'Algorithm Inputs'}
              </div>

              {selectedTpl.defaultParams.arrayInput !== undefined && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {zh ? '数组 / 序列输入（空格或竞赛格式）' : 'Array Input'}
                  </label>
                  <textarea
                    rows={2}
                    value={currentParams.arrayInput ?? ''}
                    onChange={(e) => updateParam({ arrayInput: e.target.value })}
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                  />
                </div>
              )}

              {selectedTpl.defaultParams.target !== undefined && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Target</label>
                  <input
                    type="number"
                    value={currentParams.target ?? 0}
                    onChange={(e) => updateParam({ target: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                  />
                </div>
              )}

              {selectedTpl.defaultParams.knapsackInput !== undefined && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {zh ? '背包样例 (首行 N C，后续每行 w v)' : 'Knapsack (N C / w v)'}
                  </label>
                  <textarea
                    rows={4}
                    value={currentParams.knapsackInput ?? ''}
                    onChange={(e) => updateParam({ knapsackInput: e.target.value })}
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                  />
                </div>
              )}

              {selectedTpl.defaultParams.graphText !== undefined && (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {zh ? '图边表输入 (首行 n m，每行 u v [w])' : 'Graph Edges (n m / u v [w])'}
                    </label>
                    <textarea
                      rows={4}
                      value={currentParams.graphText ?? ''}
                      onChange={(e) => updateParam({ graphText: e.target.value })}
                      className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                    />
                  </div>
                  {selectedTpl.defaultParams.startNode !== undefined && (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {zh ? '起点编号' : 'Start Node'}
                      </label>
                      <input
                        type="text"
                        value={currentParams.startNode ?? '1'}
                        onChange={(e) => updateParam({ startNode: e.target.value })}
                        className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                      />
                    </div>
                  )}
                </>
              )}

              {selectedTpl.defaultParams.permN !== undefined && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">N (2..3)</label>
                  <input
                    type="number"
                    min={2}
                    max={3}
                    value={currentParams.permN ?? 3}
                    onChange={(e) => updateParam({ permN: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                  />
                </div>
              )}

              {selectedTpl.defaultParams.dsuOpsText !== undefined && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {zh ? '合并操作 (每行 u v)' : 'Union Pairs (u v)'}
                  </label>
                  <textarea
                    rows={3}
                    value={currentParams.dsuOpsText ?? ''}
                    onChange={(e) => updateParam({ dsuOpsText: e.target.value })}
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => onLoadTemplate(selectedTpl, currentParams)}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                {zh ? '加载并生成执行轨迹' : 'Load & Generate Trace'}
              </button>
            </div>
          </div>
        )}

        {tab === 'assets' && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">
              {zh
                ? '在「图层」中点击收藏图标，即可保存可复用组件模板。'
                : 'Bookmark any layer item to save reusable components here.'}
            </p>
            {assets.length === 0 && (
              <div className="text-slate-500 text-center py-6">
                {zh ? '暂无保存的复用组件' : 'No saved assets yet'}
              </div>
            )}
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{asset.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">{asset.category}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onInsertAsset(asset)}
                    className="px-2 py-1 rounded bg-blue-600 text-white text-[11px] cursor-pointer"
                  >
                    {zh ? '插入' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAsset(asset.id)}
                    className="p-1 text-rose-400 hover:bg-rose-500/15 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
