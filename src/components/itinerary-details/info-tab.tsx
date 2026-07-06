'use client';

import { useState } from 'react';
import type { WizardItineraryItem, Household } from '@/types';
import { formatTime } from '@/lib/constants';
import { quickUpdateWizardItemAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Ticket,
  User,
  Users,
  Armchair,
  DollarSign,
  ExternalLink,
  Pencil,
  Check,
  X,
  Loader2,
  Info,
  Plane,
  FileText,
} from 'lucide-react';

interface InfoTabProps {
  item: WizardItineraryItem;
  tripId: string;
  household: Household;
  onItemUpdate: (updatedItem: WizardItineraryItem) => void;
}

export function InfoTab({ item, tripId, household, onItemUpdate }: InfoTabProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(item.quickNotes || '');
  const [saving, setSaving] = useState(false);

  const timeFormat = household.timeFormat || '24h';

  const handleSaveNotes = async () => {
    setSaving(true);
    const result = await quickUpdateWizardItemAction(tripId, item.id, {
      quickNotes: notesValue,
    });
    if (result.success) {
      onItemUpdate({ ...item, quickNotes: notesValue });
      setEditingNotes(false);
    }
    setSaving(false);
  };

  const formatDateRange = () => {
    try {
      const from = parseISO(item.dateFrom);
      const to = parseISO(item.dateTo);

      if (item.dateFrom === item.dateTo) {
        return format(from, 'EEEE, MMMM d, yyyy');
      }
      return `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`;
    } catch {
      return `${item.dateFrom} - ${item.dateTo}`;
    }
  };

  return (
    <div className="space-y-4 px-1">
      {/* Date & Time Section */}
      <Section icon={<Calendar className="w-4 h-4" />} title="Date & Time">
        <div className="space-y-1">
          <p className="text-slate-900 dark:text-slate-100">{formatDateRange()}</p>
          {(item.timeFrom || item.timeTo) && (
            <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              {item.timeFrom && formatTime(item.timeFrom, timeFormat)}
              {item.timeFrom && item.timeTo && ' - '}
              {item.timeTo && formatTime(item.timeTo, timeFormat)}
            </div>
          )}
        </div>
      </Section>

      {/* Travel Details (for transport types) */}
      {(item.travelType === 'air' ||
        item.travelType === 'land' ||
        item.travelType === 'sea') && (
        <Section icon={<Plane className="w-4 h-4" />} title="Travel Details">
          <div className="space-y-3">
            {item.terminalInfo && (
              <DetailRow label="Departure" value={item.terminalInfo} />
            )}
            {item.arrivalInfo && (
              <DetailRow label="Arrival" value={item.arrivalInfo} />
            )}
            {item.boardingTime && (
              <DetailRow
                label="Boarding"
                value={formatTime(item.boardingTime, timeFormat)}
              />
            )}
            {item.gateNumber && (
              <DetailRow label="Gate" value={item.gateNumber} />
            )}
          </div>
        </Section>
      )}

      {/* Location Section */}
      {item.address && (
        <Section icon={<MapPin className="w-4 h-4" />} title="Location">
          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300">{item.address}</p>
            {item.googleMapsUrl && (
              <a
                href={item.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Maps
              </a>
            )}
            {item.arrivalGoogleMapsUrl && item.arrivalInfo && (
              <a
                href={item.arrivalGoogleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 ml-4"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Arrival Location
              </a>
            )}
          </div>
        </Section>
      )}

      {/* Booking Details */}
      {(item.confirmationNumber || item.contactNumber || item.operatorContact) && (
        <Section icon={<Ticket className="w-4 h-4" />} title="Booking Details">
          <div className="space-y-2">
            {item.confirmationNumber && (
              <DetailRow
                label="Confirmation"
                value={item.confirmationNumber}
                mono
              />
            )}
            {item.contactNumber && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={`tel:${item.contactNumber}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.contactNumber}
                </a>
              </div>
            )}
            {item.operatorContact && item.operatorContact !== item.contactNumber && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">Operator:</span>
                <a
                  href={`tel:${item.operatorContact}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.operatorContact}
                </a>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Passengers */}
      {item.passengers && item.passengers.length > 0 && (
        <Section icon={<Users className="w-4 h-4" />} title="Passengers">
          <div className="space-y-2">
            {item.passengers.map((passenger, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <User className="w-4 h-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {passenger.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {passenger.seatNumber && (
                      <span className="flex items-center gap-1">
                        <Armchair className="w-3 h-3" />
                        Seat {passenger.seatNumber}
                      </span>
                    )}
                    {passenger.class && <span>{passenger.class}</span>}
                    {passenger.ticketNumber && (
                      <span className="font-mono">{passenger.ticketNumber}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Check-in Instructions */}
      {item.checkInInstructions && (
        <Section icon={<Info className="w-4 h-4" />} title="Check-in Instructions">
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {item.checkInInstructions}
          </p>
        </Section>
      )}

      {/* Estimated Cost */}
      {item.estimatedCost && item.estimatedCost > 0 && (
        <Section icon={<DollarSign className="w-4 h-4" />} title="Estimated Cost">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: item.currency || household.currency || 'USD',
            }).format(item.estimatedCost)}
          </p>
        </Section>
      )}

      {/* Description */}
      {item.description && (
        <Section icon={<FileText className="w-4 h-4" />} title="Description">
          <div
            className="text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: item.description }}
          />
        </Section>
      )}

      {/* Quick Notes - Editable */}
      <Section
        icon={<Pencil className="w-4 h-4" />}
        title="Notes"
        action={
          !editingNotes ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingNotes(true)}
              className="h-6 px-2 text-xs"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          ) : null
        }
      >
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={saving}
                className="h-7"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Check className="w-3 h-3 mr-1" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNotesValue(item.quickNotes || '');
                  setEditingNotes(false);
                }}
                disabled={saving}
                className="h-7"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
            {item.quickNotes || 'No notes added'}
          </p>
        )}
      </Section>
    </div>
  );
}

// Helper Components
function Section({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-20">
        {label}:
      </span>
      <span
        className={`text-slate-800 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
