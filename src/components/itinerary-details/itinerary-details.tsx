'use client';

import { useState } from 'react';
import type { WizardItineraryItem, Household, DocumentReference } from '@/types';
import { ACTIVITY_TRAVEL_TYPE_LABELS } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { InfoTab } from './info-tab';
import { GalleryTab } from './gallery-tab';
import { DocumentsTab } from './documents-tab';
import { ChecklistTab } from './checklist-tab';
import {
  Info,
  Image as ImageIcon,
  FileText,
  Pencil,
  Plane,
  Hotel,
  Ship,
  Car,
  MapPin,
  ListChecks,
  Check,
} from 'lucide-react';

export interface ItineraryDetailsProps {
  item: WizardItineraryItem;
  tripId: string;
  householdId: string;
  household: Household;
  onClose: () => void;
  onItemUpdate: (updatedItem: WizardItineraryItem) => void;
  onPreviewDocument: (doc: { url: string; name: string; type?: string }) => void;
  onEditFull: () => void;
  hideHeader?: boolean;
}

// Helper to check if a document is an image
const isImageFile = (doc: DocumentReference): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const lowerName = doc.name.toLowerCase();
  return (
    imageExtensions.some((ext) => lowerName.endsWith(ext)) ||
    doc.type?.startsWith('image/') ||
    false
  );
};

// Get the travel type icon as a Lucide component
const getTravelTypeIcon = (travelType?: string) => {
  switch (travelType) {
    case 'air':
      return <Plane className="w-4 h-4" />;
    case 'land':
      return <Car className="w-4 h-4" />;
    case 'sea':
      return <Ship className="w-4 h-4" />;
    case 'accommodation':
      return <Hotel className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
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

export function ItineraryDetails({
  item,
  tripId,
  householdId,
  household,
  onClose,
  onItemUpdate,
  onPreviewDocument,
  onEditFull,
  hideHeader = false,
}: ItineraryDetailsProps) {
  const [activeTab, setActiveTab] = useState<string>('info');

  // Separate images and documents from sourceDocuments
  const allDocuments = item.sourceDocuments || [];
  const imageAttachments = allDocuments.filter(isImageFile);
  const documentAttachments = allDocuments.filter((doc) => !isImageFile(doc));

  // Checklist stats
  const checklistItems = item.checklist || [];
  const completedCount = checklistItems.filter((ci) => ci.completed).length;
  const totalCount = checklistItems.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const travelTypeLabel = item.travelType
    ? ACTIVITY_TRAVEL_TYPE_LABELS[item.travelType]
    : 'Activity';

  return (
    <div className="flex flex-col h-full">
      {/* Header - hidden on mobile where the page has its own header */}
      {!hideHeader && (
        <div className="flex-shrink-0 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTravelTypeBadgeColors(item.travelType)}`}>
                  {getTravelTypeIcon(item.travelType)}
                  {travelTypeLabel}
                </span>
                {item.flightNumber && item.flightNumber !== 'N/A' && (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {item.flightNumber}
                  </span>
                )}
                {item.confirmationNumber && item.confirmationNumber !== 'N/A' && (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    #{item.confirmationNumber}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {item.placeName}
              </h2>
              {item.operatorName && item.operatorName !== 'N/A' && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {item.operatorName}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditFull}
              className="flex-shrink-0"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={`flex-1 flex flex-col overflow-hidden ${!hideHeader ? 'mt-4' : ''}`}
      >
        <TabsList className="flex-shrink-0 grid w-full grid-cols-4">
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Info</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-1.5">
            {allCompleted ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <ListChecks className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Tasks</span>
            {totalCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  allCompleted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {completedCount}/{totalCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Gallery</span>
            {imageAttachments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-slate-700">
                {imageAttachments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Docs</span>
            {documentAttachments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-slate-700">
                {documentAttachments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4">
          <TabsContent value="info" className="m-0 h-full">
            <InfoTab
              item={item}
              tripId={tripId}
              household={household}
              onItemUpdate={onItemUpdate}
            />
          </TabsContent>

          <TabsContent value="checklist" className="m-0 h-full">
            <ChecklistTab
              item={item}
              tripId={tripId}
              onItemUpdate={onItemUpdate}
            />
          </TabsContent>

          <TabsContent value="gallery" className="m-0 h-full">
            <GalleryTab images={imageAttachments} />
          </TabsContent>

          <TabsContent value="documents" className="m-0 h-full">
            <DocumentsTab
              documents={documentAttachments}
              documentMetadata={item.documentMetadata}
              onPreviewDocument={onPreviewDocument}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
