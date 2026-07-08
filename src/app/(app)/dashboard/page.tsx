'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Plus, LogOut, Settings, ChevronDown, Map, Check, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import DashboardClient from '@/components/dashboard-client';
import { ThemeToggle } from '@/components/theme-toggle';
import { PWAInstallBanner } from '@/components/pwa-install-banner';
import { getAvatarUrl } from '@/lib/avatar';
import { CreditsIndicator } from '@/components/credits-indicator';

interface HouseholdOption {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { household, userProfile, loading, activeHouseholdId, setActiveHouseholdId } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);

  // Fetch all household names for the switcher
  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!db || !userProfile?.householdIds || userProfile.householdIds.length === 0) {
        setHouseholds([]);
        return;
      }

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
    };

    fetchHouseholds();
  }, [userProfile?.householdIds?.join(',')]);

  const handleSelectHousehold = async (householdId: string) => {
    if (householdId === activeHouseholdId) return;
    await setActiveHouseholdId(householdId);
  };

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
    router.push('/login');
  };

  const handleBilling = () => {
    router.push('/onboarding/plan?manage=true');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="bg-slate-900 dark:bg-slate-950 text-white pb-24 pt-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto flex justify-between items-start mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                <Map className="w-6 h-6 text-primary" />
              </div>
              <span className="font-bold text-xl tracking-tight">WanderNest</span>
            </div>
          </div>
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-6 w-1/4 mb-2" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero / Header */}
      <div className="bg-slate-900 text-white pb-24 pt-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-start mb-8">
          {/* Logo Area */}
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
              <Map className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight">WanderNest 1.1</span>
          </div>

          {/* Theme Toggle & User Menu */}
          <div className="flex items-center gap-2">
            <CreditsIndicator />
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition px-3 py-2 rounded-full pr-4"
              >
                <Image
                  src={getAvatarUrl(userProfile?.photoURL, userProfile?.displayName, userProfile?.email)}
                  alt={userProfile?.displayName || 'User'}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full border border-white/20 bg-white/10"
                  unoptimized
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold leading-none">{userProfile?.displayName || 'User'}</p>
                  <p className="text-[10px] text-slate-300 leading-none mt-1 capitalize">
                    {household?.members.find(m => m.uid === userProfile?.uid)?.role || 'Member'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
              </button>

              {showMenu && (
                <div onMouseLeave={() => setShowMenu(false)} className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl py-1 text-slate-800 dark:text-slate-200 z-50 border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
                    <p className="text-sm font-bold truncate">{userProfile?.email || userProfile?.displayName}</p>
                  </div>

                  {/* Travel Group Switcher */}
                  {households.length > 0 && (
                    <div className="border-b border-slate-100 dark:border-slate-700 py-2">
                      <p className="px-4 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Travel Group
                      </p>
                      {households.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => handleSelectHousehold(h.id)}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${h.id === activeHouseholdId
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                          <span className="truncate">{h.name}</span>
                          {h.id === activeHouseholdId && (
                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => { setShowMenu(false); router.push('/household?create=true'); }}
                        className="w-full flex items-center px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Group
                      </button>
                    </div>
                  )}

                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Users className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                    My Profile
                  </Link>
                  <button
                    onClick={handleBilling}
                    className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                    Billing
                  </button>
                  <Link
                    href="/household"
                    className="flex items-center px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                    Manage Travel Group
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto flex justify-between items-end">
          <div>
            <div className="flex items-center space-x-2 text-primary mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold tracking-wide uppercase">{household?.name || "Your Travel Group"}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready for your next adventure?</h1>
          </div>
          <Link
            href="/create"
            className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-medium items-center transition shadow-lg shadow-primary/30"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Trip
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-20">
        <PWAInstallBanner />
        <DashboardClient />
      </div>
    </div>
  );
}
