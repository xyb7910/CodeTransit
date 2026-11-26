import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  createAIProvider,
  InvalidBaseUrlError,
  MissingApiKeyError,
  SupportedAIProvider,
  UserRuntimeAIConfig,
} from './server/aiProvider.ts';

interface TransitRecord {
  code: string;
  payloadType: 'source' | 'workspace';
  payload: unknown;
  readOnly: boolean;
  passwordHash: string | null;
  maxViews: number | null;
  viewsUsed: number;
  burnAfterRead: boolean;
  createdAt: number;
  expiresAt: number;
}

interface CloudWorkspaceRecord {
  id: string;
  ownerHash: string;
  title: string;
  updatedAt: number;
  workspace: unknown;
}

interface TransitStoreData {
  transits: Record<string, TransitRecord>;
  cloudWorkspaces: Record<string, CloudWorkspaceRecord>;
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'transit-store.json');
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2MB

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): TransitStoreData {
  ensureDataDir();
  if (!fs.existsSync(STORE_FILE)) {
    return { transits: {}, cloudWorkspaces: {} };
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<TransitStoreData>;
    return {
      transits: parsed.transits && typeof parsed.transits === 'object' ? parsed.transits : {},
      cloudWorkspaces:
        parsed.cloudWorkspaces && typeof parsed.cloudWorkspaces === 'object'
          ? parsed.cloudWorkspaces
          : {},
    };
  } catch {
    return { transits: {}, cloudWorkspaces: {} };
  }
}

function saveStore(store: TransitStoreData): void {
  ensureDataDir();
  const tmpFile = `${STORE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpFile, STORE_FILE);
}

function purgeExpired(store: TransitStoreData): boolean {
  const now = Date.now();
  let changed = false;
  for (const [code, rec] of Object.entries(store.transits)) {
    if (rec.expiresAt <= now || (rec.maxViews !== null && rec.viewsUsed >= rec.maxViews)) {
      delete store.transits[code];
      changed = true;
    }
  }
  return changed;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

function hashSyncKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateUniqueSixDigitCode(store: TransitStoreData): string | null {
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = String(crypto.randomInt(100000, 1000000));
    if (!store.transits[code]) {
      return code;
    }
  }
  return null;
}

// Rate limiter buckets
const rateBuckets = new Map<string, number[]>();
const passwordFailureLock = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = rateBuckets.get(key) ?? [];
  const valid = timestamps.filter((t) => now - t < windowMs);
  if (valid.length >= maxRequests) {
    rateBuckets.set(key, valid);
    return false;
  }
  valid.push(now);
  rateBuckets.set(key, valid);
  return true;
}

function getClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '2.5mb' }));

  const store = loadStore();
  if (purgeExpired(store)) {
    saveStore(store);
  }

  // Periodic sweep every 5 minutes
  setInterval(() => {
    if (purgeExpired(store)) {
      saveStore(store);
    }
  }, 5 * 60 * 1000).unref();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  const aiProvider = createAIProvider();

  function extractUserAiConfig(req: express.Request): UserRuntimeAIConfig {
    const rawKey = req.headers['x-ai-api-key'];
    const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (!apiKey) {
      throw new MissingApiKeyError();
    }
    const rawProvider = req.headers['x-ai-provider'];
    const provider: SupportedAIProvider =
      rawProvider === 'openai-compatible' ? 'openai-compatible' : 'gemini';
    const rawModel = req.headers['x-ai-model'];
    const model = typeof rawModel === 'string' ? rawModel.trim().slice(0, 120) : '';
    const rawBaseUrl = req.headers['x-ai-base-url'];
    const baseUrl = typeof rawBaseUrl === 'string' ? rawBaseUrl.trim().slice(0, 300) : undefined;
    return { provider, apiKey, model, baseUrl };
  }

  app.get('/api/ai/status', (_req, res) => {
    res.json(aiProvider.getStatus());
  });

  app.post('/api/ai/verify', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`ai-verify:${ip}`, 15, 60_000)) {
      res.status(429).json({ error: 'RATE_LIMITED', message: '验证请求过于频繁，请稍后再试' });
      return;
    }
    try {
      const cfg = extractUserAiConfig(req);
      const result = await aiProvider.verifyConnection(cfg);
      res.json(result);
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        res.status(401).json({ error: err.code, message: err.message });
        return;
      }
      if (err instanceof InvalidBaseUrlError) {
        res.status(400).json({ error: err.code, message: err.message });
        return;
      }
      res.status(502).json({
        error: 'AI_VERIFY_FAILED',
        message: err instanceof Error ? err.message : 'API Key 验证失败',
      });
    }
  });

  app.post('/api/ai/plan', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`ai-plan:${ip}`, 20, 60_000)) {
      res.status(429).json({ error: 'RATE_LIMITED', message: 'AI 规划请求过于频繁，请稍后再试' });
      return;
    }
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || body.userConsent !== true) {
      res.status(400).json({
        error: 'CONSENT_REQUIRED',
        message: '调用外部 AI 模型前必须先由用户确认同意发送题目与代码文本',
      });
      return;
    }
    try {
      const cfg = extractUserAiConfig(req);
      const plan = await aiProvider.generatePlan(cfg, {
        mode: typeof body.mode === 'string' ? body.mode : 'natural-language',
        naturalLanguage: typeof body.naturalLanguage === 'string' ? body.naturalLanguage.slice(0, 8000) : '',
        cppCode: typeof body.cppCode === 'string' ? body.cppCode.slice(0, 12000) : '',
        markdownSolution: typeof body.markdownSolution === 'string' ? body.markdownSolution.slice(0, 12000) : '',
        sampleInput: typeof body.sampleInput === 'string' ? body.sampleInput.slice(0, 4000) : '',
        sampleOutput: typeof body.sampleOutput === 'string' ? body.sampleOutput.slice(0, 4000) : '',
        formulaLatex: typeof body.formulaLatex === 'string' ? body.formulaLatex.slice(0, 2000) : '',
        teachingTier: typeof body.teachingTier === 'string' ? body.teachingTier : 'CSP-J',
      });
      res.json({ ok: true, plan });
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        res.status(401).json({ error: err.code, message: err.message });
        return;
      }
      if (err instanceof InvalidBaseUrlError) {
        res.status(400).json({ error: err.code, message: err.message });
        return;
      }
      res.status(502).json({
        error: 'AI_PROVIDER_ERROR',
        message: err instanceof Error ? err.message : 'AI 服务调用失败',
      });
    }
  });

  app.post('/api/ai/generate-scene', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`ai-gen:${ip}`, 15, 60_000)) {
      res.status(429).json({ error: 'RATE_LIMITED', message: 'AI 场景生成过于频繁，请稍后再试' });
      return;
    }
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || body.userConsent !== true) {
      res.status(400).json({
        error: 'CONSENT_REQUIRED',
        message: '调用外部 AI 模型前必须先由用户确认同意发送题目与代码文本',
      });
      return;
    }
    if (typeof body.planSummary !== 'string' || !body.planSummary.trim()) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: '缺少已审核的设计方案摘要' });
      return;
    }
    try {
      const cfg = extractUserAiConfig(req);
      const dsl = await aiProvider.generateSceneDsl(cfg, {
        planSummary: body.planSummary.slice(0, 8000),
        naturalLanguage: typeof body.naturalLanguage === 'string' ? body.naturalLanguage.slice(0, 8000) : '',
        cppCode: typeof body.cppCode === 'string' ? body.cppCode.slice(0, 12000) : '',
        sampleInput: typeof body.sampleInput === 'string' ? body.sampleInput.slice(0, 4000) : '',
        sampleOutput: typeof body.sampleOutput === 'string' ? body.sampleOutput.slice(0, 4000) : '',
        teachingTier: typeof body.teachingTier === 'string' ? body.teachingTier : 'CSP-J',
        teachingStyle: typeof body.teachingStyle === 'string' ? body.teachingStyle : 'deductive',
      });
      res.json({ ok: true, dsl });
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        res.status(401).json({ error: err.code, message: err.message });
        return;
      }
      if (err instanceof InvalidBaseUrlError) {
        res.status(400).json({ error: err.code, message: err.message });
        return;
      }
      res.status(502).json({
        error: 'AI_PROVIDER_ERROR',
        message: err instanceof Error ? err.message : 'AI 场景生成失败',
      });
    }
  });

  app.post('/api/ai/patch-scene', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`ai-patch:${ip}`, 25, 60_000)) {
      res.status(429).json({ error: 'RATE_LIMITED', message: 'AI 局部修改请求过于频繁，请稍后再试' });
      return;
    }
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || body.userConsent !== true) {
      res.status(400).json({
        error: 'CONSENT_REQUIRED',
        message: '调用外部 AI 模型前必须先由用户确认同意发送当前场景摘要',
      });
      return;
    }
    if (typeof body.prompt !== 'string' || !body.prompt.trim() || !body.sceneSummary) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: '缺少修改指令或场景摘要' });
      return;
    }
    try {
      const cfg = extractUserAiConfig(req);
      const patch = await aiProvider.generateScenePatch(cfg, {
        prompt: body.prompt.slice(0, 4000),
        sceneSummary: body.sceneSummary as Parameters<typeof aiProvider.generateScenePatch>[1]['sceneSummary'],
      });
      res.json({ ok: true, patch });
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        res.status(401).json({ error: err.code, message: err.message });
        return;
      }
      if (err instanceof InvalidBaseUrlError) {
        res.status(400).json({ error: err.code, message: err.message });
        return;
      }
      res.status(502).json({
        error: 'AI_PROVIDER_ERROR',
        message: err instanceof Error ? err.message : 'AI 局部修改生成失败',
      });
    }
  });

  // Create 6-digit transit share
  app.post('/api/transit', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`create:${ip}`, 25, 60_000)) {
      res.status(429).json({ error: 'RATE_LIMITED', message: '创建过于频繁，请稍后再试' });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'INVALID_BODY', message: '无效请求体' });
      return;
    }

    const payloadType = body.payloadType === 'source' ? 'source' : body.payloadType === 'workspace' ? 'workspace' : null;
    if (!payloadType || body.payload === undefined || body.payload === null) {
      res.status(400).json({ error: 'INVALID_PAYLOAD', message: '缺少有效传输内容' });
      return;
    }

    const serializedSize = Buffer.byteLength(JSON.stringify(body.payload), 'utf-8');
    if (serializedSize > MAX_PAYLOAD_BYTES) {
      res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: '内容体积超过 2MB 限制' });
      return;
    }

    const ttlMinutesRaw = Number(body.ttlMinutes);
    const ttlMinutes = Number.isFinite(ttlMinutesRaw)
      ? Math.min(Math.max(Math.round(ttlMinutesRaw), 5), 43200) // 5m to 30d
      : 1440; // default 24h

    let maxViews: number | null = null;
    if (body.maxViews !== null && body.maxViews !== undefined && body.maxViews !== '') {
      const mv = Number(body.maxViews);
      if (!Number.isFinite(mv) || mv < 1 || mv > 1000) {
        res.status(400).json({ error: 'INVALID_MAX_VIEWS', message: '访问次数限制需在 1 至 1000 之间' });
        return;
      }
      maxViews = Math.floor(mv);
    }

    const burnAfterRead = Boolean(body.burnAfterRead);
    const readOnly = body.readOnly !== false;
    const password = typeof body.password === 'string' && body.password.trim().length > 0 ? body.password.trim() : null;

    if (password && password.length > 64) {
      res.status(400).json({ error: 'PASSWORD_TOO_LONG', message: '访问密码长度不能超过 64 个字符' });
      return;
    }

    purgeExpired(store);
    const code = generateUniqueSixDigitCode(store);
    if (!code) {
      res.status(503).json({ error: 'CODE_EXHAUSTED', message: '当前提取码资源繁忙，请重试' });
      return;
    }

    const now = Date.now();
    const expiresAt = now + ttlMinutes * 60_000;
    const record: TransitRecord = {
      code,
      payloadType,
      payload: body.payload,
      readOnly,
      passwordHash: password ? hashPassword(password) : null,
      maxViews,
      viewsUsed: 0,
      burnAfterRead,
      createdAt: now,
      expiresAt,
    };

    store.transits[code] = record;
    saveStore(store);

    res.status(201).json({
      code,
      payloadType,
      readOnly,
      burnAfterRead,
      maxViews,
      hasPassword: Boolean(record.passwordHash),
      createdAt: now,
      expiresAt,
    });
  });

  // Retrieve transit metadata or unlocked payload
  app.get('/api/transit/:code', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`read:${ip}`, 60, 60_000)) {
      res.status(429).json({ error: 'RATE_LIMITED', message: '查询过于频繁，请稍后再试' });
      return;
    }

    const code = String(req.params.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ error: 'INVALID_CODE', message: '提取码格式应为 6 位数字' });
      return;
    }

    purgeExpired(store);
    const record = store.transits[code];
    if (!record) {
      res.status(404).json({ error: 'NOT_FOUND', message: '提取码不存在、已过期或已销毁' });
      return;
    }

    if (record.passwordHash) {
      res.json({
        found: true,
        requiresPassword: true,
        code: record.code,
        payloadType: record.payloadType,
        readOnly: record.readOnly,
        burnAfterRead: record.burnAfterRead,
        maxViews: record.maxViews,
        viewsUsed: record.viewsUsed,
        expiresAt: record.expiresAt,
      });
      return;
    }

    record.viewsUsed += 1;
    const shouldBurn =
      record.burnAfterRead ||
      (record.maxViews !== null && record.viewsUsed >= record.maxViews);

    const responsePayload = {
      found: true,
      requiresPassword: false,
      code: record.code,
      payloadType: record.payloadType,
      payload: record.payload,
      readOnly: record.readOnly,
      burnAfterRead: record.burnAfterRead,
      burnedNow: shouldBurn,
      maxViews: record.maxViews,
      viewsUsed: record.viewsUsed,
      expiresAt: record.expiresAt,
    };

    if (shouldBurn) {
      delete store.transits[code];
    }
    saveStore(store);

    res.json(responsePayload);
  });

  // Verify password for protected transit
  app.post('/api/transit/:code/verify', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`verify:${ip}`, 30, 60_000)) {
      res.status(429).json({ error: 'RATE_LIMITED', message: '验证过于频繁，请稍后再试' });
      return;
    }

    const code = String(req.params.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ error: 'INVALID_CODE', message: '提取码格式应为 6 位数字' });
      return;
    }

    const lockKey = `${ip}:${code}`;
    const lockState = passwordFailureLock.get(lockKey);
    if (lockState && lockState.lockedUntil > Date.now()) {
      res.status(429).json({ error: 'LOCKED', message: '密码尝试失败次数过多，请 5 分钟后再试' });
      return;
    }

    purgeExpired(store);
    const record = store.transits[code];
    if (!record) {
      res.status(404).json({ error: 'NOT_FOUND', message: '提取码不存在、已过期或已销毁' });
      return;
    }

    const body = req.body as { password?: unknown } | undefined;
    const password = typeof body?.password === 'string' ? body.password.trim() : '';

    if (!record.passwordHash || !verifyPassword(password, record.passwordHash)) {
      const nextCount = (lockState?.count ?? 0) + 1;
      passwordFailureLock.set(lockKey, {
        count: nextCount,
        lockedUntil: nextCount >= 5 ? Date.now() + 5 * 60_000 : 0,
      });
      res.status(403).json({ error: 'WRONG_PASSWORD', message: '提取密码错误' });
      return;
    }

    passwordFailureLock.delete(lockKey);
    record.viewsUsed += 1;
    const shouldBurn =
      record.burnAfterRead ||
      (record.maxViews !== null && record.viewsUsed >= record.maxViews);

    const responsePayload = {
      found: true,
      requiresPassword: false,
      code: record.code,
      payloadType: record.payloadType,
      payload: record.payload,
      readOnly: record.readOnly,
      burnAfterRead: record.burnAfterRead,
      burnedNow: shouldBurn,
      maxViews: record.maxViews,
      viewsUsed: record.viewsUsed,
      expiresAt: record.expiresAt,
    };

    if (shouldBurn) {
      delete store.transits[code];
    }
    saveStore(store);

    res.json(responsePayload);
  });

  // Private Cloud Workspace Sync (isolated by x-sync-key)
  app.get('/api/cloud/workspaces', (req, res) => {
    const syncKey = String(req.headers['x-sync-key'] || '').trim();
    if (syncKey.length < 8) {
      res.status(401).json({ error: 'SYNC_KEY_REQUIRED', message: '请提供至少 8 位的同步密钥' });
      return;
    }
    const ownerHash = hashSyncKey(syncKey);
    const items = Object.values(store.cloudWorkspaces)
      .filter((item) => item.ownerHash === ownerHash)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ id, title, updatedAt, workspace }) => ({ id, title, updatedAt, workspace }));
    res.json({ items });
  });

  app.post('/api/cloud/workspaces', (req, res) => {
    const syncKey = String(req.headers['x-sync-key'] || '').trim();
    if (syncKey.length < 8) {
      res.status(401).json({ error: 'SYNC_KEY_REQUIRED', message: '请提供至少 8 位的同步密钥' });
      return;
    }
    const body = req.body as { id?: unknown; title?: unknown; workspace?: unknown } | undefined;
    if (!body || typeof body.id !== 'string' || !body.workspace) {
      res.status(400).json({ error: 'INVALID_WORKSPACE', message: '工作区数据无效' });
      return;
    }

    const size = Buffer.byteLength(JSON.stringify(body.workspace), 'utf-8');
    if (size > MAX_PAYLOAD_BYTES) {
      res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: '工作区体积超过 2MB 限制' });
      return;
    }

    const ownerHash = hashSyncKey(syncKey);
    const key = `${ownerHash}:${body.id}`;
    const existing = store.cloudWorkspaces[key];
    if (existing && existing.ownerHash !== ownerHash) {
      res.status(403).json({ error: 'FORBIDDEN', message: '无权限覆盖此工作区' });
      return;
    }

    const record: CloudWorkspaceRecord = {
      id: body.id,
      ownerHash,
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Untitled Workspace',
      updatedAt: Date.now(),
      workspace: body.workspace,
    };

    store.cloudWorkspaces[key] = record;
    saveStore(store);

    res.json({ ok: true, id: record.id, updatedAt: record.updatedAt });
  });

  app.delete('/api/cloud/workspaces/:id', (req, res) => {
    const syncKey = String(req.headers['x-sync-key'] || '').trim();
    if (syncKey.length < 8) {
      res.status(401).json({ error: 'SYNC_KEY_REQUIRED', message: '请提供至少 8 位的同步密钥' });
      return;
    }
    const ownerHash = hashSyncKey(syncKey);
    const key = `${ownerHash}:${req.params.id}`;
    const existing = store.cloudWorkspaces[key];
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: '云端工作区不存在' });
      return;
    }
    delete store.cloudWorkspaces[key];
    saveStore(store);
    res.json({ ok: true });
  });

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Yanpb CodeTransit server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
