import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  GraduationCap,
  PenTool,
  Radio,
  RotateCcw,
  UserCheck,
  X,
} from 'lucide-react';
import { SceneSchema } from '../../types/algorithmStudio';
import { Locale } from '../../types/workspace';
import { AlgoComponentRenderer } from './AlgoComponentRenderer';

interface PresentationOverlayProps {
  locale: Locale;
  scene: SceneSchema;
  currentStepIndex: number;
  onSelectStep: (idx: number) => void;
  onClose: () => void;
}

export const PresentationOverlay: React.FC<PresentationOverlayProps> = ({
  locale,
  scene,
  currentStepIndex,
  onSelectStep,
  onClose,
}) => {
  const zh = locale === 'zh-CN';
  const [laserEnabled, setLaserEnabled] = useState(true);
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [studentView, setStudentView] = useState(false);
  const [hideAnswers, setHideAnswers] = useState(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const board =
    scene.artboards.find((a) => a.id === scene.activeArtboardId) || scene.artboards[0];
  const step = scene.steps[currentStepIndex] || null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        onSelectStep(Math.min(scene.steps.length - 1, currentStepIndex + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSelectStep(Math.max(0, currentStepIndex - 1));
      } else if (e.key.toLowerCase() === 'r') {
        onSelectStep(0);
      } else if (e.key.toLowerCase() === 'l') {
        setLaserEnabled((v) => !v);
      } else if (e.key.toLowerCase() === 'h') {
        setHideAnswers((v) => !v);
      } else if (e.key.toLowerCase() === 'c') {
        clearAnnotations();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentStepIndex, scene.steps.length, onClose, onSelectStep]);

  const clearAnnotations = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawEnabled || !drawCanvasRef.current) return;
    drawingRef.current = true;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(
      ((e.clientX - rect.left) / rect.width) * drawCanvasRef.current.width,
      ((e.clientY - rect.top) / rect.height) * drawCanvasRef.current.height
    );
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (laserEnabled) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
    if (!drawEnabled || !drawingRef.current || !drawCanvasRef.current) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(
      ((e.clientX - rect.left) / rect.width) * drawCanvasRef.current.width,
      ((e.clientY - rect.top) / rect.height) * drawCanvasRef.current.height
    );
    ctx.stroke();
  };

  return (
    <div
      onPointerMove={(e) => {
        if (laserEnabled) setLaserPos({ x: e.clientX, y: e.clientY });
      }}
      className="fixed inset-0 z-50 bg-[#080B10] text-slate-100 flex flex-col select-none"
    >
      {/* Top Presentation Toolbar */}
      <header className="h-14 px-5 border-b border-white/10 bg-[#0F141E] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-sm truncate">{scene.name}</span>
          <span className="text-xs font-mono text-blue-400 tabular-nums">
            {scene.steps.length === 0 ? '0/0' : `${currentStepIndex + 1} / ${scene.steps.length}`}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStudentView((v) => !v)}
            className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 cursor-pointer ${
              studentView
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                : 'border-white/15 text-slate-300 hover:bg-white/5'
            }`}
          >
            {studentView ? <GraduationCap className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            <span>{studentView ? (zh ? '学生视角' : 'Student View') : zh ? '教练视角' : 'Coach View'}</span>
          </button>

          <button
            type="button"
            onClick={() => setHideAnswers((v) => !v)}
            className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 cursor-pointer ${
              hideAnswers
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'border-white/15 text-slate-300 hover:bg-white/5'
            }`}
          >
            {hideAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{zh ? '隐藏答案 (H)' : 'Hide Answers (H)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setLaserEnabled((v) => !v)}
            className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 cursor-pointer ${
              laserEnabled
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'border-white/15 text-slate-300 hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{zh ? '激光笔 (L)' : 'Laser (L)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawEnabled((v) => !v)}
            className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 cursor-pointer ${
              drawEnabled
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'border-white/15 text-slate-300 hover:bg-white/5'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{zh ? '课堂标注' : 'Draw'}</span>
          </button>

          <button
            type="button"
            onClick={clearAnnotations}
            className="p-1.5 rounded border border-white/15 hover:bg-white/5 text-slate-300 cursor-pointer"
            title={zh ? '清空画笔 (C)' : 'Clear Ink (C)'}
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ml-2 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{zh ? '退出演示 (Esc)' : 'Exit (Esc)'}</span>
          </button>
        </div>
      </header>

      {/* Main Stage */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 p-5 overflow-hidden">
        {/* Stage Canvas */}
        <div className="col-span-8 relative rounded-xl border border-white/10 bg-[#0F141E] overflow-hidden flex items-center justify-center">
          <div
            style={{ width: `${board.width}px`, height: `${board.height}px` }}
            className="relative scale-[0.88] origin-center"
          >
            {board.items.map((item) => (
              <div
                key={item.id}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.width}px`,
                  height: `${item.height}px`,
                  transform: `rotate(${item.rotation}deg)`,
                  zIndex: item.zIndex,
                }}
                className="absolute"
              >
                <AlgoComponentRenderer
                  item={item}
                  stepVariables={step?.snapshot.variables}
                  hideAnswers={hideAnswers}
                  studentView={studentView}
                />
              </div>
            ))}
          </div>

          {/* Temporary Classroom Ink Layer */}
          <canvas
            ref={drawCanvasRef}
            width={1200}
            height={800}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={() => {
              drawingRef.current = false;
            }}
            className={`absolute inset-0 w-full h-full ${
              drawEnabled ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
            }`}
          />
        </div>

        {/* Side Narrative & Synced Code */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0">
          <div className="p-4 rounded-xl border border-white/10 bg-[#0F141E] space-y-2">
            <div className="text-sm font-bold text-blue-300">
              {step ? step.title : scene.name}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {step ? step.explanation : ''}
            </p>
            {!studentView && step?.coachNote && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                {step.coachNote}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 rounded-xl border border-white/10 bg-[#0F141E] p-3 flex flex-col">
            <div className="text-[11px] font-semibold text-slate-400 mb-2">
              {zh ? '代码联动高亮' : 'Synced Code'}
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5">
              {scene.linkedCode.split('\n').map((ln, idx) => {
                const lnNo = idx + 1;
                const active = step?.codeLines.includes(lnNo);
                return (
                  <div
                    key={lnNo}
                    className={`px-2 py-0.5 rounded flex gap-2 ${
                      active ? 'bg-blue-500/25 text-white font-semibold' : 'text-slate-400'
                    }`}
                  >
                    <span className="w-5 text-right text-slate-600 shrink-0 tabular-nums">
                      {lnNo}
                    </span>
                    <span className="whitespace-pre-wrap">{ln || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Footer Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelectStep(0)}
              className="p-2 rounded-lg border border-white/15 hover:bg-white/5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectStep(Math.max(0, currentStepIndex - 1))}
              className="flex-1 py-2 rounded-lg border border-white/15 hover:bg-white/5 flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> {zh ? '上一步' : 'Prev'}
            </button>
            <button
              type="button"
              onClick={() => onSelectStep(Math.min(scene.steps.length - 1, currentStepIndex + 1))}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer"
            >
              {zh ? '下一步' : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Glowing Laser Pointer */}
      {laserEnabled && laserPos && (
        <div
          style={{ left: `${laserPos.x - 7}px`, top: `${laserPos.y - 7}px` }}
          className="fixed w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_16px_4px_rgba(244,63,94,0.85)] pointer-events-none z-50"
        />
      )}
    </div>
  );
};
