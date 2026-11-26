import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, RotateCcw, Upload, X } from 'lucide-react';
import { Locale } from '../../types/workspace';
import {
  DEFAULT_SHORTCUTS,
  ShortcutBinding,
  detectShortcutConflicts,
  eventToCanonicalCombo,
  formatShortcutCombo,
} from '../../utils/shortcutRegistry';

interface ShortcutHelpModalProps {
  locale: Locale;
  shortcuts: ShortcutBinding[];
  onUpdateShortcuts: (next: ShortcutBinding[]) => void;
  onClose: () => void;
}

export const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({
  locale,
  shortcuts,
  onUpdateShortcuts,
  onClose,
}) => {
  const zh = locale === 'zh-CN';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<'all' | ShortcutBinding['category']>('all');
  const [importError, setImportError] = useState<string | null>(null);

  const conflicts = useMemo(() => detectShortcutConflicts(shortcuts), [shortcuts]);

  const filtered = shortcuts.filter((s) => filterCat === 'all' || s.category === filterCat);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(shortcuts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yanpb-studio-shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file: File) => {
    setImportError(null);
    try {
      const parsed = JSON.parse(await file.text()) as ShortcutBinding[];
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      const overrideMap = new Map(parsed.map((p) => [p.id, p.combo]));
      onUpdateShortcuts(
        DEFAULT_SHORTCUTS.map((d) => ({
          ...d,
          combo: overrideMap.get(d.id) || d.combo,
        }))
      );
    } catch {
      setImportError(zh ? '快捷键配置文件解析失败' : 'Failed to parse shortcuts JSON');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (!editingId) return;
          e.preventDefault();
          e.stopPropagation();
          if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return;
          const combo = eventToCanonicalCombo({
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          });
          onUpdateShortcuts(shortcuts.map((s) => (s.id === editingId ? { ...s, combo } : s)));
          setEditingId(null);
        }}
        className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111722] shadow-2xl text-xs overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">
              {zh ? 'Algorithm Studio 快捷键注册表与自定义' : 'Shortcut Registry & Keybindings'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {zh
                ? '点击右侧键位即可录制新快捷键；支持冲突检测、JSON 导入/导出及中文输入法自动防误触。'
                : 'Click any binding to rebind. Supports conflict detection and IME focus guard.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {conflicts.length > 0 && (
            <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">
                  {zh ? `检测到 ${conflicts.length} 组快捷键冲突` : `${conflicts.length} shortcut conflicts`}
                </div>
                {conflicts.map((c, idx) => (
                  <div key={idx} className="font-mono text-[11px]">
                    [{c.scope}] {formatShortcutCombo(c.combo)} → {c.ids.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {importError && (
            <div className="p-2 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300">
              {importError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ['all', zh ? '全部' : 'All'],
                  ['edit', zh ? '编辑' : 'Edit'],
                  ['tools', zh ? '工具' : 'Tools'],
                  ['canvas', zh ? '视图' : 'Canvas'],
                  ['project', zh ? '工程' : 'Project'],
                  ['presentation', zh ? '演示' : 'Present'],
                ] as const
              ).map(([cat, lbl]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCat(cat)}
                  className={`px-2 py-1 rounded border font-medium cursor-pointer ${
                    filterCat === cat
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 dark:border-white/15 text-slate-400'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-2 py-1 rounded border border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" /> JSON
              </button>
              <label className="px-2 py-1 rounded border border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer">
                <Upload className="w-3 h-3" /> {zh ? '导入' : 'Import'}
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImportJson(f);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => onUpdateShortcuts(DEFAULT_SHORTCUTS)}
                className="px-2 py-1 rounded border border-white/15 hover:bg-white/5 flex items-center gap-1 text-amber-400 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> {zh ? '恢复默认' : 'Reset'}
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 dark:divide-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            {filtered.map((s) => {
              const isEditing = editingId === s.id;
              const isConflict = conflicts.some((c) => c.ids.includes(s.id));
              return (
                <div
                  key={s.id}
                  className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/[0.02]"
                >
                  <div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {zh ? s.labelZh : s.labelEn}
                    </span>
                    <span className="ml-2 text-[10px] font-mono text-slate-500">[{s.scope}]</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : s.id)}
                    className={`px-2 py-0.5 rounded border font-mono text-[11px] cursor-pointer ${
                      isEditing
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300 animate-pulse'
                        : isConflict
                        ? 'border-amber-500 text-amber-300'
                        : 'border-slate-300 dark:border-white/15 bg-black/25 text-slate-200'
                    }`}
                  >
                    {isEditing
                      ? zh
                        ? '请按下新快捷键...'
                        : 'Press key combo...'
                      : formatShortcutCombo(s.combo)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
