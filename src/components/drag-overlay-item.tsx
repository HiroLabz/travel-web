'use client';

import { DragOverlay } from '@dnd-kit/core';
import { WizardItineraryItem } from '@/types';
import {
  Clock,
  Plane,
  Car,
  Ship,
  Hotel,
  MapPinned,
} from 'lucide-react';

interface ItineraryDragOverlayProps {
  activeItem: WizardItineraryItem | null;
}

export function ItineraryDragOverlay({ activeItem }: ItineraryDragOverlayProps) {
  if (!activeItem) return null;

  const getTravelIcon = () => {
    switch (activeItem.travelType) {
      case 'air':
        return <Plane className="w-4 h-4 text-indigo-500" />;
      case 'land':
        return <Car className="w-4 h-4 text-indigo-500" />;
      case 'sea':
        return <Ship className="w-4 h-4 text-indigo-500" />;
      case 'accommodation':
        return <Hotel className="w-4 h-4 text-indigo-500" />;
      default:
        return <MapPinned className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <DragOverlay>
      <div className="bg-white shadow-xl rounded-lg p-3 border-2 border-indigo-500 rotate-2 max-w-[300px]">
        <div className="flex items-center gap-2 font-medium text-slate-800">
          {getTravelIcon()}
          <span className="truncate">{activeItem.placeName}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
          <Clock className="w-3 h-3" />
          <span>{activeItem.timeFrom} - {activeItem.timeTo}</span>
        </div>
      </div>
    </DragOverlay>
  );
}
