import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EditorState, Compartment, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { sql } from '@codemirror/lang-sql';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import {
  Copy,
  Check,
  Download,
  BookmarkPlus,
  Trash2,
  AlertTriangle,
  EyeOff,
  ArrowRight,
  MessageSquare,
  Layers,
} from 'lucide-react';
import {
  CanvasStyleConfig,
  CodeAnnotation,
  CodeAnnotationType,
  CodeBlockData,
  HighlightColor,
  Locale,
  ProgrammingLanguage,
} from '../types/workspace';
import { CARBON_LANGUAGES, CARBON_THEMES, CarbonSyntaxTheme, HIGHLIGHT_COLORS } from '../constants/carbon';
import { getTranslations } from '../constants/i18n';
import { relocateCodeAnnotations } from '../utils/annotations';

interface CodeEditorBlockProps {
  data: CodeBlockData;
  canvasStyle: CanvasStyleConfig;
  locale: Locale;
  exportMode?: boolean;
  readOnly?: boolean;
  onChange: (next: CodeBlockData) => void;
}

const setDecorationsEffect = StateEffect.define<{
  annotations: CodeAnnotation[];
  dimUnfocused: boolean;
}>();

function getAnnotationBg(color: HighlightColor, alpha = 0.2): string {
  switch (color) {
    case 'yellow':
      return `rgba(250, 204, 21, ${alpha})`;
    case 'green':
      return `rgba(34, 197, 94, ${alpha})`;
    case 'blue':
      return `rgba(59, 130, 246, ${alpha})`;
    case 'red':
      return `rgba(239, 68, 68, ${alpha})`;
    case 'purple':
      return `rgba(168, 85, 247, ${alpha})`;
    case 'orange':
      return `rgba(249, 115, 22, ${alpha})`;
  }
}

function getAnnotationBorder(color: HighlightColor): string {
  switch (color) {
    case 'yellow':
      return '#FACC15';
    case 'green':
      return '#22C55E';
    case 'blue':
      return '#3B82F6';
    case 'red':
      return '#EF4444';
    case 'purple':
      return '#A855F7';
    case 'orange':
      return '#F97316';
  }
}

function buildCodeDecorations(
  doc: EditorState['doc'],
  annotations: CodeAnnotation[],
  dimUnfocused: boolean
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const focusedLines = new Set<number>();
  const lineDecorations = new Map<number, { bg?: string; border?: string; isBoxEdge?: 'top' | 'mid' | 'bot' | 'single' }>();
  const rangeMarks: Array<{ from: number; to: number; color: HighlightColor }> = [];

  const active = annotations.filter((a) => a.status === 'anchored');

  for (const ann of active) {
    const startL = Math.max(1, Math.min(ann.lineStart, doc.lines));
    const endL = Math.max(startL, Math.min(ann.lineEnd, doc.lines));
    for (let ln = startL; ln <= endL; ln++) {
      focusedLines.add(ln);
      if (ann.type === 'line' || ann.type === 'arrow' || ann.type === 'note' || ann.type === 'bubble' || ann.type === 'section') {
        lineDecorations.set(ln, {
          bg: getAnnotationBg(ann.color, 0.16),
          border: getAnnotationBorder(ann.color),
        });
      } else if (ann.type === 'box') {
        const edge = startL === endL ? 'single' : ln === startL ? 'top' : ln === endL ? 'bot' : 'mid';
        lineDecorations.set(ln, {
          bg: getAnnotationBg(ann.color, 0.14),
          border: getAnnotationBorder(ann.color),
          isBoxEdge: edge,
        });
      } else if (ann.type === 'range' && ann.colStart !== undefined && ann.colEnd !== undefined && ln === startL) {
        const lineObj = doc.line(ln);
        const from = Math.min(lineObj.to, lineObj.from + Math.max(0, ann.colStart));
        const to = Math.min(lineObj.to, lineObj.from + Math.max(ann.colStart + 1, ann.colEnd));
        if (to > from) {
          rangeMarks.push({ from, to, color: ann.color });
        }
      }
    }
  }

  const hasAnyFocus = focusedLines.size > 0 && (dimUnfocused || active.some((a) => a.type === 'dim'));
  const entries: Array<{ from: number; to: number; deco: Decoration }> = [];

  for (let ln = 1; ln <= doc.lines; ln++) {
    const lineObj = doc.line(ln);
    const meta = lineDecorations.get(ln);
    const dimThis = hasAnyFocus && !focusedLines.has(ln);

    if (meta || dimThis) {
      let style = '';
      if (meta?.bg) style += `background-color: ${meta.bg};`;
      if (meta?.border) style += `box-shadow: inset 3px 0 0 ${meta.border};`;
      if (meta?.isBoxEdge === 'top' || meta?.isBoxEdge === 'single') {
        style += `border-top: 1px dashed ${meta.border};`;
      }
      if (meta?.isBoxEdge === 'bot' || meta?.isBoxEdge === 'single') {
        style += `border-bottom: 1px dashed ${meta.border};`;
      }
      if (dimThis) {
        style += 'opacity: 0.36;';
      }
      entries.push({
        from: lineObj.from,
        to: lineObj.from,
        deco: Decoration.line({ attributes: { style } }),
      });
    }
  }

  for (const rm of rangeMarks) {
    entries.push({
      from: rm.from,
      to: rm.to,
      deco: Decoration.mark({
        attributes: {
          style: `background-color: ${getAnnotationBg(rm.color, 0.34)}; border-radius: 3px; outline: 1px solid ${getAnnotationBorder(rm.color)};`,
        },
      }),
    });
  }

  entries.sort((a, b) => a.from - b.from || a.to - b.to);
  for (const e of entries) {
    builder.add(e.from, e.to, e.deco);
  }
  return builder.finish();
}

const annotationField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setDecorationsEffect)) {
        next = buildCodeDecorations(tr.state.doc, effect.value.annotations, effect.value.dimUnfocused);
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function getLanguageExtension(lang: ProgrammingLanguage) {
  switch (lang) {
    case 'cpp17':
    case 'c':
      return cpp();
    case 'python':
      return python();
    case 'java':
      return java();
    case 'javascript':
      return javascript();
    case 'typescript':
      return javascript({ typescript: true });
    case 'rust':
      return rust();
    case 'go':
      return go();
    case 'sql':
      return sql();
    case 'json':
      return json();
    case 'markdown':
      return markdown();
    case 'html':
      return html();
    case 'css':
      return css();
  }
}

function buildCarbonThemeExtension(theme: CarbonSyntaxTheme, fontSize: number, lineHeight: number, fontFamily: string) {
  const editorTheme = EditorView.theme(
    {
      '&': {
        backgroundColor: 'transparent',
        color: theme.foreground,
        fontSize: `${fontSize}px`,
        fontFamily: `"${fontFamily}", "Noto Sans SC", monospace`,
      },
      '.cm-content': {
        lineHeight: String(lineHeight),
        padding: '12px 0',
        caretColor: theme.cursor,
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        color: theme.gutterForeground,
        border: 'none',
        paddingRight: '8px',
        userSelect: 'none',
      },
      '.cm-activeLine': {
        backgroundColor: theme.lineHighlight,
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: theme.foreground,
      },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: theme.selection,
      },
      '.cm-cursor': {
        borderLeftColor: theme.cursor,
      },
    },
    { dark: theme.isDark }
  );

  const highlightStyle = HighlightStyle.define([
    { tag: tags.comment, color: theme.tokens.comment, fontStyle: 'italic' },
    { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.moduleKeyword], color: theme.tokens.keyword },
    { tag: [tags.string, tags.special(tags.string)], color: theme.tokens.string },
    { tag: [tags.number, tags.bool, tags.null], color: theme.tokens.number },
    { tag: [tags.typeName, tags.className, tags.namespace], color: theme.tokens.type },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: theme.tokens.function },
    { tag: tags.operator, color: theme.tokens.operator },
    { tag: [tags.variableName, tags.definition(tags.variableName)], color: theme.tokens.variable },
    { tag: tags.propertyName, color: theme.tokens.property },
    { tag: tags.punctuation, color: theme.tokens.punctuation },
  ]);

  return [editorTheme, syntaxHighlighting(highlightStyle)];
}

export const CodeEditorBlock: React.FC<CodeEditorBlockProps> = ({
  data,
  canvasStyle,
  locale,
  exportMode = false,
  readOnly = false,
  onChange,
}) => {
  const t = getTranslations(locale);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const langCompartment = useMemo(() => new Compartment(), []);
  const themeCompartment = useMemo(() => new Compartment(), []);
  const gutterCompartment = useMemo(() => new Compartment(), []);
  const readonlyCompartment = useMemo(() => new Compartment(), []);

  const [copiedRaw, setCopiedRaw] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [selInfo, setSelInfo] = useState<{ lineStart: number; lineEnd: number; colStart: number; colEnd: number; lineText: string }>({
    lineStart: 1,
    lineEnd: 1,
    colStart: 0,
    colEnd: 0,
    lineText: '',
  });
  const [newAnnType, setNewAnnType] = useState<CodeAnnotationType>('line');
  const [newAnnColor, setNewAnnColor] = useState<HighlightColor>('blue');
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnText, setNewAnnText] = useState('');

  const activeTheme = useMemo(
    () => CARBON_THEMES.find((th) => th.id === canvasStyle.syntaxTheme) || CARBON_THEMES[0],
    [canvasStyle.syntaxTheme]
  );

  // Initialize CodeMirror instance
  useEffect(() => {
    if (!editorHostRef.current) return;

    const state = EditorState.create({
      doc: data.code,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        annotationField,
        langCompartment.of(getLanguageExtension(data.language)),
        themeCompartment.of(
          buildCarbonThemeExtension(
            activeTheme,
            canvasStyle.fontSize,
            canvasStyle.lineHeight,
            canvasStyle.fontFamily
          )
        ),
        gutterCompartment.of(canvasStyle.lineNumbers ? lineNumbers() : []),
        readonlyCompartment.of(EditorState.readOnly.of(exportMode || readOnly)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) {
            const sel = update.state.selection.main;
            const startLine = update.state.doc.lineAt(sel.from);
            const endLine = update.state.doc.lineAt(sel.to);
            setSelInfo({
              lineStart: startLine.number,
              lineEnd: endLine.number,
              colStart: sel.from - startLine.from,
              colEnd: sel.to - endLine.from,
              lineText: startLine.text.trim(),
            });
          }
          if (update.docChanged) {
            const nextCode = update.state.doc.toString();
            const cur = dataRef.current;
            if (nextCode !== cur.code) {
              const relocated = relocateCodeAnnotations(cur.annotations, nextCode);
              onChange({
                ...cur,
                code: nextCode,
                annotations: relocated,
              });
            }
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorHostRef.current,
    });
    view.dispatch({
      effects: setDecorationsEffect.of({
        annotations: data.annotations,
        dimUnfocused: data.dimUnfocused,
      }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external code changes (e.g. template load, transit load)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== data.code) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: data.code },
      });
    }
  }, [data.code]);

  // Sync dynamic compartments & decorations
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        langCompartment.reconfigure(getLanguageExtension(data.language)),
        themeCompartment.reconfigure(
          buildCarbonThemeExtension(
            activeTheme,
            canvasStyle.fontSize,
            canvasStyle.lineHeight,
            canvasStyle.fontFamily
          )
        ),
        gutterCompartment.reconfigure(canvasStyle.lineNumbers ? lineNumbers() : []),
        readonlyCompartment.reconfigure(EditorState.readOnly.of(exportMode || readOnly)),
        setDecorationsEffect.of({
          annotations: data.annotations,
          dimUnfocused: data.dimUnfocused,
        }),
      ],
    });
  }, [
    data.language,
    data.annotations,
    data.dimUnfocused,
    activeTheme,
    canvasStyle.fontSize,
    canvasStyle.lineHeight,
    canvasStyle.fontFamily,
    canvasStyle.lineNumbers,
    exportMode,
    readOnly,
  ]);

  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadRaw = () => {
    const ext = CARBON_LANGUAGES.find((l) => l.id === data.language)?.ext || 'txt';
    const fileName = data.fileName?.trim() || `main.${ext}`;
    const blob = new Blob([data.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddAnnotation = () => {
    const lines = data.code.split('\n');
    const fp = lines[selInfo.lineStart - 1]?.trim() || selInfo.lineText;
    const newItem: CodeAnnotation = {
      id: `ca-${Date.now()}`,
      type: newAnnType,
      lineStart: selInfo.lineStart,
      lineEnd: selInfo.lineEnd,
      colStart: newAnnType === 'range' ? selInfo.colStart : undefined,
      colEnd: newAnnType === 'range' ? selInfo.colEnd : undefined,
      lineFingerprint: fp,
      color: newAnnColor,
      title: newAnnTitle.trim() || undefined,
      text: newAnnText.trim() || (locale === 'zh-CN' ? `第 ${selInfo.lineStart} 行重点` : `Focus L${selInfo.lineStart}`),
      status: 'anchored',
    };
    onChange({
      ...data,
      annotations: [...data.annotations, newItem],
    });
    setNewAnnTitle('');
    setNewAnnText('');
  };

  const removeAnnotation = (id: string) => {
    onChange({
      ...data,
      annotations: data.annotations.filter((a) => a.id !== id),
    });
  };

  const anchoredNotes = data.annotations.filter(
    (a) =>
      a.status === 'anchored' &&
      (a.text || a.title || a.type === 'arrow' || a.type === 'note' || a.type === 'bubble' || a.type === 'section')
  );
  const orphanedCount = data.annotations.filter((a) => a.status === 'orphaned').length;

  return (
    <div
      style={{
        backgroundColor: activeTheme.background,
        color: activeTheme.foreground,
        borderRadius: `${canvasStyle.borderRadius}px`,
        boxShadow: canvasStyle.dropShadow ? '0 22px 58px -12px rgba(0, 0, 0, 0.55)' : 'none',
      }}
      className="overflow-hidden border border-black/20 dark:border-white/10"
    >
      {/* Window Chrome Header */}
      {canvasStyle.windowTheme !== 'none' && (
        <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-black/10 dark:border-white/5">
          <div className="flex items-center gap-2 shrink-0">
            {canvasStyle.windowTheme === 'macos' && (
              <>
                <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </>
            )}
            {canvasStyle.windowTheme === 'sharp' && (
              <>
                <span className="w-2.5 h-2.5 bg-current opacity-35" />
                <span className="w-2.5 h-2.5 bg-current opacity-55" />
                <span className="w-2.5 h-2.5 bg-current opacity-80" />
              </>
            )}
            {canvasStyle.windowTheme === 'bw' && (
              <>
                <span className="w-3 h-3 rounded-full border border-current opacity-50" />
                <span className="w-3 h-3 rounded-full border border-current opacity-50" />
                <span className="w-3 h-3 rounded-full border border-current opacity-50" />
              </>
            )}
          </div>

          {exportMode ? (
            <span className="text-xs opacity-65 font-mono truncate">{data.fileName || canvasStyle.windowTitle}</span>
          ) : (
            <input
              type="text"
              value={data.fileName}
              onChange={(e) => onChange({ ...data, fileName: e.target.value })}
              aria-label="File name"
              className="text-xs text-center bg-transparent opacity-75 hover:opacity-100 focus:opacity-100 focus:outline-none font-mono max-w-[200px]"
            />
          )}

          {!exportMode ? (
            <div data-export-ignore="true" className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowAnnotator((v) => !v)}
                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                  showAnnotator ? 'bg-blue-500/25 text-blue-300' : 'opacity-70 hover:opacity-100 hover:bg-white/10'
                }`}
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>{t.code.annotateMode}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyRaw}
                title={t.code.copyRaw}
                className="px-2 py-1 rounded text-[11px] flex items-center gap-1 opacity-70 hover:opacity-100 hover:bg-white/10 cursor-pointer"
              >
                {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRaw ? t.code.copiedRaw : t.code.copyRaw}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadRaw}
                title={t.code.downloadClean}
                className="p-1 rounded opacity-70 hover:opacity-100 hover:bg-white/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-12" />
          )}
        </div>
      )}

      {/* Code Annotation Studio Controls */}
      {!exportMode && showAnnotator && (
        <div
          data-export-ignore="true"
          className="px-4 py-2.5 border-b border-white/10 bg-black/25 text-xs space-y-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono tabular-nums opacity-75">
              L{selInfo.lineStart}
              {selInfo.lineEnd > selInfo.lineStart ? `–${selInfo.lineEnd}` : ''}
              {selInfo.colEnd > selInfo.colStart ? ` (C${selInfo.colStart}:${selInfo.colEnd})` : ''}
            </span>

            <select
              value={newAnnType}
              onChange={(e) => setNewAnnType(e.target.value as CodeAnnotationType)}
              className="h-7 px-2 rounded bg-black/40 border border-white/15 text-xs"
            >
              <option value="line">{locale === 'zh-CN' ? '单行/多行高亮' : 'Line Highlight'}</option>
              <option value="range">{locale === 'zh-CN' ? '字符选区高亮' : 'Char Selection'}</option>
              <option value="box">{locale === 'zh-CN' ? '多行重点框' : 'Focus Box'}</option>
              <option value="arrow">{locale === 'zh-CN' ? '箭头指引' : 'Callout Arrow'}</option>
              <option value="note">{locale === 'zh-CN' ? '行批注' : 'Margin Note'}</option>
              <option value="bubble">{locale === 'zh-CN' ? '解释气泡' : 'Explanation Bubble'}</option>
              <option value="section">{locale === 'zh-CN' ? '教学分段' : 'Teaching Segment'}</option>
            </select>

            <div className="flex items-center gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewAnnColor(c.id)}
                  title={locale === 'zh-CN' ? c.meaningZh : c.meaningEn}
                  className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${
                    newAnnColor === c.id ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.swatch }}
                />
              ))}
            </div>

            {newAnnType === 'section' && (
              <input
                type="text"
                value={newAnnTitle}
                onChange={(e) => setNewAnnTitle(e.target.value)}
                placeholder={locale === 'zh-CN' ? '分段标题...' : 'Section title...'}
                className="h-7 px-2 rounded bg-black/40 border border-white/15 text-xs w-28"
              />
            )}

            <input
              type="text"
              value={newAnnText}
              onChange={(e) => setNewAnnText(e.target.value)}
              placeholder={locale === 'zh-CN' ? '输入批注或教学解释...' : 'Annotation text...'}
              className="h-7 px-2.5 rounded bg-black/40 border border-white/15 text-xs flex-1 min-w-[160px]"
            />

            <button
              type="button"
              onClick={handleAddAnnotation}
              className="h-7 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer"
            >
              {t.code.addAnnotation}
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={data.dimUnfocused}
                onChange={(e) => onChange({ ...data, dimUnfocused: e.target.checked })}
                className="accent-blue-500"
              />
              <EyeOff className="w-3 h-3 opacity-75" />
              <span>{t.code.dimUnfocused}</span>
            </label>
          </div>

          {orphanedCount > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.code.orphanedCodeWarn} ({orphanedCount})</span>
            </div>
          )}

          {data.annotations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {data.annotations.map((ann) => (
                <div
                  key={ann.id}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] ${
                    ann.status === 'orphaned'
                      ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                      : 'border-white/15 bg-white/5'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getAnnotationBorder(ann.color) }}
                  />
                  <span className="font-mono tabular-nums">
                    L{ann.lineStart}
                    {ann.lineEnd > ann.lineStart ? `-${ann.lineEnd}` : ''}
                  </span>
                  <span className="truncate max-w-[160px]">{ann.text}</span>
                  {ann.status === 'orphaned' && (
                    <span className="text-amber-300">[{t.problem.orphaned}]</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAnnotation(ann.id)}
                    className="opacity-65 hover:opacity-100 text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Real CodeMirror 6 Editor Surface */}
      <div className="px-3 py-1 overflow-x-auto">
        <div ref={editorHostRef} />
      </div>

      {/* Rendered Teaching Callouts / Arrows / Bubbles / Segments attached beneath code */}
      {anchoredNotes.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/20 space-y-1.5 text-xs">
          {anchoredNotes.map((ann) => (
            <div key={ann.id} className="flex items-start gap-2.5 leading-relaxed">
              <span
                className="mt-1 w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getAnnotationBorder(ann.color) }}
              />
              <span className="font-mono tabular-nums opacity-75 shrink-0">
                L{ann.lineStart}
                {ann.lineEnd > ann.lineStart ? `–${ann.lineEnd}` : ''}
              </span>
              {ann.type === 'arrow' && <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" />}
              {ann.type === 'bubble' && <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" />}
              {ann.type === 'section' && <Layers className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" />}
              <div className="min-w-0">
                {ann.title && <span className="font-semibold mr-1.5">{ann.title}:</span>}
                <span className="opacity-90">{ann.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Optional Carbon Watermark */}
      {canvasStyle.watermark && (
        <div className="px-4 py-2 text-right text-[11px] opacity-45 font-mono border-t border-white/5">
          Yanpb CodeTransit · Carbon
        </div>
      )}
    </div>
  );
};
