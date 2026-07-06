'use client';

import type { RouteWaypoint, RouteSegmentWithMode } from '@/types';
import { MapPinned, Sparkles } from 'lucide-react';

interface RouteMapProps {
  waypoints: RouteWaypoint[];
  segments: RouteSegmentWithMode[];
  selectedWaypointId?: string;
  onWaypointClick?: (waypoint: RouteWaypoint) => void;
  className?: string;
  mapboxToken?: string;
}

export function RouteMap({ className }: RouteMapProps) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-dashed border-slate-300 dark:border-slate-700 ${className ?? ''}`}
    >
      <div className="text-center px-6 py-10 max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPinned className="h-6 w-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 mb-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          Coming Soon
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Interactive route maps
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Map visualization is temporarily unavailable. You can still plan and
          reorder your stops below.
        </p>
      </div>
    </div>
  );
}
