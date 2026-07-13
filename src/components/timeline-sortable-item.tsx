'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineItem } from '@/components/timeline';

interface TimelineSortableItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  isLast?: boolean;
  dotClassName?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
}

export function TimelineSortableItem({
  id,
  children,
  disabled = false,
  isLast,
  dotClassName,
  icon,
  iconClassName,
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
        'relative group/drag',
        isDragging && 'opacity-50 z-50'
      )}
      {...attributes}
    >
      <TimelineItem isLast={isLast} dotClassName={dotClassName} icon={icon} iconClassName={iconClassName}>
        {/* Drag Handle */}
        <button
          type="button"
          {...listeners}
          className={cn(
            'absolute -left-6 top-1 p-1 cursor-grab active:cursor-grabbing rounded hover:bg-muted transition-colors touch-none',
            'opacity-0 group-hover/drag:opacity-50 hover:opacity-100',
            disabled && 'cursor-not-allowed opacity-30'
          )}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        {children}
      </TimelineItem>
    </div>
  );
}
