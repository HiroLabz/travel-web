'use client';

import { usePathname } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';
import { ONBOARDING_STEPS } from '@/lib/onboarding-steps';

export default function OnboardingStepsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStep =
    ONBOARDING_STEPS.find((s) => pathname?.startsWith(s.path))?.id ?? 'plan';

  return (
    <div className="relative h-screen w-full overflow-y-auto overflow-x-hidden bg-muted/40 lg:overflow-hidden dark:bg-[linear-gradient(165deg,#070d1c_0%,#08122A_50%,#050C1C_100%)]">
      {/* Ambient glows (dark only, matching design) */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 hidden h-[520px] w-[900px] -translate-x-1/2 rounded-full dark:block"
        style={{ background: 'radial-gradient(ellipse, rgba(16,89,210,.30) 0%, transparent 68%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-32 hidden h-[520px] w-[520px] rounded-full dark:block"
        style={{ background: 'radial-gradient(circle, rgba(84,111,166,.20) 0%, transparent 70%)' }}
      />

      <div className="relative flex min-h-full flex-col items-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[600px]">
          <OnboardingProgress currentStep={currentStep} className="mb-6" />
        </div>

        {/* Content slot — width is intentionally not fixed here; each step's
            own page declares its own max-width (600px for group, ~820px
            for plan) so the plan-selection grid isn't cramped. */}
        <div className="flex w-full flex-1 flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
