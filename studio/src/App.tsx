import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Sparkles,
  Sliders,
  Activity,
  Wand2,
  Play,
  BookOpen,
  Search,
  Type,
  Sun,
  Moon,
  PanelLeft,
  Globe,
  Zap,
  Terminal,
  FolderOpen,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Separator,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { HintTooltip } from '@/components/ui/tooltip';
import { CommandPaletteModal } from '@/components/CommandPaletteModal';
import { WorkflowBuilderTab } from '@/components/WorkflowBuilderTab';
import { TemplatesCatalogTab } from '@/components/TemplatesCatalogTab';
import { WebChecksMatrixTab } from '@/components/WebChecksMatrixTab';
import { LiveExecutionAndForensicsTab } from '@/components/LiveExecutionAndForensicsTab';
import {
  UatScenario,
  DiskScenarioItem,
  TemplateMetadata,
  FrontendWebCheckDefinition,
  StudioRunRecord
} from '@/types';

const DEFAULT_STARTER_SCENARIO: UatScenario = {
  name: 'Universal Website Quality & Smoke Flow',
  description:
    'Opens your homepage, confirms the main heading and navigation are visible, and verifies zero overlapping text, zero cut-off layout, and zero console errors.',
  startUrl: '{{BASE_URL}}/',
  variables: {
    BASE_URL: 'http://localhost:3000'
  },
  viewports: ['desktop_fhd'],
  recording: {
    video: false,
    trace: false,
    screenshotOnFailure: true
  },
  steps: [
    {
      action: 'GOTO',
      url: '/',
      description: '1. Open the website homepage'
    },
    {
      action: 'ASSERT_VISIBLE',
      selector: 'h1, main, [role="main"], body',
      description: '2. Confirm the main page heading is visible'
    },
    {
      action: 'ASSERT_NO_OVERLAP',
      description: '3. Verify no text or buttons collide with each other'
    },
    {
      action: 'ASSERT_NO_BLEED',
      description: '4. Verify no content spills off the edge of the screen'
    },
    {
      action: 'ASSERT_FRONTEND_HYGIENE',
      optional: true,
      description: '5. Check page title, language tag, and link security'
    },
    {
      action: 'ASSERT_NO_CONSOLE_ERRORS',
      description: '6. Confirm zero hidden browser code errors occurred'
    }
  ]
};

export function App() {
  const [activeTab, setActiveTab] = useState<string>('builder');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [scenarios, setScenarios] = useState<DiskScenarioItem[]>([]);
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [webChecksCatalog, setWebChecksCatalog] = useState<FrontendWebCheckDefinition[]>([]);
  const [recentRuns, setRecentRuns] = useState<StudioRunRecord[]>([]);
  const [activeRun, setActiveRun] = useState<StudioRunRecord | null>(null);

  const [activeScenario, setActiveScenario] = useState<UatScenario>(DEFAULT_STARTER_SCENARIO);
  const [activeFileName, setActiveFileName] = useState<string>('universal-smoke-custom.json');

  // Slide-over Sheets & Modals
  const [quickGuideOpen, setQuickGuideOpen] = useState<boolean>(false);
  const [liveConsoleSheetOpen, setLiveConsoleSheetOpen] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [quickAuditUrl, setQuickAuditUrl] = useState<string>('http://localhost:3000');

  const [comfortableText, setComfortableText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('betterfront_comfortable_text') === 'true';
    } catch {
      return false;
    }
  });

  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    try {
      return localStorage.getItem('betterfront_dark_theme') === 'true';
    } catch {
      return false;
    }
  });

  const [tweakcnTheme, setTweakcnTheme] = useState<
    'neo-brutalism' | 'claude' | 'cyberpunk' | 'minimal'
  >(() => {
    try {
      const saved = localStorage.getItem('betterfront_tweakcn_theme');
      if (
        saved === 'neo-brutalism' ||
        saved === 'claude' ||
        saved === 'cyberpunk' ||
        saved === 'minimal'
      ) {
        return saved;
      }
      return 'neo-brutalism';
    } catch {
      return 'neo-brutalism';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-tweakcn-theme', tweakcnTheme);
    try {
      localStorage.setItem('betterfront_tweakcn_theme', tweakcnTheme);
    } catch {
      // Ignore storage error
    }
  }, [tweakcnTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (comfortableText) {
      root.classList.add('comfortable-text');
    } else {
      root.classList.remove('comfortable-text');
    }
  }, [comfortableText]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkTheme) {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }, [darkTheme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleComfortableText = () => {
    setComfortableText((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('betterfront_comfortable_text', String(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const toggleDarkTheme = () => {
    setDarkTheme((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('betterfront_dark_theme', String(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const [anomalyToggles, setAnomalyToggles] = useState<Record<string, boolean>>({
    textOverlap: true,
    horizontalBleed: true,
    containerClipping: true,
    interactiveOcclusion: true,
    unsizedMedia: true,
    lowContrast: true,
    touchTargetSize: true,
    a11yWcagViolations: true,
    layoutShifts: true,
    consoleExceptions: true,
    brokenNetworkRequests: true,
    brokenLinks: true,
    brokenImagesAndSvg: true,
    stickyViewportBudget: true,
    darkModeParity: false,
    i18nTextExpansion: false,
    formErgonomics: true,
    fontLoadingHealth: false,
    domComplexityBudget: false,
    frontendHygiene: true,
    reducedMotionCompliance: false
  });

  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  // Auto-Discovery Modal State
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverUrl, setDiscoverUrl] = useState('http://localhost:3000');
  const [discoverName, setDiscoverName] = useState('');
  const [discoverSaveName, setDiscoverSaveName] = useState('auto-discovered-flow.json');
  const [discoverIncludeForms, setDiscoverIncludeForms] = useState(true);
  const [discoverIncludeNav, setDiscoverIncludeNav] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const fetchInitialData = async () => {
    try {
      const [overviewRes, scenariosRes, templatesRes] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/scenarios'),
        fetch('/api/templates')
      ]);

      if (overviewRes.ok) {
        const overview = await overviewRes.json();
        setWebChecksCatalog(overview.webChecksCatalog || []);
        if (overview.recentRuns?.length > 0) {
          setRecentRuns(overview.recentRuns);
          setActiveRun((prev) => prev || overview.recentRuns[0]);
        }
      }

      if (scenariosRes.ok) {
        const scData = await scenariosRes.json();
        const list: DiskScenarioItem[] = scData.scenarios || [];
        setScenarios(list);
        if (list.length > 0 && activeFileName === 'universal-smoke-custom.json') {
          setActiveScenario(list[0].scenario);
          setActiveFileName(list[0].relativePath);
        }
      }

      if (templatesRes.ok) {
        const tplData = await templatesRes.json();
        setTemplates(tplData.templates || []);
      }
    } catch {
      // Ignore initial load error
    }
  };

  useEffect(() => {
    void fetchInitialData();

    const ev = new EventSource('/api/events');
    ev.addEventListener('connected', () => setSseConnected(true));
    ev.addEventListener('run:started', (e: MessageEvent) => {
      const payload = JSON.parse(e.data);
      setIsRunning(true);
      setLiveLogs([
        `🚀 Started ${payload.type.toUpperCase()}: ${payload.name} (${payload.targetUrl})`
      ]);
    });
    ev.addEventListener('run:log', (e: MessageEvent) => {
      const payload = JSON.parse(e.data);
      setLiveLogs((prev) => [...prev.slice(-150), payload.message]);
    });
    ev.addEventListener('run:completed', () => {
      setIsRunning(false);
      void fetchInitialData();
    });
    ev.onerror = () => setSseConnected(false);

    return () => ev.close();
  }, []);

  const handleSaveScenario = async (scenario: UatScenario, fileName: string) => {
    const res = await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, scenario })
    });
    if (res.ok) {
      const saved = await res.json();
      setActiveFileName(saved.relativePath);
      await fetchInitialData();
    }
  };

  const handleDeleteScenario = async (fileName: string) => {
    const res = await fetch(`/api/scenarios?file=${encodeURIComponent(fileName)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      await fetchInitialData();
    }
  };

  const handleRunScenario = async (scenario: UatScenario) => {
    setIsRunning(true);
    setActiveTab('execution');
    try {
      const res = await fetch('/api/run/uat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioOrInput: scenario,
          anomalyChecks: anomalyToggles,
          recordVideo: scenario.recording?.video,
          recordTrace: scenario.recording?.trace
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchInitialData();
        setActiveRun({
          runId: data.runId,
          type: 'uat',
          name: data.result.scenarioName,
          targetUrl: scenario.variables?.BASE_URL || scenario.startUrl,
          timestamp: new Date().toISOString(),
          passed: data.result.passed,
          durationMs: data.result.durationMs,
          summaryData: data.result
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunTemplate = async (
    templateId: string,
    targetUrl: string,
    customVars: Record<string, string>
  ) => {
    setIsRunning(true);
    setActiveTab('execution');
    try {
      const res = await fetch('/api/run/uat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioOrInput: templateId,
          targetUrl,
          variables: customVars,
          anomalyChecks: anomalyToggles
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchInitialData();
        setActiveRun({
          runId: data.runId,
          type: 'uat',
          name: data.result.scenarioName,
          targetUrl,
          timestamp: new Date().toISOString(),
          passed: data.result.passed,
          durationMs: data.result.durationMs,
          summaryData: data.result
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunAuditWithMatrix = async (
    targetUrl: string,
    viewports: string[],
    enableHumanAgent: boolean
  ) => {
    setIsRunning(true);
    setActiveTab('execution');
    try {
      const res = await fetch('/api/run/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl,
          viewports,
          anomalyChecks: anomalyToggles,
          enableHumanAgent
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchInitialData();
        setActiveRun({
          runId: data.runId,
          type: 'audit',
          name: `Audit: ${targetUrl} (${data.summary.score.total}/100)`,
          targetUrl,
          timestamp: data.summary.timestamp,
          passed: data.summary.passed,
          durationMs: data.summary.durationMs,
          summaryData: data.summary
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunAllScenariosSuite = async (targetUrl?: string) => {
    setIsRunning(true);
    setActiveTab('execution');
    try {
      const res = await fetch('/api/run/suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl:
            targetUrl || activeScenario.variables?.BASE_URL || 'http://localhost:3000',
          anomalyChecks: anomalyToggles
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchInitialData();
        setActiveRun({
          runId: data.runId,
          type: 'suite',
          name: data.suiteResult.suiteName,
          targetUrl: targetUrl || 'All Saved Scenarios',
          timestamp: data.suiteResult.timestamp,
          passed: data.suiteResult.passed,
          durationMs: data.suiteResult.durationMs,
          summaryData: data.suiteResult
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyCheckPreset = (
    presetMode: 'core-only' | 'all-checks' | 'visual-i18n-theme' | 'forms-perf-hygiene'
  ) => {
    const coreBase: Record<string, boolean> = {
      textOverlap: true,
      horizontalBleed: true,
      containerClipping: true,
      interactiveOcclusion: true,
      unsizedMedia: true,
      lowContrast: true,
      touchTargetSize: true,
      a11yWcagViolations: true,
      layoutShifts: true,
      consoleExceptions: true,
      brokenNetworkRequests: true,
      brokenLinks: true
    };

    if (presetMode === 'core-only') {
      setAnomalyToggles({
        ...coreBase,
        brokenImagesAndSvg: false,
        stickyViewportBudget: false,
        darkModeParity: false,
        i18nTextExpansion: false,
        formErgonomics: false,
        fontLoadingHealth: false,
        domComplexityBudget: false,
        frontendHygiene: false,
        reducedMotionCompliance: false
      });
    } else if (presetMode === 'all-checks') {
      setAnomalyToggles({
        ...coreBase,
        brokenImagesAndSvg: true,
        stickyViewportBudget: true,
        darkModeParity: true,
        i18nTextExpansion: true,
        formErgonomics: true,
        fontLoadingHealth: true,
        domComplexityBudget: true,
        frontendHygiene: true,
        reducedMotionCompliance: true
      });
    } else if (presetMode === 'visual-i18n-theme') {
      setAnomalyToggles({
        ...coreBase,
        brokenImagesAndSvg: true,
        stickyViewportBudget: true,
        darkModeParity: true,
        i18nTextExpansion: true,
        formErgonomics: false,
        fontLoadingHealth: false,
        domComplexityBudget: false,
        frontendHygiene: false,
        reducedMotionCompliance: true
      });
    } else {
      setAnomalyToggles({
        ...coreBase,
        brokenImagesAndSvg: false,
        stickyViewportBudget: false,
        darkModeParity: false,
        i18nTextExpansion: false,
        formErgonomics: true,
        fontLoadingHealth: true,
        domComplexityBudget: true,
        frontendHygiene: true,
        reducedMotionCompliance: false
      });
    }
  };

  const handleInsertUatActionIntoBuilder = (
    uatAction: string,
    title: string,
    isOptional: boolean
  ) => {
    setActiveScenario((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          action: uatAction,
          optional: isOptional,
          description: `${prev.steps.length + 1}. Verify ${title}`
        }
      ]
    }));
    setActiveTab('builder');
  };

  const handleTriggerAutoDiscovery = async () => {
    if (!discoverUrl.trim()) return;
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: discoverUrl.trim(),
          name: discoverName.trim() || undefined,
          includeForms: discoverIncludeForms,
          includeNavigation: discoverIncludeNav,
          saveAsFile: discoverSaveName.trim() || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveScenario(data.scenario);
        setActiveFileName(discoverSaveName.trim() || 'auto-discovered.json');
        await fetchInitialData();
        setDiscoverOpen(false);
        setActiveTab('builder');
      }
    } finally {
      setIsDiscovering(false);
    }
  };

  const navItems = [
    {
      id: 'builder',
      label: 'Flow Builder',
      testId: 'tab-builder',
      icon: Layers,
      badge: scenarios.length
    },
    {
      id: 'templates',
      label: 'Templates',
      testId: 'tab-templates',
      icon: Sparkles,
      badge: 14
    },
    {
      id: 'webchecks',
      label: 'Quality Checks',
      testId: 'tab-webchecks',
      icon: Sliders,
      badge: 21
    },
    {
      id: 'execution',
      label: 'Runs & Reports',
      testId: 'tab-execution',
      icon: Activity,
      badge: recentRuns.length
    }
  ];

  const activeNavMeta = navItems.find((n) => n.id === activeTab) || navItems[0];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex">
      {/* =====================================================================
          LEFT APP SIDEBAR (shadcn/ui sidebar-07 / Linear / Vercel Architecture)
         ===================================================================== */}
      <aside
        className={`shrink-0 border-r border-zinc-200 bg-white flex flex-col justify-between transition-all duration-200 sticky top-0 h-screen z-40 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Top Brand + Search Trigger + Navigation */}
        <div className="p-3 space-y-4 overflow-y-auto flex-1">
          {/* Brand Row */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 shadcn-primary-btn shadow-2xs">
                <Shield className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-tight text-zinc-950 truncate">
                    BetterFront Studio
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    Visual UAT &amp; Web QA
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Search Trigger (⌘K) */}
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs text-zinc-500 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <span>Search...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-zinc-200 rounded text-zinc-500">
                Ctrl+K
              </kbd>
            </button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="w-full"
              onClick={() => setCommandPaletteOpen(true)}
              title="Search (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Primary Workspace Navigation */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Workspace
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={item.testId}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'shadcn-primary-btn bg-zinc-900 text-white font-semibold shadow-2xs'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!sidebarCollapsed && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Saved Scenarios Explorer in Sidebar */}
          {!sidebarCollapsed && (
            <div className="space-y-1 pt-2 border-t border-zinc-100">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" /> Saved Flows
                </span>
                <button
                  type="button"
                  onClick={() => setDiscoverOpen(true)}
                  className="text-[10px] font-medium text-zinc-600 hover:text-zinc-950 cursor-pointer"
                >
                  + Auto-Build
                </button>
              </div>
              <div className="space-y-0.5 max-h-[210px] overflow-y-auto pr-0.5">
                {scenarios.slice(0, 10).map((sc) => {
                  const isCurrent =
                    activeTab === 'builder' && sc.relativePath === activeFileName;
                  return (
                    <button
                      key={sc.relativePath}
                      type="button"
                      onClick={() => {
                        setActiveScenario(sc.scenario);
                        setActiveFileName(sc.relativePath);
                        setActiveTab('builder');
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-zinc-100 text-zinc-950 font-semibold'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
                      }`}
                    >
                      <span className="truncate min-w-0 flex-1">{sc.scenario.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {sc.scenario.steps?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Engine Status & Preferences */}
        <div className="p-3 border-t border-zinc-200 space-y-2 bg-zinc-50/50">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-1 text-[11px] text-zinc-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                  }`}
                />
                {sseConnected ? 'Playwright Engine Ready' : 'Connecting...'}
              </span>
              <span className="font-mono text-[10px] text-zinc-400">v1.1</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleDarkTheme}
              data-testid="toggle-theme-btn"
              className="flex-1"
              title="Switch between Daylight and Dark mode"
            >
              {darkTheme ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  {!sidebarCollapsed && <span>Daylight</span>}
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-zinc-600" />
                  {!sidebarCollapsed && <span>Dark</span>}
                </>
              )}
            </Button>

            {!sidebarCollapsed && (
              <>
                <Button
                  size="sm"
                  variant={comfortableText ? 'default' : 'outline'}
                  onClick={toggleComfortableText}
                  title="Toggle comfortable large text mode"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>{comfortableText ? 'Large' : 'Aa'}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickGuideOpen(true)}
                  title="Open Quick-Start Guide"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          RIGHT MAIN WORKSPACE (Top Breadcrumb Header + Focused Content Canvas)
         ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="h-14 border-b border-zinc-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSidebarCollapsed((p) => !p)}
              title="Toggle Sidebar"
            >
              <PanelLeft className="w-4 h-4 text-zinc-600" />
            </Button>

            <Separator orientation="vertical" className="h-4" />

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span className="font-semibold text-zinc-700">BetterFront Studio</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeNavMeta.label}</BreadcrumbPage>
                </BreadcrumbItem>
                {activeTab === 'builder' && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem className="hidden md:inline-flex">
                      <span className="text-zinc-500 truncate max-w-[220px]">
                        {activeScenario.name}
                      </span>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right Header Action Strip */}
          <div className="flex items-center gap-2">
            {/* TweakCN Theme Preset Switcher (Default: Neo-Brutalism) */}
            <div
              className="hidden lg:flex items-center gap-1 p-1 rounded-lg border border-zinc-200 bg-zinc-50"
              data-testid="tweakcn-theme-switcher"
            >
              {(
                [
                  { id: 'neo-brutalism', label: 'Neo-Brutalism' },
                  { id: 'claude', label: 'Claude' },
                  { id: 'cyberpunk', label: 'Cyberpunk' },
                  { id: 'minimal', label: 'Minimal' }
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`theme-preset-${preset.id}`}
                  onClick={() => setTweakcnTheme(preset.id)}
                  className={`px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    tweakcnTheme === preset.id
                      ? 'shadcn-primary-btn bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setLiveConsoleSheetOpen(true)}
              title="Open Live Browser Stream Drawer"
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden sm:inline">Live Console</span>
              {isRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuickGuideOpen(true)}
            >
              <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden sm:inline">Guide</span>
            </Button>
          </div>
        </header>

        {/* Focused Main Content Area */}
        <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto space-y-4">
          {/* Compact 1-Line Instant Website Quality Check Bar */}
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[11px] font-semibold">
                <Zap className="w-3 h-3 mr-1" /> Instant Website Quality Check
              </Badge>
              <span className="text-xs text-zinc-600 hidden xl:inline">
                Test any URL across Mobile, Tablet &amp; Desktop or auto-generate a flow:
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[200px]">
                <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={quickAuditUrl}
                  onChange={(e) => setQuickAuditUrl(e.target.value)}
                  placeholder="http://localhost:3000 or https://example.com"
                  className="pl-8 font-mono h-8 bg-zinc-50"
                />
              </div>
              <Button
                size="default"
                variant="default"
                disabled={isRunning || !quickAuditUrl.trim()}
                onClick={() =>
                  void handleRunAuditWithMatrix(
                    quickAuditUrl.trim(),
                    ['mobile_standard', 'tablet_portrait', 'desktop_fhd'],
                    true
                  )
                }
              >
                <Play className="w-3 h-3 fill-current" />
                Instant 21-Check Audit
              </Button>
              <Button
                size="default"
                variant="outline"
                disabled={isRunning || !quickAuditUrl.trim()}
                onClick={() => {
                  setDiscoverUrl(quickAuditUrl.trim());
                  setDiscoverOpen(true);
                }}
              >
                <Wand2 className="w-3.5 h-3.5 text-zinc-600" />
                Auto-Build Flow
              </Button>
            </div>
          </div>

          {/* Active Workspace View */}
          {activeTab === 'builder' && (
            <WorkflowBuilderTab
              scenarios={scenarios}
              activeScenario={activeScenario}
              activeFileName={activeFileName}
              onSelectScenario={(item) => {
                setActiveScenario(item.scenario);
                setActiveFileName(item.relativePath);
              }}
              onUpdateScenario={(updated, fileName) => {
                setActiveScenario(updated);
                if (fileName !== undefined) setActiveFileName(fileName);
              }}
              onSaveScenario={handleSaveScenario}
              onDeleteScenario={handleDeleteScenario}
              onRunScenario={handleRunScenario}
              onOpenDiscoverModal={() => setDiscoverOpen(true)}
              isRunning={isRunning}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesCatalogTab
              templates={templates}
              onCloneToBuilder={(scenario, suggestedFileName) => {
                setActiveScenario(scenario);
                setActiveFileName(suggestedFileName);
                setActiveTab('builder');
              }}
              onRunTemplate={handleRunTemplate}
              isRunning={isRunning}
            />
          )}

          {activeTab === 'webchecks' && (
            <WebChecksMatrixTab
              catalog={webChecksCatalog}
              anomalyToggles={anomalyToggles}
              onToggleCheck={(key, enabled) =>
                setAnomalyToggles((prev) => ({ ...prev, [key]: enabled }))
              }
              onApplyCheckPreset={handleApplyCheckPreset}
              onInsertUatActionIntoBuilder={handleInsertUatActionIntoBuilder}
              onRunAuditWithMatrix={handleRunAuditWithMatrix}
              isRunning={isRunning}
            />
          )}

          {activeTab === 'execution' && (
            <LiveExecutionAndForensicsTab
              recentRuns={recentRuns}
              activeRun={activeRun}
              onSelectRun={setActiveRun}
              onRunAllScenariosSuite={handleRunAllScenariosSuite}
              liveLogs={liveLogs}
              isRunning={isRunning}
            />
          )}
        </main>
      </div>

      {/* Universal Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        scenarios={scenarios}
        templates={templates}
        webChecksCatalog={webChecksCatalog}
        onSelectScenario={(item) => {
          setActiveScenario(item.scenario);
          setActiveFileName(item.relativePath);
        }}
        onSelectTemplate={(tpl) => {
          setActiveScenario(tpl.scenario);
          setActiveFileName(`${tpl.id}-custom.json`);
          setActiveTab('builder');
        }}
        onJumpToTab={setActiveTab}
        onOpenDiscover={() => setDiscoverOpen(true)}
        onOpenQuickGuide={() => setQuickGuideOpen(true)}
        onRunActiveScenario={() => void handleRunScenario(activeScenario)}
      />

      {/* Slide-Over Sheet: Live Browser Console Drawer */}
      <Sheet open={liveConsoleSheetOpen} onOpenChange={setLiveConsoleSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Live Browser Telemetry Stream
            </SheetTitle>
            <SheetDescription>
              Real-time output from the Playwright browser engine as your UAT steps or audits execute.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl p-3 overflow-y-auto font-mono text-[11px] space-y-1.5 text-zinc-800 my-2">
            {liveLogs.length === 0 ? (
              <div className="text-zinc-400 italic">
                No active logs yet. Click &quot;Run Test Flow&quot; or &quot;Instant 21-Check Audit&quot; to stream live browser execution...
              </div>
            ) : (
              liveLogs.map((line, idx) => (
                <div key={idx} className="leading-relaxed break-words">
                  {line}
                </div>
              ))
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setLiveConsoleSheetOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Slide-Over Sheet: Quick-Start Guide for Managers & Engineers */}
      <Sheet open={quickGuideOpen} onOpenChange={setQuickGuideOpen}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> BetterFront Studio — Quick Guide
            </SheetTitle>
            <SheetDescription>
              How to build, run, and share visual UAT workflows and website quality audits.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-2 text-xs text-zinc-600 leading-relaxed overflow-y-auto flex-1">
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="font-semibold text-zinc-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                1. Instant Website Quality Check
              </div>
              <p>
                Paste any local (`http://localhost:3000`), staging, or live URL into the top bar and click <strong>Instant 21-Check Audit</strong> to verify Mobile, Tablet, and Desktop layouts in one click.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="font-semibold text-zinc-950">
                2. Visual Timeline + Right-Side Step Inspector
              </div>
              <p>
                In the <strong>Flow Builder</strong>, your user journey is shown as a clean vertical timeline on the left. Click any step to edit its action, selector, or value in the <strong>Step Inspector</strong> on the right.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="font-semibold text-zinc-950">
                3. 14 Ready-Made Templates &amp; 21 Quality Checks
              </div>
              <p>
                Use the left sidebar to browse <strong>Templates</strong> (Login, Checkout, Search, Modals) or toggle <strong>Quality Checks</strong> (12 Core Protections + 9 Optional Deep Checks).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="font-semibold text-zinc-950">
                4. Executive Release Readiness Briefing
              </div>
              <p>
                In <strong>Runs &amp; Reports</strong>, every run generates a plain-English Executive Summary with a 1-click <strong>Copy Summary for Slack / Jira</strong> button.
              </p>
            </div>
          </div>

          <SheetFooter>
            <Button onClick={() => setQuickGuideOpen(false)}>Got It</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Auto-Create Test from Live URL Dialog */}
      <Dialog open={discoverOpen} onOpenChange={setDiscoverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Auto-Build UAT Workflow from Live URL
            </DialogTitle>
            <DialogDescription>
              BetterFront will open your webpage, inspect headings, navigation links, buttons, and forms, and generate a customizable step-by-step test flow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center">
                Website URL to Scan
                <HintTooltip
                  title="Website URL to Scan"
                  description="Enter the full web address of the page you want BetterFront to inspect."
                  example="http://localhost:3000"
                />
              </Label>
              <Input
                className="font-mono"
                value={discoverUrl}
                onChange={(e) => setDiscoverUrl(e.target.value)}
                placeholder="http://localhost:3000"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Workflow Name (optional)</Label>
                <Input
                  value={discoverName}
                  onChange={(e) => setDiscoverName(e.target.value)}
                  placeholder="e.g. Homepage Smoke Flow"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Save As File Name</Label>
                <Input
                  className="font-mono"
                  value={discoverSaveName}
                  onChange={(e) => setDiscoverSaveName(e.target.value)}
                  placeholder="auto-discovered-flow.json"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs text-zinc-700 font-medium cursor-pointer">
                <Switch
                  checked={discoverIncludeNav}
                  onCheckedChange={setDiscoverIncludeNav}
                />
                Include Headings &amp; Navigation
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-700 font-medium cursor-pointer">
                <Switch
                  checked={discoverIncludeForms}
                  onCheckedChange={setDiscoverIncludeForms}
                />
                Include Input Fields &amp; Forms
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscoverOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTriggerAutoDiscovery} disabled={isDiscovering}>
              <Play className="w-3.5 h-3.5 fill-current" />
              {isDiscovering ? 'Scanning Page...' : 'Scan & Build Flow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
