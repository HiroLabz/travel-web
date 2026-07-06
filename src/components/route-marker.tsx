'use client';

import { cn } from '@/lib/utils';

interface RouteMarkerProps {
  number: number;
  isOrigin?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function RouteMarker({
  number,
  isOrigin = false,
  isSelected = false,
  onClick,
  className,
}: RouteMarkerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-full font-semibold text-white shadow-lg transition-all duration-200',
        'min-w-[32px] min-h-[32px] w-8 h-8 text-sm',
        'hover:scale-110 active:scale-95',
        isOrigin
          ? 'bg-blue-600 ring-2 ring-blue-300'
          : 'bg-emerald-600 ring-2 ring-emerald-300',
        isSelected && 'ring-4 ring-yellow-400 scale-110',
        className
      )}
      aria-label={`Waypoint ${number}${isOrigin ? ' (Origin)' : ''}`}
    >
      {number}
    </button>
  );
}

// Transport mode colors for route lines
export const TRANSPORT_MODE_COLORS: Record<string, string> = {
  driving: '#3b82f6', // blue
  walking: '#10b981', // emerald
  cycling: '#f59e0b', // amber
  'driving-traffic': '#6366f1', // indigo
};

export function getTransportModeColor(mode: string): string {
  return TRANSPORT_MODE_COLORS[mode] || '#3b82f6';
}
