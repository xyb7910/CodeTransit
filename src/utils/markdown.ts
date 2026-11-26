import DOMPurify from 'dompurify';
import katex from 'katex';
import { marked } from 'marked';
import { HighlightColor, ProblemHighlight } from '../types/workspace';

export function isSafeHttpUrl(url: string): boolean {
  if (!url || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function renderLatexToHtml(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return escapeHtml(latex);
  }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineAndDisplayMath(raw: string): { text: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let idx = 0;

  // Block math $$...$$
  let processed = raw.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr: string) => {
    const key = `@@KATEX_BLOCK_${idx++}@@`;
    placeholders.set(key, `<div class="my-2 overflow-x-auto text-center">${renderLatexToHtml(expr.trim(), true)}</div>`);
    return key;
  });

  // Inline math $...$ (avoid matching escaped \$ or empty $$)
  processed = processed.replace(/(?<!\\)\$([^$\n]+?)\$/g, (_match, expr: string) => {
    const key = `@@KATEX_INLINE_${idx++}@@`;
    placeholders.set(key, renderLatexToHtml(expr.trim(), false));
    return key;
  });

  return { text: processed, placeholders };
}

export function renderSafeMarkdownWithMath(markdown: string): string {
  if (!markdown) return '';
  const { text, placeholders } = renderInlineAndDisplayMath(markdown);
  const rawHtml = marked.parse(text, { async: false, breaks: true, gfm: true }) as string;

  let restored = rawHtml;
  for (const [key, html] of placeholders.entries()) {
    restored = restored.replaceAll(key, html);
  }

  return DOMPurify.sanitize(restored, {
    ADD_TAGS: ['math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mtext', 'annotation', 'mark'],
    ADD_ATTR: ['xmlns', 'encoding', 'data-hl-id', 'data-color', 'class', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Applies semantic <mark> tags onto plain text / rendered text safely for highlight visualization
 * using raw text offset ranges on plain text view or text-node injection on DOM.
 */
export function buildHighlightedSegments(
  rawText: string,
  highlights: ProblemHighlight[]
): Array<{ text: string; highlight?: ProblemHighlight }> {
  const anchored = highlights
    .filter((h) => h.status === 'anchored' && h.endOffset > h.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset);

  if (anchored.length === 0) {
    return [{ text: rawText }];
  }

  const segments: Array<{ text: string; highlight?: ProblemHighlight }> = [];
  let cursor = 0;

  for (const hl of anchored) {
    const start = Math.max(cursor, Math.min(hl.startOffset, rawText.length));
    const end = Math.max(start, Math.min(hl.endOffset, rawText.length));
    if (start > cursor) {
      segments.push({ text: rawText.slice(cursor, start) });
    }
    if (end > start) {
      segments.push({ text: rawText.slice(start, end), highlight: hl });
    }
    cursor = Math.max(cursor, end);
  }

  if (cursor < rawText.length) {
    segments.push({ text: rawText.slice(cursor) });
  }

  return segments;
}

export const COLOR_BADGE_MAP: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40',
  green: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
  blue: 'bg-blue-400/20 text-blue-300 border-blue-400/40',
  red: 'bg-rose-400/20 text-rose-300 border-rose-400/40',
  purple: 'bg-purple-400/20 text-purple-300 border-purple-400/40',
  orange: 'bg-orange-400/20 text-orange-300 border-orange-400/40',
};
