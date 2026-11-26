import { toJpeg, toPng, toSvg } from 'html-to-image';
import { SceneSchema } from '../types/algorithmStudio';
import { encodeCanvasFramesToGif } from './gifEncoder';

export type StudioExportTarget =
  | 'currentStep'
  | 'selectedComponent'
  | 'selectedSteps'
  | 'allSteps'
  | 'allArtboards'
  | 'artboard';

export type StudioExportFormat =
  | 'png'
  | 'svg'
  | 'jpeg'
  | 'webp'
  | 'gif'
  | 'html'
  | 'json'
  | 'a4-print';

export type StudioTemplatePreset =
  | 'carbon-classic'
  | 'icpc-pro'
  | 'study-notes'
  | 'academic-white'
  | 'code-linked'
  | 'state-trace';

export interface StudioExportConfig {
  target: StudioExportTarget;
  format: StudioExportFormat;
  template: StudioTemplatePreset;
  scale: 1 | 2 | 3 | 4;
  transparent: boolean;
  includeAuthor: boolean;
  includeHidden?: boolean;
  selectedStepIndices: number[];
  fileName: string;
}

export const STUDIO_EXPORT_TEMPLATES: Array<{
  id: StudioTemplatePreset;
  nameZh: string;
  nameEn: string;
  bg: string;
  fg: string;
  border: string;
}> = [
  { id: 'carbon-classic', nameZh: 'Carbon Classic', nameEn: 'Carbon Classic', bg: '#0F141E', fg: '#E2E8F0', border: '#2A3346' },
  { id: 'icpc-pro', nameZh: 'ICPC Pro', nameEn: 'ICPC Pro', bg: '#090D16', fg: '#F8FAFC', border: '#2563EB' },
  { id: 'study-notes', nameZh: '学霸笔记', nameEn: 'Study Notes', bg: '#161B22', fg: '#F0F6FC', border: '#D97706' },
  { id: 'academic-white', nameZh: 'Academic White', nameEn: 'Academic White', bg: '#FFFFFF', fg: '#0F172A', border: '#CBD5E1' },
  { id: 'code-linked', nameZh: '代码联动', nameEn: 'Code Linked', bg: '#111827', fg: '#F1F5F9', border: '#6366F1' },
  { id: 'state-trace', nameZh: '状态推演', nameEn: 'State Trace', bg: '#0C121D', fg: '#E2E8F0', border: '#10B981' },
];

function downloadBlobOrUrl(href: string, filename: string, isObjectUrl = false): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (isObjectUrl) {
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function generateInteractiveStepHtml(scene: SceneSchema, includeAuthor: boolean): string {
  const safeJson = JSON.stringify({
    name: scene.name,
    code: scene.linkedCode,
    formula: scene.formulaLatex,
    author: includeAuthor ? scene.author.name : '',
    steps: scene.steps.map((s) => ({
      index: s.index,
      title: s.title,
      explanation: s.explanation,
      codeLines: s.codeLines,
      variables: s.snapshot.variables,
    })),
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${scene.name.replace(/</g, '&lt;')} - Yanpb Algorithm Studio</title>
<style>
  body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#0B0E14; color:#E2E8F0; padding:24px; }
  .wrap { max-width:960px; margin:0 auto; border:1px solid #232B3A; border-radius:12px; background:#111723; padding:20px; }
  h1 { margin:0 0 8px; font-size:20px; }
  .controls { display:flex; gap:8px; align-items:center; margin:16px 0; }
  button { background:#2563EB; color:#fff; border:none; border-radius:8px; padding:6px 14px; cursor:pointer; font-weight:600; }
  button.sec { background:#1E293B; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  pre { background:#0B0E14; padding:12px; border-radius:8px; overflow:auto; font-size:12px; line-height:1.5; border:1px solid #1E293B; }
  .line-active { background:rgba(59,130,246,0.22); display:block; }
  .vars { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  .var { background:#0B0E14; border:1px solid #2A3346; padding:4px 10px; border-radius:6px; font-family:monospace; font-size:12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1 id="title"></h1>
  <div id="desc" style="color:#94A3B8;font-size:14px;"></div>
  <div class="controls">
    <button class="sec" onclick="go(cur-1)">上一步</button>
    <button onclick="togglePlay()" id="playBtn">播放</button>
    <button class="sec" onclick="go(cur+1)">下一步</button>
    <span id="counter" style="font-size:12px;color:#94A3B8;margin-left:8px;"></span>
  </div>
  <div class="grid">
    <div>
      <div style="font-size:12px;color:#94A3B8;margin-bottom:6px;">代码联动</div>
      <pre id="code"></pre>
    </div>
    <div>
      <div style="font-size:12px;color:#94A3B8;margin-bottom:6px;">变量监视</div>
      <div class="vars" id="vars"></div>
      <div id="author" style="margin-top:24px;font-size:12px;color:#64748B;"></div>
    </div>
  </div>
</div>
<script>
const DATA = ${safeJson};
let cur = 0, timer = null;
function render() {
  const s = DATA.steps[cur] || { title: DATA.name, explanation: '', codeLines: [], variables: [] };
  document.getElementById('title').textContent = DATA.name + ' · ' + s.title;
  document.getElementById('desc').textContent = s.explanation || '';
  document.getElementById('counter').textContent = (cur + 1) + ' / ' + Math.max(1, DATA.steps.length);
  const lines = DATA.code.split('\\n');
  document.getElementById('code').innerHTML = lines.map((ln, idx) => {
    const active = (s.codeLines || []).includes(idx + 1);
    return '<span class="' + (active ? 'line-active' : '') + '">' + String(idx+1).padStart(2,' ') + ' | ' + ln.replace(/</g,'&lt;') + '</span>';
  }).join('\\n');
  document.getElementById('vars').innerHTML = (s.variables || []).map(v => '<div class="var">' + v.name + ' = ' + v.value + '</div>').join('');
  document.getElementById('author').textContent = DATA.author ? ('Author: ' + DATA.author) : '';
}
function go(i) { cur = Math.max(0, Math.min(DATA.steps.length - 1, i)); render(); }
function togglePlay() {
  if (timer) { clearInterval(timer); timer = null; document.getElementById('playBtn').textContent='播放'; return; }
  document.getElementById('playBtn').textContent='暂停';
  timer = setInterval(() => { if (cur + 1 < DATA.steps.length) go(cur + 1); else togglePlay(); }, 900);
}
render();
</script>
</body>
</html>`;
}

export async function captureNodeToImageData(
  node: HTMLElement,
  scale = 1,
  targetW = 840
): Promise<ImageData> {
  const pngUrl = await toPng(node, {
    pixelRatio: scale,
    cacheBust: true,
    backgroundColor: '#0F141E',
    filter: (el: HTMLElement) => el?.dataset?.exportIgnore !== 'true',
  });
  const img = await loadImg(pngUrl);
  const aspect = img.height / Math.max(1, img.width);
  const w = Math.min(targetW, img.width);
  const h = Math.max(120, Math.round(w * aspect));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0F141E';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export async function exportStudioSingleNode(
  node: HTMLElement,
  config: StudioExportConfig
): Promise<void> {
  const safeBase = (config.fileName || 'yanpb-algo-studio').replace(
    /[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g,
    '-'
  );
  const opts = {
    pixelRatio: config.scale,
    cacheBust: true,
    backgroundColor: config.transparent && config.format !== 'jpeg' ? undefined : '#0F141E',
    filter: (el: HTMLElement) => el?.dataset?.exportIgnore !== 'true',
  };

  if (config.format === 'svg') {
    const svgUrl = await toSvg(node, opts);
    downloadBlobOrUrl(svgUrl, `${safeBase}.svg`);
    return;
  }

  if (config.format === 'jpeg') {
    const jpgUrl = await toJpeg(node, { ...opts, quality: 0.94, backgroundColor: '#0F141E' });
    downloadBlobOrUrl(jpgUrl, `${safeBase}.jpg`);
    return;
  }

  const pngUrl = await toPng(node, opts);
  if (config.format === 'webp') {
    const img = await loadImg(pngUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const webpUrl = canvas.toDataURL('image/webp', 0.92);
    downloadBlobOrUrl(webpUrl, `${safeBase}.webp`);
    return;
  }

  if (config.format === 'a4-print') {
    // Generate crisp A4 paginated PNG sheets + trigger browser print dialog cleanly (no window.open)
    const img = await loadImg(pngUrl);
    const pageW = img.width;
    const pageH = Math.round(pageW * 1.4142);
    const total = Math.max(1, Math.ceil(img.height / pageH));
    for (let p = 0; p < total; p++) {
      const sy = p * pageH;
      const sliceH = Math.min(pageH, img.height - sy);
      const canvas = document.createElement('canvas');
      canvas.width = pageW;
      canvas.height = pageH;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, pageW, pageH);
      ctx.drawImage(img, 0, sy, pageW, sliceH, 0, 0, pageW, sliceH);
      downloadBlobOrUrl(canvas.toDataURL('image/png'), `${safeBase}-A4-p${p + 1}.png`);
    }
    return;
  }

  downloadBlobOrUrl(pngUrl, `${safeBase}.png`);
}

export async function exportStudioAnimatedGif(
  stepIndices: number[],
  setStepAndWait: (stepIndex: number) => Promise<void>,
  captureNode: () => HTMLElement | null,
  delayMs: number,
  fileName: string
): Promise<void> {
  const frames: Array<{ imageData: ImageData; delayMs: number }> = [];
  for (const idx of stepIndices) {
    await setStepAndWait(idx);
    const node = captureNode();
    if (!node) continue;
    const imageData = await captureNodeToImageData(node, 1, 780);
    frames.push({ imageData, delayMs });
  }
  if (frames.length === 0) throw new Error('No step frames captured');
  const blob = encodeCanvasFramesToGif(frames);
  const url = URL.createObjectURL(blob);
  const safeBase = (fileName || 'yanpb-algo-animation').replace(
    /[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g,
    '-'
  );
  downloadBlobOrUrl(url, `${safeBase}.gif`, true);
}
