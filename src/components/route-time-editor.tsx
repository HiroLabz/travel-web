'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, AlertTriangle, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  date: string;
  timeFrom: string;
  timeTo: string;
}

interface RouteTimeEditorProps {
  itemId: string;
  itemName: string;
  currentTime: TimeSlot;
  suggestedTime?: TimeSlot;
  arrivalTime?: string;
  hasConflict?: boolean;
  onSave: (itemId: string, newTime: TimeSlot) => Promise<void>;
  className?: string;
}

export function RouteTimeEditor({
  itemId,
  itemName,
  currentTime,
  suggestedTime,
  arrivalTime,
  hasConflict = false,
  onSave,
  className,
}: RouteTimeEditorProps) {
  const [editedTime, setEditedTime] = useState<TimeSlot>(currentTime);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEditedTime(currentTime);
    setIsDirty(false);
    setSaved(false);
  }, [currentTime]);

  const handleTimeChange = (field: 'timeFrom' | 'timeTo', value: string) => {
    setEditedTime(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSaved(false);
  };

  const handleUseSuggested = () => {
    if (suggestedTime) {
      setEditedTime(suggestedTime);
      setIsDirty(true);
      setSaved(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(itemId, editedTime);
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedTime(currentTime);
    setIsDirty(false);
    setSaved(false);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with conflict warning */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Time Schedule
          </span>
        </div>
        {hasConflict && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">Timing conflict</span>
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="w-4 h-4" />
            <span className="text-xs">Saved</span>
          </div>
        )}
      </div>

      {/* Arrival time info */}
      {arrivalTime && (
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1">
          Estimated arrival: <span className="font-medium">{arrivalTime}</span>
        </div>
      )}

      {/* Time inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`timeFrom-${itemId}`} className="text-xs text-slate-500">
            Start Time
          </Label>
          <Input
            id={`timeFrom-${itemId}`}
            type="time"
            value={editedTime.timeFrom}
            onChange={e => handleTimeChange('timeFrom', e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`timeTo-${itemId}`} className="text-xs text-slate-500">
            End Time
          </Label>
          <Input
            id={`timeTo-${itemId}`}
            type="time"
            value={editedTime.timeTo}
            onChange={e => handleTimeChange('timeTo', e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Suggested time */}
      {suggestedTime && hasConflict && (
        <button
          onClick={handleUseSuggested}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Use suggested: {suggestedTime.timeFrom} - {suggestedTime.timeTo}
        </button>
      )}

      {/* Action buttons */}
      {isDirty && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex-1"
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="flex-1"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}
