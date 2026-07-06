'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';
import { RouteMap } from '@/components/route-map';
import type { RouteWaypoint, RouteSegmentWithMode } from '@/types';

interface RouteData {
  waypoints: RouteWaypoint[];
  segments: RouteSegmentWithMode[];
  totalDistance?: string;
  totalDuration?: string;
}

interface RouteMapClientProps {
  tripId: string;
  routeData: RouteData | null;
}

export function RouteMapClient({ tripId, routeData }: RouteMapClientProps) {
  const router = useRouter();

  if (!routeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <MapPin className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500 mb-4">No route data available</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Route Map
          </h1>
          {(routeData.totalDistance || routeData.totalDuration) && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {routeData.totalDistance && <span>{routeData.totalDistance}</span>}
              {routeData.totalDistance && routeData.totalDuration && <span> • </span>}
              {routeData.totalDuration && <span>{routeData.totalDuration}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Full screen map */}
      <div className="flex-1">
        <RouteMap
          waypoints={routeData.waypoints}
          segments={routeData.segments}
          className="w-full h-full"
        />
      </div>

      {/* Legend Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">1</div>
            <span>Origin</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold">2</div>
            <span>Stops</span>
          </div>
        </div>
      </div>
    </div>
  );
}
