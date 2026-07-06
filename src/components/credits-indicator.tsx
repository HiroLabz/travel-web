'use client';

import { Zap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PLAN_LIMITS } from '@/types';

export function CreditsIndicator() {
  const { subscription } = useAuth();

  if (!subscription) return null;

  const maxCredits = PLAN_LIMITS[subscription.plan].monthlyCredits;
  const remaining = Math.max(0, maxCredits - subscription.creditsUsed);
  const percentage = (remaining / maxCredits) * 100;

  const getColorClass = () => {
    if (percentage > 50) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30';
    if (percentage > 20) return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30';
    return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getColorClass()}`}
      title={`${remaining} of ${maxCredits} AI credits remaining this month`}
    >
      <Zap className="w-3 h-3" />
      <span>{remaining}/{maxCredits}</span>
    </div>
  );
}
