import React, { useState } from 'react';
import { CheckCircle2, Download, FileCode2, Play, ShieldAlert, Upload, X } from 'lucide-react';
import { AlgorithmSceneDSL } from '../../types/algorithmDsl';
import { SceneSchema } from '../../types/algorithmStudio';
import { Locale } from '../../types/workspace';
import { compileDslToScene } from '../../utils/dslInterpreter';
import {
  CUSTOM_DSL_2D_PREFIX_SUM,
  CUSTOM_DSL_KADANE,
  parseDsl,
  serializeDsl,
} from '../../utils/dslSchema';

interface DslEditorModalProps {
  locale: Locale;
  authorName: string;
  initialDsl?: AlgorithmSceneDSL | null;
  onApplyDslScene: (scene: SceneSchema, dsl: AlgorithmSceneDSL, format: 'json' | 'yaml', text: string) => void;
  onClose: () => void;
}

export const DslEditorModal: React.FC<DslEditorModalProps> = ({
  locale,
  authorName,
  initialDsl,
  onApplyDslScene,
  onClose,
}) => {
  const zh = locale === 'zh-CN';
  const [format, setFormat] = useState<'json' | 'yaml'>('yaml');
  const [text, setText] = useState<string>(() =>
    serializeDsl(initialDsl || CUSTOM_DSL_2D_PREFIX_SUM, 'yaml')
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSwitchFormat = (nextFmt: 'json' | 'yaml') => {
    if (nextFmt === format) return;
    const parsed = parseDsl(text, format);
    if (!parsed.ok || !parsed.dsl) {
      setErrors(parsed.errors);
      return;
    }
    setErrors([]);
    setFormat(nextFmt);
    setText(serializeDsl(parsed.dsl, nextFmt));
  };

  const handleValidateOnly = () => {
    const parsed = parseDsl(text, format);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setStatusMsg(null);
    } else {
      setErrors([]);
      setStatusMsg(zh ? 'DSL Schema 与安全检查通过！' : 'DSL schema validated');
    }
  };

  const handleCompileAndRun = () => {
    const parsed = parseDsl(text, format);
    if (!parsed.ok || !parsed.dsl) {
      setErrors(parsed.errors);
      setStatusMsg(null);
      return;
    }
    const res = compileDslToScene(parsed.dsl, authorName);
    if (!res.ok || !res.scene) {
      setErrors([res.error || 'DSL 执行失败']);
      setStatusMsg(null);
      return;
    }
    setErrors([]);
    setStatusMsg(
      zh
        ? `安全执行成功：共 ${res.stats.stepsGenerated} 步，输出 = ${res.actualOutput}`
        : `Executed ${res.stats.stepsGenerated} steps`
    );
    onApplyDslScene(res.scene, parsed.dsl, format, text);
    onClose();
  };

  const handleDownloadDsl = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algorithm-scene.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[86vh] rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101520] text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col overflow-hidden text-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-4 h-4 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold">
                {zh ? 'Algorithm Scene DSL 2.0 编辑器 (JSON / YAML)' : 'Algorithm Scene DSL Editor'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {zh
                  ? '受限 AST 解释器执行：禁用 eval/Function，强制步数/深度/内存/时间上限'
                  : 'Safe restricted AST interpreter (no eval)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded border border-slate-300 dark:border-white/15 overflow-hidden">
              {(['yaml', 'json'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleSwitchFormat(fmt)}
                  className={`px-2.5 py-1 font-mono text-[11px] uppercase cursor-pointer ${
                    format === fmt ? 'bg-blue-600 text-white' : 'hover:bg-white/5'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setText(serializeDsl(CUSTOM_DSL_2D_PREFIX_SUM, format))}
              className="px-2 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 text-[11px] cursor-pointer"
            >
              {zh ? '示例: 二维前缀和' : '2D Prefix Sum'}
            </button>
            <button
              type="button"
              onClick={() => setText(serializeDsl(CUSTOM_DSL_KADANE, format))}
              className="px-2 py-1 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 text-[11px] cursor-pointer"
            >
              {zh ? '示例: Kadane DP' : 'Kadane DP'}
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(errors.length > 0 || statusMsg) && (
          <div className="px-5 py-2 border-b border-white/10 shrink-0">
            {errors.length > 0 && (
              <div className="p-2 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              </div>
            )}
            {statusMsg && (
              <div className="p-2 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="w-full h-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0B0E14] p-3 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <label className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{zh ? '导入 DSL 文件' : 'Import DSL'}</span>
              <input
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  f.text().then((content) => {
                    const fmt = f.name.endsWith('.json') ? 'json' : 'yaml';
                    setFormat(fmt);
                    setText(content);
                  });
                }}
              />
            </label>
            <button
              type="button"
              onClick={handleDownloadDsl}
              className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{zh ? '导出 DSL' : 'Export DSL'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleValidateOnly}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 font-semibold cursor-pointer"
            >
              {zh ? '校验 Schema' : 'Validate'}
            </button>
            <button
              type="button"
              onClick={handleCompileAndRun}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{zh ? '编译并安全执行 DSL 生成画布' : 'Run DSL & Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
