import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'whitespace-nowrap inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover-elevate',
  {
    variants: {
      variant: {
        // Orange — primary brand action
        default:
          'border-transparent bg-primary text-primary-foreground shadow-xs',
        // Navy — secondary brand
        navy:
          'border-transparent bg-navy text-navy-foreground shadow-xs',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow-xs',
        outline:
          'text-foreground border [border-color:var(--badge-outline)]',
        // Status variants — semantic, used throughout the app
        success:
          'border border-emerald-200 bg-emerald-50 text-emerald-700',
        warning:
          'border border-orange-200 bg-orange-50 text-orange-700',
        info:
          'border border-blue-200 bg-blue-50 text-blue-700',
        danger:
          'border border-red-200 bg-red-50 text-red-700',
        upcoming:
          'border border-blue-200 bg-blue-50 text-blue-700',
        pending:
          'border border-orange-200 bg-orange-50 text-orange-700',
        completed:
          'border border-emerald-200 bg-emerald-50 text-emerald-700',
        cancelled:
          'border border-red-200 bg-red-50 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
