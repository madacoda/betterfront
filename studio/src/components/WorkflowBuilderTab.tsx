import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  FileJson,
  ArrowUp,
  ArrowDown,
  Globe,
  SlidersHorizontal,
  Copy,
  Sparkles,
  Check,
  FolderOpen,
  Terminal
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SelectMenu, SelectOptionItem } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { HintTooltip } from '@/components/ui/tooltip';
import {
  UAT_ACTION_UX_META,
  VIEWPORT_UX_META,
  describeStepInPlainEnglish
} from '@/lib/uxCopywriting';
import { UatScenario, UatStep, DiskScenarioItem } from '@/types';

const COMMON_SELECTOR_PRESETS = [
  { label: 'Main Heading (h1)', selector: 'h1, main, [role="main"]' },
  { label: 'Navigation Bar', selector: 'nav, header, [role="navigation"]' },
  { label: 'Primary Button', selector: 'button[type="submit"], button, .btn-primary' },
  { label: 'Email Input', selector: 'input[type="email"], input[name*="email"]' },
  { label: 'Password Input', selector: 'input[type="password"]' },
  { label: 'Search Box', selector: 'input[type="search"], input[placeholder*="Search" i]' },
  { label: 'Modal / Dialog', selector: '[role="dialog"], .modal' }
];

interface Props {
  scenarios: DiskScenarioItem[];
  activeScenario: UatScenario;
  activeFileName: string;
  onSelectScenario: (item: DiskScenarioItem) => void;
  onUpdateScenario: (updated: UatScenario, fileName?: string) => void;
  onSaveScenario: (scenario: UatScenario, fileName: string) => Promise<void>;
  onDeleteScenario: (fileName: string) => Promise<void>;
  onRunScenario: (scenario: UatScenario) => Promise<void>;
  onOpenDiscoverModal: () => void;
  isRunning: boolean;
  hintsEnabled?: boolean;
}

export const WorkflowBuilderTab: React.FC<Props> = ({
  scenarios,
  activeScenario,
  activeFileName,
  onSelectScenario,
  onUpdateScenario,
  onSaveScenario,
  onDeleteScenario,
  onRunScenario,
  onOpenDiscoverModal,
  isRunning
}) => {
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(0);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [jsonSheetOpen, setJsonSheetOpen] = useState(false);
  const [rawJsonDraft, setRawJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [fileNameDraft, setFileNameDraft] = useState(
    activeFileName || 'custom-uat-workflow.json'
  );
  const [savedToast, setSavedToast] = useState(false);

  React.useEffect(() => {
    setFileNameDraft(activeFileName || 'custom-uat-workflow.json');
  }, [activeFileName]);

  const steps = activeScenario.steps || [];
  const safeSelectedIdx =
    steps.length === 0 ? -1 : Math.min(Math.max(0, selectedStepIdx), steps.length - 1);
  const selectedStep: UatStep | null = safeSelectedIdx >= 0 ? steps[safeSelectedIdx] : null;

  const actionOptions: SelectOptionItem[] = useMemo(() => {
    return Object.entries(UAT_ACTION_UX_META).map(([key, meta]) => {
      let group = '2. User Clicks, Typing & Forms';
      if (['GOTO', 'RELOAD', 'WAIT', 'WAIT_FOR', 'WAIT_FOR_NAV', 'SET_VIEWPORT', 'SCROLL', 'SCROLL_TO'].includes(key)) {
        group = '1. Open Pages & Wait';
      } else if (
        [
          'ASSERT_BROKEN_IMAGES',
          'ASSERT_STICKY_BUDGET',
          'ASSERT_DARK_MODE',
          'ASSERT_I18N_OVERFLOW',
          'ASSERT_FORM_ERGONOMICS',
          'ASSERT_FONT_HEALTH',
          'ASSERT_DOM_BUDGET',
          'ASSERT_FRONTEND_HYGIENE',
          'ASSERT_REDUCED_MOTION',
          'ASSERT_A11Y'
        ].includes(key)
      ) {
        group = '4. Optional Deep Web Checks';
      } else if (key.startsWith('ASSERT_') || key === 'SCREENSHOT') {
        group = '3. Core Visual & Layout Checks';
      }
      return {
        value: key,
        label: `${meta.friendlyName}`,
        sublabel: meta.plainHint,
        group
      };
    });
  }, []);

  const updateField = <K extends keyof UatScenario>(key: K, value: UatScenario[K]) => {
    onUpdateScenario({ ...activeScenario, [key]: value }, fileNameDraft);
  };

  const updateStep = (index: number, patch: Partial<UatStep>) => {
    const nextSteps = activeScenario.steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
    updateField('steps', nextSteps);
  };

  const addStep = (defaultAction = 'CLICK') => {
    const actionMeta = UAT_ACTION_UX_META[defaultAction];
    const newStep: UatStep = {
      action: defaultAction,
      selector:
        defaultAction === 'GOTO' || defaultAction.startsWith('ASSERT_NO_') ? undefined : 'button',
      url: defaultAction === 'GOTO' ? '/' : undefined,
      description: `Step ${activeScenario.steps.length + 1}: ${
        actionMeta ? actionMeta.shortLabel : defaultAction
      }`
    };
    const nextSteps = [...activeScenario.steps, newStep];
    updateField('steps', nextSteps);
    setSelectedStepIdx(nextSteps.length - 1);
  };

  const duplicateStep = (index: number) => {
    const target = activeScenario.steps[index];
    if (!target) return;
    const copy: UatStep = {
      ...JSON.parse(JSON.stringify(target)),
      description: `${target.description || target.action} (Copy)`
    };
    const nextSteps = [...activeScenario.steps];
    nextSteps.splice(index + 1, 0, copy);
    updateField('steps', nextSteps);
    setSelectedStepIdx(index + 1);
  };

  const removeStep = (index: number) => {
    const nextSteps = activeScenario.steps.filter((_, i) => i !== index);
    updateField('steps', nextSteps);
    if (selectedStepIdx >= nextSteps.length) {
      setSelectedStepIdx(Math.max(0, nextSteps.length - 1));
    }
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= activeScenario.steps.length) return;
    const copy = [...activeScenario.steps];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    updateField('steps', copy);
    setSelectedStepIdx(target);
  };

  const toggleViewport = (vpKey: string) => {
    const current = activeScenario.viewports || ['desktop_fhd'];
    const exists = current.includes(vpKey);
    const next = exists
      ? current.filter((v) => v !== vpKey)
      : [...current, vpKey];
    updateField('viewports', next.length > 0 ? next : ['desktop_fhd']);
  };

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!activeScenario.name?.trim()) issues.push('Missing workflow name.');
    if (!activeScenario.startUrl?.trim()) issues.push('Missing starting URL.');
    if (!Array.isArray(activeScenario.steps) || activeScenario.steps.length === 0) {
      issues.push('Add at least 1 step to run this flow.');
    }
    activeScenario.steps?.forEach((st, idx) => {
      if (st.action === 'GOTO' && !st.url) {
        issues.push(`Step #${idx + 1} (GOTO) requires a target URL or path.`);
      }
      if (
        ['CLICK', 'FILL', 'SELECT', 'HOVER', 'ASSERT_VISIBLE', 'ASSERT_TEXT', 'ASSERT_CONTRAST'].includes(
          st.action
        ) &&
        !st.selector
      ) {
        issues.push(`Step #${idx + 1} (${st.action}) requires a target element selector.`);
      }
    });
    return issues;
  }, [activeScenario]);

  const effectiveTargetUrl =
    activeScenario.variables?.BASE_URL ||
    (activeScenario.startUrl?.startsWith('http') ? activeScenario.startUrl : 'http://localhost:3000');

  const updateTargetWebsiteUrl = (newUrl: string) => {
    onUpdateScenario(
      {
        ...activeScenario,
        startUrl: activeScenario.startUrl?.includes('{{BASE_URL}}')
          ? activeScenario.startUrl
          : newUrl,
        variables: {
          ...(activeScenario.variables || {}),
          BASE_URL: newUrl
        }
      },
      fileNameDraft
    );
  };

  const handleSave = async () => {
    await onSaveScenario(activeScenario, fileNameDraft);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const selectedMeta = selectedStep ? UAT_ACTION_UX_META[selectedStep.action] : undefined;
  const needsSelector =
    selectedStep &&
    [
      'CLICK',
      'DBLCLICK',
      'HOVER',
      'FILL',
      'SELECT',
      'CHECK',
      'UNCHECK',
      'FOCUS',
      'PRESS',
      'SCROLL_TO',
      'WAIT_FOR',
      'ASSERT_VISIBLE',
      'ASSERT_HIDDEN',
      'ASSERT_TEXT',
      'ASSERT_VALUE',
      'ASSERT_ATTRIBUTE',
      'ASSERT_COUNT',
      'ASSERT_ENABLED',
      'ASSERT_DISABLED',
      'ASSERT_CHECKED',
      'ASSERT_FOCUSED',
      'ASSERT_CSS',
      'ASSERT_CONTRAST',
      'SCREENSHOT'
    ].includes(selectedStep.action);

  const needsValue =
    selectedStep &&
    [
      'FILL',
      'SELECT',
      'PRESS',
      'ASSERT_VALUE',
      'ASSERT_ATTRIBUTE',
      'ASSERT_CSS',
      'SCREENSHOT'
    ].includes(selectedStep.action);

  const needsText = selectedStep && selectedStep.action === 'ASSERT_TEXT';
  const needsUrl =
    selectedStep && (selectedStep.action === 'GOTO' || selectedStep.action === 'ASSERT_URL');
  const needsWaitMs = selectedStep && selectedStep.action === 'WAIT';

  return (
    <div className="space-y-4">
      {/* Top Flow Header Bar — Clean Linear / Vercel Toolbar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={activeScenario.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Workflow Name..."
              className="h-8 max-w-md font-semibold text-sm border-transparent bg-zinc-50 hover:border-zinc-200 focus-visible:bg-white px-2.5"
            />
            <Badge
              variant={validationIssues.length === 0 ? 'success' : 'warning'}
              className="gap-1"
            >
              {validationIssues.length === 0 ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Valid Flow ({steps.length} steps)
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" /> {validationIssues.length} Issue(s)
                </>
              )}
            </Badge>
            <span className="text-[11px] font-mono text-zinc-400 truncate">
              {fileNameDraft}
            </span>
          </div>
          <Input
            value={activeScenario.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe what this user journey verifies in plain English..."
            className="h-7 text-xs text-zinc-500 border-transparent bg-transparent hover:border-zinc-200 focus-visible:bg-white px-2.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="default"
            variant="outline"
            onClick={onOpenDiscoverModal}
            title="Scan a live URL to automatically generate steps"
          >
            <Wand2 className="w-3.5 h-3.5 text-zinc-600" />
            Auto-Build from URL
          </Button>

          <Button
            size="default"
            variant="outline"
            onClick={() => setSettingsSheetOpen(true)}
            title="Configure devices, variables, and recording options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
            Settings ({(activeScenario.viewports || ['desktop_fhd']).length} Devices)
          </Button>

          <Button
            size="default"
            variant="outline"
            onClick={() => {
              setRawJsonDraft(JSON.stringify(activeScenario, null, 2));
              setJsonError(null);
              setJsonSheetOpen(true);
            }}
            title="Inspect or paste raw UAT scenario JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-zinc-600" />
            JSON
          </Button>

          <Button size="default" variant="outline" onClick={handleSave}>
            {savedToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-zinc-600" />
                Save
              </>
            )}
          </Button>

          <Button
            size="default"
            variant="default"
            disabled={isRunning || validationIssues.length > 0}
            onClick={() => onRunScenario(activeScenario)}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isRunning ? 'Running Flow...' : 'Run Test Flow'}
          </Button>
        </div>
      </div>

      {/* Validation Banner (Only shown when there is an actual issue) */}
      {validationIssues.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Action needed before running:</strong> {validationIssues[0]}
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-700">
            {validationIssues.length} total issue(s)
          </span>
        </div>
      )}

      {/* Main 2-Pane Split Builder: Connected Vertical Timeline (Left) + Step Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE (7 cols): Target URL Bar + Connected Step Timeline */}
        <div className="lg:col-span-7 space-y-3">
          {/* Target Website URL Bar */}
          <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-zinc-700" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-900 flex items-center">
                  Target Website URL
                  <HintTooltip
                    title="Target Website URL"
                    description="The base web address where this test flow starts. Relative paths like /login or /checkout attach to this URL automatically."
                    example="http://localhost:3000 or https://staging.yourcompany.com"
                  />
                </div>
              </div>
            </div>
            <Input
              className="font-mono text-xs flex-1 bg-zinc-50"
              value={effectiveTargetUrl}
              onChange={(e) => updateTargetWebsiteUrl(e.target.value)}
              placeholder="http://localhost:3000"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              {(activeScenario.viewports || ['desktop_fhd']).map((vp) => (
                <Badge key={vp} variant="secondary" className="text-[10px]">
                  {VIEWPORT_UX_META[vp]?.friendlyLabel.split(' ')[0] || vp}
                </Badge>
              ))}
            </div>
          </div>

          {/* Connected Vertical Step Timeline */}
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2 bg-zinc-50/60">
              <div>
                <CardTitle className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                  User Journey Timeline ({steps.length} Steps)
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => addStep('CLICK')}>
                  <Plus className="w-3 h-3" /> Add Step
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addStep('ASSERT_NO_OVERLAP')}
                  title="Append a visual geometry check"
                >
                  <Sparkles className="w-3 h-3 text-zinc-600" /> + Visual Check
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {steps.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-xs text-zinc-500">
                    This workflow has no steps yet. Add a step below or auto-build from a live URL.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button size="sm" onClick={() => addStep('GOTO')}>
                      <Plus className="w-3.5 h-3.5" /> Add First Step
                    </Button>
                    <Button size="sm" variant="outline" onClick={onOpenDiscoverModal}>
                      <Wand2 className="w-3.5 h-3.5" /> Auto-Build from URL
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative space-y-2.5 before:absolute before:left-[18px] before:top-4 before:bottom-4 before:w-[1.5px] before:bg-zinc-200">
                  {steps.map((step, idx) => {
                    const isSelected = idx === safeSelectedIdx;
                    const meta = UAT_ACTION_UX_META[step.action];
                    const plainStory = describeStepInPlainEnglish(step, idx);
                    const targetPreview = step.url || step.selector || step.value || '';

                    const isCheckAction =
                      step.action.startsWith('ASSERT_') || step.action === 'SCREENSHOT';

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedStepIdx(idx)}
                        className={`group relative flex items-start gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-50/90 border-zinc-900 ring-1 ring-zinc-900 shadow-xs'
                            : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/40'
                        }`}
                      >
                        {/* Connected Timeline Step Circle */}
                        <div
                          className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? 'shadcn-primary-btn bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-300 group-hover:border-zinc-400'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        {/* Step Summary Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-zinc-950 truncate">
                              {step.description || meta?.friendlyName || step.action}
                            </span>
                            <Badge
                              variant={isCheckAction ? 'success' : 'secondary'}
                              className="text-[10px] font-mono px-1.5 py-0"
                            >
                              {meta ? meta.shortLabel : step.action}
                            </Badge>
                            {step.optional && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                Optional
                              </Badge>
                            )}
                          </div>

                          <div className="text-[11px] text-zinc-600 leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>
                              <strong className="text-zinc-800">In Plain English:</strong>{' '}
                              {plainStory}
                            </span>
                            {targetPreview && (
                              <code className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 font-mono text-[10px] truncate max-w-[260px]">
                                {targetPreview}
                              </code>
                            )}
                          </div>
                        </div>

                        {/* Quick Step Reorder / Duplicate / Delete Actions */}
                        <div
                          className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={idx === 0}
                            onClick={() => moveStep(idx, -1)}
                            title="Move step up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={idx === steps.length - 1}
                            onClick={() => moveStep(idx, 1)}
                            title="Move step down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => duplicateStep(idx)}
                            title="Duplicate step"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-red-600"
                            onClick={() => removeStep(idx)}
                            title="Remove step"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Quick-Append Bar */}
              <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium text-zinc-400 mr-1">Quick append:</span>
                <Button size="sm" variant="outline" onClick={() => addStep('GOTO')}>
                  + Open Page
                </Button>
                <Button size="sm" variant="outline" onClick={() => addStep('CLICK')}>
                  + Click Element
                </Button>
                <Button size="sm" variant="outline" onClick={() => addStep('FILL')}>
                  + Type Text
                </Button>
                <Button size="sm" variant="outline" onClick={() => addStep('ASSERT_VISIBLE')}>
                  + Verify Visible
                </Button>
                <Button size="sm" variant="outline" onClick={() => addStep('ASSERT_NO_OVERLAP')}>
                  + Check Layout Overlap
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANE (5 cols): Sticky Step Property Inspector */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4 bg-zinc-50/60 flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center shadcn-primary-btn">
                  {safeSelectedIdx + 1}
                </span>
                <div>
                  <CardTitle className="text-xs uppercase tracking-wider text-zinc-700 font-semibold">
                    Step Inspector
                  </CardTitle>
                </div>
              </div>
              {selectedStep && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateStep(safeSelectedIdx)}
                    title="Duplicate this step"
                  >
                    <Copy className="w-3 h-3" /> Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeStep(safeSelectedIdx)}
                    title="Delete this step"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              )}
            </CardHeader>

            {!selectedStep ? (
              <CardContent className="p-8 text-center text-xs text-zinc-500">
                Select any step on the timeline to inspect or edit its properties.
              </CardContent>
            ) : (
              <CardContent className="p-4 space-y-4">
                {/* Action Type Selector (Searchable shadcn/ui SelectMenu) */}
                <div className="space-y-1.5">
                  <Label className="flex items-center justify-between">
                    <span>What should the browser do? (Action)</span>
                    <code className="text-[10px] font-mono text-zinc-500">{selectedStep.action}</code>
                  </Label>
                  <SelectMenu
                    value={selectedStep.action}
                    onValueChange={(val) => updateStep(safeSelectedIdx, { action: val })}
                    options={actionOptions}
                    searchable
                  />
                  {selectedMeta && (
                    <p className="text-[11px] text-zinc-500 leading-relaxed pt-0.5">
                      {selectedMeta.plainHint}
                    </p>
                  )}
                </div>

                {/* Friendly Step Label */}
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Step Description (Shown in Executive Report)
                    <HintTooltip
                      title="Step Description"
                      description="A human-friendly note describing what this step verifies so non-technical stakeholders can read the test report."
                      example="Click the Sign In button"
                    />
                  </Label>
                  <Input
                    value={selectedStep.description || ''}
                    onChange={(e) =>
                      updateStep(safeSelectedIdx, { description: e.target.value })
                    }
                    placeholder={selectedMeta?.friendlyName || 'Describe this step...'}
                  />
                </div>

                {/* Contextual Field: URL / Path */}
                {needsUrl && (
                  <div className="space-y-1.5">
                    <Label>
                      {selectedStep.action === 'GOTO'
                        ? 'Page Path or Full URL to Open'
                        : 'Expected URL Substring or Pattern'}
                    </Label>
                    <Input
                      className="font-mono"
                      value={selectedStep.url || ''}
                      onChange={(e) =>
                        updateStep(safeSelectedIdx, { url: e.target.value || undefined })
                      }
                      placeholder={
                        selectedMeta?.urlPlaceholder || '/ or https://example.com/login'
                      }
                    />
                  </div>
                )}

                {/* Contextual Field: Wait Duration */}
                {needsWaitMs && (
                  <div className="space-y-1.5">
                    <Label>Wait Duration (milliseconds)</Label>
                    <Input
                      type="number"
                      className="font-mono"
                      value={selectedStep.waitMs ?? 500}
                      onChange={(e) =>
                        updateStep(safeSelectedIdx, {
                          waitMs: parseInt(e.target.value, 10) || 500
                        })
                      }
                      placeholder="500"
                    />
                  </div>
                )}

                {/* Contextual Field: Target Selector + 1-Click Common Elements */}
                {needsSelector && (
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Target Page Element (CSS Selector or Text)
                      <HintTooltip
                        title="Target Page Element"
                        description="Identifies which button, input, heading, or section on the page to interact with."
                        example="button[type='submit'], #email, or h1"
                      />
                    </Label>
                    <Input
                      className="font-mono"
                      value={selectedStep.selector || ''}
                      onChange={(e) =>
                        updateStep(safeSelectedIdx, {
                          selector: e.target.value || undefined
                        })
                      }
                      placeholder={
                        selectedMeta?.selectorPlaceholder || 'h1, button, #submit'
                      }
                    />
                    <div className="space-y-1 pt-0.5">
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">
                        1-Click Common Elements:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {COMMON_SELECTOR_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              updateStep(safeSelectedIdx, { selector: preset.selector })
                            }
                            className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-[10px] font-medium transition-colors cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contextual Field: Value to Type / Select / Press */}
                {needsValue && (
                  <div className="space-y-1.5">
                    <Label>
                      {selectedStep.action === 'FILL'
                        ? 'Text to Type into Field (supports {{FAKER_EMAIL}})'
                        : selectedStep.action === 'PRESS'
                        ? 'Keyboard Key to Press (e.g. Enter, Escape, Tab)'
                        : 'Value'}
                    </Label>
                    <Input
                      className="font-mono"
                      value={selectedStep.value || ''}
                      onChange={(e) =>
                        updateStep(safeSelectedIdx, {
                          value: e.target.value || undefined
                        })
                      }
                      placeholder={
                        selectedMeta?.textPlaceholder ||
                        '{{FAKER_EMAIL}} or test@example.com'
                      }
                    />
                  </div>
                )}

                {/* Contextual Field: Expected Text */}
                {needsText && (
                  <div className="space-y-1.5">
                    <Label>Expected Visible Text on Page</Label>
                    <Input
                      value={selectedStep.text || ''}
                      onChange={(e) =>
                        updateStep(safeSelectedIdx, {
                          text: e.target.value || undefined
                        })
                      }
                      placeholder="e.g. Welcome, Dashboard, or Order Confirmed"
                    />
                  </div>
                )}

                {/* Step Advisory Toggle */}
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-zinc-800">
                      Optional / Advisory Step
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Log a warning instead of failing the run if this step is missing
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(selectedStep.optional)}
                    onCheckedChange={(checked) =>
                      updateStep(safeSelectedIdx, { optional: checked })
                    }
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Compact Saved Scenarios Card for Quick Switching */}
          <Card>
            <CardHeader className="py-2.5 px-4 bg-zinc-50/60 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" /> Saved Project Flows ({scenarios.length})
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={() => {
                  const fresh: UatScenario = {
                    name: 'New User Journey Flow',
                    description: 'Verifies page load, key content, and visual layout health',
                    startUrl: '{{BASE_URL}}/',
                    variables: { BASE_URL: 'http://localhost:3000' },
                    viewports: ['desktop_fhd'],
                    steps: [
                      {
                        action: 'GOTO',
                        url: '/',
                        description: '1. Open the website homepage'
                      },
                      {
                        action: 'ASSERT_VISIBLE',
                        selector: 'h1, main, body',
                        description: '2. Confirm main content is visible'
                      },
                      {
                        action: 'ASSERT_NO_OVERLAP',
                        description: '3. Verify zero overlapping text'
                      }
                    ]
                  };
                  onUpdateScenario(fresh, 'new-user-journey.json');
                  setSelectedStepIdx(0);
                }}
              >
                + New Flow
              </Button>
            </CardHeader>
            <CardContent className="p-2 max-h-[200px] overflow-y-auto space-y-1">
              {scenarios.map((item) => {
                const isCurrent = item.relativePath === activeFileName;
                return (
                  <div
                    key={item.relativePath}
                    onClick={() => {
                      onSelectScenario(item);
                      setSelectedStepIdx(0);
                    }}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-zinc-900 text-white font-semibold shadcn-primary-btn'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="truncate min-w-0 flex-1 flex items-center gap-2">
                      <span className="truncate">{item.scenario.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] opacity-75 font-mono">
                        {item.scenario.steps?.length || 0} steps
                      </span>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDeleteScenario(item.relativePath);
                          }}
                          className="text-zinc-400 hover:text-red-600 p-0.5 cursor-pointer"
                          title="Delete saved flow"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SLIDE-OVER SHEET 1: Workflow Settings (Viewports, Variables, Recording) */}
      <Sheet open={settingsSheetOpen} onOpenChange={setSettingsSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Workflow Settings &amp; Target Devices</SheetTitle>
            <SheetDescription>
              Configure screen sizes, file name, and video/trace recording for this workflow.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-2 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label>Scenario File Name (in uat-scenarios/)</Label>
              <Input
                className="font-mono"
                value={fileNameDraft}
                onChange={(e) => setFileNameDraft(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Raw Starting URL Pattern</Label>
              <Input
                className="font-mono"
                value={activeScenario.startUrl}
                onChange={(e) => updateField('startUrl', e.target.value)}
                placeholder="{{BASE_URL}}/"
              />
            </div>

            <div className="space-y-2">
              <Label>Screen Sizes to Test (Viewports)</Label>
              <div className="space-y-1.5">
                {Object.entries(VIEWPORT_UX_META).map(([vpKey, meta]) => {
                  const active = (activeScenario.viewports || ['desktop_fhd']).includes(vpKey);
                  return (
                    <div
                      key={vpKey}
                      onClick={() => toggleViewport(vpKey)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        active
                          ? 'border-zinc-900 bg-zinc-50 font-semibold text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <span>{meta.friendlyLabel}</span>
                      <span className="font-mono text-[11px] text-zinc-500">{meta.dimensions}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-zinc-200">
              <Label>Forensic Proof Recording</Label>
              <label className="flex items-center justify-between gap-2 text-xs text-zinc-700 cursor-pointer">
                <span>Record Full Browser Video (.webm)</span>
                <Switch
                  checked={Boolean(activeScenario.recording?.video)}
                  onCheckedChange={(v) =>
                    updateField('recording', { ...(activeScenario.recording || {}), video: v })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs text-zinc-700 cursor-pointer">
                <span>Record Playwright Step-by-Step Trace (.zip)</span>
                <Switch
                  checked={Boolean(activeScenario.recording?.trace)}
                  onCheckedChange={(v) =>
                    updateField('recording', { ...(activeScenario.recording || {}), trace: v })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs text-zinc-700 cursor-pointer">
                <span>Capture Red-Highlighted Failure Screenshot</span>
                <Switch
                  checked={activeScenario.recording?.screenshotOnFailure ?? true}
                  onCheckedChange={(v) =>
                    updateField('recording', {
                      ...(activeScenario.recording || {}),
                      screenshotOnFailure: v
                    })
                  }
                />
              </label>
            </div>
          </div>

          <SheetFooter>
            <Button onClick={() => setSettingsSheetOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* SLIDE-OVER SHEET 2: Raw JSON Inspector & Editor */}
      <Sheet open={jsonSheetOpen} onOpenChange={setJsonSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Raw UAT Scenario JSON
            </SheetTitle>
            <SheetDescription>
              Copy, share, or paste a declarative BetterFront UAT JSON definition directly.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-2 overflow-hidden py-2">
            <Textarea
              className="flex-1 font-mono text-xs leading-relaxed resize-none"
              value={rawJsonDraft}
              onChange={(e) => {
                setRawJsonDraft(e.target.value);
                try {
                  const parsed = JSON.parse(e.target.value);
                  setJsonError(null);
                  onUpdateScenario(parsed, fileNameDraft);
                } catch (err) {
                  setJsonError((err as Error).message);
                }
              }}
            />
            {jsonError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-mono">
                JSON Syntax Error: {jsonError}
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setJsonSheetOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
