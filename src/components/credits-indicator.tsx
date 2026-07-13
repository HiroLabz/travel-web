'use client';

import { Star } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PLAN_LIMITS } from '@/types';

export function CreditsIndicator() {
  const { subscription } = useAuth();

  if (!subscription) return null;

  const maxCredits = PLAN_LIMITS[subscription.plan].monthlyCredits;
  const remaining = Math.max(0, maxCredits - subscription.creditsUsed);
  const percentage = (remaining / maxCredits) * 100;

  const getColorClass = () => {
    if (percentage > 50) return ' bg-muted hover:bg-accent transition px-3 py-2 rounded-full pr-4 border border-border';
    if (percentage > 20) return 'text-warning-accent bg-warning-soft';
    return 'text-destructive-accent bg-destructive-soft';
  };

  return (
    <div
      className={`flex items-center gap-2 h-9 px-3 rounded-full text-xs font-medium ${getColorClass()}`}
      title={`${remaining} of ${maxCredits} AI credits remaining this month`}
    >
      <span className='text-md'> Points </span>
      <strong className='text-success-accent'>{remaining}</strong>
    </div>
  );
}
