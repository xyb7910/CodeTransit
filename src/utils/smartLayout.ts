import { AlgoCanvasItem } from '../types/algorithmStudio';

export interface LayoutOverlapReport {
  hasOverlap: boolean;
  pairs: Array<[string, string]>;
  outOfBounds: string[];
}

export function detectArtboardOverlaps(
  items: AlgoCanvasItem[],
  boardWidth: number,
  boardHeight: number
): LayoutOverlapReport {
  const visible = items.filter((i) => i.visible);
  const pairs: Array<[string, string]> = [];
  const outOfBounds: string[] = [];

  for (let i = 0; i < visible.length; i++) {
    const a = visible[i];
    if (a.x < 0 || a.y < 0 || a.x + a.width > boardWidth || a.y + a.height > boardHeight) {
      outOfBounds.push(a.name);
    }
    for (let j = i + 1; j < visible.length; j++) {
      const b = visible[j];
      const overlapX = a.x < b.x + b.width - 4 && a.x + a.width > b.x + 4;
      const overlapY = a.y < b.y + b.height - 4 && a.y + a.height > b.y + 4;
      if (overlapX && overlapY) {
        pairs.push([a.name, b.name]);
      }
    }
  }

  return {
    hasOverlap: pairs.length > 0 || outOfBounds.length > 0,
    pairs,
    outOfBounds,
  };
}

/**
 * Smart semantic layout engine:
 * Places primary visual structures on the left/main stage, auxiliary/DP structures
 * below or beside without overlaps, and variable watchers / formulas / annotations in a right rail.
 */
export function smartArrangeArtboard(
  items: AlgoCanvasItem[],
  boardWidth = 980,
  boardHeight = 620
): AlgoCanvasItem[] {
  const pad = 28;
  const gap = 20;
  const rightRailTypes = new Set([
    'variable-watcher',
    'complexity-card',
    'math-formula',
    'callout',
    'text-box',
  ]);

  const unlocked = items.filter((it) => !it.locked);
  const locked = items.filter((it) => it.locked);

  const railItems = unlocked.filter((it) => rightRailTypes.has(it.type));
  const stageItems = unlocked.filter((it) => !rightRailTypes.has(it.type));

  const railWidth = railItems.length > 0 ? Math.min(280, Math.max(...railItems.map((r) => r.width))) : 0;
  const stageMaxW = railItems.length > 0 ? Math.max(460, boardWidth - railWidth - pad * 2 - gap) : boardWidth - pad * 2;

  const placed: AlgoCanvasItem[] = [...locked];

  // Layout stage items in clean non-overlapping rows
  let curX = pad;
  let curY = pad;
  let rowH = 0;

  for (const item of stageItems) {
    const w = Math.min(item.width, stageMaxW);
    const h = item.height;
    if (curX + w > pad + stageMaxW && curX > pad) {
      curX = pad;
      curY += rowH + gap;
      rowH = 0;
    }
    placed.push({
      ...item,
      x: Math.round(curX),
      y: Math.round(curY),
      width: Math.round(w),
      height: Math.round(h),
    });
    curX += w + gap;
    rowH = Math.max(rowH, h);
  }

  // Layout right rail items vertically
  if (railItems.length > 0) {
    const railX = Math.max(pad + stageMaxW + gap, boardWidth - railWidth - pad);
    let railY = pad;
    for (const item of railItems) {
      const w = Math.min(item.width, boardWidth - railX - pad);
      const safeW = Math.max(180, w);
      placed.push({
        ...item,
        x: Math.round(railX),
        y: Math.round(railY),
        width: Math.round(safeW),
      });
      railY += item.height + 16;
      if (railY > boardHeight - 40) {
        // wrap gracefully if overflowed vertically
        railY = Math.max(pad, curY + rowH + gap);
      }
    }
  }

  // Preserve original item order
  const byId = new Map(placed.map((it) => [it.id, it]));
  return items.map((it) => byId.get(it.id) || it);
}
