'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';

interface DroppableDateContainerProps {
  date: string;
  itemIds: string[];
  children: React.ReactNode;
  className?: string;
}

export function DroppableDateContainer({
  date,
  itemIds,
  children,
  className,
}: DroppableDateContainerProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `date-${date}`,
    data: { date },
  });

  // Check if dragging from another date
  const isDraggingFromOtherDate = active?.data?.current?.date !== date;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-200 rounded-lg',
        isOver && isDraggingFromOtherDate && 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset',
        className
      )}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>

      {/* Drop zone indicator when empty or dragging */}
      {isOver && isDraggingFromOtherDate && itemIds.length === 0 && (
        <div className="h-16 border-2 border-dashed border-indigo-300 rounded-lg flex items-center justify-center text-indigo-500 text-sm">
          Drop here
        </div>
      )}
    </div>
  );
}
