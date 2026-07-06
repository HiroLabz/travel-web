'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Trip, Household, Expense, ExpenseSplit, ReceiptAnalysisOutput, HouseholdBudgetCategory, ExchangeRateCache } from '@/types';
import { BUDGET_CATEGORY_COLORS, DEFAULT_BUDGET_CATEGORIES, PLAN_LIMITS } from '@/types';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import { formatCurrency, getDefaultCurrencyForCountry, getCountryCodeFromName } from '@/lib/constants';
import { convertCurrency } from '@/lib/exchange-rates';
import {
  addExpenseAction,
  analyzeReceiptAction,
  uploadReceiptAction,
} from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  ArrowLeft, Camera, Upload, Loader2, Sparkles, Check, X,
  Image as ImageIcon, Receipt, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BillSplitSelector } from '@/components/bill-split-selector';

interface ReceiptAnalysisClientProps {
  trip: Trip;
  household: Household;
  exchangeRates?: ExchangeRateCache;
}

interface EditableLineItem {
  description: string;
  amount: number;
  categoryId: string;
  currency: string;
  selected: boolean;
  splitType: 'none' | 'equal' | 'custom';
  splits: ExpenseSplit[];
  selectedMemberIds: string[];
}

export default function ReceiptAnalysisClient({ trip, household, exchangeRates }: ReceiptAnalysisClientProps) {
  const router = useRouter();
  const { user, subscription, refreshSubscription } = useAuth();
  const { toast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const budgetCategories = household.budgetCategories || [];
  const categories = budgetCategories.length > 0
    ? budgetCategories
    : DEFAULT_BUDGET_CATEGORIES;
  const currency = household.currency || 'USD';
  const members = household.members || [];
  const destinations = trip.destinations || [];
  const destinationCurrencies = trip.destinationCurrencies || [];

  // Get available currencies from trip destinations
  const availableCurrencies = useMemo(() => {
    const currencies = new Set([currency]); // Home currency first

    // First try to use explicitly configured destination currencies
    if (destinationCurrencies.length > 0) {
      destinationCurrencies.forEach(dc => currencies.add(dc.currency));
    } else if (destinations.length > 0) {
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

  // Receipt state
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptMimeType, setReceiptMimeType] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptAnalysisOutput | null>(null);
  const [saving, setSaving] = useState(false);
  const [receiptCurrency, setReceiptCurrency] = useState<string>(currency);

  // Edited data
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState<EditableLineItem[]>([]);
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);

  // Helper to convert amount to home currency
  const getConvertedAmount = (amount: number, fromCurrency: string): { converted: number; rate: number } | null => {
    if (fromCurrency === currency) return null; // No conversion needed
    if (!exchangeRates) return null;
    const conversion = convertCurrency(amount, fromCurrency, currency, exchangeRates);
    if (conversion) {
      return { converted: conversion.convertedAmount, rate: conversion.rate };
    }
    return null;
  };

  // File inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const base64 = dataUrl.split(',')[1];

      setReceiptImage(dataUrl);
      setReceiptFileName(file.name);
      setReceiptMimeType(file.type);
      setReceiptData(null);
      setLineItems([]);

      // Auto-analyze
      setAnalyzing(true);
      const result = await analyzeReceiptAction(
        base64,
        file.type,
        currency,
        categories.map(c => ({ id: c.id, name: c.name })),
        user?.uid
      );
      setAnalyzing(false);

      // Refresh subscription after AI usage
      await refreshSubscription();

      if (result.creditError) {
        setShowUpgradeModal(true);
        return;
      }

      if (result.data) {
        const data = result.data;
        setReceiptData(data);
        setVendor(data.vendor);
        setDate(data.date);
        // Use AI detected currency, or fall back to home currency
        const detectedCurrency = data.currency || currency;
        setReceiptCurrency(detectedCurrency);

        // Set up line items with individual split settings and currency
        setLineItems(
          data.lineItems.map(item => ({
            description: item.description,
            amount: item.amount,
            categoryId: item.suggestedCategoryId || data.suggestedCategoryId,
            currency: detectedCurrency,
            selected: true,
            splitType: 'none' as const,
            splits: [],
            selectedMemberIds: [],
          }))
        );
      } else {
        toast({ title: 'Analysis failed', description: result.error || 'Could not analyze receipt.', variant: 'destructive' });
      }
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  // Update a line item
  const updateLineItem = (index: number, updates: Partial<EditableLineItem>) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], ...updates };
    setLineItems(newItems);
  };

  // Toggle line item selection
  const toggleLineItem = (index: number) => {
    updateLineItem(index, { selected: !lineItems[index].selected });
  };

  // Calculate totals
  const selectedTotal = lineItems.filter(i => i.selected).reduce((sum, i) => sum + i.amount, 0);
  const selectedCount = lineItems.filter(i => i.selected).length;

  // Calculate total in home currency for display
  const selectedTotalInHomeCurrency = useMemo(() => {
    let total = 0;
    lineItems.filter(i => i.selected).forEach(item => {
      if (item.currency === currency) {
        total += item.amount;
      } else {
        const conversion = getConvertedAmount(item.amount, item.currency);
        total += conversion ? conversion.converted : item.amount;
      }
    });
    return total;
  }, [lineItems, currency, exchangeRates]);

  // Save all expenses
  const handleSave = async () => {
    if (!user) return;

    const selectedItems = lineItems.filter(i => i.selected);
    if (selectedItems.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one item.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Upload receipt image first
    let receiptUrl: string | undefined;
    if (receiptImage && user) {
      const base64 = receiptImage.split(',')[1];
      const uploadResult = await uploadReceiptAction(
        trip.id,
        trip.householdId,
        receiptFileName,
        base64,
        receiptMimeType,
        { uid: user.uid, name: user.displayName }
      );
      if (uploadResult.url) {
        receiptUrl = uploadResult.url;
      }
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of selectedItems) {
      // Determine assignment based on split type
      let assignedTo = 'all';
      let assignedToName = 'All';
      let splits: ExpenseSplit[] | undefined;
      let splitType: 'none' | 'equal' | 'custom' | undefined;

      if (item.splitType === 'none') {
        if (item.selectedMemberIds.length > 0) {
          const member = members.find(m => (m.uid || m.name) === item.selectedMemberIds[0]);
          assignedTo = item.selectedMemberIds[0];
          assignedToName = member?.name || assignedTo;
        }
      } else {
        splitType = item.splitType;
        splits = item.splits;
        assignedTo = 'split';
        assignedToName = `Split (${item.splits.length})`;
      }

      // Calculate converted amount if expense is in different currency
      const expenseCurrency = item.currency || currency;
      let convertedAmount: number | undefined;
      let exchangeRateUsed: number | undefined;

      if (expenseCurrency !== currency && exchangeRates) {
        const conversion = convertCurrency(item.amount, expenseCurrency, currency, exchangeRates);
        if (conversion) {
          convertedAmount = conversion.convertedAmount;
          exchangeRateUsed = conversion.rate;
        }
      }

      const expense = {
        tripId: trip.id,
        categoryId: item.categoryId,
        amount: item.amount,
        currency: expenseCurrency,
        description: `${vendor} - ${item.description}`,
        date,
        assignedTo,
        assignedToName,
        splitType,
        splits,
        createdBy: {
          uid: user.uid,
          name: user.displayName,
        },
        receiptUrl,
        receiptName: receiptFileName,
        aiExtracted: true,
        // Currency tracking
        originalCurrency: expenseCurrency,
        originalAmount: item.amount,
        convertedAmount,
        exchangeRateUsed,
      };

      const result = await addExpenseAction(trip.id, expense);
      if (result.error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setSaving(false);

    if (successCount > 0) {
      toast({ title: `${successCount} expense${successCount > 1 ? 's' : ''} added` });
      router.push(`/trip/${trip.id}?tab=expense`);
    }
    if (errorCount > 0) {
      toast({ title: 'Error', description: `Failed to add ${errorCount} expense(s).`, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/trip/${trip.id}?tab=expense`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-slate-800 dark:text-slate-200">Receipt Analysis</h1>
              <p className="text-xs text-slate-500">{trip.title}</p>
            </div>
          </div>

          {lineItems.length > 0 && (
            <Button
              onClick={handleSave}
              disabled={saving || selectedCount === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Check className="w-4 h-4 mr-1" />
              Save {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-24">
        {/* Upload Section */}
        {!receiptImage && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="text-center">
              <Receipt className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Upload a Receipt
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Take a photo or upload an image of your receipt. AI will extract the details.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5" />
                  Take Photo
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5" />
                  Upload Image
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Image & Analysis */}
        {receiptImage && (
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="relative">
                <img
                  src={receiptImage}
                  alt="Receipt"
                  className="w-full max-h-64 object-contain bg-slate-100 dark:bg-slate-900"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 dark:bg-slate-800/80"
                  onClick={() => {
                    setReceiptImage(null);
                    setReceiptData(null);
                    setLineItems([]);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Analyzing State */}
              {analyzing && (
                <div className="p-8 text-center">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">Analyzing receipt...</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Using AI to extract expense details
                  </p>
                </div>
              )}

              {/* Confidence Badge */}
              {receiptData && !analyzing && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className={`text-sm px-2 py-0.5 rounded ${
                      receiptData.confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        receiptData.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {receiptData.confidence === 'high' ? 'High confidence' :
                        receiptData.confidence === 'medium' ? 'Medium confidence' : 'Low confidence'}
                    </span>
                    <span className="text-sm text-slate-500">AI extracted</span>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Details */}
            {receiptData && !analyzing && (
              <>
                {/* Vendor, Date & Currency */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Receipt Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendor">Vendor</Label>
                      <Input
                        id="vendor"
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency (AI Detected)</Label>
                      <Select
                        value={receiptCurrency}
                        onValueChange={(value) => {
                          setReceiptCurrency(value);
                          // Update all line items to the new currency
                          setLineItems(items => items.map(item => ({ ...item, currency: value })));
                        }}
                      >
                        <SelectTrigger>
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
                    </div>
                  </div>
                  {/* Show conversion info if different from home currency */}
                  {receiptCurrency !== currency && (
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {(() => {
                          const conversion = getConvertedAmount(1, receiptCurrency);
                          if (conversion) {
                            return `1 ${receiptCurrency} ≈ ${conversion.converted.toFixed(4)} ${currency}`;
                          }
                          return `Exchange rate not available. Amounts will be stored in ${receiptCurrency}.`;
                        })()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                        Line Items ({selectedCount}/{lineItems.length})
                      </h3>
                      <div className="text-right">
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(selectedTotal, receiptCurrency)}
                        </span>
                        {receiptCurrency !== currency && (
                          <p className="text-xs text-slate-500">
                            ≈ {formatCurrency(selectedTotalInHomeCurrency, currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {lineItems.map((item, index) => (
                      <div key={index} className={`${!item.selected ? 'opacity-50' : ''}`}>
                        {/* Item Header */}
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleLineItem(index)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateLineItem(index, { description: e.target.value })}
                                  className="font-medium h-8"
                                  disabled={!item.selected}
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-500 font-medium">{item.currency}</span>
                                  <div className="relative w-24">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={item.amount}
                                      onChange={(e) => updateLineItem(index, { amount: parseFloat(e.target.value) || 0 })}
                                      className="h-8 text-right font-semibold"
                                      disabled={!item.selected}
                                    />
                                  </div>
                                  {/* Show conversion if different currency */}
                                  {item.currency !== currency && item.selected && (
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                      {(() => {
                                        const conv = getConvertedAmount(item.amount, item.currency);
                                        return conv ? `≈${formatCurrency(conv.converted, currency)}` : '';
                                      })()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Category */}
                                <Select
                                  value={item.categoryId}
                                  onValueChange={(value) => updateLineItem(index, { categoryId: value })}
                                  disabled={!item.selected}
                                >
                                  <SelectTrigger className="h-8 w-40 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: getCategoryColor(item.categoryId) }}
                                      />
                                      <span className="truncate">{getCategoryName(item.categoryId)}</span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map(cat => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: getCategoryColor(cat.id) }}
                                          />
                                          <span className="text-xs">{cat.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {/* Expand Bill Split */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => setExpandedItemIndex(expandedItemIndex === index ? null : index)}
                                  disabled={!item.selected}
                                >
                                  {item.splitType === 'none' ? 'No Split' :
                                    item.splitType === 'equal' ? `Equal (${item.splits.length})` :
                                      `Custom (${item.splits.length})`}
                                  {expandedItemIndex === index ?
                                    <ChevronUp className="w-3 h-3" /> :
                                    <ChevronDown className="w-3 h-3" />
                                  }
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Bill Split */}
                        {expandedItemIndex === index && item.selected && (
                          <div className="px-4 pb-4 ml-7">
                            <BillSplitSelector
                              totalAmount={item.amount}
                              currency={currency}
                              members={members}
                              splitType={item.splitType}
                              splits={item.splits}
                              onSplitTypeChange={(type) => updateLineItem(index, { splitType: type })}
                              onSplitsChange={(splits) => updateLineItem(index, { splits })}
                              selectedMemberIds={item.selectedMemberIds}
                              onSelectedMemberIdsChange={(ids) => updateLineItem(index, { selectedMemberIds: ids })}
                              compact
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total Summary */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        Total ({selectedCount} items)
                      </span>
                      <div className="text-right">
                        <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(selectedTotal, receiptCurrency)}
                        </span>
                        {receiptCurrency !== currency && (
                          <p className="text-sm text-slate-500">
                            ≈ {formatCurrency(selectedTotalInHomeCurrency, currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remainingCredits={subscription ? Math.max(0, PLAN_LIMITS[subscription.plan].monthlyCredits - subscription.creditsUsed) : 0}
        planName={subscription?.plan || 'starter'}
      />
    </div>
  );
}
