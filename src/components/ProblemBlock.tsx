import React, { useRef, useState } from 'react';
import {
  FileUp,
  Undo2,
  Redo2,
  Highlighter,
  Filter,
  Trash2,
  AlertTriangle,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import {
  HighlightColor,
  Locale,
  ProblemBlockData,
  ProblemHighlight,
  ProblemSectionKey,
} from '../types/workspace';
import { HIGHLIGHT_COLORS } from '../constants/carbon';
import { getTranslations } from '../constants/i18n';
import { buildHighlightedSegments, COLOR_BADGE_MAP, renderSafeMarkdownWithMath } from '../utils/markdown';
import { relocateProblemHighlights } from '../utils/annotations';
import { buildSampleCasesFromParsed, OJ_ADAPTERS, parseProblemAuto } from '../utils/ojParser';

interface ProblemBlockProps {
  data: ProblemBlockData;
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: ProblemBlockData) => void;
  onImportSamples?: (samples: ReturnType<typeof buildSampleCasesFromParsed>) => void;
  onImportTitleMeta?: (meta: { title?: string; platform?: string }) => void;
}

interface FloatingSelectionState {
  section: ProblemSectionKey;
  startOffset: number;
  endOffset: number;
  exactText: string;
  rect: { top: number; left: number };
}

export const ProblemBlock: React.FC<ProblemBlockProps> = ({
  data,
  locale,
  exportMode = false,
  onChange,
  onImportSamples,
  onImportTitleMeta,
}) => {
  const t = getTranslations(locale);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditingText, setIsEditingText] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [adapterId, setAdapterId] = useState('auto');

  const [highlightMode, setHighlightMode] = useState(false);
  const [floatingSel, setFloatingSel] = useState<FloatingSelectionState | null>(null);
  const [pendingNote, setPendingNote] = useState('');
  const [pendingUnderline, setPendingUnderline] = useState(false);

  const [undoStack, setUndoStack] = useState<ProblemHighlight[][]>([]);
  const [redoStack, setRedoStack] = useState<ProblemHighlight[][]>([]);

  const commitHighlights = (nextHighlights: ProblemHighlight[]) => {
    setUndoStack((s) => [...s.slice(-19), data.highlights]);
    setRedoStack([]);
    onChange({ ...data, highlights: nextHighlights });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, data.highlights]);
    onChange({ ...data, highlights: prev });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, data.highlights]);
    onChange({ ...data, highlights: next });
  };

  const handleSectionEdit = (section: ProblemSectionKey, value: string) => {
    const relocated = relocateProblemHighlights(data.highlights, section, value);
    onChange({
      ...data,
      [section]: value,
      highlights: relocated,
    });
  };

  const handleTextMouseUp = (section: ProblemSectionKey, el: HTMLElement | null) => {
    if (exportMode || isEditingText || !el) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setFloatingSel(null);
      return;
    }

    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    // Compute exact offset relative to section plain text
    const preRange = document.createRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    const rawPreLength = preRange.toString().length;

    const sectionText = data[section];
    // Find closest match in raw text near rawPreLength
    let startOffset = sectionText.indexOf(selectedText, Math.max(0, rawPreLength - 20));
    if (startOffset === -1) {
      startOffset = sectionText.indexOf(selectedText);
    }
    if (startOffset === -1) return;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setFloatingSel({
      section,
      startOffset,
      endOffset: startOffset + selectedText.length,
      exactText: selectedText,
      rect: {
        top: Math.max(8, rect.top - containerRect.top - 52),
        left: Math.max(8, Math.min(containerRect.width - 280, rect.left - containerRect.left)),
      },
    });
  };

  const applyHighlight = (color: HighlightColor) => {
    if (!floatingSel) return;
    const sectionText = data[floatingSel.section];
    const hl: ProblemHighlight = {
      id: `hl-${Date.now()}`,
      section: floatingSel.section,
      startOffset: floatingSel.startOffset,
      endOffset: floatingSel.endOffset,
      exactText: floatingSel.exactText,
      prefixContext: sectionText.slice(Math.max(0, floatingSel.startOffset - 24), floatingSel.startOffset),
      suffixContext: sectionText.slice(floatingSel.endOffset, Math.min(sectionText.length, floatingSel.endOffset + 24)),
      color,
      underline: pendingUnderline,
      note: pendingNote.trim(),
      status: 'anchored',
      createdAt: Date.now(),
    };
    commitHighlights([...data.highlights, hl]);
    setFloatingSel(null);
    setPendingNote('');
    window.getSelection()?.removeAllRanges();
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    const parsed = parseProblemAuto(importText, adapterId === 'auto' ? undefined : adapterId);
    let nextHighlights = data.highlights;
    nextHighlights = relocateProblemHighlights(nextHighlights, 'description', parsed.description);
    nextHighlights = relocateProblemHighlights(nextHighlights, 'inputFormat', parsed.inputFormat);
    nextHighlights = relocateProblemHighlights(nextHighlights, 'outputFormat', parsed.outputFormat);
    nextHighlights = relocateProblemHighlights(nextHighlights, 'constraints', parsed.constraints);

    onChange({
      ...data,
      description: parsed.description || data.description,
      inputFormat: parsed.inputFormat || data.inputFormat,
      outputFormat: parsed.outputFormat || data.outputFormat,
      constraints: parsed.constraints || data.constraints,
      highlights: nextHighlights,
    });

    if (parsed.samples.length > 0 && onImportSamples) {
      onImportSamples(buildSampleCasesFromParsed(parsed.samples));
    }
    if ((parsed.title || parsed.platform) && onImportTitleMeta) {
      onImportTitleMeta({ title: parsed.title, platform: parsed.platform });
    }

    setShowImportModal(false);
    setImportText('');
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    if (file.name.endsWith('.json')) {
      try {
        const json = JSON.parse(text) as Partial<ProblemBlockData>;
        onChange({
          ...data,
          description: json.description ?? data.description,
          inputFormat: json.inputFormat ?? data.inputFormat,
          outputFormat: json.outputFormat ?? data.outputFormat,
          constraints: json.constraints ?? data.constraints,
        });
        setShowImportModal(false);
        return;
      } catch {
        // fallback to text
      }
    }
    setImportText(text);
    setShowImportModal(true);
  };

  const sections: Array<{ key: ProblemSectionKey; labelZh: string; labelEn: string }> = [
    { key: 'description', labelZh: '题目描述', labelEn: 'Description' },
    { key: 'inputFormat', labelZh: '输入格式', labelEn: 'Input Format' },
    { key: 'outputFormat', labelZh: '输出格式', labelEn: 'Output Format' },
    { key: 'constraints', labelZh: '数据范围与提示', labelEn: 'Constraints & Notes' },
  ];

  const orphanedHighlights = data.highlights.filter((h) => h.status === 'orphaned');

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 p-6 shadow-sm"
    >
      {/* Header Toolbar */}
      {!exportMode && (
        <div
          data-export-ignore="true"
          className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-white/10"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t.blocks.problem}</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              · {locale === 'zh-CN' ? '划词即可 6 色标注' : 'Select text to highlight'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setHighlightMode((v) => !v)}
              className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1 cursor-pointer ${
                highlightMode
                  ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>{highlightMode ? (locale === 'zh-CN' ? '划词模式' : 'Highlight View') : (locale === 'zh-CN' ? '划词标注' : 'Annotate')}</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ ...data, highlightsOnly: !data.highlightsOnly })}
              className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1 cursor-pointer ${
                data.highlightsOnly
                  ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-300'
                  : 'border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{data.highlightsOnly ? t.problem.showAllText : t.problem.highlightsOnly}</span>
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title={t.problem.undoHighlight}
              className="p-1.5 rounded-md border border-slate-200 dark:border-white/15 disabled:opacity-35 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title={t.problem.redoHighlight}
              className="p-1.5 rounded-md border border-slate-200 dark:border-white/15 disabled:opacity-35 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsEditingText((v) => !v)}
              className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1 cursor-pointer ${
                isEditingText
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {isEditingText ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{isEditingText ? (locale === 'zh-CN' ? '完成编辑' : 'Done') : (locale === 'zh-CN' ? '编辑题面' : 'Edit')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{t.problem.importTitle}</span>
            </button>
          </div>
        </div>
      )}

      {/* Orphaned Highlight Warning */}
      {!exportMode && orphanedHighlights.length > 0 && (
        <div
          data-export-ignore="true"
          className="mb-4 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t.problem.orphanedWarning} ({orphanedHighlights.length})</span>
          </div>
          <button
            type="button"
            onClick={() => commitHighlights(data.highlights.filter((h) => h.status !== 'orphaned'))}
            className="underline cursor-pointer shrink-0"
          >
            {locale === 'zh-CN' ? '清理失效标记' : 'Clear Detached'}
          </button>
        </div>
      )}

      {/* Floating 6-Color Selection Toolbar */}
      {floatingSel && !exportMode && (
        <div
          data-export-ignore="true"
          style={{ top: floatingSel.rect.top, left: floatingSel.rect.left }}
          className="absolute z-30 p-2.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0F131C] shadow-xl flex flex-col gap-2 w-72"
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={locale === 'zh-CN' ? `${c.zhLabel} · ${c.meaningZh}` : `${c.enLabel} · ${c.meaningEn}`}
                  onClick={() => applyHighlight(c.id)}
                  className="w-5 h-5 rounded-full hover:scale-110 transition-transform cursor-pointer border border-black/15"
                  style={{ backgroundColor: c.swatch }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPendingUnderline((v) => !v)}
              className={`px-1.5 py-0.5 text-[11px] rounded border cursor-pointer ${
                pendingUnderline
                  ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                  : 'border-slate-300 dark:border-white/15 text-slate-500'
              }`}
            >
              U
            </button>
            <button
              type="button"
              onClick={() => setFloatingSel(null)}
              className="p-0.5 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={pendingNote}
            onChange={(e) => setPendingNote(e.target.value)}
            placeholder={t.problem.addNotePlaceholder}
            className="h-7 px-2 rounded border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-black/30 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Highlights-Only Focus Mode */}
      {data.highlightsOnly ? (
        <div className="space-y-2.5">
          {data.highlights.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {locale === 'zh-CN' ? '暂无重点标记。关闭「仅显示重点」后选中文字即可标注。' : 'No highlights yet.'}
            </p>
          ) : (
            data.highlights.map((hl) => {
              const colorMeta = HIGHLIGHT_COLORS.find((c) => c.id === hl.color)!;
              return (
                <div
                  key={hl.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorMeta.swatch }} />
                      <span>{locale === 'zh-CN' ? colorMeta.meaningZh : colorMeta.meaningEn}</span>
                      {hl.status === 'orphaned' && (
                        <span className="text-amber-500">· {t.problem.orphaned}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium">{hl.exactText}</div>
                    {hl.note && <div className="text-xs text-slate-600 dark:text-slate-300">{hl.note}</div>}
                  </div>
                  {!exportMode && (
                    <button
                      type="button"
                      onClick={() => commitHighlights(data.highlights.filter((x) => x.id !== hl.id))}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((sec) => {
            const rawText = data[sec.key];
            if (!rawText && !isEditingText) return null;
            const secHighlights = data.highlights.filter((h) => h.section === sec.key);

            return (
              <div key={sec.key} className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {locale === 'zh-CN' ? sec.labelZh : sec.labelEn}
                </h4>

                {isEditingText ? (
                  <textarea
                    value={rawText}
                    onChange={(e) => handleSectionEdit(sec.key, e.target.value)}
                    rows={sec.key === 'description' ? 5 : 3}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : highlightMode || secHighlights.length > 0 ? (
                  <div
                    onMouseUp={(e) => handleTextMouseUp(sec.key, e.currentTarget)}
                    className="prose-oi whitespace-pre-wrap select-text"
                  >
                    {buildHighlightedSegments(rawText, secHighlights).map((seg, idx) =>
                      seg.highlight ? (
                        <mark
                          key={`${seg.highlight.id}-${idx}`}
                          title={seg.highlight.note || undefined}
                          className={`oi-hl oi-hl-${seg.highlight.color} ${
                            seg.highlight.underline ? 'oi-hl-underline' : ''
                          }`}
                        >
                          {seg.text}
                        </mark>
                      ) : (
                        <React.Fragment key={idx}>{seg.text}</React.Fragment>
                      )
                    )}
                  </div>
                ) : (
                  <div
                    onMouseUp={(e) => handleTextMouseUp(sec.key, e.currentTarget)}
                    className="prose-oi select-text"
                    dangerouslySetInnerHTML={{ __html: renderSafeMarkdownWithMath(rawText) }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Highlights Summary List */}
      {!data.highlightsOnly && data.highlights.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.problem.highlightList} ({data.highlights.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {data.highlights.map((hl) => {
              const cMeta = HIGHLIGHT_COLORS.find((c) => c.id === hl.color)!;
              return (
                <div
                  key={hl.id}
                  className={`px-2.5 py-1 rounded-md border text-xs flex items-center gap-1.5 ${
                    hl.status === 'orphaned'
                      ? 'border-amber-400/50 bg-amber-500/10 text-amber-400'
                      : COLOR_BADGE_MAP[hl.color]
                  }`}
                >
                  <span className="font-medium">[{locale === 'zh-CN' ? cMeta.meaningZh : cMeta.meaningEn}]</span>
                  <span className="max-w-[200px] truncate">{hl.exactText}</span>
                  {hl.note && <span className="opacity-80">— {hl.note}</span>}
                  {!exportMode && (
                    <button
                      type="button"
                      onClick={() => commitHighlights(data.highlights.filter((x) => x.id !== hl.id))}
                      className="ml-1 opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Problem Import Modal */}
      {showImportModal && (
        <div
          data-export-ignore="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#151A24] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">{t.problem.importTitle}</h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2">
                <span className="text-slate-500">{locale === 'zh-CN' ? 'OJ 适配器' : 'OJ Adapter'}:</span>
                <select
                  value={adapterId}
                  onChange={(e) => setAdapterId(e.target.value)}
                  className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#181D29]"
                >
                  <option value="auto">{locale === 'zh-CN' ? '自动识别格式' : 'Auto Detect'}</option>
                  {OJ_ADAPTERS.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      {ad.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>{t.problem.importFile} (.md / .txt / .json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = '';
                }}
              />
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              placeholder={
                locale === 'zh-CN'
                  ? '粘贴 Markdown 题面或洛谷 / Codeforces / AtCoder 题目文本（支持自动解析输入输出格式与样例）...'
                  : 'Paste Markdown or OJ problem text...'
              }
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-white/15 cursor-pointer"
              >
                {locale === 'zh-CN' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                {locale === 'zh-CN' ? '解析并导入题面' : 'Parse & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
