'use client';

import { useState, useCallback } from 'react';
import {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { WizardItineraryItem } from '@/types';
import { ReorderUpdate } from '@/types/dnd';
import {
  reorderWizardItemsAction,
  combineWizardItemsToDocAction,
} from '@/lib/actions';
import {
  reorderItemsWithinDate,
  moveItemCrossDate,
  groupItemsByDate,
} from '@/lib/itinerary-utils';
import { useToast } from '@/hooks/use-toast';

export interface PendingTimeAdjustment {
  item: WizardItineraryItem;
  originalTimeFrom: string;
  originalTimeTo: string;
  newTimeFrom: string;
  newTimeTo: string;
  newDate: string;
  updates: ReorderUpdate[];
  newItems: WizardItineraryItem[];
}

interface UseSortableItineraryOptions {
  items: WizardItineraryItem[];
  tripId: string;
  onItemsChange: (items: WizardItineraryItem[]) => void;
  onCombineComplete?: (content: string) => void;
}

export function useSortableItinerary({
  items,
  tripId,
  onItemsChange,
  onCombineComplete,
}: UseSortableItineraryOptions) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [pendingAdjustment, setPendingAdjustment] = useState<PendingTimeAdjustment | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Configure sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requires 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get the active item being dragged
  const activeItem = activeId
    ? items.find((item) => item.id === activeId) || null
    : null;

  // Group items by date for easier lookup
  const groupedItems = groupItemsByDate(items);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id || null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

      if (!over) return;
      if (active.id === over.id) return;

      const activeItemData = items.find((item) => item.id === active.id);
      if (!activeItemData) return;

      const sourceDate = activeItemData.dateFrom;
      let targetDate = sourceDate;
      let updates: ReorderUpdate[] = [];

      // Check if dropping on a date container
      const overIdString = String(over.id);
      if (overIdString.startsWith('date-')) {
        targetDate = overIdString.replace('date-', '');
      } else {
        // Dropping on another item - get that item's date
        const overItem = items.find((item) => item.id === over.id);
        if (overItem) {
          targetDate = overItem.dateFrom;
        }
      }

      // Determine if this is a same-date or cross-date move
      if (sourceDate === targetDate) {
        // Same-date reorder
        const dateItems = groupedItems[sourceDate] || [];
        updates = reorderItemsWithinDate(
          dateItems,
          String(active.id),
          String(over.id)
        );
      } else {
        // Cross-date move
        const targetItems = groupedItems[targetDate] || [];
        const targetIndex = overIdString.startsWith('date-')
          ? targetItems.length
          : targetItems.findIndex((item) => item.id === over.id);

        updates = moveItemCrossDate(
          items,
          String(active.id),
          sourceDate,
          targetDate,
          Math.max(0, targetIndex)
        );
      }

      if (updates.length === 0) return;

      // Calculate new items
      const newItems = items.map((item) => {
        const update = updates.find((u) => u.id === item.id);
        if (update) {
          return {
            ...item,
            order: update.order,
            timeFrom: update.timeFrom,
            timeTo: update.timeTo,
            dateFrom: update.dateFrom || item.dateFrom,
            dateTo: update.dateTo || item.dateTo,
          };
        }
        return item;
      });

      // Get the proposed new times for the moved item
      const movedItemUpdate = updates.find((u) => u.id === active.id);
      if (!movedItemUpdate) return;

      // Show confirmation dialog with proposed time adjustment
      setPendingAdjustment({
        item: activeItemData,
        originalTimeFrom: activeItemData.timeFrom,
        originalTimeTo: activeItemData.timeTo,
        newTimeFrom: movedItemUpdate.timeFrom,
        newTimeTo: movedItemUpdate.timeTo,
        newDate: targetDate,
        updates,
        newItems,
      });
    },
    [items, groupedItems]
  );

  const applyTimeAdjustment = useCallback(
    async (customTimeFrom?: string, customTimeTo?: string) => {
      if (!pendingAdjustment) return;

      setIsApplying(true);

      let { updates, newItems } = pendingAdjustment;

      // If custom times provided, update the moved item's times
      if (customTimeFrom && customTimeTo) {
        updates = updates.map((u) => {
          if (u.id === pendingAdjustment.item.id) {
            return { ...u, timeFrom: customTimeFrom, timeTo: customTimeTo };
          }
          return u;
        });

        newItems = newItems.map((item) => {
          if (item.id === pendingAdjustment.item.id) {
            return { ...item, timeFrom: customTimeFrom, timeTo: customTimeTo };
          }
          return item;
        });
      }

      // Apply optimistic update
      onItemsChange(newItems);

      // Persist to server
      try {
        const result = await reorderWizardItemsAction(
          tripId,
          pendingAdjustment.item.id,
          updates.find((u) => u.id === pendingAdjustment.item.id)?.order || 0,
          updates
        );

        if (result.error) {
          // Rollback on error
          onItemsChange(items);
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
          setIsApplying(false);
          setPendingAdjustment(null);
          return;
        }

        // Update document
        if (onCombineComplete) {
          const docResult = await combineWizardItemsToDocAction(tripId, newItems);
          if (docResult.content) {
            onCombineComplete(docResult.content);
          }
        }

        toast({
          title: 'Reordered',
          description:
            pendingAdjustment.item.dateFrom !== pendingAdjustment.newDate
              ? 'Item moved to new date.'
              : 'Schedule updated.',
        });
      } catch {
        // Rollback on error
        onItemsChange(items);
        toast({
          title: 'Error',
          description: 'Failed to save changes',
          variant: 'destructive',
        });
      }

      setIsApplying(false);
      setPendingAdjustment(null);
    },
    [pendingAdjustment, items, tripId, onItemsChange, onCombineComplete, toast]
  );

  const cancelTimeAdjustment = useCallback(() => {
    setPendingAdjustment(null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  return {
    sensors,
    activeId,
    overId,
    activeItem,
    groupedItems,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    // Time adjustment confirmation
    pendingAdjustment,
    isApplying,
    applyTimeAdjustment,
    cancelTimeAdjustment,
  };
}
