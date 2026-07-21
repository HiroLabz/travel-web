'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/motion/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/motion/select';
import {
  Route,
  MapPin,
  Building2,
  ArrowUpDown,
  Loader2,
  Sparkles,
  AlertTriangle,
  Map,
  Save,
  Check,
  Hotel,
  Plane,
  Car,
  Footprints,
  Bike,
  Train,
  Lightbulb,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPinned,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import type {
  WizardItineraryItem,
  Household,
  Destination,
  RoutePlan,
  CommuteTransportMode,
  RouteWaypoint,
  CommuteRoute,
  CommuteRecommendationOutput,
  ExchangeRateCache,
} from '@/types';
import { COMMUTE_TRANSPORT_MODE_LABELS, PLAN_LIMITS } from '@/types';
import {
  calculateMultiPointRouteAction,
  sortActivitiesByDistanceAction,
  batchUpdateActivityTimesAction,
  updateWizardItemAction,
  saveRoutePlanAction,
  getRoutePlanAction,
  calculateCommuteRouteAction,
  getCommuteRecommendationsAction,
} from '@/lib/actions';
import { RouteSegmentList } from './route-segment-list';
import { RouteMapDialog } from './route-map-dialog';
import { cn } from '@/lib/utils';

interface TimeSlot {
  date: string;
  timeFrom: string;
  timeTo: string;
}

interface UnifiedTravelPlannerProps {
  tripId: string;
  wizardItems: WizardItineraryItem[];
  tripDestinations: Destination[];
  household: Household;
  exchangeRates?: ExchangeRateCache;
  onItemsChange?: (items: WizardItineraryItem[]) => void;
  onClose?: () => void;
  isMobilePage?: boolean;
}

// Utility function to extract country from address
const extractCountryFromAddress = (address: string | undefined): string | null => {
  if (!address || address === 'N/A') return null;
  const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : null;
};

// Check if two countries match (case-insensitive)
const countriesMatch = (c1: string | null, c2: string | null): boolean => {
  if (!c1 || !c2) return false;
  return c1.toLowerCase().trim() === c2.toLowerCase().trim();
};

export function UnifiedTravelPlanner({
  tripId,
  wizardItems,
  tripDestinations,
  household,
  exchangeRates,
  onItemsChange,
  onClose,
  isMobilePage = false,
}: UnifiedTravelPlannerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user, subscription, refreshSubscription } = useAuth();

  // State
  const [selectedOriginId, setSelectedOriginId] = useState<string>('');
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<Set<string>>(new Set());
  const [preferredMode, setPreferredMode] = useState<CommuteTransportMode>('driving');
  const [sortOrder, setSortOrder] = useState<'manual' | 'nearest' | 'farthest'>('manual');

  // Route state (multi-destination)
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [segmentModes, setSegmentModes] = useState<Record<string, CommuteTransportMode>>({});
  const [distances, setDistances] = useState<Record<string, { value: number; text: string }>>({});

  // Commute state (single destination)
  const [commuteRoute, setCommuteRoute] = useState<CommuteRoute | null>(null);
  const [transitRecommendations, setTransitRecommendations] = useState<Map<string, CommuteRecommendationOutput>>(new Map());
  const [loadingTransit, setLoadingTransit] = useState<Set<string>>(new Set());
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  // UI state
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [routeSaved, setRouteSaved] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Mapbox token
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  // Filter items by type
  const accommodations = useMemo(
    () => wizardItems.filter(item => item.travelType === 'accommodation'),
    [wizardItems]
  );

  const activities = useMemo(
    () => wizardItems.filter(item =>
      item.travelType === 'activity' ||
      (!item.travelType && !['air', 'land', 'sea', 'accommodation'].includes(item.travelType || ''))
    ),
    [wizardItems]
  );

  const airports = useMemo(
    () => wizardItems.filter(item => item.travelType === 'air'),
    [wizardItems]
  );

  // All possible origins (accommodations + airports)
  const allOrigins = useMemo(
    () => [...accommodations, ...airports],
    [accommodations, airports]
  );

  // Get selected origin item
  const selectedOrigin = useMemo(
    () => allOrigins.find(item => item.id === selectedOriginId),
    [allOrigins, selectedOriginId]
  );

  // Extract country from selected origin
  const selectedOriginCountry = useMemo(() => {
    if (!selectedOrigin) return null;
    return extractCountryFromAddress(selectedOrigin.address)
      || extractCountryFromAddress(selectedOrigin.terminalInfo);
  }, [selectedOrigin]);

  // Filter airports as destinations (same country, not selected origin)
  const filteredAirportsAsDestinations = useMemo(() => {
    if (!selectedOriginCountry) return [];
    return airports.filter(airport => {
      if (airport.id === selectedOriginId) return false;
      const airportCountry = extractCountryFromAddress(airport.address)
        || extractCountryFromAddress(airport.terminalInfo);
      return countriesMatch(airportCountry, selectedOriginCountry);
    });
  }, [airports, selectedOriginCountry, selectedOriginId]);

  // All destinations (activities + filtered airports)
  const allDestinations = useMemo(
    () => [...activities, ...filteredAirportsAsDestinations],
    [activities, filteredAirportsAsDestinations]
  );

  // Determine mode based on selection count
  const isCommuteMode = selectedDestinationIds.size === 1;
  const isRouteMode = selectedDestinationIds.size > 1;

  // Auto-select first origin
  useEffect(() => {
    if (allOrigins.length > 0 && !selectedOriginId) {
      setSelectedOriginId(allOrigins[0].id);
    }
  }, [allOrigins, selectedOriginId]);

  // Load saved route on mount
  useEffect(() => {
    async function loadSavedRoute() {
      try {
        const result = await getRoutePlanAction(tripId);
        if (result.success && result.route) {
          setRoutePlan(result.route);
          setSelectedOriginId(result.route.originId);
          setSelectedDestinationIds(new Set(result.route.waypointIds));
          setSortOrder(result.route.sortOrder);
          setRouteSaved(true);

          // Restore segment modes
          const modes: Record<string, CommuteTransportMode> = {};
          result.route.segments.forEach(seg => {
            modes[seg.id] = seg.transportMode;
          });
          setSegmentModes(modes);
        }
      } catch (error) {
        console.error('Failed to load saved route:', error);
      } finally {
        setIsLoadingRoute(false);
      }
    }

    loadSavedRoute();
  }, [tripId]);

  // Calculate arrival times and conflicts for route mode
  const { arrivalTimes, suggestedTimes, conflicts } = useMemo(() => {
    if (!routePlan) return { arrivalTimes: {}, suggestedTimes: {}, conflicts: new Set<string>() };

    const arrivalMap: Record<string, string> = {};
    const suggestedMap: Record<string, TimeSlot> = {};
    const conflictSet = new Set<string>();

    let previousEndTime: Date | null = null;

    routePlan.segments.forEach(segment => {
      const travelDuration = segment.duration.value;

      if (previousEndTime) {
        const arrivalDate = new Date(previousEndTime.getTime() + travelDuration * 1000);
        const arrivalTimeStr = arrivalDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        arrivalMap[segment.to.itemId] = arrivalTimeStr;

        const scheduledTime = segment.to.scheduledTime;
        if (scheduledTime) {
          const [scheduledHour, scheduledMin] = scheduledTime.timeFrom.split(':').map(Number);
          const scheduledDate = new Date();
          scheduledDate.setHours(scheduledHour, scheduledMin, 0, 0);

          if (arrivalDate > scheduledDate) {
            conflictSet.add(segment.to.itemId);

            const suggestedStart = new Date(arrivalDate.getTime() + 15 * 60 * 1000);
            const [endHour, endMin] = scheduledTime.timeTo.split(':').map(Number);
            const originalDuration = (endHour * 60 + endMin) - (scheduledHour * 60 + scheduledMin);
            const suggestedEnd = new Date(suggestedStart.getTime() + originalDuration * 60 * 1000);

            suggestedMap[segment.to.itemId] = {
              date: scheduledTime.date,
              timeFrom: suggestedStart.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
              timeTo: suggestedEnd.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
            };
          }
        }
      }

      const toScheduled = segment.to.scheduledTime;
      if (toScheduled) {
        const [h, m] = toScheduled.timeTo.split(':').map(Number);
        previousEndTime = new Date();
        previousEndTime.setHours(h, m, 0, 0);
      }
    });

    return { arrivalTimes: arrivalMap, suggestedTimes: suggestedMap, conflicts: conflictSet };
  }, [routePlan]);

  // Toggle destination selection
  const toggleDestination = useCallback((destinationId: string) => {
    setSelectedDestinationIds(prev => {
      const next = new Set(prev);
      if (next.has(destinationId)) {
        next.delete(destinationId);
      } else {
        next.add(destinationId);
      }
      return next;
    });
    // Clear results when selection changes
    setRoutePlan(null);
    setCommuteRoute(null);
    setTransitRecommendations(new Map());
  }, []);

  // Select/deselect all
  const handleSelectAll = useCallback(() => {
    if (selectedDestinationIds.size === allDestinations.length) {
      setSelectedDestinationIds(new Set());
    } else {
      setSelectedDestinationIds(new Set(allDestinations.map(a => a.id)));
    }
    setRoutePlan(null);
    setCommuteRoute(null);
  }, [allDestinations, selectedDestinationIds.size]);

  // Calculate route (adapts based on destination count)
  const handleCalculateRoute = useCallback(async () => {
    if (!selectedOriginId || selectedDestinationIds.size === 0) {
      toast({
        title: 'Selection required',
        description: 'Please select an origin and at least one destination.',
        variant: 'destructive',
      });
      return;
    }

    setIsCalculating(true);
    setRouteSaved(false);

    try {
      if (selectedDestinationIds.size === 1) {
        // Single destination - use commute route
        const result = await calculateCommuteRouteAction(
          tripId,
          selectedOriginId,
          Array.from(selectedDestinationIds)
        );

        if (result.error) {
          toast({
            title: 'Failed to calculate route',
            description: result.error,
            variant: 'destructive',
          });
        } else if (result.route) {
          setCommuteRoute(result.route);
          setRoutePlan(null);
          toast({
            title: 'Route calculated',
            description: `Distance: ${result.route.totalDistance.text}`,
          });
        }
      } else {
        // Multiple destinations - use multi-point route
        const result = await calculateMultiPointRouteAction(
          tripId,
          selectedOriginId,
          Array.from(selectedDestinationIds),
          segmentModes
        );

        if (result.success && result.route) {
          setRoutePlan(result.route);
          setCommuteRoute(null);
          toast({
            title: 'Route calculated',
            description: `Total distance: ${result.route.totalDistance.text}, Total time: ${result.route.totalDuration.text}`,
          });
        } else {
          toast({
            title: 'Failed to calculate route',
            description: result.error || 'Unknown error',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsCalculating(false);
    }
  }, [tripId, selectedOriginId, selectedDestinationIds, segmentModes, toast]);

  // Save route (multi-destination only)
  const handleSaveRoute = useCallback(async () => {
    if (!routePlan) return;

    setIsSaving(true);
    try {
      const result = await saveRoutePlanAction(tripId, routePlan);
      if (result.success) {
        setRouteSaved(true);
        toast({
          title: 'Route saved',
          description: 'Your route has been saved successfully.',
        });
      } else {
        toast({
          title: 'Failed to save route',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [tripId, routePlan, toast]);

  // Sort by distance
  const handleSort = useCallback(
    async (order: 'nearest' | 'farthest') => {
      if (!selectedOriginId || selectedDestinationIds.size === 0) return;

      setIsSorting(true);
      setSortOrder(order);
      setRouteSaved(false);

      try {
        const result = await sortActivitiesByDistanceAction(
          tripId,
          selectedOriginId,
          Array.from(selectedDestinationIds),
          order
        );

        if (result.success && result.sortedIds && result.distances) {
          setDistances(result.distances);
          const sortedIds = result.sortedIds;
          const newResult = await calculateMultiPointRouteAction(
            tripId,
            selectedOriginId,
            sortedIds,
            segmentModes
          );

          if (newResult.success && newResult.route) {
            setRoutePlan(newResult.route);
          }
        }
      } finally {
        setIsSorting(false);
      }
    },
    [tripId, selectedOriginId, selectedDestinationIds, segmentModes]
  );

  // Handle transport mode change (route mode)
  const handleTransportModeChange = useCallback(
    (segmentId: string, mode: CommuteTransportMode) => {
      setSegmentModes(prev => ({ ...prev, [segmentId]: mode }));
      setRouteSaved(false);

      if (routePlan) {
        const newModes = { ...segmentModes, [segmentId]: mode };
        calculateMultiPointRouteAction(
          tripId,
          selectedOriginId,
          routePlan.waypointIds,
          newModes
        ).then(result => {
          if (result.success && result.route) {
            setRoutePlan(result.route);
          }
        });
      }
    },
    [tripId, selectedOriginId, routePlan, segmentModes]
  );

  // Handle individual time save
  const handleTimeSave = useCallback(
    async (itemId: string, newTime: TimeSlot) => {
      try {
        await updateWizardItemAction(tripId, itemId, {
          timeFrom: newTime.timeFrom,
          timeTo: newTime.timeTo,
          dateFrom: newTime.date,
          dateTo: newTime.date,
        });

        if (onItemsChange) {
          const updatedItems = wizardItems.map(item =>
            item.id === itemId
              ? { ...item, timeFrom: newTime.timeFrom, timeTo: newTime.timeTo }
              : item
          );
          onItemsChange(updatedItems);
        }

        toast({
          title: 'Time updated',
          description: 'Activity time has been saved.',
        });
      } catch (error) {
        toast({
          title: 'Failed to save',
          description: 'Could not update activity time.',
          variant: 'destructive',
        });
      }
    },
    [tripId, wizardItems, onItemsChange, toast]
  );

  // Apply all suggestions
  const handleApplyAllSuggestions = useCallback(async () => {
    const updates = Object.entries(suggestedTimes).map(([itemId, time]) => ({
      itemId,
      timeFrom: time.timeFrom,
      timeTo: time.timeTo,
      dateFrom: time.date,
      dateTo: time.date,
    }));

    if (updates.length === 0) return;

    try {
      const result = await batchUpdateActivityTimesAction(tripId, updates);

      if (result.success && onItemsChange) {
        const updatedItems = wizardItems.map(item => {
          const update = updates.find(u => u.itemId === item.id);
          if (update) {
            return { ...item, timeFrom: update.timeFrom, timeTo: update.timeTo };
          }
          return item;
        });
        onItemsChange(updatedItems);

        if (routePlan) {
          const newResult = await calculateMultiPointRouteAction(
            tripId,
            selectedOriginId,
            routePlan.waypointIds,
            segmentModes
          );
          if (newResult.success && newResult.route) {
            setRoutePlan(newResult.route);
          }
        }

        toast({
          title: 'All times updated',
          description: `Updated ${updates.length} activities.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to update times',
        description: 'Could not save activity times.',
        variant: 'destructive',
      });
    }
  }, [tripId, suggestedTimes, wizardItems, onItemsChange, routePlan, selectedOriginId, segmentModes, toast]);

  // Get transit recommendations (commute mode)
  const handleGetTransitRecommendation = useCallback(async (segmentId: string, destinationItemId: string) => {
    setLoadingTransit(prev => new Set(prev).add(segmentId));

    try {
      const result = await getCommuteRecommendationsAction(
        tripId,
        selectedOriginId,
        destinationItemId,
        user?.uid
      );

      await refreshSubscription();

      if (result.creditError) {
        setShowUpgradeModal(true);
        return;
      }

      if (result.success && result.recommendation) {
        setTransitRecommendations(prev => {
          const next = new Map(prev);
          next.set(segmentId, result.recommendation!);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to get transit recommendations:', e);
    } finally {
      setLoadingTransit(prev => {
        const next = new Set(prev);
        next.delete(segmentId);
        return next;
      });
    }
  }, [tripId, selectedOriginId, user?.uid, refreshSubscription]);

  // Toggle segment expansion
  const toggleSegment = useCallback((segmentId: string) => {
    setExpandedSegments(prev => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  }, []);

  // Get transport mode icon
  const getModeIcon = (mode: CommuteTransportMode) => {
    switch (mode) {
      case 'walking':
        return <Footprints className="w-4 h-4" />;
      case 'cycling':
        return <Bike className="w-4 h-4" />;
      case 'driving':
      case 'driving-traffic':
        return <Car className="w-4 h-4" />;
    }
  };

  // Generate Google Maps transit link
  const getGoogleMapsTransitLink = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=transit`;
  };

  // Get waypoints for map
  const waypoints: RouteWaypoint[] = useMemo(() => {
    if (!routePlan) return [];
    return routePlan.segments.length > 0
      ? [routePlan.segments[0].from, ...routePlan.segments.map(s => s.to)]
      : [];
  }, [routePlan]);

  // Handle view map
  const handleViewMap = useCallback(() => {
    if (!routePlan) return;

    if (isMobile) {
      const routeData = {
        waypoints,
        segments: routePlan.segments,
        totalDistance: routePlan.totalDistance.text,
        totalDuration: routePlan.totalDuration.text,
      };
      const encodedData = encodeURIComponent(JSON.stringify(routeData));
      router.push(`/trip/${tripId}/route-map?data=${encodedData}`);
    } else {
      setIsMapDialogOpen(true);
    }
  }, [isMobile, routePlan, waypoints, router, tripId]);

  // Loading state
  if (isLoadingRoute) {
    return (
      <div className="flex flex-col h-full items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  // Empty state
  if (accommodations.length === 0 && airports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <Hotel className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
          No Starting Points
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          Add an accommodation or airport to your itinerary to start planning routes.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', isMobilePage ? 'min-h-screen' : 'h-full')}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Travel Planner
          </h2>
        </div>
        {conflicts.size > 0 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{conflicts.size} timing conflict(s)</span>
            <Button size="sm" variant="outline" onClick={handleApplyAllSuggestions} className="ml-2">
              <Sparkles className="w-4 h-4 mr-1" />
              Apply All
            </Button>
          </div>
        )}
      </div>

      <div className={cn('flex-1 overflow-auto pt-4 space-y-4', isMobilePage && 'pb-24')}>
        {/* Origin Selector */}
        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Starting Point
          </Label>
          <Select value={selectedOriginId} onValueChange={setSelectedOriginId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select starting point..." />
            </SelectTrigger>
            <SelectContent>
              {accommodations.length > 0 && (
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Accommodations
                </div>
              )}
              {accommodations.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>
                  <div className="flex items-center gap-2">
                    <Hotel className="w-4 h-4 text-amber-500" />
                    {acc.placeName}
                  </div>
                </SelectItem>
              ))}
              {airports.length > 0 && (
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 border-t pt-2">
                  Airports
                </div>
              )}
              {airports.map(airport => (
                <SelectItem key={airport.id} value={airport.id}>
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-500" />
                    {airport.placeName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOrigin && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedOrigin.address}
            </p>
          )}
        </div>

        {/* Transport Mode */}
        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Car className="w-4 h-4" />
            Preferred Transport
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(['driving', 'walking', 'cycling'] as CommuteTransportMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setPreferredMode(mode)}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all',
                  preferredMode === mode
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  {getModeIcon(mode)}
                  <span className="text-xs font-medium">
                    {COMMUTE_TRANSPORT_MODE_LABELS[mode]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Destination Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPinned className="w-4 h-4" />
              Destinations ({selectedDestinationIds.size}/{allDestinations.length})
            </Label>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedDestinationIds.size === allDestinations.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
            {allDestinations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No activities found. Add activities to your itinerary.
              </p>
            ) : (
              allDestinations.map(item => (
                <label
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                    selectedDestinationIds.has(item.id)
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  <Checkbox
                    checked={selectedDestinationIds.has(item.id)}
                    onCheckedChange={() => toggleDestination(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-2">
                      {item.travelType === 'air' ? (
                        <Plane className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                      {item.placeName}
                      {item.travelType === 'air' && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                          Airport
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate pl-5">{item.address}</p>
                  </div>
                  {distances[item.id] && (
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {distances[item.id].text}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleCalculateRoute}
            disabled={isCalculating || !selectedOriginId || selectedDestinationIds.size === 0}
            className="flex-1 min-w-[140px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                {selectedDestinationIds.size === 1 ? 'Get Directions' : 'Calculate Route'}
              </>
            )}
          </Button>

          {isRouteMode && (
            <Select
              value={sortOrder}
              onValueChange={(v: string) => handleSort(v as 'nearest' | 'farthest')}
              disabled={isSorting || !selectedOriginId || selectedDestinationIds.size === 0}
            >
              <SelectTrigger className="w-[160px]">
                {isSorting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by..." />
                  </>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Order</SelectItem>
                <SelectItem value="nearest">Nearest First</SelectItem>
                <SelectItem value="farthest">Farthest First</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ROUTE MODE RESULTS */}
        {routePlan && isRouteMode && (
          <>
            {/* Route Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Route</p>
                  <p className="text-xs text-slate-500">
                    {waypoints.length} places ({waypoints.length - 1} stops from origin)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{routePlan.totalDistance.text}</p>
                  <p className="text-xs text-slate-500">{routePlan.totalDuration.text}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleViewMap} variant="outline" className="flex-1">
                  <Map className="w-4 h-4 mr-2" />
                  View Map
                </Button>
                <Button
                  onClick={handleSaveRoute}
                  disabled={isSaving}
                  className={cn(
                    'flex-1',
                    routeSaved
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : routeSaved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Route
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Segment List */}
            <RouteSegmentList
              segments={routePlan.segments}
              onTransportModeChange={handleTransportModeChange}
              onTimeSave={handleTimeSave}
              suggestedTimes={suggestedTimes}
              arrivalTimes={arrivalTimes}
              conflicts={conflicts}
            />
          </>
        )}

        {/* COMMUTE MODE RESULTS */}
        {commuteRoute && isCommuteMode && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Route Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Distance</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    {commuteRoute.totalDistance.text}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">From</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {commuteRoute.segments[0]?.from.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Commute Segments */}
            {commuteRoute.segments.map((segment, index) => (
              <div
                key={segment.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleSegment(segment.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {segment.to.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {segment.distance.text} from {segment.from.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {segment.duration[preferredMode] && (
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                        {segment.duration[preferredMode]?.text}
                      </span>
                    )}
                    {expandedSegments.has(segment.id) ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedSegments.has(segment.id) && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-4">
                    {/* Transport Mode Durations */}
                    <div className="grid grid-cols-3 gap-2">
                      {(['driving', 'walking', 'cycling'] as CommuteTransportMode[]).map(mode => {
                        const duration = segment.duration[mode];
                        return (
                          <div
                            key={mode}
                            className={cn(
                              'p-2 rounded-lg',
                              mode === preferredMode
                                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                                : 'bg-slate-50 dark:bg-slate-700/50'
                            )}
                          >
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              {getModeIcon(mode)}
                              {COMMUTE_TRANSPORT_MODE_LABELS[mode]}
                            </div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {duration?.text || 'N/A'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* AI Transit Recommendation */}
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                      {transitRecommendations.has(segment.id) ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Train className="w-4 h-4" />
                            <span className="font-medium text-sm">Transit Recommendation</span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {transitRecommendations.get(segment.id)?.transitRecommendation}
                          </p>

                          {/* Transit Steps */}
                          <div className="space-y-2">
                            {transitRecommendations.get(segment.id)?.transitSteps.map((step, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs flex-shrink-0">
                                  {i + 1}
                                </span>
                                <div>
                                  <span className="font-medium">{step.mode}:</span>{' '}
                                  {step.instruction}
                                  {step.duration && (
                                    <span className="text-slate-500 dark:text-slate-400"> ({step.duration})</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Cost */}
                          {transitRecommendations.get(segment.id)?.estimatedCost && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <DollarSign className="w-4 h-4" />
                              <span>Estimated cost: {transitRecommendations.get(segment.id)?.estimatedCost}</span>
                            </div>
                          )}

                          {/* Tips */}
                          {transitRecommendations.get(segment.id)?.tips && transitRecommendations.get(segment.id)!.tips.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium mb-2">
                                <Lightbulb className="w-4 h-4" />
                                Local Tips
                              </div>
                              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                {transitRecommendations.get(segment.id)?.tips.map((tip, i) => (
                                  <li key={i}>- {tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGetTransitRecommendation(segment.id, segment.to.itemId)}
                          disabled={loadingTransit.has(segment.id)}
                          className="w-full"
                        >
                          {loadingTransit.has(segment.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Getting recommendations...
                            </>
                          ) : (
                            <>
                              <Train className="w-4 h-4 mr-2" />
                              Get AI Transit Recommendations
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* External Links */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <a
                        href={getGoogleMapsTransitLink(
                          segment.from.location.lat,
                          segment.from.location.lng,
                          segment.to.location.lat,
                          segment.to.location.lng
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in Google Maps (Transit)
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Fixed Footer */}
      {isMobilePage && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 flex gap-3 z-50">
          <Button variant="outline" onClick={onClose || (() => router.back())} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button
            onClick={handleCalculateRoute}
            disabled={isCalculating || !selectedOriginId || selectedDestinationIds.size === 0}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
          >
            {isCalculating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                {selectedDestinationIds.size === 1 ? 'Directions' : 'Route'}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Map Dialog (Desktop) */}
      <RouteMapDialog
        open={isMapDialogOpen}
        onOpenChange={setIsMapDialogOpen}
        waypoints={waypoints}
        segments={routePlan?.segments || []}
        mapboxToken={mapboxToken}
        totalDistance={routePlan?.totalDistance.text}
        totalDuration={routePlan?.totalDuration.text}
      />

      {/* Upgrade Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remainingCredits={subscription ? Math.max(0, PLAN_LIMITS[subscription.plan].monthlyCredits - subscription.creditsUsed) : 0}
        planName={subscription?.plan || 'starter'}
      />
    </div>
  );
}
