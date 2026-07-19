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
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-brand-subtle text-brand-500 flex items-center justify-center flex-shrink-0">
                <ListChecks className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Notes & packing checklist
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {(notes || checklist.length > 0) && (
                <span className="text-xs font-semibold bg-brand-subtle text-brand-500 px-2.5 py-1 rounded-full">
                  {checklist.length > 0
                    ? `${checklist.filter(c => c.completed).length}/${checklist.length} packed`
                    : 'Notes'}
                </span>
              )}
              {(savingNotes || savingChecklist) && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Trip Quick Notes */}
              <div className="space-y-2">
                <Label htmlFor="tripNotes" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <StickyNote className="w-3.5 h-3.5" />
                  Quick notes
                </Label>
                <div className="relative">
                  <Textarea
                    id="tripNotes"
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="General trip reminders, important info..."
                    className="min-h-[120px] resize-none text-sm bg-muted border-0 pl-5"
                    rows={4}
                  />
                </div>
              </div>

              {/* Trip Checklist */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <ListChecks className="w-3.5 h-3.5" />
                  Packing checklist
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
