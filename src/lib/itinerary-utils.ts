import { WizardItineraryItem } from '@/types';
import { ReorderUpdate } from '@/types/dnd';

/**
 * Get item duration in minutes
 */
export function getItemDuration(item: WizardItineraryItem): number {
  const [fromHour, fromMin] = item.timeFrom.split(':').map(Number);
  const [toHour, toMin] = item.timeTo.split(':').map(Number);
  const durationMinutes = (toHour * 60 + toMin) - (fromHour * 60 + fromMin);
  return Math.max(durationMinutes, 30); // Minimum 30 min
}

/**
 * Format time from minutes since midnight
 */
export function formatTimeFromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Parse time string to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

/**
 * Recalculate times for items in a date group, maintaining relative durations
 */
export function recalculateTimesForItems(
  items: WizardItineraryItem[],
  startTime: string = '09:00',
  gapMinutes: number = 15
): ReorderUpdate[] {
  const result: ReorderUpdate[] = [];
  let currentTime = parseTimeToMinutes(startTime);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const duration = getItemDuration(item);

    const timeFrom = formatTimeFromMinutes(currentTime);
    const timeTo = formatTimeFromMinutes(currentTime + duration);

    result.push({
      id: item.id,
      order: i,
      timeFrom,
      timeTo,
      dateFrom: item.dateFrom,
      dateTo: item.dateTo,
    });

    // Next item starts after this one plus gap
    currentTime = currentTime + duration + gapMinutes;
  }

  return result;
}

/**
 * Reorder items within the same date using drag and drop
 */
export function reorderItemsWithinDate(
  items: WizardItineraryItem[],
  activeId: string,
  overId: string
): ReorderUpdate[] {
  const sortedItems = [...items].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
  const activeIndex = sortedItems.findIndex(i => i.id === activeId);
  const overIndex = sortedItems.findIndex(i => i.id === overId);

  if (activeIndex === -1 || overIndex === -1) return [];
  if (activeIndex === overIndex) return [];

  // Remove item from current position and insert at new position
  const [movedItem] = sortedItems.splice(activeIndex, 1);
  sortedItems.splice(overIndex, 0, movedItem);

  // Get start time from first item (preserve it)
  const startTime = items[0]?.timeFrom || '09:00';

  return recalculateTimesForItems(sortedItems, startTime);
}

/**
 * Move an item from one date to another
 */
export function moveItemCrossDate(
  allItems: WizardItineraryItem[],
  itemId: string,
  sourceDate: string,
  targetDate: string,
  targetIndex: number
): ReorderUpdate[] {
  // Find the item being moved
  const movedItem = allItems.find(i => i.id === itemId);
  if (!movedItem) return [];

  // Get items for both dates
  const sourceItems = allItems
    .filter(i => i.dateFrom === sourceDate && i.id !== itemId)
    .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));

  const targetItems = allItems
    .filter(i => i.dateFrom === targetDate)
    .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));

  // Insert moved item at target position with updated date
  const movedItemWithNewDate = {
    ...movedItem,
    dateFrom: targetDate,
    dateTo: targetDate,
  };
  targetItems.splice(targetIndex, 0, movedItemWithNewDate);

  // Recalculate times for source date (if there are remaining items)
  const sourceUpdates = sourceItems.length > 0
    ? recalculateTimesForItems(sourceItems, sourceItems[0]?.timeFrom || '09:00')
    : [];

  // Recalculate times for target date
  const targetStartTime = targetItems.length > 1 ? targetItems[0]?.timeFrom : '09:00';
  const targetUpdates = recalculateTimesForItems(targetItems, targetStartTime);

  // Ensure the moved item has the updated date fields
  const finalTargetUpdates = targetUpdates.map(update => {
    if (update.id === itemId) {
      return {
        ...update,
        dateFrom: targetDate,
        dateTo: targetDate,
      };
    }
    return update;
  });

  return [...sourceUpdates, ...finalTargetUpdates];
}

/**
 * Group items by date
 */
export function groupItemsByDate(
  items: WizardItineraryItem[]
): Record<string, WizardItineraryItem[]> {
  return items.reduce((acc, item) => {
    const date = item.dateFrom;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, WizardItineraryItem[]>);
}
