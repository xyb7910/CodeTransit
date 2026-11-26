import React from 'react';
import { Check, LayoutTemplate } from 'lucide-react';
import { Locale, TemplatePresetId } from '../types/workspace';
import { TEMPLATE_PRESETS } from '../constants/carbon';

interface TemplateSwitcherBarProps {
  locale: Locale;
  activeTemplate: TemplatePresetId;
  onSelectTemplate: (id: TemplatePresetId) => void;
  onClose?: () => void;
}

export const TemplateSwitcherBar: React.FC<TemplateSwitcherBarProps> = ({
  locale,
  activeTemplate,
  onSelectTemplate,
  onClose,
}) => {
  return (
    <div className="border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E121B]">
      <div className="max-w-[1440px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <LayoutTemplate className="w-4 h-4 text-blue-500" />
            <span>{locale === 'zh-CN' ? '选择画布与导出模板（8 种预设）' : 'Canvas & Export Templates (8 Presets)'}</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {locale === 'zh-CN' ? '收起' : 'Close'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TEMPLATE_PRESETS.map((tpl) => {
            const active = activeTemplate === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl.id)}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#151A24] hover:border-slate-300 dark:hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {locale === 'zh-CN' ? tpl.nameZh : tpl.nameEn}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {locale === 'zh-CN' ? tpl.descZh : tpl.descEn}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
