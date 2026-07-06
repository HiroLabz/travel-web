'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineSortableItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function TimelineSortableItem({
  id,
  children,
  disabled = false,
}: TimelineSortableItemProps) {
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
        'flex gap-4 relative group/drag',
        isDragging && 'opacity-50 z-50'
      )}
      {...attributes}
    >
      {/* Drag Handle - positioned to the left */}
      <button
        type="button"
        {...listeners}
        className={cn(
          'absolute -left-6 top-4 p-1 cursor-grab active:cursor-grabbing rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors touch-none',
          'opacity-0 group-hover/drag:opacity-50 hover:opacity-100',
          disabled && 'cursor-not-allowed opacity-30'
        )}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </button>

      {/* Original content */}
      {children}
    </div>
  );
}
