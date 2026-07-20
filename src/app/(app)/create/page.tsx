'use client';

import { useState, useEffect, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { createTripAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/motion/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/motion/tabs';
import { DateRangePicker } from '@/components/date-range-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { differenceInCalendarDays } from 'date-fns';
import type { TripType } from '@/types';
import { TRIP_TYPE_LABELS, PLAN_LIMITS } from '@/types';
import { COUNTRIES } from '@/lib/constants';
import { getAvatarUrl } from '@/lib/avatar';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import { NoTravelGroupModal } from '@/components/no-travel-group-modal';
import { cn } from '@/lib/utils';

type DestinationDraft = {
  id: string;
  city: string;
  country: string;
  province?: string;
  dateFrom?: string;
  dateTo?: string;
};

// Fields inside the active stop's blue panel need light surfaces for
// contrast against secondary-500, so they get their own treatment.
const stopFieldClass = 'h-[48px] rounded-full border-transparent bg-white px-5 border-border placeholder:text-muted-foreground';

export default function CreateTripPage() {
  const router = useRouter();
  const { user, household, subscription, refreshSubscription, userProfile } = useAuth();
  const { toast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showNoTravelGroupModal, setShowNoTravelGroupModal] = useState(false);

  useEffect(() => {
    if (userProfile && (!userProfile.householdIds || userProfile.householdIds.length === 0)) {
      setShowNoTravelGroupModal(true);
    }
  }, [userProfile]);

  const initialState = { message: '', errors: {}, tripId: null as null };
  const [state, formAction, isPending] = useActionState(createTripAction, initialState);

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [tripType, setTripType] = useState<TripType>('international');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeStop, setActiveStop] = useState(0);
  // The date-range popover floats over the page instead of pushing content
  // down, so the tallest state (2-month calendar, open) can overlap the CTA
  // sitting right below it. Reserve clearance for that only while it's open.
  const [tripDatesOpen, setTripDatesOpen] = useState(false);
  const [stopDatesOpen, setStopDatesOpen] = useState(false);

  const getCountryName = (code: string) => {
    const country = COUNTRIES.find((c) => c.value === code);
    return country?.label || '';
  };

  const [destinations, setDestinations] = useState<DestinationDraft[]>([
    { id: Math.random().toString(), city: '', country: '', province: '' },
  ]);
  const [hasSetOrigin, setHasSetOrigin] = useState(false);

  useEffect(() => {
    if (household && !hasSetOrigin) {
      const countryName = household.countryOfOrigin ? getCountryName(household.countryOfOrigin) : '';
      setDestinations([
        {
          id: Math.random().toString(),
          city: household.cityOfOrigin || '',
          country: countryName,
          province: '',
        },
      ]);
      setHasSetOrigin(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household, hasSetOrigin]);

  const handleAddDest = () => {
    setDestinations((prev) => {
      const next = [...prev, { id: Math.random().toString(), city: '', country: '', province: '' }];
      setActiveStop(next.length - 1);
      return next;
    });
  };

  const updateDest = (id: string, field: keyof Omit<DestinationDraft, 'id'>, value: string) => {
    // Functional updater — the date-range picker fires this twice in a row
    // (dateFrom then dateTo) within the same handler, and reading from a
    // captured `destinations` closure would let the second call clobber the
    // first before either state update commits.
    setDestinations((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };
        if (field === 'dateFrom' && d.dateTo && value > d.dateTo) {
          updated.dateTo = '';
        }
        return updated;
      })
    );
  };

  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    if (type === 'international' && household) {
      const countryName = household.countryOfOrigin ? getCountryName(household.countryOfOrigin) : '';
      setDestinations([
        { id: Math.random().toString(), city: household.cityOfOrigin || '', country: countryName, province: '' },
      ]);
    } else {
      setDestinations([{ id: Math.random().toString(), city: '', country: '', province: '' }]);
    }
    setActiveStop(0);
  };

  const removeDest = (id: string) => {
    if (destinations.length <= 1) return;
    setDestinations(destinations.filter((d) => d.id !== id));
    setActiveStop((prev) => Math.max(0, Math.min(prev, destinations.length - 2)));
  };

  const filteredDestinations = destinations.filter((d) => d.city);
  const destinationString = filteredDestinations
    .map((d) => (tripType === 'local' ? `${d.city}, ${d.province || ''}` : `${d.city}, ${d.country}`))
    .join(';');

  let days = 0;
  if (startDate && endDate) {
    days = differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1;
  }

  // Only step 1 needs a real "leave the flow" back button — step 2's Back
  // just moves to step 1. history.length > 1 means there's a page the user
  // actually came from in this tab; otherwise (direct link, new tab) fall
  // back to the dashboard rather than leaving them on a dead end.
  const handleLeaveCreate = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    const handleStateChange = async () => {
      await refreshSubscription();

      if ('creditError' in state && state.creditError) {
        setShowUpgradeModal(true);
        return;
      }

      if ('tripId' in state && state.tripId) {
        toast({
          title: 'Trip Created!',
          description: 'Redirecting to your new adventure...',
        });
        router.push(`/trip/${state.tripId}`);
      } else if (state.message && !state.tripId) {
        toast({
          title: 'Error',
          description: state.message,
          variant: 'destructive',
        });
      } else if (state.errors && Object.keys(state.errors).length > 0) {
        const errorMessages = Object.values(state.errors).flat().join(' ');
        toast({
          title: 'Invalid Input',
          description: errorMessages,
          variant: 'destructive',
        });
      }
    };

    handleStateChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const firstName = userProfile?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 pt-6">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <Link href="/profile">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage
              src={getAvatarUrl(userProfile?.photoURL, userProfile?.displayName, userProfile?.email)}
              alt={userProfile?.displayName || 'User'}
            />
            <AvatarFallback>{(userProfile?.displayName || '?').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
      </div>

      <div className="mx-auto max-w-xl px-6 py-10 lg:py-16">
        <div>
          <p className="text-xs md:text-md lg:text-lg 2xl:text-2xl font-semibold uppercase tracking-widest text-muted-foreground">
            {step === 1 ? `Hi, ${firstName}!` : 'Got something in mind?'}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Let&apos;s Plan your First Trip!</h1>
            <span className="shrink-0 text-sm font-medium text-muted-foreground">{step}/2</span>
          </div>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {step === 1
              ? 'Enter the following details so we can make the best out of your trip.'
              : 'Add the places you want to visit. Tell us everything so we can curate the best trip.'}
          </p>

          <form action={formAction} className="mt-6  ">
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="tripType" value={tripType} />
            <input type="hidden" name="startDate" value={startDate ? new Date(startDate).toISOString() : ''} />
            <input type="hidden" name="endDate" value={endDate ? new Date(endDate).toISOString() : ''} />
            <input type="hidden" name="destination" value={destinationString || 'TBD'} />
            <input type="hidden" name="vibe" value="adventurous" />
            <input type="hidden" name="days" value={days > 0 ? String(days) : '1'} />
            <input type="hidden" name="householdId" value={household?.id || ''} />
            <input type="hidden" name="userId" value={user?.uid || ''} />

            {step === 1 ? (
              <div className='space-y-3 '>
                <div className="space-y-3 rounded-2xl bg-info-soft py-5 px-4 border shadow-l">
                  <Input
                    aria-label="Trip Name"
                    placeholder="Trip Name"
                    className={stopFieldClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  <Select value={tripType} onValueChange={(v) => handleTripTypeChange(v as TripType)} >
                    <SelectTrigger className={stopFieldClass} aria-label="Trip Type">
                      <SelectValue placeholder="Trip Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {TRIP_TYPE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div>
                    <p className="mb-1.5 px-1 text-xs font-medium text-brand-800">Trip Dates</p>
                    <DateRangePicker
                      aria-label="Overall trip dates"
                      from={startDate}
                      to={endDate}
                      placeholder="Overall Start – Overall End"
                      onChange={({ from, to }) => {
                        setStartDate(from ?? '');
                        setEndDate(to ?? '');
                      }}
                      onOpenChange={setTripDatesOpen}
                    />
                  </div>

                </div>
                <div className={cn('flex flex-row gap-3', tripDatesOpen && 'invisible')}>
                  <Button
                    type="button"
                    onClick={handleLeaveCreate}
                    variant="outline"
                    className="h-[48px] flex-1 rounded-full"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!title || !startDate}
                    className="h-[48px] flex-1 rounded-full bg-accent-500 text-white hover:bg-accent-600"
                  >
                    Next: Destinations
                  </Button>
                </div>

              </div>
            ) : (
              <div className="space-y-3">
                <Tabs value={String(activeStop)} onValueChange={(v) => setActiveStop(Number(v))} variant="segment">
                  <div className="flex flex-wrap items-center gap-2">
                    <TabsList>
                      {destinations.map((_, idx) => (
                        <TabsTrigger key={destinations[idx].id} value={String(idx)}>
                          Stop {idx + 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <button
                      type="button"
                      onClick={handleAddDest}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>

                  {destinations.map((dest, idx) => (
                    <TabsContent key={dest.id} value={String(idx)}>
                      <div className="space-y-3 rounded-2xl bg-info-soft py-5 px-4 border">
                        {destinations.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeDest(dest.id)}
                            aria-label={`Remove stop ${idx + 1}`}
                            className="absolute right-3 top-3 text-white/70 transition-colors hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                        <div className="space-y-3">
                          {tripType === 'local' ? (
                            <>
                              <Input
                                aria-label="City"
                                placeholder="City"
                                className={stopFieldClass}
                                value={dest.city}
                                onChange={(e) => updateDest(dest.id, 'city', e.target.value)}
                              />
                              <Input
                                aria-label="Province"
                                placeholder="Province"
                                className={stopFieldClass}
                                value={dest.province || ''}
                                onChange={(e) => updateDest(dest.id, 'province', e.target.value)}
                              />
                            </>
                          ) : (
                            <>
                              <Input
                                aria-label="City"
                                placeholder="City"
                                className={stopFieldClass}
                                value={dest.city}
                                onChange={(e) => updateDest(dest.id, 'city', e.target.value)}
                              />
                              <Input
                                aria-label="Country"
                                placeholder="Country"
                                className={stopFieldClass}
                                value={dest.country}
                                onChange={(e) => updateDest(dest.id, 'country', e.target.value)}
                              />
                            </>
                          )}
                          <div>
                            <p className="mb-1.5 px-1 text-xs font-medium text-white/80">Dates (optional)</p>
                            <DateRangePicker
                              aria-label="Stop dates"
                              placeholder="Date From – Date To"
                              from={dest.dateFrom || ''}
                              to={dest.dateTo || ''}
                              min={startDate}
                              onChange={({ from, to }) => {
                                updateDest(dest.id, 'dateFrom', from ?? '');
                                updateDest(dest.id, 'dateTo', to ?? '');
                              }}
                              onOpenChange={setStopDatesOpen}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className={cn('flex gap-3 pt-2', stopDatesOpen && 'invisible')}>
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="h-[48px] flex-1 rounded-full"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || destinations.every((d) => !d.city)}
                    className="h-[48px] flex-1 rounded-full bg-accent-500 text-white hover:bg-accent-600"
                  >
                    {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Trip'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remainingCredits={
          subscription ? Math.max(0, PLAN_LIMITS[subscription.plan].monthlyCredits - subscription.creditsUsed) : 0
        }
        planName={subscription?.plan || 'starter'}
      />

      <NoTravelGroupModal isOpen={showNoTravelGroupModal} onClose={() => router.push('/dashboard')} />
    </div>
  );
}
