'use client';

import { WizardItineraryItem } from '@/types';
import { updateWizardItemAction } from '@/lib/actions';
import { InlineEditableField } from '@/components/inline-editable-field';
import { useToast } from '@/hooks/use-toast';
import {
  Clock,
  MapPin,
  DollarSign,
  Plane,
  Car,
  Ship,
  Hotel,
  MapPinned,
  Building2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineEditItineraryItemProps {
  item: WizardItineraryItem;
  tripId: string;
  onUpdate: (updatedItem: WizardItineraryItem) => void;
  onDelete?: (itemId: string) => void;
  showDeleteButton?: boolean;
}

export function InlineEditItineraryItem({
  item,
  tripId,
  onUpdate,
  onDelete,
  showDeleteButton = true,
}: InlineEditItineraryItemProps) {
  const { toast } = useToast();

  const handleFieldSave = async (
    field: keyof WizardItineraryItem,
    value: string | number
  ) => {
    const updates = { [field]: value };
    const result = await updateWizardItemAction(tripId, item.id, updates);

    if (result.success) {
      onUpdate({ ...item, [field]: value });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update',
        variant: 'destructive',
      });
      throw new Error(result.error);
    }
  };

  const getTravelIcon = () => {
    switch (item.travelType) {
      case 'air':
        return <Plane className="w-4 h-4 text-primary flex-shrink-0" />;
      case 'land':
        return <Car className="w-4 h-4 text-primary flex-shrink-0" />;
      case 'sea':
        return <Ship className="w-4 h-4 text-primary flex-shrink-0" />;
      case 'accommodation':
        return <Hotel className="w-4 h-4 text-primary flex-shrink-0" />;
      default:
        return <MapPinned className="w-4 h-4 text-primary flex-shrink-0" />;
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Place Name - Editable */}
          <div className="flex items-center gap-2">
            {getTravelIcon()}
            <InlineEditableField
              value={item.placeName}
              onSave={(v) => handleFieldSave('placeName', v)}
              displayClassName="font-medium text-slate-800"
              placeholder="Place name"
            />
          </div>

          {/* Time, Address, Cost Row */}
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            {/* Time Range */}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <InlineEditableField
                value={item.timeFrom}
                onSave={(v) => handleFieldSave('timeFrom', v)}
                type="time"
              />
              <span>-</span>
              <InlineEditableField
                value={item.timeTo}
                onSave={(v) => handleFieldSave('timeTo', v)}
                type="time"
              />
            </span>

            {/* Address */}
            <InlineEditableField
              value={item.address || ''}
              onSave={(v) => handleFieldSave('address', v)}
              icon={<MapPin className="w-3 h-3 flex-shrink-0" />}
              emptyText="Add address"
              displayClassName="truncate max-w-[200px]"
            />

            {/* Cost */}
            <InlineEditableField
              value={
                item.estimatedCost !== undefined && item.estimatedCost > 0
                  ? item.estimatedCost.toFixed(2)
                  : ''
              }
              onSave={async (v) => {
                const cost = parseFloat(v) || 0;
                await handleFieldSave('estimatedCost', cost);
              }}
              type="number"
              icon={<DollarSign className="w-3 h-3 flex-shrink-0" />}
              emptyText="Add cost"
              displayClassName="text-emerald-600 font-medium"
            />

            {/* Operator Name (if exists) */}
            {item.operatorName && (
              <InlineEditableField
                value={item.operatorName}
                onSave={(v) => handleFieldSave('operatorName', v)}
                displayClassName="text-slate-500"
              />
            )}
          </div>

          {/* Travel details row */}
          {(item.terminalInfo || item.arrivalInfo) && (
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              {item.terminalInfo && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {item.terminalInfo}
                </span>
              )}
              {item.terminalInfo && item.arrivalInfo && (
                <span className="text-slate-300">&rarr;</span>
              )}
              {item.arrivalInfo && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {item.arrivalInfo}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Delete Button */}
        {showDeleteButton && onDelete && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
