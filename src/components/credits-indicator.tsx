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
    if (percentage > 50) return 'text-success-accent bg-success-soft';
    if (percentage > 20) return 'text-warning-accent bg-warning-soft';
    return 'text-destructive-accent bg-destructive-soft';
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
