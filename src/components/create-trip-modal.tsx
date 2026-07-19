'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useState, useEffect, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createTripAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/motion/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { differenceInCalendarDays } from 'date-fns';
import type { TripType } from '@/types';
import { PLAN_LIMITS } from '@/types';
import { COUNTRIES } from '@/lib/constants';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import { NoTravelGroupModal } from '@/components/no-travel-group-modal';

type Destination = {
  id: string;
  city: string;
  country: string;
  province?: string;
  dateFrom?: string;
  dateTo?: string;
};

interface CreateTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Desktop-only dialog content styled with the transitions.dev open/close
// choreography (scale 0.96 -> 1, opacity fade, 250ms open / 150ms close,
// cubic-bezier(0.22,1,0.36,1) — see .create-trip-modal-content in globals.css).
// Deliberately not routed through the shared DialogContent, so the other
// Dialog consumers in the app keep their existing zoom/slide animation.
const DesktopModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`create-trip-modal-content fixed left-[50%] top-[50%] z-50 w-full max-w-lg rounded-2xl bg-card shadow-xl overflow-hidden ${className ?? ''}`}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DesktopModalContent.displayName = 'DesktopModalContent';

// Mobile bottom-sheet shell — same Radix Dialog root as desktop (Sheet in this
// app is the same @radix-ui/react-dialog primitive under a different theme),
// built directly here (rather than the shared SheetContent) so there's a
// single close button in the wizard's own header instead of two.
const MobileSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`fixed z-50 inset-x-0 bottom-0 h-[92vh] flex flex-col rounded-t-2xl border-t border-border bg-card shadow-xl overflow-hidden transition ease-in-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom ${className ?? ''}`}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
MobileSheetContent.displayName = 'MobileSheetContent';

export function CreateTripModal({ open, onOpenChange }: CreateTripModalProps) {
  const router = useRouter();
  const { user, household, subscription, refreshSubscription, userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showNoTravelGroupModal, setShowNoTravelGroupModal] = useState(false);

  // Only prompt for a travel group when the user is actively trying to
  // create a trip, not just because this component is mounted on the dashboard.
  useEffect(() => {
    if (open && userProfile && (!userProfile.householdIds || userProfile.householdIds.length === 0)) {
      setShowNoTravelGroupModal(true);
    }
  }, [open, userProfile]);

  const initialState = { message: '', errors: {}, tripId: null as null };
  const [state, formAction, isPending] = useActionState(createTripAction, initialState);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [tripType, setTripType] = useState<TripType>('international');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.value === code);
    return country?.label || '';
  };

  const getInitialDestination = (): Destination => ({
    id: Math.random().toString(),
    city: '',
    country: '',
    province: ''
  });

  const [destinations, setDestinations] = useState<Destination[]>([getInitialDestination()]);
  const [hasSetOrigin, setHasSetOrigin] = useState(false);

  useEffect(() => {
    if (household && !hasSetOrigin) {
      const countryName = household.countryOfOrigin ? getCountryName(household.countryOfOrigin) : '';
      setDestinations([{
        id: Math.random().toString(),
        city: household.cityOfOrigin || '',
        country: countryName,
        province: ''
      }]);
      setHasSetOrigin(true);
    }
  }, [household, hasSetOrigin]);

  const handleAddDest = () => {
    setDestinations([...destinations, { id: Math.random().toString(), city: '', country: '', province: '' }]);
  };

  const updateDest = (id: string, field: keyof Omit<Destination, 'id'>, value: string) => {
    setDestinations(destinations.map(d => {
      if (d.id !== id) return d;
      const updated = { ...d, [field]: value };
      if (field === 'dateFrom' && d.dateTo && value > d.dateTo) {
        updated.dateTo = '';
      }
      return updated;
    }));
  };

  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    if (type === 'international' && household) {
      const countryName = household.countryOfOrigin ? getCountryName(household.countryOfOrigin) : '';
      setDestinations([{
        id: Math.random().toString(),
        city: household.cityOfOrigin || '',
        country: countryName,
        province: ''
      }]);
    } else {
      setDestinations([{ id: Math.random().toString(), city: '', country: '', province: '' }]);
    }
  };

  const removeDest = (id: string) => {
    if (destinations.length > 1) {
      setDestinations(destinations.filter(d => d.id !== id));
    }
  };

  const filteredDestinations = destinations.filter(d => d.city);
  const destinationString = filteredDestinations.map(d =>
    tripType === 'local'
      ? `${d.city}, ${d.province || ''}`
      : `${d.city}, ${d.country}`
  ).join(';');

  let days = 0;
  if (startDate && endDate) {
    days = differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1;
  }

  useEffect(() => {
    const handleStateChange = async () => {
      await refreshSubscription();

      if ('creditError' in state && state.creditError) {
        setShowUpgradeModal(true);
        return;
      }

      if ('tripId' in state && state.tripId) {
        onOpenChange(false);
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

  const wizard = (
    <>
      <div className="bg-muted px-6 py-4 flex justify-between items-center border-b border-border">
        <h2 className="font-bold text-lg text-foreground">Plan New Trip</h2>
        <DialogPrimitive.Close asChild>
          <button className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </DialogPrimitive.Close>
      </div>

      <form action={formAction} className="p-6">
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="tripType" value={tripType} />
        <input type="hidden" name="startDate" value={startDate ? new Date(startDate).toISOString() : ''} />
        <input type="hidden" name="endDate" value={endDate ? new Date(endDate).toISOString() : ''} />
        <input type="hidden" name="destination" value={destinationString || 'TBD'} />
        <input type="hidden" name="vibe" value="adventurous" />
        <input type="hidden" name="days" value={days > 0 ? String(days) : '1'} />
        <input type="hidden" name="householdId" value={household?.id || ''} />
        <input type="hidden" name="userId" value={user?.uid || ''} />
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <Label htmlFor="trip-name" className="block text-sm font-medium text-foreground mb-1">Trip Name</Label>
              <Input
                id="trip-name"
                type="text"
                placeholder="e.g. Summer in Italy"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">Trip Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTripTypeChange('local')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    tripType === 'local'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  }`}
                >
                  Local
                </button>
                <button
                  type="button"
                  onClick={() => handleTripTypeChange('international')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    tripType === 'international'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  }`}
                >
                  International
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="block text-sm font-medium text-foreground mb-1">Overall Start</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={e => {
                    const newStart = e.target.value;
                    setStartDate(newStart);
                    if (endDate && newStart && endDate < newStart) {
                      setEndDate('');
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="block text-sm font-medium text-foreground mb-1">Overall End</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!title || !startDate}
              className="w-full mt-4"
            >
              Next: Destinations
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-sm text-muted-foreground mb-4">
              Add the {tripType === 'local' ? 'places' : 'cities'} you plan to visit.
            </p>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {destinations.map((dest, idx) => (
                <div key={dest.id} className="relative bg-muted p-4 rounded-xl border border-border">
                  <span className="absolute top-2 left-2 text-xs font-bold text-muted-foreground bg-card px-2 py-0.5 rounded-full border border-border">Stop {idx + 1}</span>
                  <button type="button" onClick={() => removeDest(dest.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {tripType === 'local' ? (
                      <>
                        <div className="col-span-2 sm:col-span-1">
                          <Label htmlFor={`city-${dest.id}`} className="block text-xs font-medium text-muted-foreground mb-1">City</Label>
                          <Input
                            id={`city-${dest.id}`}
                            type="text"
                            placeholder="Tagaytay"
                            value={dest.city}
                            onChange={e => updateDest(dest.id, 'city', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Label htmlFor={`province-${dest.id}`} className="block text-xs font-medium text-muted-foreground mb-1">Province</Label>
                          <Input
                            id={`province-${dest.id}`}
                            type="text"
                            placeholder="Cavite"
                            value={dest.province || ''}
                            onChange={e => updateDest(dest.id, 'province', e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-2 sm:col-span-1">
                          <Label htmlFor={`city-${dest.id}`} className="block text-xs font-medium text-muted-foreground mb-1">City</Label>
                          <Input
                            id={`city-${dest.id}`}
                            type="text"
                            placeholder="Paris"
                            value={dest.city}
                            onChange={e => updateDest(dest.id, 'city', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Label htmlFor={`country-${dest.id}`} className="block text-xs font-medium text-muted-foreground mb-1">Country</Label>
                          <Input
                            id={`country-${dest.id}`}
                            type="text"
                            placeholder="France"
                            value={dest.country}
                            onChange={e => updateDest(dest.id, 'country', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor={`date-from-${dest.id}`} className="block text-xs font-medium text-muted-foreground mb-1">Date From (optional)</Label>
                      <Input
                        id={`date-from-${dest.id}`}
                        type="date"
                        value={dest.dateFrom || ''}
                        min={startDate}
                        onChange={e => updateDest(dest.id, 'dateFrom', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor={`date-to-${dest.id}`} className="block text-xs font-medium text-muted-foreground mb-1">Date To (optional)</Label>
                      <Input
                        id={`date-to-${dest.id}`}
                        type="date"
                        value={dest.dateTo || ''}
                        min={dest.dateFrom || startDate}
                        onChange={e => updateDest(dest.id, 'dateTo', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" onClick={handleAddDest} variant="outline" className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-1" /> Add another destination
            </Button>

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isPending || destinations.every(d => !d.city)}
                className="flex-1"
              >
                {isPending ? <Loader2 className="animate-spin" /> : 'Create Trip'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {isMobile ? (
          <MobileSheetContent>
            <div className="overflow-y-auto flex-1">{wizard}</div>
          </MobileSheetContent>
        ) : (
          <DesktopModalContent>{wizard}</DesktopModalContent>
        )}
      </Dialog>

      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remainingCredits={subscription ? Math.max(0, PLAN_LIMITS[subscription.plan].monthlyCredits - subscription.creditsUsed) : 0}
        planName={subscription?.plan || 'starter'}
      />

      <NoTravelGroupModal
        isOpen={showNoTravelGroupModal}
        onClose={() => {
          setShowNoTravelGroupModal(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
