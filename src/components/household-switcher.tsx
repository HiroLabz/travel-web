'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ChevronDown, Plus, Check, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface HouseholdOption {
  id: string;
  name: string;
}

export function HouseholdSwitcher() {
  const { userProfile, activeHouseholdId, setActiveHouseholdId, household } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch all household names
  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!db || !userProfile?.householdIds || userProfile.householdIds.length === 0) {
        setHouseholds([]);
        return;
      }

      setLoading(true);
      const householdData: HouseholdOption[] = [];

      for (const householdId of userProfile.householdIds) {
        try {
          const householdRef = doc(db, 'households', householdId);
          const householdSnap = await getDoc(householdRef);
          if (householdSnap.exists()) {
            householdData.push({
              id: householdId,
              name: householdSnap.data().name || 'Unnamed Household'
            });
          }
        } catch (error) {
          console.error('Error fetching household:', error);
        }
      }

      setHouseholds(householdData);
      setLoading(false);
    };

    fetchHouseholds();
  }, [userProfile?.householdIds?.join(',')]);

  const handleSelectHousehold = async (householdId: string) => {
    if (householdId === activeHouseholdId) {
      setIsOpen(false);
      return;
    }

    await setActiveHouseholdId(householdId);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push('/household?create=true');
  };

  // Don't show if no households at all
  if (!households || households.length === 0) {
    return null;
  }

  const currentHousehold = household || households.find(h => h.id === activeHouseholdId);
  const hasMultipleHouseholds = households.length > 1;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="max-w-[150px] truncate">
          {currentHousehold?.name || 'Select Travel Group'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {hasMultipleHouseholds ? 'Your Travel Groups' : 'Travel Group'}
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Loading households...
                </div>
              ) : hasMultipleHouseholds ? (
                households.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => handleSelectHousehold(h.id)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between group ${
                      h.id === activeHouseholdId
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="truncate flex-1">{h.name}</span>
                    {h.id === activeHouseholdId && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    {currentHousehold?.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Create another travel group to switch between them
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
              <button
                onClick={handleCreateNew}
                className="w-full px-3 py-2 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Create New Travel Group
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
