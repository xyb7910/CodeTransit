import React, { useMemo, useState } from 'react';
import { Command, Search, X } from 'lucide-react';
import { Locale } from '../../types/workspace';

export interface PaletteCommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteModalProps {
  locale: Locale;
  commands: PaletteCommandItem[];
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  locale,
  commands,
  onClose,
}) => {
  const zh = locale === 'zh-CN';
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(q))
    );
  }, [commands, query]);

  const safeIdx = Math.min(activeIdx, Math.max(0, filtered.length - 1));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111722] shadow-2xl overflow-hidden text-xs"
      >
        <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
          <Command className="w-4 h-4 text-blue-500 shrink-0" />
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && filtered[safeIdx]) {
                e.preventDefault();
                filtered[safeIdx].run();
                onClose();
              }
            }}
            placeholder={
              zh
                ? '输入命令名称、工具或操作（如 导出 / 组合 / AI / 自适应）...'
                : 'Type a command or action...'
            }
            className="flex-1 bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              {zh ? '未找到匹配命令' : 'No matching commands'}
            </div>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => {
                  cmd.run();
                  onClose();
                }}
                className={`w-full px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-left cursor-pointer ${
                  idx === safeIdx
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono opacity-75 shrink-0">{cmd.category}</span>
                  <span className="font-medium truncate">{cmd.title}</span>
                </div>
                {cmd.shortcut && (
                  <kbd
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] shrink-0 ${
                      idx === safeIdx ? 'bg-white/20 text-white' : 'bg-black/20 text-slate-400'
                    }`}
                  >
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
