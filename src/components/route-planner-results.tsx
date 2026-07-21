'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/motion/input';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MapPin,
  Clock,
  Car,
  GripVertical,
  Plus,
  Navigation,
  Timer,
  Route as RouteIcon,
  Landmark,
  UtensilsCrossed,
  Coffee,
  ShoppingBag,
  Palette,
  TreePine,
  Clapperboard,
  Pencil,
  Check,
  Ticket,
  Loader2,
  Footprints,
  Map,
} from 'lucide-react';
import type {
  RoutePlannerResults,
  RoutePlannerResultItem,
  Household,
  RoutePlannerPlaceCategory,
  ExchangeRateCache,
  RouteWaypoint,
  RouteSegmentWithMode,
  CommuteTransportMode,
} from '@/types';
import { formatTime, formatCurrency } from '@/lib/constants';
import { convertCurrency } from '@/lib/exchange-rates';
import { cn } from '@/lib/utils';
import { RouteMapDialog } from './route-map-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

// Transport mode icon mapping
const TRANSPORT_MODE_ICONS: Record<CommuteTransportMode, React.ComponentType<{ className?: string }>> = {
  driving: Car,
  walking: Footprints,
  cycling: Car, // fallback to Car for cycling
  'driving-traffic': Car,
};

// Map category to lucide icon components
const CATEGORY_ICON_COMPONENTS: Record<
  RoutePlannerPlaceCategory,
  React.ComponentType<{ className?: string }>
> = {
  attraction: Landmark,
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  shopping: ShoppingBag,
  museum: Palette,
  park: TreePine,
  entertainment: Clapperboard,
  other: MapPin,
};

interface RoutePlannerResultsViewProps {
  results: RoutePlannerResults;
  household: Household;
  exchangeRates?: ExchangeRateCache;
  onReorder: (items: RoutePlannerResultItem[]) => void;
  onAddToItinerary: (item: RoutePlannerResultItem) => void;
  onAddAllToItinerary: () => void;
  onUpdateItem?: (updatedItem: RoutePlannerResultItem) => void;
  isMobilePage?: boolean;
  isAddingAll?: boolean;
  tripId?: string;
  mapboxToken?: string;
}

// Helper to parse "HH:mm" to minutes since midnight
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper to convert minutes since midnight to "HH:mm"
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Sortable item component
function SortableResultItem({
  item,
  household,
  exchangeRates,
  onAddToItinerary,
  onUpdateItem,
  isLast,
}: {
  item: RoutePlannerResultItem;
  household: Household;
  exchangeRates?: ExchangeRateCache;
  onAddToItinerary: (item: RoutePlannerResultItem) => void;
  onUpdateItem?: (updatedItem: RoutePlannerResultItem) => void;
  isLast: boolean;
}) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editArrival, setEditArrival] = useState(item.estimatedArrival);
  const [editDeparture, setEditDeparture] = useState(item.estimatedDeparture);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.place.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const timeFormat = household?.timeFormat || '12h';
  const CategoryIcon = item.place.category
    ? CATEGORY_ICON_COMPONENTS[item.place.category]
    : MapPin;

  const handleSaveTime = () => {
    if (onUpdateItem) {
      onUpdateItem({
        ...item,
        estimatedArrival: editArrival,
        estimatedDeparture: editDeparture,
        isTimeEdited: true,
      });
    }
    setIsEditingTime(false);
  };

  const handleCancelEdit = () => {
    setEditArrival(item.estimatedArrival);
    setEditDeparture(item.estimatedDeparture);
    setIsEditingTime(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative', isDragging && 'z-50')}
    >
      {/* Connection line to previous */}
      {item.orderNumber > 1 && (
        <div className="absolute left-6 -top-4 w-0.5 h-4 bg-blue-200" />
      )}

      <div
        className={cn(
          'bg-white rounded-lg border border-slate-200 p-4 transition-all',
          isDragging && 'shadow-lg ring-2 ring-blue-500',
          item.place.isMealStop && 'border-amber-300 bg-amber-50/50'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            type="button"
            className="mt-1 p-1 rounded hover:bg-slate-100 cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-slate-400" />
          </button>

          {/* Order number with category icon */}
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              item.place.isMealStop
                ? 'bg-amber-500 text-white'
                : 'bg-blue-500 text-white'
            )}
          >
            <CategoryIcon className="w-4 h-4" />
          </div>

          {/* Place info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-800">{item.place.name}</p>
              {item.place.isMealStop && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {item.place.mealType === 'lunch' ? 'Lunch' : 'Dinner'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              {item.place.address}
            </p>

            {/* Travel info from previous */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
              {(() => {
                const TransportIcon = TRANSPORT_MODE_ICONS[item.transportMode] || Car;
                const isWalking = item.transportMode === 'walking';
                return (
                  <div className={cn(
                    'flex items-center gap-1',
                    isWalking ? 'text-emerald-600' : 'text-slate-500'
                  )}>
                    <TransportIcon className="w-3.5 h-3.5" />
                    <span>{item.distanceFromPrevious.text}</span>
                    {isWalking && <span className="text-emerald-500">(walk)</span>}
                  </div>
                );
              })()}
              <div className="flex items-center gap-1 text-slate-500">
                <Navigation className="w-3.5 h-3.5" />
                <span>{item.travelTimeFromPrevious.text}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600">
                <Timer className="w-3.5 h-3.5" />
                <span>{item.place.visitDuration} min visit</span>
              </div>
              {/* Entrance fee for this place */}
              {item.place.entranceFee !== undefined && item.place.entranceFee > 0 && (
                <div className="flex items-center gap-1 text-purple-600">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>
                    {(() => {
                      const householdCurrency = household?.currency || 'USD';
                      const feeCurrency = item.place.currency || 'USD';

                      // If same currency or no exchange rates, show original
                      if (feeCurrency === householdCurrency || !exchangeRates) {
                        return formatCurrency(item.place.entranceFee, householdCurrency);
                      }

                      // Convert to household currency
                      const converted = convertCurrency(
                        item.place.entranceFee,
                        feeCurrency,
                        householdCurrency,
                        exchangeRates
                      );

                      if (converted) {
                        return formatCurrency(converted.convertedAmount, householdCurrency);
                      }

                      // Fallback to original
                      return formatCurrency(item.place.entranceFee, feeCurrency);
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Estimated times - editable */}
            {item.estimatedArrival && item.estimatedDeparture && (
              <div className="mt-2">
                {isEditingTime ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Input
                        type="time"
                        value={editArrival}
                        onChange={(e) => setEditArrival(e.target.value)}
                        className="w-24 h-7 text-xs"
                      />
                      <span className="text-xs text-slate-400">-</span>
                      <Input
                        type="time"
                        value={editDeparture}
                        onChange={(e) => setEditDeparture(e.target.value)}
                        className="w-24 h-7 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveTime}
                      className="h-7 px-2"
                    >
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-7 px-2"
                    >
                      <span className="text-xs text-slate-500">Cancel</span>
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingTime(true)}
                    className="flex items-center gap-2 text-xs text-blue-600 font-medium hover:text-blue-700 group"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatTime(item.estimatedArrival, timeFormat)} -{' '}
                      {formatTime(item.estimatedDeparture, timeFormat)}
                    </span>
                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {item.isTimeEdited && (
                      <span className="text-xs text-amber-600">(edited)</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Add to itinerary button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddToItinerary(item)}
            className="flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Add</span>
          </Button>
        </div>
      </div>

      {/* Connection line to next */}
      {!isLast && (
        <div className="absolute left-6 -bottom-4 w-0.5 h-4 bg-blue-200" />
      )}
    </div>
  );
}

export function RoutePlannerResultsView({
  results,
  household,
  exchangeRates,
  onReorder,
  onAddToItinerary,
  onAddAllToItinerary,
  onUpdateItem,
  isMobilePage = false,
  isAddingAll = false,
  tripId,
  mapboxToken,
}: RoutePlannerResultsViewProps) {
  const [items, setItems] = useState(results.items);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const householdCurrency = household?.currency || 'USD';
  const isMobile = useIsMobile();
  const router = useRouter();

  // Generate waypoints and segments for the map
  const { waypoints, segments } = useMemo(() => {
    const waypointsList: RouteWaypoint[] = [];
    const segmentsList: RouteSegmentWithMode[] = [];

    // Add origin hotel as first waypoint
    if (results.originHotel.location) {
      waypointsList.push({
        id: results.originHotel.id,
        itemId: results.originHotel.id,
        name: results.originHotel.name,
        location: results.originHotel.location,
        order: 0,
      });
    }

    // Add each place as a waypoint
    items.forEach((item, index) => {
      if (item.place.location) {
        waypointsList.push({
          id: item.place.id,
          itemId: item.place.existingActivityId || item.place.id,
          name: item.place.name,
          location: item.place.location,
          order: index + 1,
          scheduledTime: {
            date: '',
            timeFrom: item.estimatedArrival,
            timeTo: item.estimatedDeparture,
          },
        });
      }
    });

    // Create segments between waypoints
    for (let i = 0; i < waypointsList.length - 1; i++) {
      const from = waypointsList[i];
      const to = waypointsList[i + 1];
      const item = items[i]; // The destination item has the transport mode

      segmentsList.push({
        id: `${from.id}_to_${to.id}`,
        from,
        to,
        transportMode: item?.transportMode || 'driving',
        distance: item?.distanceFromPrevious || { text: '', value: 0 },
        duration: item?.travelTimeFromPrevious || { text: '', value: 0 },
        geometry: {
          coordinates: [
            [from.location.lng, from.location.lat],
            [to.location.lng, to.location.lat],
          ],
        },
      });
    }

    return { waypoints: waypointsList, segments: segmentsList };
  }, [results.originHotel, items]);

  // Handle View on Map click
  const handleViewMap = () => {
    if (isMobile && tripId) {
      // On mobile, navigate to full-screen map page
      const routeData = {
        waypoints,
        segments,
        totalDistance: results.totalDistance.text,
        totalDuration: results.totalTravelTime.text,
      };
      const encodedData = encodeURIComponent(JSON.stringify(routeData));
      router.push(`/trip/${tripId}/route-map?data=${encodedData}`);
    } else {
      // On desktop, open dialog
      setMapDialogOpen(true);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Recalculate times when items are reordered
  const recalculateTimes = useCallback(
    (reorderedItems: RoutePlannerResultItem[]): RoutePlannerResultItem[] => {
      const startTime = parseTimeToMinutes(results.startTime);
      let currentTime = startTime;

      return reorderedItems.map((item, index) => {
        // If this item has manually edited times, preserve them
        if (item.isTimeEdited) {
          currentTime =
            parseTimeToMinutes(item.estimatedDeparture) ||
            currentTime + item.place.visitDuration;
          return {
            ...item,
            orderNumber: index + 1,
          };
        }

        // Calculate arrival time (add travel time from previous)
        const arrivalTime = currentTime + item.travelTimeFromPrevious.value;
        const departureTime = arrivalTime + item.place.visitDuration;

        currentTime = departureTime;

        return {
          ...item,
          orderNumber: index + 1,
          estimatedArrival: minutesToTime(arrivalTime),
          estimatedDeparture: minutesToTime(departureTime),
        };
      });
    },
    [results.startTime]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.place.id === active.id);
      const newIndex = items.findIndex((item) => item.place.id === over.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      const recalculatedItems = recalculateTimes(reorderedItems);

      setItems(recalculatedItems);
      onReorder(recalculatedItems);
    }
  };

  const handleUpdateItem = (updatedItem: RoutePlannerResultItem) => {
    const newItems = items.map((item) =>
      item.place.id === updatedItem.place.id ? updatedItem : item
    );
    // Recalculate times for items after the edited one
    const recalculatedItems = recalculateTimes(newItems);
    setItems(recalculatedItems);
    onReorder(recalculatedItems);
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
  };

  const timeFormat = household?.timeFormat || '12h';

  // Calculate total entrance fees converted to household currency
  const totalEntranceFees = items.reduce((sum, item) => {
    if (!item.place.entranceFee || item.place.entranceFee <= 0) return sum;

    const feeCurrency = item.place.currency || 'USD';

    // If same currency or no exchange rates, add original
    if (feeCurrency === householdCurrency || !exchangeRates) {
      return sum + item.place.entranceFee;
    }

    // Convert to household currency
    const converted = convertCurrency(
      item.place.entranceFee,
      feeCurrency,
      householdCurrency,
      exchangeRates
    );

    return sum + (converted?.convertedAmount || item.place.entranceFee);
  }, 0);

  return (
    <div className={cn('space-y-4', isMobilePage && 'pb-24')}>
      {/* Summary card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <RouteIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Route Summary</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Total Distance</p>
            <p className="font-semibold text-slate-800">
              {results.totalDistance.text}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Travel Time</p>
            <p className="font-semibold text-slate-800">
              {results.totalTravelTime.text}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Visit Time</p>
            <p className="font-semibold text-slate-800">
              {Math.floor(results.totalVisitTime / 60)}h{' '}
              {results.totalVisitTime % 60}m
            </p>
          </div>
          {totalEntranceFees > 0 && (
            <div>
              <p className="text-xs text-slate-500">Entrance Fees</p>
              <p className="font-semibold text-purple-600">
                {formatCurrency(totalEntranceFees, householdCurrency)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {items.length} places to visit
            </span>
            <span className="text-slate-600">
              Starting at {formatTime(results.startTime, timeFormat)}
            </span>
          </div>
          {/* View on Map button */}
          {waypoints.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewMap}
              className="w-full mt-3"
            >
              <Map className="w-4 h-4 mr-2" />
              View Route on Map
            </Button>
          )}
        </div>
      </div>

      {/* Origin hotel */}
      <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-600 font-medium">Starting from</p>
          <p className="font-medium text-slate-800 truncate">
            {results.originHotel.name}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {results.originHotel.address}
          </p>
        </div>
      </div>

      {/* Sortable results list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.place.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {items.map((item, index) => (
              <SortableResultItem
                key={item.place.id}
                item={item}
                household={household}
                exchangeRates={exchangeRates}
                onAddToItinerary={onAddToItinerary}
                onUpdateItem={handleUpdateItem}
                isLast={index === items.length - 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add all button */}
      {!isMobilePage && (
        <div className="pt-4 border-t border-slate-200">
          <Button
            onClick={onAddAllToItinerary}
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

      {/* Route Map Dialog (Desktop only) */}
      <RouteMapDialog
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        waypoints={waypoints}
        segments={segments}
        mapboxToken={mapboxToken ?? ''}
        totalDistance={results.totalDistance.text}
        totalDuration={results.totalTravelTime.text}
      />
    </div>
  );
}
