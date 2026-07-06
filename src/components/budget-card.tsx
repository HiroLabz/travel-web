'use client';

import { useState, useMemo } from 'react';
import type { BudgetItem, HouseholdBudgetCategory, WizardItineraryItem } from '@/types';
import { BUDGET_CATEGORY_COLORS } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/constants';
import { updateTripBudgetAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-4">
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Estimated Budget
            </h3>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            {budgetEditMode ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBudgetEditMode(false)}
                className="text-slate-500"
              >
                <Check className="w-4 h-4 mr-1" />
                Done
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBudgetEditMode(true)}
                className="text-emerald-600"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent>
          {/* Total */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 mb-4">
            <div className="text-xs text-slate-500">Total Estimated</div>
            <div className="text-2xl font-bold text-emerald-700">
              {formatCurrency(totalBudget, currency)}
            </div>
          </div>

          {/* Chart or Empty State */}
          {budgetChartData.length > 0 ? (
            <div className="h-32 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                  <Tooltip
                    contentStyle={{ fontSize: '12px' }}
                    formatter={(value: number) => [`${getCurrencySymbol(currency)}${value}`, 'Cost']}
                  />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {budgetChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-400 text-sm mb-4">
              No budget items yet
            </div>
          )}

          {/* Budget Items List */}
          {budgetEditMode && budgetItems.length > 0 && (
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {budgetItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
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
                      className="text-red-400 hover:text-red-600"
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
            <div className="space-y-3 border-t border-slate-100 pt-4">
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
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
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
