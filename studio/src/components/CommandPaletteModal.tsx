import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Layers,
  Sparkles,
  Sliders,
  Play,
  Wand2,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DiskScenarioItem, TemplateMetadata, FrontendWebCheckDefinition } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: DiskScenarioItem[];
  templates: TemplateMetadata[];
  webChecksCatalog: FrontendWebCheckDefinition[];
  onSelectScenario: (item: DiskScenarioItem) => void;
  onSelectTemplate: (tpl: TemplateMetadata) => void;
  onJumpToTab: (tab: string) => void;
  onOpenDiscover: () => void;
  onOpenQuickGuide: () => void;
  onRunActiveScenario: () => void;
}

export const CommandPaletteModal: React.FC<Props> = ({
  open,
  onOpenChange,
  scenarios,
  templates,
  webChecksCatalog,
  onSelectScenario,
  onSelectTemplate,
  onJumpToTab,
  onOpenDiscover,
  onOpenQuickGuide,
  onRunActiveScenario
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const q = query.trim().toLowerCase();

  const matchingScenarios = useMemo(() => {
    if (!q) return scenarios.slice(0, 4);
    return scenarios
      .filter(
        (s) =>
          s.scenario.name.toLowerCase().includes(q) ||
          s.relativePath.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [scenarios, q]);

  const matchingTemplates = useMemo(() => {
    if (!q) return templates.slice(0, 5);
    return templates
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [templates, q]);

  const matchingChecks = useMemo(() => {
    if (!q) return webChecksCatalog.slice(0, 4);
    return webChecksCatalog
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.uatAction.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [webChecksCatalog, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 border-b border-zinc-200 bg-zinc-50/70">
          <DialogTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-700" />
            Command Palette (Ctrl+K)
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search templates, quality checks, saved flows, or quick commands.
          </DialogDescription>
          <div className="relative mt-2">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates, quality checks, saved flows, or actions..."
              className="pl-9 h-9 text-xs bg-white"
            />
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {!q && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 mb-1.5">
                Quick Actions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onRunActiveScenario();
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 hover:bg-zinc-200/70 text-xs font-semibold text-left cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Run Active Flow</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenDiscover();
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 hover:bg-zinc-200/70 text-xs font-semibold text-left cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Auto-Build from URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenQuickGuide();
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 hover:bg-zinc-200/70 text-xs font-semibold text-left cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Open Studio Guide</span>
                </button>
              </div>
            </div>
          )}

          {matchingTemplates.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Ready-Made Templates
              </div>
              <div className="space-y-1">
                {matchingTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(tpl);
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 truncate">
                        {tpl.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {tpl.description}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Use Template <ArrowRight className="w-3 h-3 ml-1" />
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchingChecks.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 mb-1 flex items-center gap-1.5">
                <Sliders className="w-3 h-3" /> Quality &amp; Safety Checks
              </div>
              <div className="space-y-1">
                {matchingChecks.map((chk) => (
                  <button
                    key={chk.key}
                    type="button"
                    onClick={() => {
                      onJumpToTab('webchecks');
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 truncate">
                        {chk.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {chk.description}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {chk.category}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchingScenarios.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 mb-1 flex items-center gap-1.5">
                <Layers className="w-3 h-3" /> Saved Project Flows
              </div>
              <div className="space-y-1">
                {matchingScenarios.map((sc) => (
                  <button
                    key={sc.relativePath}
                    type="button"
                    onClick={() => {
                      onSelectScenario(sc);
                      onJumpToTab('builder');
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-100 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 truncate">
                        {sc.scenario.name}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate">
                        {sc.relativePath}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {sc.scenario.steps?.length || 0} steps
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
