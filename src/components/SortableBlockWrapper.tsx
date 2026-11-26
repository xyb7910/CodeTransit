import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { BlockStyleOverride, CanvasBlock, Locale } from '../types/workspace';
import { getTranslations } from '../constants/i18n';

interface SortableBlockWrapperProps {
  block: CanvasBlock;
  locale: Locale;
  isClassicOnly: boolean;
  exportMode?: boolean;
  onToggleCollapse: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateStyleOverride: (id: string, override: BlockStyleOverride) => void;
  children: React.ReactNode;
}

export const SortableBlockWrapper: React.FC<SortableBlockWrapperProps> = ({
  block,
  locale,
  isClassicOnly,
  exportMode = false,
  onToggleCollapse,
  onToggleVisible,
  onDuplicate,
  onDelete,
  onUpdateStyleOverride,
  children,
}) => {
  const t = getTranslations(locale);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: exportMode || isClassicOnly,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    paddingTop: block.styleOverride?.paddingY ?? undefined,
    paddingBottom: block.styleOverride?.paddingY ?? undefined,
  };

  if (exportMode) {
    if (!block.visible) return null;
    return (
      <div
        style={{
          paddingTop: block.styleOverride?.paddingY ?? undefined,
          paddingBottom: block.styleOverride?.paddingY ?? undefined,
          backgroundColor: block.styleOverride?.surfaceTint || undefined,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative w-full min-w-0 transition-opacity ${
        !block.visible ? 'opacity-45' : ''
      }`}
    >
      {/* Block Control Strip (shown on hover or when expanded in multi-block mode) */}
      {!isClassicOnly && (
        <div
          data-export-ignore="true"
          className="flex items-center justify-between gap-2 mb-1.5 px-2 py-1 rounded-md bg-black/25 dark:bg-black/35 backdrop-blur-sm text-white/85 text-xs border border-white/10"
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              {...attributes}
              {...listeners}
              title={locale === 'zh-CN' ? '拖拽排序' : 'Drag to reorder'}
              className="p-1 rounded hover:bg-white/15 cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium truncate">{block.customTitle || t.blocks[block.type]}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0 relative">
            <button
              type="button"
              onClick={() => setShowStyleMenu((v) => !v)}
              title={locale === 'zh-CN' ? '局部样式' : 'Block Style'}
              className="p-1 rounded hover:bg-white/15 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onToggleVisible(block.id)}
              title={block.visible ? (locale === 'zh-CN' ? '隐藏模块' : 'Hide') : (locale === 'zh-CN' ? '显示模块' : 'Show')}
              className="p-1 rounded hover:bg-white/15 cursor-pointer"
            >
              {block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onToggleCollapse(block.id)}
              title={block.collapsed ? (locale === 'zh-CN' ? '展开' : 'Expand') : (locale === 'zh-CN' ? '折叠' : 'Collapse')}
              className="p-1 rounded hover:bg-white/15 cursor-pointer"
            >
              {block.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(block.id)}
              title={locale === 'zh-CN' ? '复制模块' : 'Duplicate'}
              className="p-1 rounded hover:bg-white/15 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(block.id)}
              title={locale === 'zh-CN' ? '删除模块' : 'Delete'}
              className="p-1 rounded hover:bg-rose-500/40 text-rose-300 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {showStyleMenu && (
              <div className="absolute right-0 top-8 w-56 p-3 rounded-lg border border-white/15 bg-[#151A24] text-slate-100 shadow-xl z-40 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-300">
                  {locale === 'zh-CN' ? '模块局部样式' : 'Block Style Override'}
                </div>
                <label className="block text-[11px] text-slate-400">
                  <span>{locale === 'zh-CN' ? '上下留白' : 'Vertical Spacing'}: {block.styleOverride?.paddingY ?? 0}px</span>
                  <input
                    type="range"
                    min={0}
                    max={36}
                    step={4}
                    value={block.styleOverride?.paddingY ?? 0}
                    onChange={(e) =>
                      onUpdateStyleOverride(block.id, {
                        ...block.styleOverride,
                        paddingY: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-500 mt-1"
                  />
                </label>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{locale === 'zh-CN' ? '强调色' : 'Accent'}</span>
                  <input
                    type="color"
                    value={block.styleOverride?.accentColor || '#3B82F6'}
                    onChange={(e) =>
                      onUpdateStyleOverride(block.id, {
                        ...block.styleOverride,
                        accentColor: e.target.value,
                      })
                    }
                    className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStyleOverride(block.id, {});
                    setShowStyleMenu(false);
                  }}
                  className="w-full py-1 text-[11px] rounded border border-white/15 hover:bg-white/10 cursor-pointer"
                >
                  {locale === 'zh-CN' ? '重置局部样式' : 'Reset Override'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {block.collapsed ? (
        <div
          onClick={() => onToggleCollapse(block.id)}
          className="px-4 py-3 rounded-lg border border-white/15 bg-black/25 text-white/75 text-xs flex items-center justify-between cursor-pointer hover:bg-black/35"
        >
          <span>{block.customTitle || t.blocks[block.type]}</span>
          <span className="text-white/50">{locale === 'zh-CN' ? '已折叠 · 点击展开' : 'Collapsed · Click to expand'}</span>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: block.styleOverride?.surfaceTint || undefined,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
