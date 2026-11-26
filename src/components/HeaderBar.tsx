import React from 'react';
import { BookOpen, KeyRound, Share2 } from 'lucide-react';
import { Locale } from '../types/workspace';
import { StudioMode } from '../types/algorithmStudio';
import { getTranslations } from '../constants/i18n';

interface HeaderBarProps {
  locale: Locale;
  studioMode: StudioMode;
  hasAiKey: boolean;
  guideOpen: boolean;
  onSwitchStudio: (mode: StudioMode) => void;
  onOpenApiKey: () => void;
  onOpenGuide: () => void;
  onOpenTransit: () => void;
  onOpenExport: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  locale,
  studioMode,
  hasAiKey,
  guideOpen,
  onSwitchStudio,
  onOpenApiKey,
  onOpenGuide,
  onOpenTransit,
  onOpenExport,
}) => {
  const t = getTranslations(locale);

  const studios: { id: StudioMode; label: string }[] = [
    { id: 'code', label: t.navCanvas },
    { id: 'algorithm', label: t.navAlgoStudio },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0B0E14]/95 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 min-h-14 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSwitchStudio('code')}
          className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          {t.brand}
        </button>

        {/* Zone 2: Consolidated Dual-Studio Navigation */}
        <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium">
          {studios.map((st) => {
            const isActive = studioMode === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSwitchStudio(st.id)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b-2 focus-visible:outline-none ${
                  isActive
                    ? 'border-blue-600 text-slate-950 dark:border-blue-400 dark:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Key Setup, Guide, Transit & Primary Export CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenApiKey}
            title={
              locale === 'zh-CN'
                ? hasAiKey
                  ? '管理或切换模型 API Key'
                  : '配置 API Key'
                : hasAiKey
                  ? 'Manage or switch model API keys'
                  : 'Configure API Key'
            }
            className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              hasAiKey
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/15'
                : 'border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>API Key</span>
            {hasAiKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>

          <button
            id="workspace-guide-trigger"
            type="button"
            onClick={onOpenGuide}
            aria-expanded={guideOpen}
            aria-controls={guideOpen ? 'workspace-guide' : undefined}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/15 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>{t.guideBtn}</span>
          </button>

          <button
            type="button"
            onClick={onOpenTransit}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/15 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.navTransit}</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B0E14]"
          >
            {t.exportBtn}
          </button>
        </div>
      </div>
    </header>
  );
};
