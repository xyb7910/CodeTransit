import React from 'react';
import {
  AlgoCanvasItem,
  InnerSubSelection,
} from '../../types/algorithmStudio';
import { HighlightColor, Locale } from '../../types/workspace';
import { LayerZAction, SemanticSubEditAction } from '../../utils/canvasCommands';

interface CanvasContextMenuProps {
  locale: Locale;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetItem: AlgoCanvasItem | null;
  subSelection?: InnerSubSelection;
  selectedCount: number;
  hasClipboard: boolean;
  hasCopiedStyle: boolean;
  onClose: () => void;
  onEnterInnerEdit: (itemId: string) => void;
  onSemanticAction: (itemId: string, action: SemanticSubEditAction) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: (inPlace: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onGroup: (group: boolean) => void;
  onLayerZ: (action: LayerZAction) => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onToggleLock: () => void;
  onToggleHide: () => void;
  onSelectAll: () => void;
  onFitContent: () => void;
  onZoom100: () => void;
  onAutoLayout: () => void;
}

const HL_COLORS: Array<{ id: HighlightColor; labelZh: string }> = [
  { id: 'blue', labelZh: '蓝' },
  { id: 'yellow', labelZh: '黄' },
  { id: 'green', labelZh: '绿' },
  { id: 'red', labelZh: '红' },
];

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  locale,
  x,
  y,
  worldX,
  worldY,
  targetItem,
  subSelection,
  selectedCount,
  hasClipboard,
  hasCopiedStyle,
  onClose,
  onEnterInnerEdit,
  onSemanticAction,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  onGroup,
  onLayerZ,
  onCopyStyle,
  onPasteStyle,
  onToggleLock,
  onToggleHide,
  onSelectAll,
  onFitContent,
  onZoom100,
  onAutoLayout,
}) => {
  const zh = locale === 'zh-CN';
  const menuLeft = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 240 : x);
  const menuTop = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 360 : y);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50"
      onPointerDown={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{ left: `${menuLeft}px`, top: `${menuTop}px` }}
        className="fixed w-56 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#121824] shadow-2xl py-1.5 text-xs text-slate-800 dark:text-slate-100 select-none"
      >
        {/* Semantic Sub-Element Context Section */}
        {targetItem && subSelection?.kind === 'array-cell' && subSelection.index !== undefined && (
          <div className="border-b border-slate-200 dark:border-white/10 pb-1 mb-1">
            <div className="px-3 py-1 text-[10px] font-mono text-amber-400">
              数组下标 [{subSelection.index}]
            </div>
            <button
              type="button"
              onClick={() =>
                run(() =>
                  onSemanticAction(targetItem.id, {
                    kind: 'array-insert-left',
                    index: subSelection.index!,
                    value: 0,
                  })
                )
              }
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '在左侧插入元素 (0)' : 'Insert Element Left'}
            </button>
            <button
              type="button"
              onClick={() =>
                run(() =>
                  onSemanticAction(targetItem.id, {
                    kind: 'array-insert-right',
                    index: subSelection.index!,
                    value: 0,
                  })
                )
              }
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '在右侧插入元素 (0)' : 'Insert Element Right'}
            </button>
            <button
              type="button"
              onClick={() =>
                run(() =>
                  onSemanticAction(targetItem.id, {
                    kind: 'array-set-pointer',
                    index: subSelection.index!,
                    label: 'i',
                    color: 'blue',
                  })
                )
              }
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '移动指针 ↑i 到此位' : 'Move Pointer i Here'}
            </button>
            <button
              type="button"
              onClick={() =>
                run(() =>
                  onSemanticAction(targetItem.id, {
                    kind: 'array-delete',
                    index: subSelection.index!,
                  })
                )
              }
              className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-500/15 cursor-pointer"
            >
              {zh ? '删除当前数组元素' : 'Delete Array Element'}
            </button>
          </div>
        )}

        {targetItem &&
          (subSelection?.kind === 'dp-cell' || subSelection?.kind === 'matrix-cell') &&
          subSelection.row !== undefined &&
          subSelection.col !== undefined && (
            <div className="border-b border-slate-200 dark:border-white/10 pb-1 mb-1">
              <div className="px-3 py-1 text-[10px] font-mono text-emerald-400">
                单元格 [{subSelection.row}][{subSelection.col}]
              </div>
              <button
                type="button"
                onClick={() =>
                  run(() =>
                    onSemanticAction(targetItem.id, {
                      kind: 'cell-set-active',
                      row: subSelection.row!,
                      col: subSelection.col!,
                    })
                  )
                }
                className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
              >
                {zh ? '设为当前活跃转移格' : 'Set Active Cell'}
              </button>
              <div className="px-3 py-1 flex items-center gap-1">
                <span className="text-[10px] text-slate-400 mr-1">{zh ? '高亮:' : 'HL:'}</span>
                {HL_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      run(() =>
                        onSemanticAction(targetItem.id, {
                          kind: 'cell-highlight',
                          row: subSelection.row!,
                          col: subSelection.col!,
                          color: c.id,
                        })
                      )
                    }
                    className="px-1.5 py-0.5 rounded border border-white/15 hover:bg-white/10 text-[10px] cursor-pointer"
                  >
                    {c.labelZh}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    run(() =>
                      onSemanticAction(targetItem.id, {
                        kind: 'cell-highlight',
                        row: subSelection.row!,
                        col: subSelection.col!,
                        color: null,
                      })
                    )
                  }
                  className="px-1.5 py-0.5 rounded border border-white/15 hover:bg-white/10 text-[10px] text-slate-400 cursor-pointer"
                >
                  无
                </button>
              </div>
            </div>
          )}

        {targetItem && subSelection?.kind === 'graph-node' && subSelection.nodeId && (
          <div className="border-b border-slate-200 dark:border-white/10 pb-1 mb-1">
            <div className="px-3 py-1 text-[10px] font-mono text-blue-400">
              图节点 ({subSelection.nodeId})
            </div>
            <button
              type="button"
              onClick={() =>
                run(() =>
                  onSemanticAction(targetItem.id, {
                    kind: 'graph-set-role',
                    nodeId: subSelection.nodeId!,
                    role: 'start',
                  })
                )
              }
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '标记为起点 (S)' : 'Mark as Start (S)'}
            </button>
            <button
              type="button"
              onClick={() =>
                run(() =>
                  onSemanticAction(targetItem.id, {
                    kind: 'graph-set-role',
                    nodeId: subSelection.nodeId!,
                    role: 'end',
                  })
                )
              }
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '标记为终点 (T)' : 'Mark as End (T)'}
            </button>
            <button
              type="button"
              onClick={() =>
                run(() =>
                  onSemanticAction(targetItem.id, {
                    kind: 'graph-toggle-highlight',
                    nodeId: subSelection.nodeId!,
                    color: 'orange',
                  })
                )
              }
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '切换节点高亮' : 'Toggle Node Highlight'}
            </button>
          </div>
        )}

        {/* Item Context Actions */}
        {targetItem ? (
          <>
            <button
              type="button"
              onClick={() => run(() => onEnterInnerEdit(targetItem.id))}
              className="w-full px-3 py-1.5 text-left font-semibold text-blue-400 hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '进入内部元素编辑 (Enter)' : 'Enter Inner Edit'}
            </button>
            <button
              type="button"
              onClick={() => run(onCopy)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 flex justify-between cursor-pointer"
            >
              <span>{zh ? '复制' : 'Copy'}</span>
              <span className="font-mono text-[10px] text-slate-400">Ctrl+C</span>
            </button>
            <button
              type="button"
              onClick={() => run(onCut)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 flex justify-between cursor-pointer"
            >
              <span>{zh ? '剪切' : 'Cut'}</span>
              <span className="font-mono text-[10px] text-slate-400">Ctrl+X</span>
            </button>
            <button
              type="button"
              onClick={() => run(onDuplicate)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 flex justify-between cursor-pointer"
            >
              <span>{zh ? '创建副本' : 'Duplicate'}</span>
              <span className="font-mono text-[10px] text-slate-400">Ctrl+D</span>
            </button>

            <div className="my-1 border-t border-slate-200 dark:border-white/10" />

            <button
              type="button"
              onClick={() => run(() => onLayerZ('top'))}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '置于顶层' : 'Bring to Front'}
            </button>
            <button
              type="button"
              onClick={() => run(() => onLayerZ('bottom'))}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '置于底层' : 'Send to Back'}
            </button>
            {selectedCount > 1 && (
              <button
                type="button"
                onClick={() => run(() => onGroup(true))}
                className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
              >
                {zh ? '组合选中元素 (Ctrl+G)' : 'Group Selected'}
              </button>
            )}
            {targetItem.groupId && (
              <button
                type="button"
                onClick={() => run(() => onGroup(false))}
                className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
              >
                {zh ? '取消组合 (Ctrl+Shift+G)' : 'Ungroup'}
              </button>
            )}

            <div className="my-1 border-t border-slate-200 dark:border-white/10" />

            <button
              type="button"
              onClick={() => run(onCopyStyle)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '复制视觉样式' : 'Copy Style'}
            </button>
            <button
              type="button"
              disabled={!hasCopiedStyle}
              onClick={() => run(onPasteStyle)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 disabled:opacity-40 cursor-pointer"
            >
              {zh ? '粘贴样式' : 'Paste Style'}
            </button>

            <div className="my-1 border-t border-slate-200 dark:border-white/10" />

            <button
              type="button"
              onClick={() => run(onToggleLock)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {targetItem.locked ? (zh ? '解锁元素' : 'Unlock') : zh ? '锁定位置' : 'Lock'}
            </button>
            <button
              type="button"
              onClick={() => run(onToggleHide)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '隐藏图层' : 'Hide Layer'}
            </button>
            <button
              type="button"
              onClick={() => run(onDelete)}
              className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-500/15 cursor-pointer"
            >
              {zh ? '删除组件' : 'Delete'}
            </button>
          </>
        ) : (
          /* Blank Canvas Context Actions */
          <>
            <div className="px-3 py-1 text-[10px] font-mono text-slate-400 tabular-nums">
              画布坐标 ({worldX}, {worldY})
            </div>
            <button
              type="button"
              disabled={!hasClipboard}
              onClick={() => run(() => onPaste(false))}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 disabled:opacity-40 cursor-pointer"
            >
              {zh ? '粘贴元素' : 'Paste'}
            </button>
            <button
              type="button"
              disabled={!hasClipboard}
              onClick={() => run(() => onPaste(true))}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 disabled:opacity-40 cursor-pointer"
            >
              {zh ? '原位置粘贴' : 'Paste in Place'}
            </button>
            <button
              type="button"
              onClick={() => run(onSelectAll)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 flex justify-between cursor-pointer"
            >
              <span>{zh ? '全选画布元素' : 'Select All'}</span>
              <span className="font-mono text-[10px] text-slate-400">Ctrl+A</span>
            </button>
            <div className="my-1 border-t border-slate-200 dark:border-white/10" />
            <button
              type="button"
              onClick={() => run(onFitContent)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 flex justify-between cursor-pointer"
            >
              <span>{zh ? '适应画布内容' : 'Fit Content'}</span>
              <span className="font-mono text-[10px] text-slate-400">Shift+1</span>
            </button>
            <button
              type="button"
              onClick={() => run(onZoom100)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 flex justify-between cursor-pointer"
            >
              <span>{zh ? '恢复 100% 缩放' : 'Zoom 100%'}</span>
              <span className="font-mono text-[10px] text-slate-400">Shift+0</span>
            </button>
            <button
              type="button"
              onClick={() => run(onAutoLayout)}
              className="w-full px-3 py-1.5 text-left hover:bg-blue-500/15 cursor-pointer"
            >
              {zh ? '智能防重叠自动排版' : 'Smart Auto Layout'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
