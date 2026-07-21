'use client';

import { useState, useEffect } from 'react';
import { WizardItineraryItem, RecommendedPlace, Destination } from '@/types';
import {
  deleteWizardItemAction,
  combineWizardItemsToDocAction,
} from '@/lib/actions';
import {
  Wand2,
  Plus,
  Trash2,
  MapPin,
  Clock,
  Calendar,
  Loader2,
  Save,
  Pencil,
  DollarSign,
  Plane,
  Car,
  Ship,
  Hotel,
  MapPinned,
  Building2,
  ArrowRight,
  MoveVertical,
  ListChecks,
  StickyNote,
} from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { useSortableItinerary } from '@/hooks/use-sortable-itinerary';
import { SortableItineraryItem } from '@/components/sortable-itinerary-item';
import { DroppableDateContainer } from '@/components/droppable-date-container';
import { ItineraryDragOverlay } from '@/components/drag-overlay-item';
import { ActivityForm } from '@/components/activity-form';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/motion/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/motion/morphing-modal';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';

interface ItineraryWizardProps {
  tripId: string;
  householdId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingItems: WizardItineraryItem[];
  onItemsChange: (items: WizardItineraryItem[]) => void;
  onCombineComplete: (content: string) => void;
  editingItem?: WizardItineraryItem | null;
  onEditingItemChange?: (item: WizardItineraryItem | null) => void;
  prefilledPlace?: RecommendedPlace | null;
  onPrefilledPlaceChange?: (place: RecommendedPlace | null) => void;
  tripDestinations?: Destination[];
}

export function ItineraryWizard({
  tripId,
  householdId,
  open,
  onOpenChange,
  existingItems,
  onItemsChange,
  onCombineComplete,
  editingItem,
  onEditingItemChange,
  prefilledPlace,
  onPrefilledPlaceChange,
  tripDestinations = [],
}: ItineraryWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'list' | 'form'>('list');
  const [combining, setCombining] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState<WizardItineraryItem | null>(null);

  // Handle editing item from parent
  useEffect(() => {
    if (editingItem && open) {
      setCurrentEditingItem(editingItem);
      setStep('form');
    }
  }, [editingItem, open]);

  // Handle pre-filled place from AI recommendations
  useEffect(() => {
    if (prefilledPlace && open && !editingItem) {
      setCurrentEditingItem(null);
      setStep('form');
    }
  }, [prefilledPlace, open, editingItem]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentEditingItem(null);
      onEditingItemChange?.(null);
      onPrefilledPlaceChange?.(null);
      setStep('list');
    }
  }, [open, onEditingItemChange, onPrefilledPlaceChange]);

  const handleEditItem = (item: WizardItineraryItem) => {
    setCurrentEditingItem(item);
    setStep('form');
  };

  const handleDeleteItem = async (itemId: string) => {
    const result = await deleteWizardItemAction(tripId, itemId);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      const updatedItems = existingItems.filter(item => item.id !== itemId);
      onItemsChange(updatedItems);

      if (updatedItems.length > 0) {
        const docResult = await combineWizardItemsToDocAction(tripId, updatedItems);
        if (docResult.content) {
          onCombineComplete(docResult.content);
        }
      }

      toast({
        title: 'Deleted',
        description: 'Item removed from itinerary.',
      });
    }
  };

  // Drag and drop reordering hook
  const {
    sensors,
    activeItem,
    groupedItems: dndGroupedItems,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    pendingAdjustment,
    isApplying,
    applyTimeAdjustment,
    cancelTimeAdjustment,
  } = useSortableItinerary({
    items: existingItems,
    tripId,
    onItemsChange,
    onCombineComplete,
  });

  // Time adjustment dialog state
  const [customTimeFrom, setCustomTimeFrom] = useState('');
  const [customTimeTo, setCustomTimeTo] = useState('');

  // Update custom times when pending adjustment changes
  useEffect(() => {
    if (pendingAdjustment) {
      setCustomTimeFrom(pendingAdjustment.newTimeFrom);
      setCustomTimeTo(pendingAdjustment.newTimeTo);
    }
  }, [pendingAdjustment]);

  const handleCombine = async () => {
    if (existingItems.length === 0) {
      toast({
        title: 'No items',
        description: 'Add at least one itinerary item first.',
        variant: 'destructive',
      });
      return;
    }

    setCombining(true);

    const result = await combineWizardItemsToDocAction(tripId, existingItems);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Itinerary saved to Itinerary Document!',
      });
      onCombineComplete(result.content || '');
      onOpenChange(false);
    }

    setCombining(false);
  };

  const handleFormSave = () => {
    setCurrentEditingItem(null);
    setStep('list');
  };

  const handleFormCancel = () => {
    setCurrentEditingItem(null);
    setStep('list');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-500" />
            {step === 'list' ? 'Itinerary Wizard' : currentEditingItem ? 'Edit Activity' : 'Add New Activity'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'list' ? (
            <div className="space-y-4">
              {/* Add new button */}
              <Button
                onClick={() => setStep('form')}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Activity
              </Button>

              {/* Items list */}
              {existingItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No activities added yet.</p>
                  <p className="text-xs mt-1">Click &quot;Add New Activity&quot; to start building your itinerary.</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <div className="space-y-6">
                    {Object.entries(dndGroupedItems)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, items]) => {
                        const sortedItems = [...items].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
                        return (
                          <div key={date}>
                            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-indigo-500" />
                              {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                              {sortedItems.length > 1 && (
                                <span className="text-xs text-slate-400 font-normal ml-2">
                                  (drag to reorder)
                                </span>
                              )}
                            </h3>
                            <DroppableDateContainer
                              date={date}
                              itemIds={sortedItems.map(i => i.id)}
                            >
                              <div className="space-y-2">
                                {sortedItems.map((item) => (
                                  <SortableItineraryItem key={item.id} id={item.id}>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-medium text-slate-800 truncate flex items-center gap-2">
                                            {item.travelType === 'air' && <Plane className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                                            {item.travelType === 'land' && <Car className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                                            {item.travelType === 'sea' && <Ship className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                                            {item.travelType === 'accommodation' && <Hotel className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                                            {(!item.travelType || item.travelType === 'activity') && <MapPinned className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                                            {item.placeName}
                                          </h4>
                                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {item.timeFrom} - {item.timeTo}
                                            </span>
                                            {item.address && (
                                              <span className="flex items-center gap-1 truncate">
                                                <MapPin className="w-3 h-3" />
                                                {item.address}
                                              </span>
                                            )}
                                            {item.estimatedCost !== undefined && item.estimatedCost > 0 && (
                                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                <DollarSign className="w-3 h-3" />
                                                {item.estimatedCost.toFixed(2)}
                                              </span>
                                            )}
                                            {item.operatorName && (
                                              <span className="flex items-center gap-1 text-slate-500">
                                                {item.operatorName}
                                              </span>
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
                                          {/* Notes & Checklist indicators */}
                                          {(item.quickNotes || (item.checklist && item.checklist.length > 0)) && (
                                            <div className="flex items-center gap-2 mt-1 text-xs">
                                              {item.quickNotes && (
                                                <span className="flex items-center gap-1 text-amber-600">
                                                  <StickyNote className="w-3 h-3" />
                                                  Notes
                                                </span>
                                              )}
                                              {item.checklist && item.checklist.length > 0 && (
                                                <span className="flex items-center gap-1 text-indigo-600">
                                                  <ListChecks className="w-3 h-3" />
                                                  {item.checklist.filter(c => c.completed).length}/{item.checklist.length}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditItem(item)}
                                            className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </SortableItineraryItem>
                                ))}
                              </div>
                            </DroppableDateContainer>
                          </div>
                        );
                      })}
                  </div>
                  <ItineraryDragOverlay activeItem={activeItem} />
                </DndContext>
              )}
            </div>
          ) : (
            <ActivityForm
              tripId={tripId}
              householdId={householdId}
              existingItems={existingItems}
              tripDestinations={tripDestinations}
              editingItem={currentEditingItem}
              prefilledPlace={prefilledPlace}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
              onItemsChange={onItemsChange}
              onCombineComplete={onCombineComplete}
              isMobilePage={false}
            />
          )}
        </div>

        {step === 'list' && (
          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={handleCombine}
              disabled={combining || existingItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 mb-1"
            >
              {combining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Itinerary Document
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

      {/* Time Adjustment Confirmation Dialog */}
      <AlertDialog open={!!pendingAdjustment} onOpenChange={(open) => !open && cancelTimeAdjustment()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MoveVertical className="w-5 h-5 text-indigo-500" />
              Confirm Time Adjustment
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-slate-600">
                  Moving <span className="font-semibold text-slate-800">{pendingAdjustment?.item.placeName}</span>
                  {pendingAdjustment && pendingAdjustment.item.dateFrom !== pendingAdjustment.newDate && (
                    <span> to {format(parseISO(pendingAdjustment.newDate), 'MMM d, yyyy')}</span>
                  )}
                </p>

                {/* Time Change Preview */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  {/* Original Time */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500 w-16">Current:</span>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>{pendingAdjustment?.originalTimeFrom} - {pendingAdjustment?.originalTimeTo}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <ArrowRight className="w-4 h-4 text-indigo-400 rotate-90" />
                  </div>

                  {/* New Time - Editable */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500 w-16">New:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={customTimeFrom}
                        onChange={(e) => setCustomTimeFrom(e.target.value)}
                        className="w-28 h-8 text-sm"
                      />
                      <span className="text-slate-400">-</span>
                      <Input
                        type="time"
                        value={customTimeTo}
                        onChange={(e) => setCustomTimeTo(e.target.value)}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Adjust the times above if needed, or confirm to apply the suggested schedule.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isApplying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => applyTimeAdjustment(customTimeFrom, customTimeTo)}
              disabled={isApplying}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Confirm Move'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
