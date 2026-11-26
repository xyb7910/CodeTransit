import React, { useState } from 'react';
import { AlertTriangle, Download, Loader2, X } from 'lucide-react';
import { SceneSchema } from '../../types/algorithmStudio';
import { Locale } from '../../types/workspace';
import {
  STUDIO_EXPORT_TEMPLATES,
  StudioExportConfig,
  StudioExportFormat,
  StudioExportTarget,
  StudioTemplatePreset,
  exportStudioAnimatedGif,
  exportStudioSingleNode,
  generateInteractiveStepHtml,
} from '../../utils/studioExport';

interface StudioExportModalProps {
  locale: Locale;
  scene: SceneSchema;
  hasSelectedComponent: boolean;
  onSelectStepAndWait: (index: number) => Promise<void>;
  onSelectArtboardAndWait?: (artboardId: string) => Promise<void>;
  getCaptureNode: (target: StudioExportTarget) => HTMLElement | null;
  onClose: () => void;
}

export const StudioExportModal: React.FC<StudioExportModalProps> = ({
  locale,
  scene,
  hasSelectedComponent,
  onSelectStepAndWait,
  onSelectArtboardAndWait,
  getCaptureNode,
  onClose,
}) => {
  const zh = locale === 'zh-CN';
  const [target, setTarget] = useState<StudioExportTarget>('artboard');
  const [format, setFormat] = useState<StudioExportFormat>('png');
  const [template, setTemplate] = useState<StudioTemplatePreset>('carbon-classic');
  const [scale, setScale] = useState<1 | 2 | 3 | 4>(2);
  const [transparent, setTransparent] = useState(false);
  const [includeAuthor, setIncludeAuthor] = useState(scene.author.enabled);
  const [selectedStepIndices, setSelectedStepIndices] = useState<number[]>(() =>
    scene.steps.slice(0, Math.min(8, scene.steps.length)).map((_, i) => i)
  );
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeBoard =
    scene.artboards.find((a) => a.id === scene.activeArtboardId) || scene.artboards[0];
  const isOversized =
    activeBoard && (activeBoard.width * scale > 4800 || activeBoard.height * scale > 4800);

  const toggleStepIdx = (idx: number) => {
    setSelectedStepIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  };

  const handleExport = async () => {
    setErrorMsg(null);
    setExporting(true);
    try {
      const baseName = `${scene.templateId || 'yanpb-algo'}-studio`;
      const config: StudioExportConfig = {
        target,
        format,
        template,
        scale,
        transparent,
        includeAuthor,
        selectedStepIndices,
        fileName: baseName,
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}.json`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      }

      if (format === 'html') {
        const html = generateInteractiveStepHtml(scene, includeAuthor);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}.html`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
        return;
      }

      if (format === 'gif') {
        const indices =
          target === 'allSteps'
            ? scene.steps.map((_, i) => i)
            : selectedStepIndices.length > 0
            ? selectedStepIndices
            : [scene.currentStepIndex];
        await exportStudioAnimatedGif(
          indices,
          onSelectStepAndWait,
          () => getCaptureNode('artboard'),
          650,
          baseName
        );
        onClose();
        return;
      }

      if (target === 'allArtboards' && onSelectArtboardAndWait) {
        const prevBoardId = scene.activeArtboardId;
        for (let i = 0; i < scene.artboards.length; i++) {
          const ab = scene.artboards[i];
          await onSelectArtboardAndWait(ab.id);
          const node = getCaptureNode('artboard');
          if (node) {
            await exportStudioSingleNode(node, {
              ...config,
              fileName: `${baseName}-board-${i + 1}`,
            });
          }
        }
        await onSelectArtboardAndWait(prevBoardId);
        onClose();
        return;
      }

      if (target === 'selectedSteps' || target === 'allSteps') {
        const indices =
          target === 'allSteps' ? scene.steps.map((_, i) => i) : selectedStepIndices;
        for (const idx of indices) {
          await onSelectStepAndWait(idx);
          const node = getCaptureNode('artboard');
          if (node) {
            await exportStudioSingleNode(node, {
              ...config,
              fileName: `${baseName}-step-${idx + 1}`,
            });
          }
        }
        onClose();
        return;
      }

      const node = getCaptureNode(target);
      if (!node) {
        setErrorMsg(zh ? '未找到可导出的目标画布或组件' : 'Export target node not found');
        return;
      }
      await exportStudioSingleNode(node, config);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#121722] text-xs shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">{zh ? 'Algorithm Studio 多媒体导出' : 'Algorithm Studio Export'}</h3>
            <p className="text-[11px] text-slate-400">
              {zh
                ? '独立于视口缩放，自动剥离选框、手柄、标尺与网格，确保讲义级高清输出。'
                : 'Zoom-independent capture with automatic stripping of selection handles and guides.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {isOversized && format !== 'a4-print' && format !== 'svg' && format !== 'json' && (
            <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  {zh
                    ? `当前画板导出像素 (${activeBoard.width * scale}×${activeBoard.height * scale}) 较大，建议降倍率或切换 A4 分页。`
                    : `Large export pixel size (${activeBoard.width * scale}x${activeBoard.height * scale}).`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFormat('a4-print')}
                className="px-2 py-1 rounded bg-amber-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
              >
                {zh ? '切换 A4 分页' : 'A4 Paginate'}
              </button>
            </div>
          )}

          {/* Export Target */}
          <div>
            <label className="block font-semibold mb-1.5">{zh ? '导出范围' : 'Target Scope'}</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(
                [
                  ['artboard', zh ? '当前画板' : 'Artboard'],
                  ['allArtboards', zh ? '全部画板' : 'All Boards'],
                  ['currentStep', zh ? '当前步骤' : 'Current Step'],
                  ['selectedComponent', zh ? '选中组件' : 'Component'],
                  ['selectedSteps', zh ? '多选步骤' : 'Sel Steps'],
                  ['allSteps', zh ? '全部步骤' : 'All Steps'],
                ] as Array<[StudioExportTarget, string]>
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  disabled={
                    (id === 'selectedComponent' && !hasSelectedComponent) ||
                    (id === 'allArtboards' && !onSelectArtboardAndWait)
                  }
                  onClick={() => setTarget(id)}
                  className={`px-2 py-1.5 rounded border text-center cursor-pointer disabled:opacity-40 ${
                    target === id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 dark:border-white/15 hover:bg-white/5'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="block font-semibold mb-1.5">{zh ? '导出格式' : 'Format'}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  ['png', 'PNG'],
                  ['svg', 'SVG'],
                  ['jpeg', 'JPEG'],
                  ['webp', 'WebP'],
                  ['gif', 'GIF 动图'],
                  ['html', '交互 HTML'],
                  ['json', 'Scene JSON'],
                  ['a4-print', 'A4 排版分页'],
                ] as Array<[StudioExportFormat, string]>
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormat(id)}
                  className={`px-2 py-1.5 rounded border font-mono cursor-pointer ${
                    format === id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 dark:border-white/15 hover:bg-white/5'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Template Style */}
          <div>
            <label className="block font-semibold mb-1.5">{zh ? '画布主题模板' : 'Template Style'}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STUDIO_EXPORT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplate(tpl.id)}
                  className={`px-2.5 py-2 rounded border text-left cursor-pointer ${
                    template === tpl.id
                      ? 'border-blue-500 bg-blue-500/10 font-semibold'
                      : 'border-slate-300 dark:border-white/15'
                  }`}
                >
                  {zh ? tpl.nameZh : tpl.nameEn}
                </button>
              ))}
            </div>
          </div>

          {/* Scale & Options */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{zh ? '导出倍率' : 'Scale'}</span>
              {([1, 2, 3, 4] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`px-2 py-1 rounded border font-mono cursor-pointer ${
                    scale === s ? 'bg-blue-600 text-white border-blue-600' : 'border-white/15'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                />
                <span>{zh ? '透明背景' : 'Transparent'}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAuthor}
                  onChange={(e) => setIncludeAuthor(e.target.checked)}
                />
                <span>{zh ? `署名 ${scene.author.name}` : `Author ${scene.author.name}`}</span>
              </label>
            </div>
          </div>

          {/* Step Multi-Selection for GIF / Batch */}
          {(target === 'selectedSteps' || format === 'gif') && scene.steps.length > 0 && (
            <div>
              <label className="block font-semibold mb-1.5">
                {zh ? '选择包含的步骤帧' : 'Select Step Frames'}
              </label>
              <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded border border-white/10 bg-black/20">
                {scene.steps.map((st, i) => {
                  const picked = selectedStepIndices.includes(i);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleStepIdx(i)}
                      className={`px-2 py-1 rounded border font-mono text-[11px] cursor-pointer ${
                        picked
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-white/15 text-slate-400'
                      }`}
                    >
                      #{i + 1} {st.title.slice(0, 10)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 cursor-pointer"
          >
            {zh ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport()}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{exporting ? (zh ? '正在渲染导出...' : 'Exporting...') : zh ? '立即导出' : 'Export Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
