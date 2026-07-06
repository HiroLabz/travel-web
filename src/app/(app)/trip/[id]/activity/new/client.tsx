'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import type { Trip, Household, WizardItineraryItem, RecommendedPlace, ExperienceType } from '@/types';
import { ActivityForm } from '@/components/activity-form';
import { Button } from '@/components/ui/button';

interface NewActivityClientProps {
  trip: Trip;
  household: Household;
  wizardItems: WizardItineraryItem[];
  prefillData?: {
    name?: string;
    address?: string;
    description?: string;
    tips?: string;
  };
}

export default function NewActivityClient({
  trip,
  household,
  wizardItems,
  prefillData,
}: NewActivityClientProps) {
  const router = useRouter();

  // Convert prefill data to RecommendedPlace format if provided
  const prefilledPlace: RecommendedPlace | null = prefillData?.name
    ? {
        id: `prefill-${Date.now()}`,
        name: prefillData.name,
        address: prefillData.address || '',
        description: prefillData.description || '',
        tips: prefillData.tips || '',
        category: 'landmarks' as ExperienceType, // Type cast - category not used in activity form
        googleMapsUrl: '',
        imageSearchUrl: '',
        estimatedDuration: '',
        priceLevel: '',
      }
    : null;

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
              <Plus className="w-5 h-5 text-indigo-500" />
              Add Activity
            </h1>
            <p className="text-xs text-slate-500 truncate">{trip.title}</p>
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
          prefilledPlace={prefilledPlace}
          onSave={handleSave}
          onCancel={handleCancel}
          isMobilePage={true}
        />
      </main>
    </div>
  );
}
