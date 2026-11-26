import { toJpeg, toPng, toSvg } from 'html-to-image';

export type ExportFormat = 'png' | 'svg' | 'jpeg';
export type PaginationMode = 'single' | 'a4-pages';

export interface ExportOptions {
  format: ExportFormat;
  scale: 1 | 2 | 3 | 4;
  transparent: boolean;
  fileName: string;
  pagination: PaginationMode;
}

function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportNodeToImage(node: HTMLElement, options: ExportOptions): Promise<void> {
  const baseOptions = {
    pixelRatio: options.scale,
    cacheBust: true,
    backgroundColor: options.transparent && options.format !== 'jpeg' ? undefined : options.format === 'jpeg' ? '#0B0E14' : undefined,
    filter: (el: HTMLElement) => {
      if (el?.dataset?.exportIgnore === 'true') return false;
      return true;
    },
  };

  const safeBaseName = (options.fileName || 'yanpb-codetransit').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '-');

  if (options.format === 'svg') {
    const dataUrl = await toSvg(node, baseOptions);
    triggerDownload(dataUrl, `${safeBaseName}.svg`);
    return;
  }

  if (options.format === 'jpeg') {
    const dataUrl = await toJpeg(node, { ...baseOptions, quality: 0.95, backgroundColor: '#0F172A' });
    triggerDownload(dataUrl, `${safeBaseName}.jpg`);
    return;
  }

  // PNG (single or A4 paginated)
  const fullPngUrl = await toPng(node, baseOptions);

  if (options.pagination === 'single') {
    triggerDownload(fullPngUrl, `${safeBaseName}.png`);
    return;
  }

  // A4 Pagination slice (A4 ratio = 1 : 1.4142)
  const img = await loadImage(fullPngUrl);
  const pageWidth = img.width;
  const pageHeight = Math.round(pageWidth * 1.4142);

  if (img.height <= pageHeight) {
    triggerDownload(fullPngUrl, `${safeBaseName}-p1.png`);
    return;
  }

  const totalPages = Math.ceil(img.height / pageHeight);
  for (let p = 0; p < totalPages; p++) {
    const sy = p * pageHeight;
    const sliceH = Math.min(pageHeight, img.height - sy);
    const canvas = document.createElement('canvas');
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    if (!options.transparent) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, pageWidth, pageHeight);
    }
    ctx.drawImage(img, 0, sy, pageWidth, sliceH, 0, 0, pageWidth, sliceH);
    const pageUrl = canvas.toDataURL('image/png');
    triggerDownload(pageUrl, `${safeBaseName}-p${p + 1}.png`);
  }
}

export async function copyNodeImageToClipboard(node: HTMLElement, scale: 1 | 2 | 3 | 4 = 2): Promise<boolean> {
  try {
    const dataUrl = await toPng(node, {
      pixelRatio: scale,
      cacheBust: true,
      filter: (el: HTMLElement) => el?.dataset?.exportIgnore !== 'true',
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (navigator.clipboard && 'write' in navigator.clipboard) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
