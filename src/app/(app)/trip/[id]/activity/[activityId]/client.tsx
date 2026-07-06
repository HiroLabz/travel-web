'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Plane,
  Car,
  Ship,
  Hotel,
  MapPin,
} from 'lucide-react';
import type { Trip, Household, WizardItineraryItem } from '@/types';
import { ACTIVITY_TRAVEL_TYPE_LABELS } from '@/types';
import { ItineraryDetails } from '@/components/itinerary-details';
import { DocumentPreviewModal } from '@/components/document-preview-modal';
import { Button } from '@/components/ui/button';

interface ViewActivityClientProps {
  trip: Trip;
  household: Household;
  activity: WizardItineraryItem;
}

// Get the travel type icon as a Lucide component
const getTravelTypeIcon = (travelType?: string) => {
  switch (travelType) {
    case 'air':
      return <Plane className="w-3.5 h-3.5" />;
    case 'land':
      return <Car className="w-3.5 h-3.5" />;
    case 'sea':
      return <Ship className="w-3.5 h-3.5" />;
    case 'accommodation':
      return <Hotel className="w-3.5 h-3.5" />;
    default:
      return <MapPin className="w-3.5 h-3.5" />;
  }
};

// Get travel type badge colors - consistent with itinerary-tab
const getTravelTypeBadgeColors = (travelType?: string) => {
  switch (travelType) {
    case 'air':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'land':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'sea':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    case 'accommodation':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'activity':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }
};

export default function ViewActivityClient({
  trip,
  household,
  activity: initialActivity,
}: ViewActivityClientProps) {
  const router = useRouter();
  const [activity, setActivity] = useState(initialActivity);
  const [previewDocument, setPreviewDocument] = useState<{
    url: string;
    name: string;
    type?: string;
  } | null>(null);

  const handleBack = () => {
    router.push(`/trip/${trip.id}?tab=itinerary`);
  };

  const handleEdit = () => {
    router.push(`/trip/${trip.id}/activity/${activity.id}/edit`);
  };

  const handleItemUpdate = (updatedItem: WizardItineraryItem) => {
    setActivity(updatedItem);
  };

  const travelTypeLabel = activity.travelType
    ? ACTIVITY_TRAVEL_TYPE_LABELS[activity.travelType]
    : 'Activity';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            {/* Type Badge, Flight Number, Confirmation */}
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTravelTypeBadgeColors(activity.travelType)}`}>
                {getTravelTypeIcon(activity.travelType)}
                {travelTypeLabel}
              </span>
              {activity.flightNumber && activity.flightNumber !== 'N/A' && (
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                  {activity.flightNumber}
                </span>
              )}
              {activity.confirmationNumber && activity.confirmationNumber !== 'N/A' && (
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                  #{activity.confirmationNumber}
                </span>
              )}
            </div>
            {/* Place Name */}
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
              {activity.placeName}
            </h1>
            {/* Operator */}
            {activity.operatorName && activity.operatorName !== 'N/A' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {activity.operatorName}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        <ItineraryDetails
          item={activity}
          tripId={trip.id}
          householdId={trip.householdId}
          household={household}
          onClose={handleBack}
          onItemUpdate={handleItemUpdate}
          onPreviewDocument={setPreviewDocument}
          onEditFull={handleEdit}
          hideHeader
        />
      </main>

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          documentUrl={previewDocument.url}
          documentName={previewDocument.name}
          documentType={previewDocument.type}
        />
      )}
    </div>
  );
}
