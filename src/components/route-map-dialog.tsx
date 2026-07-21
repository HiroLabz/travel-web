'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/motion/morphing-modal';
import { RouteMap } from './route-map';
import type { RouteWaypoint, RouteSegmentWithMode } from '@/types';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waypoints: RouteWaypoint[];
  segments: RouteSegmentWithMode[];
  mapboxToken: string;
  totalDistance?: string;
  totalDuration?: string;
}

export function RouteMapDialog({
  open,
  onOpenChange,
  waypoints,
  segments,
  mapboxToken,
  totalDistance,
  totalDuration,
}: RouteMapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Route Map</DialogTitle>
              {(totalDistance || totalDuration) && (
                <p className="text-sm text-slate-500 mt-1">
                  {totalDistance && <span>{totalDistance}</span>}
                  {totalDistance && totalDuration && <span> • </span>}
                  {totalDuration && <span>{totalDuration}</span>}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 h-[calc(85vh-80px)]">
          <RouteMap
            waypoints={waypoints}
            segments={segments}
            mapboxToken={mapboxToken}
            className="w-full h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
