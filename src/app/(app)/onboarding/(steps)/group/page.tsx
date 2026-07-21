'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createHouseholdAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/motion/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import {
  Loader2,
  Users,
  Globe,
  MapPin,
  Banknote,
  Clock,
  Info,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { COUNTRIES, CURRENCIES, TIME_FORMAT_OPTIONS } from '@/lib/constants';
import { SuccessOverlay } from '@/components/onboarding/success-overlay';
import { StepLoading } from '@/components/onboarding/step-loading';
import type { TimeFormat } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AnimatePresence } from 'motion/react';

function GroupCreationForm() {
  const [name, setName] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [cityOfOrigin, setCityOfOrigin] = useState('');
  const [currency, setCurrency] = useState('');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Redirect checks
  useEffect(() => {
    if (!authLoading && userProfile) {
      // If onboarding is complete or user has households, go to dashboard
      if (userProfile.onboardingStep === 'completed' || (userProfile.householdIds && userProfile.householdIds.length > 0)) {
        router.replace('/dashboard');
        return;
      }

      // If user hasn't selected a plan yet, redirect to plan selection
      if (!userProfile.subscription?.plan && userProfile.onboardingStep !== 'group') {
        router.replace('/onboarding/plan');
      }
    }
  }, [userProfile, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    if (!name.trim()) {
      toast({ title: 'Please enter a travel group name.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    const result = await createHouseholdAction(
      name.trim(),
      user.uid,
      user.email!,
      user.displayName,
      user.photoURL,
      {
        countryOfOrigin: countryOfOrigin || undefined,
        cityOfOrigin: cityOfOrigin.trim() || undefined,
        currency: currency || undefined,
        timeFormat: timeFormat,
      }
    );

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      setLoading(false);
    } else {
      // Mark onboarding as complete
      if (db) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            onboardingStep: 'completed',
          });
        } catch (error) {
          console.error('Failed to update onboarding step:', error);
        }
      }

      // transitions.dev success feedback — hold the overlay briefly, then navigate.
      setSuccess('Welcome to WanderNest!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1100);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return <StepLoading />;
  }

  return (
    <div className="w-full max-w-[600px]">
      <AnimatePresence>
        {success && <SuccessOverlay label={success} />}
      </AnimatePresence>

      <h1 className="text-[28px] font-bold tracking-tight text-center text-foreground">Almost there!</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-center text-muted-foreground">
        Create your first travel group to start planning amazing adventures.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Group details card */}
        <div className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-900/40">
              <Users className="h-6 w-6 text-secondary-600 dark:text-secondary-400" />
            </span>
            <div>
              <div className="text-base font-semibold text-foreground">Create your travel group</div>
              <p className="text-[12.5px] leading-snug text-muted-foreground">
                Where you and your companions plan trips together.
              </p>
            </div>
          </div>

          <Label htmlFor="group-name" className="mb-2 block text-[13px] font-semibold text-foreground">
            Travel group name
          </Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., The Adventure Crew, Smith Family"
            required
            className="h-12"
            disabled={loading}
          />
          <div className="mt-2.5 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              You can add family members and friends to this group later.
            </span>
          </div>
        </div>

        {/* Regional settings card */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-[19px] w-[19px] text-muted-foreground" />
            <span className="text-[15px] font-semibold text-foreground">Regional settings</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] text-muted-foreground">
              Optional
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Country of Origin */}
            <div>
              <Label className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Country of origin
              </Label>
              <Combobox
                options={COUNTRIES}
                value={countryOfOrigin}
                onValueChange={setCountryOfOrigin}
                placeholder="Select country..."
                searchPlaceholder="Search countries..."
                emptyText="No country found."
                disabled={loading}
                className="h-12"
              />
            </div>

            {/* City of Origin */}
            <div>
              <Label htmlFor="city-origin" className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                City of origin
              </Label>
              <Input
                id="city-origin"
                type="text"
                value={cityOfOrigin}
                onChange={(e) => setCityOfOrigin(e.target.value)}
                placeholder="e.g., New York"
                disabled={loading}
                className="h-12"
              />
            </div>

            {/* Preferred Currency */}
            <div>
              <Label className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                Preferred currency
              </Label>
              <Combobox
                options={CURRENCIES}
                value={currency}
                onValueChange={setCurrency}
                placeholder="Select currency..."
                searchPlaceholder="Search currencies..."
                emptyText="No currency found."
                disabled={loading}
                className="h-12"
              />
            </div>

            {/* Time Format */}
            <div>
              <Label className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Time format
              </Label>
              <div className="flex gap-2">
                {TIME_FORMAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTimeFormat(option.value)}
                    disabled={loading}
                    aria-pressed={timeFormat === option.value}
                    className={`flex-1 rounded-xl border px-3 py-2 text-center transition-all ${timeFormat === option.value
                      ? 'border-secondary-500 bg-secondary-50 text-secondary-700 ring-1 ring-secondary-500 dark:border-secondary-400 dark:bg-secondary-900/40 dark:text-secondary-300'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent'
                      }`}
                  >
                    <div className="text-[13px] font-semibold">{option.label}</div>
                    <div className="text-[10.5px] opacity-70">{option.example}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !name.trim()}
          className="mt-5 h-[52px] w-full rounded-2xl bg-gradient-to-b from-secondary-500 to-brand-500 text-base font-semibold text-white shadow-lg shadow-secondary-500/30 transition hover:brightness-110"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating your group...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Get started
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function GroupPage() {
  return (
    <Suspense fallback={<StepLoading />}>
      <GroupCreationForm />
    </Suspense>
  );
}
