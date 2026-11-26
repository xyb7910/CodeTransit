import {
  BlockType,
  CarbonFontFamily,
  HighlightColor,
  ProgrammingLanguage,
  TemplatePresetId,
  WorkspaceDocument,
} from '../types/workspace';

export interface CarbonSyntaxTheme {
  id: string;
  name: string;
  isDark: boolean;
  background: string;
  foreground: string;
  gutterForeground: string;
  selection: string;
  cursor: string;
  lineHighlight: string;
  tokens: {
    comment: string;
    keyword: string;
    string: string;
    number: string;
    type: string;
    function: string;
    operator: string;
    variable: string;
    property: string;
    punctuation: string;
  };
}

export const CARBON_THEMES: CarbonSyntaxTheme[] = [
  {
    id: 'seti',
    name: 'Seti',
    isDark: true,
    background: '#151718',
    foreground: '#CFD2D1',
    gutterForeground: '#4F5A65',
    selection: 'rgba(85, 181, 219, 0.22)',
    cursor: '#E6CD69',
    lineHighlight: 'rgba(255, 255, 255, 0.04)',
    tokens: {
      comment: '#41535B',
      keyword: '#E6CD69',
      string: '#55B5DB',
      number: '#CD3F45',
      type: '#9FCA56',
      function: '#55B5DB',
      operator: '#9FCA56',
      variable: '#CFD2D1',
      property: '#A074C4',
      punctuation: '#859900',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    isDark: true,
    background: '#282A36',
    foreground: '#F8F8F2',
    gutterForeground: '#6272A4',
    selection: 'rgba(68, 71, 90, 0.75)',
    cursor: '#F8F8F2',
    lineHighlight: 'rgba(68, 71, 90, 0.45)',
    tokens: {
      comment: '#6272A4',
      keyword: '#FF79C6',
      string: '#F1FA8C',
      number: '#BD93F9',
      type: '#8BE9FD',
      function: '#50FA7B',
      operator: '#FF79C6',
      variable: '#F8F8F2',
      property: '#8BE9FD',
      punctuation: '#F8F8F2',
    },
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    isDark: true,
    background: '#282C34',
    foreground: '#ABB2BF',
    gutterForeground: '#5C6370',
    selection: 'rgba(62, 68, 81, 0.8)',
    cursor: '#528BFF',
    lineHighlight: 'rgba(255, 255, 255, 0.04)',
    tokens: {
      comment: '#5C6370',
      keyword: '#C678DD',
      string: '#98C379',
      number: '#D19A66',
      type: '#E5C07B',
      function: '#61AFEF',
      operator: '#56B6C2',
      variable: '#E06C75',
      property: '#E06C75',
      punctuation: '#ABB2BF',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    isDark: true,
    background: '#272822',
    foreground: '#F8F8F2',
    gutterForeground: '#75715E',
    selection: 'rgba(73, 72, 62, 0.85)',
    cursor: '#F8F8F0',
    lineHighlight: 'rgba(255, 255, 255, 0.05)',
    tokens: {
      comment: '#75715E',
      keyword: '#F92672',
      string: '#E6DB74',
      number: '#AE81FF',
      type: '#66D9EF',
      function: '#A6E22E',
      operator: '#F92672',
      variable: '#F8F8F2',
      property: '#A6E22E',
      punctuation: '#F8F8F2',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    isDark: true,
    background: '#2E3440',
    foreground: '#D8DEE9',
    gutterForeground: '#616E88',
    selection: 'rgba(67, 76, 94, 0.85)',
    cursor: '#D8DEE9',
    lineHighlight: 'rgba(59, 66, 82, 0.7)',
    tokens: {
      comment: '#616E88',
      keyword: '#81A1C1',
      string: '#A3BE8C',
      number: '#B48EAD',
      type: '#8FBCBB',
      function: '#88C0D0',
      operator: '#81A1C1',
      variable: '#D8DEE9',
      property: '#88C0D0',
      punctuation: '#ECEFF4',
    },
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    isDark: true,
    background: '#011627',
    foreground: '#D6DEEB',
    gutterForeground: '#4B6479',
    selection: 'rgba(29, 59, 83, 0.85)',
    cursor: '#80A4C2',
    lineHighlight: 'rgba(255, 255, 255, 0.05)',
    tokens: {
      comment: '#637777',
      keyword: '#C792EA',
      string: '#ECC48D',
      number: '#F78C6C',
      type: '#FFCB8B',
      function: '#82AAFF',
      operator: '#7FDBCA',
      variable: '#D6DEEB',
      property: '#80CBC4',
      punctuation: '#C792EA',
    },
  },
  {
    id: 'synthwave-84',
    name: "Synthwave '84",
    isDark: true,
    background: '#2B213A',
    foreground: '#F0EFF1',
    gutterForeground: '#6E6385',
    selection: 'rgba(255, 126, 219, 0.22)',
    cursor: '#FF7EDB',
    lineHighlight: 'rgba(255, 255, 255, 0.05)',
    tokens: {
      comment: '#848BBD',
      keyword: '#FEDE5D',
      string: '#FF8B39',
      number: '#F97E72',
      type: '#36F9F6',
      function: '#36F9F6',
      operator: '#FEDE5D',
      variable: '#FF7EDB',
      property: '#72F1B8',
      punctuation: '#B6B1B1',
    },
  },
  {
    id: 'material',
    name: 'Material',
    isDark: true,
    background: '#263238',
    foreground: '#EEFFFF',
    gutterForeground: '#546E7A',
    selection: 'rgba(128, 203, 196, 0.2)',
    cursor: '#FFCC00',
    lineHighlight: 'rgba(0, 0, 0, 0.16)',
    tokens: {
      comment: '#546E7A',
      keyword: '#C792EA',
      string: '#C3E88D',
      number: '#F78C6C',
      type: '#FFCB6B',
      function: '#82AAFF',
      operator: '#89DDFF',
      variable: '#EEFFFF',
      property: '#F07178',
      punctuation: '#89DDFF',
    },
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    isDark: true,
    background: '#002240',
    foreground: '#FFFFFF',
    gutterForeground: '#527B9E',
    selection: 'rgba(0, 80, 164, 0.65)',
    cursor: '#FFCC00',
    lineHighlight: 'rgba(0, 59, 112, 0.6)',
    tokens: {
      comment: '#0088FF',
      keyword: '#FF9D00',
      string: '#3AD900',
      number: '#FF628C',
      type: '#80FFBB',
      function: '#FFDD00',
      operator: '#FF9D00',
      variable: '#FFFFFF',
      property: '#9EFFFF',
      punctuation: '#E1EFFF',
    },
  },
  {
    id: 'shades-of-purple',
    name: 'Shades of Purple',
    isDark: true,
    background: '#2D2B55',
    foreground: '#FFFFFF',
    gutterForeground: '#7976B6',
    selection: 'rgba(179, 98, 255, 0.3)',
    cursor: '#FAD000',
    lineHighlight: 'rgba(31, 30, 65, 0.7)',
    tokens: {
      comment: '#B362FF',
      keyword: '#FF9D00',
      string: '#A5FF90',
      number: '#FF628C',
      type: '#9EFFFF',
      function: '#FAD000',
      operator: '#FF9D00',
      variable: '#FFFFFF',
      property: '#9EFFFF',
      punctuation: '#E1EFFF',
    },
  },
  {
    id: 'lucario',
    name: 'Lucario',
    isDark: true,
    background: '#2B3E50',
    foreground: '#F8F8F2',
    gutterForeground: '#6D859B',
    selection: 'rgba(72, 102, 130, 0.7)',
    cursor: '#E6C000',
    lineHighlight: 'rgba(36, 52, 67, 0.65)',
    tokens: {
      comment: '#5C98CD',
      keyword: '#FF6541',
      string: '#E6DB74',
      number: '#CA94FF',
      type: '#66D9EF',
      function: '#72C05D',
      operator: '#FF6541',
      variable: '#F8F8F2',
      property: '#66D9EF',
      punctuation: '#F8F8F2',
    },
  },
  {
    id: 'hopscotch',
    name: 'Hopscotch',
    isDark: true,
    background: '#322931',
    foreground: '#D5D3D5',
    gutterForeground: '#797379',
    selection: 'rgba(92, 84, 92, 0.7)',
    cursor: '#D5D3D5',
    lineHighlight: 'rgba(255, 255, 255, 0.05)',
    tokens: {
      comment: '#797379',
      keyword: '#C85E7C',
      string: '#8FC13E',
      number: '#FD8B19',
      type: '#FDCC59',
      function: '#1290BF',
      operator: '#D5D3D5',
      variable: '#DD464C',
      property: '#149B93',
      punctuation: '#D5D3D5',
    },
  },
  {
    id: 'verbatim',
    name: 'Verbatim',
    isDark: true,
    background: '#111111',
    foreground: '#F5F5F5',
    gutterForeground: '#555555',
    selection: 'rgba(255, 255, 255, 0.14)',
    cursor: '#FFFFFF',
    lineHighlight: 'rgba(255, 255, 255, 0.04)',
    tokens: {
      comment: '#6E7681',
      keyword: '#FF7B72',
      string: '#A5D6FF',
      number: '#79C0FF',
      type: '#FFA657',
      function: '#D2A8FF',
      operator: '#FF7B72',
      variable: '#F5F5F5',
      property: '#79C0FF',
      punctuation: '#C9D1D9',
    },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    isDark: true,
    background: '#002B36',
    foreground: '#839496',
    gutterForeground: '#586E75',
    selection: 'rgba(7, 54, 66, 0.9)',
    cursor: '#93A1A1',
    lineHighlight: 'rgba(7, 54, 66, 0.7)',
    tokens: {
      comment: '#586E75',
      keyword: '#859900',
      string: '#2AA198',
      number: '#D33682',
      type: '#B58900',
      function: '#268BD2',
      operator: '#859900',
      variable: '#839496',
      property: '#268BD2',
      punctuation: '#93A1A1',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    isDark: false,
    background: '#FDF6E3',
    foreground: '#657B83',
    gutterForeground: '#93A1A1',
    selection: 'rgba(238, 232, 213, 0.9)',
    cursor: '#586E75',
    lineHighlight: 'rgba(238, 232, 213, 0.65)',
    tokens: {
      comment: '#93A1A1',
      keyword: '#859900',
      string: '#2AA198',
      number: '#D33682',
      type: '#B58900',
      function: '#268BD2',
      operator: '#859900',
      variable: '#657B83',
      property: '#268BD2',
      punctuation: '#586E75',
    },
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    isDark: false,
    background: '#FFFFFF',
    foreground: '#24292F',
    gutterForeground: '#8C959F',
    selection: 'rgba(33, 139, 255, 0.16)',
    cursor: '#0969DA',
    lineHighlight: 'rgba(234, 238, 242, 0.65)',
    tokens: {
      comment: '#6E7781',
      keyword: '#CF222E',
      string: '#0A3069',
      number: '#0550AE',
      type: '#953800',
      function: '#8250DF',
      operator: '#CF222E',
      variable: '#24292F',
      property: '#0550AE',
      punctuation: '#24292F',
    },
  },
];

export const CARBON_LANGUAGES: { id: ProgrammingLanguage; label: string; ext: string }[] = [
  { id: 'cpp17', label: 'C++17 (GCC)', ext: 'cpp' },
  { id: 'c', label: 'C (C11)', ext: 'c' },
  { id: 'python', label: 'Python 3', ext: 'py' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'go', label: 'Go', ext: 'go' },
  { id: 'rust', label: 'Rust', ext: 'rs' },
  { id: 'sql', label: 'SQL', ext: 'sql' },
  { id: 'json', label: 'JSON', ext: 'json' },
  { id: 'markdown', label: 'Markdown', ext: 'md' },
  { id: 'html', label: 'HTML', ext: 'html' },
  { id: 'css', label: 'CSS', ext: 'css' },
];

export const CARBON_FONTS: { id: CarbonFontFamily; label: string }[] = [
  { id: 'JetBrains Mono', label: 'JetBrains Mono' },
  { id: 'Fira Code', label: 'Fira Code' },
  { id: 'Hack', label: 'Hack' },
  { id: 'Source Code Pro', label: 'Source Code Pro' },
  { id: 'IBM Plex Mono', label: 'IBM Plex Mono' },
  { id: 'Inconsolata', label: 'Inconsolata' },
];

export const CARBON_BACKGROUNDS: {
  id: string;
  label: string;
  mode: 'gradient' | 'solid' | 'mesh';
  value: string;
}[] = [
  {
    id: 'oceanic',
    label: 'Carbon Slate',
    mode: 'gradient',
    value: 'linear-gradient(140deg, #627B9B 0%, #374151 100%)',
  },
  {
    id: 'vermilion',
    label: 'Sunset Ember',
    mode: 'gradient',
    value: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)',
  },
  {
    id: 'cobalt-breeze',
    label: 'Cobalt Wave',
    mode: 'gradient',
    value: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 55%, #0F172A 100%)',
  },
  {
    id: 'jade-mist',
    label: 'Emerald Mist',
    mode: 'gradient',
    value: 'linear-gradient(135deg, #10B981 0%, #0F766E 100%)',
  },
  {
    id: 'aurora-dusk',
    label: 'Aurora Dusk',
    mode: 'mesh',
    value:
      'radial-gradient(circle at 18% 20%, rgba(56, 189, 248, 0.35), transparent 48%), radial-gradient(circle at 82% 78%, rgba(99, 102, 241, 0.35), transparent 52%), linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
  },
  {
    id: 'midnight-ink',
    label: 'Midnight Ink',
    mode: 'solid',
    value: '#181E29',
  },
  {
    id: 'paper-ivory',
    label: 'Studio Paper',
    mode: 'solid',
    value: '#E2E8F0',
  },
  {
    id: 'amber-gold',
    label: 'Solar Gold',
    mode: 'gradient',
    value: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  },
];

export const HIGHLIGHT_COLORS: {
  id: HighlightColor;
  zhLabel: string;
  enLabel: string;
  swatch: string;
  meaningZh: string;
  meaningEn: string;
}[] = [
  {
    id: 'yellow',
    zhLabel: '黄色',
    enLabel: 'Yellow',
    swatch: '#FACC15',
    meaningZh: '关键条件',
    meaningEn: 'Key Condition',
  },
  {
    id: 'green',
    zhLabel: '绿色',
    enLabel: 'Green',
    swatch: '#22C55E',
    meaningZh: '数据规模',
    meaningEn: 'Data Scale',
  },
  {
    id: 'blue',
    zhLabel: '蓝色',
    enLabel: 'Blue',
    swatch: '#3B82F6',
    meaningZh: '算法突破口',
    meaningEn: 'Breakthrough',
  },
  {
    id: 'red',
    zhLabel: '红色',
    enLabel: 'Red',
    swatch: '#EF4444',
    meaningZh: '易错点 / 特判',
    meaningEn: 'Pitfall / Edge Case',
  },
  {
    id: 'purple',
    zhLabel: '紫色',
    enLabel: 'Purple',
    swatch: '#A855F7',
    meaningZh: '数学公式 / 状态定义',
    meaningEn: 'Formula / State',
  },
  {
    id: 'orange',
    zhLabel: '橙色',
    enLabel: 'Orange',
    swatch: '#F97316',
    meaningZh: '重要样例 / 推导',
    meaningEn: 'Key Sample / Derivation',
  },
];

export interface TemplatePresetMeta {
  id: TemplatePresetId;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  blockOrder: BlockType[];
  defaultWidth: number;
}

export const TEMPLATE_PRESETS: TemplatePresetMeta[] = [
  {
    id: 'carbon-classic',
    nameZh: 'Carbon Classic',
    nameEn: 'Carbon Classic',
    descZh: '经典纯净代码图片画布',
    descEn: 'Classic single code snippet canvas',
    blockOrder: ['code'],
    defaultWidth: 820,
  },
  {
    id: 'contest-mode',
    nameZh: '竞赛模式 Contest',
    nameEn: 'Contest Mode',
    descZh: '标题 + 代码 + 输入输出样例 + 作者署名',
    descEn: 'Title, code, I/O samples, and author footer',
    blockOrder: ['title', 'code', 'samples', 'author'],
    defaultWidth: 920,
  },
  {
    id: 'problem-mode',
    nameZh: '读题模式 Problem',
    nameEn: 'Problem Mode',
    descZh: '题目标题 + 题目描述与重点标记 + 重点拆解',
    descEn: 'Title, annotated problem statement, and keypoints',
    blockOrder: ['title', 'problem', 'keypoints', 'author'],
    defaultWidth: 920,
  },
  {
    id: 'teaching-mode',
    nameZh: '教学模式 Teaching',
    nameEn: 'Teaching Mode',
    descZh: '题目重点 + 代码批注 + 公式 + 教学笔记',
    descEn: 'Keypoints, annotated code, math formula, and coaching notes',
    blockOrder: ['title', 'keypoints', 'code', 'formula', 'teaching', 'author'],
    defaultWidth: 960,
  },
  {
    id: 'solution-mode',
    nameZh: '题解模式 Solution',
    nameEn: 'Solution Mode',
    descZh: '完整题面、解题思路、复杂度、代码与样例',
    descEn: 'Full problem, solution walkthrough, complexity, code, and samples',
    blockOrder: ['title', 'problem', 'solution', 'complexity', 'code', 'samples', 'author'],
    defaultWidth: 980,
  },
  {
    id: 'template-mode',
    nameZh: '模板模式 Template',
    nameEn: 'Template Mode',
    descZh: '算法实战模板：标题 + 复杂度 + 代码 + 注意事项',
    descEn: 'Algorithm template card with complexity and pitfalls',
    blockOrder: ['title', 'complexity', 'code', 'teaching', 'author'],
    defaultWidth: 880,
  },
  {
    id: 'debug-mode',
    nameZh: '对拍调试 Debug',
    nameEn: 'Debug Mode',
    descZh: '代码对比 + 边界/错误样例差异 + 易错总结',
    descEn: 'Code review, sample diff checks, and error notes',
    blockOrder: ['title', 'code', 'samples', 'teaching', 'author'],
    defaultWidth: 940,
  },
  {
    id: 'a4-notes',
    nameZh: 'A4 教学讲义',
    nameEn: 'A4 Handout',
    descZh: '适合打印与分页长图的讲义排版',
    descEn: 'A4 print-ready lecture handout with pagination',
    blockOrder: [
      'title',
      'problem',
      'keypoints',
      'formula',
      'solution',
      'complexity',
      'code',
      'teaching',
      'author',
    ],
    defaultWidth: 794,
  },
];

export const DEFAULT_CPP_CODE = `#include <bits/stdc++.h>
using namespace std;

// P1048 [NOIP 2005 普及组] 采药 — 0/1 背包一维空间优化
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int T, M;
    if (!(cin >> T >> M)) return 0;

    vector<int> dp(T + 1, 0);
    for (int i = 0; i < M; ++i) {
        int cost, val;
        cin >> cost >> val;
        // 必须倒序遍历容量，确保每株草药至多被选取一次
        for (int j = T; j >= cost; --j) {
            dp[j] = max(dp[j], dp[j - cost] + val);
        }
    }

    cout << dp[T] << '\\n';
    return 0;
}`;

export function createDefaultWorkspace(): WorkspaceDocument {
  return {
    id: 'ws-default-classic',
    name: '0/1 背包 — 采药 (NOIP 2005)',
    templatePreset: 'carbon-classic',
    canvasStyle: {
      syntaxTheme: 'seti',
      windowTheme: 'macos',
      windowTitle: 'main.cpp',
      fontFamily: 'JetBrains Mono',
      fontSize: 14,
      lineHeight: 1.65,
      lineNumbers: true,
      dropShadow: true,
      borderRadius: 10,
      paddingVertical: 42,
      paddingHorizontal: 44,
      backgroundMode: 'gradient',
      backgroundValue: 'linear-gradient(140deg, #627B9B 0%, #374151 100%)',
      watermark: false,
      maxWidth: 820,
    },
    blocks: [
      { id: 'blk-code', type: 'code', visible: true, collapsed: false },
    ],
    titleData: {
      problemTitle: '采药',
      algorithmName: '0/1 背包动态规划',
      problemCode: 'P1048',
      platform: '洛谷 / NOIP 2005',
      sourceUrl: 'https://www.luogu.com.cn/problem/P1048',
      difficulty: '普及-',
      tags: ['动态规划', '0/1背包', 'CSP-J'],
      starred: true,
    },
    problemData: {
      description:
        '辰辰是个天资聪颖的孩子，他的梦想是成为世界上最伟大的医师。为此，他想拜附近最有威望的医师为师。医师为了判断他的资质，给他出了一个难题。\n\n医师把他带到一个到处都是草药的山洞里对他说：“孩子，这个山洞里有一些不同的草药，采每一株都需要一些时间，每一株也有它自身的价值。我会给你一段时间 $T$，在这段时间里，你可以采到一些草药。如果你是一个聪明的孩子，你应该可以让采到的草药的总价值最大。”',
      inputFormat:
        '第一行有 $2$ 个整数 $T$（$1 \\le T \\le 1000$）和 $M$（$1 \\le M \\le 100$），用一个空格隔开，$T$ 代表总共能够用来采药的时间，$M$ 代表山洞里的草药的数目。\n\n接下来的 $M$ 行每行包括两个在 $1$ 到 $100$ 之间（包括 $1$ 和 $100$）的整数，分别表示采摘某株草药的时间 $t_i$ 和这株草药的价值 $v_i$。',
      outputFormat: '输出在规定的时间内可以采到的草药的最大总价值。',
      constraints: '对于 $30\\%$ 的数据，$M \\le 10$；对于全部数据，$1 \\le T \\le 1000$，$1 \\le M \\le 100$。',
      highlightsOnly: false,
      highlights: [],
    },
    keypointsData: {
      items: [
        {
          id: 'kp-1',
          category: 'condition',
          text: '每株草药只有「采」或「不采」两种决策，属于标准 0/1 背包模型。',
        },
        {
          id: 'kp-2',
          category: 'range',
          text: '时间容量 T <= 1000，物品数量 M <= 100，O(TM) 仅需约 10^5 次运算。',
        },
        {
          id: 'kp-3',
          category: 'breakthrough',
          text: '滚动数组优化为一维后，内层容量 j 必须从 T 倒序枚举至 cost。',
        },
      ],
    },
    codeData: {
      language: 'cpp17',
      fileName: 'main.cpp',
      code: DEFAULT_CPP_CODE,
      annotations: [
        {
          id: 'ca-1',
          type: 'line',
          lineStart: 16,
          lineEnd: 16,
          lineFingerprint: 'for (int j = T; j >= cost; --j) {',
          color: 'blue',
          title: '核心倒序循环',
          text: '倒序更新保证状态来自上一轮 i-1，防止同一物品重复选取',
          status: 'anchored',
        },
      ],
      dimUnfocused: false,
    },
    samplesData: {
      layout: 'split',
      diffMode: 'token',
      floatEpsilon: 1e-6,
      cases: [
        {
          id: 'smp-1',
          name: '官方样例 #1',
          type: 'official',
          input: '70 3\n71 100\n69 1\n1 2',
          expectedOutput: '3',
          actualOutput: '3',
          explanation: '总时间 70，无法采第一株（耗时 71），可选第 2 和第 3 株，总价值 1 + 2 = 3。',
          collapsed: false,
        },
      ],
    },
    formulaData: {
      title: '0/1 背包状态转移方程',
      latex: 'dp[j] = \\max\\bigl(dp[j],\\; dp[j - t_i] + v_i\\bigr), \\quad j = T, T-1, \\dots, t_i',
      caption: '一维滚动数组压缩掉第一维物品编号 i，通过逆序更新保持无后效性。',
    },
    solutionData: {
      markdown:
        '### 解题思路\n\n设 $dp[i][j]$ 表示考虑前 $i$ 株草药、总耗时不超过 $j$ 时能获得的最大价值：\n\n1. 不采第 $i$ 株：$dp[i][j] = dp[i-1][j]$\n2. 采第 $i$ 株（需满足 $j \\ge t_i$）：$dp[i][j] = dp[i-1][j-t_i] + v_i$\n\n由于第 $i$ 行的状态只依赖第 $i-1$ 行左侧位置，省去第一维并倒序遍历 $j$ 即可将空间复杂度从 $\\mathcal{O}(MT)$ 降至 $\\mathcal{O}(T)$。',
    },
    complexityData: {
      timeComplexity: 'O(M \\cdot T)',
      spaceComplexity: 'O(T)',
      notes: 'T <= 1000, M <= 100，最大计算量约 10^5，远低于 1s 时限。',
    },
    teachingData: {
      explanation: '讲课时先写出二维数组版本，再演示为什么一维正序会变成完全背包，帮助学生直观理解状态覆盖方向。',
      pitfalls: '常见错误：内层循环误写为正序 j = cost .. T；或未判断 T < cost 时直接访问负下标。',
      checklist: [
        '确认容量数组大小为 T + 1',
        '确认内层循环倒序遍历',
        '注意结果是否可能超出 int（本题 max <= 10000，int 足够）',
      ],
    },
    authorData: {
      enabled: true,
      name: 'Yanpb',
      subtitle: '信息学竞赛教学笔记 · Yanpb CodeTransit',
      showWatermark: false,
      showQr: false,
    },
    updatedAt: Date.now(),
  };
}
