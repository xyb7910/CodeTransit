import {
  AlgoCanvasItem,
  AlgoComponentPayload,
  AlgorithmEvent,
  AlgoStep,
  AlgoVariable,
  SceneSchema,
} from '../types/algorithmStudio';
import {
  AlgorithmSceneDSL,
  DEFAULT_DSL_LIMITS,
  DslExecutionResult,
  DslLimits,
  DslStatement,
} from '../types/algorithmDsl';
import { createDefaultAlgoItem } from '../constants/algorithmTemplates';
import {
  applySemanticOperation,
  createSnapshotMap,
  syncVariableWatcherInItems,
} from './semanticRegistry';

const BLOCKED_IDENTIFIERS = new Set([
  'eval',
  'Function',
  'window',
  'document',
  'globalThis',
  'process',
  'require',
  'import',
  '__proto__',
  'constructor',
  'prototype',
  'fetch',
  'XMLHttpRequest',
  'localStorage',
  'indexedDB',
]);

type TokenType =
  | 'num'
  | 'str'
  | 'bool'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'comma'
  | 'qmark'
  | 'colon';

interface Token {
  type: TokenType;
  value: string;
}

function tokenizeExpr(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    // String literal "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let s = '';
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          i++;
          s += expr[i++];
        } else {
          s += expr[i++];
        }
      }
      if (i >= expr.length) throw new Error('未闭合的字符串字面量');
      i++;
      tokens.push({ type: 'str', value: s });
      continue;
    }
    // Number literal
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i + 1] || ''))) {
      let numStr = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        numStr += expr[i++];
      }
      tokens.push({ type: 'num', value: numStr });
      continue;
    }
    // Identifier / boolean
    if (/[A-Za-z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) {
        id += expr[i++];
      }
      if (BLOCKED_IDENTIFIERS.has(id)) {
        throw new Error(`受限 DSL 禁止使用危险标识符: ${id}`);
      }
      if (id === 'true' || id === 'false') {
        tokens.push({ type: 'bool', value: id });
      } else {
        tokens.push({ type: 'ident', value: id });
      }
      continue;
    }
    // Multi-char operators
    const two = expr.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/%<>!'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(') { tokens.push({ type: 'lparen', value: ch }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen', value: ch }); i++; continue; }
    if (ch === '[') { tokens.push({ type: 'lbracket', value: ch }); i++; continue; }
    if (ch === ']') { tokens.push({ type: 'rbracket', value: ch }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ch }); i++; continue; }
    if (ch === '?') { tokens.push({ type: 'qmark', value: ch }); i++; continue; }
    if (ch === ':') { tokens.push({ type: 'colon', value: ch }); i++; continue; }

    throw new Error(`非法字符 "${ch}" 出现在表达式: ${expr}`);
  }
  return tokens;
}

class SafeExprParser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private env: Record<string, unknown>,
    private depth = 0
  ) {}

  parse(): unknown {
    const val = this.parseTernary();
    if (this.pos < this.tokens.length) {
      throw new Error(`表达式末尾有多余符号: ${this.tokens[this.pos].value}`);
    }
    return val;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private matchOp(ops: string[]): string | null {
    const t = this.peek();
    if (t && t.type === 'op' && ops.includes(t.value)) {
      this.pos++;
      return t.value;
    }
    return null;
  }

  private parseTernary(): unknown {
    const cond = this.parseOr();
    if (this.peek()?.type === 'qmark') {
      this.consume();
      const a = this.parseTernary();
      if (this.peek()?.type !== 'colon') throw new Error('三元表达式缺少 ":"');
      this.consume();
      const b = this.parseTernary();
      return Boolean(cond) ? a : b;
    }
    return cond;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.matchOp(['||'])) {
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseEquality();
    while (this.matchOp(['&&'])) {
      const right = this.parseEquality();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseEquality(): unknown {
    let left = this.parseRelational();
    let op: string | null;
    while ((op = this.matchOp(['==', '!=']))) {
      const right = this.parseRelational();
      left = op === '==' ? left === right : left !== right;
    }
    return left;
  }

  private parseRelational(): unknown {
    let left = this.parseAdd();
    let op: string | null;
    while ((op = this.matchOp(['<', '<=', '>', '>=']))) {
      const right = this.parseAdd();
      const l = Number(left);
      const r = Number(right);
      if (op === '<') left = l < r;
      else if (op === '<=') left = l <= r;
      else if (op === '>') left = l > r;
      else left = l >= r;
    }
    return left;
  }

  private parseAdd(): unknown {
    let left = this.parseMul();
    let op: string | null;
    while ((op = this.matchOp(['+', '-']))) {
      const right = this.parseMul();
      if (op === '+') {
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left) + String(right);
        } else {
          left = Number(left) + Number(right);
        }
      } else {
        left = Number(left) - Number(right);
      }
    }
    return left;
  }

  private parseMul(): unknown {
    let left = this.parseUnary();
    let op: string | null;
    while ((op = this.matchOp(['*', '/', '%']))) {
      const right = this.parseUnary();
      const l = Number(left);
      const r = Number(right);
      if (op === '*') left = l * r;
      else if (op === '/') {
        if (r === 0) throw new Error('除数不能为 0');
        left = l / r;
      } else {
        if (r === 0) throw new Error('取模除数不能为 0');
        left = l % r;
      }
    }
    return left;
  }

  private parseUnary(): unknown {
    const op = this.matchOp(['-', '+', '!']);
    if (op === '-') return -Number(this.parseUnary());
    if (op === '+') return +Number(this.parseUnary());
    if (op === '!') return !Boolean(this.parseUnary());
    return this.parsePostfix();
  }

  private parsePostfix(): unknown {
    let val = this.parsePrimary();
    while (this.peek()?.type === 'lbracket') {
      this.consume();
      const idxRaw = this.parseTernary();
      if (this.peek()?.type !== 'rbracket') throw new Error('缺少右括号 "]"');
      this.consume();
      const idx = Math.trunc(Number(idxRaw));
      if (!Array.isArray(val) && typeof val !== 'string') {
        throw new Error('尝试对非数组对象执行下标访问');
      }
      if (!Number.isFinite(idx) || idx < 0 || idx >= val.length) {
        throw new Error(`DSL 数组下标越界: ${idx} (长度 ${val.length})`);
      }
      val = val[idx];
    }
    return val;
  }

  private parsePrimary(): unknown {
    const t = this.peek();
    if (!t) throw new Error('表达式意外结束');
    if (t.type === 'num') {
      this.consume();
      return Number(t.value);
    }
    if (t.type === 'str') {
      this.consume();
      return t.value;
    }
    if (t.type === 'bool') {
      this.consume();
      return t.value === 'true';
    }
    if (t.type === 'lparen') {
      this.consume();
      if (this.depth > 32) throw new Error('表达式嵌套深度超限');
      this.depth++;
      const v = this.parseTernary();
      this.depth--;
      if (this.peek()?.type !== 'rparen') throw new Error('缺少右括号 ")"');
      this.consume();
      return v;
    }
    if (t.type === 'ident') {
      this.consume();
      const name = t.value;
      if (this.peek()?.type === 'lparen') {
        // Pure function call
        this.consume();
        const args: unknown[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseTernary());
          while (this.peek()?.type === 'comma') {
            this.consume();
            args.push(this.parseTernary());
          }
        }
        if (this.peek()?.type !== 'rparen') throw new Error(`函数 ${name} 缺少 ")"`);
        this.consume();
        return callBuiltinFunction(name, args);
      }
      if (!(name in this.env)) {
        throw new Error(`未定义变量: ${name}`);
      }
      return this.env[name];
    }
    throw new Error(`无法解析的符号: ${t.value}`);
  }
}

function callBuiltinFunction(name: string, args: unknown[]): unknown {
  switch (name) {
    case 'min':
      return Math.min(...args.map(Number));
    case 'max':
      return Math.max(...args.map(Number));
    case 'abs':
      return Math.abs(Number(args[0]));
    case 'floor':
      return Math.floor(Number(args[0]));
    case 'ceil':
      return Math.ceil(Number(args[0]));
    case 'round':
      return Math.round(Number(args[0]));
    case 'intdiv': {
      const a = Number(args[0]);
      const b = Number(args[1]);
      if (b === 0) throw new Error('intdiv 除数不能为 0');
      return Math.trunc(a / b);
    }
    case 'len': {
      const target = args[0];
      if (Array.isArray(target) || typeof target === 'string') return target.length;
      return 0;
    }
    case 'clamp':
      return Math.min(Number(args[2]), Math.max(Number(args[1]), Number(args[0])));
    case 'str':
      return String(args[0] ?? '');
    case 'num':
      return Number(args[0] ?? 0);
    case 'empty':
      return Array.isArray(args[0]) ? args[0].length === 0 : !args[0];
    case 'top':
      return Array.isArray(args[0]) && args[0].length > 0 ? args[0][args[0].length - 1] : null;
    default:
      throw new Error(`受限 DSL 不支持函数: ${name}`);
  }
}

export function evaluateSafeExpression(expr: string, env: Record<string, unknown>): unknown {
  const tokens = tokenizeExpr(expr);
  if (tokens.length === 0) return undefined;
  return new SafeExprParser(tokens, env).parse();
}

function formatVarValue(v: unknown): string {
  if (Array.isArray(v)) {
    if (v.length > 0 && Array.isArray(v[0])) {
      return `[${v.length}x${(v[0] as unknown[]).length}]`;
    }
    return `[${v.slice(0, 8).join(', ')}${v.length > 8 ? ', ...' : ''}]`;
  }
  return String(v);
}

function buildInitialPayloadForComponent(
  comp: AlgorithmSceneDSL['components'][number],
  env: Record<string, unknown>
): AlgoComponentPayload {
  if (comp.initialPayload) {
    return structuredClone(comp.initialPayload);
  }
  const base = createDefaultAlgoItem(comp.componentType, comp.x, comp.y, comp.id);
  const boundVal = comp.boundVar ? env[comp.boundVar] : undefined;
  if (base.payload.kind === 'array' && Array.isArray(boundVal)) {
    base.payload.data.items = structuredClone(boundVal as Array<string | number>);
  } else if ((base.payload.kind === 'matrix' || base.payload.kind === 'dp') && Array.isArray(boundVal)) {
    base.payload.data.rows = structuredClone(boundVal as Array<Array<string | number>>);
  }
  return base.payload;
}

export function compileDslToScene(
  dsl: AlgorithmSceneDSL,
  authorOverride?: string
): DslExecutionResult {
  const startTime = Date.now();
  const limits: DslLimits = {
    ...DEFAULT_DSL_LIMITS,
    maxSteps: Math.min(500, Math.max(1, dsl.limits?.maxSteps ?? DEFAULT_DSL_LIMITS.maxSteps)),
    maxDepth: Math.min(64, Math.max(1, dsl.limits?.maxDepth ?? DEFAULT_DSL_LIMITS.maxDepth)),
    maxMemoryCells: Math.min(20000, Math.max(16, dsl.limits?.maxMemoryCells ?? DEFAULT_DSL_LIMITS.maxMemoryCells)),
    maxArraySize: Math.min(512, Math.max(4, dsl.limits?.maxArraySize ?? DEFAULT_DSL_LIMITS.maxArraySize)),
    maxTimeMs: Math.min(5000, Math.max(50, dsl.limits?.maxTimeMs ?? DEFAULT_DSL_LIMITS.maxTimeMs)),
  };

  // Initialize environment from input fields + state variables
  const env: Record<string, unknown> = {};
  const watchOrder: string[] = [];

  for (const field of dsl.input.fields) {
    env[field.name] = structuredClone(field.defaultValue);
    if (typeof field.defaultValue === 'number' || typeof field.defaultValue === 'string') {
      watchOrder.push(field.name);
    }
  }
  for (const sv of dsl.state.variables) {
    env[sv.name] = structuredClone(sv.initial);
    watchOrder.push(sv.name);
  }

  // Build live canvas items
  let liveItems: AlgoCanvasItem[] = dsl.components.map((c, idx) => {
    const def = createDefaultAlgoItem(c.componentType, c.x, c.y, c.id);
    return {
      ...def,
      id: c.id,
      type: c.componentType,
      name: c.name,
      x: c.x,
      y: c.y,
      width: c.width || def.width,
      height: c.height || def.height,
      zIndex: idx + 1,
      coachOnly: Boolean(c.coachOnly),
      payload: buildInitialPayloadForComponent(c, env),
    };
  });

  const steps: AlgoStep[] = [];
  let pendingEvents: AlgorithmEvent[] = [];
  let opsExecuted = 0;
  let maxDepthReached = 0;
  let prevVarStrings: Record<string, string> = {};

  const checkGuards = (depth: number) => {
    opsExecuted++;
    maxDepthReached = Math.max(maxDepthReached, depth);
    if (depth > limits.maxDepth) {
      throw new Error(`执行嵌套/递归深度超过上限 (${limits.maxDepth})`);
    }
    if (Date.now() - startTime > limits.maxTimeMs) {
      throw new Error(`DSL 解释器执行超时 (> ${limits.maxTimeMs}ms)，请检查是否存在死循环`);
    }
    if (opsExecuted > limits.maxSteps * 40) {
      throw new Error(`DSL 原子操作总次数超过安全上限 (${limits.maxSteps * 40})`);
    }
  };

  const getWatchedVariables = (): AlgoVariable[] => {
    const vars: AlgoVariable[] = [];
    for (const key of watchOrder) {
      const val = env[key];
      const str = formatVarValue(val);
      vars.push({
        name: key,
        value: str,
        changed: prevVarStrings[key] !== undefined && prevVarStrings[key] !== str,
      });
    }
    return vars;
  };

  const commitStep = (
    title: string,
    explanation: string,
    codeLines: number[],
    formulaLatex?: string,
    coachNote?: string,
    durationMs?: number
  ) => {
    if (steps.length >= limits.maxSteps) {
      throw new Error(`生成步骤数超过 DSL 安全上限 (${limits.maxSteps})`);
    }
    const vars = getWatchedVariables();
    liveItems = syncVariableWatcherInItems(liveItems, vars);
    const stepIndex = steps.length;
    steps.push({
      id: `dsl-step-${stepIndex}`,
      index: stepIndex,
      title,
      explanation,
      coachNote,
      formulaLatex,
      codeLines,
      durationMs: durationMs || dsl.timeline.defaultDurationMs || 750,
      animationStyle: dsl.timeline.animationStyle || 'smooth',
      highlights: {},
      events: pendingEvents,
      snapshot: {
        artboardItems: createSnapshotMap(liveItems),
        variables: vars,
      },
    });
    pendingEvents = [];
    const nextPrev: Record<string, string> = {};
    for (const v of vars) nextPrev[v.name] = v.value;
    prevVarStrings = nextPrev;
  };

  const execStmt = (stmt: DslStatement, depth: number) => {
    checkGuards(depth);
    const stepIndex = steps.length;

    switch (stmt.op) {
      case 'set': {
        if (BLOCKED_IDENTIFIERS.has(stmt.varName)) {
          throw new Error(`禁止修改保留名称: ${stmt.varName}`);
        }
        const val = evaluateSafeExpression(stmt.expr, env);
        env[stmt.varName] = val;
        if (!watchOrder.includes(stmt.varName)) watchOrder.push(stmt.varName);
        pendingEvents.push({
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          type: 'assign',
          message: `${stmt.varName} = ${formatVarValue(val)}`,
          timestampStep: stepIndex,
        });
        break;
      }

      case 'arraySet': {
        const arr = env[stmt.target];
        if (!Array.isArray(arr)) throw new Error(`${stmt.target} 不是数组`);
        const idx = Math.trunc(Number(evaluateSafeExpression(stmt.indexExpr, env)));
        if (idx < 0 || idx >= arr.length || idx >= limits.maxArraySize) {
          throw new Error(`数组 ${stmt.target}[${idx}] 写入越界 (长度 ${arr.length})`);
        }
        const val = evaluateSafeExpression(stmt.valueExpr, env) as string | number;
        arr[idx] = val;
        if (stmt.componentId) {
          liveItems = liveItems.map((it) => {
            if (it.id !== stmt.componentId) return it;
            const res = applySemanticOperation(it, {
              kind: 'write-array',
              index: idx,
              value: val,
              color: stmt.highlight || 'yellow',
              stepIndex,
            });
            pendingEvents.push(...res.events);
            return { ...it, payload: res.payload };
          });
        }
        break;
      }

      case 'matrixSet': {
        const mat = env[stmt.target];
        if (!Array.isArray(mat)) throw new Error(`${stmt.target} 不是二维矩阵`);
        const r = Math.trunc(Number(evaluateSafeExpression(stmt.rowExpr, env)));
        const c = Math.trunc(Number(evaluateSafeExpression(stmt.colExpr, env)));
        if (r < 0 || r >= mat.length || !Array.isArray(mat[r]) || c < 0 || c >= mat[r].length) {
          throw new Error(`矩阵 ${stmt.target}[${r}][${c}] 写入越界`);
        }
        const val = evaluateSafeExpression(stmt.valueExpr, env) as string | number;
        (mat[r] as unknown[])[c] = val;
        if (stmt.componentId) {
          liveItems = liveItems.map((it) => {
            if (it.id !== stmt.componentId) return it;
            const res = applySemanticOperation(it, {
              kind: 'write-cell',
              row: r,
              col: c,
              value: val,
              color: stmt.highlight || 'yellow',
              stepIndex,
            });
            pendingEvents.push(...res.events);
            return { ...it, payload: res.payload };
          });
        }
        break;
      }

      case 'swap': {
        const arr = env[stmt.target];
        if (!Array.isArray(arr)) throw new Error(`${stmt.target} 不是数组`);
        const i = Math.trunc(Number(evaluateSafeExpression(stmt.iExpr, env)));
        const j = Math.trunc(Number(evaluateSafeExpression(stmt.jExpr, env)));
        if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) {
          throw new Error(`swap(${i}, ${j}) 越界`);
        }
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
        if (stmt.componentId) {
          liveItems = liveItems.map((it) => {
            if (it.id !== stmt.componentId) return it;
            const res = applySemanticOperation(it, {
              kind: 'swap',
              index: i,
              index2: j,
              stepIndex,
            });
            pendingEvents.push(...res.events);
            return { ...it, payload: res.payload };
          });
        }
        break;
      }

      case 'push':
      case 'enqueue': {
        const arr = env[stmt.target];
        if (!Array.isArray(arr)) throw new Error(`${stmt.target} 不是线性结构数组`);
        if (arr.length >= limits.maxArraySize) throw new Error(`${stmt.target} 超出容器最大容量`);
        const val = evaluateSafeExpression(stmt.valueExpr, env) as string | number;
        arr.push(val);
        if (stmt.componentId) {
          liveItems = liveItems.map((it) => {
            if (it.id !== stmt.componentId) return it;
            const res = applySemanticOperation(it, {
              kind: stmt.op,
              value: val,
              stepIndex,
            });
            pendingEvents.push(...res.events);
            return { ...it, payload: res.payload };
          });
        }
        break;
      }

      case 'pop':
      case 'dequeue': {
        const arr = env[stmt.target];
        if (!Array.isArray(arr) || arr.length === 0) throw new Error(`${stmt.target} 为空`);
        const popped = stmt.op === 'dequeue' ? arr.shift() : arr.pop();
        if (stmt.assignVar) env[stmt.assignVar] = popped;
        if (stmt.componentId) {
          liveItems = liveItems.map((it) => {
            if (it.id !== stmt.componentId) return it;
            const res = applySemanticOperation(it, {
              kind: stmt.op,
              stepIndex,
            });
            pendingEvents.push(...res.events);
            return { ...it, payload: res.payload };
          });
        }
        break;
      }

      case 'highlight': {
        const indices = stmt.indicesExpr?.map((ex) =>
          Math.trunc(Number(evaluateSafeExpression(ex, env)))
        );
        const cells: Array<[number, number]> | undefined = stmt.cellExpr
          ? [[
              Math.trunc(Number(evaluateSafeExpression(stmt.cellExpr[0], env))),
              Math.trunc(Number(evaluateSafeExpression(stmt.cellExpr[1], env))),
            ]]
          : undefined;
        liveItems = liveItems.map((it) => {
          if (it.id !== stmt.componentId) return it;
          const res = applySemanticOperation(it, {
            kind: 'highlight',
            indices,
            cells,
            color: stmt.color || 'blue',
            stepIndex,
          });
          pendingEvents.push(...res.events);
          return { ...it, payload: res.payload };
        });
        break;
      }

      case 'emit': {
        const msg = String(evaluateSafeExpression(stmt.messageExpr, env) ?? '');
        pendingEvents.push({
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          type: stmt.eventType,
          targetId: stmt.targetId,
          message: msg,
          timestampStep: stepIndex,
        });
        break;
      }

      case 'if': {
        const ok = Boolean(evaluateSafeExpression(stmt.condition, env));
        const branch = ok ? stmt.thenOps : stmt.elseOps || [];
        for (const sub of branch) {
          execStmt(sub, depth + 1);
        }
        break;
      }

      case 'for': {
        const start = Math.trunc(Number(evaluateSafeExpression(stmt.fromExpr, env)));
        const end = Math.trunc(Number(evaluateSafeExpression(stmt.toExpr, env)));
        const step = stmt.stepExpr ? Math.trunc(Number(evaluateSafeExpression(stmt.stepExpr, env))) : 1;
        if (step === 0) throw new Error('for 循环步长不能为 0');
        let iterCount = 0;
        const cond = (val: number) => {
          if (step > 0) return stmt.inclusive ? val <= end : val < end;
          return stmt.inclusive ? val >= end : val > end;
        };
        for (let v = start; cond(v); v += step) {
          if (++iterCount > limits.maxSteps * 4) {
            throw new Error(`for 循环次数超过安全限制 (${limits.maxSteps * 4})`);
          }
          env[stmt.varName] = v;
          if (!watchOrder.includes(stmt.varName)) watchOrder.push(stmt.varName);
          for (const sub of stmt.body) {
            execStmt(sub, depth + 1);
          }
        }
        break;
      }

      case 'while': {
        const maxIter = Math.min(limits.maxSteps * 2, stmt.maxIter ?? 100);
        let iterCount = 0;
        while (Boolean(evaluateSafeExpression(stmt.condition, env))) {
          if (++iterCount > maxIter) {
            throw new Error(`while 循环超过安全迭代上限 (${maxIter})`);
          }
          for (const sub of stmt.body) {
            execStmt(sub, depth + 1);
          }
        }
        break;
      }

      case 'step': {
        const title = String(evaluateSafeExpression(stmt.titleExpr, env) ?? `Step ${steps.length + 1}`);
        const explanation = String(evaluateSafeExpression(stmt.explanationExpr, env) ?? '');
        commitStep(
          title,
          explanation,
          stmt.codeLines || [],
          stmt.formulaLatex,
          stmt.coachNote,
          stmt.durationMs
        );
        break;
      }
    }
  };

  try {
    for (const stmt of dsl.operations) {
      execStmt(stmt, 1);
    }

    if (steps.length === 0) {
      commitStep(
        dsl.scene.name,
        '规则执行完成（未显式声明 step，已自动采集最终状态快照）',
        []
      );
    }

    const actualOutput = dsl.output.expression
      ? String(evaluateSafeExpression(dsl.output.expression, env) ?? '')
      : '';

    const firstSnap = steps[0].snapshot.artboardItems;
    const initialItems = liveItems.map((it) =>
      firstSnap[it.id] ? { ...it, payload: structuredClone(firstSnap[it.id]) } : it
    );

    const builtScene: SceneSchema = {
      version: '2.0.0',
      id: dsl.scene.id || `scene-dsl-${Date.now()}`,
      name: dsl.scene.name,
      tier: dsl.scene.tier,
      templateId: dsl.scene.id,
      traceMode: 'dsl',
      traceSource: 'dsl',
      language: dsl.scene.language || 'cpp17',
      linkedCode: dsl.scene.linkedCode,
      formulaLatex: dsl.scene.formulaLatex,
      artboards: [
        {
          id: 'board-1',
          name: '主画板 Main',
          width: 980,
          height: 620,
          background: dsl.theme.background || '#0F141E',
          items: initialItems,
        },
      ],
      activeArtboardId: 'board-1',
      steps,
      currentStepIndex: 0,
      teaching: {
        tier: dsl.scene.teachingTier || 'CSP-J',
        style: dsl.scene.teachingStyle || 'deductive',
        viewRole: 'coach',
      },
      expectedOutput: dsl.input.expectedOutput,
      actualOutput,
      author: {
        enabled: true,
        name: authorOverride || dsl.scene.author || 'Yanpb',
      },
      updatedAt: Date.now(),
    };

    return {
      ok: true,
      scene: builtScene,
      steps,
      items: initialItems,
      actualOutput,
      stats: {
        stepsGenerated: steps.length,
        opsExecuted,
        elapsedMs: Date.now() - startTime,
        maxDepthReached,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stats: {
        stepsGenerated: steps.length,
        opsExecuted,
        elapsedMs: Date.now() - startTime,
        maxDepthReached,
      },
    };
  }
}
