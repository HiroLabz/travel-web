'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/motion/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/motion/select';
import { RoutePlannerPlaceInput } from '@/components/route-planner-place-input';
import { RoutePlannerResultsView } from '@/components/route-planner-results';
import {
  MapPin,
  Hotel,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Route,
  ArrowDownUp,
  Clock,
  Navigation,
  Pencil,
  Check,
  X,
  Ticket,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculateOptimizedRouteAction, saveWizardItemAction } from '@/lib/actions';
import type {
  WizardItineraryItem,
  Household,
  Destination,
  RoutePlannerPlace,
  RoutePlannerResults,
  RoutePlannerResultItem,
  ExchangeRateCache,
  RoutePlannerPlaceCategory,
} from '@/types';
import { ROUTE_PLANNER_CATEGORY_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { getDefaultCurrencyForCountry, getCountryCodeFromName, getCurrencySymbol } from '@/lib/constants';

interface RoutePlannerFormProps {
  tripId: string;
  wizardItems: WizardItineraryItem[];
  tripDestinations: Destination[];
  household: Household;
  exchangeRates?: ExchangeRateCache;
  onClose?: () => void;
  isMobilePage?: boolean;
}

type Step = 'input' | 'results';

export function RoutePlannerForm({
  tripId,
  wizardItems,
  tripDestinations,
  household,
  exchangeRates,
  onClose,
  isMobilePage = false,
}: RoutePlannerFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [step, setStep] = useState<Step>('input');
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [places, setPlaces] = useState<RoutePlannerPlace[]>([]);
  const [sortStrategy, setSortStrategy] = useState<'nearest' | 'farthest'>('nearest');
  const [startTime, setStartTime] = useState('09:00');
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<RoutePlannerResults | null>(null);
  const [isAddingAll, setIsAddingAll] = useState(false);

  // Edit state
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState(60);
  const [editCategory, setEditCategory] = useState<RoutePlannerPlaceCategory>('attraction');
  const [editEntranceFee, setEditEntranceFee] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');

  // Filter accommodations from wizard items
  const accommodations = useMemo(
    () => wizardItems.filter((item) => item.travelType === 'accommodation'),
    [wizardItems]
  );

  // Get proximity from selected hotel for place search bias
  const selectedHotel = useMemo(
    () => accommodations.find((a) => a.id === selectedHotelId),
    [accommodations, selectedHotelId]
  );

  // Get proximity from first destination for place search
  const proximity = useMemo(() => {
    // Could geocode the destination, but for now return undefined
    // The place search will work without proximity, just less biased
    return undefined;
  }, [tripDestinations]);

  // Get home currency
  const homeCurrency = household?.currency || 'USD';

  // Get available currencies (home + all destinations)
  const availableCurrencies = useMemo(() => {
    const currencies = new Set([homeCurrency]); // Home currency first

    // Add currencies from all trip destinations
    tripDestinations.forEach((dest) => {
      const countryCode = getCountryCodeFromName(dest.country);
      if (countryCode) {
        const destCurrency = getDefaultCurrencyForCountry(countryCode);
        currencies.add(destCurrency);
      }
    });

    return Array.from(currencies);
  }, [homeCurrency, tripDestinations]);

  // Get destination currency based on the first destination country (default for new places)
  const destinationCurrency = useMemo(() => {
    if (tripDestinations.length > 0) {
      const firstDestination = tripDestinations[0];
      const countryCode = getCountryCodeFromName(firstDestination.country);
      if (countryCode) {
        return getDefaultCurrencyForCountry(countryCode);
      }
    }
    // Fallback to household currency
    return homeCurrency;
  }, [tripDestinations, homeCurrency]);

  // Get already added place IDs
  const alreadyAddedIds = useMemo(
    () => new Set(places.filter((p) => p.existingActivityId).map((p) => p.existingActivityId!)),
    [places]
  );

  const handleAddPlace = (place: RoutePlannerPlace) => {
    setPlaces((prev) => [...prev, place]);
    setIsAddingPlace(false);
  };

  const handleRemovePlace = (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  const handleStartEdit = (place: RoutePlannerPlace) => {
    setEditingPlaceId(place.id);
    setEditDuration(place.visitDuration);
    setEditCategory(place.category || 'attraction');
    setEditEntranceFee(place.entranceFee?.toString() || '');
    setEditCurrency(place.currency || destinationCurrency);
  };

  const handleCancelEdit = () => {
    setEditingPlaceId(null);
  };

  const handleSaveEdit = (placeId: string) => {
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === placeId
          ? {
              ...p,
              visitDuration: editDuration,
              category: editCategory,
              entranceFee: editEntranceFee ? parseFloat(editEntranceFee) : undefined,
              currency: editEntranceFee ? editCurrency : undefined,
            }
          : p
      )
    );
    setEditingPlaceId(null);
  };

  const handleCalculateRoute = async () => {
    if (!selectedHotelId || places.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please select a hotel and add at least one place to visit.',
        variant: 'destructive',
      });
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculateOptimizedRouteAction(
        tripId,
        selectedHotelId,
        places,
        sortStrategy,
        startTime
      );

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      if (result.results) {
        setResults(result.results);
        setStep('results');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to calculate route. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReorder = (newItems: RoutePlannerResultItem[]) => {
    if (results) {
      setResults({
        ...results,
        items: newItems,
        sortStrategy: 'manual',
      });
    }
  };

  const handleAddToItinerary = (item: RoutePlannerResultItem) => {
    // Navigate to new activity page with prefilled data
    const params = new URLSearchParams({
      prefillName: item.place.name,
      prefillAddress: item.place.address,
    });

    if (item.estimatedArrival) {
      params.set('prefillTimeFrom', item.estimatedArrival);
    }
    if (item.estimatedDeparture) {
      params.set('prefillTimeTo', item.estimatedDeparture);
    }

    router.push(`/trip/${tripId}/activity/new?${params.toString()}`);
  };

  const handleAddAllToItinerary = async () => {
    if (!results || results.items.length === 0) return;

    setIsAddingAll(true);

    try {
      // Determine the date to use for the activities
      // Use the first destination's start date, or today's date as fallback
      const activityDate =
        tripDestinations[0]?.startDate || new Date().toISOString().split('T')[0];

      // Get the highest existing order to append new items after
      const maxExistingOrder = wizardItems.reduce(
        (max, item) => Math.max(max, item.order || 0),
        0
      );

      let successCount = 0;
      let errorCount = 0;

      // Save each item to the itinerary
      for (let i = 0; i < results.items.length; i++) {
        const item = results.items[i];

        const wizardItem: Omit<WizardItineraryItem, 'id' | 'createdAt'> = {
          tripId,
          placeName: item.place.name,
          address: item.place.address,
          dateFrom: activityDate,
          dateTo: activityDate,
          timeFrom: item.estimatedArrival || startTime,
          timeTo: item.estimatedDeparture || startTime,
          description: `Added from Route Planner - ${ROUTE_PLANNER_CATEGORY_LABELS[item.place.category || 'attraction']}`,
          order: maxExistingOrder + i + 1,
          estimatedCost: item.place.entranceFee,
          currency: item.place.currency,
          travelType: 'activity',
        };

        const result = await saveWizardItemAction(tripId, wizardItem);

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to save ${item.place.name}:`, result.error);
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Added to itinerary',
          description: `Successfully added ${successCount} place${successCount > 1 ? 's' : ''} to your itinerary.`,
        });

        // Close the dialog/navigate back after success
        if (onClose) {
          onClose();
        } else if (isMobilePage) {
          router.push(`/trip/${tripId}?tab=itinerary`);
        }
      }

      if (errorCount > 0) {
        toast({
          title: 'Some items failed',
          description: `Failed to add ${errorCount} place${errorCount > 1 ? 's' : ''}. Please try adding them manually.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to add items to itinerary:', error);
      toast({
        title: 'Error',
        description: 'Failed to add items to itinerary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingAll(false);
    }
  };

  const handleBack = () => {
    setStep('input');
  };

  // Render input step
  if (step === 'input') {
    return (
      <div className={cn('space-y-5', isMobilePage && 'pb-24')}>
        {/* Hotel Selection */}
        <div className="space-y-2">
          <Label htmlFor="hotel-select" className="flex items-center gap-2">
            <Hotel className="w-4 h-4 text-amber-500" />
            Starting Hotel
          </Label>
          {accommodations.length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
              <Hotel className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <p className="text-sm text-amber-700">
                No accommodations found in your itinerary.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Add a hotel or accommodation first to use the route planner.
              </p>
            </div>
          ) : (
            <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
              <SelectTrigger id="hotel-select">
                <SelectValue placeholder="Select your hotel..." />
              </SelectTrigger>
              <SelectContent>
                {accommodations.map((hotel) => (
                  <SelectItem key={hotel.id} value={hotel.id}>
                    <div className="flex items-center gap-2">
                      <Hotel className="w-4 h-4 text-amber-500" />
                      <span>{hotel.placeName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Places to Visit */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            Places to Visit
          </Label>

          {places.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-center">
              <Navigation className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">No places added yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Add places you want to visit to plan your route.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {places.map((place, index) => (
                <div
                  key={place.id}
                  className={cn(
                    'bg-white rounded-lg border border-slate-200 overflow-hidden',
                    editingPlaceId === place.id && 'ring-2 ring-blue-500'
                  )}
                >
                  {editingPlaceId === place.id ? (
                    /* Edit Mode */
                    <div className="p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-800 truncate">
                            {place.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{place.address}</p>
                        </div>
                      </div>

                      {/* Edit Fields */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Duration */}
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Duration</Label>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={15}
                              max={480}
                              step={15}
                              value={editDuration}
                              onChange={(e) => setEditDuration(parseInt(e.target.value) || 60)}
                              className="h-8 text-sm"
                            />
                            <span className="text-xs text-slate-400">min</span>
                          </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Category</Label>
                          <Select value={editCategory} onValueChange={(v) => setEditCategory(v as RoutePlannerPlaceCategory)}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROUTE_PLANNER_CATEGORY_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Entrance Fee */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          Entrance Fee
                        </Label>
                        <div className="flex items-center gap-2">
                          <Select value={editCurrency} onValueChange={setEditCurrency}>
                            <SelectTrigger className="w-24 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCurrencies.map((curr) => (
                                <SelectItem key={curr} value={curr}>
                                  {getCurrencySymbol(curr)} {curr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={editEntranceFee}
                            onChange={(e) => setEditEntranceFee(e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-7"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(place.id)}
                          className="h-7"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">
                          {place.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="truncate">{place.address}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {place.visitDuration}m
                          </span>
                          {place.category && (
                            <span>{ROUTE_PLANNER_CATEGORY_LABELS[place.category]}</span>
                          )}
                          {place.entranceFee !== undefined && place.entranceFee > 0 && (
                            <span className="flex items-center gap-1 text-purple-500">
                              <Ticket className="w-3 h-3" />
                              {getCurrencySymbol(place.currency || 'USD')}{place.entranceFee.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 text-slate-400 hover:text-blue-500"
                        onClick={() => handleStartEdit(place)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 text-slate-400 hover:text-red-500"
                        onClick={() => handleRemovePlace(place.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add place button or input */}
          {isAddingPlace ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <RoutePlannerPlaceInput
                existingActivities={wizardItems}
                proximity={proximity}
                onAddPlace={handleAddPlace}
                onClose={() => setIsAddingPlace(false)}
                alreadyAddedIds={alreadyAddedIds}
                defaultCurrency={destinationCurrency}
                availableCurrencies={availableCurrencies}
                homeCurrency={homeCurrency}
              />
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingPlace(true)}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Place
            </Button>
          )}
        </div>

        {/* Options */}
        <div className={cn('grid gap-4', isMobilePage ? 'grid-cols-1' : 'grid-cols-2')}>
          <div className="space-y-2">
            <Label htmlFor="start-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Start Time
            </Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort-strategy" className="flex items-center gap-2">
              <ArrowDownUp className="w-4 h-4 text-slate-500" />
              Sort Strategy
            </Label>
            <Select value={sortStrategy} onValueChange={(v) => setSortStrategy(v as 'nearest' | 'farthest')}>
              <SelectTrigger id="sort-strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">Nearest First</SelectItem>
                <SelectItem value="farthest">Farthest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calculate button */}
        {!isMobilePage && (
          <div className="flex gap-2 pt-2">
            {onClose && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            )}
            <Button
              onClick={handleCalculateRoute}
              disabled={!selectedHotelId || places.length === 0 || isCalculating}
              className={cn(
                'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
                onClose ? 'flex-1' : 'w-full'
              )}
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Route className="w-4 h-4 mr-2" />
                  Calculate Route
                </>
              )}
            </Button>
          </div>
        )}

        {/* Mobile fixed footer */}
        {isMobilePage && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex gap-3 z-50">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCalculateRoute}
              disabled={!selectedHotelId || places.length === 0 || isCalculating}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {isCalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Route className="w-4 h-4 mr-2" />
                  Calculate
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Render results step
  return (
    <div>
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Edit
      </Button>

      {results && (
        <RoutePlannerResultsView
          results={results}
          household={household}
          exchangeRates={exchangeRates}
          onReorder={handleReorder}
          onAddToItinerary={handleAddToItinerary}
          onAddAllToItinerary={handleAddAllToItinerary}
          isMobilePage={isMobilePage}
          isAddingAll={isAddingAll}
          tripId={tripId}
          mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        />
      )}

      {/* Mobile fixed footer for results */}
      {isMobilePage && results && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50">
          <Button
            onClick={handleAddAllToItinerary}
            disabled={isAddingAll}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isAddingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding to Itinerary...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add All to Itinerary
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
