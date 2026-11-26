import React, { useMemo, useRef, useState } from 'react';
import { X, Download, Copy, Check, Loader2 } from 'lucide-react';
import { BlockType, Locale, TemplatePresetId, WorkspaceDocument } from '../types/workspace';
import { getTranslations } from '../constants/i18n';
import { TEMPLATE_PRESETS } from '../constants/carbon';
import { copyNodeImageToClipboard, ExportFormat, exportNodeToImage, PaginationMode } from '../utils/exportImage';
import { CodeEditorBlock } from './CodeEditorBlock';
import { ProblemBlock } from './ProblemBlock';
import { SampleBlock } from './SampleBlock';
import {
  AuthorBlock,
  ComplexityBlock,
  FormulaBlock,
  KeypointsBlock,
  SolutionBlock,
  TeachingBlock,
  TitleBlock,
} from './OtherBlocks';

interface ExportModalProps {
  workspace: WorkspaceDocument;
  locale: Locale;
  onClose: () => void;
  onApplyTemplate: (preset: TemplatePresetId) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  workspace,
  locale,
  onClose,
  onApplyTemplate,
}) => {
  const t = getTranslations(locale);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<1 | 2 | 3 | 4>(2);
  const [transparent, setTransparent] = useState(workspace.canvasStyle.backgroundMode === 'transparent');
  const [widthMode, setWidthMode] = useState<'auto' | '800' | '1080' | '794' | 'custom'>('auto');
  const [customWidth, setCustomWidth] = useState(workspace.canvasStyle.maxWidth || 880);
  const [pagination, setPagination] = useState<PaginationMode>(
    workspace.templatePreset === 'a4-notes' ? 'a4-pages' : 'single'
  );
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>(
    workspace.blocks.filter((b) => b.visible).map((b) => b.id)
  );
  const [exporting, setExporting] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);

  const resolvedWidth = useMemo(() => {
    if (widthMode === 'auto') {
      const preset = TEMPLATE_PRESETS.find((p) => p.id === workspace.templatePreset);
      return preset?.defaultWidth || workspace.canvasStyle.maxWidth || 860;
    }
    if (widthMode === 'custom') return Math.max(480, Math.min(1800, customWidth));
    return Number(widthMode);
  }, [widthMode, customWidth, workspace.templatePreset, workspace.canvasStyle.maxWidth]);

  const toggleBlock = (id: string) => {
    setSelectedBlockIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await exportNodeToImage(previewRef.current, {
        format,
        scale,
        transparent,
        pagination,
        fileName: workspace.titleData.problemCode || workspace.name || 'yanpb-codetransit',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCopyImg = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const ok = await copyNodeImageToClipboard(previewRef.current, scale);
      if (ok) {
        setCopiedImg(true);
        setTimeout(() => setCopiedImg(false), 1800);
      }
    } finally {
      setExporting(false);
    }
  };

  const renderExportBlock = (type: BlockType) => {
    switch (type) {
      case 'title':
        return <TitleBlock data={workspace.titleData} locale={locale} exportMode onChange={() => {}} />;
      case 'problem':
        return <ProblemBlock data={workspace.problemData} locale={locale} exportMode onChange={() => {}} />;
      case 'keypoints':
        return (
          <KeypointsBlock
            data={workspace.keypointsData}
            problemHighlights={workspace.problemData.highlights}
            locale={locale}
            exportMode
            onChange={() => {}}
          />
        );
      case 'code':
        return (
          <CodeEditorBlock
            data={workspace.codeData}
            canvasStyle={workspace.canvasStyle}
            locale={locale}
            exportMode
            onChange={() => {}}
          />
        );
      case 'samples':
        return <SampleBlock data={workspace.samplesData} locale={locale} exportMode onChange={() => {}} />;
      case 'formula':
        return <FormulaBlock data={workspace.formulaData} locale={locale} exportMode onChange={() => {}} />;
      case 'solution':
        return <SolutionBlock data={workspace.solutionData} locale={locale} exportMode onChange={() => {}} />;
      case 'complexity':
        return <ComplexityBlock data={workspace.complexityData} locale={locale} exportMode onChange={() => {}} />;
      case 'teaching':
        return <TeachingBlock data={workspace.teachingData} locale={locale} exportMode onChange={() => {}} />;
      case 'author':
        return <AuthorBlock data={workspace.authorData} locale={locale} exportMode onChange={() => {}} />;
    }
  };

  const activeBlocks = workspace.blocks.filter((b) => selectedBlockIds.includes(b.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#11151E] text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold">{t.exportModal.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
          {/* Left Settings Column */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 p-5 overflow-y-auto space-y-5 text-xs">
            {/* Template Preset */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-200 block">
                {t.exportModal.template}
              </label>
              <select
                value={workspace.templatePreset}
                onChange={(e) => {
                  const nextPreset = e.target.value as TemplatePresetId;
                  onApplyTemplate(nextPreset);
                  if (nextPreset === 'a4-notes') {
                    setWidthMode('794');
                    setPagination('a4-pages');
                  }
                }}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
              >
                {TEMPLATE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {locale === 'zh-CN' ? p.nameZh : p.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Format & Scale */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold block">{t.exportModal.format}</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold block">{t.exportModal.scale}</label>
                <select
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29] tabular-nums"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x (Retina)</option>
                  <option value={3}>3x</option>
                  <option value={4}>4x (Print)</option>
                </select>
              </div>
            </div>

            {/* Width & Pagination */}
            <div className="space-y-1.5">
              <label className="font-semibold block">{t.exportModal.width}</label>
              <div className="flex gap-2">
                <select
                  value={widthMode}
                  onChange={(e) => setWidthMode(e.target.value as typeof widthMode)}
                  className="flex-1 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                >
                  <option value="auto">{locale === 'zh-CN' ? '跟随模板默认宽度' : 'Template Auto'}</option>
                  <option value="800">800px</option>
                  <option value="1080">1080px (Slide / HD)</option>
                  <option value="794">A4 (794px)</option>
                  <option value="custom">{locale === 'zh-CN' ? '自定义宽度' : 'Custom'}</option>
                </select>
                {widthMode === 'custom' && (
                  <input
                    type="number"
                    min={480}
                    max={1800}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="w-24 h-9 px-2 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29] font-mono tabular-nums"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold block">{t.exportModal.pagination}</label>
              <select
                value={pagination}
                onChange={(e) => setPagination(e.target.value as PaginationMode)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
              >
                <option value="single">{t.exportModal.singleImage}</option>
                <option value="a4-pages">{t.exportModal.a4Paginated}</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transparent}
                disabled={format === 'jpeg'}
                onChange={(e) => setTransparent(e.target.checked)}
                className="accent-blue-600"
              />
              <span>{t.exportModal.transparentBg}</span>
            </label>

            {/* Block Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <div className="font-semibold">{t.exportModal.includeBlocks}</div>
              <div className="space-y-1.5">
                {workspace.blocks.map((blk) => (
                  <label key={blk.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBlockIds.includes(blk.id)}
                      onChange={() => toggleBlock(blk.id)}
                      className="accent-blue-600"
                    />
                    <span>{blk.customTitle || t.blocks[blk.type]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
              <button
                type="button"
                disabled={exporting || activeBlocks.length === 0}
                onClick={handleDownload}
                className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{exporting ? t.exportModal.exporting : t.exportModal.downloadNow}</span>
              </button>
              <button
                type="button"
                disabled={exporting || activeBlocks.length === 0}
                onClick={handleCopyImg}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedImg ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedImg ? (locale === 'zh-CN' ? '已复制图片' : 'Copied') : t.exportModal.copyClipboard}</span>
              </button>
            </div>
          </div>

          {/* Right Live Preview Pane */}
          <div className="lg:col-span-8 p-6 overflow-auto bg-checkerboard flex flex-col items-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 self-start">
              {t.exportModal.previewTitle} · {resolvedWidth}px · {scale}x {format.toUpperCase()}
            </div>
            <div
              ref={previewRef}
              style={{
                width: `${resolvedWidth}px`,
                padding: `${workspace.canvasStyle.paddingVertical}px ${workspace.canvasStyle.paddingHorizontal}px`,
                background: transparent ? 'transparent' : workspace.canvasStyle.backgroundValue,
              }}
              className="space-y-4 rounded-xl shrink-0"
            >
              {activeBlocks.map((blk) => (
                <div key={blk.id}>{renderExportBlock(blk.type)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
