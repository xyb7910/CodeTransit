import { AIProfile, AIProfiles, UserAIConfig } from '../types/aiConfig';

const SESSION_STORAGE_KEY = 'codetransit_user_ai_config_v1';

export const DEFAULT_AI_CONFIG: UserAIConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-4-hydrogen',
  baseUrl: '',
  rememberInSession: false,
};

export function hasConfiguredAiKey(config: UserAIConfig | null | undefined): boolean {
  return Boolean(config && typeof config.apiKey === 'string' && config.apiKey.trim().length > 0);
}

export function loadSessionAiProfiles(): AIProfiles {
  const empty: AIProfiles = { profiles: [], activeId: null };
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AIProfiles & UserAIConfig> | null;
    if (!parsed) return empty;
    const migrateLegacy = !Array.isArray(parsed.profiles);
    const entries = migrateLegacy ? [{ ...parsed, id: 'legacy' }] : parsed.profiles ?? [];
    const profiles: AIProfile[] = [];
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string' || typeof entry.apiKey !== 'string' || !entry.apiKey.trim()) continue;
      const provider = entry.provider === 'openai-compatible' ? 'openai-compatible' : 'gemini';
      const model = (typeof entry.model === 'string' && entry.model.trim()) ||
        (provider === 'gemini' ? DEFAULT_AI_CONFIG.model : 'gpt-4o-mini');
      profiles.push({
        id: entry.id,
        name: ('name' in entry && typeof entry.name === 'string' && entry.name.trim()) || model,
        provider,
        model,
        apiKey: entry.apiKey.trim(),
        baseUrl: typeof entry.baseUrl === 'string' ? entry.baseUrl.trim() : '',
        rememberInSession: true,
      });
    }
    const activeId = migrateLegacy ? 'legacy' : parsed.activeId;
    return { profiles, activeId: profiles.find((profile) => profile.id === activeId)?.id ?? null };
  } catch {
    return empty;
  }
}

export function saveSessionAiProfiles(config: AIProfiles): void {
  try {
    const profiles = config.profiles.filter((profile) => profile.rememberInSession);
    if (!profiles.length) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    const activeId = profiles.find((profile) => profile.id === config.activeId)?.id ?? null;
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ profiles, activeId })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function buildAiRequestHeaders(config: UserAIConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-ai-api-key': config.apiKey.trim(),
    'x-ai-provider': config.provider,
    'x-ai-model': config.model.trim() || (config.provider === 'openai-compatible' ? 'gpt-4o-mini' : 'gemini-4-hydrogen'),
  };
  if (config.provider === 'openai-compatible' && config.baseUrl?.trim()) {
    headers['x-ai-base-url'] = config.baseUrl.trim();
  }
  return headers;
}
