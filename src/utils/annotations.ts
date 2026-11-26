import { CodeAnnotation, ProblemHighlight, ProblemSectionKey } from '../types/workspace';

/**
 * Re-anchors ProblemHighlights when section text is edited.
 * Never guesses wildly: requires exact match or prefix/suffix anchored match;
 * otherwise marks status = 'orphaned' so the UI warns the user explicitly.
 */
export function relocateProblemHighlights(
  highlights: ProblemHighlight[],
  section: ProblemSectionKey,
  newText: string
): ProblemHighlight[] {
  return highlights.map((hl) => {
    if (hl.section !== section) return hl;

    const exact = hl.exactText;
    if (!exact) {
      return { ...hl, status: 'orphaned' };
    }

    // 1. Check original offset
    if (
      hl.startOffset >= 0 &&
      hl.endOffset <= newText.length &&
      newText.slice(hl.startOffset, hl.endOffset) === exact
    ) {
      return { ...hl, status: 'anchored' };
    }

    // 2. Try prefix + exact + suffix context match
    const prefix = hl.prefixContext.slice(-16);
    const suffix = hl.suffixContext.slice(0, 16);
    if (prefix || suffix) {
      const composite = `${prefix}${exact}${suffix}`;
      const compIdx = newText.indexOf(composite);
      if (compIdx !== -1) {
        const startOffset = compIdx + prefix.length;
        const endOffset = startOffset + exact.length;
        return {
          ...hl,
          startOffset,
          endOffset,
          prefixContext: newText.slice(Math.max(0, startOffset - 24), startOffset),
          suffixContext: newText.slice(endOffset, Math.min(newText.length, endOffset + 24)),
          status: 'anchored',
        };
      }
    }

    // 3. Nearest occurrence of exactText if unambiguous or close to old startOffset
    const occurrences: number[] = [];
    let searchFrom = 0;
    while (searchFrom < newText.length) {
      const idx = newText.indexOf(exact, searchFrom);
      if (idx === -1) break;
      occurrences.push(idx);
      searchFrom = idx + Math.max(1, exact.length);
    }

    if (occurrences.length === 1) {
      const startOffset = occurrences[0];
      const endOffset = startOffset + exact.length;
      return {
        ...hl,
        startOffset,
        endOffset,
        prefixContext: newText.slice(Math.max(0, startOffset - 24), startOffset),
        suffixContext: newText.slice(endOffset, Math.min(newText.length, endOffset + 24)),
        status: 'anchored',
      };
    }

    if (occurrences.length > 1) {
      // Only re-anchor multiple occurrences if prefix or suffix validates one of them
      for (const idx of occurrences) {
        const curPre = newText.slice(Math.max(0, idx - 12), idx);
        const curSuf = newText.slice(idx + exact.length, Math.min(newText.length, idx + exact.length + 12));
        if ((prefix && curPre.endsWith(prefix.slice(-6))) || (suffix && curSuf.startsWith(suffix.slice(0, 6)))) {
          const endOffset = idx + exact.length;
          return {
            ...hl,
            startOffset: idx,
            endOffset,
            prefixContext: newText.slice(Math.max(0, idx - 24), idx),
            suffixContext: newText.slice(endOffset, Math.min(newText.length, endOffset + 24)),
            status: 'anchored',
          };
        }
      }
    }

    // Cannot safely re-anchor without misattaching to unrelated text
    return { ...hl, status: 'orphaned' };
  });
}

/**
 * Re-anchors CodeAnnotations when source code lines shift or are edited.
 */
export function relocateCodeAnnotations(
  annotations: CodeAnnotation[],
  newCode: string
): CodeAnnotation[] {
  const lines = newCode.split('\n');

  return annotations.map((ann) => {
    const fp = ann.lineFingerprint.trim();
    const zeroIdx = ann.lineStart - 1;

    // Exact line match at current position
    if (zeroIdx >= 0 && zeroIdx < lines.length && lines[zeroIdx].trim() === fp) {
      return { ...ann, status: 'anchored' };
    }

    if (!fp) {
      if (ann.lineStart >= 1 && ann.lineEnd <= lines.length) {
        return { ...ann, status: 'anchored' };
      }
      return { ...ann, status: 'orphaned' };
    }

    // Search nearest matching line fingerprint
    let bestLine = -1;
    let bestDist = Infinity;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === fp) {
        const dist = Math.abs(i + 1 - ann.lineStart);
        if (dist < bestDist) {
          bestDist = dist;
          bestLine = i + 1;
        }
      }
    }

    if (bestLine !== -1) {
      const span = Math.max(0, ann.lineEnd - ann.lineStart);
      return {
        ...ann,
        lineStart: bestLine,
        lineEnd: Math.min(lines.length, bestLine + span),
        status: 'anchored',
      };
    }

    return { ...ann, status: 'orphaned' };
  });
}
