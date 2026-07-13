'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Expense, HouseholdMember, HouseholdBudgetCategory, ExpenseSplit, DestinationCurrency, ExchangeRateCache, Destination } from '@/types';
import { BUDGET_CATEGORY_COLORS, DEFAULT_BUDGET_CATEGORIES } from '@/types';
import { formatCurrency, CURRENCIES, getDefaultCurrencyForCountry, getCountryCodeFromName } from '@/lib/constants';
import { convertCurrency } from '@/lib/exchange-rates';
import { getAvatarUrl } from '@/lib/avatar';
import {
  addExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
} from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Plus, Camera, Trash2, Users, Receipt, DollarSign,
  Loader2, Filter, Sparkles, ChevronDown, ChevronUp, Split,
  List, PieChartIcon, FileText, Pencil, MoreVertical,
  ZoomIn, ZoomOut, RotateCw, ExternalLink, X, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BillSplitSelector } from '@/components/bill-split-selector';

interface ExpenseTabProps {
  tripId: string;
  householdId: string;
  expenses: Expense[];
  onExpensesChange: (expenses: Expense[]) => void;
  members: HouseholdMember[];
  budgetCategories: HouseholdBudgetCategory[];
  currency: string;
  destinations?: Destination[];
  destinationCurrencies?: DestinationCurrency[];
  exchangeRates?: ExchangeRateCache;
}

export function ExpenseTab({
  tripId,
  householdId,
  expenses,
  onExpensesChange,
  members,
  budgetCategories,
  currency,
  destinations,
  destinationCurrencies,
  exchangeRates,
}: ExpenseTabProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // Dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBreakdownDialogOpen, setIsBreakdownDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<{ url: string; name: string } | null>(null);
  const [receiptScale, setReceiptScale] = useState(1.0);
  const [receiptRotation, setReceiptRotation] = useState(0);

  // View and filters
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(true);
  const [isMemberExpanded, setIsMemberExpanded] = useState(true);

  // Helper to get expense amount in home currency
  const getAmountInHomeCurrency = (exp: Expense): number => {
    // If expense is in home currency, return original amount
    if (!exp.originalCurrency || exp.originalCurrency === currency) {
      return exp.amount;
    }
    // If we have a converted amount, use it
    if (exp.convertedAmount !== undefined) {
      return exp.convertedAmount;
    }
    // Fallback: try to convert using current exchange rates
    if (exchangeRates) {
      const conversion = convertCurrency(exp.amount, exp.originalCurrency, currency, exchangeRates);
      if (conversion) {
        return conversion.convertedAmount;
      }
    }
    // Last resort: return original amount (will be in wrong currency but better than nothing)
    return exp.amount;
  };

  // New expense form
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    expenseCurrency: currency, // Currency for this specific expense
  });
  const [saving, setSaving] = useState(false);

  // Bill splitting for new expense
  const [newSplitType, setNewSplitType] = useState<'none' | 'equal' | 'custom'>('none');
  const [newSplits, setNewSplits] = useState<ExpenseSplit[]>([]);
  const [newSelectedMemberIds, setNewSelectedMemberIds] = useState<string[]>([]);

  // Bill splitting for edit expense
  const [editSplitType, setEditSplitType] = useState<'none' | 'equal' | 'custom'>('none');
  const [editSplits, setEditSplits] = useState<ExpenseSplit[]>([]);
  const [editSelectedMemberIds, setEditSelectedMemberIds] = useState<string[]>([]);

  const categories = budgetCategories.length > 0 ? budgetCategories : DEFAULT_BUDGET_CATEGORIES;

  // Helper to get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  // Helper to get category color
  const getCategoryColor = (categoryId: string) => {
    const index = categories.findIndex(c => c.id === categoryId);
    return BUDGET_CATEGORY_COLORS[index % BUDGET_CATEGORY_COLORS.length];
  };

  // Computed data for charts (all amounts in home currency)
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    expenses.forEach(exp => {
      if (!grouped[exp.categoryId]) grouped[exp.categoryId] = 0;
      grouped[exp.categoryId] += getAmountInHomeCurrency(exp);
    });
    return Object.entries(grouped).map(([categoryId, amount]) => ({
      name: getCategoryName(categoryId),
      value: amount,
      color: getCategoryColor(categoryId),
    }));
  }, [expenses, categories, exchangeRates, currency]);

  const expensesByMember = useMemo(() => {
    const grouped: Record<string, number> = {};
    expenses.forEach(exp => {
      const amountInHome = getAmountInHomeCurrency(exp);
      // Calculate ratio for splitting in home currency
      const ratio = exp.amount > 0 ? amountInHome / exp.amount : 1;

      // If expense has splits, add each member's split amount (converted)
      if (exp.splits && exp.splits.length > 0) {
        exp.splits.forEach(split => {
          const memberName = split.memberName || 'Unknown';
          if (!grouped[memberName]) grouped[memberName] = 0;
          grouped[memberName] += split.amount * ratio;
        });
      } else {
        // No splits - add to assigned member (skip "All" since it's not a specific person)
        if (exp.assignedTo !== 'all' && exp.assignedToName !== 'All') {
          const memberName = exp.assignedToName || 'Unknown';
          if (!grouped[memberName]) grouped[memberName] = 0;
          grouped[memberName] += amountInHome;
        }
      }
    });
    return Object.entries(grouped).map(([name, amount], index) => ({
      name,
      amount,
      color: BUDGET_CATEGORY_COLORS[index % BUDGET_CATEGORY_COLORS.length],
    }));
  }, [expenses, exchangeRates, currency]);

  // Total expenses in home currency
  const totalExpenses = useMemo(() =>
    expenses.reduce((sum, exp) => sum + getAmountInHomeCurrency(exp), 0),
    [expenses, exchangeRates, currency]);

  // Check if any filter is active
  const isFilterActive = filterCategory !== 'all' || filterMember !== 'all';

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (filterCategory !== 'all' && exp.categoryId !== filterCategory) return false;
      if (filterMember !== 'all') {
        if (exp.assignedTo !== filterMember && exp.assignedToName !== filterMember) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterCategory, filterMember]);

  // Filtered total expenses
  const filteredTotalExpenses = useMemo(() =>
    filteredExpenses.reduce((sum, exp) => sum + getAmountInHomeCurrency(exp), 0),
    [filteredExpenses, exchangeRates, currency]);

  // Filtered expenses by category (for breakdown dialog when filtered)
  const filteredExpensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      if (!grouped[exp.categoryId]) grouped[exp.categoryId] = 0;
      grouped[exp.categoryId] += getAmountInHomeCurrency(exp);
    });
    return Object.entries(grouped).map(([categoryId, amount]) => ({
      name: getCategoryName(categoryId),
      value: amount,
      color: getCategoryColor(categoryId),
    }));
  }, [filteredExpenses, categories, exchangeRates, currency]);

  // Filtered expenses by member (for breakdown dialog when filtered)
  const filteredExpensesByMember = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      const amountInHome = getAmountInHomeCurrency(exp);
      const ratio = exp.amount > 0 ? amountInHome / exp.amount : 1;

      if (exp.splits && exp.splits.length > 0) {
        exp.splits.forEach(split => {
          const memberName = split.memberName || 'Unknown';
          if (!grouped[memberName]) grouped[memberName] = 0;
          grouped[memberName] += split.amount * ratio;
        });
      } else {
        if (exp.assignedTo !== 'all' && exp.assignedToName !== 'All') {
          const memberName = exp.assignedToName || 'Unknown';
          if (!grouped[memberName]) grouped[memberName] = 0;
          grouped[memberName] += amountInHome;
        }
      }
    });
    return Object.entries(grouped).map(([name, amount], index) => ({
      name,
      amount,
      color: BUDGET_CATEGORY_COLORS[index % BUDGET_CATEGORY_COLORS.length],
    }));
  }, [filteredExpenses, exchangeRates, currency]);

  // Get available currencies for expense (home + destinations)
  const availableCurrencies = useMemo(() => {
    const currencies = new Set([currency]); // Home currency first

    // First try to use explicitly configured destination currencies
    if (destinationCurrencies && destinationCurrencies.length > 0) {
      destinationCurrencies.forEach(dc => currencies.add(dc.currency));
    } else if (destinations && destinations.length > 0) {
      // Fallback: derive currencies from trip destinations
      destinations.forEach(dest => {
        const countryCode = getCountryCodeFromName(dest.country);
        if (countryCode) {
          const destCurrency = getDefaultCurrencyForCountry(countryCode);
          currencies.add(destCurrency);
        }
      });
    }

    return Array.from(currencies);
  }, [currency, destinationCurrencies, destinations]);

  // Reset form
  const resetNewExpense = () => {
    setNewExpense({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: categories[0]?.id || '',
      expenseCurrency: currency,
    });
    setNewSplitType('none');
    setNewSplits([]);
    setNewSelectedMemberIds([]);
  };

  // Export to Excel
  const handleExportToExcel = () => {
    // Use filtered expenses if filter is active, otherwise use all
    const expensesToExport = isFilterActive ? filteredExpenses : expenses;

    if (expensesToExport.length === 0) {
      toast({ title: 'No expenses to export', variant: 'destructive' });
      return;
    }

    // Create main expenses data
    const expenseData = expensesToExport.map(exp => {
      const amountInHome = getAmountInHomeCurrency(exp);
      const hasSplits = exp.splits && exp.splits.length > 0;

      return {
        'Date': format(parseISO(exp.date), 'yyyy-MM-dd'),
        'Description': exp.description,
        'Category': getCategoryName(exp.categoryId),
        'Amount': exp.amount,
        'Currency': exp.originalCurrency || exp.currency,
        [`Amount (${currency})`]: amountInHome,
        'Assigned To': exp.assignedToName,
        'Split Type': exp.splitType || 'none',
        'Split Members': hasSplits ? exp.splits!.map(s => s.memberName).join(', ') : '-',
        'Created By': exp.createdBy?.name || 'Unknown',
        'Created At': exp.createdAt ? format(parseISO(exp.createdAt), 'yyyy-MM-dd HH:mm') : '-',
      };
    });

    // Create category summary data
    const categoryData = (isFilterActive ? filteredExpensesByCategory : expensesByCategory)
      .sort((a, b) => b.value - a.value)
      .map(cat => ({
        'Category': cat.name,
        [`Total (${currency})`]: cat.value,
        'Percentage': `${((cat.value / (isFilterActive ? filteredTotalExpenses : totalExpenses)) * 100).toFixed(1)}%`,
      }));

    // Create member summary data
    const memberSummaryData = (isFilterActive ? filteredExpensesByMember : expensesByMember)
      .sort((a, b) => b.amount - a.amount)
      .map(m => ({
        'Member': m.name,
        [`Total (${currency})`]: m.amount,
        'Percentage': `${((m.amount / (isFilterActive ? filteredTotalExpenses : totalExpenses)) * 100).toFixed(1)}%`,
      }));

    // Create split details data (for expenses with splits)
    const splitDetailsData: Array<Record<string, string | number>> = [];
    expensesToExport.forEach(exp => {
      if (exp.splits && exp.splits.length > 0) {
        const amountInHome = getAmountInHomeCurrency(exp);
        const ratio = exp.amount > 0 ? amountInHome / exp.amount : 1;

        exp.splits.forEach(split => {
          splitDetailsData.push({
            'Date': format(parseISO(exp.date), 'yyyy-MM-dd'),
            'Expense Description': exp.description,
            'Category': getCategoryName(exp.categoryId),
            'Member': split.memberName,
            'Split Amount': split.amount,
            'Currency': exp.originalCurrency || exp.currency,
            [`Split Amount (${currency})`]: split.amount * ratio,
          });
        });
      }
    });

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Expenses sheet
    const wsExpenses = XLSX.utils.json_to_sheet(expenseData);
    // Set column widths
    wsExpenses['!cols'] = [
      { wch: 12 }, // Date
      { wch: 40 }, // Description
      { wch: 18 }, // Category
      { wch: 12 }, // Amount
      { wch: 8 },  // Currency
      { wch: 15 }, // Amount in home currency
      { wch: 20 }, // Assigned To
      { wch: 10 }, // Split Type
      { wch: 30 }, // Split Members
      { wch: 20 }, // Created By
      { wch: 18 }, // Created At
    ];
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

    // Category Summary sheet
    const wsCategories = XLSX.utils.json_to_sheet(categoryData);
    wsCategories['!cols'] = [
      { wch: 20 }, // Category
      { wch: 15 }, // Total
      { wch: 12 }, // Percentage
    ];
    XLSX.utils.book_append_sheet(wb, wsCategories, 'By Category');

    // Member Summary sheet
    const wsMembers = XLSX.utils.json_to_sheet(memberSummaryData);
    wsMembers['!cols'] = [
      { wch: 20 }, // Member
      { wch: 15 }, // Total
      { wch: 12 }, // Percentage
    ];
    XLSX.utils.book_append_sheet(wb, wsMembers, 'By Person');

    // Split Details sheet (if there are splits)
    if (splitDetailsData.length > 0) {
      const wsSplits = XLSX.utils.json_to_sheet(splitDetailsData);
      wsSplits['!cols'] = [
        { wch: 12 }, // Date
        { wch: 40 }, // Expense Description
        { wch: 18 }, // Category
        { wch: 20 }, // Member
        { wch: 12 }, // Split Amount
        { wch: 8 },  // Currency
        { wch: 18 }, // Split Amount in home currency
      ];
      XLSX.utils.book_append_sheet(wb, wsSplits, 'Split Details');
    }

    // Generate filename with date
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filterSuffix = isFilterActive ? '_filtered' : '';
    const filename = `expenses_${dateStr}${filterSuffix}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);

    toast({
      title: 'Export successful',
      description: `Exported ${expensesToExport.length} expenses to ${filename}`,
    });
  };

  // Add expense handler
  const handleAddExpense = async () => {
    if (!user || !newExpense.amount || !newExpense.description || !newExpense.categoryId) {
      toast({ title: 'Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    // Validate splits if using split mode
    if (newSplitType !== 'none' && newSplits.length === 0) {
      toast({ title: 'Error', description: 'Please select members for bill splitting.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Determine assignment based on split type
    let assignedTo = 'all';
    let assignedToName = 'All';
    let splitType: 'none' | 'equal' | 'custom' | undefined;
    let splits: ExpenseSplit[] | undefined;

    if (newSplitType === 'none') {
      if (newSelectedMemberIds.length > 0) {
        const member = members.find(m => (m.uid || m.name) === newSelectedMemberIds[0]);
        assignedTo = newSelectedMemberIds[0];
        assignedToName = member?.name || assignedTo;
      }
    } else {
      splitType = newSplitType;
      splits = newSplits;
      assignedTo = 'split';
      assignedToName = `Split (${newSplits.length})`;
    }

    const expenseAmount = parseFloat(newExpense.amount);
    const expenseCurr = newExpense.expenseCurrency || currency;

    // Calculate converted amount if expense is in different currency
    let convertedAmount: number | undefined;
    let exchangeRateUsed: number | undefined;

    if (expenseCurr !== currency && exchangeRates) {
      const conversion = convertCurrency(expenseAmount, expenseCurr, currency, exchangeRates);
      if (conversion) {
        convertedAmount = conversion.convertedAmount;
        exchangeRateUsed = conversion.rate;
      }
    }

    const expense = {
      tripId,
      categoryId: newExpense.categoryId,
      amount: expenseAmount,
      currency: expenseCurr,
      description: newExpense.description,
      date: newExpense.date,
      assignedTo,
      assignedToName,
      splitType,
      splits,
      createdBy: {
        uid: user.uid,
        name: user.displayName,
      },
      // Currency tracking
      originalCurrency: expenseCurr,
      originalAmount: expenseAmount,
      convertedAmount,
      exchangeRateUsed,
    };

    const result = await addExpenseAction(tripId, expense);
    setSaving(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.expense) {
      onExpensesChange([...expenses, result.expense]);
      setIsAddDialogOpen(false);
      resetNewExpense();
      toast({ title: 'Expense added' });
    }
  };

  // Delete expense handler
  const handleDeleteExpense = async (expenseId: string) => {
    const result = await deleteExpenseAction(tripId, expenseId);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      onExpensesChange(expenses.filter(e => e.id !== expenseId));
      toast({ title: 'Expense deleted' });
    }
  };

  // Edit expense handler
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    // Initialize split state from expense
    setEditSplitType(expense.splitType || 'none');
    setEditSplits(expense.splits || []);
    if (expense.splitType === 'none' || !expense.splitType) {
      setEditSelectedMemberIds(expense.assignedTo === 'all' ? [] : [expense.assignedTo]);
    } else {
      setEditSelectedMemberIds([]);
    }
    setIsEditDialogOpen(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;

    // Validate splits if using split mode
    if (editSplitType !== 'none' && editSplits.length === 0) {
      toast({ title: 'Error', description: 'Please select members for bill splitting.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Determine assignment based on split type
    let assignedTo = 'all';
    let assignedToName = 'All';
    let splitType: 'none' | 'equal' | 'custom' | undefined;
    let splits: ExpenseSplit[] | undefined;

    if (editSplitType === 'none') {
      if (editSelectedMemberIds.length > 0) {
        const member = members.find(m => (m.uid || m.name) === editSelectedMemberIds[0]);
        assignedTo = editSelectedMemberIds[0];
        assignedToName = member?.name || assignedTo;
      }
    } else {
      splitType = editSplitType;
      splits = editSplits;
      assignedTo = 'split';
      assignedToName = `Split (${editSplits.length})`;
    }

    // Calculate converted amount if expense is in different currency
    const expenseCurr = editingExpense.originalCurrency || editingExpense.currency;
    let convertedAmount: number | undefined;
    let exchangeRateUsed: number | undefined;

    if (expenseCurr !== currency && exchangeRates) {
      const conversion = convertCurrency(editingExpense.amount, expenseCurr, currency, exchangeRates);
      if (conversion) {
        convertedAmount = conversion.convertedAmount;
        exchangeRateUsed = conversion.rate;
      }
    }

    const result = await updateExpenseAction(tripId, editingExpense.id, {
      amount: editingExpense.amount,
      currency: expenseCurr,
      description: editingExpense.description,
      date: editingExpense.date,
      categoryId: editingExpense.categoryId,
      assignedTo,
      assignedToName,
      splitType,
      splits,
      originalCurrency: expenseCurr,
      originalAmount: editingExpense.amount,
      convertedAmount,
      exchangeRateUsed,
    });
    setSaving(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      onExpensesChange(expenses.map(e =>
        e.id === editingExpense.id ? {
          ...e,
          ...editingExpense,
          currency: expenseCurr,
          originalCurrency: expenseCurr,
          originalAmount: editingExpense.amount,
          convertedAmount,
          exchangeRateUsed,
          assignedTo,
          assignedToName,
          splitType,
          splits
        } : e
      ));
      setIsEditDialogOpen(false);
      setEditingExpense(null);
      setEditSplitType('none');
      setEditSplits([]);
      setEditSelectedMemberIds([]);
      toast({ title: 'Expense updated' });
    }
  };

  // Helper to get member avatar
  const getMemberAvatar = (assignedTo: string, assignedToName: string) => {
    if (assignedTo === 'all' || assignedToName === 'All') return null;
    const member = members.find(m => (m.uid || m.name) === assignedTo || m.name === assignedToName);
    if (member) {
      return getAvatarUrl(member.photoURL, member.name);
    }
    return getAvatarUrl(null, assignedToName);
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-2 rounded shadow border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {formatCurrency(payload[0].value, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Expense tracking</h2>
        <p className="text-muted-foreground">Track spending and split costs across the group.</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => { resetNewExpense(); setIsAddDialogOpen(true); }} className="gap-2 bg-brand-500 hover:bg-brand-600 rounded-lg">
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>

        <Button
          variant="outline"
          onClick={handleExportToExcel}
          disabled={expenses.length === 0}
          className="gap-2 border-border text-muted-foreground hover:bg-muted rounded-lg"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'gap-1.5 bg-brand-500 hover:bg-brand-600 rounded-lg' : 'gap-1.5 border-border text-muted-foreground hover:bg-muted rounded-lg'}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
          <Button
            variant={viewMode === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('chart')}
            className={viewMode === 'chart' ? 'gap-1.5 bg-brand-500 hover:bg-brand-600 rounded-lg' : 'gap-1.5 border-border text-muted-foreground hover:bg-muted rounded-lg'}
          >
            <PieChartIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Charts</span>
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <button
        onClick={() => setIsBreakdownDialogOpen(true)}
        className="w-full bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 rounded-xl p-6 text-white mb-6 text-left hover:opacity-95 transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">
              {isFilterActive ? 'Filtered Expenses' : 'Total Expenses'}
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(isFilterActive ? filteredTotalExpenses : totalExpenses, currency)}
            </p>
            {isFilterActive && (
              <p className="text-white/60 text-xs mt-1">
                of {formatCurrency(totalExpenses, currency)} total
              </p>
            )}
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <div>
            <span className="text-white/70">
              {isFilterActive ? filteredExpenses.length : expenses.length}
            </span>
            <span className="text-white/60 ml-1">
              {isFilterActive ? `of ${expenses.length} expenses` : 'expenses'}
            </span>
          </div>
          <div>
            <span className="text-white/70">{expensesByCategory.length}</span>
            <span className="text-white/60 ml-1">categories</span>
          </div>
        </div>
        <p className="text-white/60 text-xs mt-3">Tap for breakdown details</p>
      </button>

      {/* Chart View */}
      {viewMode === 'chart' && expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* By Category Pie Chart */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">By Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By Member Bar Chart */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">By Member</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByMember} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value, currency)} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(value) => formatCurrency(value as number, currency)} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {expensesByMember.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {viewMode === 'list' && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {members.map(member => (
                <SelectItem key={member.uid || member.name || ''} value={member.uid || member.name || ''}>
                  {member.name || member.email || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Expense List */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No expenses yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first expense or capture a receipt
              </p>
            </div>
          ) : (
            filteredExpenses.map(expense => {
              const avatarUrl = getMemberAvatar(expense.assignedTo, expense.assignedToName);
              const hasSplits = expense.splits && expense.splits.length > 0;
              const isExpanded = expandedExpenseId === expense.id;

              return (
                <div
                  key={expense.id}
                  className="bg-card rounded-lg border border-border overflow-hidden"
                >
                  {/* Main Content */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Category Color Bar */}
                      <div
                        className="w-1 min-h-[48px] sm:min-h-[56px] rounded-full flex-shrink-0 self-stretch"
                        style={{ backgroundColor: getCategoryColor(expense.categoryId) }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Top row: Description + Amount */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate text-sm sm:text-base">
                              {expense.description}
                            </p>
                            {/* Meta info row */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(expense.date), 'MMM d')}
                              </span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${getCategoryColor(expense.categoryId)}20`,
                                  color: getCategoryColor(expense.categoryId),
                                }}
                              >
                                {getCategoryName(expense.categoryId)}
                              </span>
                              {/* Split Badge */}
                              {hasSplits && (
                                <button
                                  onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand-500 hover:opacity-80 transition-colors"
                                >
                                  <Split className="w-3 h-3" />
                                  {expense.splits?.length}
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                              {expense.aiExtracted && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-purple-600 dark:text-purple-400">
                                  <Sparkles className="w-3 h-3" />
                                </span>
                              )}
                              {expense.receiptUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReceiptScale(1.0);
                                    setReceiptRotation(0);
                                    setPreviewReceipt({
                                      url: expense.receiptUrl!,
                                      name: expense.receiptName || expense.description
                                    });
                                  }}
                                  className="inline-flex items-center justify-center p-0.5 rounded hover:bg-muted transition-colors"
                                  title="View receipt"
                                >
                                  <FileText className="w-3 h-3 text-brand-500" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Amount + Avatar + Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Member Avatar (only for non-split) */}
                            {!hasSplits && avatarUrl && (
                              <img
                                src={avatarUrl}
                                alt={expense.assignedToName}
                                className="w-6 h-6 rounded-full object-cover border border-border flex-shrink-0"
                              />
                            )}
                            {/* Stacked Avatars for splits */}
                            {hasSplits && expense.splits && (
                              <div className="flex -space-x-2">
                                {expense.splits.slice(0, 3).map((split, idx) => {
                                  const member = members.find(m => (m.uid || m.name) === split.memberId || m.name === split.memberName);
                                  const splitAvatarUrl = getAvatarUrl(member?.photoURL, split.memberName);
                                  return (
                                    <img
                                      key={idx}
                                      src={splitAvatarUrl}
                                      alt={split.memberName}
                                      className="w-5 h-5 rounded-full object-cover border-2 border-card"
                                    />
                                  );
                                })}
                                {expense.splits.length > 3 && (
                                  <div className="w-5 h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                                    +{expense.splits.length - 3}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Amount - shows original currency with home currency conversion */}
                            <div className="text-right">
                              <p className="font-semibold text-foreground text-sm sm:text-base whitespace-nowrap">
                                {formatCurrency(expense.amount, expense.originalCurrency || expense.currency)}
                              </p>
                              {expense.originalCurrency && expense.originalCurrency !== currency && (
                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  ≈ {formatCurrency(getAmountInHomeCurrency(expense), currency)}
                                </p>
                              )}
                            </div>

                            {/* Actions Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Split Details */}
                  {isExpanded && hasSplits && expense.splits && (
                    <div className="border-t border-border bg-muted px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Split className="w-4 h-4 text-brand-500" />
                        <span className="text-sm font-medium text-foreground">
                          {expense.splitType === 'equal' ? 'Split Equally' : 'Custom Split'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {expense.splits.map((split, idx) => {
                          const member = members.find(m => (m.uid || m.name) === split.memberId || m.name === split.memberName);
                          const splitAvatarUrl = getAvatarUrl(member?.photoURL, split.memberName);
                          return (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img
                                  src={splitAvatarUrl}
                                  alt={split.memberName}
                                  className="w-6 h-6 rounded-full object-cover border border-border"
                                />
                                <span className="text-sm text-foreground">
                                  {split.memberName}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                {formatCurrency(split.amount, currency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* FAB for Receipt Capture - Navigate to full-page receipt analysis */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 z-50 rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
        onClick={() => router.push(`/trip/${tripId}/receipt`)}
      >
        <Camera className="w-6 h-6" />
      </Button>

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="flex gap-2">
                  <Select
                    value={newExpense.expenseCurrency}
                    onValueChange={(value) => setNewExpense({ ...newExpense, expenseCurrency: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map(curr => (
                        <SelectItem key={curr} value={curr}>
                          {curr}{curr === currency ? ' (Home)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="What was this expense for?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={newExpense.categoryId}
                onValueChange={(value) => setNewExpense({ ...newExpense, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(cat.id) }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bill Split Section */}
            <BillSplitSelector
              totalAmount={parseFloat(newExpense.amount) || 0}
              currency={currency}
              members={members}
              splitType={newSplitType}
              splits={newSplits}
              onSplitTypeChange={setNewSplitType}
              onSplitsChange={setNewSplits}
              selectedMemberIds={newSelectedMemberIds}
              onSelectedMemberIdsChange={setNewSelectedMemberIds}
              compact
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <div className="flex gap-2">
                    <Select
                      value={editingExpense.originalCurrency || editingExpense.currency}
                      onValueChange={(value) => setEditingExpense({ ...editingExpense, originalCurrency: value, currency: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCurrencies.map(curr => (
                          <SelectItem key={curr} value={curr}>
                            {curr}{curr === currency ? ' (Home)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Input
                        id="edit-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingExpense.amount}
                        onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingExpense.categoryId}
                  onValueChange={(value) => setEditingExpense({ ...editingExpense, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getCategoryColor(cat.id) }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bill Split Section */}
              <BillSplitSelector
                totalAmount={editingExpense.amount}
                currency={currency}
                members={members}
                splitType={editSplitType}
                splits={editSplits}
                onSplitTypeChange={setEditSplitType}
                onSplitsChange={setEditSplits}
                selectedMemberIds={editSelectedMemberIds}
                onSelectedMemberIdsChange={setEditSelectedMemberIds}
                compact
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingExpense(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateExpense} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Dialog */}
      <Dialog open={!!previewReceipt} onOpenChange={(open) => !open && setPreviewReceipt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
            <DialogTitle className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="truncate">{previewReceipt?.name}</span>
              </div>
              <a
                href={previewReceipt?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-normal flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptScale(prev => Math.max(prev - 0.25, 0.5))}
              disabled={receiptScale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[50px] text-center">
              {Math.round(receiptScale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptScale(prev => Math.min(prev + 0.25, 3))}
              disabled={receiptScale >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptRotation(prev => (prev + 90) % 360)}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Image Container */}
          <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900" style={{ minHeight: '400px' }}>
            <div className="flex items-center justify-center min-h-[400px] p-4">
              {previewReceipt && (
                <img
                  src={previewReceipt.url}
                  alt={previewReceipt.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  style={{
                    transform: `scale(${receiptScale}) rotate(${receiptRotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                />
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end">
            <Button variant="outline" onClick={() => setPreviewReceipt(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Breakdown Dialog */}
      <Dialog open={isBreakdownDialogOpen} onOpenChange={setIsBreakdownDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              Expense Breakdown
              {isFilterActive && (
                <span className="text-xs font-normal bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  Filtered
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Total Summary */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <p className="text-blue-100 text-sm">
                {isFilterActive ? 'Filtered Expenses' : 'Total Expenses'}
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(isFilterActive ? filteredTotalExpenses : totalExpenses, currency)}
              </p>
              {isFilterActive && (
                <p className="text-blue-200 text-xs mt-1">
                  {filteredExpenses.length} of {expenses.length} expenses ({formatCurrency(totalExpenses, currency)} total)
                </p>
              )}
            </div>

            {/* By Category Section */}
            {(() => {
              const categoryData = isFilterActive ? filteredExpensesByCategory : expensesByCategory;
              const totalForPercentage = isFilterActive ? filteredTotalExpenses : totalExpenses;
              return (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" />
                      By Category
                      <span className="text-xs font-normal text-slate-500">({categoryData.length})</span>
                    </h3>
                    {isCategoryExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  {isCategoryExpanded && (
                    <div className="p-3 space-y-2">
                      {categoryData.length > 0 ? (
                        categoryData
                          .sort((a, b) => b.value - a.value)
                          .map((category, idx) => {
                            const percentage = totalForPercentage > 0 ? (category.value / totalForPercentage) * 100 : 0;
                            return (
                              <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: category.color }}
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                      {category.name}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                      {formatCurrency(category.value, currency)}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                      ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full transition-all"
                                    style={{ width: `${percentage}%`, backgroundColor: category.color }}
                                  />
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No expenses recorded yet</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* By Person Section */}
            {(() => {
              const memberData = isFilterActive ? filteredExpensesByMember : expensesByMember;
              const totalForPercentage = isFilterActive ? filteredTotalExpenses : totalExpenses;
              return (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setIsMemberExpanded(!isMemberExpanded)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      By Person
                      <span className="text-xs font-normal text-slate-500">({memberData.length})</span>
                    </h3>
                    {isMemberExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  {isMemberExpanded && (
                    <div className="p-3 space-y-2">
                      {memberData.length > 0 ? (
                        memberData
                          .sort((a, b) => b.amount - a.amount)
                          .map((personData, idx) => {
                            const member = members.find(m => m.name === personData.name);
                            const avatarUrl = getAvatarUrl(member?.photoURL, personData.name);
                            const percentage = totalForPercentage > 0 ? (personData.amount / totalForPercentage) * 100 : 0;
                            return (
                              <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={avatarUrl}
                                      alt={personData.name}
                                      className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                      {personData.name}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                      {formatCurrency(personData.amount, currency)}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                                      ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full transition-all"
                                    style={{ width: `${percentage}%`, backgroundColor: personData.color }}
                                  />
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No personal expenses recorded. Expenses assigned to &quot;All&quot; are not attributed to specific members.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Unassigned Expenses Notice */}
            {expenses.some(e => e.assignedTo === 'all' && !e.splits?.length) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Some expenses are assigned to &quot;All&quot; without splits and are not included in the per-person breakdown.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBreakdownDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
