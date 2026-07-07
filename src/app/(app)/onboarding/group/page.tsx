'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createHouseholdAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, Users, Plane, Sparkles, Globe, MapPin, Banknote, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { COUNTRIES, CURRENCIES, TIME_FORMAT_OPTIONS } from '@/lib/constants';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';
import type { TimeFormat } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function GroupCreationForm() {
  const [name, setName] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [cityOfOrigin, setCityOfOrigin] = useState('');
  const [currency, setCurrency] = useState('');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h');
  const [loading, setLoading] = useState(false);
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
      if (!userProfile.stripeSubscriptionId && userProfile.onboardingStep !== 'group') {
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

      toast({ title: 'Welcome to WanderNest!', description: 'Your travel group is ready.' });
      router.push('/dashboard');
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header with welcome message */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-6 text-white sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <Plane className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl">WanderNest</span>
          </div>

          {/* Progress indicator */}
          <div className="mb-4">
            <OnboardingProgress currentStep="group" />
          </div>

          {/* Subscription confirmation */}
          {(userProfile?.stripeSubscriptionStatus === 'active' || userProfile?.stripeSubscriptionStatus === 'trialing') && (
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span className="text-sm">
                {userProfile.stripeSubscriptionStatus === 'trialing'
                  ? 'Free trial active'
                  : 'Subscription active'}
              </span>
            </div>
          )}

          <h1 className="text-2xl font-bold mb-2">Almost there!</h1>
          <p className="text-blue-100">
            Create your first travel group to start planning amazing adventures.
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Create your Travel Group
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                A travel group is where you and your companions plan trips together.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Travel Group Name */}
            <div>
              <Label htmlFor="group-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Travel Group Name
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., The Adventure Crew, Smith Family"
                required
                className="mt-2"
                disabled={loading}
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                You can add family members and friends to this group later.
              </p>
            </div>

            {/* Regional Settings Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Regional Settings</span>
                <span className="text-xs text-slate-400">(optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Country of Origin */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Country of Origin
                  </Label>
                  <Combobox
                    options={COUNTRIES}
                    value={countryOfOrigin}
                    onValueChange={setCountryOfOrigin}
                    placeholder="Select country..."
                    searchPlaceholder="Search countries..."
                    emptyText="No country found."
                    disabled={loading}
                  />
                </div>

                {/* City of Origin */}
                <div>
                  <Label htmlFor="city-origin" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    City of Origin
                  </Label>
                  <Input
                    id="city-origin"
                    type="text"
                    value={cityOfOrigin}
                    onChange={(e) => setCityOfOrigin(e.target.value)}
                    placeholder="e.g., New York"
                    disabled={loading}
                  />
                </div>

                {/* Preferred Currency */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Banknote className="w-3.5 h-3.5 text-slate-400" />
                    Preferred Currency
                  </Label>
                  <Combobox
                    options={CURRENCIES}
                    value={currency}
                    onValueChange={setCurrency}
                    placeholder="Select currency..."
                    searchPlaceholder="Search currencies..."
                    emptyText="No currency found."
                    disabled={loading}
                  />
                </div>

                {/* Time Format */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Time Format
                  </Label>
                  <div className="flex gap-2">
                    {TIME_FORMAT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTimeFormat(option.value)}
                        disabled={loading}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                          timeFormat === option.value
                            ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                        }`}
                      >
                        <div className="text-xs">{option.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{option.example}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your group...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Started
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function GroupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <GroupCreationForm />
    </Suspense>
  );
}
