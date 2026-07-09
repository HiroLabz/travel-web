'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { STRIPE_PLANS, StripePlanId, TRIAL_PERIOD_DAYS } from '@/lib/stripe-config';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CircleCheck, Gem, Loader2, Plane, type LucideIcon } from 'lucide-react';

const PLAN_META: {
  id: StripePlanId;
  icon: LucideIcon;
  isPopular: boolean;
}[] = [
    { id: 'starter', icon: Plane, isPopular: false },
    { id: 'wanderer', icon: Gem, isPopular: true },
  ];

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
    <div className="mx-auto grid max-w-[820px] grid-cols-1 items-start gap-5 sm:grid-cols-2">
      {PLAN_META.map((meta) => (
        <PlanCard
          key={meta.id}
          plan={STRIPE_PLANS[meta.id]}
          icon={meta.icon}
          isPopular={meta.isPopular}
          isSelected={selectedPlan === meta.id}
          loading={loading && selectedPlan === meta.id}
          disabled={loading}
          ctaLabel={manageMode ? 'Choose plan' : 'Start free trial'}
          onSelect={() => handleSelectPlan(meta.id)}
        />
      ))}
    </div>
  );
}

interface PlanCardProps {
  plan: (typeof STRIPE_PLANS)[string];
  icon: LucideIcon;
  isPopular: boolean;
  isSelected: boolean;
  loading: boolean;
  disabled: boolean;
  ctaLabel: string;
  onSelect: () => void;
}

function PlanCard({
  plan,
  icon: Icon,
  isPopular,
  isSelected,
  loading,
  disabled,
  ctaLabel,
  onSelect,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-[20px] border bg-card shadow-xl shadow-black/10',
        isPopular
          ? 'border-secondary-500 shadow-2xl shadow-secondary-500/25 dark:border-secondary-400'
          : 'border-border',
        isSelected && 'ring-2 ring-secondary-500 ring-offset-2 ring-offset-background'
      )}
    >
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border px-6 pb-5 pt-6">
        {isPopular && (
          <>
            {/* Circuit-board pattern — subtle in light mode, full in dark. */}
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-50 dark:opacity-100"
              style={{
                backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(120,150,220,0.10) 19px, rgba(120,150,220,0.10) 20px),
          repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(120,150,220,0.10) 19px, rgba(120,150,220,0.10) 20px),
          radial-gradient(circle at 20px 20px, rgba(120,150,220,0.16) 1.5px, transparent 1.5px)
        `,
                backgroundSize: '40px 40px, 40px 40px, 40px 40px',
              }}
            />
            <span className="absolute right-5 top-5 z-[2] rounded-full bg-secondary-100 px-[11px] py-[5px] text-[11.5px] font-semibold text-secondary-700 dark:bg-secondary-900/50 dark:text-secondary-300">
              Most popular
            </span>
          </>
        )}
        <span className="relative z-[2] mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-900/40">
          <Icon className="h-6 w-6 text-secondary-600 dark:text-secondary-300" />
        </span>
        <h3 className="relative z-[2] text-[22px] font-semibold tracking-tight text-foreground">
          {plan.name}
        </h3>
        <p className="relative z-[2] mt-1.5 max-w-[260px] text-sm text-muted-foreground">
          {plan.households === Infinity
            ? 'Unlimited travel groups for the whole family.'
            : 'Perfect for getting started.'}
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[36px] font-bold tracking-tight text-foreground">${plan.price}</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {TRIAL_PERIOD_DAYS}-day free trial, cancel anytime
        </p>

        <Button
          onClick={onSelect}
          disabled={disabled}
          aria-pressed={isSelected}
          variant="ghost"
          className={cn(
            'my-5 h-[50px] w-full rounded-[13px] text-[15px] font-semibold transition',
            isPopular
              ? 'bg-gradient-to-b from-secondary-500 to-brand-500 text-white shadow-lg shadow-secondary-500/40 hover:brightness-110'
              : 'border-[1.5px] border-border bg-muted/40 text-foreground hover:border-secondary-500 hover:bg-muted/40'
          )}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : ctaLabel}
        </Button>

        <ul className="flex flex-col gap-3">
          {plan.features.map((feature) => (
            <li className="flex items-center gap-2.5" key={feature}>
              <CircleCheck className="size-[19px] shrink-0 fill-secondary-500/15 text-secondary-600 dark:text-secondary-400" />
              <span className="text-sm text-foreground/90">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
