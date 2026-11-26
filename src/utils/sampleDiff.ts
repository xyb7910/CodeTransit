import { SampleDiffMode } from '../types/workspace';

export interface DiffPart {
  value: string;
  status: 'equal' | 'added' | 'removed';
}

export interface SampleDiffResult {
  hasActual: boolean;
  matched: boolean;
  summary: string;
  expectedParts: DiffPart[];
  actualParts: DiffPart[];
}

function normalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, '\n');
}

export function compareSampleOutputs(
  expectedRaw: string,
  actualRaw: string,
  mode: SampleDiffMode,
  epsilon = 1e-6
): SampleDiffResult {
  const hasActual = actualRaw.trim().length > 0;
  if (!hasActual) {
    return {
      hasActual: false,
      matched: false,
      summary: 'Pending actual output',
      expectedParts: [{ value: expectedRaw, status: 'equal' }],
      actualParts: [],
    };
  }

  const expected = normalizeNewlines(expectedRaw);
  const actual = normalizeNewlines(actualRaw);

  if (mode === 'char') {
    const maxLen = Math.max(expected.length, actual.length);
    const expParts: DiffPart[] = [];
    const actParts: DiffPart[] = [];
    let mismatchCount = 0;

    for (let i = 0; i < maxLen; i++) {
      const ec = expected[i];
      const ac = actual[i];
      if (ec === ac) {
        if (ec !== undefined) {
          expParts.push({ value: ec, status: 'equal' });
          actParts.push({ value: ac, status: 'equal' });
        }
      } else {
        mismatchCount++;
        if (ec !== undefined) expParts.push({ value: ec, status: 'removed' });
        if (ac !== undefined) actParts.push({ value: ac, status: 'added' });
      }
    }

    return {
      hasActual: true,
      matched: mismatchCount === 0,
      summary: mismatchCount === 0 ? 'AC' : `${mismatchCount} char diff(s)`,
      expectedParts: mergeAdjacentParts(expParts),
      actualParts: mergeAdjacentParts(actParts),
    };
  }

  if (mode === 'line') {
    const expLines = expected.replace(/\n+$/, '').split('\n');
    const actLines = actual.replace(/\n+$/, '').split('\n');
    const maxLines = Math.max(expLines.length, actLines.length);
    const expParts: DiffPart[] = [];
    const actParts: DiffPart[] = [];
    let mismatchLines = 0;

    for (let i = 0; i < maxLines; i++) {
      const el = expLines[i];
      const al = actLines[i];
      if (el === al) {
        if (el !== undefined) {
          expParts.push({ value: `${el}\n`, status: 'equal' });
          actParts.push({ value: `${al}\n`, status: 'equal' });
        }
      } else {
        mismatchLines++;
        if (el !== undefined) expParts.push({ value: `${el}\n`, status: 'removed' });
        if (al !== undefined) actParts.push({ value: `${al}\n`, status: 'added' });
      }
    }

    return {
      hasActual: true,
      matched: mismatchLines === 0,
      summary: mismatchLines === 0 ? 'AC' : `${mismatchLines} line diff(s)`,
      expectedParts: expParts,
      actualParts: actParts,
    };
  }

  // Token or Float mode
  const expTokens = expected.trim().split(/\s+/).filter(Boolean);
  const actTokens = actual.trim().split(/\s+/).filter(Boolean);
  const maxTokens = Math.max(expTokens.length, actTokens.length);
  const expParts: DiffPart[] = [];
  const actParts: DiffPart[] = [];
  let mismatchTokens = 0;

  for (let i = 0; i < maxTokens; i++) {
    const et = expTokens[i];
    const at = actTokens[i];
    let tokenEqual = et === at;

    if (!tokenEqual && mode === 'float' && et !== undefined && at !== undefined) {
      const en = Number(et);
      const an = Number(at);
      if (Number.isFinite(en) && Number.isFinite(an)) {
        const absErr = Math.abs(en - an);
        const relErr = absErr / Math.max(1, Math.abs(en));
        tokenEqual = absErr <= epsilon || relErr <= epsilon;
      }
    }

    if (tokenEqual) {
      if (et !== undefined) expParts.push({ value: `${et} `, status: 'equal' });
      if (at !== undefined) actParts.push({ value: `${at} `, status: 'equal' });
    } else {
      mismatchTokens++;
      if (et !== undefined) expParts.push({ value: `${et} `, status: 'removed' });
      if (at !== undefined) actParts.push({ value: `${at} `, status: 'added' });
    }
  }

  return {
    hasActual: true,
    matched: mismatchTokens === 0,
    summary: mismatchTokens === 0 ? 'AC' : `${mismatchTokens} token diff(s)`,
    expectedParts: mergeAdjacentParts(expParts),
    actualParts: mergeAdjacentParts(actParts),
  };
}

function mergeAdjacentParts(parts: DiffPart[]): DiffPart[] {
  const merged: DiffPart[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.status === part.status) {
      last.value += part.value;
    } else {
      merged.push({ ...part });
    }
  }
  return merged;
}
