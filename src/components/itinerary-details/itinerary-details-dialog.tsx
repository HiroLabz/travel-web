'use client';

import type { WizardItineraryItem, Household } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/motion/morphing-modal';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ItineraryDetails } from './itinerary-details';

interface ItineraryDetailsDialogProps {
  item: WizardItineraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  householdId: string;
  household: Household;
  onItemUpdate: (updatedItem: WizardItineraryItem) => void;
  onPreviewDocument: (doc: { url: string; name: string; type?: string }) => void;
  onEditFull: (item: WizardItineraryItem) => void;
}

export function ItineraryDetailsDialog({
  item,
  open,
  onOpenChange,
  tripId,
  householdId,
  household,
  onItemUpdate,
  onPreviewDocument,
  onEditFull,
}: ItineraryDetailsDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{item.placeName}</DialogTitle>
        </VisuallyHidden>
        <ItineraryDetails
          item={item}
          tripId={tripId}
          householdId={householdId}
          household={household}
          onClose={() => onOpenChange(false)}
          onItemUpdate={onItemUpdate}
          onPreviewDocument={onPreviewDocument}
          onEditFull={() => onEditFull(item)}
        />
      </DialogContent>
    </Dialog>
  );
}
