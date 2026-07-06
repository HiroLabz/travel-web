'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableDestinationItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SortableDestinationItem({
  id,
  children,
  disabled = false,
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
        'relative pl-6 group',
        isDragging && 'opacity-50 z-50',
        !disabled && 'cursor-grab active:cursor-grabbing'
      )}
      {...attributes}
      {...(!disabled ? listeners : {})}
    >
      {/* Drag Handle Icon - visual indicator only */}
      {!disabled && (
        <div
          className={cn(
            'absolute left-0 top-1 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
            'opacity-0 group-hover:opacity-50 hover:opacity-100'
          )}
          aria-hidden="true"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
      )}

      {/* Timeline dot */}
      <span className="absolute -left-[21px] top-1 h-4 w-4 rounded-full border-4 border-indigo-100 dark:border-indigo-900 bg-indigo-500 block"></span>

      {children}
    </div>
  );
}
