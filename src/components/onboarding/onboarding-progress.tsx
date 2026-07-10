'use client';

import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ONBOARDING_STEPS, type OnboardingStepId } from '@/lib/onboarding-steps';

interface OnboardingProgressProps {
  currentStep: OnboardingStepId;
  /** Optional classes for the <nav> wrapper (e.g. width / alignment overrides). */
  className?: string;
}

export function OnboardingProgress({ currentStep, className }: OnboardingProgressProps) {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Progress" className={cn('flex w-full items-center', className)}>
      {ONBOARDING_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const Icon = step.icon;
        // The connector that follows this step is "filled" once the step is done.
        const connectorFilled = index < currentIndex;
        const subLabel = isCompleted ? 'Completed' : isCurrent ? 'In progress' : 'Up next';

        return (
          <div key={step.id} className="contents">
            {/* Step */}
            <div
              className="flex w-28 shrink-0 flex-col items-center gap-2"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-[42px] w-[42px] items-center justify-center rounded-full transition-colors',
                  isCompleted && 'bg-success-500 shadow-lg shadow-success-500/40',
                  isCurrent &&
                    'border-2 border-secondary-500 bg-secondary-100 ring-4 ring-secondary-500/15 dark:border-secondary-400 dark:bg-secondary-900/40',
                  !isCompleted && !isCurrent && 'border-2 border-border bg-muted'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 text-white" strokeWidth={3} />
                ) : (
                  <Icon
                    className={cn(
                      'h-[21px] w-[21px]',
                      isCurrent ? 'text-secondary-600 dark:text-secondary-300' : 'text-muted-foreground'
                    )}
                  />
                )}
              </span>
              <div className="text-center">
                <div
                  className={cn(
                    'text-sm font-semibold',
                    isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </div>
                <div
                  className={cn(
                    'text-[11.5px]',
                    isCompleted && 'text-success-600 dark:text-success-400',
                    isCurrent && 'text-secondary-600 dark:text-secondary-400',
                    !isCompleted && !isCurrent && 'text-muted-foreground/70'
                  )}
                >
                  {subLabel}
                </div>
              </div>
            </div>

            {/* Connector — animated line, aligned to the badge centers */}
            {index < ONBOARDING_STEPS.length - 1 && (
              <svg
                className="mx-[-8px] mb-[42px] h-[3px] flex-1 overflow-visible"
                viewBox="0 0 48 3"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {/* Track */}
                <line
                  x1="0"
                  y1="1.5"
                  x2="48"
                  y2="1.5"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="stroke-border"
                />
                {/* Real-time animated progress line */}
                <motion.line
                  x1="0"
                  y1="1.5"
                  x2="48"
                  y2="1.5"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="stroke-success-500"
                  initial={{ pathLength: reduceMotion ? (connectorFilled ? 1 : 0) : 0 }}
                  animate={{ pathLength: connectorFilled ? 1 : 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }
                  }
                />
              </svg>
            )}
          </div>
        );
      })}
    </nav>
  );
}
