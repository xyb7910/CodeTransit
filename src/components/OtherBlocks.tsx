import React, { useEffect, useState } from 'react';
import {
  Star,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Edit3,
  Check,
  Clock,
  HardDrive,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  AuthorBlockData,
  ComplexityBlockData,
  FormulaBlockData,
  KeypointItem,
  KeypointsBlockData,
  Locale,
  ProblemHighlight,
  SolutionBlockData,
  TeachingBlockData,
  TitleBlockData,
} from '../types/workspace';
import { getTranslations } from '../constants/i18n';
import { isSafeHttpUrl, renderLatexToHtml, renderSafeMarkdownWithMath } from '../utils/markdown';

/* ======================== TITLE BLOCK ======================== */
export const TitleBlock: React.FC<{
  data: TitleBlockData;
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: TitleBlockData) => void;
}> = ({ data, locale, exportMode = false, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const safeUrl = isSafeHttpUrl(data.sourceUrl) ? data.sourceUrl.trim() : '';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {data.problemCode && <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{data.problemCode}</span>}
            {data.platform && (
              <>
                <span aria-hidden="true">·</span>
                <span>{data.platform}</span>
              </>
            )}
            {data.difficulty && (
              <>
                <span aria-hidden="true">·</span>
                <span>{data.difficulty}</span>
              </>
            )}
            {data.algorithmName && (
              <>
                <span aria-hidden="true">·</span>
                <span>{data.algorithmName}</span>
              </>
            )}
          </div>

          <h2 className="text-xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            {data.problemTitle || (locale === 'zh-CN' ? '未命名题目' : 'Untitled Problem')}
          </h2>

          {data.tags.length > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 pt-0.5">
              {data.tags.map((tag, i) => (
                <React.Fragment key={`${tag}-${i}`}>
                  {i > 0 && <span aria-hidden="true">/</span>}
                  <span>{tag}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {safeUrl && (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md border border-slate-200 dark:border-white/15 text-slate-500 hover:text-blue-500"
              title={locale === 'zh-CN' ? '打开原题链接' : 'Open Source URL'}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onChange({ ...data, starred: !data.starred })}
            className={`p-1.5 rounded-md border border-slate-200 dark:border-white/15 cursor-pointer ${
              data.starred ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Star className={`w-4 h-4 ${data.starred ? 'fill-amber-400' : ''}`} />
          </button>
          {!exportMode && (
            <button
              type="button"
              data-export-ignore="true"
              onClick={() => setEditing((v) => !v)}
              className="p-1.5 rounded-md border border-slate-200 dark:border-white/15 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {editing ? <Check className="w-4 h-4 text-emerald-500" /> : <Edit3 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {!exportMode && editing && (
        <div
          data-export-ignore="true"
          className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
        >
          <input
            type="text"
            value={data.problemTitle}
            onChange={(e) => onChange({ ...data, problemTitle: e.target.value })}
            placeholder={locale === 'zh-CN' ? '题目名称' : 'Problem Title'}
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <input
            type="text"
            value={data.algorithmName}
            onChange={(e) => onChange({ ...data, algorithmName: e.target.value })}
            placeholder={locale === 'zh-CN' ? '算法名称' : 'Algorithm Name'}
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <input
            type="text"
            value={data.problemCode}
            onChange={(e) => onChange({ ...data, problemCode: e.target.value })}
            placeholder={locale === 'zh-CN' ? '题号 (如 P1048)' : 'Problem ID'}
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 font-mono"
          />
          <input
            type="text"
            value={data.platform}
            onChange={(e) => onChange({ ...data, platform: e.target.value })}
            placeholder={locale === 'zh-CN' ? '来源平台 (洛谷 / CF / NOIP)' : 'Platform'}
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <input
            type="text"
            value={data.difficulty}
            onChange={(e) => onChange({ ...data, difficulty: e.target.value })}
            placeholder={locale === 'zh-CN' ? '难度标签' : 'Difficulty'}
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <input
            type="url"
            value={data.sourceUrl}
            onChange={(e) => onChange({ ...data, sourceUrl: e.target.value })}
            placeholder={locale === 'zh-CN' ? '原题链接 (https://...)' : 'Source URL'}
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <div className="md:col-span-3 flex items-center gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault();
                  onChange({ ...data, tags: [...data.tags, tagInput.trim()] });
                  setTagInput('');
                }
              }}
              placeholder={locale === 'zh-CN' ? '输入算法标签后按回车添加...' : 'Type tag and press Enter...'}
              className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 flex-1"
            />
            {data.tags.map((tg, idx) => (
              <button
                key={`${tg}-${idx}`}
                type="button"
                onClick={() => onChange({ ...data, tags: data.tags.filter((_, i) => i !== idx) })}
                className="px-2 py-1 rounded border border-slate-300 dark:border-white/15 hover:text-rose-400 cursor-pointer"
              >
                {tg} ×
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ======================== KEYPOINTS BLOCK ======================== */
export const KeypointsBlock: React.FC<{
  data: KeypointsBlockData;
  problemHighlights: ProblemHighlight[];
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: KeypointsBlockData) => void;
}> = ({ data, problemHighlights, locale, exportMode = false, onChange }) => {
  const t = getTranslations(locale);

  const addItem = () => {
    const item: KeypointItem = {
      id: `kp-${Date.now()}`,
      category: 'condition',
      text: '',
    };
    onChange({ items: [...data.items, item] });
  };

  const syncFromHighlights = () => {
    const mapped: KeypointItem[] = problemHighlights
      .filter((h) => h.status === 'anchored')
      .map((h) => ({
        id: `kp-sync-${h.id}`,
        category: h.color === 'green' ? 'range' : h.color === 'blue' ? 'breakthrough' : 'condition',
        text: h.note ? `${h.exactText}（${h.note}）` : h.exactText,
      }));
    if (mapped.length > 0) {
      onChange({ items: mapped });
    }
  };

  const categoryLabels: Record<KeypointItem['category'], { zh: string; en: string; dot: string }> = {
    condition: { zh: '重点条件', en: 'Condition', dot: '#FACC15' },
    range: { zh: '数据范围', en: 'Data Range', dot: '#22C55E' },
    breakthrough: { zh: '算法突破口', en: 'Breakthrough', dot: '#3B82F6' },
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
        <h3 className="text-sm font-semibold">{t.blocks.keypoints}</h3>
        {!exportMode && (
          <div data-export-ignore="true" className="flex items-center gap-2 text-xs">
            {problemHighlights.length > 0 && (
              <button
                type="button"
                onClick={syncFromHighlights}
                className="h-7 px-2.5 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span>{locale === 'zh-CN' ? '同步划词重点' : 'Sync Highlights'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={addItem}
              className="h-7 px-2.5 rounded bg-blue-600 text-white font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{locale === 'zh-CN' ? '新增重点' : 'Add'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {data.items.map((item) => {
          const cat = categoryLabels[item.category];
          return (
            <div key={item.id} className="flex items-start gap-2.5 text-sm">
              <span
                className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: cat.dot }}
              />
              {exportMode ? (
                <div className="flex-1">
                  <span className="font-semibold text-xs text-slate-500 dark:text-slate-400 mr-2">
                    [{locale === 'zh-CN' ? cat.zh : cat.en}]
                  </span>
                  <span>{item.text}</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  <select
                    value={item.category}
                    onChange={(e) =>
                      onChange({
                        items: data.items.map((x) =>
                          x.id === item.id ? { ...x, category: e.target.value as KeypointItem['category'] } : x
                        ),
                      })
                    }
                    className="h-7 px-2 rounded border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-black/30 text-xs"
                  >
                    <option value="condition">{categoryLabels.condition[locale === 'zh-CN' ? 'zh' : 'en']}</option>
                    <option value="range">{categoryLabels.range[locale === 'zh-CN' ? 'zh' : 'en']}</option>
                    <option value="breakthrough">{categoryLabels.breakthrough[locale === 'zh-CN' ? 'zh' : 'en']}</option>
                  </select>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      onChange({
                        items: data.items.map((x) => (x.id === item.id ? { ...x, text: e.target.value } : x)),
                      })
                    }
                    className="h-7 px-2.5 rounded border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-black/30 text-xs flex-1 min-w-[200px]"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ items: data.items.filter((x) => x.id !== item.id) })}
                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ======================== FORMULA BLOCK ======================== */
export const FormulaBlock: React.FC<{
  data: FormulaBlockData;
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: FormulaBlockData) => void;
}> = ({ data, locale, exportMode = false, onChange }) => {
  const t = getTranslations(locale);
  const [editing, setEditing] = useState(false);

  const quickSnippets = [
    { label: 'Σ', tex: '\\sum_{i=1}^{n} a_i' },
    { label: 'C(n,k)', tex: '\\binom{n}{k}' },
    { label: 'O(n log n)', tex: '\\mathcal{O}(n \\log n)' },
    { label: 'DP', tex: 'dp[i][j] = \\max(dp[i-1][j],\\; dp[i-1][j-w_i] + v_i)' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{data.title || t.blocks.formula}</h3>
        {!exportMode && (
          <button
            type="button"
            data-export-ignore="true"
            onClick={() => setEditing((v) => !v)}
            className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            {editing ? (locale === 'zh-CN' ? '完成' : 'Done') : (locale === 'zh-CN' ? '编辑 LaTeX' : 'Edit LaTeX')}
          </button>
        )}
      </div>

      {!exportMode && editing && (
        <div data-export-ignore="true" className="space-y-2 pb-2 border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            {quickSnippets.map((qs) => (
              <button
                key={qs.label}
                type="button"
                onClick={() => onChange({ ...data, latex: data.latex ? `${data.latex} \\; ${qs.tex}` : qs.tex })}
                className="px-2 py-0.5 rounded border border-slate-300 dark:border-white/15 text-xs font-mono hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                + {qs.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder={locale === 'zh-CN' ? '公式标题' : 'Formula Title'}
            className="w-full h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 text-xs"
          />
          <textarea
            value={data.latex}
            onChange={(e) => onChange({ ...data, latex: e.target.value })}
            rows={3}
            className="w-full p-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 font-mono text-xs"
          />
          <input
            type="text"
            value={data.caption}
            onChange={(e) => onChange({ ...data, caption: e.target.value })}
            placeholder={locale === 'zh-CN' ? '公式补充说明' : 'Caption'}
            className="w-full h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 text-xs"
          />
        </div>
      )}

      <div
        className="py-3 px-4 rounded-lg bg-slate-50 dark:bg-black/25 border border-slate-200 dark:border-white/10 overflow-x-auto text-center"
        dangerouslySetInnerHTML={{ __html: renderLatexToHtml(data.latex, true) }}
      />
      {data.caption && <p className="text-xs text-slate-500 dark:text-slate-400">{data.caption}</p>}
    </div>
  );
};

/* ======================== SOLUTION BLOCK ======================== */
export const SolutionBlock: React.FC<{
  data: SolutionBlockData;
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: SolutionBlockData) => void;
}> = ({ data, locale, exportMode = false, onChange }) => {
  const t = getTranslations(locale);
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
        <h3 className="text-sm font-semibold">{t.blocks.solution}</h3>
        {!exportMode && (
          <button
            type="button"
            data-export-ignore="true"
            onClick={() => setEditing((v) => !v)}
            className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            {editing ? (locale === 'zh-CN' ? '预览渲染' : 'Preview') : (locale === 'zh-CN' ? '编辑 Markdown' : 'Edit Markdown')}
          </button>
        )}
      </div>

      {!exportMode && editing ? (
        <textarea
          value={data.markdown}
          onChange={(e) => onChange({ markdown: e.target.value })}
          rows={8}
          className="w-full p-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div
          className="prose-oi"
          dangerouslySetInnerHTML={{ __html: renderSafeMarkdownWithMath(data.markdown) }}
        />
      )}
    </div>
  );
};

/* ======================== COMPLEXITY BLOCK ======================== */
export const ComplexityBlock: React.FC<{
  data: ComplexityBlockData;
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: ComplexityBlockData) => void;
}> = ({ data, locale, exportMode = false, onChange }) => {
  const t = getTranslations(locale);
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t.blocks.complexity}</h3>
        {!exportMode && (
          <button
            type="button"
            data-export-ignore="true"
            onClick={() => setEditing((v) => !v)}
            className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-white/15 cursor-pointer"
          >
            {editing ? (locale === 'zh-CN' ? '完成' : 'Done') : (locale === 'zh-CN' ? '编辑' : 'Edit')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 flex items-center gap-3">
          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {locale === 'zh-CN' ? '时间复杂度' : 'Time Complexity'}
            </div>
            <div
              className="text-sm font-semibold tabular-nums"
              dangerouslySetInnerHTML={{ __html: renderLatexToHtml(data.timeComplexity || 'O(n)') }}
            />
          </div>
        </div>
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 flex items-center gap-3">
          <HardDrive className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {locale === 'zh-CN' ? '空间复杂度' : 'Space Complexity'}
            </div>
            <div
              className="text-sm font-semibold tabular-nums"
              dangerouslySetInnerHTML={{ __html: renderLatexToHtml(data.spaceComplexity || 'O(n)') }}
            />
          </div>
        </div>
      </div>

      {data.notes && !editing && <p className="text-xs text-slate-500 dark:text-slate-400">{data.notes}</p>}

      {!exportMode && editing && (
        <div data-export-ignore="true" className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
          <input
            type="text"
            value={data.timeComplexity}
            onChange={(e) => onChange({ ...data, timeComplexity: e.target.value })}
            placeholder="O(n \log n)"
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 font-mono"
          />
          <input
            type="text"
            value={data.spaceComplexity}
            onChange={(e) => onChange({ ...data, spaceComplexity: e.target.value })}
            placeholder="O(n)"
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 font-mono"
          />
          <input
            type="text"
            value={data.notes}
            onChange={(e) => onChange({ ...data, notes: e.target.value })}
            placeholder={locale === 'zh-CN' ? '复杂度分析备注' : 'Notes'}
            className="sm:col-span-2 h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
        </div>
      )}
    </div>
  );
};

/* ======================== TEACHING BLOCK ======================== */
export const TeachingBlock: React.FC<{
  data: TeachingBlockData;
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: TeachingBlockData) => void;
}> = ({ data, locale, exportMode = false, onChange }) => {
  const t = getTranslations(locale);
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
        <h3 className="text-sm font-semibold">{t.blocks.teaching}</h3>
        {!exportMode && (
          <button
            type="button"
            data-export-ignore="true"
            onClick={() => setEditing((v) => !v)}
            className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-white/15 cursor-pointer"
          >
            {editing ? (locale === 'zh-CN' ? '完成' : 'Done') : (locale === 'zh-CN' ? '编辑批注' : 'Edit')}
          </button>
        )}
      </div>

      {!exportMode && editing ? (
        <div data-export-ignore="true" className="space-y-2.5 text-xs">
          <textarea
            value={data.explanation}
            onChange={(e) => onChange({ ...data, explanation: e.target.value })}
            rows={3}
            placeholder={locale === 'zh-CN' ? '教练讲解要点...' : 'Coach explanation...'}
            className="w-full p-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <textarea
            value={data.pitfalls}
            onChange={(e) => onChange({ ...data, pitfalls: e.target.value })}
            rows={2}
            placeholder={locale === 'zh-CN' ? '易错点与常见 Bug...' : 'Common pitfalls...'}
            className="w-full p-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <textarea
            value={data.checklist.join('\n')}
            onChange={(e) =>
              onChange({
                ...data,
                checklist: e.target.value.split('\n').filter((l) => l.trim().length > 0),
              })
            }
            rows={3}
            placeholder={locale === 'zh-CN' ? '注意事项清单（每行一条）' : 'Checklist items (one per line)'}
            className="w-full p-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {data.explanation && (
            <div>
              <div className="text-xs font-semibold text-blue-500 mb-1">
                {locale === 'zh-CN' ? '讲解重点' : 'Coach Explanation'}
              </div>
              <p className="leading-relaxed text-slate-700 dark:text-slate-200">{data.explanation}</p>
            </div>
          )}
          {data.pitfalls && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <div className="text-xs font-semibold text-rose-500 mb-1">
                {locale === 'zh-CN' ? '易错点提醒' : 'Common Pitfalls'}
              </div>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{data.pitfalls}</p>
            </div>
          )}
          {data.checklist.length > 0 && (
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
              {data.checklist.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/* ======================== AUTHOR BLOCK ======================== */
export const AuthorBlock: React.FC<{
  data: AuthorBlockData;
  locale: Locale;
  exportMode?: boolean;
  onChange: (next: AuthorBlockData) => void;
}> = ({ data, locale, exportMode = false, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [qrSvg, setQrSvg] = useState('');

  useEffect(() => {
    if (!data.showQr) {
      setQrSvg('');
      return;
    }
    const targetUrl = data.lastTransitCode
      ? `${window.location.origin}/?code=${data.lastTransitCode}`
      : window.location.origin;
    QRCode.toString(targetUrl, { type: 'svg', width: 64, margin: 1 })
      .then((svg) => setQrSvg(svg))
      .catch(() => setQrSvg(''));
  }, [data.showQr, data.lastTransitCode]);

  if (!data.enabled && exportMode) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#151A24] text-slate-900 dark:text-slate-100 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {data.avatarDataUrl ? (
            <img
              src={data.avatarDataUrl}
              alt={data.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover border border-white/15"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-display font-bold text-sm flex items-center justify-center">
              {(data.name || 'Y').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold">{data.name || 'Yanpb'}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {data.subtitle || 'Yanpb CodeTransit'}
              {data.showWatermark && ' · © MIT Carbon Enhanced'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data.showQr && qrSvg && (
            <div
              className="p-1 bg-white rounded border border-slate-200"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
          {!exportMode && (
            <button
              type="button"
              data-export-ignore="true"
              onClick={() => setEditing((v) => !v)}
              className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-white/15 cursor-pointer"
            >
              {editing ? (locale === 'zh-CN' ? '完成' : 'Done') : (locale === 'zh-CN' ? '署名设置' : 'Configure')}
            </button>
          )}
        </div>
      </div>

      {!exportMode && editing && (
        <div
          data-export-ignore="true"
          className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs"
        >
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder={locale === 'zh-CN' ? '作者署名 (默认 Yanpb)' : 'Author Name'}
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <input
            type="text"
            value={data.subtitle}
            onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
            placeholder={locale === 'zh-CN' ? '副标题 / 机构签名' : 'Subtitle'}
            className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.enabled}
              onChange={(e) => onChange({ ...data, enabled: e.target.checked })}
              className="accent-blue-600"
            />
            <span>{locale === 'zh-CN' ? '导出时包含作者模块' : 'Include in exports'}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.showQr}
              onChange={(e) => onChange({ ...data, showQr: e.target.checked })}
              className="accent-blue-600"
            />
            <span>{locale === 'zh-CN' ? '显示二维码' : 'Show QR Code'}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.showWatermark}
              onChange={(e) => onChange({ ...data, showWatermark: e.target.checked })}
              className="accent-blue-600"
            />
            <span>{locale === 'zh-CN' ? '显示版权水印' : 'Show Watermark'}</span>
          </label>
        </div>
      )}
    </div>
  );
};
