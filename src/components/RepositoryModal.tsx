import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  Star,
  Download,
  BookmarkPlus,
  Trash2,
  History,
  GitCompare,
  RotateCcw,
} from 'lucide-react';
import JSZip from 'jszip';
import { diffLines } from 'diff';
import {
  AlgorithmCategory,
  ContestTier,
  Locale,
  RepositoryEntry,
  RepositoryItemKind,
  WorkspaceDocument,
  WorkspaceSnapshot,
} from '../types/workspace';
import { getTranslations } from '../constants/i18n';
import { ALGORITHM_CATEGORIES } from '../constants/seedRepository';
import { CARBON_LANGUAGES } from '../constants/carbon';

interface RepositoryModalProps {
  locale: Locale;
  currentWorkspace: WorkspaceDocument;
  entries: RepositoryEntry[];
  snapshots: WorkspaceSnapshot[];
  onLoadWorkspace: (ws: WorkspaceDocument) => void;
  onToggleFavorite: (id: string) => void;
  onSaveCurrentToRepo: (tier: ContestTier, category: AlgorithmCategory, kind: RepositoryItemKind) => void;
  onDeleteRepoEntry: (id: string) => void;
  onRestoreSnapshot: (snap: WorkspaceSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onClose: () => void;
}

export const RepositoryModal: React.FC<RepositoryModalProps> = ({
  locale,
  currentWorkspace,
  entries,
  snapshots,
  onLoadWorkspace,
  onToggleFavorite,
  onSaveCurrentToRepo,
  onDeleteRepoEntry,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onClose,
}) => {
  const t = getTranslations(locale);
  const [tab, setTab] = useState<'library' | 'history'>('library');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<ContestTier | 'ALL'>('ALL');
  const [catFilter, setCatFilter] = useState<AlgorithmCategory | 'ALL'>('ALL');
  const [favOnly, setFavOnly] = useState(false);

  const [saveTier, setSaveTier] = useState<ContestTier>('CSP-S');
  const [saveCategory, setSaveCategory] = useState<AlgorithmCategory>('dp');
  const [saveKind, setSaveKind] = useState<RepositoryItemKind>('standard');

  // Snapshot diff state
  const [leftSnapId, setLeftSnapId] = useState<string>(snapshots[0]?.id || '');
  const [rightSnapId, setRightSnapId] = useState<string>('CURRENT');

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (tierFilter !== 'ALL' && e.tier !== tierFilter) return false;
      if (catFilter !== 'ALL' && e.category !== catFilter) return false;
      if (favOnly && !e.favorite) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.tags.some((tg) => tg.toLowerCase().includes(q)) ||
        e.workspace.titleData.problemCode.toLowerCase().includes(q)
      );
    });
  }, [entries, search, tierFilter, catFilter, favOnly]);

  const handleBatchDownloadZip = async () => {
    const zip = new JSZip();
    for (const entry of filteredEntries) {
      const ext =
        CARBON_LANGUAGES.find((l) => l.id === entry.workspace.codeData.language)?.ext || 'cpp';
      const safeName = `${entry.tier}_${entry.workspace.titleData.problemCode || entry.id}`.replace(
        /[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g,
        '_'
      );
      zip.file(`${safeName}.${ext}`, entry.workspace.codeData.code);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yanpb-codetransit-templates.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const diffResult = useMemo(() => {
    const leftText =
      leftSnapId === 'CURRENT'
        ? currentWorkspace.codeData.code
        : snapshots.find((s) => s.id === leftSnapId)?.code ?? '';
    const rightText =
      rightSnapId === 'CURRENT'
        ? currentWorkspace.codeData.code
        : snapshots.find((s) => s.id === rightSnapId)?.code ?? '';
    return diffLines(leftText, rightText);
  }, [leftSnapId, rightSnapId, snapshots, currentWorkspace.codeData.code]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[88vh] rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#11151E] text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-base font-bold">{t.repoModal.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab('library')}
            className={`pb-2.5 border-b-2 cursor-pointer ${
              tab === 'library'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            {t.repoModal.tabLibrary} ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>
              {t.repoModal.tabHistory} ({snapshots.length})
            </span>
          </button>
        </div>

        {tab === 'library' ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Filters & Actions */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 space-y-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.repoModal.searchPlaceholder}
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                  />
                </div>

                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as ContestTier | 'ALL')}
                  className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  <option value="ALL">{t.repoModal.allTiers}</option>
                  <option value="CSP-J">CSP-J</option>
                  <option value="CSP-S">CSP-S</option>
                  <option value="NOIP">NOIP</option>
                  <option value="ACM">ACM / ICPC</option>
                </select>

                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value as AlgorithmCategory | 'ALL')}
                  className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  <option value="ALL">{t.repoModal.allCategories}</option>
                  {ALGORITHM_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === 'zh-CN' ? c.zh : c.en}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-slate-300 dark:border-white/15 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={favOnly}
                    onChange={(e) => setFavOnly(e.target.checked)}
                    className="accent-amber-400"
                  />
                  <span>{t.repoModal.favoritesOnly}</span>
                </label>

                <button
                  type="button"
                  onClick={handleBatchDownloadZip}
                  className="h-8 px-3 rounded-lg border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.repoModal.batchDownload}</span>
                </button>
              </div>

              {/* Save Current Workspace Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <span className="text-slate-500">{locale === 'zh-CN' ? '归档当前画布:' : 'Archive Current:'}</span>
                <select
                  value={saveTier}
                  onChange={(e) => setSaveTier(e.target.value as ContestTier)}
                  className="h-7 px-2 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  <option value="CSP-J">CSP-J</option>
                  <option value="CSP-S">CSP-S</option>
                  <option value="NOIP">NOIP</option>
                  <option value="ACM">ACM</option>
                </select>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value as AlgorithmCategory)}
                  className="h-7 px-2 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  {ALGORITHM_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === 'zh-CN' ? c.zh : c.en}
                    </option>
                  ))}
                </select>
                <select
                  value={saveKind}
                  onChange={(e) => setSaveKind(e.target.value as RepositoryItemKind)}
                  className="h-7 px-2 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  <option value="standard">{locale === 'zh-CN' ? '标准模板' : 'Standard'}</option>
                  <option value="variant">{locale === 'zh-CN' ? '变形模板' : 'Variant'}</option>
                  <option value="classic">{locale === 'zh-CN' ? '经典题型' : 'Classic'}</option>
                </select>
                <button
                  type="button"
                  onClick={() => onSaveCurrentToRepo(saveTier, saveCategory, saveKind)}
                  className="h-7 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>{t.repoModal.saveCurrent}</span>
                </button>
              </div>
            </div>

            {/* Repository List */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEntries.map((item) => {
                const catMeta = ALGORITHM_CATEGORIES.find((c) => c.id === item.category);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#151A24] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <span>{item.tier}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{catMeta ? (locale === 'zh-CN' ? catMeta.zh : catMeta.en) : item.category}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{item.difficulty}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(item.id)}
                          className="cursor-pointer shrink-0"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              item.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                            }`}
                          />
                        </button>
                      </div>
                      <h4 className="text-sm font-bold">{item.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.summary}
                      </p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.tags.join(' / ')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadWorkspace(item.workspace);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
                      >
                        {t.repoModal.loadToCanvas}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRepoEntry(item.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
            {/* Snapshot List */}
            <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 overflow-y-auto divide-y divide-slate-200 dark:divide-white/10 text-xs">
              {snapshots.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  {locale === 'zh-CN'
                    ? '暂无历史快照。点击工具栏「保存快照」即可记录版本。'
                    : 'No snapshots yet. Click Snapshot in toolbar to save a version.'}
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div key={snap.id} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{snap.label}</span>
                      <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                        {new Date(snap.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLeftSnapId(snap.id)}
                        className={`px-2 py-1 rounded border cursor-pointer ${
                          leftSnapId === snap.id
                            ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                            : 'border-slate-300 dark:border-white/15'
                        }`}
                      >
                        <GitCompare className="w-3 h-3 inline mr-1" />
                        {locale === 'zh-CN' ? '设为基准对比' : 'Compare Base'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreSnapshot(snap);
                          onClose();
                        }}
                        className="px-2 py-1 rounded bg-emerald-600 text-white cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t.repoModal.restoreSnapshot}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSnapshot(snap.id)}
                        className="ml-auto text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Diff Viewer */}
            <div className="md:col-span-7 p-4 overflow-y-auto flex flex-col gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{t.repoModal.compareDiff}:</span>
                <select
                  value={leftSnapId}
                  onChange={(e) => setLeftSnapId(e.target.value)}
                  className="h-7 px-2 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  <option value="CURRENT">{locale === 'zh-CN' ? '当前画布代码' : 'Current Code'}</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span>→</span>
                <select
                  value={rightSnapId}
                  onChange={(e) => setRightSnapId(e.target.value)}
                  className="h-7 px-2 rounded border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  <option value="CURRENT">{locale === 'zh-CN' ? '当前画布代码' : 'Current Code'}</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <pre className="flex-1 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/35 font-mono text-xs overflow-auto leading-relaxed">
                {diffResult.map((part, idx) => (
                  <span
                    key={idx}
                    className={
                      part.added
                        ? 'block bg-emerald-500/20 text-emerald-400'
                        : part.removed
                        ? 'block bg-rose-500/20 text-rose-400'
                        : 'block opacity-80'
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
