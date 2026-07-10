'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PlanSelection } from '@/components/onboarding/plan-selection';
import { StepLoading } from '@/components/onboarding/step-loading';

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
    return <StepLoading />;
  }

  return (
    <div className="w-full max-w-4xl">
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
  );
}
