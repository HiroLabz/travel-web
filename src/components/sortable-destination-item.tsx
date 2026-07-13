'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineItem } from '@/components/timeline';

interface SortableDestinationItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  dotClassName?: string;
  isLast?: boolean;
}

export function SortableDestinationItem({
  id,
  children,
  disabled = false,
  dotClassName,
  isLast,
}: SortableDestinationItemProps) {
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
        'group',
        isDragging && 'opacity-50 z-50',
        !disabled && 'cursor-grab active:cursor-grabbing'
      )}
      {...attributes}
      {...(!disabled ? listeners : {})}
    >
      <TimelineItem dotClassName={dotClassName} isLast={isLast}>
        {/* Drag Handle Icon - visual indicator only */}
        {!disabled && (
          <div
            className={cn(
              'absolute -left-6 top-1 p-1 rounded hover:bg-muted transition-colors',
              'opacity-0 group-hover:opacity-50 hover:opacity-100'
            )}
            aria-hidden="true"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        {children}
      </TimelineItem>
    </div>
  );
}
