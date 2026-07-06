'use client';

import { useState } from 'react';
import { PlanCard } from './plan-card';
import { STRIPE_PLANS, StripePlanId } from '@/lib/stripe-config';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function PlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState<StripePlanId | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const handleSelectPlan = async (planId: StripePlanId) => {
    if (!user) {
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
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          userId: user.uid,
          userEmail: user.email,
          stripeCustomerId: userProfile?.stripeCustomerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Save customer ID to Firestore before redirecting
      if (data.customerId && db && !userProfile?.stripeCustomerId) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            stripeCustomerId: data.customerId,
          });
        } catch (e) {
          console.error('Failed to save customer ID:', e);
          // Continue anyway - it will be saved after checkout
        }
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
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
