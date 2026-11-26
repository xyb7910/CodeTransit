import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check } from 'lucide-react';
import type { Locale } from '../types/workspace';
import type { StudioMode } from '../types/algorithmStudio';

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
  activeMode: StudioMode;
  hasAiKey: boolean;
  suspended: boolean;
  onSwitchMode: (mode: StudioMode) => void;
  onDismiss: () => void;
}

const MARGIN = 12;
const GAP = 14;

export function WorkspaceGuide({ locale, activeMode, hasAiKey, suspended, onSwitchMode, onDismiss }: WorkspaceGuideProps) {
  const zh = locale === 'zh-CN';
  const [index, setIndex] = useState(activeMode === 'algorithm' ? 3 : 0);
  const [usingSidebarToggle, setUsingSidebarToggle] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const spotlight = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = [
    {
      target: 'code-templates',
      mode: 'code',
      title: zh ? '选择代码版式' : 'Pick a code layout',
      description: zh ? '打开「画布模板」，选择一个代码卡片版式，再把代码粘贴到编辑器。'
        : 'Open the highlighted layout button, choose a template, then paste your code into the editor.',
    },
    {
      target: 'add-block',
      mode: 'code',
      title: zh ? '添加画布模块' : 'Add canvas blocks',
      description: zh ? '打开「添加模块」，给代码卡片补充题面、样例或公式。'
        : 'Open Add Block to include a problem statement, test cases, or a formula.',
    },
    {
      target: 'studio-algorithm',
      title: zh ? '切换到算法工作室' : 'Switch to Algorithm Studio',
      description: zh ? '点击高亮的 Algorithm Studio 标签，进入算法推演画布。'
        : 'Select the highlighted Algorithm Studio tab to open the visualization canvas.',
    },
    {
      target: 'algorithm-templates',
      mode: 'algorithm',
      title: zh ? '从模板开始推演' : 'Run an algorithm from a template',
      description: usingSidebarToggle
        ? zh ? '点击高亮的按钮展开左侧栏，再进入「模板」选择算法。'
          : 'Open the highlighted sidebar, then choose an algorithm under Algos.'
        : zh ? '在左侧「模板」中选择一个算法，再用底部时间轴播放或逐步查看。'
          : 'Choose an algorithm under Algos, then play or step through it using the timeline.',
    },
    {
      target: 'api-key',
      title: zh ? '按需配置 AI 模型' : 'Set up an AI model if needed',
      description: hasAiKey
        ? zh ? '已有启用的模型。点击「API Key」可以添加或切换配置。'
          : 'A model is active. Open API Key to add or switch configurations.'
        : zh ? '此步可选。点击「API Key」添加密钥，即可在算法工作室使用 AI 创作。'
          : 'This step is optional. Add a key to use AI creation in Algorithm Studio.',
    },
    {
      target: activeMode === 'algorithm' ? 'algorithm-transit' : 'code-transit',
      title: zh ? '用提取码分享' : 'Share with a pickup code',
      description: activeMode === 'algorithm'
        ? zh ? '点击「中转分享」，为当前算法场景生成六位提取码。'
          : 'Use Share to create a six-digit pickup code for the current algorithm scene.'
        : zh ? '点击「中转」，为当前代码工作区生成六位提取码。'
          : 'Use Transit to create a six-digit pickup code for the current code workspace.',
    },
    {
      target: 'export',
      title: zh ? '导出你的作品' : 'Export your work',
      description: zh ? '点击「导出」查看当前工作室支持的下载格式。'
        : 'Open Export to see the download formats available in the current studio.',
    },
  ] satisfies Array<{ target: string; mode?: StudioMode; title: string; description: string }>;
  const step = steps[index];
  const wrongStudio = step.mode && step.mode !== activeMode;
  const targetId = wrongStudio ? `studio-${step.mode}` : step.target;
  const last = index === steps.length - 1;
  const control = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

  useLayoutEffect(() => {
    if (suspended || !panel.current || !spotlight.current || !content.current) return;
    const card = panel.current;
    const body = content.current;
    const ring = spotlight.current;
    const header = document.querySelector('header');
    let target: HTMLElement | null = null;
    let frame = 0;
    let describedBy: string | null = null;

    function position() {
      frame = 0;
      const width = document.documentElement.clientWidth;
      const height = document.documentElement.clientHeight;
      const rect = target?.getBoundingClientRect();
      const headerBottom = header?.contains(target) ? 0 : header?.getBoundingClientRect().bottom ?? 0;
      const visible = rect && rect.width > 0 && rect.height > 0 &&
        rect.bottom > headerBottom && rect.top < height && rect.right > 0 && rect.left < width;
      ring.hidden = !visible;

      if (!visible || !rect) {
        card.style.maxHeight = `${height - MARGIN * 2}px`;
        card.style.left = `${Math.max(MARGIN, width - card.offsetWidth - MARGIN)}px`;
        card.style.top = `${Math.max(MARGIN, height - card.offsetHeight - MARGIN)}px`;
        card.dataset.side = 'detached';
        return;
      }

      const left = Math.max(0, rect.left);
      const right = Math.min(width, rect.right);
      const top = Math.max(rect.top, headerBottom);
      const bottom = Math.min(height, rect.bottom);
      Object.assign(ring.style, {
        left: `${left - 3}px`, top: `${top - 3}px`,
        width: `${right - left + 6}px`, height: `${bottom - top + 6}px`,
      });

      const center = (left + right) / 2;
      const cardWidth = card.offsetWidth;
      const above = top - GAP - MARGIN;
      const below = height - bottom - GAP - MARGIN;
      const expanded = target?.getAttribute('aria-expanded') === 'true';
      const roomRight = width - right - GAP - MARGIN >= cardWidth;
      const roomLeft = left - GAP - MARGIN >= cardWidth;
      if (expanded && (roomRight || roomLeft)) {
        card.style.maxHeight = `${height - MARGIN * 2}px`;
        const middle = (top + bottom) / 2;
        const cardTop = Math.max(MARGIN, Math.min(middle - card.offsetHeight / 2, height - card.offsetHeight - MARGIN));
        card.style.left = `${roomRight ? right + GAP : left - GAP - cardWidth}px`;
        card.style.top = `${cardTop}px`;
        card.style.setProperty('--guide-tip-y', `${middle - cardTop}px`);
        card.dataset.side = roomRight ? 'right' : 'left';
        return;
      }

      const cardLeft = Math.max(MARGIN, Math.min(center - cardWidth / 2, width - cardWidth - MARGIN));
      const placeAbove = (expanded && above >= 140) || (below < body.scrollHeight + 2 && above > below);
      card.style.left = `${cardLeft}px`;
      card.style.maxHeight = `${Math.max(0, placeAbove ? above : below)}px`;
      card.style.top = `${placeAbove ? top - GAP - card.offsetHeight : bottom + GAP}px`;
      card.style.setProperty('--guide-tip-x', `${Math.max(13, Math.min(center - cardLeft, cardWidth - 13))}px`);
      card.dataset.side = placeAbove ? 'above' : 'below';
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(position);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(card);
    if (header) resize.observe(header);

    const advanceOnStudioClick = () => setIndex(3);

    function disconnectTarget() {
      if (!target) return;
      resize.unobserve(target);
      target.removeEventListener('click', advanceOnStudioClick);
      if (describedBy === null) target.removeAttribute('aria-describedby');
      else target.setAttribute('aria-describedby', describedBy);
    }

    function connectTarget() {
      const primary = document.querySelector<HTMLElement>(`[data-guide-target="${targetId}"]`);
      const next = primary ?? (targetId === 'algorithm-templates'
        ? document.querySelector<HTMLElement>('[data-guide-target="algorithm-sidebar"]')
        : null);
      if (next === target) return;
      disconnectTarget();
      target = next;
      setUsingSidebarToggle(Boolean(next && !primary));
      if (target) {
        describedBy = target.getAttribute('aria-describedby');
        target.setAttribute('aria-describedby', [describedBy, 'workspace-guide-description'].filter(Boolean).join(' '));
        if (targetId === 'studio-algorithm' && index === 2) target.addEventListener('click', advanceOnStudioClick);
        const rect = target.getBoundingClientRect();
        const headerBottom = header?.contains(target) ? 0 : header?.getBoundingClientRect().bottom ?? 0;
        if (rect.top < headerBottom || rect.bottom > document.documentElement.clientHeight) {
          target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        }
        resize.observe(target);
      }
    }

    connectTarget();
    position();
    const observer = new MutationObserver(() => {
      connectTarget();
      schedule();
    });
    const root = document.getElementById('root');
    if (root) observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      disconnectTarget();
      resize.disconnect();
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [targetId, index, suspended]);

  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [index]);

  function goTo(next: number) {
    const mode = steps[next].mode;
    if (mode && mode !== activeMode) onSwitchMode(mode);
    setIndex(next);
  }

  if (suspended) return <span id="workspace-guide" hidden />;

  return createPortal(
    <>
      <div ref={spotlight} hidden aria-hidden="true" className="pointer-events-none fixed z-[41] rounded-lg border-2 border-blue-600 dark:border-sky-400" />
      <section
        ref={panel}
        id="workspace-guide"
        role="dialog"
        aria-labelledby="workspace-guide-title"
        aria-describedby="workspace-guide-description"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onDismiss();
          }
        }}
        className="fixed z-[42] w-[min(22rem,calc(100%_-_24px))] rounded-xl border border-blue-300 bg-white text-slate-900 shadow-xl dark:border-sky-500/60 dark:bg-[#141D2E] dark:text-slate-100"
      >
        <span aria-hidden="true" className="workspace-guide-arrow" />
        <div ref={content} className="max-h-[inherit] overflow-y-auto rounded-[inherit] px-3 pb-3 sm:px-4">
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-sky-300">
              <BookOpen aria-hidden="true" className="size-3.5" />
              {zh ? `使用指引 · ${index + 1}/${steps.length}` : `Quick tour · ${index + 1}/${steps.length}`}
            </span>
            <button type="button" onClick={onDismiss} className={control + ' text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'}>
              {zh ? '跳过指引' : 'Skip tour'}
            </button>
          </div>
          <div role="progressbar" aria-valuenow={index + 1} aria-valuemin={0} aria-valuemax={steps.length}
            aria-label={zh ? '引导进度' : 'Tour progress'} className="h-1 rounded-full bg-blue-100 dark:bg-slate-700">
            <div className="h-full rounded-full bg-blue-600 dark:bg-sky-400" style={{ width: `${(index + 1) / steps.length * 100}%` }} />
          </div>
          <h2 ref={heading} id="workspace-guide-title" tabIndex={-1} className="mt-3 text-base font-semibold outline-none">
            {step.title}
          </h2>
          <p id="workspace-guide-description" className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {wrongStudio
              ? zh ? '点击高亮的工作室标签，进入对应的画布。' : 'Select the highlighted studio tab to open its workspace.'
              : step.description}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            {index > 0 && (
              <button type="button" onClick={() => goTo(index - 1)} className={control + ' border border-slate-300 hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10'}>
                <ArrowLeft aria-hidden="true" className="size-4" />{zh ? '上一步' : 'Back'}
              </button>
            )}
            <button type="button" onClick={() => last ? onDismiss() : goTo(index + 1)}
              className={control + ' ml-auto bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700'}>
              {last ? (zh ? '完成指引' : 'Finish tour') : (zh ? '下一步' : 'Next')}
              {last ? <Check aria-hidden="true" className="size-4" /> : <ArrowRight aria-hidden="true" className="size-4" />}
            </button>
          </div>
        </div>
      </section>
    </>,
    document.body,
  );
}
