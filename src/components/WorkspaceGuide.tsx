import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Code2, Cpu, KeyRound, Share2 } from 'lucide-react';
import type { Locale } from '../types/workspace';

const GUIDE_DISMISSED = 'codetransit_workspace_guide_dismissed';

export function shouldShowWorkspaceGuide(): boolean {
  try {
    return localStorage.getItem(GUIDE_DISMISSED) !== '1';
  } catch {
    return true;
  }
}

export function dismissWorkspaceGuide(): void {
  try {
    localStorage.setItem(GUIDE_DISMISSED, '1');
  } catch {
    // The guide can still be dismissed for this visit.
  }
}

interface WorkspaceGuideProps {
  locale: Locale;
  activeMode: 'code' | 'algorithm';
  hasAiKey: boolean;
  onOpenCodeTemplates: () => void;
  onOpenAlgorithm: () => void;
  onOpenApiKey: () => void;
  onOpenExport: () => void;
  onOpenTransit: () => void;
  onDismiss: () => void;
}

export function WorkspaceGuide({
  locale, activeMode, hasAiKey, onOpenCodeTemplates, onOpenAlgorithm,
  onOpenApiKey, onOpenExport, onOpenTransit, onDismiss,
}: WorkspaceGuideProps) {
  const zh = locale === 'zh-CN';
  const [index, setIndex] = useState(0);
  const section = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = [
    {
      icon: Code2,
      label: zh ? '编辑代码' : 'Edit code',
      title: zh ? '从一张代码卡片开始' : 'Start with a code card',
      description: zh
        ? '在 Code Studio 选择一个版式，把代码粘贴到编辑器。需要题面、公式或对拍样例时，用工具栏的「添加模块」。'
        : 'Pick a layout in Code Studio and paste code into the editor. Use Add Block to include a problem statement, formula, or test cases.',
      actions: [{ label: zh ? '查看代码版式' : 'Browse code layouts', run: onOpenCodeTemplates }],
    },
    {
      icon: Cpu,
      label: zh ? '推演算法' : 'Trace an algorithm',
      title: zh ? '用模板生成算法推演' : 'Generate a trace from a template',
      description: zh
        ? '打开 Algorithm Studio，在左侧「模板」选择一个算法，再用底部时间轴播放或逐步查看。也可以从「规则设计器」或「DSL」创建自己的场景。'
        : 'Open Algorithm Studio, pick an algorithm under Algos, then play or step through the trace from the timeline. Use Builder or DSL to create a custom scene.',
      actions: [{ label: zh ? '打开算法工作室' : 'Open Algorithm Studio', run: onOpenAlgorithm }],
    },
    {
      icon: KeyRound,
      label: zh ? '配置模型' : 'Set up a model',
      title: zh ? '按需启用 AI 创作' : 'Enable AI creation if needed',
      description: hasAiKey
        ? zh ? '已有启用的模型。可以直接在 Algorithm Studio 打开「AI 创作」，也可以在设置中添加或切换 API Key。'
          : 'A model is active. Open AI Creation in Algorithm Studio, or add and switch API keys in settings.'
        : zh ? '这一步可选。添加 Gemini 或 OpenAI 兼容接口的 API Key 后，即可在 Algorithm Studio 使用「AI 创作」。'
          : 'This step is optional. Add a Gemini or OpenAI-compatible API key to use AI Creation in Algorithm Studio.',
      actions: [{ label: hasAiKey ? (zh ? '管理 API Key' : 'Manage API keys') : (zh ? '配置 API Key' : 'Set up an API key'), run: onOpenApiKey }],
    },
    {
      icon: Share2,
      label: zh ? '导出分享' : 'Export and share',
      title: zh ? '导出作品，或用提取码在另一台设备打开' : 'Export your work or open it on another device',
      description: activeMode === 'algorithm'
        ? zh ? '选择「导出」下载当前场景，或点击算法工作室工具栏的「中转分享」生成六位提取码。'
          : 'Select Export to download the scene, or use Share in the Algorithm Studio toolbar to get a six-digit pickup code.'
        : zh ? '选择「导出」下载作品，或打开「中转」为代码工作区生成六位提取码。'
          : 'Select Export to download your work, or open Transit to get a six-digit pickup code for the code workspace.',
      actions: [
        { label: zh ? '打开导出' : 'Open Export', run: onOpenExport },
        ...(activeMode === 'code' ? [{ label: zh ? '打开中转' : 'Open Transit', run: onOpenTransit }] : []),
      ],
    },
  ];
  const step = steps[index];
  const Icon = step.icon;
  const last = index === steps.length - 1;
  const control = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

  useEffect(() => {
    section.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  function goTo(next: number) {
    setIndex(next);
    heading.current?.focus({ preventScroll: true });
  }

  return (
    <section ref={section} id="workspace-guide" aria-labelledby="workspace-guide-title" onKeyDown={(event) => {
      if (event.key === 'Escape') onDismiss();
    }} className="mx-auto w-full max-w-[1440px] scroll-mt-28 px-3 py-3 sm:px-6">
      <div className="rounded-xl border border-blue-200 bg-white p-4 dark:border-blue-500/30 dark:bg-[#121722] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <h2 id="workspace-guide-title" className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen aria-hidden="true" className="size-4 text-blue-600 dark:text-blue-400" />
            {zh ? '使用指引' : 'Getting started'}
          </h2>
          <button type="button" onClick={onDismiss} className={control + ' text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'}>
            {zh ? '跳过指引' : 'Skip guide'}
          </button>
        </div>
        <ol className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={zh ? '引导步骤' : 'Guide steps'}>
          {steps.map(({ label }, i) => (
            <li key={label} aria-current={i === index ? 'step' : undefined}
              className={'rounded-lg px-2 py-1.5 text-sm ' + (i === index
                ? 'bg-blue-100 font-semibold text-blue-900 dark:bg-blue-500/20 dark:text-blue-200'
                : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300')}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h3 ref={heading} tabIndex={-1} aria-live="polite" className="flex items-start gap-2 rounded-sm text-base font-semibold">
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
              {step.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{step.description}</p>
            <div className="mt-1 flex flex-wrap gap-x-2">
              {step.actions.map(({ label, run }) => (
                <button key={label} type="button" onClick={run} className={control + ' text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10'}>
                  {label} <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {index > 0 && (
              <button type="button" onClick={() => goTo(index - 1)} className={control + ' border border-slate-300 hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10'}>
                <ArrowLeft aria-hidden="true" className="size-4" /> {zh ? '上一步' : 'Back'}
              </button>
            )}
            <button type="button" onClick={() => last ? onDismiss() : goTo(index + 1)}
              className={control + ' bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700'}>
              {last ? (zh ? '完成指引' : 'Finish guide') : (zh ? '下一步' : 'Next')}
              {last ? <Check aria-hidden="true" className="size-4" /> : <ArrowRight aria-hidden="true" className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
