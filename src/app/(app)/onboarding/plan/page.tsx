'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';
import { PlanSelection } from '@/components/onboarding/plan-selection';

export default function PlanSelectionPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect if user has already completed onboarding — unless they came here
  // via "Manage Subscription" (?manage=true) to change their plan.
  useEffect(() => {
    if (searchParams.get('manage') === 'true') return;
    if (!authLoading && userProfile) {
      if (userProfile.onboardingStep === 'completed') {
        router.replace('/dashboard');
      } else if (userProfile.onboardingStep === 'group') {
        router.replace('/onboarding/group');
      } else if (userProfile.householdIds && userProfile.householdIds.length > 0) {
        // Legacy users with households go to dashboard
        router.replace('/dashboard');
      }
    }
  }, [userProfile, authLoading, router, searchParams]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 dark:bg-[#050C1C]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary-500" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-y-auto overflow-x-hidden bg-muted/40 py-12 px-4 lg:overflow-hidden dark:bg-[linear-gradient(165deg,#050C1C_0%,#08122A_55%,#050C1C_100%)]">
      {/* Ambient glows (dark only, matching design) */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 hidden h-[520px] w-[900px] -translate-x-1/2 rounded-full dark:block"
        style={{ background: 'radial-gradient(ellipse, rgba(16,89,210,.30) 0%, transparent 68%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-32 hidden h-[520px] w-[520px] rounded-full dark:block"
        style={{ background: 'radial-gradient(circle, rgba(84,111,166,.20) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-4xl mx-auto">
        {/* Progress */}
        <div className='max-w-[600px] mx-auto'>
          <OnboardingProgress currentStep="plan" />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground mb-1.5">
            Choose your adventure plan
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground max-w-full mx-auto">
            Start with a 7-day free trial. No credit card charged until after your trial ends.
          </p>
        </div>

        {/* Plan Selection */}
        <PlanSelection />

        {/* Footer note */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          You can change or cancel your plan anytime from your profile settings.
        </p>
      </div>
    </div>
  );
}
