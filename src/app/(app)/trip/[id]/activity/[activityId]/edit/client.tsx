'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import type { Trip, Household, WizardItineraryItem } from '@/types';
import { ActivityForm } from '@/components/activity-form';
import { Button } from '@/components/ui/button';

interface EditActivityClientProps {
  trip: Trip;
  household: Household;
  wizardItems: WizardItineraryItem[];
  editingItem: WizardItineraryItem;
}

export default function EditActivityClient({
  trip,
  household,
  wizardItems,
  editingItem,
}: EditActivityClientProps) {
  const router = useRouter();

  const handleSave = () => {
    router.push(`/trip/${trip.id}?tab=itinerary`);
  };

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
              <Pencil className="w-5 h-5 text-indigo-500" />
              Edit Activity
            </h1>
            <p className="text-xs text-slate-500 truncate">{editingItem.placeName}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        <ActivityForm
          tripId={trip.id}
          householdId={household.id}
          existingItems={wizardItems}
          tripDestinations={trip.destinations}
          editingItem={editingItem}
          onSave={handleSave}
          onCancel={handleCancel}
          isMobilePage={true}
        />
      </main>
    </div>
  );
}
