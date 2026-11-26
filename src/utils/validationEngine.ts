import { SceneSchema } from '../types/algorithmStudio';
import {
  AlgorithmSceneDSL,
  ValidationIssue,
  ValidationReport,
} from '../types/algorithmDsl';
import { validateDslObject } from './dslSchema';
import { validateGraphForAlgorithm } from './graphLayouts';
import { validateComponentPayload } from './semanticRegistry';
import { detectArtboardOverlaps } from './smartLayout';

export function validateSceneAndDsl(
  scene: SceneSchema,
  dsl?: AlgorithmSceneDSL | null
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const traceSource =
    scene.traceSource ||
    (scene.traceMode === 'external'
      ? 'external_cpp'
      : scene.traceMode === 'dsl'
        ? 'dsl'
        : scene.traceMode === 'ai_draft'
          ? 'ai_draft'
          : scene.traceMode === 'manual'
            ? 'manual'
            : 'builtin');

  const activeBoard =
    scene.artboards.find((a) => a.id === scene.activeArtboardId) || scene.artboards[0];

  // 1. Trace Honesty check
  if (traceSource === 'ai_draft') {
    issues.push({
      id: 'trace-ai-draft',
      severity: 'warning',
      category: 'trace-honesty',
      location: 'scene.traceSource',
      message: '当前场景来自 AI 推演草稿，尚未经过内置真实算法或受限 DSL 解释器校验',
      suggestion: '请在 Algorithm Builder / DSL 编辑器中执行规则，或手动核对关键帧状态后再用于教学演示。',
    });
  } else if (traceSource === 'external_cpp') {
    issues.push({
      id: 'trace-ext-cpp',
      severity: 'info',
      category: 'trace-honesty',
      location: 'scene.traceSource',
      message: '轨迹来自外部 Trace JSON 导入',
      suggestion: '请确保外部 JSON 轨迹与右侧源码行号一一对应。',
    });
  }

  // 2. DSL schema & safety check if supplied
  if (dsl) {
    const res = validateDslObject(dsl);
    if (!res.ok) {
      res.errors.forEach((err, i) => {
        issues.push({
          id: `dsl-err-${i}`,
          severity: 'error',
          category: 'schema',
          location: 'dsl',
          message: err,
          suggestion: '在 DSL 编辑器或 Algorithm Builder 中补全必填字段。',
        });
      });
    }
    const maxSteps = dsl.limits?.maxSteps ?? 180;
    if (scene.steps.length > maxSteps) {
      issues.push({
        id: 'limit-steps',
        severity: 'warning',
        category: 'limits',
        location: 'timeline.steps',
        message: `步骤数量 (${scene.steps.length}) 超出建议教学演示上限 (${maxSteps})`,
        suggestion: '建议使用较小教学样例或合并冗余循环步骤。',
      });
    }
  }

  // 3. Component data consistency & precondition checks
  if (!activeBoard || activeBoard.items.length === 0) {
    issues.push({
      id: 'empty-board',
      severity: 'error',
      category: 'schema',
      location: 'artboard',
      message: '当前画板没有任何可视化组件，无法生成教学导出画面',
      suggestion: '从左侧组件库拖入组件，或使用规则设计器 / 算法模板生成画板。',
    });
  } else {
    for (const item of activeBoard.items) {
      const itemErrs = validateComponentPayload(item);
      itemErrs.forEach((msg, idx) => {
        issues.push({
          id: `cmp-err-${item.id}-${idx}`,
          severity: 'error',
          category: 'bounds',
          location: item.name,
          message: msg,
          suggestion: '检查数组下标或图边表节点引用是否合法。',
        });
      });

      if (item.payload.kind === 'graph') {
        const gv = validateGraphForAlgorithm(item.payload.data, scene.templateId);
        if (!gv.valid) {
          issues.push({
            id: `graph-pre-${item.id}`,
            severity: 'error',
            category: 'precondition',
            location: item.name,
            message: gv.reason || '图论前置条件校验未通过',
            suggestion: '修改边权或检查有向无环图 (DAG) 约束。',
          });
        }
      }
    }

    const overlap = detectArtboardOverlaps(activeBoard.items, activeBoard.width, activeBoard.height);
    if (overlap.pairs.length > 0) {
      issues.push({
        id: 'layout-overlap',
        severity: 'warning',
        category: 'export',
        location: 'artboard.layout',
        message: `检测到 ${overlap.pairs.length} 组组件位置重叠 (${overlap.pairs[0].join(' 与 ')})`,
        suggestion: '点击顶部工具栏「智能自动排版」可一键消除组件遮挡。',
      });
    }
    if (overlap.outOfBounds.length > 0) {
      issues.push({
        id: 'layout-oob',
        severity: 'warning',
        category: 'export',
        location: 'artboard.bounds',
        message: `组件超出画板导出边界: ${overlap.outOfBounds.join(', ')}`,
        suggestion: '缩小组件或使用智能排版使其保持在画板可视区域内。',
      });
    }
  }

  // 4. Snapshot consistency check
  if (scene.steps.length === 0) {
    issues.push({
      id: 'no-steps',
      severity: 'error',
      category: 'snapshot',
      location: 'timeline',
      message: '时间轴没有任何执行步骤',
      suggestion: '执行内置算法、DSL 规则或插入至少一个关键帧。',
    });
  } else if (activeBoard) {
    const itemIds = new Set(activeBoard.items.map((it) => it.id));
    let missingSnap = 0;
    for (const st of scene.steps) {
      for (const id of itemIds) {
        if (!st.snapshot?.artboardItems?.[id]) {
          missingSnap++;
        }
      }
    }
    if (missingSnap > 0) {
      issues.push({
        id: 'snap-partial',
        severity: 'info',
        category: 'snapshot',
        location: 'steps.snapshot',
        message: `部分新增组件在历史关键帧中没有独立快照记录 (${missingSnap} 处)`,
        suggestion: '若需精确状态回退，可重新生成执行轨迹或点击时间轴更新关键帧。',
      });
    }
  }

  // 5. Expected vs Actual Output check
  let outputMatched: boolean | undefined;
  if (scene.expectedOutput !== undefined && scene.expectedOutput.trim() !== '') {
    const exp = scene.expectedOutput.trim();
    const act = (scene.actualOutput ?? '').trim();
    outputMatched = exp === act;
    if (!outputMatched) {
      issues.push({
        id: 'output-mismatch',
        severity: 'error',
        category: 'output',
        location: 'output',
        message: `结果校验不一致：期望 "${exp}"，实际 "${act || '(未计算)'}"`,
        suggestion: '检查状态转移公式、初值边界或输出表达式是否正确。',
      });
    }
  }

  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarn = issues.some((i) => i.severity === 'warning');
  const status: ValidationReport['status'] = hasError
    ? 'error'
    : traceSource === 'ai_draft'
      ? 'draft'
      : hasWarn
        ? 'warning'
        : 'verified';

  const eventCount = scene.steps.reduce((acc, s) => acc + (s.events?.length || 0), 0);

  return {
    status,
    traceSource,
    checkedAt: Date.now(),
    summary:
      status === 'verified'
        ? '结构、边界、前驱条件与步骤快照校验全部通过'
        : status === 'draft'
          ? '场景处于 AI 推演草稿状态，建议核对或转换为 DSL 可执行规则'
          : status === 'warning'
            ? '存在非阻断警告，建议按提示优化排版或边界'
            : '存在阻断性校验错误，请根据修复建议处理',
    issues,
    stats: {
      componentCount: activeBoard?.items.length || 0,
      stepCount: scene.steps.length,
      eventCount,
      expectedOutput: scene.expectedOutput,
      actualOutput: scene.actualOutput,
      outputMatched,
    },
  };
}
