# CodeTransit Algorithm Studio 2.0 开发者与用户手册

## 1. 系统架构总览

CodeTransit 保留原有 **Code Studio**（Carbon 代码美化、题面重点标记、多样例 Diff、算法库、代码 6 位中转与高清导出）与 **Algorithm Studio 1.0**（20 个内置竞赛算法、自由画布、图论编辑器、演示模式与 GIF/HTML/SVG 导出），并升级引入 **Algorithm Studio 2.0 智能自定义算法创作引擎**。

核心新增模块：
- `src/types/algorithmDsl.ts`：DSL 2.0、语义组件接口、设计方案 Plan、JSON Patch 与验证报告类型定义。
- `src/utils/dslSchema.ts`：JSON / YAML 双向解析与序列化（基于 `js-yaml` `JSON_SCHEMA`）、Schema 校验、v1.0.0→v2.0.0 迁移与未预设示范算法（二维前缀和、Kadane DP）。
- `src/utils/dslInterpreter.ts`：纯递归下降表达式解析器与受限语句解释器，**严禁 `eval` / `new Function` / 原型链注入**，强制 `maxSteps`、`maxDepth`、`maxArraySize`、`maxTimeMs` 资源上限。
- `src/utils/semanticRegistry.ts`：15 类智能语义组件（SmartArray, SmartMatrix, SmartStack, SmartQueue, SmartLinkedList, SmartTree, SmartGraph, SmartDPTable, SmartRecursion, SmartHeap, SmartUnionFind, SmartPointer, SmartVariable, SmartFormula, SmartGrid）统一读写、越界检查与 `AlgorithmEvent` 生成。
- `src/utils/smartLayout.ts`：语义分区自动排版与遮挡重叠检测引擎。
- `src/utils/algorithmAnalyzer.ts`：C++17 源码、Markdown 题解、测试样例静态语义识别与可审核方案生成。
- `src/utils/validationEngine.ts`：场景结构、图论前置条件、数组边界、快照完整性、期望/实际输出核验与导出完整性校验。
- `src/utils/scenePatch.ts`：AI 对话局部 Patch 锁定保护与选择性应用引擎。
- `server/aiProvider.ts`：服务端可替换 `AIProvider`（当前实现 `GeminiAIProvider`，通过 `process.env.GEMINI_API_KEY` 调用，不在前端暴露密钥）。

---

## 2. Algorithm Scene DSL 2.0 规范（JSON / YAML）

```yaml
version: "2.0.0"
scene:
  id: custom-2d-prefix-sum
  name: 二维前缀和
  tier: CSP-J
  teachingTier: CSP-J
  teachingStyle: deductive
  language: cpp
  formulaLatex: "pre[i][j] = pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1] + mat[i-1][j-1]"
input:
  fields:
    - name: mat
      type: number[][]
      defaultValue: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
  expectedOutput: "28"
state:
  variables:
    - name: pre
      type: number[][]
      initial: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]
components:
  - id: cmp-pre
    semanticType: SmartDPTable
    componentType: dp-2d
    name: 前缀和表
    x: 344
    y: 36
    width: 340
    height: 250
operations:
  - op: for
    varName: i
    fromExpr: "1"
    toExpr: "3"
    inclusive: true
    body:
      - op: step
        titleExpr: '"行 " + i'
        explanationExpr: '"逐格递推"'
output:
  expression: ans
```

---

## 3. 轨迹来源诚信原则 (`ExecutionTraceSource`)

系统在 UI 顶栏与右侧「验证」面板明确区分并标示轨迹来源：
- `builtin`：内置 TypeScript 算法引擎按真实输入计算。
- `dsl`：受限 AST/DSL 解释器真实执行用户规则与样例。
- `manual`：手动编辑关键帧快照。
- `external_cpp`：外部标准 Trace JSON 导入。
- `ai_draft`：AI 模型生成的推理草稿（**严禁伪装为真实 C++ 编译运行**）。

---

## 4. 新增智能组件与算法模板开发指南

1. **新增智能组件操作**：在 `src/utils/semanticRegistry.ts` 的 `applySemanticOperation` 中扩展对应 `SemanticOperation['kind']`，返回深拷贝后的 `payload` 与标准 `AlgorithmEvent`。
2. **新增可复用自定义算法**：在 Algorithm Builder 构建并保存，或向 `src/utils/dslSchema.ts` 导出合法 `AlgorithmSceneDSL` 对象并通过 `compileDslToScene(dsl)` 生成场景。

---

## 5. 服务端 AI 与部署配置

- 在部署环境中设置环境变量 `GEMINI_API_KEY` 即可启用服务端 `/api/ai/plan`、`/api/ai/generate-scene`、`/api/ai/patch-scene` 接口；未配置时服务端返回 HTTP 503 `MISSING_GEMINI_KEY`，前端绝不伪造 AI 输出，本地静态分析与 Algorithm Builder 规则引擎仍可独立使用。
- 构建与启动：
  ```bash
  npm run build
  npm start
  ```
