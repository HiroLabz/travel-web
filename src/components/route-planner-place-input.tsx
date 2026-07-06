'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlaceAutocomplete } from '@/components/place-autocomplete';
import {
  MapPin,
  Clock,
  Plus,
  Ticket,
  Tag,
  Landmark,
  UtensilsCrossed,
  Coffee,
  ShoppingBag,
  Palette,
  TreePine,
  Clapperboard,
  Search,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import type {
  WizardItineraryItem,
  GeoLocation,
  RoutePlannerPlace,
  RoutePlannerPlaceCategory,
} from '@/types';
import { ROUTE_PLANNER_CATEGORY_LABELS } from '@/types';
import { getCurrencySymbol } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Map category to lucide icon components
const CATEGORY_ICON_COMPONENTS: Record<RoutePlannerPlaceCategory, React.ComponentType<{ className?: string }>> = {
  attraction: Landmark,
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  shopping: ShoppingBag,
  museum: Palette,
  park: TreePine,
  entertainment: Clapperboard,
  other: MapPin,
};

interface RoutePlannerPlaceInputProps {
  existingActivities: WizardItineraryItem[];
  proximity?: { lat: number; lng: number };
  onAddPlace: (place: RoutePlannerPlace) => void;
  onClose: () => void;
  alreadyAddedIds?: Set<string>;
  defaultCurrency?: string;
  availableCurrencies?: string[];
  homeCurrency?: string;
}

export function RoutePlannerPlaceInput({
  existingActivities,
  proximity,
  onAddPlace,
  onClose,
  alreadyAddedIds = new Set(),
  defaultCurrency = 'USD',
  availableCurrencies = ['USD'],
  homeCurrency = 'USD',
}: RoutePlannerPlaceInputProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');

  // New place state
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeLocation, setPlaceLocation] = useState<GeoLocation | undefined>();
  const [visitDuration, setVisitDuration] = useState(60);
  const [category, setCategory] = useState<RoutePlannerPlaceCategory>('attraction');
  const [entranceFee, setEntranceFee] = useState<string>('');
  const [currency, setCurrency] = useState(defaultCurrency);

  // From Itinerary state - multi-select, search, date filter
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());
  const [activitySearch, setActivitySearch] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Filter existing activities to exclude accommodations, transport, and already added
  const selectableActivities = existingActivities.filter(
    (item) =>
      (item.travelType === 'activity' || !item.travelType) &&
      !alreadyAddedIds.has(item.id)
  );

  // Get unique dates from activities for the date filter
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    selectableActivities.forEach((activity) => {
      if (activity.dateFrom) {
        dates.add(activity.dateFrom);
      }
    });
    return Array.from(dates).sort();
  }, [selectableActivities]);

  // Filter activities by search and date
  const filteredActivities = useMemo(() => {
    return selectableActivities.filter((activity) => {
      // Search filter
      const matchesSearch = activitySearch === '' ||
        activity.placeName.toLowerCase().includes(activitySearch.toLowerCase()) ||
        (activity.address && activity.address.toLowerCase().includes(activitySearch.toLowerCase()));

      // Date filter
      const matchesDate = dateFilter === 'all' || activity.dateFrom === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [selectableActivities, activitySearch, dateFilter]);

  // Check if all filtered activities are selected
  const allFilteredSelected = filteredActivities.length > 0 &&
    filteredActivities.every((a) => selectedActivityIds.has(a.id));

  // Toggle single activity selection
  const toggleActivitySelection = (activityId: string) => {
    setSelectedActivityIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedActivityIds((prev) => {
        const newSet = new Set(prev);
        filteredActivities.forEach((a) => newSet.delete(a.id));
        return newSet;
      });
    } else {
      // Select all filtered
      setSelectedActivityIds((prev) => {
        const newSet = new Set(prev);
        filteredActivities.forEach((a) => newSet.add(a.id));
        return newSet;
      });
    }
  };

  // Add all selected activities
  const handleAddSelectedActivities = () => {
    const selectedActivities = selectableActivities.filter((a) => selectedActivityIds.has(a.id));
    selectedActivities.forEach((activity) => {
      onAddPlace({
        id: `existing_${activity.id}`,
        name: activity.placeName,
        address: activity.address || '',
        visitDuration: 60,
        isExistingActivity: true,
        existingActivityId: activity.id,
        category: 'attraction',
        entranceFee: activity.estimatedCost,
        currency: activity.currency,
      });
    });
    setSelectedActivityIds(new Set());
    onClose();
  };

  const handleSelectPlace = (place: {
    name: string;
    address: string;
    location?: GeoLocation;
  }) => {
    setPlaceName(place.name);
    setPlaceAddress(place.address);
    setPlaceLocation(place.location);

    // Auto-detect category from place name
    const lowerName = place.name.toLowerCase();
    if (
      lowerName.includes('restaurant') ||
      lowerName.includes('grill') ||
      lowerName.includes('bistro') ||
      lowerName.includes('diner')
    ) {
      setCategory('restaurant');
      setVisitDuration(90); // Default 90 min for restaurants
    } else if (
      lowerName.includes('cafe') ||
      lowerName.includes('café') ||
      lowerName.includes('coffee') ||
      lowerName.includes('bakery')
    ) {
      setCategory('cafe');
      setVisitDuration(45); // Default 45 min for cafes
    } else if (
      lowerName.includes('museum') ||
      lowerName.includes('gallery')
    ) {
      setCategory('museum');
      setVisitDuration(120); // Default 2 hours for museums
    } else if (
      lowerName.includes('park') ||
      lowerName.includes('garden')
    ) {
      setCategory('park');
      setVisitDuration(60);
    } else if (
      lowerName.includes('mall') ||
      lowerName.includes('shopping') ||
      lowerName.includes('market')
    ) {
      setCategory('shopping');
      setVisitDuration(90);
    } else if (
      lowerName.includes('theater') ||
      lowerName.includes('theatre') ||
      lowerName.includes('cinema')
    ) {
      setCategory('entertainment');
      setVisitDuration(120);
    }
  };

  const handleAddNewPlace = () => {
    if (!placeName || !placeAddress) return;

    onAddPlace({
      id: `new_${Date.now()}`,
      name: placeName,
      address: placeAddress,
      location: placeLocation,
      visitDuration,
      isExistingActivity: false,
      category,
      entranceFee: entranceFee ? parseFloat(entranceFee) : undefined,
      currency: entranceFee ? currency : undefined,
    });

    // Reset form
    setPlaceName('');
    setPlaceAddress('');
    setPlaceLocation(undefined);
    setVisitDuration(60);
    setCategory('attraction');
    setEntranceFee('');
    onClose();
  };

  const categories: RoutePlannerPlaceCategory[] = [
    'attraction',
    'restaurant',
    'cafe',
    'museum',
    'park',
    'shopping',
    'entertainment',
    'other',
  ];

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'new' | 'existing')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new" className="text-xs sm:text-sm">
            Add New Place
          </TabsTrigger>
          <TabsTrigger value="existing" className="text-xs sm:text-sm">
            From Itinerary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="place-search">Search Place</Label>
            <PlaceAutocomplete
              id="place-search"
              placeholder="Search for a place, restaurant, attraction..."
              value={placeName}
              onChange={setPlaceName}
              onSelect={handleSelectPlace}
              proximity={proximity}
            />
          </div>

          {placeAddress && (
            <div
              className={cn(
                'p-3 rounded-lg border',
                placeLocation
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-amber-50 border-amber-200'
              )}
            >
              <div className="flex items-start gap-2">
                <MapPin
                  className={cn(
                    'w-4 h-4 mt-0.5 flex-shrink-0',
                    placeLocation ? 'text-blue-500' : 'text-amber-500'
                  )}
                />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-800">
                    {placeName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{placeAddress}</p>
                  {!placeLocation && (
                    <p className="text-xs text-amber-600 mt-1">
                      Location will be geocoded when calculating route
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              Category
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => {
                const IconComponent = CATEGORY_ICON_COMPONENTS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'p-2 rounded-lg border text-center transition-all flex flex-col items-center',
                      category === cat
                        ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <IconComponent
                      className={cn(
                        'w-5 h-5',
                        category === cat ? 'text-blue-600' : 'text-slate-500'
                      )}
                    />
                    <span className="text-xs text-slate-600 block mt-1">
                      {ROUTE_PLANNER_CATEGORY_LABELS[cat]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration and Entrance Fee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="visit-duration" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Duration
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="visit-duration"
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={visitDuration}
                  onChange={(e) =>
                    setVisitDuration(parseInt(e.target.value) || 60)
                  }
                  className="w-20"
                />
                <span className="text-sm text-slate-500">min</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entrance-fee" className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-slate-500" />
                Entrance Fee
              </Label>
              <div className="flex items-center gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {getCurrencySymbol(curr)} {curr}
                        {curr === homeCurrency ? ' (Home)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="entrance-fee"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={entranceFee}
                  onChange={(e) => setEntranceFee(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAddNewPlace}
              disabled={!placeName || !placeAddress}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Place
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="existing" className="mt-4 space-y-3">
          {selectableActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No activities available to add.</p>
              <p className="text-xs text-slate-400 mt-1">
                Add some activities to your itinerary first, or use the &quot;Add New
                Place&quot; tab.
              </p>
            </div>
          ) : (
            <>
              {/* Search and Date Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search activities..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="All dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates</SelectItem>
                    {availableDates.map((date) => (
                      <SelectItem key={date} value={date}>
                        {new Date(date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select All */}
              {filteredActivities.length > 0 && (
                <div className="flex items-center justify-between px-1">
                  <label
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleSelectAll}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <span>Select All</span>
                  </label>
                  <span className="text-xs text-slate-400">
                    {selectedActivityIds.size} selected
                  </span>
                </div>
              )}

              {/* Activity List */}
              {filteredActivities.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No activities match your search.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {filteredActivities.map((activity) => {
                    const isSelected = selectedActivityIds.has(activity.id);
                    return (
                      <label
                        key={activity.id}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-all cursor-pointer block',
                          isSelected
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-500'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleActivitySelection(activity.id)}
                            className="mt-1 data-[state=checked]:bg-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">
                              {activity.placeName}
                            </p>
                            {activity.address && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                {activity.address}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {activity.dateFrom && (
                                <>
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs text-slate-400">
                                    {new Date(activity.dateFrom).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                </>
                              )}
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-400">
                                {activity.timeFrom} - {activity.timeTo}
                              </span>
                              {activity.estimatedCost && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-xs text-slate-400">
                                    {activity.currency || '$'}
                                    {activity.estimatedCost}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedActivities}
              disabled={selectedActivityIds.size === 0}
              className="flex-1"
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Add {selectedActivityIds.size > 0 ? `(${selectedActivityIds.size})` : 'Selected'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
