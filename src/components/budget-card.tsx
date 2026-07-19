'use client';

import { useState, useMemo } from 'react';
import type { BudgetItem, HouseholdBudgetCategory, WizardItineraryItem } from '@/types';
import { BUDGET_CATEGORY_COLORS } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/constants';
import { updateTripBudgetAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/motion/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/motion/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DollarSign,
  Pencil,
  Check,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';

interface BudgetCardProps {
  tripId: string;
  initialBudgetItems: BudgetItem[];
  budgetCategories: HouseholdBudgetCategory[];
  currency: string;
  wizardItems?: WizardItineraryItem[];
  onBudgetChange?: (items: BudgetItem[]) => void;
}

export function BudgetCard({
  tripId,
  initialBudgetItems,
  budgetCategories,
  currency,
  wizardItems = [],
  onBudgetChange,
}: BudgetCardProps) {
  const { toast } = useToast();

  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(initialBudgetItems);
  const [budgetEditMode, setBudgetEditMode] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [newBudgetItem, setNewBudgetItem] = useState<Partial<BudgetItem>>({
    categoryId: budgetCategories[0]?.id || '',
    amount: 0,
    currency: currency,
  });

  const getCategoryName = (categoryId: string) => {
    const category = budgetCategories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    const index = budgetCategories.findIndex(c => c.id === categoryId);
    return BUDGET_CATEGORY_COLORS[index % BUDGET_CATEGORY_COLORS.length];
  };

  const { budgetChartData, totalBudget } = useMemo(() => {
    const activityCosts = wizardItems
      .filter(item => item.estimatedCost && item.estimatedCost > 0)
      .reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

    const budgetByCategory = budgetItems.reduce((acc, item) => {
      if (!acc[item.categoryId]) {
        acc[item.categoryId] = 0;
      }
      acc[item.categoryId] += item.amount;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(budgetByCategory).map(([categoryId, amount]) => ({
      name: getCategoryName(categoryId),
      cost: amount,
      color: getCategoryColor(categoryId),
    }));

    if (activityCosts > 0) {
      chartData.push({
        name: 'Activities (Est.)',
        cost: activityCosts,
        color: '#10b981',
      });
    }

    const total = budgetItems.reduce((sum, item) => sum + item.amount, 0) + activityCosts;

    return { budgetChartData: chartData, totalBudget: total };
  }, [budgetItems, wizardItems, budgetCategories]);

  const handleAddBudgetItem = async () => {
    if (!newBudgetItem.categoryId || !newBudgetItem.amount) {
      toast({
        title: 'Missing fields',
        description: 'Please select a category and enter an amount.',
        variant: 'destructive',
      });
      return;
    }

    const item: BudgetItem = {
      id: `budget_${Date.now()}`,
      categoryId: newBudgetItem.categoryId,
      amount: Number(newBudgetItem.amount),
      currency: currency,
    };

    const updatedItems = [...budgetItems, item];
    setBudgetItems(updatedItems);
    onBudgetChange?.(updatedItems);

    const result = await updateTripBudgetAction(tripId, updatedItems);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setNewBudgetItem({ categoryId: budgetCategories[0]?.id || '', amount: 0, currency: currency });
      toast({ title: 'Budget item added' });
    }
  };

  const handleDeleteBudgetItem = async (itemId: string) => {
    const updatedItems = budgetItems.filter(item => item.id !== itemId);
    setBudgetItems(updatedItems);
    onBudgetChange?.(updatedItems);

    const result = await updateTripBudgetAction(tripId, updatedItems);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border h-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-4">
          <CollapsibleTrigger className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-md bg-success-soft text-success-accent flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Budget
            </h3>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            {budgetEditMode ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBudgetEditMode(false)}
                className="text-muted-foreground"
              >
                <Check className="w-4 h-4 mr-1" />
                Done
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBudgetEditMode(true)}
                className="text-success-accent"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent>
          {/* Total */}
          <div className="mb-5">
            <div className="text-xs text-muted-foreground">Total estimated</div>
            <div className="text-3xl font-bold text-foreground mt-0.5">
              {formatCurrency(totalBudget, currency)}
            </div>
          </div>

          {/* Category breakdown or Empty State */}
          {budgetChartData.length > 0 ? (
            <div className="flex flex-col gap-3.5 mb-4">
              {budgetChartData.map((entry, index) => {
                const pct = totalBudget > 0 ? Math.round((entry.cost / totalBudget) * 100) : 0;
                return (
                  <div key={`${entry.name}-${index}`}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                        {entry.name}
                      </div>
                      <div className="font-semibold text-foreground">
                        {getCurrencySymbol(currency)}{entry.cost.toLocaleString()}
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: entry.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm mb-4">
              No budget items yet
            </div>
          )}

          {/* Budget Items List */}
          {budgetEditMode && budgetItems.length > 0 && (
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {budgetItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getCategoryColor(item.categoryId) }}
                    />
                    <span className="truncate">{getCategoryName(item.categoryId)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(item.amount, currency)}</span>
                    <button
                      onClick={() => handleDeleteBudgetItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Budget Item Form */}
          {budgetEditMode && (
            <div className="space-y-3 border-t border-border pt-4">
              <Select
                value={newBudgetItem.categoryId}
                onValueChange={(v) => setNewBudgetItem(prev => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {budgetCategories.map((cat, index) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: BUDGET_CATEGORY_COLORS[index % BUDGET_CATEGORY_COLORS.length] }}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newBudgetItem.amount || ''}
                    onChange={(e) => setNewBudgetItem(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-xs pl-6"
                  />
                </div>
                <Button size="sm" onClick={handleAddBudgetItem} className="h-9">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
