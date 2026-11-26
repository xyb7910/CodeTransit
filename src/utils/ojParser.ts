import { SampleCase } from '../types/workspace';

export interface ParsedProblemPayload {
  title?: string;
  problemCode?: string;
  platform?: string;
  difficulty?: string;
  tags?: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  samples: Array<{ input: string; expectedOutput: string }>;
}

export interface OJProblemAdapter {
  id: string;
  name: string;
  canParse: (raw: string) => boolean;
  parse: (raw: string) => ParsedProblemPayload;
}

function parseMarkdownProblem(raw: string): ParsedProblemPayload {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  let title = '';
  let currentSection: 'description' | 'input' | 'output' | 'constraints' | 'samples' = 'description';

  const buckets: Record<'description' | 'input' | 'output' | 'constraints', string[]> = {
    description: [],
    input: [],
    output: [],
    constraints: [],
  };

  const samples: Array<{ input: string; expectedOutput: string }> = [];
  let pendingInput = '';

  const headingRegex = /^#{1,3}\s+(.+)$/;
  let inCodeFence = false;
  let fenceType: 'input' | 'output' | 'none' = 'none';
  let fenceLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (!inCodeFence) {
        inCodeFence = true;
        fenceLines = [];
        if (currentSection === 'samples') {
          fenceType = pendingInput ? 'output' : 'input';
        } else {
          fenceType = 'none';
        }
      } else {
        inCodeFence = false;
        const blockText = fenceLines.join('\n').trim();
        if (currentSection === 'samples') {
          if (fenceType === 'input') {
            pendingInput = blockText;
          } else if (fenceType === 'output') {
            samples.push({ input: pendingInput, expectedOutput: blockText });
            pendingInput = '';
          }
        } else {
          buckets[currentSection].push('```', ...fenceLines, '```');
        }
        fenceType = 'none';
      }
      continue;
    }

    if (inCodeFence) {
      fenceLines.push(line);
      continue;
    }

    const hMatch = line.match(headingRegex);
    if (hMatch) {
      const hText = hMatch[1].trim();
      const lower = hText.toLowerCase();
      if (!title && line.startsWith('# ')) {
        title = hText;
        continue;
      }
      if (lower.includes('题目描述') || lower.includes('description') || lower.includes('背景')) {
        currentSection = 'description';
        continue;
      }
      if (lower.includes('输入格式') || lower === 'input' || lower.includes('input format')) {
        currentSection = 'input';
        continue;
      }
      if (lower.includes('输出格式') || lower === 'output' || lower.includes('output format')) {
        currentSection = 'output';
        continue;
      }
      if (
        lower.includes('数据范围') ||
        lower.includes('说明') ||
        lower.includes('提示') ||
        lower.includes('constraints') ||
        lower.includes('note')
      ) {
        currentSection = 'constraints';
        continue;
      }
      if (lower.includes('样例') || lower.includes('sample') || lower.includes('example')) {
        currentSection = 'samples';
        continue;
      }
    }

    if (currentSection !== 'samples') {
      buckets[currentSection].push(line);
    }
  }

  return {
    title: title || undefined,
    description: buckets.description.join('\n').trim(),
    inputFormat: buckets.input.join('\n').trim(),
    outputFormat: buckets.output.join('\n').trim(),
    constraints: buckets.constraints.join('\n').trim(),
    samples,
  };
}

function parsePlainOJText(raw: string, platformHint?: string): ParsedProblemPayload {
  const normalized = raw.replace(/\r\n/g, '\n');
  const secSplit = normalized.split(
    /\n(?=(?:题目描述|输入格式|输出格式|输入输出样例|说明\/提示|数据范围|Input|Output|Examples?|Note|Constraints)\s*\n)/i
  );

  let description = '';
  let inputFormat = '';
  let outputFormat = '';
  let constraints = '';
  const samples: Array<{ input: string; expectedOutput: string }> = [];

  for (const chunk of secSplit) {
    const firstLineEnd = chunk.indexOf('\n');
    const head = (firstLineEnd === -1 ? chunk : chunk.slice(0, firstLineEnd)).trim().toLowerCase();
    const body = firstLineEnd === -1 ? '' : chunk.slice(firstLineEnd + 1).trim();

    if (head.startsWith('题目描述')) {
      description = body;
    } else if (head.startsWith('输入格式') || head === 'input') {
      inputFormat = body;
    } else if (head.startsWith('输出格式') || head === 'output') {
      outputFormat = body;
    } else if (head.startsWith('说明') || head.startsWith('数据范围') || head.startsWith('note') || head.startsWith('constraints')) {
      constraints = constraints ? `${constraints}\n\n${body}` : body;
    } else if (head.startsWith('输入输出样例') || head.startsWith('example')) {
      const inMatch = body.match(/输入\s*#\d*\s*\n([\s\S]*?)(?=\n输出|\nCopy|$)/i);
      const outMatch = body.match(/输出\s*#\d*\s*\n([\s\S]*?)(?=\n输入|\n说明|$)/i);
      if (inMatch || outMatch) {
        samples.push({
          input: (inMatch?.[1] || '').trim(),
          expectedOutput: (outMatch?.[1] || '').trim(),
        });
      }
    } else {
      description = description ? `${description}\n\n${chunk.trim()}` : chunk.trim();
    }
  }

  return {
    platform: platformHint,
    description: description || normalized.trim(),
    inputFormat,
    outputFormat,
    constraints,
    samples,
  };
}

export const OJ_ADAPTERS: OJProblemAdapter[] = [
  {
    id: 'markdown',
    name: 'Markdown 标准题面',
    canParse: (raw) => /^#{1,3}\s+/m.test(raw),
    parse: (raw) => parseMarkdownProblem(raw),
  },
  {
    id: 'luogu',
    name: '洛谷 (Luogu) 文本适配',
    canParse: (raw) => /题目描述|输入格式|输出格式|说明\/提示/.test(raw),
    parse: (raw) => parsePlainOJText(raw, '洛谷'),
  },
  {
    id: 'codeforces',
    name: 'Codeforces / AtCoder 文本适配',
    canParse: (raw) => /\nInput\n|\nOutput\n|\nExamples?\n/i.test(raw),
    parse: (raw) => parsePlainOJText(raw, 'Codeforces / AtCoder'),
  },
];

export function parseProblemAuto(raw: string, preferredAdapterId?: string): ParsedProblemPayload {
  if (preferredAdapterId) {
    const adapter = OJ_ADAPTERS.find((a) => a.id === preferredAdapterId);
    if (adapter) return adapter.parse(raw);
  }
  for (const adapter of OJ_ADAPTERS) {
    if (adapter.canParse(raw)) {
      return adapter.parse(raw);
    }
  }
  return parseMarkdownProblem(raw);
}

export function buildSampleCasesFromParsed(
  parsedSamples: Array<{ input: string; expectedOutput: string }>
): SampleCase[] {
  return parsedSamples.map((s, idx) => ({
    id: `smp-import-${Date.now()}-${idx}`,
    name: `导入样例 #${idx + 1}`,
    type: 'official',
    input: s.input,
    expectedOutput: s.expectedOutput,
    actualOutput: '',
    explanation: '',
    collapsed: false,
  }));
}
