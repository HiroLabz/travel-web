'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Car, Bike, Footprints, Navigation, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RouteSegmentWithMode, CommuteTransportMode } from '@/types';
import { RouteTimeEditor } from './route-time-editor';
import { getTransportModeColor } from './route-marker';

interface TimeSlot {
  date: string;
  timeFrom: string;
  timeTo: string;
}

interface RouteSegmentListProps {
  segments: RouteSegmentWithMode[];
  onTransportModeChange: (segmentId: string, mode: CommuteTransportMode) => void;
  onTimeSave: (itemId: string, newTime: TimeSlot) => Promise<void>;
  suggestedTimes?: Record<string, TimeSlot>;
  arrivalTimes?: Record<string, string>;
  conflicts?: Set<string>;
  className?: string;
}

const transportModeIcons: Record<CommuteTransportMode, React.ReactNode> = {
  driving: <Car className="w-4 h-4" />,
  cycling: <Bike className="w-4 h-4" />,
  walking: <Footprints className="w-4 h-4" />,
  'driving-traffic': <Navigation className="w-4 h-4" />,
};

const transportModeLabels: Record<CommuteTransportMode, string> = {
  driving: 'Drive',
  cycling: 'Bike',
  walking: 'Walk',
  'driving-traffic': 'Drive (traffic)',
};

export function RouteSegmentList({
  segments,
  onTransportModeChange,
  onTimeSave,
  suggestedTimes = {},
  arrivalTimes = {},
  conflicts = new Set(),
  className,
}: RouteSegmentListProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  const toggleExpanded = (segmentId: string) => {
    setExpandedSegments(prev => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  };

  if (segments.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No route segments yet</p>
        <p className="text-xs mt-1">Select activities to generate a route</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {segments.map((segment, index) => {
        const isExpanded = expandedSegments.has(segment.id);
        const hasConflict = conflicts.has(segment.to.itemId);
        const destinationTime = segment.to.scheduledTime;

        // Check if this is a same-location segment (0 distance)
        const isSameLocation = segment.distance.value === 0;

        return (
          <div
            key={segment.id}
            className={cn(
              'border rounded-lg overflow-hidden transition-all',
              hasConflict
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20'
                : isSameLocation
                ? 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            )}
          >
            {/* Segment Header */}
            <button
              onClick={() => toggleExpanded(segment.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {/* Expand/Collapse Icon */}
              <div className="text-slate-400">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>

              {/* Segment Number */}
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-medium">
                {index + 1}
              </div>

              {/* From -> To */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                    {segment.from.name}
                  </span>
                  <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-400" />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                    {segment.to.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  {isSameLocation ? (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <MapPin className="w-3 h-3" />
                      Same location
                    </span>
                  ) : (
                    <>
                      <span>{segment.distance.text}</span>
                      <span>•</span>
                      <span>{segment.duration.text}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Transport Mode Badge */}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs"
                style={{ backgroundColor: isSameLocation ? '#3b82f6' : getTransportModeColor(segment.transportMode) }}
              >
                {isSameLocation ? <MapPin className="w-4 h-4" /> : transportModeIcons[segment.transportMode]}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700">
                {/* Same Location Notice */}
                {isSameLocation && (
                  <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      These activities are at the same location. No travel required.
                    </p>
                  </div>
                )}

                {/* Transport Mode Selector - only show for segments with distance */}
                {!isSameLocation && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Transport Mode</p>
                    <div className="flex gap-1 flex-wrap">
                      {(['driving', 'walking', 'cycling', 'driving-traffic'] as CommuteTransportMode[]).map(
                        mode => (
                          <Button
                            key={mode}
                            variant={segment.transportMode === mode ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onTransportModeChange(segment.id, mode)}
                            className={cn(
                              'h-8 gap-1.5',
                              segment.transportMode === mode && 'ring-2 ring-offset-1'
                            )}
                            style={
                              segment.transportMode === mode
                                ? { backgroundColor: getTransportModeColor(mode) }
                                : undefined
                            }
                          >
                            {transportModeIcons[mode]}
                            <span className="hidden sm:inline">{transportModeLabels[mode]}</span>
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Time Editor for Destination */}
                {destinationTime && (
                  <RouteTimeEditor
                    itemId={segment.to.itemId}
                    itemName={segment.to.name}
                    currentTime={destinationTime}
                    suggestedTime={suggestedTimes[segment.to.itemId]}
                    arrivalTime={arrivalTimes[segment.to.itemId]}
                    hasConflict={hasConflict}
                    onSave={onTimeSave}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
