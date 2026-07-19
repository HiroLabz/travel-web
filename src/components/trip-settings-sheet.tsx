'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Trip, Household, DestinationCurrency, ExchangeRateCache } from '@/types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/motion/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/motion/tabs';
import { Input } from '@/components/motion/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/motion/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CURRENCIES, getDefaultCurrencyForCountry, getCountryCodeFromName, formatCurrency } from '@/lib/constants';
import { isCacheValid, formatExchangeRate, getCacheAge } from '@/lib/exchange-rates';
import {
  updateTripSettingsAction,
  fetchAndCacheExchangeRatesAction,
  archiveTripAction,
  deleteTripAction,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Settings2,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Archive,
  Trash2,
  Loader2,
  Check,
  Info,
  CloudDownload,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TripOfflineToggle } from '@/components/trip-offline-toggle';

interface TripSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  household: Household;
  onTripUpdate: (updates: Partial<Trip>) => void;
}

export function TripSettingsSheet({
  open,
  onOpenChange,
  trip,
  household,
  onTripUpdate,
}: TripSettingsSheetProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [destinationCurrencies, setDestinationCurrencies] = useState<DestinationCurrency[]>(
    trip.destinationCurrencies || []
  );
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateCache | undefined>(
    trip.exchangeRates
  );

  // Loading states
  const [saving, setSaving] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  const homeCurrency = household.currency || 'USD';

  // Initialize destination currencies from trip destinations
  useEffect(() => {
    if (trip.destinationCurrencies && trip.destinationCurrencies.length > 0) {
      setDestinationCurrencies(trip.destinationCurrencies);
    } else if (trip.destinations && trip.destinations.length > 0) {
      // Auto-generate from destinations
      const currencies = trip.destinations.map((dest) => {
        const countryCode = getCountryCodeFromName(dest.country);
        const currency = countryCode
          ? getDefaultCurrencyForCountry(countryCode)
          : 'USD';
        return {
          city: dest.city,
          country: dest.country,
          currency,
        };
      });
      setDestinationCurrencies(currencies);
    }
  }, [trip.destinationCurrencies, trip.destinations]);

  // Update exchange rates from trip
  useEffect(() => {
    setExchangeRates(trip.exchangeRates);
  }, [trip.exchangeRates]);

  // Handle currency change for a destination
  const handleCurrencyChange = (index: number, currency: string) => {
    const updated = [...destinationCurrencies];
    updated[index] = { ...updated[index], currency };
    setDestinationCurrencies(updated);
    setHasChanges(true);
  };

  // Fetch exchange rates
  const handleFetchRates = async () => {
    setFetchingRates(true);
    try {
      const targetCurrencies = [
        homeCurrency,
        ...destinationCurrencies.map((dc) => dc.currency),
      ].filter((c, i, arr) => arr.indexOf(c) === i); // unique

      const result = await fetchAndCacheExchangeRatesAction(
        trip.id,
        homeCurrency,
        targetCurrencies
      );

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.rates) {
        setExchangeRates(result.rates);
        onTripUpdate({ exchangeRates: result.rates });
        toast({
          title: 'Exchange rates updated',
          description: 'Latest rates have been fetched and saved.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch exchange rates.',
        variant: 'destructive',
      });
    } finally {
      setFetchingRates(false);
    }
  };

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateTripSettingsAction(trip.id, {
        title,
        startDate,
        endDate,
        destinationCurrencies,
      });

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        onTripUpdate({
          title,
          startDate,
          endDate,
          destinationCurrencies,
        });
        setHasChanges(false);
        toast({
          title: 'Settings saved',
          description: 'Trip settings have been updated.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Archive trip
  const handleArchive = async () => {
    setArchiving(true);
    try {
      const result = await archiveTripAction(trip.id);

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        onTripUpdate({ archived: !trip.archived });
        toast({
          title: trip.archived ? 'Trip unarchived' : 'Trip archived',
          description: trip.archived
            ? 'Trip has been restored.'
            : 'Trip has been archived.',
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive trip.',
        variant: 'destructive',
      });
    } finally {
      setArchiving(false);
    }
  };

  // Delete trip
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteTripAction(trip.id);

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Trip deleted',
          description: 'Trip has been permanently deleted.',
        });
        onOpenChange(false);
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete trip.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Get unique currencies for rate display
  const uniqueCurrencies = destinationCurrencies
    .map((dc) => dc.currency)
    .filter((c, i, arr) => arr.indexOf(c) === i && c !== homeCurrency);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="right" ariaLabel="Trip Settings">
      <DrawerContent className="w-full sm:max-w-lg">
        <DrawerClose />
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Trip Settings
          </DrawerTitle>
          <DrawerDescription>
            Manage trip details, currencies, and more.
          </DrawerDescription>
        </DrawerHeader>

        <Tabs defaultValue="general" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="text-xs sm:text-sm">
              General
            </TabsTrigger>
            <TabsTrigger value="offline" className="text-xs sm:text-sm">
              Offline
            </TabsTrigger>
            <TabsTrigger value="currency" className="text-xs sm:text-sm">
              Currency
            </TabsTrigger>
            <TabsTrigger value="danger" className="text-xs sm:text-sm">
              Danger
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Trip Name</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Enter trip name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setHasChanges(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setHasChanges(true);
                  }}
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="w-full mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </TabsContent>

          {/* Offline Tab */}
          <TabsContent value="offline" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-600">
                <CloudDownload className="h-5 w-5" />
                <h3 className="font-medium">Offline Access</h3>
              </div>
              <p className="text-sm text-slate-500">
                Enable offline mode to access this trip&apos;s documents and data without an internet connection.
                All files will be downloaded and stored on your device.
              </p>
              <TripOfflineToggle tripId={trip.id} tripName={trip.title} />
            </div>
          </TabsContent>

          {/* Currency Tab */}
          <TabsContent value="currency" className="space-y-4 mt-4">
            {/* Home Currency Display */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Home Currency
                  </p>
                  <p className="text-lg font-semibold">{homeCurrency}</p>
                </div>
                <DollarSign className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Set in household settings
              </p>
            </div>

            {/* Destination Currencies */}
            {destinationCurrencies.length > 0 && (
              <div className="space-y-3">
                <Label>Destination Currencies</Label>
                {destinationCurrencies.map((dc, index) => (
                  <div
                    key={`${dc.city}-${dc.country}-${index}`}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{dc.city}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {dc.country}
                      </p>
                    </div>
                    <Select
                      value={dc.currency}
                      onValueChange={(value) => handleCurrencyChange(index, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {destinationCurrencies.length === 0 && (
              <div className="p-4 text-center text-slate-500 border border-dashed rounded-lg">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No destinations configured</p>
                <p className="text-xs mt-1">
                  Add destinations to your trip to set currencies
                </p>
              </div>
            )}

            {/* Exchange Rates */}
            {uniqueCurrencies.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Exchange Rates</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFetchRates}
                    disabled={fetchingRates}
                  >
                    {fetchingRates ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                  </Button>
                </div>

                {exchangeRates && isCacheValid(exchangeRates) ? (
                  <div className="space-y-2">
                    {uniqueCurrencies.map((currency) => {
                      const rateInfo = exchangeRates.rates[currency];
                      if (!rateInfo) return null;
                      return (
                        <div
                          key={currency}
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded"
                        >
                          <span className="text-sm">
                            {formatExchangeRate(homeCurrency, currency, rateInfo.rate)}
                          </span>
                        </div>
                      );
                    })}
                    <p className="text-xs text-slate-500">
                      Last updated: {getCacheAge(exchangeRates)}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 text-center border border-dashed rounded-lg">
                    <p className="text-sm text-slate-500">
                      No exchange rates cached
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleFetchRates}
                      disabled={fetchingRates}
                      className="mt-1"
                    >
                      Click to fetch rates
                    </Button>
                  </div>
                )}

                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Rates from Open Exchange Rates. Updated daily.
                </p>
              </div>
            )}

            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Currency Settings
                  </>
                )}
              </Button>
            )}
          </TabsContent>

          {/* Danger Tab */}
          <TabsContent value="danger" className="space-y-4 mt-4">
            <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Archive className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">
                    {trip.archived ? 'Unarchive Trip' : 'Archive Trip'}
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {trip.archived
                      ? 'Restore this trip to your active trips list.'
                      : 'Move this trip to your archives. You can restore it later.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchive}
                    disabled={archiving}
                    className="mt-3"
                  >
                    {archiving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="mr-2 h-4 w-4" />
                    )}
                    {trip.archived ? 'Unarchive' : 'Archive'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    Delete Trip
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Permanently delete this trip and all associated data. This
                    action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-3"
                        disabled={deleting}
                      >
                        {deleting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete Trip
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Trip?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{trip.title}&quot; and all
                          associated data including itinerary items, documents,
                          and expenses. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Forever
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
