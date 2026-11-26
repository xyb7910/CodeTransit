import { AlgoCanvasItem, AlgoStep, SceneSchema } from '../types/algorithmStudio';
import { ScenePatchBundle, ScenePatchOp } from '../types/algorithmDsl';

export interface EvaluatedPatchOp {
  op: ScenePatchOp;
  blockedByLock: boolean;
  lockReason?: string;
}

export function evaluatePatchLocks(scene: SceneSchema, bundle: ScenePatchBundle): EvaluatedPatchOp[] {
  const board = scene.artboards.find((a) => a.id === scene.activeArtboardId) || scene.artboards[0];
  const itemMap = new Map((board?.items || []).map((it) => [it.id, it]));
  const lockedSteps = new Set(scene.lockedStepIds || []);

  return bundle.ops.map((op) => {
    if ((op.op === 'update-item' || op.op === 'remove-item') && op.targetId) {
      const item = itemMap.get(op.targetId);
      if (item?.locked) {
        return {
          op,
          blockedByLock: true,
          lockReason: `组件「${item.name}」已锁定，AI 局部修改不能覆盖已锁定组件`,
        };
      }
    }
    if ((op.op === 'update-step' || op.op === 'remove-step') && typeof op.stepIndex === 'number') {
      const step = scene.steps[op.stepIndex];
      if (step && lockedSteps.has(step.id)) {
        return {
          op,
          blockedByLock: true,
          lockReason: `步骤 #${op.stepIndex + 1} 已锁定`,
        };
      }
    }
    if (op.op === 'update-code' && scene.lockedCode) {
      return {
        op,
        blockedByLock: true,
        lockReason: '关联源码已锁定',
      };
    }
    return { op, blockedByLock: false };
  });
}

export function applySelectedPatches(
  scene: SceneSchema,
  bundle: ScenePatchBundle,
  selectedOpIds: string[]
): { scene: SceneSchema; appliedCount: number; skippedLockedCount: number } {
  const evaluated = evaluatePatchLocks(scene, bundle);
  const selectedSet = new Set(selectedOpIds);

  let next = structuredClone(scene);
  let appliedCount = 0;
  let skippedLockedCount = 0;

  for (const { op, blockedByLock } of evaluated) {
    if (!selectedSet.has(op.id)) continue;
    if (blockedByLock) {
      skippedLockedCount++;
      continue;
    }

    const boardIdx = next.artboards.findIndex((a) => a.id === next.activeArtboardId);
    const activeIdx = boardIdx >= 0 ? boardIdx : 0;
    const board = next.artboards[activeIdx];

    switch (op.op) {
      case 'update-meta': {
        if (typeof op.payload.name === 'string') next.name = op.payload.name;
        if (typeof op.payload.formulaLatex === 'string') next.formulaLatex = op.payload.formulaLatex;
        if (typeof op.payload.expectedOutput === 'string') next.expectedOutput = op.payload.expectedOutput;
        appliedCount++;
        break;
      }
      case 'update-code': {
        if (typeof op.payload.linkedCode === 'string') {
          next.linkedCode = op.payload.linkedCode;
          appliedCount++;
        }
        break;
      }
      case 'add-item': {
        if (board && op.payload.item) {
          const item = structuredClone(op.payload.item) as AlgoCanvasItem;
          board.items.push(item);
          appliedCount++;
        }
        break;
      }
      case 'update-item': {
        if (board && op.targetId) {
          board.items = board.items.map((it) => {
            if (it.id !== op.targetId) return it;
            return {
              ...it,
              ...(typeof op.payload.name === 'string' ? { name: op.payload.name } : {}),
              ...(typeof op.payload.x === 'number' ? { x: op.payload.x } : {}),
              ...(typeof op.payload.y === 'number' ? { y: op.payload.y } : {}),
              ...(typeof op.payload.coachOnly === 'boolean' ? { coachOnly: op.payload.coachOnly } : {}),
              ...(op.payload.payload ? { payload: structuredClone(op.payload.payload) as AlgoCanvasItem['payload'] } : {}),
            };
          });
          appliedCount++;
        }
        break;
      }
      case 'remove-item': {
        if (board && op.targetId) {
          board.items = board.items.filter((it) => it.id !== op.targetId);
          appliedCount++;
        }
        break;
      }
      case 'update-step': {
        if (typeof op.stepIndex === 'number' && next.steps[op.stepIndex]) {
          const st = next.steps[op.stepIndex];
          next.steps[op.stepIndex] = {
            ...st,
            ...(typeof op.payload.title === 'string' ? { title: op.payload.title } : {}),
            ...(typeof op.payload.explanation === 'string' ? { explanation: op.payload.explanation } : {}),
            ...(typeof op.payload.coachNote === 'string' ? { coachNote: op.payload.coachNote } : {}),
            ...(typeof op.payload.formulaLatex === 'string' ? { formulaLatex: op.payload.formulaLatex } : {}),
            ...(Array.isArray(op.payload.codeLines) ? { codeLines: op.payload.codeLines as number[] } : {}),
            ...(typeof op.payload.durationMs === 'number' ? { durationMs: op.payload.durationMs } : {}),
          };
          appliedCount++;
        }
        break;
      }
      case 'add-step': {
        if (op.payload.step) {
          const st = structuredClone(op.payload.step) as AlgoStep;
          st.index = next.steps.length;
          next.steps.push(st);
          appliedCount++;
        }
        break;
      }
      case 'remove-step': {
        if (typeof op.stepIndex === 'number' && next.steps.length > 1) {
          next.steps = next.steps
            .filter((_, idx) => idx !== op.stepIndex)
            .map((s, idx) => ({ ...s, index: idx }));
          next.currentStepIndex = Math.min(next.currentStepIndex, next.steps.length - 1);
          appliedCount++;
        }
        break;
      }
      default:
        break;
    }
  }

  next.updatedAt = Date.now();
  return { scene: next, appliedCount, skippedLockedCount };
}
