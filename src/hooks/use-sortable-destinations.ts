'use client';

import { useState, useCallback } from 'react';
import {
  DragStartEvent,
  DragEndEvent,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { Destination } from '@/types';
import { reorderDestinationsAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

interface UseSortableDestinationsOptions {
  destinations: Destination[];
  tripId: string;
  onDestinationsChange: (destinations: Destination[]) => void;
}

export function useSortableDestinations({
  destinations,
  tripId,
  onDestinationsChange,
}: UseSortableDestinationsOptions) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Configure sensors with activation constraints
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

  // Get the active destination being dragged
  const activeDestination = activeId !== null
    ? destinations[Number(activeId)] || null
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;
      if (active.id === over.id) return;

      const oldIndex = Number(active.id);
      const newIndex = Number(over.id);

      // Optimistic update
      const newDestinations = arrayMove(destinations, oldIndex, newIndex);
      onDestinationsChange(newDestinations);

      // Persist to server
      try {
        const result = await reorderDestinationsAction(tripId, oldIndex, newIndex);

        if (result.error) {
          // Rollback on error
          onDestinationsChange(destinations);
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Reordered',
            description: 'Route plan updated.',
          });
        }
      } catch {
        // Rollback on error
        onDestinationsChange(destinations);
        toast({
          title: 'Error',
          description: 'Failed to save changes',
          variant: 'destructive',
        });
      }
    },
    [destinations, tripId, onDestinationsChange, toast]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return {
    sensors,
    activeId,
    activeDestination,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
