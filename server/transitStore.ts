import fs from 'node:fs';
import path from 'node:path';

export interface TransitRecord {
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

export interface CloudWorkspaceRecord {
  id: string;
  ownerHash: string;
  title: string;
  updatedAt: number;
  workspace: unknown;
}

interface TransitStore {
  ready(): Promise<void>;
  create(record: TransitRecord): Promise<boolean>;
  find(code: string): Promise<TransitRecord | null>;
  consume(record: TransitRecord): Promise<number | null>;
  take(key: string, windowMs: number): Promise<number>;
  reset(key: string): Promise<void>;
  listWorkspaces(owner: string): Promise<CloudWorkspaceRecord[]>;
  putWorkspace(record: CloudWorkspaceRecord): Promise<void>;
  deleteWorkspace(owner: string, id: string): Promise<boolean>;
}

export class StorageNotConfiguredError extends Error {}

function isExhausted(record: TransitRecord, views: number) {
  return record.burnAfterRead || (record.maxViews !== null && views >= record.maxViews);
}

function fileStore(): TransitStore {
  const directory = path.resolve(process.cwd(), 'data');
  const file = path.join(directory, 'transit-store.json');
  type State = { transits: Record<string, TransitRecord>; cloudWorkspaces: Record<string, CloudWorkspaceRecord> };
  function load(): State {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<State>;
      return { transits: data.transits ?? {}, cloudWorkspaces: data.cloudWorkspaces ?? {} };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return { transits: {}, cloudWorkspaces: {} };
    }
  }
  function save(state: State) {
    fs.mkdirSync(directory, { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state), { mode: 0o600 });
    fs.renameSync(temp, file);
  }
  function active(record: TransitRecord | undefined): record is TransitRecord {
    return Boolean(record && record.expiresAt > Date.now() &&
      (record.maxViews === null || record.viewsUsed < record.maxViews));
  }
  const counters = new Map<string, { count: number; expires: number }>();
  return {
    async ready() { load(); },
    async create(record) {
      const state = load();
      for (const code of Object.keys(state.transits)) {
        if (!active(state.transits[code])) delete state.transits[code];
      }
      if (state.transits[record.code]) return false;
      state.transits[record.code] = record;
      save(state);
      return true;
    },
    async find(code) {
      const record = load().transits[code];
      return active(record) ? record : null;
    },
    async consume(record) {
      const state = load();
      const current = state.transits[record.code];
      if (!active(current) || current.createdAt !== record.createdAt) return null;
      current.viewsUsed += 1;
      if (isExhausted(current, current.viewsUsed)) delete state.transits[record.code];
      save(state);
      return current.viewsUsed;
    },
    async take(key, windowMs) {
      const now = Date.now();
      if (counters.size > 1_000) {
        for (const [id, entry] of counters) if (entry.expires <= now) counters.delete(id);
      }
      const current = counters.get(key);
      const next = current && current.expires > now ? current : { count: 0, expires: now + windowMs };
      next.count += 1;
      counters.set(key, next);
      return next.count;
    },
    async reset(key) { counters.delete(key); },
    async listWorkspaces(owner) { return Object.values(load().cloudWorkspaces).filter((item) => item.ownerHash === owner); },
    async putWorkspace(record) {
      const state = load();
      state.cloudWorkspaces[`${record.ownerHash}:${record.id}`] = record;
      save(state);
    },
    async deleteWorkspace(owner, id) {
      const state = load();
      const key = `${owner}:${id}`;
      if (!state.cloudWorkspaces[key]) return false;
      delete state.cloudWorkspaces[key];
      save(state);
      return true;
    },
  };
}

const consumeScript = `
local raw = redis.call('GET', KEYS[1])
if not raw then return false end
local record = cjson.decode(raw)
if record.createdAt ~= tonumber(ARGV[1]) then return false end
local ttl = redis.call('PTTL', KEYS[1])
if ttl <= 0 then return false end
local n = redis.call('INCR', KEYS[2])
if record.burnAfterRead or (record.maxViews ~= cjson.null and n >= record.maxViews) then
  redis.call('DEL', KEYS[1], KEYS[2])
elseif n == 1 then
  redis.call('PEXPIRE', KEYS[2], ttl)
end
return n
`;

const counterScript = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return n
`;

function redisStore(url: string | undefined, token: string | undefined): TransitStore {
  async function command<T>(...args: Array<string | number>): Promise<T> {
    if (!url || !token) throw new StorageNotConfiguredError();
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(5_000),
      redirect: 'error',
    });
    const data = await response.json() as { result?: T; error?: string };
    if (!response.ok || data.error || !('result' in data)) throw new Error('Redis command failed');
    return data.result as T;
  }
  const prefix = `codetransit:${process.env.VERCEL_ENV ?? 'local'}:v1`;
  const recordKey = (code: string) => `${prefix}:{${code}}:record`;
  const viewsKey = (code: string) => `${prefix}:{${code}}:views`;
  const limitKey = (key: string) => `${prefix}:limit:${key}`;
  const workspaceKey = (owner: string) => `${prefix}:workspaces:${owner}`;

  return {
    async ready() { await command('PING'); },
    async create(record) {
      return await command('SET', recordKey(record.code), JSON.stringify(record), 'NX', 'PX',
        Math.max(1, record.expiresAt - Date.now())) === 'OK';
    },
    async find(code) {
      const [raw, views] = await command<[string | null, string | null]>('MGET', recordKey(code), viewsKey(code));
      return raw === null ? null : { ...JSON.parse(raw) as TransitRecord, viewsUsed: Number(views ?? 0) };
    },
    async consume(record) {
      return await command<number | null>('EVAL', consumeScript, 2, recordKey(record.code), viewsKey(record.code), record.createdAt);
    },
    async take(key, windowMs) { return command('EVAL', counterScript, 1, limitKey(key), windowMs); },
    async reset(key) { await command('DEL', limitKey(key)); },
    async listWorkspaces(owner) {
      const values = await command<string[]>('HVALS', workspaceKey(owner));
      return values.map((value) => JSON.parse(value) as CloudWorkspaceRecord);
    },
    async putWorkspace(record) {
      await command('HSET', workspaceKey(record.ownerHash), record.id, JSON.stringify(record));
    },
    async deleteWorkspace(owner, id) { return await command('HDEL', workspaceKey(owner), id) === 1; },
  };
}

export function createTransitStore(useHostedStorage = false): TransitStore {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return useHostedStorage || url || token ? redisStore(url, token) : fileStore();
}
