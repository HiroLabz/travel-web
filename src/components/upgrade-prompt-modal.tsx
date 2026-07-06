'use client';

import { X, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAN_LIMITS } from '@/types';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingCredits: number;
  planName: 'starter' | 'wanderer';
}

export function UpgradePromptModal({
  isOpen,
  onClose,
  remainingCredits,
  planName
}: UpgradePromptModalProps) {
  if (!isOpen) return null;

  const planLimits = PLAN_LIMITS[planName];
  const displayName = planName === 'starter' ? 'Starter' : 'Wanderer';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5" />
              <h3 className="font-bold text-lg">Credits Exhausted</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            You&apos;ve used all your AI credits for this month on the {displayName} plan.
          </p>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Remaining Credits
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {remainingCredits} / {planLimits.monthlyCredits}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${Math.max(0, (remainingCredits / planLimits.monthlyCredits) * 100)}%` }}
              />
            </div>
          </div>

          {planName === 'starter' && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-6 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">
                    Upgrade to Wanderer
                  </h4>
                  <ul className="text-sm text-indigo-700 dark:text-indigo-300 mt-2 space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      1,000 AI credits per month
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      Unlimited travel groups
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              Contact support to upgrade your plan.
            </p>
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
