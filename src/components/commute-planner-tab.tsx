'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  calculateCommuteRouteAction,
  optimizeRouteOrderAction,
  saveCommuteSettingsAction,
  getCommuteRecommendationsAction,
} from '@/lib/actions';
import type {
  WizardItineraryItem,
  CommuteRoute,
  CommuteTransportMode,
  CommuteSettings,
  CommuteRecommendationOutput,
} from '@/types';
import { COMMUTE_TRANSPORT_MODE_LABELS, PLAN_LIMITS } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import {
  Loader2,
  MapPin,
  Hotel,
  Route,
  Clock,
  Check,
  Sparkles,
  Car,
  Footprints,
  Bike,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Train,
  Lightbulb,
  DollarSign,
  AlertCircle,
  Plane,
  MapPinned,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/motion/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/motion/select';

interface CommutePlannerTabProps {
  tripId: string;
  wizardItems: WizardItineraryItem[];
  savedSettings?: CommuteSettings;
  currency?: string;
  tripDestinations?: { city: string; country: string }[];
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

export function CommutePlannerTab({
  tripId,
  wizardItems,
  savedSettings,
  currency,
  tripDestinations,
}: CommutePlannerTabProps) {
  const { user, subscription, refreshSubscription } = useAuth();

  // State
  const [selectedAccommodationId, setSelectedAccommodationId] = useState<string>(
    savedSettings?.defaultAccommodationId || ''
  );
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());
  const [preferredMode, setPreferredMode] = useState<CommuteTransportMode>(
    savedSettings?.preferredTransportMode || 'driving'
  );
  const [route, setRoute] = useState<CommuteRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [transitRecommendations, setTransitRecommendations] = useState<Map<string, CommuteRecommendationOutput>>(new Map());
  const [loadingTransit, setLoadingTransit] = useState<Set<string>>(new Set());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Filter items by type
  const accommodations = useMemo(
    () => wizardItems.filter((item) => item.travelType === 'accommodation'),
    [wizardItems]
  );

  const activities = useMemo(
    () =>
      wizardItems.filter(
        (item) =>
          item.travelType === 'activity' ||
          (!item.travelType &&
            !['air', 'land', 'sea', 'accommodation'].includes(item.travelType || ''))
      ),
    [wizardItems]
  );

  // Get all airports
  const airports = useMemo(
    () => wizardItems.filter((item) => item.travelType === 'air'),
    [wizardItems]
  );

  // All possible origins (accommodations + airports)
  const allOrigins = useMemo(
    () => [...accommodations, ...airports],
    [accommodations, airports]
  );

  // Get the selected origin item
  const selectedOrigin = useMemo(
    () => allOrigins.find((item) => item.id === selectedAccommodationId),
    [allOrigins, selectedAccommodationId]
  );

  // Extract country from selected origin's address
  const selectedOriginCountry = useMemo(() => {
    if (!selectedOrigin) return null;
    return extractCountryFromAddress(selectedOrigin.address)
      || extractCountryFromAddress(selectedOrigin.terminalInfo);
  }, [selectedOrigin]);

  // Filter airports as destinations (same country, not the selected origin)
  const filteredAirportsAsDestinations = useMemo(() => {
    if (!selectedOriginCountry) return [];
    return airports.filter((airport) => {
      if (airport.id === selectedAccommodationId) return false;
      const airportCountry = extractCountryFromAddress(airport.address)
        || extractCountryFromAddress(airport.terminalInfo);
      return countriesMatch(airportCountry, selectedOriginCountry);
    });
  }, [airports, selectedOriginCountry, selectedAccommodationId]);

  // All destinations (activities + filtered airports)
  const allDestinations = useMemo(() => {
    return [...activities, ...filteredAirportsAsDestinations];
  }, [activities, filteredAirportsAsDestinations]);

  // Auto-select first origin if none selected
  useEffect(() => {
    if (!selectedAccommodationId && allOrigins.length > 0) {
      setSelectedAccommodationId(allOrigins[0].id);
    }
  }, [allOrigins, selectedAccommodationId]);

  // Toggle activity selection
  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all / deselect all
  const selectAllActivities = () => {
    setSelectedActivityIds(new Set(allDestinations.map((a) => a.id)));
  };

  const deselectAllActivities = () => {
    setSelectedActivityIds(new Set());
  };

  // Calculate route
  const handleCalculateRoute = async () => {
    if (!selectedAccommodationId) {
      setError('Please select a starting point.');
      return;
    }
    if (selectedActivityIds.size === 0) {
      setError('Please select at least one destination.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await calculateCommuteRouteAction(
        tripId,
        selectedAccommodationId,
        Array.from(selectedActivityIds)
      );

      if (result.error) {
        setError(result.error);
      } else if (result.route) {
        setRoute(result.route);
        // Save settings
        await saveCommuteSettingsAction(tripId, {
          defaultAccommodationId: selectedAccommodationId,
          preferredTransportMode: preferredMode,
        });
      }
    } catch (e) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Optimize route order
  const handleOptimizeOrder = async () => {
    if (!route) return;

    setLoading(true);
    const result = await optimizeRouteOrderAction(
      tripId,
      selectedAccommodationId,
      Array.from(selectedActivityIds)
    );

    if (result.success && result.optimizedOrder) {
      setRoute((prev) =>
        prev ? { ...prev, optimizedOrder: result.optimizedOrder } : null
      );
    }
    setLoading(false);
  };

  // Get transit recommendations for a segment
  const handleGetTransitRecommendation = async (segmentId: string, destinationItemId: string) => {
    setLoadingTransit((prev) => new Set(prev).add(segmentId));

    try {
      const result = await getCommuteRecommendationsAction(
        tripId,
        selectedAccommodationId,
        destinationItemId,
        user?.uid
      );

      // Refresh subscription after AI usage
      await refreshSubscription();

      if (result.creditError) {
        setShowUpgradeModal(true);
        return;
      }

      if (result.success && result.recommendation) {
        setTransitRecommendations((prev) => {
          const next = new Map(prev);
          next.set(segmentId, result.recommendation!);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to get transit recommendations:', e);
    } finally {
      setLoadingTransit((prev) => {
        const next = new Set(prev);
        next.delete(segmentId);
        return next;
      });
    }
  };

  // Get transport mode icon component
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

  // Toggle segment expansion
  const toggleSegment = (segmentId: string) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  };

  // Generate Google Maps transit link
  const getGoogleMapsTransitLink = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=transit`;
  };

  // Empty state - no accommodations or airports
  if (accommodations.length === 0 && airports.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Hotel className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No Starting Points
          </h3>
          <p className="text-muted-foreground max-w-md">
            Add an accommodation or airport in your itinerary to start planning commute routes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Selection */}
        <div className="lg:col-span-1 space-y-4">
          {/* Origin Selection (Accommodation or Airport) */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-brand-500" />
              Starting Point
            </h3>
            <Select
              value={selectedAccommodationId}
              onValueChange={setSelectedAccommodationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select starting point" />
              </SelectTrigger>
              <SelectContent>
                {accommodations.length > 0 && (
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Accommodations
                  </div>
                )}
                {accommodations.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <Hotel className="w-4 h-4 text-brand-500" />
                      {acc.placeName}
                    </div>
                  </SelectItem>
                ))}
                {airports.length > 0 && (
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2">
                    Airports
                  </div>
                )}
                {airports.map((airport) => (
                  <SelectItem key={airport.id} value={airport.id}>
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-brand-500" />
                      {airport.placeName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAccommodationId && (
              <p className="text-xs text-muted-foreground mt-2">
                {allOrigins.find((a) => a.id === selectedAccommodationId)?.address}
              </p>
            )}
          </div>

          {/* Transport Mode */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <Car className="w-4 h-4 text-success-accent" />
              Preferred Transport
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['driving', 'walking', 'cycling'] as CommuteTransportMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreferredMode(mode)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    preferredMode === mode
                      ? 'border-brand-500 bg-brand-subtle text-brand-500'
                      : 'border-border hover:border-brand-300'
                  }`}
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

          {/* Destinations Selection */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MapPinned className="w-4 h-4 text-brand-500" />
                Destinations ({selectedActivityIds.size}/{allDestinations.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllActivities}
                  className="text-xs text-brand-500 hover:underline"
                >
                  All
                </button>
                <button
                  onClick={deselectAllActivities}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  None
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allDestinations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No destinations found in your itinerary.
                </p>
              ) : (
                allDestinations.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedActivityIds.has(item.id)}
                      onCheckedChange={() => toggleActivity(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                        {item.travelType === 'air' ? (
                          <Plane className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                        )}
                        {item.placeName}
                        {item.travelType === 'air' && (
                          <span className="text-[10px] bg-brand-subtle text-brand-500 px-1.5 py-0.5 rounded">
                            Airport
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate pl-5">
                        {item.address}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculateRoute}
            disabled={loading || !selectedAccommodationId || selectedActivityIds.size === 0}
            className="w-full bg-brand-500 hover:bg-brand-600 rounded-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                Calculate Routes
              </>
            )}
          </Button>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2">
          {route ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">
                    Route Summary
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOptimizeOrder}
                    disabled={loading}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Optimize Order
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Activities</p>
                    <p className="text-xl font-bold text-foreground">
                      {route.segments.length}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Distance</p>
                    <p className="text-xl font-bold text-foreground">
                      {route.totalDistance.text}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {route.segments[0]?.from.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Route Segments */}
              <div className="space-y-3">
                {route.segments.map((segment, index) => (
                  <div
                    key={segment.id}
                    className="bg-card rounded-xl shadow-sm border border-border overflow-hidden"
                  >
                    <button
                      onClick={() => toggleSegment(segment.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-subtle text-brand-500 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <div className="text-left">
                          <p className="font-medium text-foreground">
                            {segment.to.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {segment.distance.text} from {segment.from.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {segment.duration[preferredMode] && (
                          <span className="text-sm font-medium text-brand-500 bg-brand-subtle px-2 py-1 rounded">
                            {segment.duration[preferredMode]?.text}
                          </span>
                        )}
                        {expandedSegments.has(segment.id) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {expandedSegments.has(segment.id) && (
                      <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">
                        {/* Transport Mode Durations */}
                        <div className="grid grid-cols-3 gap-2">
                          {(['driving', 'walking', 'cycling'] as CommuteTransportMode[]).map(
                            (mode) => {
                              const duration = segment.duration[mode];
                              return (
                                <div
                                  key={mode}
                                  className={`p-2 rounded-lg ${
                                    mode === preferredMode
                                      ? 'bg-brand-subtle border border-brand-500/30'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {getModeIcon(mode)}
                                    {COMMUTE_TRANSPORT_MODE_LABELS[mode]}
                                  </div>
                                  <p className="font-semibold text-foreground">
                                    {duration?.text || 'N/A'}
                                  </p>
                                </div>
                              );
                            }
                          )}
                        </div>

                        {/* AI Transit Recommendation */}
                        <div className="border-t border-border pt-3">
                          {transitRecommendations.has(segment.id) ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-success-accent">
                                <Train className="w-4 h-4" />
                                <span className="font-medium text-sm">Transit Recommendation</span>
                              </div>
                              <p className="text-sm text-foreground">
                                {transitRecommendations.get(segment.id)?.transitRecommendation}
                              </p>

                              {/* Transit Steps */}
                              <div className="space-y-2">
                                {transitRecommendations.get(segment.id)?.transitSteps.map((step, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm">
                                    <span className="w-5 h-5 rounded-full bg-success-soft text-success-accent flex items-center justify-center text-xs flex-shrink-0">
                                      {i + 1}
                                    </span>
                                    <div>
                                      <span className="font-medium">{step.mode}:</span>{' '}
                                      {step.instruction}
                                      {step.duration && (
                                        <span className="text-muted-foreground"> ({step.duration})</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Cost and Tips */}
                              {transitRecommendations.get(segment.id)?.estimatedCost && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <DollarSign className="w-4 h-4" />
                                  <span>Estimated cost: {transitRecommendations.get(segment.id)?.estimatedCost}</span>
                                </div>
                              )}

                              {transitRecommendations.get(segment.id)?.tips && transitRecommendations.get(segment.id)!.tips.length > 0 && (
                                <div className="bg-warning-soft rounded-lg p-3">
                                  <div className="flex items-center gap-2 text-warning-accent text-sm font-medium mb-2">
                                    <Lightbulb className="w-4 h-4" />
                                    Local Tips
                                  </div>
                                  <ul className="text-sm text-muted-foreground space-y-1">
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
                                  Get Transit Recommendations (AI)
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
                            className="flex items-center gap-1 text-sm text-brand-500 hover:underline"
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
            </div>
          ) : (
            <div className="bg-card rounded-xl shadow-sm border border-border p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Route className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Route Calculated
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Select your accommodation and activities, then click &quot;Calculate Routes&quot; to
                  see travel times and distances.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remainingCredits={subscription ? Math.max(0, PLAN_LIMITS[subscription.plan].monthlyCredits - subscription.creditsUsed) : 0}
        planName={subscription?.plan || 'starter'}
      />
    </div>
  );
}
