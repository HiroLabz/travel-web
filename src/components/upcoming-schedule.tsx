'use client';

import type { WizardItineraryItem, Household, ChecklistItem } from '@/types';
import { ACTIVITY_TRAVEL_TYPE_ICONS } from '@/types';
import { formatTime } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  Plane,
  Ticket,
  Users,
  ExternalLink,
  Info,
  StickyNote,
  ListChecks,
  Check,
} from 'lucide-react';

interface UpcomingScheduleProps {
  wizardItems: WizardItineraryItem[];
  itineraryLength: number;
  household: Household;
  onViewFullItinerary: () => void;
  onChecklistToggle: (itemId: string, checkId: string, completed: boolean) => void;
}

// Helper function to check if a value should be hidden (NA, N/A, null, etc.)
const shouldHideValue = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'string') {
    const trimmed = value.trim().toUpperCase();
    return trimmed === 'N/A' || trimmed === 'NA' || trimmed === 'NULL';
  }
  return false;
};

export function UpcomingSchedule({
  wizardItems,
  itineraryLength,
  household,
  onViewFullItinerary,
  onChecklistToggle,
}: UpcomingScheduleProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 3);

  // Filter and group items for upcoming days only
  const upcomingItems = wizardItems.filter(item => {
    const itemDate = parseISO(item.dateFrom);
    return itemDate >= today && itemDate <= maxDate;
  });

  const groupedByDate = upcomingItems.reduce((acc, item) => {
    const date = item.dateFrom;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, WizardItineraryItem[]>);

  const sortedDates = Object.keys(groupedByDate).sort();
  const totalUpcoming = upcomingItems.length;
  const totalAll = wizardItems.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Upcoming schedule</h2>
        {(itineraryLength > 0 || wizardItems.length > 0) && (
          <button
            onClick={onViewFullItinerary}
            className="text-sm text-brand-500 font-semibold hover:underline flex items-center gap-1"
          >
            View full itinerary
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {itineraryLength === 0 && wizardItems.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground font-medium mb-2">No itinerary generated yet.</p>
          <button
            onClick={onViewFullItinerary}
            className="text-brand-500 font-semibold hover:underline"
          >
            Go to Planner to create one &rarr;
          </button>
        </div>
      ) : upcomingItems.length === 0 && wizardItems.length > 0 ? (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No activities in the next 3 days.</p>
          <button
            onClick={onViewFullItinerary}
            className="text-brand-500 text-sm font-medium hover:underline mt-2"
          >
            View all {totalAll} activities &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((date) => {
            const items = groupedByDate[date];
            const dateObj = parseISO(date);
            const isToday = format(today, 'yyyy-MM-dd') === date;

            return (
              <Collapsible key={date} defaultOpen={isToday}>
                <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-md flex flex-col items-center justify-center ${isToday ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                        <span className="text-[10px] font-semibold uppercase leading-none">{format(dateObj, 'MMM')}</span>
                        <span className="text-lg font-bold leading-none">{format(dateObj, 'd')}</span>
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-foreground text-sm">
                          {isToday ? 'Today' : format(dateObj, 'EEEE')}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {items.length} {items.length === 1 ? 'activity' : 'activities'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-2">
                      {items
                        .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom))
                        .map((item, itemIdx) => (
                          <ActivityPreviewCard
                            key={`${item.id}-${itemIdx}`}
                            item={item}
                            household={household}
                            onChecklistToggle={onChecklistToggle}
                          />
                        ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {/* Show "more activities" link if there are more items */}
          {totalAll > totalUpcoming && (
            <div className="text-center pt-2">
              <button
                onClick={onViewFullItinerary}
                className="text-sm text-brand-500 font-medium hover:underline"
              >
                +{totalAll - totalUpcoming} more activities in full itinerary &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ActivityPreviewCardProps {
  item: WizardItineraryItem;
  household: Household;
  onChecklistToggle: (itemId: string, checkId: string, completed: boolean) => void;
}

function ActivityPreviewCard({ item, household, onChecklistToggle }: ActivityPreviewCardProps) {
  return (
    <div className="bg-muted rounded-lg p-3 border border-border/60 hover:bg-accent transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className="font-medium text-foreground">
              {item.placeName}
            </h5>
            {item.travelType && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                item.travelType === 'accommodation' ? 'bg-info-soft text-info-accent' :
                'bg-success-soft text-success-accent'
              }`}>
                {ACTIVITY_TRAVEL_TYPE_ICONS[item.travelType]}
              </span>
            )}
            {!shouldHideValue(item.flightNumber) && (
              <span className="text-[10px] font-mono bg-card text-muted-foreground px-1 rounded border border-border">
                {item.flightNumber}
              </span>
            )}
          </div>
          {!shouldHideValue(item.operatorName) && (
            <span className="text-xs text-muted-foreground">{item.operatorName}</span>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(item.timeFrom, household.timeFormat || '24h')} - {formatTime(item.timeTo, household.timeFormat || '24h')}
            </span>
            {!shouldHideValue(item.terminalInfo) && ['air', 'land', 'sea'].includes(item.travelType || '') && (
              <span className="flex items-center gap-1 text-info-accent">
                <Plane className="w-3 h-3 rotate-45" />
                {item.terminalInfo}
              </span>
            )}
            {!shouldHideValue(item.arrivalInfo) && ['air', 'land', 'sea'].includes(item.travelType || '') && (
              <span className="flex items-center gap-1 text-success-accent">
                <span className="text-muted-foreground">→</span>
                <Plane className="w-3 h-3 -rotate-45" />
                {item.arrivalInfo}
              </span>
            )}
            {!shouldHideValue(item.confirmationNumber) && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Ticket className="w-3 h-3" />
                {item.confirmationNumber}
              </span>
            )}
            {!shouldHideValue(item.gateNumber) && ['air', 'land', 'sea'].includes(item.travelType || '') && (
              <span className="flex items-center gap-1 text-warning-accent">
                Gate: {item.gateNumber}
              </span>
            )}
            {!shouldHideValue(item.boardingTime) && ['air', 'land', 'sea'].includes(item.travelType || '') && (
              <span className="flex items-center gap-1 text-brand-500">
                Boarding: {formatTime(item.boardingTime!, household.timeFormat || '24h')}
              </span>
            )}
            {!shouldHideValue(item.address) && shouldHideValue(item.terminalInfo) && shouldHideValue(item.arrivalInfo) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {item.address}
              </span>
            )}
            {(item.googleMapsUrl || item.arrivalGoogleMapsUrl) && (
              <a
                href={item.arrivalGoogleMapsUrl || item.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand-500 hover:text-brand-600"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                Maps
              </a>
            )}
            {(!shouldHideValue(item.operatorContact) || !shouldHideValue(item.contactNumber)) && (
              <a
                href={`tel:${item.operatorContact || item.contactNumber}`}
                className="flex items-center gap-1 text-success-accent hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3" />
                {item.operatorContact || item.contactNumber}
              </a>
            )}
          </div>
          {/* Check-in Instructions - only for accommodations */}
          {!shouldHideValue(item.checkInInstructions) && item.travelType === 'accommodation' && (
            <p className="text-xs text-warning-accent mt-1 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {item.checkInInstructions}
            </p>
          )}
          {/* Passengers - only for transport */}
          {item.passengers && item.passengers.length > 0 && ['air', 'land', 'sea'].includes(item.travelType || '') && (
            <div className="flex items-center gap-1 mt-1 text-xs text-info-accent">
              <Users className="w-3 h-3" />
              <span>{item.passengers.map(p => p.name).join(', ')}</span>
              {item.passengers.some(p => !shouldHideValue(p.seatNumber)) && (
                <span className="text-muted-foreground ml-1">
                  (Seats: {item.passengers.filter(p => !shouldHideValue(p.seatNumber)).map(p => p.seatNumber).join(', ')})
                </span>
              )}
            </div>
          )}
          {/* Notes & Checklist - Interactive */}
          {(item.quickNotes || (item.checklist && item.checklist.length > 0)) && (
            <Collapsible className="mt-2">
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                {item.quickNotes && (
                  <span className="flex items-center gap-1 text-warning-accent">
                    <StickyNote className="w-3 h-3" />
                    Notes
                  </span>
                )}
                {item.checklist && item.checklist.length > 0 && (
                  <span className="flex items-center gap-1 text-brand-500">
                    <ListChecks className="w-3 h-3" />
                    {item.checklist.filter(c => c.completed).length}/{item.checklist.length}
                  </span>
                )}
                <ChevronDown className="w-3 h-3" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {item.quickNotes && (
                  <div className="bg-warning-soft rounded-lg p-2 text-xs text-warning-accent">
                    {item.quickNotes}
                  </div>
                )}
                {item.checklist && item.checklist.length > 0 && (
                  <div className="space-y-1">
                    {item.checklist.map((checkItem) => (
                      <button
                        key={checkItem.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChecklistToggle(item.id, checkItem.id, !checkItem.completed);
                        }}
                        className={`flex items-center gap-2 w-full p-1.5 rounded text-left transition-colors hover:bg-accent ${
                          checkItem.completed ? 'text-muted-foreground' : ''
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          checkItem.completed
                            ? 'bg-success-accent border-success-accent'
                            : 'border-border'
                        }`}>
                          {checkItem.completed && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-xs ${checkItem.completed ? 'line-through' : ''}`}>
                          {checkItem.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}
