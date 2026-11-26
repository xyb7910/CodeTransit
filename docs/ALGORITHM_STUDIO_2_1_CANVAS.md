# Yanpb CodeTransit — Algorithm Studio 2.1 专业画布交互与自适应系统架构说明

## 1. 架构概览

Algorithm Studio 2.1 在完整保留 Code Studio、CodeTransit 6 位取件码中转、题目标记、多样例对比、20 套算法模板与 Studio 2.0（AI 创作、规则设计器、Scene DSL）的基础上，升级自由画布交互内核与自适应画板引擎：

- **统一交互画布 (`src/components/studio/StudioCanvas.tsx`)**
  - 光标中心缩放 (`zoomAtCursor`)：缩放前后鼠标指向的逻辑画布坐标严格不变，零漂移。
  - 双轨操作体系：工具栏 (`V, H, R, O, A, L, T, P, M`) + `Space` 临时抓手 + 中键平移 + `Alt+拖拽` 快速克隆 + `Shift` 轴向约束/等比例缩放/15°角度吸附 + 边缘拖拽自动滚屏。
  - 原子化撤销事务：连续拖拽/缩放/旋转仅在 `pointerup` 时向 Undo 栈提交一条记录；镜头平移/缩放绝不污染撤销栈；按 `Esc` 立即回滚当前手势。
- **语义子元素编辑与编辑模式 (`src/utils/canvasCommands.ts`)**
  - 支持双击进入内部元素编辑 (`array-cell`, `matrix-cell`, `dp-cell`, `graph-node`, `tree-node`)。
  - 三种显式编辑模式：`visual`（纯样式/布局，不影响执行轨迹）、`data`（修改语义输入并标记 `scene.traceStale = true`，提示一键重新推演）、`step`（仅覆写当前步骤快照并标明 `manual` 来源）。
- **视口 / 画布 / 画板三层分离与自适应 (`src/utils/canvasViewport.ts`)**
  - 支持 `infinite`（无限画布）、`auto-fit`（含负坐标、旋转外接框、边框阴影安全边距自适应包络）、`fixed`（`16:9 / 4:3 / 1:1 / 9:16 / A4 / A3 / custom` 与越界修复）、`multi`（多画板与全画板批量导出）。
  - 集成 `ResizeObserver`：窗口或侧边栏折叠缩放时仅重算视口呈现，绝不改动元素逻辑坐标；时间轴播放期间锁定镜头与画板尺寸，防止界面抖动。
- **跨平台快捷键注册表 (`src/utils/shortcutRegistry.ts`)**
  - 支持 `global / canvas / presentation` 三级作用域与优先级解析、冲突检测、JSON 导入/导出与自定义录制。
  - 内置输入法与焦点防护 (`isTextEditingFocused`)：中文输入法合成 (`isComposing` / `keyCode === 229`) 及文本框/CodeMirror 编辑状态下严格屏蔽单字母快捷键误触。
- **智能连线 (`SmartConnector`)**
  - 绑定节点 ID 与锚点方向 (`auto / top / right / bottom / left / center`)，支持直线/正交折线/贝塞尔曲线、单双箭头、平行边自动错开与自环，节点移动或删除时自动跟随更新与级联清理。
