'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && userProfile) {
      // Route based on onboarding step
      switch (userProfile.onboardingStep) {
        case 'completed':
          router.replace('/dashboard');
          break;
        case 'group':
          router.replace('/onboarding/group');
          break;
        case 'plan':
        default:
          // If user already has households (legacy), go to dashboard
          if (userProfile.householdIds && userProfile.householdIds.length > 0) {
            router.replace('/dashboard');
          } else {
            // New users start at plan selection
            router.replace('/onboarding/plan');
          }
          break;
      }
    }
  }, [userProfile, authLoading, router]);

  // Show loading while determining where to redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-dark-900 via-secondary-900 to-neutral-dark-900 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );
}
