import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { AIProfile, AIProfiles, AIProviderType, UserAIConfig } from '../types/aiConfig';
import { Locale } from '../types/workspace';
import { buildAiRequestHeaders, DEFAULT_AI_CONFIG } from '../utils/aiConfig';

interface ApiKeyModalProps {
  locale: Locale;
  collection: AIProfiles;
  onSaveConfig: (next: AIProfile) => void;
  onClearConfig: (id: string) => void;
  onClose: () => void;
}

const GEMINI_PRESET_MODELS = ['gemini-4-hydrogen', 'gemini-4-neon', 'gemini-4-carbon'];
const OPENAI_PRESET_MODELS = ['gpt-4o-mini', 'gpt-4o', 'deepseek-chat', 'qwen-plus'];

export function ApiKeyModal(props: ApiKeyModalProps) {
  const zh = props.locale === 'zh-CN';
  const dialog = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState(props.collection.activeId ?? props.collection.profiles[0]?.id ?? '');
  const profile = props.collection.profiles.find(({ id }) => id === selectedId);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="ai-profile-title"
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-y-auto text-xs backdrop:bg-black/75 dark:border-white/15 dark:bg-[#121722] dark:text-slate-100">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <KeyRound aria-hidden="true" className="w-4 h-4 shrink-0 text-blue-500" />
          <div>
            <h2 id="ai-profile-title" className="text-sm font-bold">
              {zh ? '模型与 API Key' : 'Models & API Keys'}
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              {zh ? '可保存多套配置，AI 创作使用当前启用的一套。' : 'Save multiple configurations. AI features use the active one.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={props.onClose} aria-label={zh ? '关闭配置' : 'Close settings'}
          className="inline-grid size-11 shrink-0 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <label className="block px-5 pt-5 space-y-1">
        <span className="font-semibold">{zh ? '已保存的配置' : 'Saved configurations'}</span>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
          className="w-full min-h-11 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-3">
          <option value="">{zh ? '＋ 新建配置' : '＋ New configuration'}</option>
          {props.collection.profiles.map((saved) => (
            <option key={saved.id} value={saved.id}>
              {saved.name}{saved.id === props.collection.activeId ? (zh ? '（使用中）' : ' (active)') : ''}
            </option>
          ))}
        </select>
      </label>
      <ApiKeyEditor key={selectedId} {...props} profile={profile} />
    </dialog>
  );
}

interface ApiKeyEditorProps extends Omit<ApiKeyModalProps, 'collection'> {
  profile?: AIProfile;
}

const ApiKeyEditor: React.FC<ApiKeyEditorProps> = ({
  locale,
  profile,
  onSaveConfig,
  onClearConfig,
  onClose,
}) => {
  const zh = locale === 'zh-CN';
  const config = profile ?? DEFAULT_AI_CONFIG;
  const [name, setName] = useState(profile?.name ?? '');
  const [provider, setProvider] = useState<AIProviderType>(config.provider || 'gemini');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [model, setModel] = useState(
    config.model || (config.provider === 'openai-compatible' ? 'gpt-4o-mini' : 'gemini-4-hydrogen')
  );
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || '');
  const [rememberInSession, setRememberInSession] = useState(Boolean(config.rememberInSession));
  const [showKey, setShowKey] = useState(false);

  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const trimmedKey = apiKey.trim();

  const handleProviderSwitch = (nextProvider: AIProviderType) => {
    if (nextProvider === provider) return;
    setProvider(nextProvider);
    setStatusMsg(null);
    setApiKey('');
    setBaseUrl('');
    setShowKey(false);
    setModel(nextProvider === 'gemini' ? DEFAULT_AI_CONFIG.model : 'gpt-4o-mini');
  };

  const buildDraft = (): UserAIConfig => ({
    provider,
    apiKey: trimmedKey,
    model: model.trim() || (provider === 'openai-compatible' ? 'gpt-4o-mini' : 'gemini-4-hydrogen'),
    baseUrl: provider === 'openai-compatible' ? baseUrl.trim() : '',
    rememberInSession,
  });

  const handleVerify = async () => {
    if (!trimmedKey) {
      setStatusMsg({
        ok: false,
        text: zh ? '请先输入 API Key。' : 'Please enter an API Key first.',
      });
      return;
    }
    setTesting(true);
    setStatusMsg(null);
    try {
      const draft = buildDraft();
      const res = await fetch('/api/ai/verify', {
        method: 'POST',
        headers: buildAiRequestHeaders(draft),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || (zh ? '密钥验证失败' : 'Verification failed'));
      }
      setStatusMsg({
        ok: true,
        text: zh
          ? `连通性验证通过 (${data.provider} · ${data.model})，可点击下方保存启用。`
          : `Verified (${data.provider} · ${data.model}).`,
      });
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedKey) {
      setStatusMsg({
        ok: false,
        text: zh ? '请提供有效的 API Key，未提供密钥将不会显示任何 AI 功能。' : 'API Key is required.',
      });
      return;
    }
    const draft = buildDraft();
    const id = profile?.id ?? (crypto.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    onSaveConfig({ ...draft, id, name: name.trim() || draft.model });
    onClose();
  };

  const presetModels = provider === 'gemini' ? GEMINI_PRESET_MODELS : OPENAI_PRESET_MODELS;

  return (
    <form onSubmit={handleSubmit} className="p-5 pt-4 space-y-4">
      <fieldset disabled={testing} className="space-y-4 min-w-0">
        <label className="block space-y-1">
          <span className="font-semibold">{zh ? '配置名称（可选）' : 'Configuration name (optional)'}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
            placeholder={model}
            className="w-full min-h-11 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-3" />
        </label>
        {/* Provider Switch */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            {zh ? '模型接口协议' : 'Provider Protocol'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={provider === 'gemini'}
              onClick={() => handleProviderSwitch('gemini')}
              className={`px-3 py-2 rounded-lg border text-left font-medium cursor-pointer transition-colors ${
                provider === 'gemini'
                  ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-300'
                  : 'border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              Google Gemini
            </button>
            <button
              type="button"
              aria-pressed={provider === 'openai-compatible'}
              onClick={() => handleProviderSwitch('openai-compatible')}
              className={`px-3 py-2 rounded-lg border text-left font-medium cursor-pointer transition-colors ${
                provider === 'openai-compatible'
                  ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-300'
                  : 'border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {zh ? 'OpenAI 兼容接口' : 'OpenAI Compatible'}
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div>
          <label htmlFor="ai-profile-key" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {provider === 'gemini' ? 'Gemini API Key' : 'API Key (Bearer Token)'}
          </label>
          <div className="relative">
            <input
              id="ai-profile-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setStatusMsg(null);
              }}
              autoComplete="off"
              placeholder={provider === 'gemini' ? 'AIza...' : 'sk-...'}
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] pl-3 pr-9 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              title={showKey ? (zh ? '隐藏密钥' : 'Hide') : zh ? '显示密钥' : 'Show'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* OpenAI Base URL */}
        {provider === 'openai-compatible' && (
          <div>
            <label htmlFor="ai-profile-url" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {zh ? '接口 Base URL（仅限 HTTPS）' : 'Base URL (HTTPS only)'}
            </label>
            <input
              id="ai-profile-url"
              type="url"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setStatusMsg(null);
              }}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Model */}
        <div>
          <label htmlFor="ai-profile-model" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {zh ? '模型名称' : 'Model Name'}
          </label>
          <input
            id="ai-profile-model"
            type="text"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setStatusMsg(null);
            }}
            placeholder={DEFAULT_AI_CONFIG.model}
            className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B0E14] px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {presetModels.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setModel(preset);
                  setStatusMsg(null);
                }}
                className={`px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer ${
                  model === preset
                    ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                    : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-white/5'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Session Persistence Option */}
        <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberInSession}
            onChange={(e) => setRememberInSession(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {zh
              ? '在当前浏览器标签页会话中暂存（sessionStorage，关闭标签页自动清除；不勾选则仅保留在内存中）。'
              : 'Keep in current browser tab sessionStorage (cleared when tab closes).'}
          </span>
        </label>
      </fieldset>

      {/* Status / Error Message */}
      {statusMsg && (
        <div
          role="status"
          className={`p-2.5 rounded-lg border flex items-start gap-2 text-[11px] ${
            statusMsg.ok
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
              : 'border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-300'
          }`}
        >
          {statusMsg.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {profile && (
            <button
              type="button"
              disabled={testing}
              onClick={() => {
                onClearConfig(profile.id);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{zh ? '删除此配置' : 'Delete configuration'}</span>
            </button>
          )}
          <button
            type="button"
            disabled={testing || !trimmedKey}
            onClick={() => void handleVerify()}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-45 font-medium flex items-center gap-1.5 cursor-pointer"
          >
            {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{zh ? '验证连通性' : 'Test Key'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            {zh ? '取消' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={testing || !trimmedKey}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-45 text-white font-semibold cursor-pointer"
          >
            {zh ? '保存并启用' : 'Save & Enable'}
          </button>
        </div>
      </div>
    </form>
  );
};
