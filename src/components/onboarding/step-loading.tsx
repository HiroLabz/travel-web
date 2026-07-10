import { Loader2 } from 'lucide-react';

/**
 * Centered spinner shown inside the (steps) layout's content slot while a
 * step's own `authLoading` check is in flight. The shell's background,
 * glows, and progress bar stay mounted underneath — only this fills in.
 */
export function StepLoading() {
  return (
    <div className="flex w-full flex-1 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-secondary-500" />
    </div>
  );
}
