'use client';

import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  name: string;
  price: number;
  features: string[];
  isPopular?: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  loading?: boolean;
}

export function PlanCard({
  name,
  price,
  features,
  isPopular = false,
  isSelected = false,
  onSelect,
  loading = false,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 p-6 transition-all',
        isPopular
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900'
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {name}
        </h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            ${price.toFixed(2)}
          </span>
          <span className="text-slate-500 dark:text-slate-400">/month</span>
        </div>
      </div>

      <div className="mb-4 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        7-day free trial
      </div>

      <ul className="mb-6 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onSelect}
        disabled={loading}
        className={cn(
          'w-full',
          isPopular
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900'
        )}
      >
        {loading ? 'Processing...' : 'Start Free Trial'}
      </Button>
    </div>
  );
}
