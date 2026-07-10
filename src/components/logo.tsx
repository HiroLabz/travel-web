import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-lg font-bold text-foreground", className)}>
      <Plane className="h-6 w-6 shrink-0 text-primary" />
      <span className="font-headline">WanderNest</span>
    </div>
  );
}
