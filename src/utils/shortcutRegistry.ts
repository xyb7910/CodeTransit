export type ShortcutScope = 'global' | 'canvas' | 'presentation';

export interface ShortcutBinding {
  id: string;
  scope: ShortcutScope;
  combo: string; // canonical lowercase e.g. "mod+z", "mod+shift+z", "v", "shift+1", "?"
  labelZh: string;
  labelEn: string;
  category: 'edit' | 'tools' | 'canvas' | 'project' | 'presentation';
  priority: number;
}

export interface ShortcutConflict {
  combo: string;
  scope: ShortcutScope;
  ids: string[];
}

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  // Basic Edit
  { id: 'undo', scope: 'canvas', combo: 'mod+z', labelZh: '撤销', labelEn: 'Undo', category: 'edit', priority: 10 },
  { id: 'redo', scope: 'canvas', combo: 'mod+shift+z', labelZh: '重做', labelEn: 'Redo', category: 'edit', priority: 10 },
  { id: 'copy', scope: 'canvas', combo: 'mod+c', labelZh: '复制选中元素', labelEn: 'Copy', category: 'edit', priority: 10 },
  { id: 'cut', scope: 'canvas', combo: 'mod+x', labelZh: '剪切选中元素', labelEn: 'Cut', category: 'edit', priority: 10 },
  { id: 'paste', scope: 'canvas', combo: 'mod+v', labelZh: '粘贴元素', labelEn: 'Paste', category: 'edit', priority: 10 },
  { id: 'paste-in-place', scope: 'canvas', combo: 'mod+shift+v', labelZh: '原位置粘贴', labelEn: 'Paste in Place', category: 'edit', priority: 10 },
  { id: 'duplicate', scope: 'canvas', combo: 'mod+d', labelZh: '快速创建副本', labelEn: 'Duplicate', category: 'edit', priority: 10 },
  { id: 'select-all', scope: 'canvas', combo: 'mod+a', labelZh: '全选画布元素', labelEn: 'Select All', category: 'edit', priority: 10 },
  { id: 'invert-select', scope: 'canvas', combo: 'mod+i', labelZh: '反选元素', labelEn: 'Invert Selection', category: 'edit', priority: 10 },
  { id: 'delete', scope: 'canvas', combo: 'delete', labelZh: '删除选中元素', labelEn: 'Delete Selected', category: 'edit', priority: 10 },
  { id: 'backspace-delete', scope: 'canvas', combo: 'backspace', labelZh: '删除选中元素 (Backspace)', labelEn: 'Delete Selected', category: 'edit', priority: 9 },
  { id: 'escape', scope: 'canvas', combo: 'escape', labelZh: '取消当前操作/退出内编辑', labelEn: 'Cancel / Exit Inner Edit', category: 'edit', priority: 10 },
  { id: 'enter-edit', scope: 'canvas', combo: 'enter', labelZh: '进入选中元素内部编辑', labelEn: 'Enter Inner Edit', category: 'edit', priority: 10 },
  { id: 'group', scope: 'canvas', combo: 'mod+g', labelZh: '组合选中元素', labelEn: 'Group', category: 'edit', priority: 10 },
  { id: 'ungroup', scope: 'canvas', combo: 'mod+shift+g', labelZh: '解组选中元素', labelEn: 'Ungroup', category: 'edit', priority: 10 },
  { id: 'toggle-lock', scope: 'canvas', combo: 'mod+l', labelZh: '锁定 / 解锁选中元素', labelEn: 'Toggle Lock', category: 'edit', priority: 10 },
  { id: 'nudge-up', scope: 'canvas', combo: 'arrowup', labelZh: '上移 1px', labelEn: 'Nudge Up', category: 'edit', priority: 8 },
  { id: 'nudge-down', scope: 'canvas', combo: 'arrowdown', labelZh: '下移 1px', labelEn: 'Nudge Down', category: 'edit', priority: 8 },
  { id: 'nudge-left', scope: 'canvas', combo: 'arrowleft', labelZh: '左移 1px', labelEn: 'Nudge Left', category: 'edit', priority: 8 },
  { id: 'nudge-right', scope: 'canvas', combo: 'arrowright', labelZh: '右移 1px', labelEn: 'Nudge Right', category: 'edit', priority: 8 },
  { id: 'nudge-up-fast', scope: 'canvas', combo: 'shift+arrowup', labelZh: '快速上移 10px', labelEn: 'Fast Nudge Up', category: 'edit', priority: 9 },
  { id: 'nudge-down-fast', scope: 'canvas', combo: 'shift+arrowdown', labelZh: '快速下移 10px', labelEn: 'Fast Nudge Down', category: 'edit', priority: 9 },
  { id: 'nudge-left-fast', scope: 'canvas', combo: 'shift+arrowleft', labelZh: '快速左移 10px', labelEn: 'Fast Nudge Left', category: 'edit', priority: 9 },
  { id: 'nudge-right-fast', scope: 'canvas', combo: 'shift+arrowright', labelZh: '快速右移 10px', labelEn: 'Fast Nudge Right', category: 'edit', priority: 9 },

  // Tools
  { id: 'tool-select', scope: 'canvas', combo: 'v', labelZh: '选择工具', labelEn: 'Select Tool', category: 'tools', priority: 5 },
  { id: 'tool-hand', scope: 'canvas', combo: 'h', labelZh: '抓手工具', labelEn: 'Hand Tool', category: 'tools', priority: 5 },
  { id: 'tool-rect', scope: 'canvas', combo: 'r', labelZh: '矩形工具', labelEn: 'Rectangle Tool', category: 'tools', priority: 5 },
  { id: 'tool-circle', scope: 'canvas', combo: 'o', labelZh: '圆形工具', labelEn: 'Circle Tool', category: 'tools', priority: 5 },
  { id: 'tool-arrow', scope: 'canvas', combo: 'a', labelZh: '箭头工具', labelEn: 'Arrow Tool', category: 'tools', priority: 5 },
  { id: 'tool-connector', scope: 'canvas', combo: 'l', labelZh: '智能连线工具', labelEn: 'Connector Tool', category: 'tools', priority: 5 },
  { id: 'tool-text', scope: 'canvas', combo: 't', labelZh: '文本工具', labelEn: 'Text Tool', category: 'tools', priority: 5 },
  { id: 'tool-brush', scope: 'canvas', combo: 'p', labelZh: '画笔工具', labelEn: 'Pen / Brush Tool', category: 'tools', priority: 5 },
  { id: 'tool-highlight', scope: 'canvas', combo: 'm', labelZh: '重点标记工具', labelEn: 'Highlight Marker Tool', category: 'tools', priority: 5 },

  // Canvas Camera & Mode
  { id: 'zoom-in', scope: 'canvas', combo: '=', labelZh: '放大画布 (+)', labelEn: 'Zoom In', category: 'canvas', priority: 6 },
  { id: 'zoom-out', scope: 'canvas', combo: '-', labelZh: '缩小画布 (-)', labelEn: 'Zoom Out', category: 'canvas', priority: 6 },
  { id: 'fit-content', scope: 'canvas', combo: 'shift+1', labelZh: '适应全部内容', labelEn: 'Fit Content', category: 'canvas', priority: 8 },
  { id: 'fit-selection', scope: 'canvas', combo: 'shift+2', labelZh: '适应选中元素', labelEn: 'Fit Selection', category: 'canvas', priority: 8 },
  { id: 'zoom-100', scope: 'canvas', combo: 'shift+0', labelZh: '恢复 100% 缩放', labelEn: 'Reset Zoom 100%', category: 'canvas', priority: 8 },
  { id: 'present-mode', scope: 'canvas', combo: 'f', labelZh: '进入全屏演示模式', labelEn: 'Enter Presentation', category: 'canvas', priority: 6 },

  // Project / Global
  { id: 'save', scope: 'global', combo: 'mod+s', labelZh: '保存当前场景快照', labelEn: 'Save Snapshot', category: 'project', priority: 12 },
  { id: 'save-as', scope: 'global', combo: 'mod+shift+s', labelZh: '另存为 Scene JSON', labelEn: 'Save As JSON', category: 'project', priority: 12 },
  { id: 'export', scope: 'global', combo: 'mod+e', labelZh: '打开导出面板', labelEn: 'Export Studio', category: 'project', priority: 12 },
  { id: 'command-palette', scope: 'global', combo: 'mod+k', labelZh: '打开命令面板', labelEn: 'Command Palette', category: 'project', priority: 15 },
  { id: 'shortcut-help', scope: 'global', combo: '?', labelZh: '快捷键帮助面板', labelEn: 'Shortcut Help', category: 'project', priority: 10 },

  // Presentation / Timeline
  { id: 'pres-next', scope: 'presentation', combo: 'arrowright', labelZh: '下一步', labelEn: 'Next Step', category: 'presentation', priority: 20 },
  { id: 'pres-prev', scope: 'presentation', combo: 'arrowleft', labelZh: '上一步', labelEn: 'Prev Step', category: 'presentation', priority: 20 },
  { id: 'pres-toggle', scope: 'presentation', combo: 'space', labelZh: '播放 / 暂停', labelEn: 'Play / Pause', category: 'presentation', priority: 20 },
  { id: 'pres-home', scope: 'presentation', combo: 'home', labelZh: '回到第 1 步', labelEn: 'First Step', category: 'presentation', priority: 20 },
  { id: 'pres-end', scope: 'presentation', combo: 'end', labelZh: '跳到最后一步', labelEn: 'Last Step', category: 'presentation', priority: 20 },
];

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
}

export function formatShortcutCombo(combo: string, mac = isMacPlatform()): string {
  return combo
    .split('+')
    .map((part) => {
      if (part === 'mod') return mac ? '⌘' : 'Ctrl';
      if (part === 'shift') return mac ? '⇧' : 'Shift';
      if (part === 'alt') return mac ? '⌥' : 'Alt';
      if (part === 'arrowup') return '↑';
      if (part === 'arrowdown') return '↓';
      if (part === 'arrowleft') return '←';
      if (part === 'arrowright') return '→';
      if (part === 'delete') return 'Del';
      if (part === 'backspace') return '⌫';
      if (part === 'escape') return 'Esc';
      if (part === 'space') return 'Space';
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join(mac ? ' ' : ' + ');
}

/**
 * Checks whether keyboard focus is inside a text input, textarea, contenteditable,
 * CodeMirror code editor, or an active CJK IME composition session.
 */
export function isTextEditingFocused(e: {
  target: EventTarget | null;
  isComposing?: boolean;
  keyCode?: number;
}): boolean {
  if (e.isComposing || e.keyCode === 229) return true;
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (typeof el.closest === 'function' && el.closest('.cm-editor, [contenteditable="true"]')) {
    return true;
  }
  return false;
}

const CODE_DIGIT_MAP: Record<string, string> = {
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Equal: '=',
  Minus: '-',
  NumpadAdd: '=',
  NumpadSubtract: '-',
};

export function eventToCanonicalCombo(e: {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');

  let key = (e.key || '').toLowerCase();
  if (key === ' ') key = 'space';
  if (key === '+') key = '=';
  // Handle Shift+Digit producing symbols (!, @, ), etc.)
  if (e.shiftKey && e.code && CODE_DIGIT_MAP[e.code]) {
    key = CODE_DIGIT_MAP[e.code];
  }
  // Ignore Shift prefix for pure '?' character
  if (e.shiftKey && key !== '?' && key !== '=') {
    parts.push('shift');
  }
  parts.push(key);
  return parts.join('+');
}

export function matchShortcut(
  e: {
    key: string;
    code?: string;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    target: EventTarget | null;
    isComposing?: boolean;
    keyCode?: number;
  },
  bindings: ShortcutBinding[],
  activeScopes: ShortcutScope[]
): ShortcutBinding | null {
  const editing = isTextEditingFocused(e);
  const combo = eventToCanonicalCombo(e);

  // During text editing or IME composition, only allow high-priority global mod combos (like mod+s, mod+k) and never single-key tools
  if (editing) {
    if (e.isComposing || e.keyCode === 229) return null;
    if (!(e.ctrlKey || e.metaKey) || !['mod+s', 'mod+k', 'mod+e'].includes(combo)) {
      return null;
    }
  }

  const candidates = bindings
    .filter((b) => activeScopes.includes(b.scope) && b.combo.toLowerCase() === combo)
    .sort((a, b) => b.priority - a.priority);

  return candidates[0] || null;
}

export function detectShortcutConflicts(bindings: ShortcutBinding[]): ShortcutConflict[] {
  const map = new Map<string, string[]>();
  for (const b of bindings) {
    const key = `${b.scope}::${b.combo.toLowerCase()}`;
    const list = map.get(key) || [];
    list.push(b.id);
    map.set(key, list);
  }
  const conflicts: ShortcutConflict[] = [];
  for (const [key, ids] of map.entries()) {
    if (ids.length > 1) {
      const [scope, combo] = key.split('::') as [ShortcutScope, string];
      conflicts.push({ scope, combo, ids });
    }
  }
  return conflicts;
}

const STORAGE_KEY = 'yanpb-algo-shortcuts-v1';

export function loadUserShortcuts(): ShortcutBinding[] {
  if (typeof localStorage === 'undefined') return DEFAULT_SHORTCUTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const overrides = JSON.parse(raw) as Record<string, string>;
    return DEFAULT_SHORTCUTS.map((b) => (overrides[b.id] ? { ...b, combo: overrides[b.id] } : b));
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveUserShortcuts(bindings: ShortcutBinding[]): void {
  if (typeof localStorage === 'undefined') return;
  const overrides: Record<string, string> = {};
  for (const b of bindings) {
    overrides[b.id] = b.combo;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}
