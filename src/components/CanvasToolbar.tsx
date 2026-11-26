import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Sun,
  Moon,
  Languages,
  Save,
  Upload,
  Download,
  SlidersHorizontal,
  Keyboard,
  Palette,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  LayoutTemplate,
  BookMarked,
} from 'lucide-react';
import {
  BlockType,
  CanvasStyleConfig,
  Locale,
  ProgrammingLanguage,
  UIThemeMode,
  WindowTheme,
} from '../types/workspace';
import {
  CARBON_BACKGROUNDS,
  CARBON_FONTS,
  CARBON_LANGUAGES,
  CARBON_THEMES,
} from '../constants/carbon';
import { getTranslations } from '../constants/i18n';

interface CanvasToolbarProps {
  locale: Locale;
  themeMode: UIThemeMode;
  canvasStyle: CanvasStyleConfig;
  language: ProgrammingLanguage;
  onToggleLocale: () => void;
  onToggleThemeMode: () => void;
  onUpdateStyle: (patch: Partial<CanvasStyleConfig>) => void;
  onChangeLanguage: (lang: ProgrammingLanguage) => void;
  onAddBlock: (type: BlockType) => void;
  onSaveSnapshot: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  onOpenRepository: () => void;
  onResetClassic: () => void;
  onOpenShortcuts: () => void;
}

const BLOCK_TYPES: BlockType[] = [
  'title',
  'problem',
  'keypoints',
  'code',
  'samples',
  'formula',
  'solution',
  'complexity',
  'teaching',
  'author',
];

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  locale,
  themeMode,
  canvasStyle,
  language,
  onToggleLocale,
  onToggleThemeMode,
  onUpdateStyle,
  onChangeLanguage,
  onAddBlock,
  onSaveSnapshot,
  onExportJson,
  onImportJson,
  showTemplates,
  onToggleTemplates,
  onOpenRepository,
  onResetClassic,
  onOpenShortcuts,
}) => {
  const t = getTranslations(locale);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuPos, setAddMenuPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const [showBgMenu, setShowBgMenu] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const addMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  const updateAddMenuPosition = () => {
    const btn = addBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 256;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    // Prefer aligning right edge with button if there is room on the left; otherwise align left edge
    let left = rect.right - menuWidth;
    if (left < 12) {
      left = Math.min(rect.left, viewportW - menuWidth - 12);
    }
    left = Math.max(12, Math.min(left, viewportW - menuWidth - 12));
    const top = rect.bottom + 6;
    const maxHeight = Math.max(180, viewportH - top - 16);
    setAddMenuPos({ top, left, maxHeight });
  };

  useEffect(() => {
    if (!showAddMenu) return;
    updateAddMenuPosition();
    const handleOutside = (e: MouseEvent) => {
      if (addMenuContainerRef.current && !addMenuContainerRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddMenu(false);
    };
    const handleResize = () => updateAddMenuPosition();
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [showAddMenu]);

  return (
    <section className="border-b border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-[#11151E]">
      <div className="max-w-[1440px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Core Carbon Styling Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Syntax Theme */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="whitespace-nowrap">{t.toolbar.syntaxTheme}</span>
            <select
              value={canvasStyle.syntaxTheme}
              onChange={(e) => onUpdateStyle({ syntaxTheme: e.target.value })}
              className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CARBON_THEMES.map((th) => (
                <option key={th.id} value={th.id}>
                  {th.name}
                </option>
              ))}
            </select>
          </label>

          {/* Language */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="whitespace-nowrap">{t.toolbar.language}</span>
            <select
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as ProgrammingLanguage)}
              className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CARBON_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>

          {/* Background Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowBgMenu((v) => !v);
                setShowAddMenu(false);
              }}
              className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-[#1E2535] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-blue-500" />
              <span>{t.toolbar.background}</span>
              <span
                className="w-3.5 h-3.5 rounded-sm border border-black/20 dark:border-white/25 inline-block"
                style={{
                  background:
                    canvasStyle.backgroundMode === 'transparent'
                      ? 'repeating-conic-gradient(#64748b 0% 25%, transparent 0% 50%) 50% / 8px 8px'
                      : canvasStyle.backgroundValue,
                }}
              />
            </button>

            {showBgMenu && (
              <div className="absolute left-0 mt-1.5 w-72 p-3 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#151A24] shadow-xl z-40">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {CARBON_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      title={bg.label}
                      onClick={() => {
                        onUpdateStyle({
                          backgroundMode: bg.mode,
                          backgroundValue: bg.value,
                        });
                        setShowBgMenu(false);
                      }}
                      className="h-9 rounded-md border border-slate-300 dark:border-white/20 hover:scale-105 transition-transform cursor-pointer"
                      style={{ background: bg.value }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <span>{locale === 'zh-CN' ? '自定义色' : 'Custom'}</span>
                    <input
                      type="color"
                      value={
                        canvasStyle.backgroundMode === 'solid' && canvasStyle.backgroundValue.startsWith('#')
                          ? canvasStyle.backgroundValue
                          : '#1e293b'
                      }
                      onChange={(e) =>
                        onUpdateStyle({
                          backgroundMode: 'solid',
                          backgroundValue: e.target.value,
                        })
                      }
                      className="w-7 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStyle({ backgroundMode: 'transparent' });
                      setShowBgMenu(false);
                    }}
                    className={`px-2.5 py-1 text-xs rounded border cursor-pointer ${
                      canvasStyle.backgroundMode === 'transparent'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                        : 'border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t.toolbar.transparent}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Window Chrome */}
          <select
            value={canvasStyle.windowTheme}
            onChange={(e) => onUpdateStyle({ windowTheme: e.target.value as WindowTheme })}
            aria-label={t.toolbar.windowStyle}
            className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="macos">macOS Dots</option>
            <option value="sharp">Sharp</option>
            <option value="bw">Outline</option>
            <option value="none">Frameless</option>
          </select>

          {/* Toggle Advanced Carbon Controls */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`h-8 px-2.5 rounded-md border text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showAdvanced
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                : 'border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E2535]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{locale === 'zh-CN' ? '样式参数' : 'Style'}</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Right: Block Canvas & Utility Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Block Dropdown */}
          <div ref={addMenuContainerRef} className="relative">
            <button
              ref={addBtnRef}
              type="button"
              data-guide-target="add-block"
              aria-expanded={showAddMenu}
              onClick={() => {
                setShowAddMenu((v) => !v);
                setShowBgMenu(false);
              }}
              className="h-8 px-3 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addBlock}</span>
            </button>

            {showAddMenu && addMenuPos && (
              <div
                style={{
                  top: `${addMenuPos.top}px`,
                  left: `${addMenuPos.left}px`,
                  maxHeight: `${addMenuPos.maxHeight}px`,
                }}
                className="fixed w-64 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#151A24] shadow-xl z-50 overflow-y-auto"
              >
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => {
                      onAddBlock(bt);
                      setShowAddMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-between gap-3 whitespace-nowrap cursor-pointer"
                  >
                    <span>{t.blocks[bt]}</span>
                    <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                ))}
                <div className="border-t border-slate-200 dark:border-white/10 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onResetClassic();
                      setShowAddMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>{locale === 'zh-CN' ? '恢复 Carbon Classic 模式' : 'Reset to Carbon Classic'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            data-guide-target="code-templates"
            aria-expanded={showTemplates}
            onClick={onToggleTemplates}
            className={`h-8 px-2.5 rounded-md border text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              showTemplates
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                : 'border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E2535]'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-blue-500" />
            <span>{t.navTemplates}</span>
          </button>

          <button
            type="button"
            onClick={onOpenRepository}
            className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-[#1E2535] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookMarked className="w-3.5 h-3.5 text-purple-500" />
            <span>{t.navRepo}</span>
          </button>

          <button
            type="button"
            onClick={onSaveSnapshot}
            title={t.snapshot}
            className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-[#1E2535] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.snapshot}</span>
          </button>

          <button
            type="button"
            onClick={onExportJson}
            title={locale === 'zh-CN' ? '导出 JSON 工作区' : 'Export JSON Workspace'}
            className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-[#1E2535] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            title={locale === 'zh-CN' ? '导入 JSON 工作区' : 'Import JSON Workspace'}
            className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-[#1E2535] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{locale === 'zh-CN' ? '导入' : 'Import'}</span>
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportJson(f);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={onOpenShortcuts}
            title={t.toolbar.shortcuts}
            className="h-8 w-8 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1E2535] shrink-0 cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleLocale}
            className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-[#1E2535] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{t.langSwitch}</span>
          </button>

          <button
            type="button"
            onClick={onToggleThemeMode}
            title={themeMode === 'dark' ? t.themeLight : t.themeDark}
            className="h-8 w-8 rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#1E2535] shrink-0 cursor-pointer"
          >
            {themeMode === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Carbon Advanced Controls Row */}
      {showAdvanced && (
        <div className="border-t border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0E121B]">
          <div className="max-w-[1440px] mx-auto px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-2">
              <span>{t.toolbar.font}</span>
              <select
                value={canvasStyle.fontFamily}
                onChange={(e) => onUpdateStyle({ fontFamily: e.target.value as CanvasStyleConfig['fontFamily'] })}
                className="h-7 px-2 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29] text-slate-900 dark:text-slate-100"
              >
                {CARBON_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 tabular-nums">
              <span>{t.toolbar.fontSize}: {canvasStyle.fontSize}px</span>
              <input
                type="range"
                min={11}
                max={20}
                value={canvasStyle.fontSize}
                onChange={(e) => onUpdateStyle({ fontSize: Number(e.target.value) })}
                className="w-20 accent-blue-600"
              />
            </label>

            <label className="flex items-center gap-2 tabular-nums">
              <span>{t.toolbar.lineHeight}: {canvasStyle.lineHeight.toFixed(2)}</span>
              <input
                type="range"
                min={1.25}
                max={2.1}
                step={0.05}
                value={canvasStyle.lineHeight}
                onChange={(e) => onUpdateStyle({ lineHeight: Number(e.target.value) })}
                className="w-20 accent-blue-600"
              />
            </label>

            <label className="flex items-center gap-2 tabular-nums">
              <span>{t.toolbar.padding}: {canvasStyle.paddingHorizontal}px</span>
              <input
                type="range"
                min={12}
                max={80}
                step={4}
                value={canvasStyle.paddingHorizontal}
                onChange={(e) =>
                  onUpdateStyle({
                    paddingHorizontal: Number(e.target.value),
                    paddingVertical: Math.max(12, Number(e.target.value) - 4),
                  })
                }
                className="w-20 accent-blue-600"
              />
            </label>

            <label className="flex items-center gap-2 tabular-nums">
              <span>{t.toolbar.radius}: {canvasStyle.borderRadius}px</span>
              <input
                type="range"
                min={0}
                max={20}
                value={canvasStyle.borderRadius}
                onChange={(e) => onUpdateStyle({ borderRadius: Number(e.target.value) })}
                className="w-16 accent-blue-600"
              />
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={canvasStyle.lineNumbers}
                onChange={(e) => onUpdateStyle({ lineNumbers: e.target.checked })}
                className="accent-blue-600"
              />
              <span>{t.toolbar.lineNumbers}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={canvasStyle.dropShadow}
                onChange={(e) => onUpdateStyle({ dropShadow: e.target.checked })}
                className="accent-blue-600"
              />
              <span>{t.toolbar.shadow}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={canvasStyle.watermark}
                onChange={(e) => onUpdateStyle({ watermark: e.target.checked })}
                className="accent-blue-600"
              />
              <span>{t.toolbar.watermark}</span>
            </label>
          </div>
        </div>
      )}
    </section>
  );
};
