import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'shadcn-primary-btn bg-zinc-900 text-white border border-zinc-900 shadow-2xs hover:bg-zinc-800 active:bg-zinc-950 font-semibold',
        destructive:
          'bg-red-600 text-white border border-red-600 shadow-2xs hover:bg-red-700 font-semibold',
        outline:
          'border border-zinc-200 bg-white text-zinc-800 shadow-2xs hover:bg-zinc-100 hover:text-zinc-950 hover:border-zinc-300',
        secondary:
          'bg-zinc-100 text-zinc-900 border border-zinc-200/80 hover:bg-zinc-200/70',
        ghost:
          'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
        success:
          'bg-emerald-600 text-white border border-emerald-600 shadow-2xs hover:bg-emerald-700 active:bg-emerald-800 font-semibold',
        link:
          'text-zinc-900 underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-8 px-3.5 py-1.5 text-xs',
        sm: 'h-7 rounded-md px-2.5 text-xs',
        lg: 'h-9 rounded-lg px-5 text-sm',
        icon: 'h-8 w-8 p-0'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
