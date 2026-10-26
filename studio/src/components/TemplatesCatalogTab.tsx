import React, { useState, useMemo } from 'react';
import {
  Copy,
  Play,
  Globe,
  Sliders,
  Search,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { UAT_ACTION_UX_META } from '@/lib/uxCopywriting';
import { TemplateMetadata, UatScenario, UatStep } from '@/types';

interface Props {
  templates: TemplateMetadata[];
  onCloneToBuilder: (scenario: UatScenario, suggestedFileName: string) => void;
  onRunTemplate: (
    templateId: string,
    targetUrl: string,
    customVars: Record<string, string>
  ) => Promise<void>;
  isRunning: boolean;
  hintsEnabled?: boolean;
}

export const TemplatesCatalogTab: React.FC<Props> = ({
  templates,
  onCloneToBuilder,
  onRunTemplate,
  isRunning
}) => {
  const [targetUrl, setTargetUrl] = useState('http://localhost:3000');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMetadata | null>(null);
  const [customVars, setCustomVars] = useState<Record<string, string>>({});

  const categories = useMemo(() => {
    const set = new Set<string>(['ALL']);
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) {
        return false;
      }
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    });
  }, [templates, searchFilter, selectedCategory]);

  const openCustomizeSheet = (tpl: TemplateMetadata) => {
    setSelectedTemplate(tpl);
    setCustomVars({
      ...(tpl.defaultVariables || tpl.scenario.variables || {}),
      BASE_URL: targetUrl
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Target URL Toolbar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">
              Ready-Made User Journey Templates ({templates.length})
            </h2>
            <p className="text-xs text-zinc-500">
              Pre-built UAT workflows for common web patterns. Run immediately against your URL or open in the Flow Builder to customize.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative min-w-[240px]">
              <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="http://localhost:3000"
                className="pl-8 font-mono w-full bg-zinc-50"
              />
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter templates..."
                className="pl-8 w-full"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'shadcn-primary-btn bg-zinc-900 text-white font-semibold'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-950'
              }`}
            >
              {cat === 'ALL' ? `All (${templates.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((tpl) => {
          const steps: UatStep[] = tpl.scenario?.steps || [];

          return (
            <Card
              key={tpl.id}
              className="flex flex-col justify-between hover:border-zinc-400 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {tpl.category || 'Workflow'}
                  </Badge>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {steps.length} steps
                  </span>
                </div>
                <CardTitle className="text-sm">{tpl.title}</CardTitle>
                <CardDescription className="line-clamp-2">{tpl.description}</CardDescription>
              </CardHeader>

              <CardContent className="py-3 space-y-2.5 text-xs">
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Included Steps
                  </div>
                  <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                    {steps.slice(0, 4).map((st: UatStep, idx: number) => {
                      const actionMeta = UAT_ACTION_UX_META[st.action];
                      return (
                        <div
                          key={idx}
                          className="text-[11px] text-zinc-600 truncate flex items-center gap-1.5"
                        >
                          <span className="w-4 h-4 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-zinc-800">
                            {actionMeta ? actionMeta.shortLabel : st.action}:
                          </span>
                          <span className="truncate text-zinc-500">
                            {st.description || st.selector || st.url || ''}
                          </span>
                        </div>
                      );
                    })}
                    {steps.length > 4 && (
                      <div className="text-[10px] text-zinc-400 pl-5">
                        + {steps.length - 4} more verification steps...
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const cloned: UatScenario = {
                        ...tpl.scenario,
                        variables: {
                          ...(tpl.scenario.variables || {}),
                          BASE_URL: targetUrl
                        }
                      };
                      onCloneToBuilder(cloned, `${tpl.id}-custom.json`);
                    }}
                  >
                    <Copy className="w-3 h-3" /> Edit in Builder
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openCustomizeSheet(tpl)}
                    title="Customize template variables before running"
                  >
                    <Sliders className="w-3 h-3" />
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="default"
                  disabled={isRunning}
                  onClick={() => onRunTemplate(tpl.id, targetUrl, { BASE_URL: targetUrl })}
                >
                  <Play className="w-3 h-3 fill-current" /> Run Flow
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Slide-Over Sheet for Template Variables */}
      <Sheet
        open={Boolean(selectedTemplate)}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      >
        <SheetContent side="right">
          {selectedTemplate && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTemplate.title}</SheetTitle>
                <SheetDescription>
                  Customize variables and selectors for this template before running or opening in the Flow Builder.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-3 py-3 overflow-y-auto flex-1">
                {Object.entries(customVars).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <Label className="font-mono text-[11px]">{key}</Label>
                    <Input
                      className="font-mono"
                      value={val}
                      onChange={(e) =>
                        setCustomVars((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>

              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    const customized: UatScenario = {
                      ...selectedTemplate.scenario,
                      variables: customVars
                    };
                    onCloneToBuilder(customized, `${selectedTemplate.id}-custom.json`);
                    setSelectedTemplate(null);
                  }}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Open in Builder
                </Button>
                <Button
                  disabled={isRunning}
                  onClick={async () => {
                    const id = selectedTemplate.id;
                    const url = customVars.BASE_URL || targetUrl;
                    setSelectedTemplate(null);
                    await onRunTemplate(id, url, customVars);
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Now
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
