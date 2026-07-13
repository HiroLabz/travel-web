import type { Trip, Destination } from '@/types';

export type DestinationStatus = 'completed' | 'current' | 'upcoming';

export interface TripStatus {
  currentDestination: Destination | null;
  currentDestinationIndex: number;
  dayNumber: number;
  totalDays: number;
  destinationStatus: (index: number) => DestinationStatus | null;
}

function toDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getTripStatus(trip: Trip, destinations: Destination[], today: Date = new Date()): TripStatus {
  const todayStart = startOfDay(today);

  const tripStart = toDate(trip.startDate);
  const tripEnd = toDate(trip.endDate);
  const totalDays = tripStart && tripEnd
    ? Math.max(1, Math.round((startOfDay(tripEnd).getTime() - startOfDay(tripStart).getTime()) / 86400000) + 1)
    : trip.days || 1;

  let dayNumber = 1;
  if (tripStart) {
    const diff = Math.round((todayStart.getTime() - startOfDay(tripStart).getTime()) / 86400000) + 1;
    dayNumber = Math.min(Math.max(diff, 1), totalDays);
  }

  const ranges = destinations.map((dest) => ({
    start: toDate(dest.startDate),
    end: toDate(dest.endDate),
  }));

  const statusFor = (index: number): DestinationStatus | null => {
    const range = ranges[index];
    if (!range || !range.start || !range.end) return null;
    const start = startOfDay(range.start);
    const end = startOfDay(range.end);
    if (todayStart > end) return 'completed';
    if (todayStart >= start && todayStart <= end) return 'current';
    return 'upcoming';
  };

  let currentDestinationIndex = destinations.findIndex((_, i) => statusFor(i) === 'current');

  if (currentDestinationIndex === -1) {
    // Fall back to the first destination that hasn't ended yet.
    currentDestinationIndex = destinations.findIndex((_, i) => statusFor(i) !== 'completed');
  }

  if (currentDestinationIndex === -1 && destinations.length > 0) {
    // Trip has fully ended (or no dates at all) — fall back to the last destination.
    currentDestinationIndex = destinations.length - 1;
  }

  return {
    currentDestination: currentDestinationIndex >= 0 ? destinations[currentDestinationIndex] : null,
    currentDestinationIndex,
    dayNumber,
    totalDays,
    destinationStatus: statusFor,
  };
}
