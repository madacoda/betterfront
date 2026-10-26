import React, { useState } from 'react';
import {
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Video,
  Camera,
  Eye,
  Activity,
  MonitorSmartphone,
  ExternalLink,
  Briefcase,
  PlayCircle,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { HintTooltip } from '@/components/ui/tooltip';
import {
  buildExecutiveSummary,
  formatExecutiveReportForClipboard,
  UAT_ACTION_UX_META
} from '@/lib/uxCopywriting';
import { StudioRunRecord } from '@/types';

interface Props {
  recentRuns: StudioRunRecord[];
  activeRun: StudioRunRecord | null;
  onSelectRun: (run: StudioRunRecord) => void;
  onRunAllScenariosSuite?: (targetUrl?: string) => Promise<void>;
  liveLogs: string[];
  isRunning: boolean;
  hintsEnabled?: boolean;
}

export const LiveExecutionAndForensicsTab: React.FC<Props> = ({
  recentRuns,
  activeRun,
  onSelectRun,
  onRunAllScenariosSuite,
  liveLogs,
  isRunning
}) => {
  const [selectedViewportFilter, setSelectedViewportFilter] = useState<string>('ALL');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const data = activeRun?.summaryData;
  const isAuditRun = activeRun?.type === 'audit';
  const isUatRun = activeRun?.type === 'uat';
  const executiveSummary = activeRun ? buildExecutiveSummary(activeRun) : null;

  const handleCopyExecutiveReport = async () => {
    if (!activeRun) return;
    try {
      await navigator.clipboard.writeText(formatExecutiveReportForClipboard(activeRun));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // Ignore clipboard permission errors in headless browser
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Column (4 cols): Recent Runs History & Live Stream Console */}
      <div className="lg:col-span-4 space-y-4">
        <Card>
          <CardHeader className="py-3 px-4 bg-zinc-50/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-600 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Test Run History ({recentRuns.length})
            </CardTitle>
            {onRunAllScenariosSuite && (
              <Button
                variant="outline"
                size="sm"
                disabled={isRunning}
                onClick={() => onRunAllScenariosSuite()}
                className="h-6 px-2 text-[11px]"
              >
                <PlayCircle className="w-3 h-3" />
                {isRunning ? 'Running...' : 'Run Full Suite'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-2.5 space-y-1.5 max-h-[380px] overflow-y-auto">
            {recentRuns.length === 0 ? (
              <p className="text-xs text-zinc-400 p-4 text-center">
                No test runs recorded in this session yet.
              </p>
            ) : (
              recentRuns.map((run) => {
                const isSelected = activeRun?.runId === run.runId;
                return (
                  <div
                    key={run.runId}
                    onClick={() => onSelectRun(run)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-50 border-zinc-900 ring-1 ring-zinc-900 shadow-2xs'
                        : 'bg-white border-zinc-200 hover:bg-zinc-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={run.passed ? 'success' : 'destructive'}
                        className="text-[10px]"
                      >
                        {run.passed ? 'PASSED' : 'FAILED'}
                      </Badge>
                      <span className="text-[10px] uppercase font-mono text-zinc-400">
                        {run.type} · {(run.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-950 mt-1.5 truncate">
                      {run.name}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono truncate">
                      {run.targetUrl}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Live Browser Console Feed */}
        <Card>
          <CardHeader className="py-3 px-4 bg-zinc-50/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-600 font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Live Browser Stream
            </CardTitle>
            {isRunning && (
              <Badge variant="success" className="animate-pulse text-[10px]">
                Active
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-3">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 h-[200px] overflow-y-auto font-mono text-[11px] space-y-1 text-zinc-800">
              {liveLogs.length === 0 ? (
                <div className="text-zinc-400 italic">
                  Ready. Run any test flow or website audit to watch real-time browser telemetry...
                </div>
              ) : (
                liveLogs.map((line, i) => (
                  <div key={i} className="leading-relaxed break-words">
                    {line}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column (8 cols): Executive Release Briefing & Forensic Evidence */}
      <div className="lg:col-span-8 space-y-4">
        {!activeRun || !data || !executiveSummary ? (
          <Card>
            <CardContent className="p-14 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto">
                <Activity className="w-5 h-5 text-zinc-700" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-950">No Test Report Selected</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                Run a workflow from the <strong>Flow Builder</strong>, launch a <strong>Template</strong>, or trigger an <strong>Instant 21-Check Audit</strong> from the top bar to view the Executive Release Readiness Briefing and forensic screenshots here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Executive Release Readiness Briefing Card */}
            <Card>
              <CardHeader className="pb-3 bg-zinc-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-zinc-700" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Executive Release Readiness Briefing
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyExecutiveReport}
                    >
                      {copiedSummary ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-600" />
                          Copy Summary for Slack / Jira
                        </>
                      )}
                    </Button>
                    <Badge
                      variant={activeRun.passed ? 'success' : 'destructive'}
                      className="text-xs px-2.5 py-0.5"
                    >
                      {executiveSummary.verdictBadge}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-base mt-2 text-zinc-950">
                  {executiveSummary.headline}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs pt-4">
                <p className="text-zinc-700 leading-relaxed">{executiveSummary.narrative}</p>

                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                  <div className="font-semibold text-zinc-950">
                    Recommended Action:
                  </div>
                  <p className="text-zinc-600 leading-relaxed">
                    {executiveSummary.recommendation}
                  </p>
                </div>

                {executiveSummary.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {executiveSummary.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs text-zinc-800 font-medium"
                      >
                        <strong className="text-zinc-500">{h.label}:</strong> {h.value}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {isUatRun ? (
              /* UAT RUN FORENSIC VIEW */
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-3.5">
                    <div className="text-[11px] text-zinc-500 font-medium">Verdict</div>
                    <div
                      className={`text-lg font-bold mt-1 flex items-center gap-1.5 ${
                        data.passed ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {data.passed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {data.passed ? 'PASSED' : 'FAILED'}
                    </div>
                  </Card>
                  <Card className="p-3.5">
                    <div className="text-[11px] text-zinc-500 font-medium">Steps Passed</div>
                    <div className="text-lg font-bold text-zinc-950 mt-1">
                      {data.passedSteps} / {data.totalSteps}
                    </div>
                    <Progress
                      value={
                        data.totalSteps > 0
                          ? Math.round((data.passedSteps / data.totalSteps) * 100)
                          : 100
                      }
                      indicatorClassName={data.passed ? 'bg-emerald-600' : 'bg-red-600'}
                      className="mt-2 h-1.5"
                    />
                  </Card>
                  <Card className="p-3.5">
                    <div className="text-[11px] text-zinc-500 font-medium">Visual Anomalies</div>
                    <div className="text-lg font-bold text-zinc-950 mt-1">
                      {(data.anomaliesDetected || []).length}
                    </div>
                  </Card>
                  <Card className="p-3.5">
                    <div className="text-[11px] text-zinc-500 font-medium">Duration</div>
                    <div className="text-lg font-bold text-zinc-950 mt-1">
                      {(data.durationMs / 1000).toFixed(2)}s
                    </div>
                  </Card>
                </div>

                {(data.failureScreenshotUrl || data.videoUrl) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                        <Camera className="w-4 h-4 text-red-600" />
                        Forensic Evidence (Screenshots &amp; Video)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.failureScreenshotUrl && (
                        <div>
                          <div className="text-xs font-semibold text-zinc-700 mb-1.5">
                            Failure Snapshot:
                          </div>
                          <img
                            src={data.failureScreenshotUrl}
                            alt="Failure Snapshot"
                            className="rounded-lg border border-zinc-200 max-h-[280px] w-auto"
                          />
                        </div>
                      )}
                      {data.videoUrl && (
                        <div>
                          <div className="text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5" /> Full Browser Video:
                          </div>
                          <video
                            controls
                            src={data.videoUrl}
                            className="rounded-lg border border-zinc-200 max-h-[280px] w-full bg-black"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="py-3 px-4 flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm">
                      Step-by-Step Timeline — {data.scenarioName}
                    </CardTitle>
                    {data.htmlReportUrl && (
                      <a
                        href={data.htmlReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 hover:bg-zinc-200/70 text-xs font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open HTML Report
                      </a>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table className="border-0 rounded-none">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead className="w-48">Action</TableHead>
                          <TableHead>Step Verification</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-20 text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.steps || []).map((st: any, i: number) => {
                          const actionMeta = UAT_ACTION_UX_META[st.action];
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-zinc-400">
                                {st.stepIndex}
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-xs text-zinc-950">
                                  {actionMeta ? actionMeta.shortLabel : st.action}
                                </div>
                                <code className="text-[10px] text-zinc-500 font-mono">
                                  {st.action}
                                </code>
                              </TableCell>
                              <TableCell>
                                <div className="text-zinc-800">{st.description}</div>
                                {st.error && (
                                  <div className="text-red-700 text-[11px] mt-1 font-mono bg-red-50 border border-red-200 rounded p-2">
                                    {st.error}
                                  </div>
                                )}
                                {st.warning && (
                                  <div className="text-amber-800 text-[11px] mt-1 font-mono bg-amber-50 border border-amber-200 rounded p-1.5">
                                    {st.warning}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {st.skipped ? (
                                  <Badge variant="secondary">SKIPPED</Badge>
                                ) : st.passed ? (
                                  <Badge variant="success">PASSED</Badge>
                                ) : (
                                  <Badge variant="destructive">FAILED</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">
                                {st.durationMs}ms
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : isAuditRun ? (
              /* FULL AUDIT RUN FORENSIC VIEW WITH SHADCN PROGRESS BARS */
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                  {[
                    { label: 'Overall Score', val: data.score?.total ?? 0, highlight: true },
                    { label: 'Visual Layout', val: data.score?.visual ?? 0 },
                    { label: 'Page Speed', val: data.score?.performance ?? 0 },
                    { label: 'Accessibility', val: data.score?.accessibility ?? 0 },
                    { label: 'Interactivity', val: data.score?.uat ?? 0 },
                    { label: 'Code Health', val: data.score?.standards ?? 0 }
                  ].map((item) => (
                    <Card key={item.label} className="p-3 space-y-2">
                      <div className="text-[10px] uppercase text-zinc-500 font-semibold truncate">
                        {item.label}
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          item.highlight
                            ? data.passed
                              ? 'text-emerald-600'
                              : 'text-red-600'
                            : 'text-zinc-950'
                        }`}
                      >
                        {item.val}/100
                      </div>
                      <Progress
                        value={item.val}
                        indicatorClassName={
                          item.val >= 90
                            ? 'bg-emerald-600'
                            : item.val >= 70
                            ? 'bg-amber-500'
                            : 'bg-red-600'
                        }
                        className="h-1.5"
                      />
                    </Card>
                  ))}
                </div>

                {(data.blockersTriggered?.length > 0 || data.warningsTriggered?.length > 0) && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      {data.blockersTriggered?.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            Release Blockers ({data.blockersTriggered.length}):
                          </div>
                          <ul className="text-xs text-red-700 space-y-0.5 pl-5 list-disc">
                            {data.blockersTriggered.map((b: string, i: number) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data.warningsTriggered?.length > 0 && (
                        <div className="pt-1">
                          <div className="text-xs font-semibold text-amber-800 mb-1">
                            Advisory Warnings ({data.warningsTriggered.length}):
                          </div>
                          <ul className="text-xs text-amber-800 space-y-0.5 pl-5 list-disc max-h-[120px] overflow-y-auto">
                            {data.warningsTriggered.map((w: string, i: number) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="py-3 px-4 flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MonitorSmartphone className="w-4 h-4 text-zinc-600" />
                      Multi-Device &amp; Core Web Vitals Matrix
                    </CardTitle>
                    {data.htmlReportUrl && (
                      <a
                        href={data.htmlReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 hover:bg-zinc-200/70 text-xs font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open HTML Report
                      </a>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table className="border-0 rounded-none">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Verdict</TableHead>
                          <TableHead>
                            LCP
                            <HintTooltip
                              title="Largest Contentful Paint (LCP)"
                              description="Measures how quickly the main content loads (target < 2500ms)."
                            />
                          </TableHead>
                          <TableHead>FCP</TableHead>
                          <TableHead>CLS</TableHead>
                          <TableHead>Issues</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.viewportResults || []).map((vr: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold text-zinc-950">
                              {vr.viewport.name}
                            </TableCell>
                            <TableCell className="font-mono text-zinc-500">
                              {vr.viewport.width}x{vr.viewport.height}
                            </TableCell>
                            <TableCell>
                              <Badge variant={vr.passed ? 'success' : 'destructive'}>
                                {vr.passed ? 'PASSED' : 'FAILED'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">
                              {vr.cwvMetrics?.lcpMs || 0}ms
                            </TableCell>
                            <TableCell className="font-mono">
                              {vr.cwvMetrics?.fcpMs || 0}ms
                            </TableCell>
                            <TableCell className="font-mono">
                              {(vr.cwvMetrics?.clsWindowed || 0).toFixed(4)}
                            </TableCell>
                            <TableCell className="font-semibold text-zinc-950">
                              {vr.defects?.length || 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Visual Findings with Viewport Filter */}
                <Card>
                  <CardHeader className="py-3 px-4 flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4 text-zinc-600" />
                      Detected Visual &amp; Frontend Findings
                    </CardTitle>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedViewportFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          selectedViewportFilter === 'ALL'
                            ? 'shadcn-primary-btn bg-zinc-900 text-white font-semibold'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
                        }`}
                      >
                        All Devices
                      </button>
                      {(data.viewportResults || []).map((vr: any) => (
                        <button
                          key={vr.viewport.name}
                          type="button"
                          onClick={() => setSelectedViewportFilter(vr.viewport.name)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                            selectedViewportFilter === vr.viewport.name
                              ? 'shadcn-primary-btn bg-zinc-900 text-white font-semibold'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
                          }`}
                        >
                          {vr.viewport.name} ({vr.defects?.length || 0})
                        </button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 max-h-[520px] overflow-y-auto">
                    {(data.viewportResults || [])
                      .flatMap((vr: any) => vr.defects || [])
                      .filter(
                        (d: any) =>
                          selectedViewportFilter === 'ALL' ||
                          d.viewportName === selectedViewportFilter
                      )
                      .map((d: any, idx: number) => {
                        const isExempt = d.aiTriage && !d.aiTriage.isBug;
                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge
                                variant={
                                  isExempt
                                    ? 'success'
                                    : d.severity === 'CRITICAL'
                                    ? 'destructive'
                                    : 'warning'
                                }
                              >
                                {d.type.replace(/_/g, ' ')} ({d.severity})
                              </Badge>
                              <span className="text-zinc-500">{d.viewportName}</span>
                            </div>
                            <div>
                              <strong className="text-zinc-800">Element: </strong>
                              <code className="text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded">
                                {d.elementA?.selector}
                              </code>
                            </div>
                            {d.aiTriage && (
                              <div className="p-2.5 rounded-lg bg-white border border-zinc-200 space-y-1">
                                <p className="text-zinc-700">{d.aiTriage.description}</p>
                                <p className="text-emerald-700 font-mono text-[11px] bg-emerald-50 p-1.5 rounded border border-emerald-200">
                                  Fix: {d.aiTriage.suggestedCssFix}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* SUITE RESULT VIEW */
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{data.suiteName}</CardTitle>
                  <CardDescription>
                    {data.passedScenarios} of {data.totalScenarios} flows passed
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="border-0 rounded-none">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Flow Name</TableHead>
                        <TableHead>Viewport</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data.scenarioResults || []).map((sr: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-zinc-950">
                            {sr.scenarioName}
                          </TableCell>
                          <TableCell className="font-mono text-zinc-500">
                            {sr.viewportName || 'Default'}
                          </TableCell>
                          <TableCell>
                            {sr.passedSteps}/{sr.totalSteps}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sr.passed ? 'success' : 'destructive'}>
                              {sr.passed ? 'PASSED' : 'FAILED'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-zinc-500">
                            {(sr.durationMs / 1000).toFixed(2)}s
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};
