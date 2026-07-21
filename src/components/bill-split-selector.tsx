'use client';

import { useState, useEffect, useMemo } from 'react';
import type { HouseholdMember, ExpenseSplit } from '@/types';
import { formatCurrency } from '@/lib/constants';
import { getAvatarUrl } from '@/lib/avatar';
import { Users, User, Split, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/motion/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/motion/select';

interface BillSplitSelectorProps {
  totalAmount: number;
  currency: string;
  members: HouseholdMember[];
  splitType: 'none' | 'equal' | 'custom';
  splits: ExpenseSplit[];
  onSplitTypeChange: (type: 'none' | 'equal' | 'custom') => void;
  onSplitsChange: (splits: ExpenseSplit[]) => void;
  selectedMemberIds?: string[]; // For 'none' mode - single or all assignment
  onSelectedMemberIdsChange?: (ids: string[]) => void;
  compact?: boolean; // For dialog mode vs full page mode
}

export function BillSplitSelector({
  totalAmount,
  currency,
  members,
  splitType,
  splits,
  onSplitTypeChange,
  onSplitsChange,
  selectedMemberIds = [],
  onSelectedMemberIdsChange,
  compact = false,
}: BillSplitSelectorProps) {
  // Helper to get member avatar
  const getMemberAvatar = (member: HouseholdMember) => {
    return getAvatarUrl(member.photoURL, member.name);
  };

  // Calculate equal split amount
  const equalSplitAmount = useMemo(() => {
    const selectedCount = splits.length || members.length;
    return selectedCount > 0 ? totalAmount / selectedCount : 0;
  }, [totalAmount, splits.length, members.length]);

  // Calculate remaining amount for custom splits
  const allocatedAmount = useMemo(() => {
    return splits.reduce((sum, s) => sum + s.amount, 0);
  }, [splits]);

  const remainingAmount = totalAmount - allocatedAmount;

  // Initialize splits when switching to equal or custom
  useEffect(() => {
    if (splitType === 'equal') {
      // Create equal splits for all members or selected members
      const memberList = selectedMemberIds.length > 0
        ? members.filter(m => selectedMemberIds.includes(m.uid || m.name || ''))
        : members;

      const equalAmount = memberList.length > 0 ? totalAmount / memberList.length : 0;
      const newSplits: ExpenseSplit[] = memberList.map(m => ({
        memberId: m.uid || m.name || '',
        memberName: m.name || 'Unknown',
        amount: Math.round(equalAmount * 100) / 100,
      }));

      // Adjust for rounding errors
      if (newSplits.length > 0) {
        const diff = totalAmount - newSplits.reduce((sum, s) => sum + s.amount, 0);
        newSplits[0].amount = Math.round((newSplits[0].amount + diff) * 100) / 100;
      }

      onSplitsChange(newSplits);
    }
  }, [splitType, totalAmount, members, selectedMemberIds]);

  // Toggle member selection for equal/custom splits
  const toggleMemberInSplit = (member: HouseholdMember) => {
    const memberId = member.uid || member.name || '';
    const existingIndex = splits.findIndex(s => s.memberId === memberId);

    if (existingIndex >= 0) {
      // Remove member
      const newSplits = splits.filter((_, i) => i !== existingIndex);
      onSplitsChange(newSplits);
    } else {
      // Add member
      const newSplit: ExpenseSplit = {
        memberId,
        memberName: member.name || 'Unknown',
        amount: splitType === 'equal'
          ? Math.round((totalAmount / (splits.length + 1)) * 100) / 100
          : 0,
      };
      const newSplits = [...splits, newSplit];

      // Recalculate equal amounts if in equal mode
      if (splitType === 'equal') {
        const equalAmount = totalAmount / newSplits.length;
        newSplits.forEach(s => {
          s.amount = Math.round(equalAmount * 100) / 100;
        });
        // Adjust for rounding
        const diff = totalAmount - newSplits.reduce((sum, s) => sum + s.amount, 0);
        if (newSplits.length > 0) {
          newSplits[0].amount = Math.round((newSplits[0].amount + diff) * 100) / 100;
        }
      }

      onSplitsChange(newSplits);
    }
  };

  // Update custom amount for a member
  const updateMemberAmount = (memberId: string, amount: number) => {
    const newSplits = splits.map(s =>
      s.memberId === memberId ? { ...s, amount: Math.round(amount * 100) / 100 } : s
    );
    onSplitsChange(newSplits);
  };

  // Select all members
  const selectAllMembers = () => {
    const equalAmount = members.length > 0 ? totalAmount / members.length : 0;
    const newSplits: ExpenseSplit[] = members.map(m => ({
      memberId: m.uid || m.name || '',
      memberName: m.name || 'Unknown',
      amount: Math.round(equalAmount * 100) / 100,
    }));

    // Adjust for rounding
    if (newSplits.length > 0) {
      const diff = totalAmount - newSplits.reduce((sum, s) => sum + s.amount, 0);
      newSplits[0].amount = Math.round((newSplits[0].amount + diff) * 100) / 100;
    }

    onSplitsChange(newSplits);
  };

  // Clear all selections
  const clearAllMembers = () => {
    onSplitsChange([]);
  };

  // Distribute remaining evenly
  const distributeRemaining = () => {
    if (splits.length === 0 || remainingAmount === 0) return;

    const perPerson = remainingAmount / splits.length;
    const newSplits = splits.map(s => ({
      ...s,
      amount: Math.round((s.amount + perPerson) * 100) / 100,
    }));

    // Adjust for rounding
    const diff = totalAmount - newSplits.reduce((sum, s) => sum + s.amount, 0);
    if (newSplits.length > 0) {
      newSplits[0].amount = Math.round((newSplits[0].amount + diff) * 100) / 100;
    }

    onSplitsChange(newSplits);
  };

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-4 bg-slate-50 dark:bg-slate-900 rounded-xl'}`}>
      {/* Split Type Selector */}
      <div className="space-y-2">
        <Label>Bill Split</Label>
        <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-3'} gap-2`}>
          <Button
            type="button"
            variant={splitType === 'none' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${splitType === 'none' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => onSplitTypeChange('none')}
          >
            <User className="w-4 h-4" />
            <span className={compact ? 'hidden sm:inline' : ''}>No Split</span>
          </Button>
          <Button
            type="button"
            variant={splitType === 'equal' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${splitType === 'equal' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => onSplitTypeChange('equal')}
          >
            <Split className="w-4 h-4" />
            <span className={compact ? 'hidden sm:inline' : ''}>Equal</span>
          </Button>
          <Button
            type="button"
            variant={splitType === 'custom' ? 'default' : 'outline'}
            className={`flex items-center gap-2 ${splitType === 'custom' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => onSplitTypeChange('custom')}
          >
            <DollarSign className="w-4 h-4" />
            <span className={compact ? 'hidden sm:inline' : ''}>Custom</span>
          </Button>
        </div>
      </div>

      {/* No Split Mode - Simple assignment */}
      {splitType === 'none' && onSelectedMemberIdsChange && (
        <div className="space-y-2">
          <Label>Assign To</Label>
          <Select
            value={selectedMemberIds.length === 0 ? 'all' : selectedMemberIds[0]}
            onValueChange={(value) => {
              onSelectedMemberIdsChange(value === 'all' ? [] : [value]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  All Members
                </div>
              </SelectItem>
              {members.map(member => (
                <SelectItem key={member.uid || member.name || ''} value={member.uid || member.name || ''}>
                  <div className="flex items-center gap-2">
                    <img
                      src={getMemberAvatar(member)}
                      alt={member.name || 'member'}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    {member.name || member.email || 'Unknown'}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Equal or Custom Split Mode */}
      {(splitType === 'equal' || splitType === 'custom') && (
        <>
          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllMembers}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllMembers}
              className="text-xs"
            >
              Clear
            </Button>
            {splitType === 'custom' && Math.abs(remainingAmount) > 0.01 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={distributeRemaining}
                className="text-xs text-blue-600"
              >
                Distribute {formatCurrency(remainingAmount, currency)}
              </Button>
            )}
          </div>

          {/* Member List */}
          <div className={`space-y-2 ${compact ? 'max-h-48 overflow-y-auto' : ''}`}>
            {members.map(member => {
              const memberId = member.uid || member.name || '';
              const split = splits.find(s => s.memberId === memberId);
              const isSelected = !!split;

              return (
                <div
                  key={memberId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMemberInSplit(member)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  {/* Avatar */}
                  <img
                    src={getMemberAvatar(member)}
                    alt={member.name || 'member'}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                  />

                  {/* Name */}
                  <span className="flex-1 font-medium text-slate-800 dark:text-slate-200 truncate">
                    {member.name || member.email || 'Unknown'}
                  </span>

                  {/* Amount */}
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      {splitType === 'equal' ? (
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(split.amount, currency)}
                        </span>
                      ) : (
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            {currency}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={split.amount || ''}
                            onChange={(e) => updateMemberAmount(memberId, parseFloat(e.target.value) || 0)}
                            className="h-8 pl-8 text-sm text-right"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Expense</span>
              <span className="font-semibold">{formatCurrency(totalAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Allocated</span>
              <span className={`font-semibold ${Math.abs(remainingAmount) > 0.01 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatCurrency(allocatedAmount, currency)}
              </span>
            </div>
            {Math.abs(remainingAmount) > 0.01 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">Remaining</span>
                <span className="font-semibold text-amber-600">
                  {formatCurrency(remainingAmount, currency)}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
