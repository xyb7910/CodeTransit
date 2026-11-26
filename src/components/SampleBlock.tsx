import React, { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Columns,
  Rows,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Upload,
  Download,
  Image as ImageIcon,
  X,
  CheckCircle2,
  XCircle,
  CircleDashed,
  ChevronsDownUp,
  ChevronsUpDown,
  Eraser,
} from 'lucide-react';
import {
  Locale,
  SampleCase,
  SampleDiffMode,
  SamplesBlockData,
  SampleType,
} from '../types/workspace';
import { getTranslations } from '../constants/i18n';
import { compareSampleOutputs } from '../utils/sampleDiff';
import { exportNodeToImage } from '../utils/exportImage';

interface SampleBlockProps {
  data: SamplesBlockData;
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: SamplesBlockData) => void;
}

type CaseStatusFilter = 'all' | 'passed' | 'failed' | 'pending';

const SAMPLE_TYPES: { id: SampleType; zh: string; en: string }[] = [
  { id: 'official', zh: '官方样例', en: 'Official' },
  { id: 'boundary', zh: '边界样例', en: 'Boundary' },
  { id: 'custom', zh: '自定义样例', en: 'Custom' },
  { id: 'random', zh: '随机测试', en: 'Random' },
  { id: 'error', zh: '错误/Hack 样例', en: 'Error / Hack' },
];

export const SampleBlock: React.FC<SampleBlockProps> = ({
  data,
  locale,
  exportMode = false,
  onChange,
}) => {
  const t = getTranslations(locale);
  const blockRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchJsonText, setBatchJsonText] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilter>('all');

  const evaluatedCases = useMemo(() => {
    return data.cases.map((sc, index) => {
      const diff = compareSampleOutputs(
        sc.expectedOutput,
        sc.actualOutput,
        data.diffMode,
        data.floatEpsilon
      );
      const status: Exclude<CaseStatusFilter, 'all'> = !diff.hasActual
        ? 'pending'
        : diff.matched
          ? 'passed'
          : 'failed';
      return { sc, index, diff, status };
    });
  }, [data.cases, data.diffMode, data.floatEpsilon]);

  const stats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let pending = 0;
    for (const item of evaluatedCases) {
      if (item.status === 'passed') passed++;
      else if (item.status === 'failed') failed++;
      else pending++;
    }
    return { total: evaluatedCases.length, passed, failed, pending };
  }, [evaluatedCases]);

  const visibleCases = useMemo(() => {
    if (exportMode || statusFilter === 'all') return evaluatedCases;
    return evaluatedCases.filter((item) => item.status === statusFilter);
  }, [evaluatedCases, statusFilter, exportMode]);

  const addSample = (presetType: SampleType = 'custom') => {
    const nextNum = data.cases.length + 1;
    const typeLabel = SAMPLE_TYPES.find((st) => st.id === presetType);
    const nextCase: SampleCase = {
      id: `smp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name:
        presetType === 'custom'
          ? `${locale === 'zh-CN' ? '样例' : 'Sample'} #${nextNum}`
          : `${locale === 'zh-CN' ? typeLabel?.zh : typeLabel?.en} #${nextNum}`,
      type: presetType,
      input: '',
      expectedOutput: '',
      actualOutput: '',
      explanation: '',
      collapsed: false,
    };
    setStatusFilter('all');
    onChange({ ...data, cases: [...data.cases, nextCase] });
  };

  const updateCase = (id: string, patch: Partial<SampleCase>) => {
    onChange({
      ...data,
      cases: data.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const duplicateCase = (c: SampleCase) => {
    const copy: SampleCase = {
      ...c,
      id: `smp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${c.name} (${locale === 'zh-CN' ? '副本' : 'Copy'})`,
      collapsed: false,
    };
    onChange({ ...data, cases: [...data.cases, copy] });
  };

  const removeCase = (id: string) => {
    onChange({ ...data, cases: data.cases.filter((c) => c.id !== id) });
  };

  const moveCase = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= data.cases.length) return;
    const next = [...data.cases];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange({ ...data, cases: next });
  };

  const toggleAllCollapsed = () => {
    const anyExpanded = data.cases.some((c) => !c.collapsed);
    onChange({
      ...data,
      cases: data.cases.map((c) => ({ ...c, collapsed: anyExpanded })),
    });
  };

  const clearAllActualOutputs = () => {
    onChange({
      ...data,
      cases: data.cases.map((c) => ({ ...c, actualOutput: '' })),
    });
  };

  const copyField = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  const handleBatchExport = () => {
    const blob = new Blob([JSON.stringify(data.cases, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'samples-bundle.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchImport = () => {
    try {
      const parsed = JSON.parse(batchJsonText);
      if (Array.isArray(parsed)) {
        const imported: SampleCase[] = parsed.map((item, idx) => ({
          id: `smp-b-${Date.now()}-${idx}`,
          name: String(item.name || `${locale === 'zh-CN' ? '导入样例' : 'Imported'} #${data.cases.length + idx + 1}`),
          type: (['official', 'boundary', 'custom', 'random', 'error'].includes(item.type)
            ? item.type
            : 'custom') as SampleType,
          input: String(item.input ?? ''),
          expectedOutput: String(item.expectedOutput ?? ''),
          actualOutput: String(item.actualOutput ?? ''),
          explanation: String(item.explanation ?? ''),
          collapsed: false,
        }));
        onChange({ ...data, cases: [...data.cases, ...imported] });
        setShowBatchModal(false);
        setBatchJsonText('');
      }
    } catch {
      const parts = batchJsonText.split(/\n---+\n/).filter((p) => p.trim());
      if (parts.length >= 2) {
        const cases: SampleCase[] = [];
        for (let i = 0; i + 1 < parts.length; i += 2) {
          cases.push({
            id: `smp-txt-${Date.now()}-${i}`,
            name: `${locale === 'zh-CN' ? '导入样例' : 'Imported'} #${data.cases.length + cases.length + 1}`,
            type: 'custom',
            input: parts[i].trim(),
            expectedOutput: parts[i + 1].trim(),
            actualOutput: '',
            explanation: '',
            collapsed: false,
          });
        }
        onChange({ ...data, cases: [...data.cases, ...cases] });
        setShowBatchModal(false);
        setBatchJsonText('');
      }
    }
  };

  const handleExportStandaloneImage = async () => {
    if (!blockRef.current) return;
    await exportNodeToImage(blockRef.current, {
      format: 'png',
      scale: 2,
      transparent: false,
      fileName: 'samples-card',
      pagination: 'single',
    });
  };

  const diffModeLabel =
    data.diffMode === 'token'
      ? t.samples.diffToken
      : data.diffMode === 'line'
        ? t.samples.diffLine
        : data.diffMode === 'char'
          ? t.samples.diffChar
          : t.samples.diffFloat;

  return (
    <div
      ref={blockRef}
      className="rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 p-6 shadow-sm space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold">{t.blocks.samples}</h3>
          <div className="flex items-center gap-2.5 text-xs tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">
              {stats.total} {locale === 'zh-CN' ? '组' : 'total'}
            </span>
            {stats.passed > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {stats.passed} {locale === 'zh-CN' ? '通过' : 'Passed'}
                </span>
              </span>
            )}
            {stats.failed > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                <XCircle className="w-3.5 h-3.5" />
                <span>
                  {stats.failed} {locale === 'zh-CN' ? '差异' : 'Failed'}
                </span>
              </span>
            )}
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <CircleDashed className="w-3.5 h-3.5" />
                <span>
                  {stats.pending} {locale === 'zh-CN' ? '待对比' : 'Pending'}
                </span>
              </span>
            )}
          </div>
        </div>

        {!exportMode && (
          <div data-export-ignore="true" className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Layout toggle */}
            <button
              type="button"
              onClick={() =>
                onChange({ ...data, layout: data.layout === 'split' ? 'stacked' : 'split' })
              }
              className="h-7 px-2.5 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
            >
              {data.layout === 'split' ? <Columns className="w-3.5 h-3.5" /> : <Rows className="w-3.5 h-3.5" />}
              <span>{data.layout === 'split' ? t.samples.splitLayout : t.samples.stackedLayout}</span>
            </button>

            {/* Diff mode selector */}
            <select
              value={data.diffMode}
              onChange={(e) => onChange({ ...data, diffMode: e.target.value as SampleDiffMode })}
              aria-label={t.samples.diffMode}
              className="h-7 px-2 rounded border border-slate-200 dark:border-white/15 bg-white dark:bg-[#181D29]"
            >
              <option value="token">{t.samples.diffToken}</option>
              <option value="line">{t.samples.diffLine}</option>
              <option value="char">{t.samples.diffChar}</option>
              <option value="float">{t.samples.diffFloat}</option>
            </select>

            {data.diffMode === 'float' && (
              <input
                type="number"
                step="1e-7"
                value={data.floatEpsilon}
                onChange={(e) => onChange({ ...data, floatEpsilon: Number(e.target.value) || 1e-6 })}
                title="Epsilon"
                className="h-7 w-20 px-2 rounded border border-slate-200 dark:border-white/15 bg-white dark:bg-[#181D29] font-mono tabular-nums"
              />
            )}

            {data.cases.length > 1 && (
              <button
                type="button"
                onClick={toggleAllCollapsed}
                title={locale === 'zh-CN' ? '展开/折叠全部' : 'Expand/Collapse All'}
                className="h-7 px-2 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
              >
                {data.cases.some((c) => !c.collapsed) ? (
                  <ChevronsDownUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {stats.passed + stats.failed > 0 && (
              <button
                type="button"
                onClick={clearAllActualOutputs}
                title={locale === 'zh-CN' ? '清空所有实际输出' : 'Clear Actual Outputs'}
                className="h-7 px-2 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="h-7 px-2.5 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>{t.samples.batchImport}</span>
            </button>

            <button
              type="button"
              onClick={handleBatchExport}
              className="h-7 px-2.5 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>{t.samples.batchExport}</span>
            </button>

            <button
              type="button"
              onClick={handleExportStandaloneImage}
              className="h-7 px-2.5 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon className="w-3 h-3" />
              <span>{t.samples.exportCard}</span>
            </button>

            <button
              type="button"
              onClick={() => addSample('custom')}
              className="h-7 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.samples.addSample}</span>
            </button>
          </div>
        )}
      </div>

      {/* Multi-Case Status Filter & Overall Progress Bar */}
      {!exportMode && stats.total > 1 && (
        <div
          data-export-ignore="true"
          className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-xs"
        >
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-slate-200/70 dark:bg-white/5">
            {(
              [
                { id: 'all', label: `${locale === 'zh-CN' ? '全部' : 'All'} (${stats.total})` },
                { id: 'passed', label: `${locale === 'zh-CN' ? '通过' : 'Passed'} (${stats.passed})` },
                { id: 'failed', label: `${locale === 'zh-CN' ? '差异' : 'Failed'} (${stats.failed})` },
                { id: 'pending', label: `${locale === 'zh-CN' ? '待对比' : 'Pending'} (${stats.pending})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors tabular-nums cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-[#1E2535] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Segmented progress bar */}
          <div className="flex items-center gap-2 flex-1 max-w-[220px]">
            <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden flex">
              {stats.passed > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${(stats.passed / stats.total) * 100}%` }}
                />
              )}
              {stats.failed > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                />
              )}
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {stats.passed}/{stats.total}
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.cases.length === 0 ? (
        <div className="py-10 px-4 rounded-lg border border-dashed border-slate-300 dark:border-white/15 text-center space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {locale === 'zh-CN'
              ? '暂无测试样例。添加多组样例以对比预期输出与实际输出。'
              : 'No test cases yet. Add test cases to compare expected and actual outputs.'}
          </p>
          {!exportMode && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => addSample('official')}
                className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.samples.addSample}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleCases.map(({ sc, index: idx, diff, status }) => {
            const typeMeta = SAMPLE_TYPES.find((st) => st.id === sc.type)!;
            const cardBorderClass =
              status === 'passed'
                ? 'border-emerald-500/40 bg-emerald-500/[0.03]'
                : status === 'failed'
                  ? 'border-rose-500/45 bg-rose-500/[0.03]'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20';

            return (
              <div
                key={sc.id}
                className={`rounded-lg border p-4 space-y-3 transition-colors ${cardBorderClass}`}
              >
                {/* Case Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Explicit Visual Success / Failure / Pending Indicator */}
                    {status === 'passed' && (
                      <span
                        title={t.samples.matched}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{locale === 'zh-CN' ? '通过' : 'PASS'}</span>
                      </span>
                    )}
                    {status === 'failed' && (
                      <span
                        title={t.samples.mismatched}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400"
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>{locale === 'zh-CN' ? '未通过' : 'FAIL'}</span>
                      </span>
                    )}
                    {status === 'pending' && (
                      <span
                        title={t.samples.pendingActual}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500"
                      >
                        <CircleDashed className="w-4 h-4 shrink-0" />
                        <span>{locale === 'zh-CN' ? '待测' : 'PENDING'}</span>
                      </span>
                    )}

                    <span aria-hidden="true" className="text-slate-300 dark:text-white/20">|</span>

                    {exportMode ? (
                      <span className="text-xs font-semibold">{sc.name}</span>
                    ) : (
                      <input
                        type="text"
                        value={sc.name}
                        onChange={(e) => updateCase(sc.id, { name: e.target.value })}
                        className="text-xs font-semibold bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none min-w-[90px]"
                      />
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      · {locale === 'zh-CN' ? typeMeta.zh : typeMeta.en}
                    </span>

                    {diff.hasActual && !diff.matched && (
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                        · {diff.summary}
                      </span>
                    )}
                  </div>

                  {!exportMode && (
                    <div data-export-ignore="true" className="flex items-center gap-1 text-xs">
                      <select
                        value={sc.type}
                        onChange={(e) => updateCase(sc.id, { type: e.target.value as SampleType })}
                        className="h-6 px-1.5 rounded border border-slate-200 dark:border-white/15 bg-white dark:bg-[#181D29] text-[11px]"
                      >
                        {SAMPLE_TYPES.map((st) => (
                          <option key={st.id} value={st.id}>
                            {locale === 'zh-CN' ? st.zh : st.en}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => moveCase(idx, -1)}
                        disabled={idx === 0}
                        title={locale === 'zh-CN' ? '上移' : 'Move up'}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCase(idx, 1)}
                        disabled={idx === data.cases.length - 1}
                        title={locale === 'zh-CN' ? '下移' : 'Move down'}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateCase(sc)}
                        title={locale === 'zh-CN' ? '复制样例' : 'Duplicate'}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCase(sc.id, { collapsed: !sc.collapsed })}
                        title={sc.collapsed ? (locale === 'zh-CN' ? '展开' : 'Expand') : (locale === 'zh-CN' ? '折叠' : 'Collapse')}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                      >
                        {sc.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCase(sc.id)}
                        title={locale === 'zh-CN' ? '删除样例' : 'Delete'}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {!sc.collapsed && (
                  <>
                    <div
                      className={`grid gap-3 ${
                        data.layout === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                      }`}
                    >
                      {/* Input */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{t.samples.input}</span>
                          {!exportMode && (
                            <button
                              type="button"
                              data-export-ignore="true"
                              onClick={() => copyField(`${sc.id}-in`, sc.input)}
                              className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              {copiedId === `${sc.id}-in` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {exportMode ? (
                          <pre className="p-2.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E121B] font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                            {sc.input || ' '}
                          </pre>
                        ) : (
                          <textarea
                            value={sc.input}
                            onChange={(e) => updateCase(sc.id, { input: e.target.value })}
                            rows={3}
                            placeholder={locale === 'zh-CN' ? '输入测试数据...' : 'Enter test input...'}
                            className="w-full p-2.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E121B] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </div>

                      {/* Expected Output */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{t.samples.expected}</span>
                          {!exportMode && (
                            <button
                              type="button"
                              data-export-ignore="true"
                              onClick={() => copyField(`${sc.id}-exp`, sc.expectedOutput)}
                              className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              {copiedId === `${sc.id}-exp` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {exportMode ? (
                          <pre className="p-2.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E121B] font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                            {sc.expectedOutput || ' '}
                          </pre>
                        ) : (
                          <textarea
                            value={sc.expectedOutput}
                            onChange={(e) => updateCase(sc.id, { expectedOutput: e.target.value })}
                            rows={3}
                            placeholder={locale === 'zh-CN' ? '输入期望输出...' : 'Enter expected output...'}
                            className="w-full p-2.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E121B] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    </div>

                    {/* Actual Output & Diff Comparison Result */}
                    {(!exportMode || sc.actualOutput.trim().length > 0) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{t.samples.actual}</span>
                          {!exportMode && (
                            <div className="flex items-center gap-2">
                              {sc.actualOutput && (
                                <button
                                  type="button"
                                  data-export-ignore="true"
                                  onClick={() => copyField(`${sc.id}-act`, sc.actualOutput)}
                                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                >
                                  {copiedId === `${sc.id}-act` ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                              <span className="text-[10px] opacity-75">{t.samples.futureJudgeNote}</span>
                            </div>
                          )}
                        </div>

                        {!exportMode ? (
                          <textarea
                            value={sc.actualOutput}
                            onChange={(e) => updateCase(sc.id, { actualOutput: e.target.value })}
                            rows={2}
                            placeholder={
                              locale === 'zh-CN'
                                ? '手动粘贴程序实际输出，系统将自动对比并显示通过/失败状态...'
                                : 'Paste actual output to compare against expected output...'
                            }
                            className="w-full p-2.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E121B] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <pre className="p-2.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E121B] font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                            {sc.actualOutput}
                          </pre>
                        )}

                        {diff.hasActual && diff.matched && (
                          <div className="px-3 py-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>{t.samples.matched}</span>
                            </span>
                            <span className="text-[11px] opacity-80">
                              {t.samples.diffMode}: {diffModeLabel}
                            </span>
                          </div>
                        )}

                        {diff.hasActual && !diff.matched && (
                          <div className="space-y-2 p-3 rounded-md border border-rose-500/35 bg-rose-500/[0.06]">
                            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-medium">
                              <span className="inline-flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span>
                                  {t.samples.mismatched} · {diff.summary}
                                </span>
                              </span>
                              <span className="text-[11px] opacity-80">
                                {t.samples.diffMode}: {diffModeLabel}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
                              <div className="p-2 rounded bg-white/75 dark:bg-[#0E121B] border border-slate-200 dark:border-white/10">
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                                  {t.samples.expected}
                                </div>
                                <div className="whitespace-pre-wrap break-all">
                                  {diff.expectedParts.map((p, i) => (
                                    <span
                                      key={i}
                                      className={
                                        p.status === 'removed'
                                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded px-0.5 font-semibold'
                                          : ''
                                      }
                                    >
                                      {p.value}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="p-2 rounded bg-white/75 dark:bg-[#0E121B] border border-slate-200 dark:border-white/10">
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                                  {t.samples.actual}
                                </div>
                                <div className="whitespace-pre-wrap break-all">
                                  {diff.actualParts.map((p, i) => (
                                    <span
                                      key={i}
                                      className={
                                        p.status === 'added'
                                          ? 'bg-rose-500/25 text-rose-700 dark:text-rose-300 rounded px-0.5 font-semibold'
                                          : ''
                                      }
                                    >
                                      {p.value}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Explanation */}
                    {(!exportMode || sc.explanation.trim().length > 0) && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t.samples.explanation}
                        </span>
                        {exportMode ? (
                          <p className="text-xs text-slate-700 dark:text-slate-300">{sc.explanation}</p>
                        ) : (
                          <input
                            type="text"
                            value={sc.explanation}
                            onChange={(e) => updateCase(sc.id, { explanation: e.target.value })}
                            placeholder={locale === 'zh-CN' ? '可选：添加样例说明或构造思路...' : 'Optional explanation...'}
                            className="w-full h-8 px-2.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E121B] text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {!exportMode && (
            <div data-export-ignore="true" className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => addSample('custom')}
                className="px-3 py-1.5 rounded-md border border-dashed border-slate-300 dark:border-white/20 hover:border-blue-500 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-500 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === 'zh-CN' ? '再添加一组测试样例' : 'Add Another Test Case'}</span>
              </button>
              <button
                type="button"
                onClick={() => addSample('boundary')}
                className="px-3 py-1.5 rounded-md border border-dashed border-slate-300 dark:border-white/20 hover:border-amber-500 text-xs text-slate-600 dark:text-slate-300 hover:text-amber-500 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === 'zh-CN' ? '添加边界样例' : 'Add Boundary Case'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Batch Import Modal */}
      {showBatchModal && (
        <div
          data-export-ignore="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#151A24] p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">{t.samples.batchImport}</h4>
              <button type="button" onClick={() => setShowBatchModal(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === 'zh-CN'
                ? '支持粘贴导出的 JSON 数组（含 input / expectedOutput / actualOutput），或使用 --- 分隔多组输入与期望输出。'
                : 'Paste JSON array (input / expectedOutput / actualOutput) or Input / Expected blocks separated by ---.'}
            </p>
            <textarea
              value={batchJsonText}
              onChange={(e) => setBatchJsonText(e.target.value)}
              rows={8}
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-white/15 cursor-pointer"
              >
                {locale === 'zh-CN' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleBatchImport}
                className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white font-semibold cursor-pointer"
              >
                {locale === 'zh-CN' ? '导入样例' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
