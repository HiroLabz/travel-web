'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import type {
  WizardItineraryItem,
  Household,
  Destination,
  RoutePlan,
  CommuteTransportMode,
  RouteWaypoint,
} from '@/types';
import {
  calculateMultiPointRouteAction,
  sortActivitiesByDistanceAction,
  batchUpdateActivityTimesAction,
  updateWizardItemAction,
  saveRoutePlanAction,
  getRoutePlanAction,
} from '@/lib/actions';
import { RouteSegmentList } from './route-segment-list';
import { RouteMapDialog } from './route-map-dialog';
import { cn } from '@/lib/utils';

interface TimeSlot {
  date: string;
  timeFrom: string;
  timeTo: string;
}

interface RoutePlannerTabProps {
  tripId: string;
  wizardItems: WizardItineraryItem[];
  tripDestinations: Destination[];
  household: Household;
  onItemsChange: (items: WizardItineraryItem[]) => void;
}

export function RoutePlannerTab({
  tripId,
  wizardItems,
  tripDestinations,
  household,
  onItemsChange,
}: RoutePlannerTabProps) {
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();

  // State
  const [selectedOriginId, setSelectedOriginId] = useState<string>('');
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [segmentModes, setSegmentModes] = useState<Record<string, CommuteTransportMode>>({});
  const [sortOrder, setSortOrder] = useState<'manual' | 'nearest' | 'farthest'>('manual');
  const [distances, setDistances] = useState<Record<string, { value: number; text: string }>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [routeSaved, setRouteSaved] = useState(false);

  // Get Mapbox token from environment
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  // Filter accommodations and activities
  const accommodations = useMemo(
    () => wizardItems.filter(item => item.travelType === 'accommodation'),
    [wizardItems]
  );

  const activities = useMemo(
    () => wizardItems.filter(item => item.travelType === 'activity' || !item.travelType),
    [wizardItems]
  );

  // Auto-select first accommodation
  useEffect(() => {
    if (accommodations.length > 0 && !selectedOriginId) {
      setSelectedOriginId(accommodations[0].id);
    }
  }, [accommodations, selectedOriginId]);

  // Load saved route on mount
  useEffect(() => {
    async function loadSavedRoute() {
      try {
        const result = await getRoutePlanAction(tripId);
        if (result.success && result.route) {
          setRoutePlan(result.route);
          setSelectedOriginId(result.route.originId);
          setSelectedActivityIds(new Set(result.route.waypointIds));
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

  // Calculate arrival times and conflicts
  const { arrivalTimes, suggestedTimes, conflicts } = useMemo(() => {
    if (!routePlan) return { arrivalTimes: {}, suggestedTimes: {}, conflicts: new Set<string>() };

    const arrivalMap: Record<string, string> = {};
    const suggestedMap: Record<string, TimeSlot> = {};
    const conflictSet = new Set<string>();

    let previousEndTime: Date | null = null;

    routePlan.segments.forEach(segment => {
      const travelDuration = segment.duration.value; // seconds

      if (previousEndTime) {
        const arrivalDate = new Date(previousEndTime.getTime() + travelDuration * 1000);
        const arrivalTimeStr = arrivalDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        arrivalMap[segment.to.itemId] = arrivalTimeStr;

        // Check for conflict
        const scheduledTime = segment.to.scheduledTime;
        if (scheduledTime) {
          const [scheduledHour, scheduledMin] = scheduledTime.timeFrom.split(':').map(Number);
          const scheduledDate = new Date();
          scheduledDate.setHours(scheduledHour, scheduledMin, 0, 0);

          if (arrivalDate > scheduledDate) {
            conflictSet.add(segment.to.itemId);

            // Suggest new time with 15 min buffer
            const suggestedStart = new Date(arrivalDate.getTime() + 15 * 60 * 1000);
            const [endHour, endMin] = scheduledTime.timeTo.split(':').map(Number);
            const originalDuration =
              (endHour * 60 + endMin) -
              (scheduledHour * 60 + scheduledMin);
            const suggestedEnd = new Date(
              suggestedStart.getTime() + originalDuration * 60 * 1000
            );

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

      // Update previous end time
      const toScheduled = segment.to.scheduledTime;
      if (toScheduled) {
        const [h, m] = toScheduled.timeTo.split(':').map(Number);
        previousEndTime = new Date();
        previousEndTime.setHours(h, m, 0, 0);
      }
    });

    return { arrivalTimes: arrivalMap, suggestedTimes: suggestedMap, conflicts: conflictSet };
  }, [routePlan]);

  // Toggle activity selection
  const toggleActivity = useCallback((activityId: string) => {
    setSelectedActivityIds(prev => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
    // Clear route when selection changes
    setRoutePlan(null);
  }, []);

  // Select/deselect all
  const handleSelectAll = useCallback(() => {
    if (selectedActivityIds.size === activities.length) {
      setSelectedActivityIds(new Set());
    } else {
      setSelectedActivityIds(new Set(activities.map(a => a.id)));
    }
    setRoutePlan(null);
  }, [activities, selectedActivityIds.size]);

  // Generate route
  const handleGenerateRoute = useCallback(async () => {
    if (!selectedOriginId || selectedActivityIds.size === 0) {
      toast({
        title: 'Selection required',
        description: 'Please select an origin and at least one activity.',
        variant: 'destructive',
      });
      return;
    }

    setIsCalculating(true);
    setRouteSaved(false);
    try {
      const result = await calculateMultiPointRouteAction(
        tripId,
        selectedOriginId,
        Array.from(selectedActivityIds),
        segmentModes
      );

      if (result.success && result.route) {
        setRoutePlan(result.route);
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
    } finally {
      setIsCalculating(false);
    }
  }, [tripId, selectedOriginId, selectedActivityIds, segmentModes, toast]);

  // Save route
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
        console.error('Save failed:', result.error);
        toast({
          title: 'Failed to save route',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Save route exception:', err);
      toast({
        title: 'Failed to save route',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [tripId, routePlan, toast]);

  // Sort by distance
  const handleSort = useCallback(
    async (order: 'nearest' | 'farthest') => {
      if (!selectedOriginId || selectedActivityIds.size === 0) return;

      setIsSorting(true);
      setSortOrder(order);
      setRouteSaved(false); // Mark as unsaved when sort changes

      try {
        const result = await sortActivitiesByDistanceAction(
          tripId,
          selectedOriginId,
          Array.from(selectedActivityIds),
          order
        );

        if (result.success && result.sortedIds && result.distances) {
          setDistances(result.distances);
          // Recalculate route with new order
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
    [tripId, selectedOriginId, selectedActivityIds, segmentModes]
  );

  // Handle transport mode change
  const handleTransportModeChange = useCallback(
    (segmentId: string, mode: CommuteTransportMode) => {
      setSegmentModes(prev => ({ ...prev, [segmentId]: mode }));
      setRouteSaved(false); // Mark as unsaved when mode changes

      // Recalculate route with new mode
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

        // Update local state
        const updatedItems = wizardItems.map(item =>
          item.id === itemId
            ? { ...item, timeFrom: newTime.timeFrom, timeTo: newTime.timeTo }
            : item
        );
        onItemsChange(updatedItems);

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

      if (result.success) {
        // Update local state
        const updatedItems = wizardItems.map(item => {
          const update = updates.find(u => u.itemId === item.id);
          if (update) {
            return {
              ...item,
              timeFrom: update.timeFrom,
              timeTo: update.timeTo,
            };
          }
          return item;
        });
        onItemsChange(updatedItems);

        // Recalculate route
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
  }, [
    tripId,
    suggestedTimes,
    wizardItems,
    onItemsChange,
    routePlan,
    selectedOriginId,
    segmentModes,
    toast,
  ]);

  // Get waypoints for map
  const waypoints: RouteWaypoint[] = useMemo(() => {
    if (!routePlan) return [];
    return routePlan.segments.length > 0
      ? [routePlan.segments[0].from, ...routePlan.segments.map(s => s.to)]
      : [];
  }, [routePlan]);

  // Handle view map - dialog on desktop, new page on mobile
  const handleViewMap = useCallback(() => {
    if (!routePlan) return;

    if (isMobile) {
      // Navigate to full-screen map page on mobile
      const routeData = {
        waypoints,
        segments: routePlan.segments,
        totalDistance: routePlan.totalDistance.text,
        totalDuration: routePlan.totalDuration.text,
      };
      const encodedData = encodeURIComponent(JSON.stringify(routeData));
      router.push(`/trip/${tripId}/route-map?data=${encodedData}`);
    } else {
      // Open dialog on desktop
      setIsMapDialogOpen(true);
    }
  }, [isMobile, routePlan, waypoints, router, tripId]);

  // Show loading state while loading saved route
  if (isLoadingRoute) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-slate-500">Loading saved route...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Route Planner
          </h2>
        </div>
        {conflicts.size > 0 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{conflicts.size} timing conflict(s)</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleApplyAllSuggestions}
              className="ml-2"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Apply All Suggestions
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto pt-4 space-y-4">
        {/* Origin Selector */}
        <div>
          <Label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Origin (Hotel/Accommodation)
          </Label>
          <Select value={selectedOriginId} onValueChange={setSelectedOriginId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select origin..." />
            </SelectTrigger>
            <SelectContent>
              {accommodations.length === 0 ? (
                <div className="p-2 text-sm text-slate-500">
                  No accommodations found. Add one to your itinerary.
                </div>
              ) : (
                accommodations.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.placeName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Activity Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Activities ({selectedActivityIds.size}/{activities.length})
            </Label>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedActivityIds.size === activities.length
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No activities found. Add activities to your itinerary.
              </p>
            ) : (
              activities.map(activity => (
                <label
                  key={activity.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                    selectedActivityIds.has(activity.id)
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  <Checkbox
                    checked={selectedActivityIds.has(activity.id)}
                    onCheckedChange={() => toggleActivity(activity.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.placeName}</p>
                    <p className="text-xs text-slate-500 truncate">{activity.address}</p>
                  </div>
                  {distances[activity.id] && (
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {distances[activity.id].text}
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
            onClick={handleGenerateRoute}
            disabled={isCalculating || !selectedOriginId || selectedActivityIds.size === 0}
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
                Generate Route
              </>
            )}
          </Button>

          <Select
            value={sortOrder}
            onValueChange={(v: 'nearest' | 'farthest') => handleSort(v)}
            disabled={isSorting || !selectedOriginId || selectedActivityIds.size === 0}
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
        </div>

        {/* Route Summary with View Map Button */}
        {routePlan && (
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
              <Button
                onClick={handleViewMap}
                variant="outline"
                className="flex-1"
              >
                <Map className="w-4 h-4 mr-2" />
                View Route on Map
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
        )}

        {/* Segment List */}
        {routePlan && (
          <RouteSegmentList
            segments={routePlan.segments}
            onTransportModeChange={handleTransportModeChange}
            onTimeSave={handleTimeSave}
            suggestedTimes={suggestedTimes}
            arrivalTimes={arrivalTimes}
            conflicts={conflicts}
          />
        )}
      </div>

      {/* Map Dialog (Desktop only) */}
      <RouteMapDialog
        open={isMapDialogOpen}
        onOpenChange={setIsMapDialogOpen}
        waypoints={waypoints}
        segments={routePlan?.segments || []}
        mapboxToken={mapboxToken}
        totalDistance={routePlan?.totalDistance.text}
        totalDuration={routePlan?.totalDuration.text}
      />
    </div>
  );
}
