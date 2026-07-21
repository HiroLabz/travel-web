'use client';

import { useState } from 'react';
import { WizardItineraryItem } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/motion/morphing-modal';
import { Button } from '@/components/ui/button';
import { Hotel, MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OriginSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accommodations: WizardItineraryItem[];
  onSelect: (accommodation: WizardItineraryItem) => void;
  selectedId?: string;
}

export function OriginSelectorDialog({
  open,
  onOpenChange,
  accommodations,
  onSelect,
  selectedId,
}: OriginSelectorDialogProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (accommodation: WizardItineraryItem) => {
    onSelect(accommodation);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-indigo-500" />
            Select Origin Hotel
          </DialogTitle>
          <DialogDescription>
            Choose which accommodation to calculate the distance from
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
          {accommodations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Hotel className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No accommodations found</p>
              <p className="text-xs text-slate-400 mt-1">
                Add an accommodation to your itinerary first
              </p>
            </div>
          ) : (
            accommodations.map((accommodation) => (
              <button
                key={accommodation.id}
                type="button"
                onClick={() => handleSelect(accommodation)}
                onMouseEnter={() => setHoveredId(accommodation.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-all',
                  'hover:bg-indigo-50 hover:border-indigo-200',
                  selectedId === accommodation.id
                    ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500'
                    : 'bg-white border-slate-200'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      selectedId === accommodation.id || hoveredId === accommodation.id
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {selectedId === accommodation.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Hotel className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">
                      {accommodation.placeName}
                    </p>
                    {accommodation.address && (
                      <div className="flex items-start gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {accommodation.address}
                        </p>
                      </div>
                    )}
                    {(accommodation.dateFrom || accommodation.dateTo) && (
                      <p className="text-xs text-slate-400 mt-1">
                        {accommodation.dateFrom}
                        {accommodation.dateTo && accommodation.dateTo !== accommodation.dateFrom
                          ? ` - ${accommodation.dateTo}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
