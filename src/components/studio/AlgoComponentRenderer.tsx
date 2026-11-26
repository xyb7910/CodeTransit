import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import {
  AlgoAnnotationData,
  AlgoArrayData,
  AlgoCanvasItem,
  AlgoCodeBlockData,
  AlgoDpData,
  AlgoDsuData,
  AlgoFreehandData,
  AlgoGraphData,
  AlgoHashSetData,
  AlgoLinearData,
  AlgoMathGeoData,
  AlgoMatrixData,
  AlgoRecursionData,
  AlgoShapeData,
  AlgoTreeData,
  AlgoTreeNode,
  AlgoVariable,
  InnerSubSelection,
} from '../../types/algorithmStudio';
import { HighlightColor } from '../../types/workspace';
import { renderLatexToHtml } from '../../utils/markdown';

interface AlgoComponentRendererProps {
  item: AlgoCanvasItem;
  stepVariables?: AlgoVariable[];
  hideAnswers?: boolean;
  studentView?: boolean;
  interactiveGraphDrag?: boolean;
  innerEditMode?: boolean;
  activeSubSelection?: InnerSubSelection | null;
  onMoveGraphNode?: (itemId: string, nodeId: string, x: number, y: number) => void;
  onSubSelect?: (sub: InnerSubSelection) => void;
  onSubDoubleClickEdit?: (sub: InnerSubSelection, newValue: string) => void;
  onSubContextMenu?: (e: React.MouseEvent, sub: InnerSubSelection) => void;
}

const HL_STYLES: Record<HighlightColor, { bg: string; border: string; text: string; hex: string }> = {
  yellow: { bg: 'bg-amber-500/20', border: 'border-amber-400', text: 'text-amber-300', hex: '#FBBF24' },
  green: { bg: 'bg-emerald-500/20', border: 'border-emerald-400', text: 'text-emerald-300', hex: '#34D399' },
  blue: { bg: 'bg-blue-500/25', border: 'border-blue-400', text: 'text-blue-300', hex: '#60A5FA' },
  red: { bg: 'bg-rose-500/20', border: 'border-rose-400', text: 'text-rose-300', hex: '#FB7185' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-400', text: 'text-purple-300', hex: '#C084FC' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-400', text: 'text-orange-300', hex: '#FB923C' },
};

const SHADOW_MAP: Record<NonNullable<AlgoCanvasItem['style']['shadow']>, string> = {
  none: 'none',
  sm: '0 2px 6px rgba(0, 0, 0, 0.25)',
  md: '0 8px 22px rgba(0, 0, 0, 0.36)',
  lg: '0 16px 38px rgba(0, 0, 0, 0.52)',
};

function sanitizeLatexHtml(latex: string, displayMode = false): string {
  const html = renderLatexToHtml(latex, displayMode);
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mtext', 'annotation'],
    ADD_ATTR: ['xmlns', 'encoding', 'class', 'style'],
  });
}

function renderLinearView(data: AlgoLinearData) {
  const isVert = data.direction === 'vertical';
  return (
    <div className="w-full h-full p-3 flex flex-col justify-between gap-2">
      <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span>{data.caption || 'Linear'}</span>
        <span className="tabular-nums">size={data.items.length}</span>
      </div>
      <div
        className={`flex-1 flex ${
          isVert ? 'flex-col-reverse justify-start items-center' : 'flex-row items-center justify-start'
        } gap-1.5 overflow-auto`}
      >
        {data.items.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono">EMPTY</div>
        ) : (
          data.items.map((item, i) => {
            const hlKey = data.highlightedIndices?.[i];
            const hl = hlKey ? HL_STYLES[hlKey] : null;
            return (
              <div
                key={i}
                className={`px-3 py-1.5 rounded border font-mono text-xs font-semibold tabular-nums shrink-0 ${
                  isVert ? 'w-full text-center' : 'min-w-[44px] text-center'
                } ${
                  hl ? `${hl.bg} ${hl.border} ${hl.text}` : 'bg-slate-800 border-slate-700 text-slate-100'
                }`}
              >
                {String(item)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function renderHashSetView(data: AlgoHashSetData) {
  return (
    <div className="w-full h-full p-3 flex flex-col gap-1.5 overflow-auto font-mono text-xs">
      {data.buckets.map((b) => {
        const hlKey = data.highlightedKeys?.[b.key];
        const hl = hlKey ? HL_STYLES[hlKey] : null;
        return (
          <div key={b.key} className="flex items-center gap-2">
            <div
              className={`w-8 h-7 rounded border flex items-center justify-center shrink-0 ${
                hl ? `${hl.bg} ${hl.border} ${hl.text}` : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {b.key}
            </div>
            <span className="text-slate-500">→</span>
            <div className="flex items-center gap-1 flex-wrap">
              {b.values.map((v, vi) => (
                <span key={vi} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                  {v}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderDsuView(data: AlgoDsuData) {
  return (
    <div className="w-full h-full p-3 flex flex-col justify-center gap-2 font-mono text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        {data.parent.map((fa, i) => {
          const hlKey = data.highlightedNodes?.[i];
          const hl = hlKey ? HL_STYLES[hlKey] : null;
          const isRoot = fa === i;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`px-2.5 py-1.5 rounded border text-center min-w-[44px] tabular-nums ${
                  hl
                    ? `${hl.bg} ${hl.border} ${hl.text} font-bold`
                    : isRoot
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                fa={fa}
              </div>
              <span className="text-[10px] text-slate-400 tabular-nums">i={i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function layoutTreeNodes(data: AlgoTreeData, w: number, h: number) {
  const map = new Map<string, AlgoTreeNode>(data.nodes.map((n) => [n.id, n]));
  const positions = new Map<string, { x: number; y: number }>();
  const edges: Array<{ from: string; to: string }> = [];
  if (!data.rootId || !map.has(data.rootId)) return { positions, edges };

  const depths = new Map<string, number>();
  let maxDepth = 0;

  const getChildren = (node: AlgoTreeNode): string[] => {
    if (node.children && node.children.length > 0) return node.children;
    const ch: string[] = [];
    if (node.left) ch.push(node.left);
    if (node.right) ch.push(node.right);
    return ch;
  };

  let leafCounter = 0;
  const xRaw = new Map<string, number>();

  function dfs(id: string, depth: number): number {
    const nd = map.get(id);
    if (!nd) return 0;
    depths.set(id, depth);
    maxDepth = Math.max(maxDepth, depth);
    const ch = getChildren(nd).filter((cid) => map.has(cid));
    if (ch.length === 0) {
      const px = leafCounter++;
      xRaw.set(id, px);
      return px;
    }
    let sum = 0;
    for (const cid of ch) {
      edges.push({ from: id, to: cid });
      sum += dfs(cid, depth + 1);
    }
    const avg = sum / ch.length;
    xRaw.set(id, avg);
    return avg;
  }

  dfs(data.rootId, 0);
  const totalLeaves = Math.max(1, leafCounter - 1);
  const padX = 36;
  const padY = 34;

  for (const [id, rx] of xRaw.entries()) {
    const d = depths.get(id) ?? 0;
    const x = totalLeaves === 0 ? w / 2 : padX + (rx / totalLeaves) * (w - padX * 2);
    const y = maxDepth === 0 ? h / 2 : padY + (d / maxDepth) * (h - padY * 2);
    positions.set(id, { x, y });
  }

  return { positions, edges };
}

function renderTreeView(
  itemId: string,
  data: AlgoTreeData,
  width: number,
  height: number,
  innerEditMode: boolean,
  activeSubSelection?: InnerSubSelection | null,
  onSubSelect?: (sub: InnerSubSelection) => void
) {
  const w = Math.max(240, width - 8);
  const h = Math.max(160, height - 32);
  const { positions, edges } = layoutTreeNodes(data, w, h);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full select-none">
      {edges.map((e, i) => {
        const p1 = positions.get(e.from);
        const p2 = positions.get(e.to);
        if (!p1 || !p2) return null;
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="#475569"
            strokeWidth={1.75}
          />
        );
      })}
      {data.nodes.map((nd) => {
        const p = positions.get(nd.id);
        if (!p) return null;
        const hlKey = nd.highlight || data.highlightedNodeIds?.[nd.id];
        const hex = hlKey ? HL_STYLES[hlKey].hex : '#3B82F6';
        const isSubSel =
          activeSubSelection?.itemId === itemId &&
          activeSubSelection.kind === 'tree-node' &&
          activeSubSelection.nodeId === nd.id;
        return (
          <g
            key={nd.id}
            transform={`translate(${p.x}, ${p.y})`}
            className={innerEditMode ? 'cursor-pointer' : ''}
            onPointerDown={(e) => {
              if (!innerEditMode || !onSubSelect) return;
              e.stopPropagation();
              onSubSelect({ itemId, kind: 'tree-node', nodeId: nd.id });
            }}
          >
            <circle
              r={17}
              fill={hlKey ? `${hex}33` : '#1E293B'}
              stroke={isSubSel ? '#FBBF24' : hlKey ? hex : '#64748B'}
              strokeWidth={isSubSel ? 3 : 2}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="#F8FAFC"
              fontSize={11}
              fontFamily="monospace"
              fontWeight="600"
            >
              {nd.label}
            </text>
            {nd.range && (
              <text y={26} textAnchor="middle" fill="#94A3B8" fontSize={9} fontFamily="monospace">
                [{nd.range[0]},{nd.range[1]}]
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function GraphSvgView({
  itemId,
  data,
  width,
  height,
  interactiveDrag,
  activeSubSelection,
  onMoveNode,
  onSubSelect,
  onSubContextMenu,
}: {
  itemId: string;
  data: AlgoGraphData;
  width: number;
  height: number;
  interactiveDrag?: boolean;
  activeSubSelection?: InnerSubSelection | null;
  onMoveNode?: (itemId: string, nodeId: string, x: number, y: number) => void;
  onSubSelect?: (sub: InnerSubSelection) => void;
  onSubContextMenu?: (e: React.MouseEvent, sub: InnerSubSelection) => void;
}) {
  const vw = Math.max(260, width - 8);
  const vh = Math.max(180, height - 32);
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [draggingNode, setDraggingNode] = React.useState<string | null>(null);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingNode || !svgRef.current || !onMoveNode) return;
    const rect = svgRef.current.getBoundingClientRect();
    const nx = Math.max(24, Math.min(vw - 24, ((e.clientX - rect.left) / rect.width) * vw));
    const ny = Math.max(24, Math.min(vh - 24, ((e.clientY - rect.top) / rect.height) * vh));
    onMoveNode(itemId, draggingNode, Math.round(nx), Math.round(ny));
  };

  const pairCounts = new Map<string, number>();
  const pairIndexes = new Map<string, number>();
  for (const edge of data.edges) {
    const k = [edge.from, edge.to].sort().join('::');
    pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vw} ${vh}`}
      className="w-full h-full select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDraggingNode(null)}
      onPointerLeave={() => setDraggingNode(null)}
    >
      <defs>
        <marker id={`arrow-${itemId}`} viewBox="0 0 10 10" refX="21" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#64748B" />
        </marker>
        <marker id={`arrow-hl-${itemId}`} viewBox="0 0 10 10" refX="21" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#FB923C" />
        </marker>
      </defs>

      {data.edges.map((edge) => {
        const u = nodeMap.get(edge.from);
        const v = nodeMap.get(edge.to);
        if (!u || !v) return null;

        const hlHex = edge.highlight ? HL_STYLES[edge.highlight].hex : '#64748B';
        const markerEnd = edge.directed
          ? edge.highlight
            ? `url(#arrow-hl-${itemId})`
            : `url(#arrow-${itemId})`
          : undefined;

        const edgeLabel =
          data.variant === 'network-flow' && edge.capacity !== undefined
            ? `${edge.flow ?? 0}/${edge.capacity}`
            : edge.weight !== undefined
            ? String(edge.weight)
            : edge.label || '';

        if (u.id === v.id) {
          const lx = u.x;
          const ly = u.y - 36;
          return (
            <g key={edge.id}>
              <path
                d={`M ${u.x - 10} ${u.y - 12} C ${u.x - 28} ${u.y - 46}, ${u.x + 28} ${u.y - 46}, ${u.x + 10} ${u.y - 12}`}
                fill="none"
                stroke={hlHex}
                strokeWidth={edge.highlight ? 2.5 : 1.75}
                markerEnd={markerEnd}
              />
              {edgeLabel && (
                <text x={lx} y={ly} textAnchor="middle" fill="#CBD5E1" fontSize={10} fontFamily="monospace">
                  {edgeLabel}
                </text>
              )}
            </g>
          );
        }

        const k = [edge.from, edge.to].sort().join('::');
        const total = pairCounts.get(k) ?? 1;
        const idx = pairIndexes.get(k) ?? 0;
        pairIndexes.set(k, idx + 1);

        const mx = (u.x + v.x) / 2;
        const my = (u.y + v.y) / 2;
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        const offset = total > 1 ? (idx - (total - 1) / 2) * 28 : 0;
        const cx = mx + nx * offset;
        const cy = my + ny * offset;

        return (
          <g key={edge.id}>
            {offset === 0 ? (
              <line
                x1={u.x}
                y1={u.y}
                x2={v.x}
                y2={v.y}
                stroke={hlHex}
                strokeWidth={edge.highlight ? 2.5 : 1.75}
                markerEnd={markerEnd}
              />
            ) : (
              <path
                d={`M ${u.x} ${u.y} Q ${cx} ${cy} ${v.x} ${v.y}`}
                fill="none"
                stroke={hlHex}
                strokeWidth={edge.highlight ? 2.5 : 1.75}
                markerEnd={markerEnd}
              />
            )}
            {edgeLabel && (
              <g transform={`translate(${(mx + cx) / 2}, ${(my + cy) / 2})`}>
                <rect x={-12} y={-8} width={24} height={15} rx={4} fill="#0F141E" stroke="#334155" strokeWidth={0.8} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={edge.highlight ? hlHex : '#CBD5E1'}
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {edgeLabel}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {data.nodes.map((nd) => {
        const hlHex = nd.highlight ? HL_STYLES[nd.highlight].hex : null;
        const isSubSel =
          activeSubSelection?.itemId === itemId &&
          activeSubSelection.kind === 'graph-node' &&
          activeSubSelection.nodeId === nd.id;
        return (
          <g
            key={nd.id}
            transform={`translate(${nd.x}, ${nd.y})`}
            className={interactiveDrag ? 'cursor-grab active:cursor-grabbing' : ''}
            onPointerDown={(e) => {
              if (e.button === 2) return;
              if (onSubSelect) {
                onSubSelect({ itemId, kind: 'graph-node', nodeId: nd.id });
              }
              if (!interactiveDrag) return;
              e.stopPropagation();
              setDraggingNode(nd.id);
            }}
            onContextMenu={(e) => {
              if (!onSubContextMenu) return;
              e.preventDefault();
              e.stopPropagation();
              onSubContextMenu(e, { itemId, kind: 'graph-node', nodeId: nd.id });
            }}
          >
            <circle
              r={18}
              fill={hlHex ? `${hlHex}33` : '#1E293B'}
              stroke={isSubSel ? '#FBBF24' : hlHex || '#60A5FA'}
              strokeWidth={isSubSel ? 3 : 2}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="#F8FAFC"
              fontSize={12}
              fontFamily="monospace"
              fontWeight="700"
            >
              {nd.label}
            </text>
            {nd.weight !== undefined && (
              <text y={28} textAnchor="middle" fill="#FBBF24" fontSize={10} fontFamily="monospace">
                {String(nd.weight)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function renderRecursionView(data: AlgoRecursionData) {
  return (
    <div className="w-full h-full p-3 flex flex-col-reverse gap-1.5 overflow-auto font-mono text-xs">
      {data.frames.map((f) => {
        const hl = f.highlight ? HL_STYLES[f.highlight] : null;
        return (
          <div
            key={f.id}
            style={{ marginLeft: `${f.depth * 10}px` }}
            className={`px-2.5 py-1.5 rounded border flex items-center justify-between ${
              hl ? `${hl.bg} ${hl.border} ${hl.text}` : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <span>
              {f.fnName}({f.args})
            </span>
            {f.retVal !== undefined && <span className="text-emerald-300">→ {f.retVal}</span>}
          </div>
        );
      })}
    </div>
  );
}

function renderMathGeoView(data: AlgoMathGeoData) {
  if (data.kind === 'formula') {
    return (
      <div className="w-full h-full p-3 flex items-center justify-between gap-3">
        <div
          className="flex-1 text-center text-slate-100 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitizeLatexHtml(data.latex || 'a + b = c', true) }}
        />
        {data.formulaNumber && (
          <span className="text-xs font-mono text-slate-400 shrink-0">{data.formulaNumber}</span>
        )}
      </div>
    );
  }

  if (data.kind === 'number-line') {
    const min = data.min ?? 0;
    const max = data.max ?? 10;
    const span = Math.max(1, max - min);
    return (
      <svg viewBox="0 0 320 110" className="w-full h-full select-none">
        <line x1={24} y1={58} x2={296} y2={58} stroke="#64748B" strokeWidth={2} />
        {Array.from({ length: Math.min(12, span + 1) }, (_, idx) => {
          const val = min + Math.round((idx * span) / Math.min(11, span));
          const x = 24 + ((val - min) / span) * 272;
          return (
            <g key={idx}>
              <line x1={x} y1={52} x2={x} y2={64} stroke="#94A3B8" strokeWidth={1.5} />
              <text x={x} y={80} textAnchor="middle" fill="#94A3B8" fontSize={10} fontFamily="monospace">
                {val}
              </text>
            </g>
          );
        })}
        {(data.points || []).map((pt, i) => {
          const x = 24 + ((pt.x - min) / span) * 272;
          const hex = pt.color ? HL_STYLES[pt.color].hex : '#3B82F6';
          return (
            <g key={i}>
              <circle cx={x} cy={58} r={5} fill={hex} />
              <text x={x} y={40} textAnchor="middle" fill={hex} fontSize={10} fontFamily="monospace">
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 180" className="w-full h-full select-none">
      <line x1={24} y1={156} x2={296} y2={156} stroke="#475569" strokeWidth={1.5} />
      <line x1={32} y1={16} x2={32} y2={164} stroke="#475569" strokeWidth={1.5} />
      {(data.segments || []).map((s, i) => (
        <line
          key={i}
          x1={32 + s.x1 * 26}
          y1={156 - s.y1 * 18}
          x2={32 + s.x2 * 26}
          y2={156 - s.y2 * 18}
          stroke="#60A5FA"
          strokeWidth={2}
        />
      ))}
      {(data.points || []).map((p, i) => {
        const cx = 32 + p.x * 26;
        const cy = 156 - p.y * 18;
        const hex = p.color ? HL_STYLES[p.color].hex : '#34D399';
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={4.5} fill={hex} />
            <text x={cx + 7} y={cy - 5} fill="#E2E8F0" fontSize={10} fontFamily="monospace">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function renderAnnotationView(
  data: AlgoAnnotationData,
  stepVariables: AlgoVariable[] | undefined,
  hideAnswers: boolean,
  textColor?: string,
  fontSize?: number
) {
  if (data.kind === 'variable-watcher') {
    const vars = stepVariables && stepVariables.length > 0 ? stepVariables : data.variables || [];
    return (
      <div className="w-full h-full p-3 flex flex-col gap-1.5 overflow-auto font-mono text-xs">
        {vars.length === 0 ? (
          <div className="text-slate-500">暂无变量监视数据</div>
        ) : (
          vars.map((v, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-2 py-1 rounded border tabular-nums ${
                v.changed
                  ? 'bg-blue-500/15 border-blue-400/50 text-blue-200'
                  : 'bg-slate-800/70 border-slate-700 text-slate-300'
              }`}
            >
              <span>{v.name}</span>
              <span className="font-semibold">{hideAnswers ? '***' : v.value}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  if (data.kind === 'complexity') {
    return (
      <div className="w-full h-full p-3 flex flex-col justify-center gap-2 text-xs">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
          <span className="text-slate-400">Time</span>
          <span
            className="text-emerald-300 font-semibold"
            dangerouslySetInnerHTML={{
              __html: sanitizeLatexHtml(data.timeComplexity || 'O(n)', false),
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Space</span>
          <span
            className="text-blue-300 font-semibold"
            dangerouslySetInnerHTML={{
              __html: sanitizeLatexHtml(data.spaceComplexity || 'O(1)', false),
            }}
          />
        </div>
      </div>
    );
  }

  if (data.kind === 'table') {
    return (
      <div className="w-full h-full p-2.5 overflow-auto text-xs font-mono">
        <table className="w-full border-collapse">
          {data.tableHeaders && (
            <thead>
              <tr>
                {data.tableHeaders.map((h, i) => (
                  <th key={i} className="border border-slate-700 bg-slate-800 px-2 py-1 text-left text-slate-300">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {(data.tableRows || []).map((row, ri) => (
              <tr key={ri}>
                {row.map((c, ci) => (
                  <td key={ci} className="border border-slate-700/80 px-2 py-1 text-slate-200">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.kind === 'arrow') {
    return (
      <svg viewBox="0 0 240 60" className="w-full h-full">
        <defs>
          <marker id="anno-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#FBBF24" />
          </marker>
        </defs>
        <path
          d={data.arrowStyle === 'curved' ? 'M 20 42 Q 120 8 220 42' : 'M 20 30 L 220 30'}
          fill="none"
          stroke="#FBBF24"
          strokeWidth={2.5}
          strokeDasharray={data.arrowStyle === 'dashed' ? '6 4' : undefined}
          markerEnd="url(#anno-arr)"
        />
      </svg>
    );
  }

  if (data.kind === 'flowchart') {
    return (
      <div className="w-full h-full p-3 flex items-center justify-center gap-2 overflow-auto text-xs">
        {(data.flowNodes || []).map((fn, idx) => (
          <React.Fragment key={fn.id}>
            <div
              className={`px-3 py-1.5 border border-blue-400/60 bg-blue-500/10 text-slate-100 whitespace-nowrap ${
                fn.shape === 'oval' ? 'rounded-full' : 'rounded-md'
              }`}
            >
              {fn.label}
            </div>
            {idx < (data.flowNodes?.length || 0) - 1 && <span className="text-slate-400">→</span>}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{ color: textColor || undefined, fontSize: fontSize ? `${fontSize}px` : undefined }}
      className="w-full h-full p-3 text-xs leading-relaxed text-slate-200 overflow-auto"
    >
      {data.title && <div className="font-semibold text-amber-300 mb-1">{data.title}</div>}
      <div className="whitespace-pre-wrap">{hideAnswers && data.coachOnly ? '【演示模式已隐藏答案解析】' : data.text}</div>
    </div>
  );
}

function renderShapeView(data: AlgoShapeData, textColor?: string, fontSize?: number) {
  return (
    <div
      style={{ color: textColor || '#E2E8F0', fontSize: fontSize ? `${fontSize}px` : '13px' }}
      className="w-full h-full flex items-center justify-center p-2 font-medium text-center select-none"
    >
      {data.label || ''}
    </div>
  );
}

function renderFreehandView(data: AlgoFreehandData, w: number, h: number) {
  if (data.points.length < 2) return null;
  const d = data.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${Math.max(40, w)} ${Math.max(40, h)}`} className="w-full h-full overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={data.strokeColor || '#F59E0B'}
        strokeWidth={data.strokeWidth || 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={data.isHighlighter ? 0.42 : 1}
      />
    </svg>
  );
}

function renderCodeBlockView(data: AlgoCodeBlockData) {
  const lines = (data.code || '').split('\n');
  const hlSet = new Set(data.highlightedLines || []);
  return (
    <div
      style={{ fontSize: `${data.fontSize ?? 12}px` }}
      className="w-full h-full p-2.5 overflow-auto font-mono leading-relaxed bg-[#0B0E14] text-slate-200"
    >
      {lines.map((ln, idx) => {
        const lineNo = idx + 1;
        const isHl = hlSet.has(lineNo);
        const note = data.lineNotes?.[lineNo];
        return (
          <div
            key={lineNo}
            className={`px-1.5 py-0.5 rounded flex items-center gap-2 ${
              isHl ? 'bg-blue-500/25 text-white font-semibold border-l-2 border-blue-400' : ''
            }`}
          >
            <span className="w-5 text-right text-slate-500 shrink-0 select-none tabular-nums">{lineNo}</span>
            <span className="whitespace-pre flex-1">{ln || ' '}</span>
            {note && <span className="text-[10px] text-amber-300 shrink-0">// {note}</span>}
          </div>
        );
      })}
    </div>
  );
}

export const AlgoComponentRenderer: React.FC<AlgoComponentRendererProps> = ({
  item,
  stepVariables,
  hideAnswers = false,
  studentView = false,
  interactiveGraphDrag = false,
  innerEditMode = false,
  activeSubSelection = null,
  onMoveGraphNode,
  onSubSelect,
  onSubDoubleClickEdit,
  onSubContextMenu,
}) => {
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');

  if (!item.visible) return null;
  if (studentView && item.coachOnly) return null;

  const { payload } = item;
  const isChromeless = payload.kind === 'freehand' || payload.kind === 'shape';

  const commitInlineEdit = (sub: InnerSubSelection) => {
    if (onSubDoubleClickEdit) {
      onSubDoubleClickEdit(sub, editingDraft);
    }
    setEditingCellKey(null);
  };

  const renderArrayBody = (data: AlgoArrayData) => (
    <div className="w-full h-full flex flex-col justify-center gap-2 p-3 select-none">
      {data.rangeHighlight && (
        <div className="text-[11px] font-mono text-amber-300 flex items-center gap-2">
          <span>{data.rangeHighlight.label || 'Range'}:</span>
          <span className="tabular-nums">
            [{data.rangeHighlight.start}, {data.rangeHighlight.end}]
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {data.items.map((val, idx) => {
          const hlColor = data.highlightedIndices?.[idx];
          const hl = hlColor ? HL_STYLES[hlColor] : null;
          const inRange =
            data.rangeHighlight &&
            idx >= data.rangeHighlight.start &&
            idx <= data.rangeHighlight.end;
          const ptrs = (data.pointers || []).filter((p) => p.index === idx);
          const sub: InnerSubSelection = { itemId: item.id, kind: 'array-cell', index: idx };
          const isSubSel =
            activeSubSelection?.itemId === item.id &&
            activeSubSelection.kind === 'array-cell' &&
            activeSubSelection.index === idx;
          const cellKey = `arr-${idx}`;

          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              {editingCellKey === cellKey ? (
                <input
                  autoFocus
                  value={editingDraft}
                  onChange={(e) => setEditingDraft(e.target.value)}
                  onBlur={() => commitInlineEdit(sub)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitInlineEdit(sub);
                    else if (e.key === 'Escape') setEditingCellKey(null);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-12 h-10 px-1 rounded-md border border-amber-400 bg-slate-950 text-center font-mono text-sm text-white outline-none"
                />
              ) : (
                <div
                  onPointerDown={(e) => {
                    if (!innerEditMode || e.button === 2) return;
                    e.stopPropagation();
                    onSubSelect?.(sub);
                  }}
                  onDoubleClick={(e) => {
                    if (!innerEditMode || item.locked) return;
                    e.stopPropagation();
                    setEditingCellKey(cellKey);
                    setEditingDraft(String(val));
                  }}
                  onContextMenu={(e) => {
                    if (!onSubContextMenu) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onSubContextMenu(e, sub);
                  }}
                  className={`min-w-[40px] h-10 px-2.5 rounded-md border flex items-center justify-center font-mono text-sm font-semibold tabular-nums transition-colors duration-150 ${
                    innerEditMode ? 'cursor-pointer' : ''
                  } ${isSubSel ? 'ring-2 ring-amber-400' : ''} ${
                    hl
                      ? `${hl.bg} ${hl.border} ${hl.text}`
                      : inRange
                      ? 'bg-amber-500/10 border-amber-400/50 text-slate-100'
                      : 'bg-slate-800/80 border-slate-700 text-slate-100'
                  }`}
                >
                  {hideAnswers ? '?' : String(val)}
                </div>
              )}
              {data.indices !== false && (
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">{idx}</span>
              )}
              {ptrs.length > 0 && (
                <div className="flex items-center gap-0.5">
                  {ptrs.map((p, pi) => (
                    <span
                      key={pi}
                      className={`text-[10px] font-mono font-bold px-1 rounded ${HL_STYLES[p.color].bg} ${HL_STYLES[p.color].text}`}
                    >
                      ↑{p.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGridTableBody = (
    kind: 'matrix-cell' | 'dp-cell',
    data: AlgoMatrixData | AlgoDpData
  ) => (
    <div className="w-full h-full p-3 overflow-auto flex flex-col justify-between gap-2">
      {'formula' in data && data.formula && (
        <div
          className="text-xs text-slate-200 bg-slate-900/70 border border-slate-700/80 rounded px-2.5 py-1 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitizeLatexHtml(data.formula, false) }}
        />
      )}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <table className="border-collapse font-mono text-xs tabular-nums">
          {data.colLabels && (
            <thead>
              <tr>
                {data.rowLabels && <th className="px-2 py-1 text-slate-500 text-[10px]" />}
                {data.colLabels.map((c, ci) => (
                  <th key={ci} className="px-2 py-1 text-[10px] text-slate-400 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {data.rows.map((row, ri) => (
              <tr key={ri}>
                {data.rowLabels && (
                  <td className="pr-2 py-1 text-[10px] text-slate-400 text-right whitespace-nowrap">
                    {data.rowLabels[ri]}
                  </td>
                )}
                {row.map((val, ci) => {
                  const hlKey = data.highlightedCells?.[`${ri},${ci}`];
                  const hl = hlKey ? HL_STYLES[hlKey] : null;
                  const isActive = data.activeCell?.r === ri && data.activeCell?.c === ci;
                  const sub: InnerSubSelection = { itemId: item.id, kind, row: ri, col: ci };
                  const isSubSel =
                    activeSubSelection?.itemId === item.id &&
                    activeSubSelection.kind === kind &&
                    activeSubSelection.row === ri &&
                    activeSubSelection.col === ci;
                  const cellKey = `cell-${ri}-${ci}`;
                  return (
                    <td
                      key={ci}
                      onPointerDown={(e) => {
                        if (!innerEditMode || e.button === 2) return;
                        e.stopPropagation();
                        onSubSelect?.(sub);
                      }}
                      onDoubleClick={(e) => {
                        if (!innerEditMode || item.locked) return;
                        e.stopPropagation();
                        setEditingCellKey(cellKey);
                        setEditingDraft(String(val));
                      }}
                      onContextMenu={(e) => {
                        if (!onSubContextMenu) return;
                        e.preventDefault();
                        e.stopPropagation();
                        onSubContextMenu(e, sub);
                      }}
                      className={`min-w-[36px] h-8 px-2 text-center border transition-colors duration-150 ${
                        innerEditMode ? 'cursor-pointer' : ''
                      } ${isSubSel ? 'ring-2 ring-amber-400' : ''} ${
                        isActive
                          ? 'bg-emerald-500/30 border-emerald-400 text-white font-bold'
                          : hl
                          ? `${hl.bg} ${hl.border} ${hl.text} font-semibold`
                          : 'bg-slate-800/70 border-slate-700 text-slate-200'
                      }`}
                    >
                      {editingCellKey === cellKey ? (
                        <input
                          autoFocus
                          value={editingDraft}
                          onChange={(e) => setEditingDraft(e.target.value)}
                          onBlur={() => commitInlineEdit(sub)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitInlineEdit(sub);
                            else if (e.key === 'Escape') setEditingCellKey(null);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="w-10 bg-slate-950 text-center text-white outline-none"
                        />
                      ) : hideAnswers && (ri > 0 || (kind === 'matrix-cell' && ci > 0)) ? (
                        '?'
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: payload.kind === 'freehand' ? 'transparent' : item.style.background || '#111827',
        borderColor: payload.kind === 'freehand' ? 'transparent' : item.style.borderColor || '#334155',
        borderWidth: payload.kind === 'freehand' ? 0 : `${item.style.borderWidth ?? 1}px`,
        borderStyle: item.style.borderStyle || 'solid',
        borderRadius: payload.kind === 'shape' && payload.data.shape === 'circle'
          ? '9999px'
          : `${item.style.borderRadius ?? 10}px`,
        opacity: item.style.opacity ?? 1,
        boxShadow: SHADOW_MAP[item.style.shadow || 'md'],
      }}
      className="w-full h-full flex flex-col overflow-hidden"
    >
      {!isChromeless && (
        <div className="h-7 px-2.5 border-b border-white/10 bg-black/25 flex items-center justify-between text-[11px] font-medium text-slate-300 shrink-0">
          <span className="truncate">{item.name}</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase">
            {innerEditMode ? 'INNER-EDIT' : item.type}
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {payload.kind === 'array' && renderArrayBody(payload.data)}
        {payload.kind === 'matrix' && renderGridTableBody('matrix-cell', payload.data)}
        {payload.kind === 'dp' && renderGridTableBody('dp-cell', payload.data)}
        {payload.kind === 'linear' && renderLinearView(payload.data)}
        {payload.kind === 'hashset' && renderHashSetView(payload.data)}
        {payload.kind === 'dsu' && renderDsuView(payload.data)}
        {payload.kind === 'tree' &&
          renderTreeView(
            item.id,
            payload.data,
            item.width,
            item.height,
            innerEditMode,
            activeSubSelection,
            onSubSelect
          )}
        {payload.kind === 'graph' && (
          <GraphSvgView
            itemId={item.id}
            data={payload.data}
            width={item.width}
            height={item.height}
            interactiveDrag={(interactiveGraphDrag || innerEditMode) && !item.locked}
            activeSubSelection={activeSubSelection}
            onMoveNode={onMoveGraphNode}
            onSubSelect={onSubSelect}
            onSubContextMenu={onSubContextMenu}
          />
        )}
        {payload.kind === 'recursion' && renderRecursionView(payload.data)}
        {payload.kind === 'mathgeo' && renderMathGeoView(payload.data)}
        {payload.kind === 'annotation' &&
          renderAnnotationView(
            payload.data,
            stepVariables,
            hideAnswers,
            item.style.textColor,
            item.style.fontSize
          )}
        {payload.kind === 'shape' &&
          renderShapeView(payload.data, item.style.textColor, item.style.fontSize)}
        {payload.kind === 'freehand' && renderFreehandView(payload.data, item.width, item.height)}
        {payload.kind === 'codeblock' && renderCodeBlockView(payload.data)}
      </div>
    </div>
  );
};
