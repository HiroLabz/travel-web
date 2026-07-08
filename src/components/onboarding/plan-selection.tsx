'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlanCard } from './plan-card';
import { STRIPE_PLANS, StripePlanId, TRIAL_PERIOD_DAYS } from '@/lib/stripe-config';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function PlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState<StripePlanId | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageMode = searchParams.get('manage') === 'true';

  const handleSelectPlan = async (planId: StripePlanId) => {
    if (!user || !db) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to select a plan.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedPlan(planId);
    setLoading(true);

    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const userRef = doc(db, 'users', user.uid);

      if (manageMode) {
        // Existing subscriber changing plan — update the plan only.
        await updateDoc(userRef, {
          'subscription.plan': planId,
          'subscription.updatedAt': nowIso,
        });
        toast({
          title: 'Plan updated',
          description: `You're now on the ${STRIPE_PLANS[planId].name} plan.`,
        });
        router.push('/profile');
        return;
      }

      // New subscriber — start a 7-day trial window locally.
      // NOTE: we deliberately do NOT write any stripe* fields here. Those are
      // billing-authoritative markers that only trusted server code (a real
      // payment webhook) may ever set. Writing them from the client would let a
      // user forge a paid/trialing billing state. Entitlements and trial UI are
      // derived from `subscription.plan` and `subscription.trialEnd` instead.
      const trialEnd = new Date(
        now.getTime() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      const creditResetDate = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      await updateDoc(userRef, {
        onboardingStep: 'group',
        subscription: {
          plan: planId,
          planStartDate: nowIso,
          creditsUsed: 0,
          creditResetDate,
          trialEnd,
          updatedAt: nowIso,
        },
      });

      router.push('/onboarding/group');
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to select plan',
        variant: 'destructive',
      });
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <PlanCard
        name={STRIPE_PLANS.starter.name}
        price={STRIPE_PLANS.starter.price}
        features={STRIPE_PLANS.starter.features}
        isSelected={selectedPlan === 'starter'}
        onSelect={() => handleSelectPlan('starter')}
        loading={loading && selectedPlan === 'starter'}
      />
      <PlanCard
        name={STRIPE_PLANS.wanderer.name}
        price={STRIPE_PLANS.wanderer.price}
        features={STRIPE_PLANS.wanderer.features}
        isPopular
        isSelected={selectedPlan === 'wanderer'}
        onSelect={() => handleSelectPlan('wanderer')}
        loading={loading && selectedPlan === 'wanderer'}
      />
    </div>
  );
}
