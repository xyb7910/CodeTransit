import { GoogleGenAI, Type } from '@google/genai';

export type SupportedAIProvider = 'gemini' | 'openai-compatible';

export interface UserRuntimeAIConfig {
  provider: SupportedAIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface AIPlanRequest {
  mode: string;
  naturalLanguage?: string;
  cppCode?: string;
  markdownSolution?: string;
  sampleInput?: string;
  sampleOutput?: string;
  formulaLatex?: string;
  teachingTier?: string;
}

export interface AIGenerateSceneRequest {
  planSummary: string;
  naturalLanguage?: string;
  cppCode?: string;
  sampleInput?: string;
  sampleOutput?: string;
  teachingTier?: string;
  teachingStyle?: string;
}

export interface AIPatchSceneRequest {
  prompt: string;
  sceneSummary: {
    name: string;
    tier: string;
    formulaLatex: string;
    linkedCode: string;
    items: Array<{ id: string; type: string; name: string; locked: boolean; x: number; y: number }>;
    steps: Array<{ index: number; id: string; title: string; explanation: string; codeLines: number[] }>;
  };
}

export interface AIProviderStatus {
  requiresFrontendKey: boolean;
  supportedProviders: SupportedAIProvider[];
  defaultGeminiModel: string;
}

export interface AIProvider {
  getStatus(): AIProviderStatus;
  verifyConnection(cfg: UserRuntimeAIConfig): Promise<{ ok: boolean; provider: SupportedAIProvider; model: string }>;
  generatePlan(cfg: UserRuntimeAIConfig, req: AIPlanRequest): Promise<unknown>;
  generateSceneDsl(cfg: UserRuntimeAIConfig, req: AIGenerateSceneRequest): Promise<unknown>;
  generateScenePatch(cfg: UserRuntimeAIConfig, req: AIPatchSceneRequest): Promise<unknown>;
}

const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

export class MissingApiKeyError extends Error {
  readonly code = 'USER_API_KEY_REQUIRED';
  constructor() {
    super('请先在前端提供有效的 API Key 后再使用 AI 功能。');
  }
}

export class InvalidBaseUrlError extends Error {
  readonly code = 'INVALID_BASE_URL';
  constructor(msg: string) {
    super(msg);
  }
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  // IPv4 literal checks
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  // IPv6 ULA / link-local
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) {
    return true;
  }
  return false;
}

export function sanitizeOpenAIBaseUrl(rawUrl?: string): string {
  const candidate = (rawUrl || '').trim() || DEFAULT_OPENAI_BASE_URL;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new InvalidBaseUrlError('Base URL 格式无效，请填写完整的 HTTPS 地址。');
  }
  if (parsed.protocol !== 'https:') {
    throw new InvalidBaseUrlError('出于安全规范，自定义 API Base URL 仅支持 HTTPS 协议。');
  }
  if (parsed.username || parsed.password) {
    throw new InvalidBaseUrlError('Base URL 中禁止内嵌认证凭据。');
  }
  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new InvalidBaseUrlError('Base URL 禁止指向本地回环或内网地址。');
  }
  return parsed.toString().replace(/\/+$/, '');
}

function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return trimmed;
}

async function callOpenAICompatibleJson(
  cfg: UserRuntimeAIConfig,
  systemInstruction: string,
  userPrompt: string
): Promise<unknown> {
  const baseUrl = sanitizeOpenAIBaseUrl(cfg.baseUrl);
  const model = (cfg.model || '').trim() || DEFAULT_OPENAI_MODEL;
  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `${systemInstruction}\n请只输出合法的 JSON 对象，不要包含额外解释文本。` },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`模型接口返回错误 (${response.status}): ${errText.slice(0, 240) || response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('模型服务未返回有效 JSON 内容');
  }
  return JSON.parse(stripJsonCodeFences(content));
}

export class DynamicUserKeyAIProvider implements AIProvider {
  private requireKey(cfg: UserRuntimeAIConfig): string {
    const key = (cfg.apiKey || '').trim();
    if (!key) {
      throw new MissingApiKeyError();
    }
    return key;
  }

  private getGeminiClient(apiKey: string): GoogleGenAI {
    return new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }

  getStatus(): AIProviderStatus {
    return {
      requiresFrontendKey: true,
      supportedProviders: ['gemini', 'openai-compatible'],
      defaultGeminiModel: DEFAULT_GEMINI_MODEL,
    };
  }

  async verifyConnection(
    cfg: UserRuntimeAIConfig
  ): Promise<{ ok: boolean; provider: SupportedAIProvider; model: string }> {
    const apiKey = this.requireKey(cfg);
    if (cfg.provider === 'openai-compatible') {
      const baseUrl = sanitizeOpenAIBaseUrl(cfg.baseUrl);
      const model = (cfg.model || '').trim() || DEFAULT_OPENAI_MODEL;
      const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Reply with OK' }],
          max_tokens: 8,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(`校验失败 (${res.status}): ${msg.slice(0, 200) || res.statusText}`);
      }
      return { ok: true, provider: 'openai-compatible', model };
    }

    const model = (cfg.model || '').trim() || DEFAULT_GEMINI_MODEL;
    const ai = this.getGeminiClient(apiKey);
    const res = await ai.models.generateContent({
      model,
      contents: 'Reply with OK',
    });
    if (!res.text) {
      throw new Error('Gemini API 未返回有效响应');
    }
    return { ok: true, provider: 'gemini', model };
  }

  async generatePlan(cfg: UserRuntimeAIConfig, req: AIPlanRequest): Promise<unknown> {
    const apiKey = this.requireKey(cfg);
    const promptText = [
      `创作模式: ${req.mode}`,
      `教学层级: ${req.teachingTier || 'CSP-J'}`,
      req.naturalLanguage ? `自然语言需求:\n${req.naturalLanguage}` : '',
      req.cppCode ? `C++17 参考代码(仅作静态分析):\n${req.cppCode}` : '',
      req.markdownSolution ? `Markdown 题解:\n${req.markdownSolution}` : '',
      req.sampleInput ? `输入样例:\n${req.sampleInput}` : '',
      req.sampleOutput ? `期望输出:\n${req.sampleOutput}` : '',
      req.formulaLatex ? `数学公式:\n${req.formulaLatex}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const systemInstruction =
      '你是面向 CSP-J/S、NOIP、ACM 的算法教学架构师。根据用户输入生成严谨的“算法可视化设计方案”(JSON，字段包括 title, detectedAlgorithm, confidenceNote, recommendedComponents, stages)。必须如实说明任何静态分析均非真实 C++ 编译运行。stages 必须包含 inputUnderstanding, algorithmRecognition, dsModeling, stateDesign, opsAndEvents, visualLayout 六个阶段，每个阶段包含 key, title, summary, details(字符串数组), editableText。';

    if (cfg.provider === 'openai-compatible') {
      return callOpenAICompatibleJson(cfg, systemInstruction, promptText);
    }

    const model = (cfg.model || '').trim() || DEFAULT_GEMINI_MODEL;
    const ai = this.getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            detectedAlgorithm: { type: Type.STRING },
            confidenceNote: { type: Type.STRING },
            recommendedComponents: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            stages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  details: { type: Type.ARRAY, items: { type: Type.STRING } },
                  editableText: { type: Type.STRING },
                },
                required: ['key', 'title', 'summary', 'details', 'editableText'],
              },
            },
          },
          required: ['title', 'detectedAlgorithm', 'confidenceNote', 'recommendedComponents', 'stages'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('AI 服务未返回有效规划内容');
    }
    return JSON.parse(stripJsonCodeFences(text));
  }

  async generateSceneDsl(cfg: UserRuntimeAIConfig, req: AIGenerateSceneRequest): Promise<unknown> {
    const apiKey = this.requireKey(cfg);
    const promptText = [
      `已审核设计方案:\n${req.planSummary}`,
      req.naturalLanguage ? `需求补充:\n${req.naturalLanguage}` : '',
      req.cppCode ? `参考代码:\n${req.cppCode}` : '',
      req.sampleInput ? `输入样例:\n${req.sampleInput}` : '',
      req.sampleOutput ? `期望输出:\n${req.sampleOutput}` : '',
      `教学层级: ${req.teachingTier || 'CSP-J'}, 教学风格: ${req.teachingStyle || 'deductive'}`,
      '请生成完整可执行或可审核的 Algorithm Scene DSL JSON（version 固定 "2.0.0"）。',
      '注意 components 中 semanticType 从 SmartArray / SmartMatrix / SmartStack / SmartQueue / SmartLinkedList / SmartTree / SmartGraph / SmartDPTable / SmartRecursion / SmartHeap / SmartUnionFind / SmartPointer / SmartVariable / SmartFormula / SmartGrid 选择；',
      'operations 仅使用安全受限语句 op: set | arraySet | matrixSet | swap | push | pop | highlight | emit | if | for | while | step。',
      '所有表达式仅使用数字、变量名、数组下标 a[i]、加减乘除取模比较和 min/max/abs/len，禁止任何 JS 代码。',
    ]
      .filter(Boolean)
      .join('\n\n');

    const systemInstruction =
      '你是 Algorithm Scene DSL 2.0 编译器助手。输出严格的 JSON 字符串（符合 AlgorithmSceneDSL 结构，含 version:"2.0.0", scene, input, state, components, operations, output），确保数组和矩阵坐标不越界、步骤数控制在 30 步以内，且每个步骤有清晰中文讲解与 codeLines。';

    if (cfg.provider === 'openai-compatible') {
      return callOpenAICompatibleJson(cfg, systemInstruction, promptText);
    }

    const model = (cfg.model || '').trim() || DEFAULT_GEMINI_MODEL;
    const ai = this.getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('AI 服务未返回有效 DSL 场景数据');
    }
    return JSON.parse(stripJsonCodeFences(text));
  }

  async generateScenePatch(cfg: UserRuntimeAIConfig, req: AIPatchSceneRequest): Promise<unknown> {
    const apiKey = this.requireKey(cfg);
    const promptText = [
      `用户二次修改要求:\n${req.prompt}`,
      `当前场景摘要:\n${JSON.stringify(req.sceneSummary, null, 2)}`,
      '禁止修改 locked=true 的组件！如果用户要求修改已锁定组件，请在 explanation 中提示原因且不要生成针对该 targetId 的修改 op。',
    ].join('\n\n');

    const systemInstruction =
      '输出结构化 JSON Patch（explanation 和 ops 数组），支持局部修改步骤讲解、高亮、代码行关联、公式、新增/修改未锁定组件。op 类型仅限: update-meta, add-item, update-item, remove-item, update-step, add-step, remove-step, update-code。每个 op 含 id, op, targetId, stepIndex, summary, beforePreview, afterPreview, payloadJson（或 payload 对象）。';

    if (cfg.provider === 'openai-compatible') {
      const raw = (await callOpenAICompatibleJson(cfg, systemInstruction, promptText)) as {
        explanation?: string;
        ops?: Array<Record<string, unknown>>;
      };
      return {
        explanation: raw.explanation || '局部变更方案已生成',
        ops: (raw.ops || []).map((o, idx) => {
          let parsedPayload: Record<string, unknown> = {};
          if (o.payload && typeof o.payload === 'object') {
            parsedPayload = o.payload as Record<string, unknown>;
          } else if (typeof o.payloadJson === 'string') {
            try {
              parsedPayload = JSON.parse(o.payloadJson) as Record<string, unknown>;
            } catch {
              parsedPayload = {};
            }
          }
          return {
            id: typeof o.id === 'string' && o.id ? o.id : `patch-${Date.now()}-${idx}`,
            op: String(o.op || 'update-step'),
            targetId: typeof o.targetId === 'string' ? o.targetId : undefined,
            stepIndex: typeof o.stepIndex === 'number' ? o.stepIndex : undefined,
            summary: String(o.summary || 'AI 局部修改'),
            beforePreview: typeof o.beforePreview === 'string' ? o.beforePreview : undefined,
            afterPreview: typeof o.afterPreview === 'string' ? o.afterPreview : undefined,
            payload: parsedPayload,
          };
        }),
      };
    }

    const model = (cfg.model || '').trim() || DEFAULT_GEMINI_MODEL;
    const ai = this.getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            ops: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  op: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                  stepIndex: { type: Type.INTEGER },
                  summary: { type: Type.STRING },
                  beforePreview: { type: Type.STRING },
                  afterPreview: { type: Type.STRING },
                  payloadJson: { type: Type.STRING },
                },
                required: ['id', 'op', 'summary', 'payloadJson'],
              },
            },
          },
          required: ['explanation', 'ops'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('AI 服务未返回局部 Patch');
    }
    const raw = JSON.parse(stripJsonCodeFences(text)) as {
      explanation: string;
      ops: Array<{
        id: string;
        op: string;
        targetId?: string;
        stepIndex?: number;
        summary: string;
        beforePreview?: string;
        afterPreview?: string;
        payloadJson: string;
      }>;
    };

    return {
      explanation: raw.explanation,
      ops: (raw.ops || []).map((o, idx) => {
        let parsedPayload: Record<string, unknown> = {};
        try {
          parsedPayload = JSON.parse(o.payloadJson || '{}') as Record<string, unknown>;
        } catch {
          parsedPayload = {};
        }
        return {
          id: o.id || `patch-${Date.now()}-${idx}`,
          op: o.op,
          targetId: o.targetId,
          stepIndex: o.stepIndex,
          summary: o.summary,
          beforePreview: o.beforePreview,
          afterPreview: o.afterPreview,
          payload: parsedPayload,
        };
      }),
    };
  }
}

export function createAIProvider(): AIProvider {
  return new DynamicUserKeyAIProvider();
}
