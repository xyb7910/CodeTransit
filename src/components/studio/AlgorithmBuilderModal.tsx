import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Play,
  Plus,
  Save,
  Trash2,
  Workflow,
  X,
} from 'lucide-react';
import {
  AlgorithmSceneDSL,
  CustomAlgorithmRecord,
  DslStatement,
  SemanticComponentKind,
} from '../../types/algorithmDsl';
import { SceneSchema } from '../../types/algorithmStudio';
import { Locale } from '../../types/workspace';
import { compileDslToScene } from '../../utils/dslInterpreter';
import { CUSTOM_DSL_2D_PREFIX_SUM, CUSTOM_DSL_KADANE } from '../../utils/dslSchema';
import { SEMANTIC_COMPONENT_REGISTRY } from '../../utils/semanticRegistry';
import {
  deleteCustomAlgorithm,
  loadCustomAlgorithms,
  saveCustomAlgorithm,
} from '../../utils/studioStorage';

interface AlgorithmBuilderModalProps {
  locale: Locale;
  authorName: string;
  initialDsl?: AlgorithmSceneDSL | null;
  onApplyBuiltScene: (scene: SceneSchema, dsl: AlgorithmSceneDSL) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

const OP_LABELS: Record<DslStatement['op'], string> = {
  set: '变量赋值 Set',
  arraySet: '数组写入 ArraySet',
  matrixSet: '矩阵/DP 写入 MatrixSet',
  swap: '交换元素 Swap',
  push: '入栈 Push',
  enqueue: '入队 Enqueue',
  pop: '出栈 Pop',
  dequeue: '出队 Dequeue',
  if: '条件分支 If',
  for: '计数循环 For',
  while: '条件循环 While',
  highlight: '元素高亮 Highlight',
  emit: '触发事件 Emit',
  step: '提交教学关键步 Step',
};

export const AlgorithmBuilderModal: React.FC<AlgorithmBuilderModalProps> = ({
  locale,
  authorName,
  initialDsl,
  onApplyBuiltScene,
  onNotify,
  onClose,
}) => {
  const zh = locale === 'zh-CN';
  const [library, setLibrary] = useState<CustomAlgorithmRecord[]>([]);
  const [dsl, setDsl] = useState<AlgorithmSceneDSL>(() =>
    structuredClone(initialDsl || CUSTOM_DSL_2D_PREFIX_SUM)
  );
  const [runError, setRunError] = useState<string | null>(null);
  const [lastStats, setLastStats] = useState<string | null>(null);

  useEffect(() => {
    void loadCustomAlgorithms().then(setLibrary);
  }, []);

  const handleSaveToLibrary = async () => {
    const rec: CustomAlgorithmRecord = {
      id: dsl.scene.id || `custom-${Date.now()}`,
      name: dsl.scene.name,
      description: dsl.scene.description || '自定义 Algorithm Builder 算法',
      tier: dsl.scene.tier,
      dsl: structuredClone(dsl),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveCustomAlgorithm(rec);
    const updated = await loadCustomAlgorithms();
    setLibrary(updated);
    onNotify(zh ? `已保存自定义算法「${rec.name}」` : 'Custom algorithm saved');
  };

  const handleRunAndApply = () => {
    setRunError(null);
    const res = compileDslToScene(dsl, authorName);
    if (!res.ok || !res.scene) {
      setRunError(res.error || 'DSL 执行失败');
      return;
    }
    setLastStats(
      `成功生成 ${res.stats.stepsGenerated} 步（${res.stats.opsExecuted} 次原子操作，耗时 ${res.stats.elapsedMs}ms），输出：${res.actualOutput || '无'}`
    );
    onApplyBuiltScene(res.scene, dsl);
  };

  const addOperationNode = (opKind: DslStatement['op']) => {
    let node: DslStatement;
    if (opKind === 'set') {
      node = { op: 'set', varName: 'ans', expr: 'ans + 1' };
    } else if (opKind === 'arraySet') {
      node = { op: 'arraySet', target: dsl.state.variables[0]?.name || 'dp', indexExpr: '0', valueExpr: '0' };
    } else if (opKind === 'matrixSet') {
      node = { op: 'matrixSet', target: 'pre', rowExpr: '1', colExpr: '1', valueExpr: '0' };
    } else if (opKind === 'for') {
      node = {
        op: 'for',
        varName: 'k',
        fromExpr: '0',
        toExpr: '2',
        inclusive: true,
        body: [{ op: 'step', titleExpr: '"循环 k=" + k', explanationExpr: '"执行自定义循环体"' }],
      };
    } else {
      node = { op: 'step', titleExpr: '"新教学步骤"', explanationExpr: '"在此填写算法推演讲解"' };
    }
    setDsl((p) => ({ ...p, operations: [...p.operations, node] }));
  };

  const moveOp = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= dsl.operations.length) return;
    const arr = [...dsl.operations];
    const tmp = arr[idx];
    arr[idx] = arr[nextIdx];
    arr[nextIdx] = tmp;
    setDsl((p) => ({ ...p, operations: arr }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[88vh] rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#101520] text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-4 h-4 text-emerald-500" />
            <div>
              <h2 className="text-sm font-bold">
                {zh ? 'Algorithm Builder · 通用自定义算法与流程设计器' : 'Algorithm Builder'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {zh
                  ? '可视化定义输入、状态变量、语义组件、流程规则节点与输出表达式（通过安全受限 DSL 解释器真实执行）'
                  : 'Define inputs, state, semantic components & restricted DSL rules'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToLibrary}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-white/15 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span>{zh ? '保存到自定义算法库' : 'Save Custom Algo'}</span>
            </button>
            <button
              type="button"
              onClick={handleRunAndApply}
              className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{zh ? '安全执行并应用到画布' : 'Run DSL & Apply'}</span>
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-white/10 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Pane Body */}
        <div className="flex-1 min-h-0 grid grid-cols-12 overflow-hidden">
          {/* Left: Custom Algorithm Repository */}
          <div className="col-span-3 border-r border-slate-200 dark:border-white/10 p-3 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                {zh ? '自定义算法库' : 'Custom Library'}
              </span>
              <button
                type="button"
                onClick={() => setDsl(structuredClone(CUSTOM_DSL_KADANE))}
                className="text-[10px] text-blue-400 hover:underline cursor-pointer"
              >
                {zh ? '载入 Kadane 示例' : 'Load Kadane'}
              </button>
            </div>
            <div className="space-y-1.5">
              {library.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setDsl(structuredClone(rec.dsl))}
                  className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:border-blue-500/60 cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold truncate">{rec.name}</span>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title={zh ? '复制创建副本' : 'Duplicate'}
                        onClick={() => {
                          const dup = structuredClone(rec.dsl);
                          dup.scene.id = `custom-${Date.now()}`;
                          dup.scene.name = `${dup.scene.name} (副本)`;
                          setDsl(dup);
                        }}
                        className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteCustomAlgorithm(rec.id).then(() => loadCustomAlgorithms().then(setLibrary));
                        }}
                        className="p-0.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">{rec.description}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
              <div className="font-semibold text-slate-300">{zh ? '基础信息 & 输出' : 'Meta & Output'}</div>
              <input
                type="text"
                value={dsl.scene.name}
                onChange={(e) => setDsl((p) => ({ ...p, scene: { ...p.scene, name: e.target.value } }))}
                placeholder="算法名称"
                className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1"
              />
              <input
                type="text"
                value={dsl.scene.formulaLatex}
                onChange={(e) => setDsl((p) => ({ ...p, scene: { ...p.scene, formulaLatex: e.target.value } }))}
                placeholder="LaTeX 转移方程"
                className="w-full rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={dsl.output.expression}
                  onChange={(e) => setDsl((p) => ({ ...p, output: { ...p.output, expression: e.target.value } }))}
                  placeholder="输出表达式 (如 ans)"
                  className="rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                />
                <input
                  type="text"
                  value={dsl.input.expectedOutput || ''}
                  onChange={(e) => setDsl((p) => ({ ...p, input: { ...p.input, expectedOutput: e.target.value } }))}
                  placeholder="期望结果 (如 28)"
                  className="rounded border border-white/15 bg-[#0B0E14] px-2 py-1 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Center: Visual Rule & Flowchart Operation Sequence */}
          <div className="col-span-5 border-r border-slate-200 dark:border-white/10 p-3 overflow-y-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-300">
                {zh ? `算法规则流程节点 (${dsl.operations.length})` : 'Operation Flow'}
              </span>
              <div className="flex flex-wrap gap-1">
                {(['set', 'arraySet', 'matrixSet', 'for', 'step'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addOperationNode(kind)}
                    className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 text-[10px] flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" /> {kind}
                  </button>
                ))}
              </div>
            </div>

            {runError && (
              <div className="p-2.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 font-mono text-[11px]">
                {runError}
              </div>
            )}
            {lastStats && (
              <div className="p-2.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px]">
                {lastStats}
              </div>
            )}

            <div className="space-y-2">
              {dsl.operations.map((op, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0E14] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-blue-400">
                      #{idx + 1} · {OP_LABELS[op.op] || op.op}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveOp(idx, -1)} className="p-1 hover:bg-white/10 rounded cursor-pointer">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => moveOp(idx, 1)} className="p-1 hover:bg-white/10 rounded cursor-pointer">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDsl((p) => ({
                            ...p,
                            operations: p.operations.filter((_, i) => i !== idx),
                          }))
                        }
                        className="p-1 text-rose-400 hover:bg-rose-500/15 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {op.op === 'set' && (
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                      <input
                        value={op.varName}
                        onChange={(e) =>
                          setDsl((p) => ({
                            ...p,
                            operations: p.operations.map((o, i) =>
                              i === idx && o.op === 'set' ? { ...o, varName: e.target.value } : o
                            ),
                          }))
                        }
                        placeholder="变量"
                        className="rounded border border-white/15 bg-black/30 px-2 py-1"
                      />
                      <input
                        value={op.expr}
                        onChange={(e) =>
                          setDsl((p) => ({
                            ...p,
                            operations: p.operations.map((o, i) =>
                              i === idx && o.op === 'set' ? { ...o, expr: e.target.value } : o
                            ),
                          }))
                        }
                        placeholder="表达式"
                        className="col-span-2 rounded border border-white/15 bg-black/30 px-2 py-1"
                      />
                    </div>
                  )}

                  {op.op === 'step' && (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <input
                        value={op.titleExpr}
                        onChange={(e) =>
                          setDsl((p) => ({
                            ...p,
                            operations: p.operations.map((o, i) =>
                              i === idx && o.op === 'step' ? { ...o, titleExpr: e.target.value } : o
                            ),
                          }))
                        }
                        placeholder="标题表达式"
                        className="w-full rounded border border-white/15 bg-black/30 px-2 py-1"
                      />
                      <input
                        value={op.explanationExpr}
                        onChange={(e) =>
                          setDsl((p) => ({
                            ...p,
                            operations: p.operations.map((o, i) =>
                              i === idx && o.op === 'step' ? { ...o, explanationExpr: e.target.value } : o
                            ),
                          }))
                        }
                        placeholder="讲解表达式"
                        className="w-full rounded border border-white/15 bg-black/30 px-2 py-1"
                      />
                    </div>
                  )}

                  {(op.op === 'for' || op.op === 'matrixSet' || op.op === 'arraySet') && (
                    <div className="text-[10px] font-mono text-slate-400 break-all">
                      {JSON.stringify(op)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Inputs, State & Smart Components */}
          <div className="col-span-4 p-3 overflow-y-auto space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  {zh ? '输入参数 (Input Fields)' : 'Inputs'}
                </span>
              </div>
              {dsl.input.fields.map((f, idx) => (
                <div key={f.name} className="p-2 rounded border border-white/10 bg-[#0B0E14] space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">{f.name}</span>
                    <span className="text-[10px] text-slate-400">{f.type}</span>
                  </div>
                  <input
                    value={JSON.stringify(f.defaultValue)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setDsl((p) => ({
                          ...p,
                          input: {
                            ...p.input,
                            fields: p.input.fields.map((x, i) =>
                              i === idx ? { ...x, defaultValue: parsed } : x
                            ),
                          },
                        }));
                      } catch {
                        // wait for valid JSON
                      }
                    }}
                    className="w-full rounded border border-white/15 bg-black/40 px-2 py-1"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  {zh ? `智能语义组件 (${dsl.components.length})` : 'Semantic Components'}
                </span>
                <select
                  onChange={(e) => {
                    const sem = e.target.value as SemanticComponentKind;
                    if (!sem) return;
                    const desc = SEMANTIC_COMPONENT_REGISTRY[sem];
                    setDsl((p) => ({
                      ...p,
                      components: [
                        ...p.components,
                        {
                          id: `cmp-${Date.now()}`,
                          semanticType: sem,
                          componentType: desc.defaultComponentType,
                          name: desc.labelZh,
                          x: 40 + (p.components.length * 30) % 240,
                          y: 40 + (p.components.length * 30) % 180,
                          width: 320,
                          height: 180,
                        },
                      ],
                    }));
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="rounded border border-white/15 bg-[#0B0E14] px-2 py-1 text-[11px]"
                >
                  <option value="">+ 添加智能组件</option>
                  {Object.values(SEMANTIC_COMPONENT_REGISTRY).map((s) => (
                    <option key={s.semanticType} value={s.semanticType}>
                      {s.labelZh}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                {dsl.components.map((c) => (
                  <div
                    key={c.id}
                    className="px-2.5 py-1.5 rounded border border-white/10 bg-[#0B0E14] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {c.semanticType} ({c.id})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDsl((p) => ({
                          ...p,
                          components: p.components.filter((x) => x.id !== c.id),
                        }))
                      }
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
