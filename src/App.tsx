import React, { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { X, Lock } from 'lucide-react';
import {
  AlgorithmCategory,
  BlockStyleOverride,
  BlockType,
  CanvasBlock,
  CanvasStyleConfig,
  ContestTier,
  Locale,
  ProgrammingLanguage,
  RepositoryEntry,
  RepositoryItemKind,
  TemplatePresetId,
  UIThemeMode,
  WorkspaceDocument,
  WorkspaceSnapshot,
} from './types/workspace';
import {
  CARBON_LANGUAGES,
  createDefaultWorkspace,
  TEMPLATE_PRESETS,
} from './constants/carbon';
import { getTranslations } from './constants/i18n';
import {
  deleteRepositoryEntry,
  deleteSnapshot,
  loadActiveWorkspace,
  loadPreferences,
  loadRepositoryEntries,
  loadSnapshots,
  saveActiveWorkspace,
  savePreferences,
  saveRepositoryEntry,
  saveSnapshot,
} from './utils/storage';
import { HeaderBar } from './components/HeaderBar';
import { CanvasToolbar } from './components/CanvasToolbar';
import { TemplateSwitcherBar } from './components/TemplateSwitcherBar';
import { SortableBlockWrapper } from './components/SortableBlockWrapper';
import { CodeEditorBlock } from './components/CodeEditorBlock';
import { ProblemBlock } from './components/ProblemBlock';
import { SampleBlock } from './components/SampleBlock';
import {
  AuthorBlock,
  ComplexityBlock,
  FormulaBlock,
  KeypointsBlock,
  SolutionBlock,
  TeachingBlock,
  TitleBlock,
} from './components/OtherBlocks';
import { ExportModal } from './components/ExportModal';
import { TransitModal } from './components/TransitModal';
import { RepositoryModal } from './components/RepositoryModal';
import { WorkspaceGuide, dismissWorkspaceGuide, shouldShowWorkspaceGuide } from './components/WorkspaceGuide';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AlgorithmStudio } from './components/studio/AlgorithmStudio';
import { SceneSchema, StudioMode } from './types/algorithmStudio';
import { AIProfiles } from './types/aiConfig';
import {
  DEFAULT_AI_CONFIG,
  hasConfiguredAiKey,
  loadSessionAiProfiles,
  saveSessionAiProfiles,
} from './utils/aiConfig';

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceDocument>(() => createDefaultWorkspace());
  const [locale, setLocale] = useState<Locale>('zh-CN');
  const [themeMode, setThemeMode] = useState<UIThemeMode>('dark');
  const [syncKey, setSyncKey] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const [studioMode, setStudioMode] = useState<StudioMode>('code');
  const [studioExportSignal, setStudioExportSignal] = useState(0);
  const [transitAlgoScene, setTransitAlgoScene] = useState<SceneSchema | null>(null);
  const [externalStudioScene, setExternalStudioScene] = useState<SceneSchema | null>(null);
  const [showTemplatesBar, setShowTemplatesBar] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTransitModal, setShowTransitModal] = useState(false);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [aiProfiles, setAiProfiles] = useState<AIProfiles>(loadSessionAiProfiles);
  const aiConfig = aiProfiles.profiles.find(({ id }) => id === aiProfiles.activeId) ?? DEFAULT_AI_CONFIG;
  const [initialPickupCode, setInitialPickupCode] = useState('');
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  const [repoEntries, setRepoEntries] = useState<RepositoryEntry[]>([]);
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const t = getTranslations(locale);

  useEffect(() => {
    document.title = `${t.brand} · ${studioMode === 'algorithm' ? t.navAlgoStudio : t.navCanvas}`;
  }, [studioMode, t]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((cur) => (cur === msg ? null : cur));
    }, 2400);
  }, []);

  // Hydrate IndexedDB & query URL pickup code
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [prefs, draft, repo, snaps] = await Promise.all([
        loadPreferences(),
        loadActiveWorkspace(),
        loadRepositoryEntries(),
        loadSnapshots(),
      ]);
      if (!mounted) return;
      setLocale(prefs.locale);
      setThemeMode(prefs.themeMode);
      setSyncKey(prefs.syncKey);
      if (draft) {
        setWorkspace(draft);
      }
      setRepoEntries(repo);
      setSnapshots(snaps);
      setHydrated(true);

      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code') || params.get('transit');
      if (codeParam && /^\d{6}$/.test(codeParam.trim())) {
        setInitialPickupCode(codeParam.trim());
        setShowTransitModal(true);
      } else if (shouldShowWorkspaceGuide()) {
        setShowGuide(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync <html class="dark">
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.lang = locale;
  }, [themeMode, locale]);

  // Persist preferences
  useEffect(() => {
    if (!hydrated) return;
    void savePreferences({ locale, themeMode, syncKey });
  }, [locale, themeMode, syncKey, hydrated]);

  // Auto-save active workspace draft
  useEffect(() => {
    if (!hydrated || readOnlyMode) return;
    const timer = setTimeout(() => {
      void saveActiveWorkspace(workspace);
    }, 300);
    return () => clearTimeout(timer);
  }, [workspace, hydrated, readOnlyMode]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (studioMode === 'algorithm') setStudioExportSignal((c) => c + 1);
        else setShowExportModal(true);
      } else if (e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setShowTransitModal(true);
      } else if (e.key === '/') {
        e.preventDefault();
        if (showGuide) handleDismissGuide();
        else handleOpenGuide();
      } else if (studioMode === 'code') {
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setShowRepoModal(true);
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          void handleCreateSnapshot();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWorkspace((prev) => {
      const oldIdx = prev.blocks.findIndex((b) => b.id === active.id);
      const newIdx = prev.blocks.findIndex((b) => b.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return { ...prev, blocks: arrayMove(prev.blocks, oldIdx, newIdx) };
    });
  };

  const handleSwitchStudio = (mode: StudioMode) => {
    setStudioMode(mode);
    setShowTemplatesBar(false);
  };

  const handleUpdateStyle = (patch: Partial<CanvasStyleConfig>) => {
    setWorkspace((prev) => ({
      ...prev,
      canvasStyle: { ...prev.canvasStyle, ...patch },
    }));
  };

  const handleChangeLanguage = (lang: ProgrammingLanguage) => {
    const ext = CARBON_LANGUAGES.find((l) => l.id === lang)?.ext || 'txt';
    setWorkspace((prev) => {
      const baseName = prev.codeData.fileName.replace(/\.[^.]+$/, '') || 'main';
      return {
        ...prev,
        codeData: {
          ...prev.codeData,
          language: lang,
          fileName: `${baseName}.${ext}`,
        },
        canvasStyle: {
          ...prev.canvasStyle,
          windowTitle: `${baseName}.${ext}`,
        },
      };
    });
  };

  const handleAddBlock = (type: BlockType) => {
    const newBlock: CanvasBlock = {
      id: `blk-${type}-${Date.now()}`,
      type,
      visible: true,
      collapsed: false,
    };
    setWorkspace((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
  };

  const handleApplyTemplate = (presetId: TemplatePresetId) => {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newBlocks: CanvasBlock[] = preset.blockOrder.map((type, idx) => ({
      id: `blk-${type}-${Date.now()}-${idx}`,
      type,
      visible: true,
      collapsed: false,
    }));
    setWorkspace((prev) => ({
      ...prev,
      templatePreset: presetId,
      blocks: newBlocks,
      canvasStyle: {
        ...prev.canvasStyle,
        maxWidth: preset.defaultWidth,
      },
    }));
    notify(
      locale === 'zh-CN'
        ? `已切换至「${preset.nameZh}」模板`
        : `Switched to ${preset.nameEn}`
    );
  };

  const handleCreateSnapshot = async () => {
    const snap: WorkspaceSnapshot = {
      id: `snap-${Date.now()}`,
      workspaceId: workspace.id,
      label: `${workspace.titleData.problemTitle || workspace.name} (${new Date().toLocaleTimeString()})`,
      createdAt: Date.now(),
      code: workspace.codeData.code,
      workspace: structuredClone(workspace),
    };
    await saveSnapshot(snap);
    setSnapshots((prev) => [snap, ...prev]);
    notify(locale === 'zh-CN' ? '已保存版本快照' : 'Snapshot saved');
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace.titleData.problemCode || 'yanpb-workspace'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as WorkspaceDocument;
      if (parsed && parsed.codeData && Array.isArray(parsed.blocks)) {
        setReadOnlyMode(false);
        setWorkspace(parsed);
        notify(locale === 'zh-CN' ? '工作区 JSON 导入成功' : 'Workspace imported');
      }
    } catch {
      notify(locale === 'zh-CN' ? '无效的工作区 JSON 文件' : 'Invalid JSON file');
    }
  };

  const handleSaveCurrentToRepo = async (
    tier: ContestTier,
    category: AlgorithmCategory,
    kind: RepositoryItemKind
  ) => {
    const entry: RepositoryEntry = {
      id: `repo-custom-${Date.now()}`,
      title: workspace.titleData.problemTitle || workspace.name,
      tier,
      category,
      kind,
      difficulty: workspace.titleData.difficulty || '自定义',
      stars: 5,
      favorite: true,
      tags: workspace.titleData.tags.length > 0 ? workspace.titleData.tags : [tier],
      summary: workspace.teachingData.explanation || workspace.formulaData.caption || '用户收藏模板',
      workspace: structuredClone(workspace),
      updatedAt: Date.now(),
    };
    await saveRepositoryEntry(entry);
    setRepoEntries((prev) => [entry, ...prev]);
    notify(locale === 'zh-CN' ? '已归档到算法仓库' : 'Saved to Repository');
  };

  const handleToggleFavorite = async (id: string) => {
    const target = repoEntries.find((e) => e.id === id);
    if (!target) return;
    const updated = { ...target, favorite: !target.favorite };
    await saveRepositoryEntry(updated);
    setRepoEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
  };

  const isClassicOnly =
    workspace.blocks.length === 1 && workspace.blocks[0].type === 'code';

  const renderBlock = (block: CanvasBlock) => {
    switch (block.type) {
      case 'title':
        return (
          <TitleBlock
            data={workspace.titleData}
            locale={locale}
            onChange={(titleData) => setWorkspace((p) => ({ ...p, titleData }))}
          />
        );
      case 'problem':
        return (
          <ProblemBlock
            data={workspace.problemData}
            locale={locale}
            onChange={(problemData) => setWorkspace((p) => ({ ...p, problemData }))}
            onImportSamples={(newSamples) =>
              setWorkspace((p) => ({
                ...p,
                samplesData: {
                  ...p.samplesData,
                  cases: [...p.samplesData.cases, ...newSamples],
                },
              }))
            }
            onImportTitleMeta={(meta) =>
              setWorkspace((p) => ({
                ...p,
                titleData: {
                  ...p.titleData,
                  problemTitle: meta.title || p.titleData.problemTitle,
                  platform: meta.platform || p.titleData.platform,
                },
              }))
            }
          />
        );
      case 'keypoints':
        return (
          <KeypointsBlock
            data={workspace.keypointsData}
            problemHighlights={workspace.problemData.highlights}
            locale={locale}
            onChange={(keypointsData) => setWorkspace((p) => ({ ...p, keypointsData }))}
          />
        );
      case 'code':
        return (
          <CodeEditorBlock
            data={workspace.codeData}
            canvasStyle={workspace.canvasStyle}
            locale={locale}
            readOnly={readOnlyMode}
            onChange={(codeData) => setWorkspace((p) => ({ ...p, codeData }))}
          />
        );
      case 'samples':
        return (
          <SampleBlock
            data={workspace.samplesData}
            locale={locale}
            onChange={(samplesData) => setWorkspace((p) => ({ ...p, samplesData }))}
          />
        );
      case 'formula':
        return (
          <FormulaBlock
            data={workspace.formulaData}
            locale={locale}
            onChange={(formulaData) => setWorkspace((p) => ({ ...p, formulaData }))}
          />
        );
      case 'solution':
        return (
          <SolutionBlock
            data={workspace.solutionData}
            locale={locale}
            onChange={(solutionData) => setWorkspace((p) => ({ ...p, solutionData }))}
          />
        );
      case 'complexity':
        return (
          <ComplexityBlock
            data={workspace.complexityData}
            locale={locale}
            onChange={(complexityData) => setWorkspace((p) => ({ ...p, complexityData }))}
          />
        );
      case 'teaching':
        return (
          <TeachingBlock
            data={workspace.teachingData}
            locale={locale}
            onChange={(teachingData) => setWorkspace((p) => ({ ...p, teachingData }))}
          />
        );
      case 'author':
        return (
          <AuthorBlock
            data={workspace.authorData}
            locale={locale}
            onChange={(authorData) => setWorkspace((p) => ({ ...p, authorData }))}
          />
        );
    }
  };

  const hasAiKey = hasConfiguredAiKey(aiConfig);
  const handleOpenGuide = () => {
    if (showGuide) document.getElementById('workspace-guide')?.scrollIntoView({ block: 'nearest' });
    else setShowGuide(true);
  };
  const handleDismissGuide = () => {
    dismissWorkspaceGuide();
    setShowGuide(false);
    document.getElementById('workspace-guide-trigger')?.focus({ preventScroll: true });
  };
  const handleOpenExport = () => {
    if (studioMode === 'algorithm') setStudioExportSignal((count) => count + 1);
    else setShowExportModal(true);
  };
  const handleOpenTransit = () => {
    setTransitAlgoScene(null);
    setShowTransitModal(true);
  };
  const updateAiProfiles = (next: AIProfiles) => {
    setAiProfiles(next);
    saveSessionAiProfiles(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <HeaderBar
        locale={locale}
        studioMode={studioMode}
        hasAiKey={hasAiKey}
        guideOpen={showGuide}
        onSwitchStudio={handleSwitchStudio}
        onOpenApiKey={() => setShowApiKeyModal(true)}
        onOpenGuide={handleOpenGuide}
        onOpenTransit={handleOpenTransit}
        onOpenExport={handleOpenExport}
      />

      {showGuide && (
        <WorkspaceGuide
          locale={locale}
          activeMode={studioMode}
          hasAiKey={hasAiKey}
          onOpenCodeTemplates={() => {
            handleSwitchStudio('code');
            setShowTemplatesBar(true);
          }}
          onOpenAlgorithm={() => handleSwitchStudio('algorithm')}
          onOpenApiKey={() => setShowApiKeyModal(true)}
          onOpenExport={handleOpenExport}
          onOpenTransit={handleOpenTransit}
          onDismiss={handleDismissGuide}
        />
      )}

      {studioMode === 'algorithm' ? (
        <AlgorithmStudio
          locale={locale}
          authorName={workspace.authorData.name || 'Yanpb'}
          aiConfig={aiConfig}
          codeStudioSamples={workspace.samplesData.cases}
          externalSceneSignal={externalStudioScene}
          openExportSignal={studioExportSignal}
          onOpenApiKeyModal={() => setShowApiKeyModal(true)}
          onSyncSampleToCodeStudio={(inputText, label) => {
            setWorkspace((prev) => ({
              ...prev,
              samplesData: {
                ...prev.samplesData,
                cases: [
                  ...prev.samplesData.cases,
                  {
                    id: `sample-studio-${Date.now()}`,
                    name: `${label} 样例`,
                    type: 'custom',
                    input: inputText,
                    expectedOutput: '',
                    actualOutput: '',
                    explanation: '从 Algorithm Studio 同步导出',
                    collapsed: false,
                  },
                ],
              },
            }));
          }}
          onShareViaTransit={(scene) => {
            setTransitAlgoScene(scene);
            setShowTransitModal(true);
          }}
          onNotify={notify}
        />
      ) : (
        <>
          <CanvasToolbar
            locale={locale}
            themeMode={themeMode}
            canvasStyle={workspace.canvasStyle}
            language={workspace.codeData.language}
            onToggleLocale={() => setLocale((l) => (l === 'zh-CN' ? 'en-US' : 'zh-CN'))}
            onToggleThemeMode={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))}
            onUpdateStyle={handleUpdateStyle}
            onChangeLanguage={handleChangeLanguage}
            onAddBlock={handleAddBlock}
            onSaveSnapshot={() => void handleCreateSnapshot()}
            onExportJson={handleExportJson}
            onImportJson={(file) => void handleImportJson(file)}
            showTemplates={showTemplatesBar}
            onToggleTemplates={() => setShowTemplatesBar((v) => !v)}
            onOpenRepository={() => setShowRepoModal(true)}
            onResetClassic={() => handleApplyTemplate('carbon-classic')}
            onOpenShortcuts={() => setShowShortcutsModal(true)}
          />

          {showTemplatesBar && (
            <TemplateSwitcherBar
              locale={locale}
              activeTemplate={workspace.templatePreset}
              onSelectTemplate={(id) => {
                handleApplyTemplate(id);
                setShowTemplatesBar(false);
              }}
              onClose={() => {
                setShowTemplatesBar(false);
              }}
            />
          )}

          {/* Read-only notice banner */}
          {readOnlyMode && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 text-xs text-amber-300 flex items-center justify-center gap-3">
              <Lock className="w-3.5 h-3.5" />
              <span>
                {locale === 'zh-CN'
                  ? '当前处于只读分享视图，修改不会覆盖本地草稿。'
                  : 'Read-only shared view active.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReadOnlyMode(false);
                  notify(locale === 'zh-CN' ? '已克隆为可编辑本地草稿' : 'Cloned to editable draft');
                }}
                className="underline font-semibold cursor-pointer"
              >
                {locale === 'zh-CN' ? '克隆为可编辑草稿' : 'Clone & Edit'}
              </button>
            </div>
          )}

          {/* Central Carbon Canvas */}
          <main className="w-full min-w-0 flex-1 px-4 sm:px-8 py-8 flex flex-col items-center">
            {isClassicOnly && (
              <div className="mb-4 text-xs text-slate-500 dark:text-slate-400 text-center flex flex-wrap items-center justify-center gap-2">
                <span>{t.classicBanner}</span>
                <button
                  type="button"
                  onClick={handleOpenGuide}
                  className="text-blue-500 hover:underline font-medium cursor-pointer"
                >
                  {locale === 'zh-CN' ? '查看制作与使用指引 →' : 'View Guide →'}
                </button>
              </div>
            )}

            <div
              style={{
                maxWidth: `${workspace.canvasStyle.maxWidth}px`,
                padding: `${workspace.canvasStyle.paddingVertical}px ${workspace.canvasStyle.paddingHorizontal}px`,
                background:
                  workspace.canvasStyle.backgroundMode === 'transparent'
                    ? undefined
                    : workspace.canvasStyle.backgroundValue,
              }}
              className={`w-full min-w-0 overflow-hidden rounded-2xl transition-all ${
                workspace.canvasStyle.backgroundMode === 'transparent' ? 'bg-checkerboard' : ''
              }`}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={workspace.blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="w-full min-w-0 space-y-4">
                    {workspace.blocks.map((block) => (
                      <SortableBlockWrapper
                        key={block.id}
                        block={block}
                        locale={locale}
                        isClassicOnly={isClassicOnly}
                        onToggleCollapse={(id) =>
                          setWorkspace((p) => ({
                            ...p,
                            blocks: p.blocks.map((b) =>
                              b.id === id ? { ...b, collapsed: !b.collapsed } : b
                            ),
                          }))
                        }
                        onToggleVisible={(id) =>
                          setWorkspace((p) => ({
                            ...p,
                            blocks: p.blocks.map((b) =>
                              b.id === id ? { ...b, visible: !b.visible } : b
                            ),
                          }))
                        }
                        onDuplicate={(id) =>
                          setWorkspace((p) => {
                            const idx = p.blocks.findIndex((b) => b.id === id);
                            if (idx === -1) return p;
                            const copy: CanvasBlock = {
                              ...p.blocks[idx],
                              id: `blk-${p.blocks[idx].type}-${Date.now()}`,
                            };
                            const next = [...p.blocks];
                            next.splice(idx + 1, 0, copy);
                            return { ...p, blocks: next };
                          })
                        }
                        onDelete={(id) =>
                          setWorkspace((p) => ({
                            ...p,
                            blocks:
                              p.blocks.length <= 1
                                ? p.blocks
                                : p.blocks.filter((b) => b.id !== id),
                          }))
                        }
                        onUpdateStyleOverride={(id, styleOverride: BlockStyleOverride) =>
                          setWorkspace((p) => ({
                            ...p,
                            blocks: p.blocks.map((b) =>
                              b.id === id ? { ...b, styleOverride } : b
                            ),
                          }))
                        }
                      >
                        {renderBlock(block)}
                      </SortableBlockWrapper>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </main>

          {/* Quiet Attribution Footer */}
          <footer className="border-t border-slate-200 dark:border-white/10 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Yanpb
          </footer>
        </>
      )}

      {/* Modals */}
      {showExportModal && (
        <ExportModal
          workspace={workspace}
          locale={locale}
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showTransitModal && (
        <TransitModal
          workspace={workspace}
          algoScene={transitAlgoScene}
          locale={locale}
          initialPickupCode={initialPickupCode}
          initialSyncKey={syncKey}
          onUpdateSyncKey={setSyncKey}
          onLoadCodeOnly={(codeText, lang) => {
            setWorkspace((p) => ({
              ...p,
              codeData: {
                ...p.codeData,
                code: codeText,
                language: (lang as ProgrammingLanguage) || p.codeData.language,
              },
            }));
            notify(locale === 'zh-CN' ? '已提取源码到当前画布' : 'Source loaded');
          }}
          onLoadWorkspace={(ws, isRO) => {
            setReadOnlyMode(isRO);
            setWorkspace(ws);
            setStudioMode('code');
            notify(locale === 'zh-CN' ? '已提取完整工作区' : 'Workspace loaded');
          }}
          onLoadAlgoScene={(sc) => {
            setExternalStudioScene(sc);
            setStudioMode('algorithm');
            notify(locale === 'zh-CN' ? '已提取 Algorithm Studio 场景' : 'Algorithm Studio scene loaded');
          }}
          onTransitGenerated={(code) =>
            setWorkspace((p) => ({
              ...p,
              authorData: { ...p.authorData, lastTransitCode: code },
            }))
          }
          onClose={() => {
            setShowTransitModal(false);
            setTransitAlgoScene(null);
            setInitialPickupCode('');
          }}
        />
      )}

      {showRepoModal && (
        <RepositoryModal
          locale={locale}
          currentWorkspace={workspace}
          entries={repoEntries}
          snapshots={snapshots}
          onLoadWorkspace={(ws) => {
            setReadOnlyMode(false);
            setWorkspace(ws);
            notify(locale === 'zh-CN' ? '已载入模板到画布' : 'Loaded to Canvas');
          }}
          onToggleFavorite={(id) => void handleToggleFavorite(id)}
          onSaveCurrentToRepo={(tier, cat, kind) => void handleSaveCurrentToRepo(tier, cat, kind)}
          onDeleteRepoEntry={(id) => {
            void deleteRepositoryEntry(id);
            setRepoEntries((prev) => prev.filter((e) => e.id !== id));
          }}
          onRestoreSnapshot={(snap) => {
            setReadOnlyMode(false);
            setWorkspace(snap.workspace);
            notify(locale === 'zh-CN' ? '已恢复至历史版本' : 'Snapshot restored');
          }}
          onDeleteSnapshot={(id) => {
            void deleteSnapshot(id);
            setSnapshots((prev) => prev.filter((s) => s.id !== id));
          }}
          onClose={() => {
            setShowRepoModal(false);
          }}
        />
      )}

      {showApiKeyModal && (
        <ApiKeyModal
          locale={locale}
          collection={aiProfiles}
          onSaveConfig={(next) => {
            const exists = aiProfiles.profiles.some(({ id }) => id === next.id);
            updateAiProfiles({
              profiles: exists ? aiProfiles.profiles.map((profile) => profile.id === next.id ? next : profile)
                : [...aiProfiles.profiles, next],
              activeId: next.id,
            });
            notify(locale === 'zh-CN' ? `已启用模型配置「${next.name}」` : `Model configuration enabled: ${next.name}`);
          }}
          onClearConfig={(id) => {
            updateAiProfiles({
              profiles: aiProfiles.profiles.filter((profile) => profile.id !== id),
              activeId: aiProfiles.activeId === id ? null : aiProfiles.activeId,
            });
            notify(locale === 'zh-CN' ? '已删除模型配置' : 'Model configuration deleted');
          }}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}

      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#151A24] p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{t.toolbar.shortcuts}</h3>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                ['Ctrl / Cmd + Shift + E', locale === 'zh-CN' ? '打开图片导出中心' : 'Open Export Studio'],
                ['Ctrl / Cmd + Shift + T', locale === 'zh-CN' ? '打开代码中转中心' : 'Open CodeTransit Hub'],
                ['Ctrl / Cmd + K', locale === 'zh-CN' ? '搜索算法模板与题库' : 'Search Repository'],
                ['Ctrl / Cmd + S', locale === 'zh-CN' ? '保存当前工作区快照' : 'Save Snapshot'],
              ].map(([keys, desc]) => (
                <div key={keys} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{desc}</span>
                  <kbd className="px-2 py-0.5 rounded border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-black/30 font-mono">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
