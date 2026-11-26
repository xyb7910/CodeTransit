import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  FileCode,
  FileText,
  FlaskConical,
  Lock,
  MessageSquarePlus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import {
  AlgorithmDesignPlan,
  AlgorithmSceneDSL,
  CreationMode,
  ScenePatchBundle,
  StaticAnalysisResult,
} from '../../types/algorithmDsl';
import { SceneSchema, TeachingTier } from '../../types/algorithmStudio';
import { Locale } from '../../types/workspace';
import {
  analyzeCppAndProblemStatic,
  buildLocalDesignPlan,
  UnifiedCreationInput,
} from '../../utils/algorithmAnalyzer';
import { compileDslToScene } from '../../utils/dslInterpreter';
import { validateDslObject } from '../../utils/dslSchema';
import { applySelectedPatches, evaluatePatchLocks } from '../../utils/scenePatch';
import { UserAIConfig } from '../../types/aiConfig';
import { buildAiRequestHeaders, hasConfiguredAiKey } from '../../utils/aiConfig';

interface AICopilotDrawerProps {
  locale: Locale;
  scene: SceneSchema;
  authorName: string;
  aiConfig: UserAIConfig;
  onOpenApiKeyModal: () => void;
  onApplyGeneratedScene: (scene: SceneSchema, dsl?: AlgorithmSceneDSL) => void;
  onApplyPatchScene: (nextScene: SceneSchema, message: string) => void;
  onOpenBuilderWithInput: (analysis: StaticAnalysisResult, input: UnifiedCreationInput) => void;
  onClose: () => void;
}

const MODE_LABELS: Array<{ id: CreationMode; zh: string; en: string }> = [
  { id: 'natural-language', zh: '自然语言描述', en: 'Natural Language' },
  { id: 'cpp-source', zh: 'C++17 源码分析', en: 'C++17 Source' },
  { id: 'markdown-solution', zh: 'Markdown 题解', en: 'Markdown Solution' },
  { id: 'test-samples', zh: '测试样例驱动', en: 'Test Samples' },
  { id: 'custom-rules', zh: '自定义规则设计', en: 'Custom Rules' },
  { id: 'ai-reedit', zh: 'AI 二次修改', en: 'AI Patch Edit' },
];

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  locale,
  scene,
  authorName,
  aiConfig,
  onOpenApiKeyModal,
  onApplyGeneratedScene,
  onApplyPatchScene,
  onOpenBuilderWithInput,
  onClose,
}) => {
  const zh = locale === 'zh-CN';
  const [userConsent, setUserConsent] = useState(false);

  const [mode, setMode] = useState<CreationMode>('natural-language');
  const [teachingTier, setTeachingTier] = useState<TeachingTier>(scene.teaching?.tier || 'CSP-J');
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [cppCode, setCppCode] = useState('');
  const [markdownSolution, setMarkdownSolution] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [formulaLatex, setFormulaLatex] = useState('');

  const [staticAnalysis, setStaticAnalysis] = useState<StaticAnalysisResult | null>(null);
  const [plan, setPlan] = useState<AlgorithmDesignPlan | null>(null);

  const [patchPrompt, setPatchPrompt] = useState('');
  const [patchBundle, setPatchBundle] = useState<ScenePatchBundle | null>(null);
  const [selectedPatchIds, setSelectedPatchIds] = useState<string[]>([]);

  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const keyReady = hasConfiguredAiKey(aiConfig);

  const currentInput: UnifiedCreationInput = {
    mode,
    naturalLanguage,
    cppCode,
    markdownSolution,
    sampleInput,
    sampleOutput,
    formulaLatex,
    teachingTier,
  };

  const handleRunLocalAnalysis = () => {
    setErrorMsg(null);
    const analysis = analyzeCppAndProblemStatic(currentInput);
    const localPlan = buildLocalDesignPlan(currentInput);
    setStaticAnalysis(analysis);
    setPlan(localPlan);
  };

  const handleGenerateAiPlan = async () => {
    setErrorMsg(null);
    if (!keyReady) {
      setErrorMsg(zh ? '请先在前端配置有效的 API Key。' : 'Please provide an API Key first.');
      return;
    }
    if (!userConsent) {
      setErrorMsg(zh ? '请先勾选下方授权声明，确认同意将题目与代码发送至外部 AI 模型。' : 'Consent required before calling external AI.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: buildAiRequestHeaders(aiConfig),
        body: JSON.stringify({ ...currentInput, userConsent: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'AI 规划生成失败');
      }
      const p = data.plan;
      const builtPlan: AlgorithmDesignPlan = {
        id: `ai-plan-${Date.now()}`,
        title: p.title || 'AI 算法设计方案',
        creationMode: mode,
        detectedAlgorithm: p.detectedAlgorithm || '自定义算法',
        confidenceNote: p.confidenceNote || '由 AI 模型生成，需用户审核确认后转换为场景',
        teachingTier,
        teachingStyle: 'deductive',
        recommendedComponents: Array.isArray(p.recommendedComponents) ? p.recommendedComponents : ['array', 'variable-watcher'],
        isStaticAnalysisOnly: mode === 'cpp-source',
        createdAt: Date.now(),
        stages: (p.stages || []).map((st: { key: string; title: string; summary: string; details: string[]; editableText: string }) => ({
          ...st,
          approved: true,
        })),
      };
      setPlan(builtPlan);
      setChatHistory((h) => [
        ...h,
        { role: 'user', text: naturalLanguage || `[${mode}] 请求生成设计方案` },
        { role: 'assistant', text: `已生成「${builtPlan.title}」设计方案（${builtPlan.stages.length} 个阶段），请审核修改后生成场景。` },
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSceneFromPlan = async () => {
    if (!plan) return;
    setErrorMsg(null);
    if (!keyReady) {
      setErrorMsg(zh ? '请先在前端配置有效的 API Key。' : 'Please provide an API Key first.');
      return;
    }
    if (!userConsent) {
      setErrorMsg(zh ? '请先勾选外部 AI 发送授权确认。' : 'Consent required.');
      return;
    }
    setLoading(true);
    try {
      const planSummary = plan.stages
        .filter((s) => s.approved)
        .map((s) => `${s.title}: ${s.editableText}`)
        .join('\n');
      const res = await fetch('/api/ai/generate-scene', {
        method: 'POST',
        headers: buildAiRequestHeaders(aiConfig),
        body: JSON.stringify({
          userConsent: true,
          planSummary,
          naturalLanguage,
          cppCode,
          sampleInput,
          sampleOutput,
          teachingTier,
          teachingStyle: plan.teachingStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'AI 场景生成失败');
      }
      const validated = validateDslObject(data.dsl);
      if (!validated.ok || !validated.dsl) {
        throw new Error(`AI 返回的 DSL 未通过 Schema 校验: ${validated.errors.join('；')}`);
      }
      const compiled = compileDslToScene(validated.dsl, authorName);
      if (!compiled.ok || !compiled.scene) {
        throw new Error(`AI 生成的 DSL 解释执行失败: ${compiled.error}`);
      }
      // Mark explicitly as ai_draft until user verifies & runs manually
      const draftScene: SceneSchema = {
        ...compiled.scene,
        traceMode: 'ai_draft',
        traceSource: 'ai_draft',
      };
      onApplyGeneratedScene(draftScene, validated.dsl);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPatch = async () => {
    setErrorMsg(null);
    if (!patchPrompt.trim()) return;
    if (!keyReady) {
      setErrorMsg(zh ? '请先在前端配置有效的 API Key。' : 'Please provide an API Key first.');
      return;
    }
    if (!userConsent) {
      setErrorMsg(zh ? '请先勾选外部 AI 发送授权确认。' : 'Consent required.');
      return;
    }
    setLoading(true);
    try {
      const board = scene.artboards.find((a) => a.id === scene.activeArtboardId) || scene.artboards[0];
      const res = await fetch('/api/ai/patch-scene', {
        method: 'POST',
        headers: buildAiRequestHeaders(aiConfig),
        body: JSON.stringify({
          userConsent: true,
          prompt: patchPrompt,
          sceneSummary: {
            name: scene.name,
            tier: scene.tier,
            formulaLatex: scene.formulaLatex,
            linkedCode: scene.linkedCode,
            items: (board?.items || []).map((it) => ({
              id: it.id,
              type: it.type,
              name: it.name,
              locked: it.locked,
              x: it.x,
              y: it.y,
            })),
            steps: scene.steps.map((s) => ({
              index: s.index,
              id: s.id,
              title: s.title,
              explanation: s.explanation,
              codeLines: s.codeLines,
            })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'AI 局部修改请求失败');
      }
      const bundle: ScenePatchBundle = {
        id: `bundle-${Date.now()}`,
        prompt: patchPrompt,
        explanation: data.patch.explanation || '局部变更方案已生成',
        ops: data.patch.ops || [],
        createdAt: Date.now(),
      };
      setPatchBundle(bundle);
      const evals = evaluatePatchLocks(scene, bundle);
      setSelectedPatchIds(evals.filter((e) => !e.blockedByLock).map((e) => e.op.id));
      setChatHistory((h) => [
        ...h,
        { role: 'user', text: patchPrompt },
        { role: 'assistant', text: `${bundle.explanation}（共 ${bundle.ops.length} 项局部补丁）` },
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const evaluatedOps = patchBundle ? evaluatePatchLocks(scene, patchBundle) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-[#101520] text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-blue-500" />
            <div>
              <h2 className="text-sm font-bold">
                {zh ? 'AI 算法创作助手 (Studio 2.0)' : 'AI Algorithm Copilot'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {zh
                  ? '输入理解 → 算法识别 → 方案审核 → 受限 DSL / 局部 Patch 生成'
                  : 'Understand → Plan Review → Restricted DSL / Scene Patch'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Service Status & Explicit Privacy Consent */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/25 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {zh
                ? `已接入前端 API Key (${aiConfig.provider === 'gemini' ? 'Gemini' : 'OpenAI 兼容'} · ${aiConfig.model})`
                : `Frontend Key Ready (${aiConfig.provider} · ${aiConfig.model})`}
            </span>
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className="text-blue-500 hover:underline font-medium cursor-pointer"
            >
              {zh ? '修改 / 清除密钥' : 'Edit / Clear Key'}
            </button>
          </div>
          <label className="flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-300 cursor-pointer">
            <input
              type="checkbox"
              checked={userConsent}
              onChange={(e) => setUserConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {zh
                ? '我已知晓并同意：点击外部 AI 生成按钮时，将把当前输入的自然语言描述、题目文本、样例与参考代码通过服务端代理发送至外部 AI 模型服务（AI 生成的轨迹默认标记为「AI 推演草稿」，不会伪装成真实 C++ 运行结果）。'
                : 'I consent to send prompt/code/problem inputs to the configured server-side AI provider.'}
            </span>
          </label>
        </div>

        {/* 6 Creation Mode Selector */}
        <div className="px-5 py-2 border-b border-slate-200 dark:border-white/10 flex flex-wrap gap-1.5 shrink-0">
          {MODE_LABELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setErrorMsg(null);
              }}
              className={`px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer transition-colors ${
                mode === m.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {zh ? m.zh : m.en}
            </button>
          ))}
        </div>

        {/* Main Scroll Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 dark:text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE: AI SECONDARY PATCH EDITING */}
          {mode === 'ai-reedit' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <MessageSquarePlus className="w-4 h-4 text-blue-400" />
                  <span>{zh ? '对当前画布作品进行局部修改（自动保护已锁定组件/步骤）' : 'Conversational Scene Patch'}</span>
                </div>
                <textarea
                  rows={3}
                  value={patchPrompt}
                  onChange={(e) => setPatchPrompt(e.target.value)}
                  placeholder={zh ? '例：把第 2 步讲解改成启发式提问，并补充时间复杂度说明；不要改动锁定的节点...' : 'Describe partial edits...'}
                  className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2.5 py-2"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    {zh ? '支持差异预览、勾选部分应用与撤销重做' : 'Supports diff preview & selective apply'}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRequestPatch}
                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{loading ? (zh ? '生成补丁中...' : 'Generating...') : zh ? '生成局部 Patch 预览' : 'Generate Patch'}</span>
                  </button>
                </div>
              </div>

              {patchBundle && (
                <div className="p-3.5 rounded-lg border border-blue-500/35 bg-blue-500/5 space-y-3">
                  <div className="font-semibold text-blue-400">{patchBundle.explanation}</div>
                  <div className="space-y-2">
                    {evaluatedOps.map(({ op, blockedByLock, lockReason }) => {
                      const checked = selectedPatchIds.includes(op.id);
                      return (
                        <label
                          key={op.id}
                          className={`p-2.5 rounded border flex items-start gap-2.5 ${
                            blockedByLock
                              ? 'border-amber-500/40 bg-amber-500/10 opacity-80'
                              : 'border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B0E14] cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={blockedByLock}
                            checked={checked}
                            onChange={(e) =>
                              setSelectedPatchIds((prev) =>
                                e.target.checked ? [...prev, op.id] : prev.filter((x) => x !== op.id)
                              )
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{op.summary}</span>
                              <span className="font-mono text-[10px] text-slate-400">{op.op}</span>
                            </div>
                            {blockedByLock && (
                              <div className="text-[11px] text-amber-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> {lockReason}
                              </div>
                            )}
                            {(op.beforePreview || op.afterPreview) && (
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                                <div className="p-1.5 rounded bg-rose-500/10 text-rose-300 truncate">
                                  - {op.beforePreview || '(原状态)'}
                                </div>
                                <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-300 truncate">
                                  + {op.afterPreview || '(变更后)'}
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPatchBundle(null)}
                      className="px-3 py-1.5 rounded border border-slate-300 dark:border-white/15 cursor-pointer"
                    >
                      {zh ? '放弃' : 'Discard'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = applySelectedPatches(scene, patchBundle, selectedPatchIds);
                        onApplyPatchScene(
                          res.scene,
                          `已应用 ${res.appliedCount} 项局部修改${res.skippedLockedCount > 0 ? `（跳过 ${res.skippedLockedCount} 项锁定对象）` : ''}`
                        );
                        setPatchBundle(null);
                      }}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {zh ? `应用选中修改 (${selectedPatchIds.length})` : 'Apply Selected'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* MODES 1-5: UNIFIED CREATION INPUT -> PLAN REVIEW -> SCENE */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {zh ? '教学目标层级' : 'Teaching Tier'}
                  </label>
                  <select
                    value={teachingTier}
                    onChange={(e) => setTeachingTier(e.target.value as TeachingTier)}
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2.5 py-1.5"
                  >
                    {(['GESP', 'CSP-J', 'CSP-S', 'NOIP', 'ACM', '省选基础'] as TeachingTier[]).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      const st = analyzeCppAndProblemStatic(currentInput);
                      onOpenBuilderWithInput(st, currentInput);
                      onClose();
                    }}
                    className="w-full py-1.5 px-3 rounded border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{zh ? '转入无代码规则设计器 (Builder)' : 'Open Algorithm Builder'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>{zh ? '自然语言算法需求 / 教学要求' : 'Natural Language Description'}</span>
                </label>
                <textarea
                  rows={3}
                  value={naturalLanguage}
                  onChange={(e) => setNaturalLanguage(e.target.value)}
                  placeholder={zh ? '例：设计一个二维前缀和的算法演示，展示容斥公式如何减去左上角重复区域，并查询 (2,2)~(3,3) 子矩阵和。' : 'Describe algorithm & teaching goals...'}
                  className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2.5 py-2"
                />
              </div>

              {(mode === 'cpp-source' || cppCode.trim().length > 0 || mode === 'natural-language') && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <FileCode className="w-3 h-3 text-emerald-400" />
                    <span>{zh ? 'C++17 源代码（用于静态结构与容器识别）' : 'C++17 Source (Static Analysis)'}</span>
                  </label>
                  <textarea
                    rows={4}
                    value={cppCode}
                    onChange={(e) => setCppCode(e.target.value)}
                    placeholder="for (int i = 1; i <= n; ++i) { ... }"
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2.5 py-2 font-mono text-[11px]"
                  />
                </div>
              )}

              {(mode === 'markdown-solution' || markdownSolution.trim().length > 0) && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>{zh ? 'Markdown 题解文本' : 'Markdown Solution'}</span>
                  </label>
                  <textarea
                    rows={3}
                    value={markdownSolution}
                    onChange={(e) => setMarkdownSolution(e.target.value)}
                    placeholder="## 思路分析 ..."
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2.5 py-2 font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {zh ? '输入测试样例' : 'Sample Input'}
                  </label>
                  <textarea
                    rows={2}
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    placeholder="3 3 / 1 2 3 ..."
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1.5 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {zh ? '期望输出结果（用于自动校验）' : 'Expected Output'}
                  </label>
                  <textarea
                    rows={2}
                    value={sampleOutput}
                    onChange={(e) => setSampleOutput(e.target.value)}
                    placeholder="28"
                    className="w-full rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-2 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunLocalAnalysis}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{zh ? '本地静态分析并生成可审核方案' : 'Local Static Analysis & Plan'}</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerateAiPlan}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>{loading ? (zh ? 'AI 分析规划中...' : 'Planning...') : zh ? '调用 AI 生成设计方案' : 'AI Generate Plan'}</span>
                </button>
              </div>

              {/* Static Analysis Disclaimer */}
              {staticAnalysis && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                  <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{zh ? '静态语义分析报告（非真实 C++ 运行）' : 'Static Analysis Report'}</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    识别范式：<span className="font-semibold text-white">{staticAnalysis.detectedParadigm}</span> · 候选组件：{staticAnalysis.recommendedComponents.join(', ')}
                  </div>
                  <p className="text-[10px] text-slate-400">{staticAnalysis.disclaimer}</p>
                </div>
              )}

              {/* Reviewable Multi-Stage Algorithm Design Plan */}
              {plan && (
                <div className="p-4 rounded-xl border border-blue-500/35 bg-blue-500/5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{plan.title}</div>
                      <div className="text-[11px] text-slate-400">{plan.confidenceNote}</div>
                    </div>
                    <span className="font-mono text-[10px] text-blue-400">{plan.teachingTier}</span>
                  </div>

                  <div className="space-y-2">
                    {plan.stages.map((st, idx) => (
                      <div
                        key={st.key}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0E14] space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={st.approved}
                              onChange={(e) =>
                                setPlan((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        stages: prev.stages.map((x, i) =>
                                          i === idx ? { ...x, approved: e.target.checked } : x
                                        ),
                                      }
                                    : prev
                                )
                              }
                            />
                            <span>{st.title}</span>
                          </label>
                          <span className="text-[10px] text-slate-400">{st.summary}</span>
                        </div>
                        <input
                          type="text"
                          value={st.editableText}
                          onChange={(e) =>
                            setPlan((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    stages: prev.stages.map((x, i) =>
                                      i === idx ? { ...x, editableText: e.target.value } : x
                                    ),
                                  }
                                : prev
                            )
                          }
                          className="w-full rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-2 py-1 font-mono text-[11px]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const st = analyzeCppAndProblemStatic(currentInput);
                        onOpenBuilderWithInput(st, currentInput);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{zh ? '在自定义规则器中完善并执行' : 'Refine in Builder'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGenerateSceneFromPlan}
                      className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {loading
                          ? zh ? '正在转换为可视化场景...' : 'Generating Scene...'
                          : zh ? '确认方案并调用 AI 生成画布草稿' : 'Approve & Generate Draft Scene'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversation History */}
          {chatHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{zh ? 'AI 对话历史' : 'Conversation History'}</span>
                <button
                  type="button"
                  onClick={() => setChatHistory([])}
                  className="hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> {zh ? '清空' : 'Clear'}
                </button>
              </div>
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded text-[11px] ${
                    msg.role === 'user'
                      ? 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-200'
                  }`}
                >
                  <span className="font-mono font-bold mr-1.5">
                    {msg.role === 'user' ? 'YOU:' : 'AI:'}
                  </span>
                  {msg.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
