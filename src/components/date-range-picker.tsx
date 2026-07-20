'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/motion/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

function toDate(v?: string) {
  if (!v) return undefined;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DateRangePickerProps {
  /** ISO date, "YYYY-MM-DD". */
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
  /** ISO date floor — dates before this are disabled on the calendar. */
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  'aria-label'?: string;
  /** Fires when the calendar panel opens or closes — lets the caller reserve layout space so the panel doesn't overlap content below it. */
  onOpenChange?: (open: boolean) => void;
}

// shadcn/ui Range Picker (Calendar mode="range") composed with beUI's
// Popover, plus the Date of Birth pattern's dropdown month/year captions so
// jumping months ahead doesn't take a click per month.
export function DateRangePicker({
  from,
  to,
  onChange,
  min,
  disabled,
  placeholder = 'Select dates',
  className,
  triggerClassName,
  'aria-label': ariaLabel,
  onOpenChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  // react-day-picker's range mode reports a "complete" range (from === to)
  // on the very first click, not just a pending start date — so closing as
  // soon as both ends exist would close after one click. Require a second
  // click each time the panel opens before treating the range as finished.
  const selectionCountRef = useRef(0);
  useEffect(() => {
    if (open) selectionCountRef.current = 0;
  }, [open]);
  const range: DateRange | undefined = { from: toDate(from), to: toDate(to) };
  const minDate = toDate(min);

  const label = range.from
    ? range.to
      ? `${format(range.from, 'MMM d, yyyy')} – ${format(range.to, 'MMM d, yyyy')}`
      : format(range.from, 'MMM d, yyyy')
    : placeholder;

  return (
    <Popover open={open} onOpenChange={handleOpenChange} align="start" className={className}>
      <PopoverTrigger>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'flex h-[52px] w-full items-center gap-2 rounded-full border border-neutral-100 bg-card px-5 text-left text-sm outline-none transition-colors',
            'focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100',
            'disabled:cursor-not-allowed disabled:opacity-60',
            range.from ? 'text-neutral-dark-900' : 'text-neutral-600',
            triggerClassName,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-neutral-600" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[min(92vw,36rem)] p-0">
        <Calendar
          mode="range"
          captionLayout="dropdown"
          numberOfMonths={2}
          selected={range}
          defaultMonth={range.from ?? minDate ?? new Date()}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(next) => {
            selectionCountRef.current += 1;
            onChange({
              from: next?.from ? toISO(next.from) : undefined,
              to: next?.to ? toISO(next.to) : undefined,
            });
            if (selectionCountRef.current >= 2 && next?.from && next?.to) handleOpenChange(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
