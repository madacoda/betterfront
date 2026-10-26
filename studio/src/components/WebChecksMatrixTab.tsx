import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Play,
  PlusCircle,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Sliders
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { HintTooltip } from '@/components/ui/tooltip';
import { FrontendWebCheckDefinition } from '@/types';

interface Props {
  catalog: FrontendWebCheckDefinition[];
  anomalyToggles: Record<string, boolean>;
  onToggleCheck: (toggleKey: string, enabled: boolean) => void;
  onApplyCheckPreset?: (
    presetMode: 'core-only' | 'all-checks' | 'visual-i18n-theme' | 'forms-perf-hygiene'
  ) => void;
  onInsertUatActionIntoBuilder: (
    uatAction: string,
    title: string,
    isOptional: boolean
  ) => void;
  onRunAuditWithMatrix: (
    targetUrl: string,
    viewports: string[],
    enableHumanAgent: boolean
  ) => Promise<void>;
  isRunning: boolean;
  hintsEnabled?: boolean;
}

export const WebChecksMatrixTab: React.FC<Props> = ({
  catalog,
  anomalyToggles,
  onToggleCheck,
  onApplyCheckPreset,
  onInsertUatActionIntoBuilder,
  onRunAuditWithMatrix,
  isRunning
}) => {
  const [auditUrl, setAuditUrl] = useState('http://localhost:3000');
  const [selectedViewports, setSelectedViewports] = useState<string[]>([
    'mobile_standard',
    'tablet_portrait',
    'desktop_fhd'
  ]);
  const [enableHumanAgent, setEnableHumanAgent] = useState(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'REQUIRED' | 'OPTIONAL'>('ALL');

  const toggleVp = (vp: string) => {
    setSelectedViewports((prev) =>
      prev.includes(vp)
        ? prev.length > 1
          ? prev.filter((x) => x !== vp)
          : prev
        : [...prev, vp]
    );
  };

  const requiredChecks = catalog.filter((c) => c.tier === 'required-invariant');
  const optionalChecks = catalog.filter((c) => c.tier === 'optional-web-check');

  const displayedChecks =
    filterMode === 'REQUIRED'
      ? requiredChecks
      : filterMode === 'OPTIONAL'
      ? optionalChecks
      : catalog;

  const activeCount = catalog.filter((c) => anomalyToggles[c.key] !== false).length;

  return (
    <div className="space-y-4">
      {/* Top Audit Control Bar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-950">
                Website Quality &amp; Safety Checks ({activeCount} of {catalog.length} Active)
              </h2>
              <Badge variant="secondary" className="text-[10px]">
                {requiredChecks.length} Core + {optionalChecks.length} Optional
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure which visual geometry, accessibility, and frontend hygiene checks run during audits and UAT flows.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative min-w-[250px]">
              <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                placeholder="http://localhost:3000"
                className="pl-8 font-mono bg-zinc-50"
              />
            </div>

            <Button
              variant="default"
              disabled={isRunning || !auditUrl.trim()}
              onClick={() =>
                onRunAuditWithMatrix(auditUrl.trim(), selectedViewports, enableHumanAgent)
              }
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunning ? 'Auditing...' : `Run ${activeCount}-Check Audit`}
            </Button>
          </div>
        </div>

        {/* Device & Preset Strip */}
        <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-500 mr-1">Devices:</span>
            {[
              { id: 'mobile_standard', label: 'Mobile (390px)', icon: Smartphone },
              { id: 'tablet_portrait', label: 'Tablet (768px)', icon: Tablet },
              { id: 'desktop_fhd', label: 'Desktop (1920px)', icon: Monitor }
            ].map((vp) => {
              const Icon = vp.icon;
              const active = selectedViewports.includes(vp.id);
              return (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => toggleVp(vp.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'shadcn-primary-btn bg-zinc-900 text-white border-zinc-900 font-semibold'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {vp.label}
                </button>
              );
            })}

            <label className="flex items-center gap-2 text-xs text-zinc-600 ml-3 cursor-pointer">
              <Switch checked={enableHumanAgent} onCheckedChange={setEnableHumanAgent} />
              <span>Simulate Human Exploratory Clicks</span>
            </label>
          </div>

          {onApplyCheckPreset && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1 mr-1">
                <Sliders className="w-3 h-3" /> Presets:
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApplyCheckPreset('all-checks')}
              >
                Enable All (21)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApplyCheckPreset('core-only')}
              >
                Core Only (12)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApplyCheckPreset('visual-i18n-theme')}
              >
                Visual + Dark Mode + i18n
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tier Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              filterMode === 'ALL'
                ? 'shadcn-primary-btn bg-zinc-900 text-white font-semibold'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            All Checks ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('REQUIRED')}
            className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
              filterMode === 'REQUIRED'
                ? 'shadcn-primary-btn bg-zinc-900 text-white font-semibold'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Core Protections ({requiredChecks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('OPTIONAL')}
            className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
              filterMode === 'OPTIONAL'
                ? 'shadcn-primary-btn bg-zinc-900 text-white font-semibold'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Optional Deep Checks ({optionalChecks.length})
          </button>
        </div>
      </div>

      {/* Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {displayedChecks.map((check) => {
          const isEnabled = anomalyToggles[check.key] ?? check.defaultEnabled;
          const isRequired = check.tier === 'required-invariant';

          return (
            <Card
              key={check.key}
              className={`flex flex-col justify-between transition-all ${
                isEnabled ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50/50 opacity-75'
              }`}
            >
              <CardHeader className="pb-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant={isRequired ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {isRequired ? 'Core Protection' : 'Optional Check'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {check.category}
                    </Badge>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(v) => onToggleCheck(check.key, v)}
                  />
                </div>
                <CardTitle className="text-sm mt-2 flex items-center">
                  {check.title}
                  <HintTooltip
                    title={check.title}
                    description={check.whyItMatters}
                    managerNote={check.remediationTip}
                    example={`UAT Action: ${check.uatAction}`}
                  />
                </CardTitle>
                <CardDescription className="text-xs">
                  {check.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="py-2.5 space-y-2 text-xs">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {check.whyItMatters}
                </p>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <code className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                    {check.uatAction}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() =>
                      onInsertUatActionIntoBuilder(check.uatAction, check.title, !isRequired)
                    }
                  >
                    <PlusCircle className="w-3 h-3" /> Add to Flow
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
