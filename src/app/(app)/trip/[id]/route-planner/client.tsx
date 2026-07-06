'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Route } from 'lucide-react';
import type { Trip, Household, WizardItineraryItem, ExchangeRateCache } from '@/types';
import { RoutePlannerForm } from '@/components/route-planner-form';
import { Button } from '@/components/ui/button';

interface RoutePlannerClientProps {
  trip: Trip;
  household: Household;
  wizardItems: WizardItineraryItem[];
  exchangeRates?: ExchangeRateCache;
}

export default function RoutePlannerClient({
  trip,
  household,
  wizardItems,
  exchangeRates,
}: RoutePlannerClientProps) {
  const router = useRouter();

  const handleCancel = () => {
    router.push(`/trip/${trip.id}?tab=itinerary`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 truncate flex items-center gap-2">
              <Route className="w-5 h-5 text-blue-600" />
              Plan Day Route
            </h1>
            <p className="text-xs text-slate-500 truncate">{trip.title}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        <RoutePlannerForm
          tripId={trip.id}
          wizardItems={wizardItems}
          tripDestinations={trip.destinations}
          household={household}
          exchangeRates={exchangeRates}
          isMobilePage={true}
        />
      </main>
    </div>
  );
}
