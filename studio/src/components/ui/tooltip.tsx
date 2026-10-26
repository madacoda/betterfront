import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { HelpCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-w-xs rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-800 shadow-lg leading-relaxed animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface HintTooltipProps {
  title: string;
  description: string;
  managerNote?: string;
  example?: string;
  variant?: 'question' | 'bulb';
}

export const HintTooltip: React.FC<HintTooltipProps> = ({
  title,
  description,
  managerNote,
  example
}) => {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Help: ${title}`}
          className="inline-flex items-center justify-center rounded-md p-0.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-help align-middle ml-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="space-y-1.5">
        <div className="font-semibold text-zinc-950 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span>{title}</span>
        </div>
        <p className="text-zinc-600 text-[11px] leading-relaxed">{description}</p>
        {managerNote && (
          <div className="pt-1.5 border-t border-zinc-100 text-[11px] text-zinc-700">
            <strong className="text-zinc-900">Why it matters:</strong> {managerNote}
          </div>
        )}
        {example && (
          <div className="pt-1 text-[11px] text-zinc-500 font-mono bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
            e.g. {example}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export interface GuidedCalloutProps {
  title: string;
  description: string;
  steps?: string[];
  className?: string;
}

export const GuidedCallout: React.FC<GuidedCalloutProps> = ({
  title,
  description,
  steps,
  className
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 text-xs text-zinc-600',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
        <div className="space-y-1 flex-1">
          <div className="font-semibold text-zinc-900 text-xs">{title}</div>
          <p className="text-zinc-600 leading-relaxed">{description}</p>
          {steps && steps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {steps.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-[11px] text-zinc-700"
                >
                  <strong className="text-zinc-950">{idx + 1}.</strong> {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
