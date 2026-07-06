'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RoutePlannerForm } from '@/components/route-planner-form';
import { Route } from 'lucide-react';
import type { WizardItineraryItem, Household, Destination, ExchangeRateCache } from '@/types';

interface RoutePlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  wizardItems: WizardItineraryItem[];
  tripDestinations: Destination[];
  household: Household;
  exchangeRates?: ExchangeRateCache;
}

export function RoutePlannerDialog({
  open,
  onOpenChange,
  tripId,
  wizardItems,
  tripDestinations,
  household,
  exchangeRates,
}: RoutePlannerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-600" />
            Plan Your Day Route
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <RoutePlannerForm
            tripId={tripId}
            wizardItems={wizardItems}
            tripDestinations={tripDestinations}
            household={household}
            exchangeRates={exchangeRates}
            onClose={() => onOpenChange(false)}
            isMobilePage={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
