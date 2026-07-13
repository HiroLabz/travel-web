import { cn } from '@/lib/utils';

interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <div className={cn('relative ml-3', className)}>
      <div className="absolute top-4 bottom-0 left-0 border-l-2 border-border" />
      {children}
    </div>
  );
}

interface TimelineItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconClassName?: string;
  dotClassName?: string;
  isLast?: boolean;
  className?: string;
}

export function TimelineItem({ children, icon, iconClassName, dotClassName, isLast, className }: TimelineItemProps) {
  return (
    <div className={cn('relative pl-8', isLast ? 'pb-0' : 'pb-12', className)}>
      <div
        className={cn(
          'absolute top-3 left-px h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-background ring-8 ring-background',
          dotClassName || 'border-brand-500'
        )}
      />
      {icon && (
        <div className={cn('mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconClassName || 'bg-accent text-muted-foreground')}>
          {icon}
        </div>
      )}
      {children}
    </div>
  );
}
