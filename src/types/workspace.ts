export type Locale = 'zh-CN' | 'en-US';
export type UIThemeMode = 'dark' | 'light';

export type WindowTheme = 'macos' | 'sharp' | 'bw' | 'none';

export type CarbonFontFamily =
  | 'JetBrains Mono'
  | 'Fira Code'
  | 'Hack'
  | 'Source Code Pro'
  | 'IBM Plex Mono'
  | 'Inconsolata';

export type ProgrammingLanguage =
  | 'cpp17'
  | 'c'
  | 'python'
  | 'java'
  | 'javascript'
  | 'typescript'
  | 'go'
  | 'rust'
  | 'sql'
  | 'json'
  | 'markdown'
  | 'html'
  | 'css';

export type TemplatePresetId =
  | 'carbon-classic'
  | 'contest-mode'
  | 'problem-mode'
  | 'teaching-mode'
  | 'solution-mode'
  | 'template-mode'
  | 'debug-mode'
  | 'a4-notes';

export type BlockType =
  | 'title'
  | 'problem'
  | 'keypoints'
  | 'code'
  | 'samples'
  | 'formula'
  | 'solution'
  | 'complexity'
  | 'teaching'
  | 'author';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'red' | 'purple' | 'orange';

export type ProblemSectionKey = 'description' | 'inputFormat' | 'outputFormat' | 'constraints';

export interface ProblemHighlight {
  id: string;
  section: ProblemSectionKey;
  startOffset: number;
  endOffset: number;
  exactText: string;
  prefixContext: string;
  suffixContext: string;
  color: HighlightColor;
  underline: boolean;
  note: string;
  status: 'anchored' | 'orphaned';
  createdAt: number;
}

export type CodeAnnotationType =
  | 'line'
  | 'range'
  | 'box'
  | 'dim'
  | 'arrow'
  | 'note'
  | 'bubble'
  | 'section';

export interface CodeAnnotation {
  id: string;
  type: CodeAnnotationType;
  lineStart: number;
  lineEnd: number;
  colStart?: number;
  colEnd?: number;
  lineFingerprint: string;
  color: HighlightColor;
  title?: string;
  text: string;
  status: 'anchored' | 'orphaned';
}

export type SampleType = 'official' | 'boundary' | 'custom' | 'random' | 'error';
export type SampleLayout = 'split' | 'stacked';
export type SampleDiffMode = 'line' | 'char' | 'token' | 'float';

export interface SampleCase {
  id: string;
  name: string;
  type: SampleType;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  explanation: string;
  collapsed: boolean;
}

export interface CanvasStyleConfig {
  syntaxTheme: string;
  windowTheme: WindowTheme;
  windowTitle: string;
  fontFamily: CarbonFontFamily;
  fontSize: number;
  lineHeight: number;
  lineNumbers: boolean;
  dropShadow: boolean;
  borderRadius: number;
  paddingVertical: number;
  paddingHorizontal: number;
  backgroundMode: 'gradient' | 'solid' | 'transparent' | 'mesh';
  backgroundValue: string;
  watermark: boolean;
  maxWidth: number;
}

export interface BlockStyleOverride {
  accentColor?: string;
  paddingY?: number;
  surfaceTint?: string;
}

export interface CanvasBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  collapsed: boolean;
  customTitle?: string;
  styleOverride?: BlockStyleOverride;
}

export interface TitleBlockData {
  problemTitle: string;
  algorithmName: string;
  problemCode: string;
  platform: string;
  sourceUrl: string;
  difficulty: string;
  tags: string[];
  starred: boolean;
}

export interface ProblemBlockData {
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  highlightsOnly: boolean;
  highlights: ProblemHighlight[];
}

export interface KeypointItem {
  id: string;
  category: 'condition' | 'range' | 'breakthrough';
  text: string;
}

export interface KeypointsBlockData {
  items: KeypointItem[];
}

export interface CodeBlockData {
  language: ProgrammingLanguage;
  fileName: string;
  code: string;
  annotations: CodeAnnotation[];
  dimUnfocused: boolean;
}

export interface SamplesBlockData {
  layout: SampleLayout;
  diffMode: SampleDiffMode;
  floatEpsilon: number;
  cases: SampleCase[];
}

export interface FormulaBlockData {
  title: string;
  latex: string;
  caption: string;
}

export interface SolutionBlockData {
  markdown: string;
}

export interface ComplexityBlockData {
  timeComplexity: string;
  spaceComplexity: string;
  notes: string;
}

export interface TeachingBlockData {
  explanation: string;
  pitfalls: string;
  checklist: string[];
}

export interface AuthorBlockData {
  enabled: boolean;
  name: string;
  subtitle: string;
  showWatermark: boolean;
  showQr: boolean;
  lastTransitCode?: string;
  avatarDataUrl?: string;
}

export interface WorkspaceDocument {
  id: string;
  name: string;
  templatePreset: TemplatePresetId;
  canvasStyle: CanvasStyleConfig;
  blocks: CanvasBlock[];
  titleData: TitleBlockData;
  problemData: ProblemBlockData;
  keypointsData: KeypointsBlockData;
  codeData: CodeBlockData;
  samplesData: SamplesBlockData;
  formulaData: FormulaBlockData;
  solutionData: SolutionBlockData;
  complexityData: ComplexityBlockData;
  teachingData: TeachingBlockData;
  authorData: AuthorBlockData;
  updatedAt: number;
}

export type ContestTier = 'CSP-J' | 'CSP-S' | 'NOIP' | 'ACM';

export type AlgorithmCategory =
  | 'basic'
  | 'search'
  | 'data-structure'
  | 'dp'
  | 'graph'
  | 'string'
  | 'number-theory'
  | 'combinatorics'
  | 'geometry'
  | 'advanced';

export type RepositoryItemKind = 'standard' | 'variant' | 'classic';

export interface RepositoryEntry {
  id: string;
  title: string;
  tier: ContestTier;
  category: AlgorithmCategory;
  kind: RepositoryItemKind;
  difficulty: string;
  stars: number;
  favorite: boolean;
  tags: string[];
  summary: string;
  workspace: WorkspaceDocument;
  updatedAt: number;
}

export interface WorkspaceSnapshot {
  id: string;
  workspaceId: string;
  label: string;
  createdAt: number;
  code: string;
  workspace: WorkspaceDocument;
}
