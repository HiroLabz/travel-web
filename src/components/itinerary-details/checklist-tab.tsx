'use client';

import { useState, useRef } from 'react';
import type { WizardItineraryItem, ChecklistItem } from '@/types';
import { quickUpdateWizardItemAction } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Plus, X, ListChecks } from 'lucide-react';

interface ChecklistTabProps {
  item: WizardItineraryItem;
  tripId: string;
  onItemUpdate: (updatedItem: WizardItineraryItem) => void;
}

export function ChecklistTab({ item, tripId, onItemUpdate }: ChecklistTabProps) {
  const [checklistValue, setChecklistValue] = useState<ChecklistItem[]>(
    item.checklist || []
  );
  const [newItemText, setNewItemText] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveChecklist = async (updated: ChecklistItem[]) => {
    // Optimistic update
    setChecklistValue(updated);
    onItemUpdate({ ...item, checklist: updated });

    // Debounce save to avoid too many requests
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      await quickUpdateWizardItemAction(tripId, item.id, { checklist: updated });
    }, 300);
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      completed: false,
      order: checklistValue.length,
      createdAt: new Date().toISOString(),
    };

    const updated = [...checklistValue, newItem];
    setNewItemText('');
    await saveChecklist(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleToggleItem = async (checklistItemId: string) => {
    const updated = checklistValue.map((ci) =>
      ci.id === checklistItemId ? { ...ci, completed: !ci.completed } : ci
    );
    await saveChecklist(updated);
  };

  const handleDeleteItem = async (checklistItemId: string) => {
    const filtered = checklistValue.filter((ci) => ci.id !== checklistItemId);
    const updated = filtered.map((ci, index) => ({ ...ci, order: index }));
    await saveChecklist(updated);
  };

  const completedCount = checklistValue.filter((ci) => ci.completed).length;
  const totalCount = checklistValue.length;

  return (
    <div className="px-1">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {/* Header with progress */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              <ListChecks className="w-4 h-4" />
              Checklist
            </h3>
            {totalCount > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  completedCount === totalCount
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {completedCount}/{totalCount} done
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Add new item input - always visible at top */}
          <div className="flex gap-2">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add new item..."
              className="flex-1 h-9"
              maxLength={100}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
              aria-label="Add item"
              className="h-9 w-9"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  completedCount === totalCount
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          )}

          {/* Checklist items */}
          {totalCount > 0 ? (
            <div className="space-y-1">
              {[...checklistValue]
                .sort((a, b) => {
                  // Completed items go to bottom
                  if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                  }
                  // Within same completion status, sort by order
                  return a.order - b.order;
                })
                .map((ci) => (
                  <div
                    key={ci.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <button
                      onClick={() => handleToggleItem(ci.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        ci.completed
                          ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600'
                          : 'border-slate-300 hover:border-blue-400 dark:border-slate-600 dark:hover:border-blue-500'
                      }`}
                      aria-label={ci.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {ci.completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        ci.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {ci.text}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(ci.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 dark:hover:bg-red-900/30 transition-all"
                      aria-label="Delete item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500">
              <p className="text-sm">No items yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
