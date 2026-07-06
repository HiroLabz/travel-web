'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Plane } from 'lucide-react';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';
import { PlanSelection } from '@/components/onboarding/plan-selection';
import { useToast } from '@/hooks/use-toast';

export default function PlanSelectionPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Handle canceled checkout
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast({
        title: 'Checkout canceled',
        description: 'You can select a plan whenever you\'re ready.',
      });
    }
  }, [searchParams, toast]);

  // Redirect if user has already completed onboarding
  useEffect(() => {
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
  }, [userProfile, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-white/10 p-2 rounded-lg">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white">WanderNest</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Choose your adventure plan
          </h1>
          <p className="text-blue-200 max-w-lg mx-auto">
            Start with a 7-day free trial. No credit card charged until after your trial ends.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl py-4 px-6 mb-8 mx-auto max-w-md">
          <OnboardingProgress currentStep="plan" />
        </div>

        {/* Plan Selection */}
        <PlanSelection />

        {/* Footer note */}
        <p className="text-center text-blue-200/70 text-sm mt-8">
          You can change or cancel your plan anytime from your profile settings.
        </p>
      </div>
    </div>
  );
}
