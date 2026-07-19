'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Plus, LogOut, Settings, ChevronDown, Check, CreditCard, Compass, Globe, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardClient from '@/components/dashboard-client';
import { ThemeToggle } from '@/components/theme-toggle';
import { PWAInstallBanner } from '@/components/pwa-install-banner';
import { getAvatarUrl } from '@/lib/avatar';
import { CreditsIndicator } from '@/components/credits-indicator';
import { CreateTripModal } from '@/components/create-trip-modal';
import { Logo } from '@/components/logo';

interface HouseholdOption {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { household, userProfile, loading, activeHouseholdId, setActiveHouseholdId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // Deep link / bookmark support for the old /create route, which now
  // redirects here with ?create=1 instead of rendering its own page.
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setCreateOpen(true);
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, router]);

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
      <div className="min-h-screen bg-background">
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-6xl mx-auto flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/30">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">WanderNest</span>
          </div>
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-56 w-full rounded-3xl mb-10" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top bar */}
        <div className="max-w-6xl mx-auto flex justify-between items-center mb-6">
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <Logo />
          </div>

          {/* Credits & User Menu */}
          <div className="flex items-center gap-3">
            <CreditsIndicator />
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-3 bg-muted hover:bg-accent transition px-3 py-2 rounded-full pr-4 border border-border"
              >
                <Image
                  src={getAvatarUrl(userProfile?.photoURL, userProfile?.displayName, userProfile?.email)}
                  alt={userProfile?.displayName || 'User'}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full border border-border bg-muted"
                  unoptimized
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold leading-none text-foreground">{userProfile?.displayName || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-1 capitalize">
                    {household?.members.find(m => m.uid === userProfile?.uid)?.role || 'Member'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
              </button>

              {showMenu && (
                <div onMouseLeave={() => setShowMenu(false)} className="absolute right-0 mt-2 w-64 bg-card rounded-xl shadow-xl py-1 text-card-foreground z-50 border border-border animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="text-sm font-bold truncate">{userProfile?.email || userProfile?.displayName}</p>
                  </div>

                  {/* Travel Group Switcher */}
                  {households.length > 0 && (
                    <div className="border-b border-border py-2">
                      <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Travel Group
                      </p>
                      {households.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => handleSelectHousehold(h.id)}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${h.id === activeHouseholdId
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-accent'
                            }`}
                        >
                          <span className="truncate">{h.name}</span>
                          {h.id === activeHouseholdId && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => { setShowMenu(false); router.push('/household?create=true'); }}
                        className="w-full flex items-center px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Group
                      </button>
                    </div>
                  )}

                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  >
                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                    My Profile
                  </Link>
                  <button
                    onClick={handleBilling}
                    className="w-full flex items-center px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  >
                    <CreditCard className="w-4 h-4 mr-2 text-muted-foreground" />
                    Billing
                  </button>
                  <Link
                    href="/household"
                    className="flex items-center px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                    Manage Travel Group
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-6xl mx-auto relative rounded-3xl border border-border overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-10 sm:px-12 sm:py-14 mb-10">
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full mb-5">
              <Users className="w-4 h-4 text-white/80" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                Welcome back &middot; {household?.name || 'Your Travel Group'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-lg mb-3">
              Ready for your next adventure?
            </h1>
            <p className="text-sm sm:text-base text-white/70 max-w-md mb-7">
              Explore the world&apos;s most hidden gems with personalized itineraries and local insights.
            </p>
            <Button size="lg" className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="w-5 h-5" /> Start planning
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-0 pb-20">
        <PWAInstallBanner />
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1">Your trips</h2>
            <p className="text-sm text-muted-foreground">Manage and view your upcoming journeys</p>
          </div>
          <Link
            href="/archived-trips"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
          >
            View archive <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <DashboardClient />
      </div>

      <CreateTripModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
