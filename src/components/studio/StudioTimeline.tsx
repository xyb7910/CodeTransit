import React from 'react';
import {
  Copy,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { AlgoStep, TraceSourceMode } from '../../types/algorithmStudio';
import { Locale } from '../../types/workspace';

interface StudioTimelineProps {
  locale: Locale;
  steps: AlgoStep[];
  currentIndex: number;
  playing: boolean;
  speed: number;
  traceMode: TraceSourceMode;
  hasAiKey?: boolean;
  onSelectStep: (index: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onModeChange: (mode: TraceSourceMode) => void;
  onInsertKeyframe: () => void;
  onDuplicateKeyframe: (index: number) => void;
  onDeleteKeyframe: (index: number) => void;
  onUpdateStepMeta: (index: number, patch: Partial<AlgoStep>) => void;
  onBatchSetDuration: (ms: number) => void;
}

export const StudioTimeline: React.FC<StudioTimelineProps> = ({
  locale,
  steps,
  currentIndex,
  playing,
  speed,
  traceMode,
  hasAiKey = false,
  onSelectStep,
  onTogglePlay,
  onSpeedChange,
  onModeChange,
  onInsertKeyframe,
  onDuplicateKeyframe,
  onDeleteKeyframe,
  onUpdateStepMeta,
  onBatchSetDuration,
}) => {
  const zh = locale === 'zh-CN';
  const cur = steps[currentIndex] || null;

  return (
    <section className="h-full flex flex-col border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F141E] text-xs select-none">
      {/* Transport Controls */}
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title={zh ? '重置到第 1 步' : 'Reset'}
            onClick={() => onSelectStep(0)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title={zh ? '上一步' : 'Step Back'}
            onClick={() => onSelectStep(Math.max(0, currentIndex - 1))}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{playing ? (zh ? '暂停' : 'Pause') : zh ? '播放' : 'Play'}</span>
          </button>
          <button
            type="button"
            title={zh ? '下一步' : 'Step Forward'}
            onClick={() => onSelectStep(Math.min(steps.length - 1, currentIndex + 1))}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="ml-2 font-mono text-[11px] text-slate-400 tabular-nums">
            {steps.length === 0 ? '0 / 0' : `${currentIndex + 1} / ${steps.length}`}
          </span>

          <select
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="ml-2 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-1.5 py-0.5 font-mono text-[11px]"
          >
            {[0.25, 0.5, 1, 1.5, 2, 4].map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>

          <select
            value={traceMode}
            onChange={(e) => onModeChange(e.target.value as TraceSourceMode)}
            className="rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-0.5 text-[11px]"
          >
            <option value="builtin">{zh ? '内置真实推演' : 'Built-in Trace'}</option>
            <option value="dsl">{zh ? 'DSL 规则执行' : 'DSL Rules'}</option>
            <option value="manual">{zh ? '手动关键帧动画' : 'Manual Keyframes'}</option>
            <option value="external">{zh ? '外部 Trace 导入' : 'External Trace'}</option>
            {(hasAiKey || traceMode === 'ai_draft') && (
              <option value="ai_draft">{zh ? 'AI 推演草稿' : 'AI Draft'}</option>
            )}
          </select>
        </div>

        {/* Keyframe Tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onInsertKeyframe}
            className="px-2 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-blue-400" />
            <span>{zh ? '插入关键帧' : 'Add Keyframe'}</span>
          </button>
          {cur && (
            <>
              <button
                type="button"
                onClick={() => onDuplicateKeyframe(currentIndex)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{zh ? '复制帧' : 'Duplicate'}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteKeyframe(currentIndex)}
                disabled={steps.length <= 1}
                className="px-2 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-rose-500/15 text-rose-400 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>{zh ? '删帧' : 'Delete'}</span>
              </button>
              <button
                type="button"
                onClick={() => onBatchSetDuration(cur.durationMs)}
                title={zh ? '将当前帧时长批量应用到所有步骤' : 'Apply duration to all steps'}
                className="px-2 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 text-[11px] text-slate-300 cursor-pointer"
              >
                {zh ? '统一时长' : 'Batch ms'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Step Scrubber & Keyframe Strip */}
      <div className="px-3 py-2 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
        {/* Horizontal Timeline Track */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {steps.map((st, idx) => {
            const active = idx === currentIndex;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectStep(idx)}
                className={`px-2.5 py-1.5 rounded-md border text-left shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums">
                  <span className="font-bold text-blue-400">#{idx + 1}</span>
                  <span>{st.durationMs}ms</span>
                </div>
                <div className="text-[11px] font-medium max-w-[140px] truncate">{st.title}</div>
              </button>
            );
          })}
        </div>

        {/* Active Keyframe Narration & Duration Editor */}
        {cur && (
          <div className="grid grid-cols-12 gap-2 items-center shrink-0">
            <input
              type="text"
              value={cur.title}
              onChange={(e) => onUpdateStepMeta(currentIndex, { title: e.target.value })}
              placeholder={zh ? '步骤标题' : 'Step title'}
              className="col-span-3 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 text-[11px] font-semibold"
            />
            <input
              type="text"
              value={cur.explanation}
              onChange={(e) => onUpdateStepMeta(currentIndex, { explanation: e.target.value })}
              placeholder={zh ? '当前步骤算法讲解文案...' : 'Step explanation...'}
              className="col-span-6 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 text-[11px]"
            />
            <div className="col-span-3 flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 shrink-0">{zh ? '时长(ms)' : 'ms'}</span>
              <input
                type="number"
                min={150}
                step={100}
                value={cur.durationMs}
                onChange={(e) =>
                  onUpdateStepMeta(currentIndex, { durationMs: Math.max(150, Number(e.target.value)) })
                }
                className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1 font-mono text-[11px] tabular-nums"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
