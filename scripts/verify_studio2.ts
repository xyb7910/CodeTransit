import assert from 'node:assert/strict';
import { ALGORITHM_TEMPLATES } from '../src/constants/algorithmTemplates';
import {
  CUSTOM_DSL_2D_PREFIX_SUM,
  CUSTOM_DSL_KADANE,
  parseDsl,
  serializeDsl,
} from '../src/utils/dslSchema';
import { compileDslToScene, evaluateSafeExpression } from '../src/utils/dslInterpreter';
import { applySemanticOperation } from '../src/utils/semanticRegistry';
import { detectArtboardOverlaps, smartArrangeArtboard } from '../src/utils/smartLayout';
import { analyzeCppAndProblemStatic } from '../src/utils/algorithmAnalyzer';
import { applySelectedPatches, evaluatePatchLocks } from '../src/utils/scenePatch';
import { validateSceneAndDsl } from '../src/utils/validationEngine';
import { ScenePatchBundle } from '../src/types/algorithmDsl';

console.log('=== CodeTransit Algorithm Studio 2.0 Verification Suite ===');

// 1. JSON & YAML roundtrip + security check
const yamlText = serializeDsl(CUSTOM_DSL_2D_PREFIX_SUM, 'yaml');
const parsedYaml = parseDsl(yamlText, 'yaml');
assert.equal(parsedYaml.ok, true, `YAML parse failed: ${parsedYaml.errors.join(', ')}`);
assert.equal(parsedYaml.dsl?.scene.id, 'custom-2d-prefix-sum');

const jsonText = serializeDsl(CUSTOM_DSL_2D_PREFIX_SUM, 'json');
const parsedJson = parseDsl(jsonText, 'json');
assert.equal(parsedJson.ok, true);

// Prototype pollution rejection
const malicious = parseDsl('{"version":"2.0.0","__proto__":{"polluted":true}}', 'json');
assert.equal(malicious.ok, false, 'Prototype pollution key must be rejected');

// Dangerous expression identifier rejection
assert.throws(() => evaluateSafeExpression('eval("1+1")', {}), /禁止使用危险标识符/);
assert.throws(() => evaluateSafeExpression('process.exit(1)', {}), /禁止使用危险标识符/);

// 2. Mandatory Unpreset Generalization Test #1: 2D Prefix Sum
const prefixRes = compileDslToScene(CUSTOM_DSL_2D_PREFIX_SUM, 'Yanpb');
assert.equal(prefixRes.ok, true, prefixRes.error);
assert.equal(prefixRes.actualOutput, '28');
assert.equal(prefixRes.scene?.traceSource, 'dsl');
assert.ok((prefixRes.steps?.length || 0) >= 10, '2D Prefix Sum should generate multi-step trace');

// Validate 2D Prefix Sum scene passes verification cleanly
const prefixReport = validateSceneAndDsl(prefixRes.scene!, CUSTOM_DSL_2D_PREFIX_SUM);
assert.equal(prefixReport.status, 'verified', `Expected verified, got ${prefixReport.status}: ${JSON.stringify(prefixReport.issues)}`);
assert.equal(prefixReport.stats.outputMatched, true);

// 3. Mandatory Unpreset Generalization Test #2: Kadane Max Subarray DP
const kadaneRes = compileDslToScene(CUSTOM_DSL_KADANE, 'Yanpb');
assert.equal(kadaneRes.ok, true, kadaneRes.error);
assert.equal(kadaneRes.actualOutput, '6');

// 4. Restricted interpreter infinite-loop guard
const infiniteDsl = structuredClone(CUSTOM_DSL_KADANE);
infiniteDsl.operations = [
  { op: 'while', condition: '1 == 1', maxIter: 15, body: [{ op: 'set', varName: 'i', expr: 'i + 1' }] },
];
const infRes = compileDslToScene(infiniteDsl, 'Yanpb');
assert.equal(infRes.ok, false, 'Infinite while loop must be halted by interpreter cap');

// 5. Semantic Component Registry operations & bounds safety
const sampleBoardItem = prefixRes.items![0];
const badCell = applySemanticOperation(sampleBoardItem, {
  kind: 'write-cell',
  row: 99,
  col: 0,
  value: 1,
  stepIndex: 0,
});
assert.equal(badCell.valid, false);
assert.equal(badCell.events[0]?.type, 'error');

// 6. Smart Layout non-overlapping verification
const overlappingItems = prefixRes.items!.map((it) => ({ ...it, x: 20, y: 20 }));
const arranged = smartArrangeArtboard(overlappingItems, 980, 620);
const overlapCheck = detectArtboardOverlaps(arranged, 980, 620);
assert.equal(overlapCheck.pairs.length, 0, `Smart layout still overlapped: ${JSON.stringify(overlapCheck.pairs)}`);

// 7. AI Patch lock enforcement & selective apply
const sceneToPatch = structuredClone(prefixRes.scene!);
sceneToPatch.artboards[0].items[0].locked = true;
sceneToPatch.lockedCode = true;
const patchBundle: ScenePatchBundle = {
  id: 'test-bundle',
  prompt: 'Edit locked and unlocked items',
  explanation: 'Test patch',
  createdAt: Date.now(),
  ops: [
    {
      id: 'op-locked-item',
      op: 'update-item',
      targetId: sceneToPatch.artboards[0].items[0].id,
      summary: 'Try modifying locked matrix',
      payload: { name: 'Hacked' },
    },
    {
      id: 'op-locked-code',
      op: 'update-code',
      summary: 'Try modifying locked code',
      payload: { linkedCode: 'hacked' },
    },
    {
      id: 'op-step-note',
      op: 'update-step',
      stepIndex: 0,
      summary: 'Update step 0 title',
      payload: { title: '已审核：初始化哨兵矩阵' },
    },
  ],
};
const evaluated = evaluatePatchLocks(sceneToPatch, patchBundle);
assert.equal(evaluated[0].blockedByLock, true);
assert.equal(evaluated[1].blockedByLock, true);
assert.equal(evaluated[2].blockedByLock, false);
const applied = applySelectedPatches(
  sceneToPatch,
  patchBundle,
  patchBundle.ops.map((o) => o.id)
);
assert.equal(applied.appliedCount, 1);
assert.equal(applied.skippedLockedCount, 2);
assert.equal(applied.scene.steps[0].title, '已审核：初始化哨兵矩阵');

// 8. Trace Honesty Check on ai_draft
const aiDraftScene = { ...structuredClone(prefixRes.scene!), traceMode: 'ai_draft' as const, traceSource: 'ai_draft' as const };
const aiReport = validateSceneAndDsl(aiDraftScene);
assert.equal(aiReport.status, 'draft');

// 9. Static Analyzer check
const analysis = analyzeCppAndProblemStatic({
  mode: 'cpp-source',
  naturalLanguage: 'Dijkstra 求单源最短路',
  cppCode: 'priority_queue<pair<int,int>> pq; vector<int> dist(n);',
  markdownSolution: '',
  sampleInput: '',
  sampleOutput: '',
  formulaLatex: '',
  teachingTier: 'CSP-S',
});
assert.ok(analysis.containers.some((c) => c.semanticKind === 'SmartHeap'));
assert.ok(analysis.disclaimer.includes('非真实'));

// 10. Regression check on all 20 existing Algorithm Studio 1.0 templates
for (const tpl of ALGORITHM_TEMPLATES) {
  const res = tpl.buildScene(tpl.defaultParams, 'Yanpb');
  assert.ok(!res.error, `Template ${tpl.id} returned error: ${res.error}`);
  assert.ok(res.scene.steps.length > 0, `Template ${tpl.id} produced 0 steps`);
}

console.log(`All 10 test groups passed! (${ALGORITHM_TEMPLATES.length} built-in templates + 2 custom DSL algorithms verified)`);
