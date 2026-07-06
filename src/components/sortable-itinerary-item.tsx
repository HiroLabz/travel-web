'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableItineraryItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SortableItineraryItem({
  id,
  children,
  disabled = false,
}: SortableItineraryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 bg-slate-50 rounded-lg border border-slate-200 group hover:border-primary/30 transition-colors touch-none',
        isDragging && 'opacity-50 shadow-lg border-primary/50 bg-primary/10 z-50',
        !disabled && 'cursor-grab active:cursor-grabbing'
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle Indicator */}
        <div
          className={cn(
            'p-1 rounded transition-colors',
            'opacity-50 group-hover:opacity-100',
            disabled && 'opacity-30'
          )}
          aria-hidden="true"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
