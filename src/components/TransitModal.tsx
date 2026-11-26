import React, { useEffect, useState } from 'react';
import {
  X,
  Send,
  DownloadCloud,
  Cloud,
  Copy,
  Check,
  Lock,
  Flame,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Locale, WorkspaceDocument } from '../types/workspace';
import { SceneSchema } from '../types/algorithmStudio';
import { getTranslations } from '../constants/i18n';

type TransitIssue = 'not-configured' | 'missing-api' | 'unavailable' | 'connection' | 'request';

class TransitRequestError extends Error {
  constructor(readonly kind: TransitIssue, message: string) {
    super(message);
  }
}

function issueMessage(kind: TransitIssue, zh: boolean): string {
  const messages: Record<TransitIssue, [string, string]> = {
    'not-configured': ['中转服务尚未配置，请联系站点管理员。', 'Transit is not configured. Contact the site administrator.'],
    'missing-api': ['此站点未部署中转 API。请确认使用的是正式服务地址。', 'The transit API is missing. Check that you are on the deployed service.'],
    unavailable: ['中转服务暂不可用，请稍后重试。', 'Transit is temporarily unavailable. Try again later.'],
    connection: ['无法连接中转服务。请检查网络后重试。', 'Could not reach Transit. Check your connection and retry.'],
    request: ['中转请求未完成，请检查输入后重试。', 'The request could not be completed. Check your input and try again.'],
  };
  return messages[kind][zh ? 0 : 1];
}

async function transitRequest<T>(path: string, zh: boolean, options?: RequestInit, timeout = 15_000): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...options, cache: 'no-store', signal: AbortSignal.timeout(timeout) });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new TransitRequestError('connection', zh ? '连接中转服务超时，请重试。' : 'Transit timed out. Please retry.');
    }
    throw new TransitRequestError('connection', issueMessage('connection', zh));
  }

  const data = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  if (response.ok && data) return data as T;
  const kind = data?.error === 'TRANSIT_NOT_CONFIGURED' ? 'not-configured'
    : data?.error === 'API_NOT_FOUND' || (!data && (response.ok || response.status === 404 || response.status === 405)) ? 'missing-api'
    : response.status >= 500 ? 'unavailable'
    : 'request';
  throw new TransitRequestError(kind, kind === 'request' && zh && data?.message
    ? data.message
    : kind === 'request' && response.status === 404
      ? (zh ? '提取码或工作区不存在。' : 'The pickup code or workspace was not found.')
      : kind === 'request' && response.status === 429
        ? (zh ? '请求过于频繁，请稍后重试。' : 'Too many requests. Try again later.')
        : kind === 'request' && response.status === 413
          ? (zh ? '单次中转最多支持 2 MB。' : 'Each transfer can contain up to 2 MB.')
        : issueMessage(kind, zh));
}

function requestMessage(error: unknown, zh: boolean): string {
  return error instanceof TransitRequestError ? error.message : issueMessage('request', zh);
}

interface TransitPayload {
  payloadType: 'source' | 'workspace';
  payload: unknown;
  readOnly: boolean;
  requiresPassword?: boolean;
  burnedNow?: boolean;
}

interface TransitModalProps {
  workspace: WorkspaceDocument;
  algoScene?: SceneSchema | null;
  locale: Locale;
  initialPickupCode?: string;
  initialSyncKey: string;
  onUpdateSyncKey: (key: string) => void;
  onLoadCodeOnly: (codeText: string, language?: string) => void;
  onLoadWorkspace: (ws: WorkspaceDocument, readOnly: boolean) => void;
  onLoadAlgoScene?: (scene: SceneSchema) => void;
  onTransitGenerated?: (code: string) => void;
  onClose: () => void;
}

interface CloudWorkspaceItem {
  id: string;
  title: string;
  updatedAt: number;
  workspace: WorkspaceDocument;
}

export const TransitModal: React.FC<TransitModalProps> = ({
  workspace,
  algoScene = null,
  locale,
  initialPickupCode = '',
  initialSyncKey,
  onUpdateSyncKey,
  onLoadCodeOnly,
  onLoadWorkspace,
  onLoadAlgoScene,
  onTransitGenerated,
  onClose,
}) => {
  const t = getTranslations(locale);
  const zh = locale === 'zh-CN';
  const [service, setService] = useState<{ state: 'checking' | 'ready' | 'error'; details?: string }>({ state: 'checking' });
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [tab, setTab] = useState<'send' | 'receive' | 'cloud'>(initialPickupCode ? 'receive' : 'send');

  // Send state
  const [payloadType, setPayloadType] = useState<'source' | 'workspace'>('workspace');
  const [ttlMinutes, setTtlMinutes] = useState<number>(1440);
  const [password, setPassword] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [readOnly, setReadOnly] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [createdResult, setCreatedResult] = useState<{
    code: string;
    expiresAt: number;
    shareUrl: string;
    qrSvg: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Receive state
  const [pickupCode, setPickupCode] = useState(initialPickupCode);
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [burnedNotice, setBurnedNotice] = useState(false);

  // Cloud sync state
  const [syncKey, setSyncKey] = useState(initialSyncKey);
  const [cloudItems, setCloudItems] = useState<CloudWorkspaceItem[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [cloudNotice, setCloudNotice] = useState('');

  const reportError = (error: unknown, setError: (message: string) => void) => {
    const message = requestMessage(error, zh);
    setError(message);
    if (error instanceof TransitRequestError && error.kind !== 'request') {
      setService({ state: 'error', details: message });
    }
  };

  useEffect(() => {
    let current = true;
    void transitRequest<{ ok: boolean }>('/api/transit/status', zh, undefined, 8_000)
      .then((status) => {
        if (!status.ok) throw new TransitRequestError('unavailable', issueMessage('unavailable', zh));
        if (current) setService({ state: 'ready' });
      })
      .catch((error: unknown) => {
        if (current) setService({ state: 'error', details: requestMessage(error, zh) });
      });
    return () => { current = false; };
  }, [checkAttempt, zh]);

  useEffect(() => {
    if (initialPickupCode && /^\d{6}$/.test(initialPickupCode)) {
      void handleFetchTransit(initialPickupCode);
    }
  }, [initialPickupCode]);

  const handleCopy = async (id: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // ignore
    }
  };

  const handleCreateTransit = async () => {
    const maxViewCount = maxViews.trim() ? Number(maxViews) : null;
    if (maxViewCount !== null && (!Number.isInteger(maxViewCount) || maxViewCount < 1 || maxViewCount > 1000)) {
      setSendError(zh ? '访问次数应为 1 到 1000 之间的整数。' : 'Enter a view limit from 1 to 1000.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const payload =
        payloadType === 'source'
          ? {
              code: algoScene ? algoScene.linkedCode : workspace.codeData.code,
              language: algoScene ? algoScene.language : workspace.codeData.language,
              fileName: workspace.codeData.fileName,
            }
          : algoScene || workspace;

      const json = await transitRequest<{ code: string; expiresAt: number }>('/api/transit', zh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payloadType,
          payload,
          ttlMinutes,
          password: password.trim() || undefined,
          maxViews: maxViewCount,
          burnAfterRead,
          readOnly,
        }),
      });
      if (!/^\d{6}$/.test(json.code) || !Number.isFinite(json.expiresAt)) {
        throw new TransitRequestError('unavailable', issueMessage('unavailable', zh));
      }
      setService({ state: 'ready' });

      const shareUrl = `${window.location.origin}/?code=${json.code}`;
      const qrSvg = await QRCode.toString(shareUrl, { type: 'svg', width: 140, margin: 1 });
      setCreatedResult({
        code: json.code,
        expiresAt: json.expiresAt,
        shareUrl,
        qrSvg,
      });
      onTransitGenerated?.(json.code);
    } catch (error) {
      reportError(error, setSendError);
    } finally {
      setSending(false);
    }
  };

  const applyFetchedPayload = (json: TransitPayload) => {
    if (json.burnedNow) {
      setBurnedNotice(true);
    }
    if (json.payloadType === 'source') {
      const src = json.payload as { code?: string; language?: string };
      onLoadCodeOnly(String(src?.code || ''), src?.language);
    } else {
      const maybeScene = json.payload as Partial<SceneSchema>;
      if (maybeScene && maybeScene.version === '1.0.0' && Array.isArray(maybeScene.artboards)) {
        onLoadAlgoScene?.(maybeScene as SceneSchema);
      } else {
        onLoadWorkspace(json.payload as WorkspaceDocument, Boolean(json.readOnly));
      }
    }
    if (!json.burnedNow) {
      onClose();
    }
  };

  const handleFetchTransit = async (codeOverride?: string) => {
    const targetCode = (codeOverride ?? pickupCode).trim();
    if (!/^\d{6}$/.test(targetCode)) {
      setReceiveError(locale === 'zh-CN' ? '请输入 6 位数字提取码' : 'Enter a valid 6-digit code');
      return;
    }
    setReceiving(true);
    setReceiveError('');
    setNeedsPassword(false);
    setBurnedNotice(false);
    try {
      const json = await transitRequest<TransitPayload>(`/api/transit/${targetCode}`, zh);
      if (json.requiresPassword) {
        setNeedsPassword(true);
        return;
      }
      applyFetchedPayload(json);
    } catch (error) {
      reportError(error, setReceiveError);
    } finally {
      setReceiving(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (receiving) return;
    const targetCode = pickupCode.trim();
    setReceiving(true);
    setReceiveError('');
    try {
      const json = await transitRequest<TransitPayload>(`/api/transit/${targetCode}/verify`, zh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: unlockPassword }),
      });
      setNeedsPassword(false);
      applyFetchedPayload(json);
    } catch (error) {
      reportError(error, setReceiveError);
    } finally {
      setReceiving(false);
    }
  };

  const fetchCloudList = async (keyToUse = syncKey) => {
    if (keyToUse.trim().length < 8) {
      setCloudError(locale === 'zh-CN' ? '请提供至少 8 位私有同步密钥' : 'Sync key must be at least 8 characters');
      return;
    }
    setCloudLoading(true);
    setCloudError('');
    onUpdateSyncKey(keyToUse.trim());
    try {
      const json = await transitRequest<{ items: CloudWorkspaceItem[] }>('/api/cloud/workspaces', zh, {
        headers: { 'x-sync-key': keyToUse.trim() },
      });
      setCloudItems(json.items || []);
    } catch (error) {
      reportError(error, setCloudError);
    } finally {
      setCloudLoading(false);
    }
  };

  const handleSaveCloud = async () => {
    if (syncKey.trim().length < 8) {
      setCloudError(locale === 'zh-CN' ? '请先输入至少 8 位同步密钥' : 'Enter at least 8 chars sync key');
      return;
    }
    setCloudLoading(true);
    setCloudError('');
    setCloudNotice('');
    onUpdateSyncKey(syncKey.trim());
    try {
      await transitRequest('/api/cloud/workspaces', zh, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-key': syncKey.trim(),
        },
        body: JSON.stringify({
          id: workspace.titleData.problemCode || `ws-${Date.now()}`,
          title: workspace.titleData.problemTitle || workspace.name,
          workspace,
        }),
      });
      setCloudNotice(locale === 'zh-CN' ? '已安全同步到个人云端空间' : 'Synced to private cloud');
      await fetchCloudList(syncKey.trim());
    } catch (error) {
      reportError(error, setCloudError);
    } finally {
      setCloudLoading(false);
    }
  };

  const handleDeleteCloud = async (id: string) => {
    try {
      await transitRequest(`/api/cloud/workspaces/${encodeURIComponent(id)}`, zh, {
        method: 'DELETE',
        headers: { 'x-sync-key': syncKey.trim() },
      });
      await fetchCloudList(syncKey.trim());
    } catch (error) {
      reportError(error, setCloudError);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#11151E] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-base font-bold">{t.transitModal.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab('send')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'send' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t.transitModal.tabSend}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('receive')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'receive' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>{t.transitModal.tabReceive}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('cloud')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'cloud' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{t.transitModal.tabCloud}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <div role="status" className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-semibold">
                {service.state === 'checking'
                  ? <Loader2 aria-hidden="true" className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
                  : service.state === 'ready'
                    ? <Check aria-hidden="true" className="size-4 text-emerald-700 dark:text-emerald-300" />
                    : <AlertCircle aria-hidden="true" className="size-4 text-amber-700 dark:text-amber-300" />}
                {service.state === 'checking' ? (zh ? '正在检查中转服务' : 'Checking Transit service')
                  : service.state === 'ready' ? (zh ? '中转服务可用' : 'Transit service is available')
                  : (zh ? '中转服务暂不可用' : 'Transit service unavailable')}
              </div>
              {service.details && <p className="mt-1 text-slate-700 dark:text-slate-300">{service.details}</p>}
            </div>
            {service.state === 'error' && (
              <button type="button" onClick={() => {
                setService({ state: 'checking' });
                setCheckAttempt((attempt) => attempt + 1);
              }} className="min-h-11 rounded-md px-2.5 font-semibold text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-500/15 cursor-pointer">
                {zh ? '重新检查' : 'Check again'}
              </button>
            )}
          </div>
          {tab === 'send' && (
            <>
              <p className="text-slate-700 dark:text-slate-300">
                {zh ? '生成提取码后，在接收设备打开同一网站，输入六位数字即可提取。每次最多发送 2 MB。'
                  : 'Open this site on the receiving device and enter the six-digit pickup code. Each transfer can contain up to 2 MB.'}
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={payloadType === 'source'}
                    onChange={() => setPayloadType('source')}
                    className="accent-blue-600"
                  />
                  <span>{t.transitModal.payloadSource}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={payloadType === 'workspace'}
                    onChange={() => setPayloadType('workspace')}
                    className="accent-blue-600"
                  />
                  <span>{t.transitModal.payloadWorkspace}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-slate-500 block">{t.transitModal.ttl}</span>
                  <select
                    value={ttlMinutes}
                    onChange={(e) => setTtlMinutes(Number(e.target.value))}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                  >
                    <option value={10}>10 {locale === 'zh-CN' ? '分钟' : 'Minutes'}</option>
                    <option value={60}>1 {locale === 'zh-CN' ? '小时' : 'Hour'}</option>
                    <option value={1440}>24 {locale === 'zh-CN' ? '小时' : 'Hours'}</option>
                    <option value={10080}>7 {locale === 'zh-CN' ? '天' : 'Days'}</option>
                    <option value={43200}>30 {locale === 'zh-CN' ? '天' : 'Days'}</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-slate-500 block">{t.transitModal.maxViews}</span>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={maxViews}
                    onChange={(e) => setMaxViews(e.target.value)}
                    placeholder={locale === 'zh-CN' ? '不限' : 'Unlimited'}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29] font-mono tabular-nums"
                  />
                </label>

                <label className="sm:col-span-2 space-y-1">
                  <span className="text-slate-500 block">{t.transitModal.passwordOptional}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#181D29]"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={burnAfterRead}
                    onChange={(e) => setBurnAfterRead(e.target.checked)}
                    className="accent-rose-500"
                  />
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>{t.transitModal.burnAfterRead}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readOnly}
                    onChange={(e) => setReadOnly(e.target.checked)}
                    className="accent-blue-600"
                  />
                  <span>{t.transitModal.readOnly}</span>
                </label>
              </div>

              {sendError && (
                <div role="alert" className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              <button
                type="button"
                disabled={sending}
                onClick={handleCreateTransit}
                className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{t.transitModal.generateCode}</span>
              </button>

              {createdResult && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-2.5 flex-1">
                    <div className="text-slate-500 dark:text-slate-400">{t.transitModal.pickupCodeLabel}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-mono font-bold tracking-[0.22em] tabular-nums text-emerald-500">
                        {createdResult.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('code', createdResult.code)}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-white/15 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{locale === 'zh-CN' ? '复制' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdResult.shareUrl}
                        className="flex-1 h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy('url', createdResult.shareUrl)}
                        className="h-8 px-2.5 rounded border border-slate-300 dark:border-white/15 cursor-pointer"
                      >
                        {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {locale === 'zh-CN' ? '过期时间: ' : 'Expires: '}
                      {new Date(createdResult.expiresAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className="p-2 bg-white rounded-lg border border-slate-200"
                      dangerouslySetInnerHTML={{ __html: createdResult.qrSvg }}
                    />
                    <span className="text-[11px] text-slate-500">{t.transitModal.qrLabel}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'receive' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={pickupCode}
                  onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleFetchTransit();
                  }}
                  placeholder={t.transitModal.enterCodePlaceholder}
                  className="flex-1 h-11 px-4 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 font-mono text-lg tracking-[0.25em] text-center tabular-nums"
                />
                <button
                  type="button"
                  disabled={receiving}
                  onClick={() => handleFetchTransit()}
                  className="px-5 h-11 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer flex items-center gap-2"
                >
                  {receiving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t.transitModal.fetchBtn}</span>
                </button>
              </div>

              {needsPassword && (
                <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-medium">
                    <Lock className="w-4 h-4" />
                    <span>{t.transitModal.enterPasswordPrompt}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleVerifyPassword();
                      }}
                      className="flex-1 h-9 px-3 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPassword}
                      className="px-4 h-9 rounded bg-blue-600 text-white font-semibold cursor-pointer"
                    >
                      {t.transitModal.verifyUnlock}
                    </button>
                  </div>
                </div>
              )}

              {receiveError && (
                <div role="alert" className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{receiveError}</span>
                </div>
              )}

              {burnedNotice && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between gap-2">
                  <span>{t.transitModal.burnedNotice}</span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold cursor-pointer"
                  >
                    {locale === 'zh-CN' ? '进入画布' : 'Open Canvas'}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'cloud' && (
            <div className="space-y-4">
              <p className="text-slate-500 dark:text-slate-400">{t.transitModal.cloudSyncHint}</p>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={syncKey}
                  onChange={(e) => setSyncKey(e.target.value)}
                  placeholder={t.transitModal.syncKeyPlaceholder}
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/30 font-mono"
                />
                <button
                  type="button"
                  onClick={() => fetchCloudList()}
                  className="px-3 h-9 rounded-lg border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  {locale === 'zh-CN' ? '刷新列表' : 'Refresh'}
                </button>
                <button
                  type="button"
                  disabled={cloudLoading}
                  onClick={handleSaveCloud}
                  className="px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
                >
                  {t.transitModal.saveToCloud}
                </button>
              </div>

              {cloudError && <div role="alert" className="text-rose-700 dark:text-rose-300">{cloudError}</div>}
              {cloudNotice && <div className="text-emerald-400">{cloudNotice}</div>}

              <div className="divide-y divide-slate-200 dark:divide-white/10 border border-slate-200 dark:border-white/10 rounded-lg">
                {cloudItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    {locale === 'zh-CN' ? '暂无云端记录或请先点击「刷新列表」' : 'No cloud workspaces loaded yet'}
                  </div>
                ) : (
                  cloudItems.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {new Date(item.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadWorkspace(item.workspace, false);
                            onClose();
                          }}
                          className="px-3 py-1 rounded bg-blue-600 text-white cursor-pointer"
                        >
                          {t.transitModal.loadFromCloud}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCloud(item.id)}
                          className="p-1.5 rounded text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
