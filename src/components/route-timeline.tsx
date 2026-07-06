'use client';

import { useState } from 'react';
import type { Trip, Household, Destination, TravelPlan } from '@/types';
import { PLAN_LIMITS } from '@/types';
import {
  updateTripDetailsAction,
  updateTripDestinationsAction,
  addDestinationAction,
  deleteDestinationAction,
  generateTravelPlanAction,
  saveTravelPlanAction,
  clearTravelPlanAction,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/contexts/loading-context';
import { useAuth } from '@/hooks/use-auth';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import { useSortableDestinations } from '@/hooks/use-sortable-destinations';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDestinationItem } from '@/components/sortable-destination-item';
import { DestinationDragOverlay } from '@/components/destination-drag-overlay';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MapPin,
  Calendar,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Loader2,
  ArrowDown,
  Home,
  Navigation,
  Sparkles,
  ExternalLink,
  Plane,
  Train,
  Bus,
  Ship,
  Car,
} from 'lucide-react';

interface RouteTimelineProps {
  trip: Trip;
  destinations: Destination[];
  household: Household;
  onTripUpdate: (updates: Partial<Trip>) => void;
  onDestinationsChange: (destinations: Destination[]) => void;
}

export function RouteTimeline({
  trip,
  destinations: initialDestinations,
  household,
  onTripUpdate,
  onDestinationsChange,
}: RouteTimelineProps) {
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  const { user, subscription, refreshSubscription } = useAuth();

  // Local state
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [routePlanOpen, setRoutePlanOpen] = useState(true);
  const [routeEditMode, setRouteEditMode] = useState(false);
  const [addDestinationOpen, setAddDestinationOpen] = useState(false);
  const [newDestination, setNewDestination] = useState<Partial<Destination>>({
    city: '',
    country: '',
    startDate: '',
    endDate: '',
  });

  // Destination editing
  const [editingDestinationIndex, setEditingDestinationIndex] = useState<number | null>(null);
  const [editingDestination, setEditingDestination] = useState<Partial<Destination>>({});

  // Trip details editing
  const [editingTripDetails, setEditingTripDetails] = useState(false);
  const [tripDetailsForm, setTripDetailsForm] = useState({
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
  });
  const [savingTripDetails, setSavingTripDetails] = useState(false);

  // Travel plan
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(trip.travelPlan || null);
  const [generatingTravelPlan, setGeneratingTravelPlan] = useState(false);
  const [travelPlanExpanded, setTravelPlanExpanded] = useState(false);
  const [selectedOriginIndex, setSelectedOriginIndex] = useState<number>(-1);

  // Drag-and-drop for destinations
  const {
    sensors: destSensors,
    activeDestination,
    handleDragStart: handleDestDragStart,
    handleDragEnd: handleDestDragEnd,
    handleDragCancel: handleDestDragCancel,
  } = useSortableDestinations({
    destinations,
    tripId: trip.id,
    onDestinationsChange: (newDests) => {
      setDestinations(newDests);
      onDestinationsChange(newDests);
    },
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Destination handlers
  const handleStartEditDestination = (index: number) => {
    setEditingDestinationIndex(index);
    setEditingDestination({ ...destinations[index] });
  };

  const handleSaveDestination = async () => {
    if (editingDestinationIndex === null) return;
    if (!editingDestination.city || !editingDestination.country) {
      toast({
        title: 'Missing fields',
        description: 'City and country are required.',
        variant: 'destructive',
      });
      return;
    }

    const newDestinations = [...destinations];
    newDestinations[editingDestinationIndex] = {
      ...newDestinations[editingDestinationIndex],
      ...(editingDestination as Destination),
    };

    const result = await updateTripDestinationsAction(trip.id, newDestinations);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setDestinations(newDestinations);
      onDestinationsChange(newDestinations);
      setEditingDestinationIndex(null);
      setEditingDestination({});
      toast({ title: 'Destination updated' });
    }
  };

  const handleCancelEditDestination = () => {
    setEditingDestinationIndex(null);
    setEditingDestination({});
  };

  const handleAddDestination = async () => {
    if (!newDestination.city || !newDestination.country) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in city and country.',
        variant: 'destructive',
      });
      return;
    }

    const result = await addDestinationAction(trip.id, newDestination as Destination);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.destinations) {
      setDestinations(result.destinations);
      onDestinationsChange(result.destinations);
      setNewDestination({ city: '', country: '', startDate: '', endDate: '' });
      setAddDestinationOpen(false);
      toast({ title: 'Destination added' });
    }
  };

  const handleDeleteDestination = async (index: number) => {
    if (destinations.length <= 1) {
      toast({
        title: 'Cannot delete',
        description: 'You must have at least one destination.',
        variant: 'destructive',
      });
      return;
    }

    const result = await deleteDestinationAction(trip.id, index);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.destinations) {
      setDestinations(result.destinations);
      onDestinationsChange(result.destinations);
    }
  };

  // Trip details handlers
  const handleStartEditTripDetails = () => {
    setTripDetailsForm({
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
    });
    setEditingTripDetails(true);
  };

  const handleSaveTripDetails = async () => {
    setSavingTripDetails(true);
    const result = await updateTripDetailsAction(trip.id, tripDetailsForm);
    setSavingTripDetails(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      onTripUpdate({
        title: tripDetailsForm.title,
        startDate: tripDetailsForm.startDate,
        endDate: tripDetailsForm.endDate,
      });
      setEditingTripDetails(false);
      toast({ title: 'Trip updated' });
    }
  };

  const handleCancelEditTripDetails = () => {
    setEditingTripDetails(false);
    setTripDetailsForm({
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
    });
  };

  // Travel plan handlers
  const handleGenerateTravelPlan = async () => {
    let originCity: string | undefined;
    let originCountry: string | undefined;
    let destinationsToUse = destinations;

    if (selectedOriginIndex === -1) {
      originCity = household.cityOfOrigin;
      originCountry = household.countryOfOrigin;
    } else if (selectedOriginIndex >= 0 && selectedOriginIndex < destinations.length) {
      const selectedDest = destinations[selectedOriginIndex];
      originCity = selectedDest.city;
      originCountry = selectedDest.country;
      destinationsToUse = destinations.filter((_, idx) => idx !== selectedOriginIndex);
    }

    if (!originCity) {
      toast({
        title: 'Origin required',
        description: 'Please select a starting point for your travel plan.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingTravelPlan(true);
    setTravelPlanExpanded(true);
    showLoading('Generating travel plan...');

    const result = await generateTravelPlanAction(
      destinationsToUse,
      originCity,
      originCountry,
      'midrange',
      'family',
      household.currency || 'USD',
      user?.uid
    );

    hideLoading();

    // Refresh subscription after AI usage
    await refreshSubscription();

    if (result.creditError) {
      setShowUpgradeModal(true);
      setTravelPlanExpanded(false);
      setGeneratingTravelPlan(false);
      return;
    }

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      setTravelPlanExpanded(false);
    } else if (result.plan) {
      const planToSave: TravelPlan = {
        legs: result.plan.legs,
        summary: result.plan.summary,
        totalEstimatedCost: result.plan.totalEstimatedCost,
        tips: result.plan.tips,
        generatedAt: new Date().toISOString(),
        originCity: originCity,
        originCountry: originCountry,
      };

      setTravelPlan(planToSave);

      const saveResult = await saveTravelPlanAction(trip.id, planToSave);
      if (saveResult.error) {
        toast({ title: 'Warning', description: 'Plan generated but failed to save.', variant: 'destructive' });
      } else {
        toast({ title: 'Travel plan generated and saved!' });
      }
    }

    setGeneratingTravelPlan(false);
  };

  const handleClearTravelPlan = async () => {
    const result = await clearTravelPlanAction(trip.id);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setTravelPlan(null);
      setTravelPlanExpanded(false);
      toast({ title: 'Travel plan cleared' });
    }
  };

  // Helper functions
  const getGoogleFlightsUrl = (from: string, to: string) => {
    return `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(from)}+to+${encodeURIComponent(to)}`;
  };

  const getGoogleSearchUrl = (transportType: string, provider: string, from: string, to: string) => {
    const searchQuery = `${provider} ${transportType} ${from} to ${to} tickets booking`;
    return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  };

  const isFlightType = (type: string) => {
    const t = type.toLowerCase();
    return t.includes('flight') || t.includes('plane') || t.includes('air');
  };

  const getTransportIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('flight') || t.includes('plane') || t.includes('air')) return <Plane className="w-4 h-4" />;
    if (t.includes('train') || t.includes('rail')) return <Train className="w-4 h-4" />;
    if (t.includes('bus') || t.includes('coach')) return <Bus className="w-4 h-4" />;
    if (t.includes('ferry') || t.includes('boat') || t.includes('ship')) return <Ship className="w-4 h-4" />;
    if (t.includes('car') || t.includes('drive') || t.includes('rental')) return <Car className="w-4 h-4" />;
    return <Navigation className="w-4 h-4" />;
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <Collapsible open={routePlanOpen} onOpenChange={setRoutePlanOpen}>
          <div className="flex items-center justify-between mb-4">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                Route Plan
              </h3>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${routePlanOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              {routeEditMode ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRouteEditMode(false)}
                  className="text-slate-500"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Done
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRouteEditMode(true)}
                  className="text-blue-600"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          <CollapsibleContent>
            {/* Trip Title and Date Section */}
            <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-600">
              {editingTripDetails ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Trip Name</label>
                    <Input
                      value={tripDetailsForm.title}
                      onChange={(e) => setTripDetailsForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Trip name"
                      className="h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Start Date</label>
                      <Input
                        type="date"
                        value={tripDetailsForm.startDate}
                        onChange={(e) => setTripDetailsForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">End Date</label>
                      <Input
                        type="date"
                        value={tripDetailsForm.endDate}
                        onChange={(e) => setTripDetailsForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveTripDetails}
                      disabled={savingTripDetails}
                      className="h-8"
                    >
                      {savingTripDetails ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEditTripDetails}
                      disabled={savingTripDetails}
                      className="h-8"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{trip.title}</h4>
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                    </div>
                  </div>
                  {routeEditMode && (
                    <button
                      onClick={handleStartEditTripDetails}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Edit trip details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <DndContext
              sensors={destSensors}
              collisionDetection={closestCenter}
              onDragStart={handleDestDragStart}
              onDragEnd={handleDestDragEnd}
              onDragCancel={handleDestDragCancel}
            >
              <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-600 ml-3 space-y-6">
                <SortableContext
                  items={destinations.map((_, i) => String(i))}
                  strategy={verticalListSortingStrategy}
                >
                  {destinations.map((dest, index) => (
                    <SortableDestinationItem
                      key={index}
                      id={String(index)}
                      disabled={!routeEditMode}
                    >
                      <div className="flex items-start justify-between flex-1">
                        {editingDestinationIndex === index ? (
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={editingDestination.city || ''}
                                onChange={(e) => setEditingDestination(prev => ({ ...prev, city: e.target.value }))}
                                placeholder="City"
                                className="flex-1 h-8 text-sm"
                              />
                              <Input
                                value={editingDestination.country || ''}
                                onChange={(e) => setEditingDestination(prev => ({ ...prev, country: e.target.value }))}
                                placeholder="Country"
                                className="flex-1 h-8 text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={editingDestination.startDate || ''}
                                onChange={(e) => setEditingDestination(prev => ({ ...prev, startDate: e.target.value }))}
                                className="flex-1 h-8 text-sm"
                              />
                              <Input
                                type="date"
                                value={editingDestination.endDate || ''}
                                onChange={(e) => setEditingDestination(prev => ({ ...prev, endDate: e.target.value }))}
                                className="flex-1 h-8 text-sm"
                              />
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="default" onClick={handleSaveDestination} className="h-7 text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelEditDestination} className="h-7 text-xs">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{dest.city}</span>
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{dest.country}</span>
                              {(dest.startDate || dest.endDate) && (
                                <span className="text-xs text-slate-400 mt-1 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(dest.startDate)} - {formatDate(dest.endDate)}
                                </span>
                              )}
                            </div>

                            {routeEditMode && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEditDestination(index)}
                                  className="p-1 text-slate-400 hover:text-blue-600"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDestination(index)}
                                  className="p-1 text-slate-400 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {index < destinations.length - 1 && editingDestinationIndex !== index && (
                        <div className="mt-3 text-slate-300 absolute -bottom-5 left-6">
                          <ArrowDown className="w-4 h-4" />
                        </div>
                      )}
                    </SortableDestinationItem>
                  ))}
                </SortableContext>
                {destinations.length === 0 && (
                  <div className="text-slate-400 text-sm pl-4 italic">No destinations yet.</div>
                )}
              </div>
              <DestinationDragOverlay activeDestination={activeDestination} />
            </DndContext>

            {routeEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDestinationOpen(true)}
                className="mt-4 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Destination
              </Button>
            )}

            {/* Generate Travel Plan Section */}
            {!routeEditMode && destinations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    Starting Point
                  </Label>
                  <Select
                    value={String(selectedOriginIndex)}
                    onValueChange={(val) => setSelectedOriginIndex(Number(val))}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Select starting point" />
                    </SelectTrigger>
                    <SelectContent>
                      {household.cityOfOrigin && (
                        <SelectItem value="-1">
                          <div className="flex items-center gap-2">
                            <Home className="w-3.5 h-3.5 text-blue-500" />
                            <span>{household.cityOfOrigin}, {household.countryOfOrigin}</span>
                            <span className="text-xs text-slate-400">(Home)</span>
                          </div>
                        </SelectItem>
                      )}
                      {destinations.map((dest, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{dest.city}{dest.country ? `, ${dest.country}` : ''}</span>
                            <span className="text-xs text-slate-400">(Stop {idx + 1})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerateTravelPlan}
                  disabled={generatingTravelPlan || (selectedOriginIndex === -1 && !household.cityOfOrigin)}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {generatingTravelPlan ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating travel plan...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Generate Travel Plan
                    </>
                  )}
                </Button>

                {selectedOriginIndex === -1 && household.cityOfOrigin && (
                  <p className="text-xs text-slate-400 text-center">
                    Starting from your home: {household.cityOfOrigin}, {household.countryOfOrigin}
                  </p>
                )}
                {selectedOriginIndex >= 0 && destinations[selectedOriginIndex] && (
                  <p className="text-xs text-slate-400 text-center">
                    Starting from: {destinations[selectedOriginIndex].city}
                    {destinations[selectedOriginIndex].country ? `, ${destinations[selectedOriginIndex].country}` : ''}
                  </p>
                )}
                {selectedOriginIndex === -1 && !household.cityOfOrigin && (
                  <p className="text-xs text-amber-500 text-center">
                    Set your home city in household settings, or select a destination as starting point.
                  </p>
                )}
              </div>
            )}

            {/* Saved Travel Plan Accordion */}
            {travelPlan && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setTravelPlanExpanded(!travelPlanExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg hover:from-blue-100 hover:to-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-slate-800">AI Travel Plan</span>
                    <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full">
                      {travelPlan.legs.length} legs
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {travelPlan.generatedAt && format(parseISO(travelPlan.generatedAt), 'MMM d, yyyy')}
                    </span>
                    {travelPlanExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {travelPlanExpanded && (
                  <div className="mt-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-800">{travelPlan.summary}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-blue-600 font-medium">
                          Estimated total: {travelPlan.totalEstimatedCost}
                        </p>
                        <p className="text-xs text-slate-500">
                          From: {travelPlan.originCity}{travelPlan.originCountry ? `, ${travelPlan.originCountry}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {travelPlan.legs.map((leg, legIndex) => (
                        <div key={legIndex} className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-slate-800">{leg.from}</span>
                            <ArrowDown className="w-3 h-3 text-slate-400 rotate-[-90deg]" />
                            <span className="font-medium text-slate-800">{leg.to}</span>
                          </div>

                          <div className="space-y-2">
                            {leg.options.slice(0, 3).map((option, optIndex) => {
                              const isFlight = isFlightType(option.type);
                              const searchUrl = isFlight
                                ? getGoogleFlightsUrl(leg.from, leg.to)
                                : getGoogleSearchUrl(option.type, option.provider, leg.from, leg.to);

                              return (
                                <div
                                  key={optIndex}
                                  className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg p-2 border border-slate-100 dark:border-slate-600"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-blue-500 dark:text-blue-400">
                                      {getTransportIcon(option.type)}
                                    </span>
                                    <div>
                                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{option.provider}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{option.duration} • {option.frequency}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-emerald-600">{option.estimatedCost}</p>
                                    <a
                                      href={searchUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 justify-end"
                                    >
                                      {isFlight ? 'Google Flights' : 'Search'} <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <p className="text-xs text-slate-500 mt-2 italic">
                            {leg.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>

                    {travelPlan.tips.length > 0 && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-800 mb-1">Travel Tips:</p>
                        <ul className="text-xs text-amber-700 space-y-1">
                          {travelPlan.tips.map((tip, i) => (
                            <li key={i}>• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateTravelPlan}
                        disabled={generatingTravelPlan}
                        className="flex-1"
                      >
                        {generatingTravelPlan ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4 mr-2" />
                        )}
                        Regenerate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearTravelPlan}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Add Destination Dialog */}
      <Dialog open={addDestinationOpen} onOpenChange={setAddDestinationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Destination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newDestination.city || ''}
                  onChange={(e) => setNewDestination(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="e.g., Tokyo"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={newDestination.country || ''}
                  onChange={(e) => setNewDestination(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="e.g., Japan"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newDestination.startDate || ''}
                  onChange={(e) => setNewDestination(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newDestination.endDate || ''}
                  onChange={(e) => setNewDestination(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDestinationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDestination}>
              Add Destination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remainingCredits={subscription ? Math.max(0, PLAN_LIMITS[subscription.plan].monthlyCredits - subscription.creditsUsed) : 0}
        planName={subscription?.plan || 'starter'}
      />
    </>
  );
}
