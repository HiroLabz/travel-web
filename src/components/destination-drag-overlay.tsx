'use client';

import { DragOverlay } from '@dnd-kit/core';
import { Destination } from '@/types';
import { MapPin } from 'lucide-react';

interface DestinationDragOverlayProps {
  activeDestination: Destination | null;
}

export function DestinationDragOverlay({ activeDestination }: DestinationDragOverlayProps) {
  if (!activeDestination) return null;

  return (
    <DragOverlay>
      <div className="bg-white shadow-xl rounded-lg p-3 border-2 border-indigo-500 rotate-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-500" />
          <div>
            <div className="font-bold text-slate-900">{activeDestination.city}</div>
            <div className="text-xs text-slate-500">{activeDestination.country}</div>
          </div>
        </div>
      </div>
    </DragOverlay>
  );
}
