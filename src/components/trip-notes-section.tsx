'use client';

import { useState } from 'react';
import type { ChecklistItem } from '@/types';
import { updateTripNotesAction, updateTripChecklistAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedCallback } from 'use-debounce';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChecklistEditor } from '@/components/checklist-editor';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ListChecks,
  StickyNote,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface TripNotesSectionProps {
  tripId: string;
  initialNotes: string;
  initialChecklist: ChecklistItem[];
  onNotesChange?: (notes: string) => void;
  onChecklistChange?: (items: ChecklistItem[]) => void;
}

export function TripNotesSection({
  tripId,
  initialNotes,
  initialChecklist,
  onNotesChange,
  onChecklistChange,
}: TripNotesSectionProps) {
  const { toast } = useToast();

  const [notes, setNotes] = useState(initialNotes);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [isOpen, setIsOpen] = useState(!!(initialNotes || initialChecklist.length > 0));
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);

  const debouncedSaveNotes = useDebouncedCallback(async (notesValue: string) => {
    setSavingNotes(true);
    const result = await updateTripNotesAction(tripId, notesValue);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setSavingNotes(false);
  }, 1000);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onNotesChange?.(value);
    debouncedSaveNotes(value);
  };

  const handleChecklistChange = async (newChecklist: ChecklistItem[]) => {
    setChecklist(newChecklist);
    onChecklistChange?.(newChecklist);
    setSavingChecklist(true);
    const result = await updateTripChecklistAction(tripId, newChecklist);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setSavingChecklist(false);
  };

  return (
    <div className="lg:col-span-3">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-indigo-500" />
              Trip Notes & Packing Checklist
            </h3>
            <div className="flex items-center gap-2">
              {(notes || checklist.length > 0) && (
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                  {checklist.length > 0
                    ? `${checklist.filter(c => c.completed).length}/${checklist.length}`
                    : 'Notes'}
                </span>
              )}
              {(savingNotes || savingChecklist) && (
                <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
              )}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trip Quick Notes */}
              <div className="space-y-2">
                <Label htmlFor="tripNotes" className="flex items-center gap-2 text-xs">
                  <StickyNote className="w-3 h-3 text-amber-500" />
                  Quick Notes
                </Label>
                <Textarea
                  id="tripNotes"
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="General trip reminders, important info..."
                  className="min-h-[120px] resize-none text-sm"
                  rows={4}
                />
              </div>

              {/* Trip Checklist */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <ListChecks className="w-3 h-3 text-indigo-500" />
                  Packing / Prep Checklist
                </Label>
                <ChecklistEditor
                  items={checklist}
                  onChange={handleChecklistChange}
                  placeholder="Add packing item or task..."
                  maxItems={30}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
