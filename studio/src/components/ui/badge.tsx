import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-zinc-200 bg-zinc-100 text-zinc-900',
        secondary: 'border-zinc-200/80 bg-zinc-50 text-zinc-600',
        destructive: 'border-red-200 bg-red-50 text-red-700 font-semibold',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold',
        warning: 'border-amber-200 bg-amber-50 text-amber-800 font-semibold',
        purple: 'border-zinc-200 bg-zinc-100 text-zinc-800',
        outline: 'border-zinc-200 bg-transparent text-zinc-700'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
