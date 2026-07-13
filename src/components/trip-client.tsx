'use client';

import type { Trip, Household, WizardItineraryItem, BudgetItem, Destination, Expense, ChecklistItem } from '@/types';
import { DEFAULT_BUDGET_CATEGORIES } from '@/types';
import { getAvatarUrl } from '@/lib/avatar';
import Link from 'next/link';
import Image from 'next/image';
import { DocumentVault } from '@/components/document-vault';
import { CountryInfo } from '@/components/country-info';
import { DocumentPreviewModal } from '@/components/document-preview-modal';
import { ExploreTab } from '@/components/explore-tab';
import { CommutePlannerTab } from '@/components/commute-planner-tab';
import { ExpenseTab } from '@/components/expense-tab';
import { BudgetCard } from '@/components/budget-card';
import { TripNotesSection } from '@/components/trip-notes-section';
import { UpcomingSchedule } from '@/components/upcoming-schedule';
import { RouteTimeline } from '@/components/route-timeline';
import { ItineraryTab } from '@/components/itinerary-tab';
import { TripSettingsSheet } from '@/components/trip-settings-sheet';
import { TripBottomNav } from '@/components/trip-bottom-nav';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Settings,
  Folder,
  MapPin,
  Home,
  DollarSign,
  Globe,
  Route,
  Users,
  BedDouble,
  LocateFixed,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getWizardItemsAction,
  toggleActivityChecklistItemAction,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/contexts/loading-context';
import { format, parseISO } from 'date-fns';
import { getTripStatus } from '@/lib/trip-status';

type Tab = 'dashboard' | 'itinerary' | 'documents' | 'expense' | 'commute' | 'explore' | 'information';

const VALID_TABS: Tab[] = ['dashboard', 'itinerary', 'documents', 'expense', 'commute', 'explore', 'information'];

export default function TripClient({ trip: initialTrip, household }: { trip: Trip, household: Household }) {
  const [trip, setTrip] = useState(initialTrip);
  const { toast } = useToast();
  const { hideLoading } = useLoading();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: Tab = tabParam && VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'dashboard';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Hide any loading indicator when the trip page loads
  useEffect(() => {
    hideLoading();
  }, [hideLoading]);

  // Settings sheet state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Document preview modal state
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string; type?: string } | null>(null);

  // Budget state
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(trip.budgetItems || []);
  const budgetCategories = household.budgetCategories || DEFAULT_BUDGET_CATEGORIES;

  // Expense state
  const [expenses, setExpenses] = useState<Expense[]>(trip.expenses || []);

  // Trip-level notes and checklist state
  const [tripNotes, setTripNotes] = useState(trip.tripNotes || '');
  const [tripChecklist, setTripChecklist] = useState<ChecklistItem[]>(trip.tripChecklist || []);

  // Route/Destination state
  const [destinations, setDestinations] = useState<Destination[]>(trip.destinations);

  // Get destinations excluding household origin for AI planner
  const getAiPlannerDestinations = () => {
    if (!household?.cityOfOrigin) return destinations;

    const originCity = household.cityOfOrigin?.toLowerCase().trim();
    const originCountry = household.countryOfOrigin?.toLowerCase().trim();

    return destinations.filter(d => {
      const destCity = d.city?.toLowerCase().trim();
      const destCountry = d.country?.toLowerCase().trim();

      // Filter out if city matches (with or without country match for flexibility)
      // This handles cases where country might be "PH" vs "Philippines" or missing
      if (destCity === originCity) {
        // If both have countries, check if they match
        if (originCountry && destCountry) {
          // Check exact match or if one contains the other (e.g., "PH" vs "Philippines")
          return !(destCountry === originCountry ||
            destCountry.includes(originCountry) ||
            originCountry.includes(destCountry));
        }
        // If no country info available, assume same city = same place
        return false;
      }
      return true;
    });
  };

  const aiPlannerDestinations = getAiPlannerDestinations();

  const [wizardItems, setWizardItems] = useState<WizardItineraryItem[]>([]);

  // Load wizard items on mount
  useEffect(() => {
    const loadWizardItems = async () => {
      const result = await getWizardItemsAction(trip.id);
      if (result.items) {
        setWizardItems(result.items);
      }
    };
    loadWizardItems();
  }, [trip.id]);

  const handleNoteContentUpdated = (content: string) => {
    setTrip(prev => ({ ...prev, noteContent: content }));
  };

  const handleActivityChecklistToggle = async (itemId: string, checklistItemId: string, completed: boolean) => {
    // Optimistic update on wizard items
    setWizardItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          checklist: item.checklist?.map(c =>
            c.id === checklistItemId ? { ...c, completed } : c
          )
        };
      }
      return item;
    }));

    const result = await toggleActivityChecklistItemAction(trip.id, itemId, checklistItemId, completed);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      // Reload wizard items on error
      const itemsResult = await getWizardItemsAction(trip.id);
      if (itemsResult.items) {
        setWizardItems(itemsResult.items);
      }
    }
  };

  const tripStatus = getTripStatus(trip, destinations);

  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'itinerary', label: 'Itinerary', icon: Calendar },
    { id: 'documents', label: 'Docs', icon: Folder },
    { id: 'expense', label: 'Expense', icon: DollarSign },
    { id: 'commute', label: 'Commute', icon: Route },
    { id: 'explore', label: 'Explore', icon: MapPin },
    ...(trip.tripType === 'international' ? [{ id: 'information' as Tab, label: 'Info', icon: Globe }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10 pt-2">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            <div className="flex items-center min-w-0 flex-1">
              <Link href="/dashboard" className="p-2 rounded-full bg-muted hover:bg-accent mr-2 sm:mr-3 text-muted-foreground flex-shrink-0 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-foreground truncate">{trip.title}</h1>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{format(parseISO(trip.startDate), 'MMM dd, yyyy')} - {format(parseISO(trip.endDate), 'MMM dd, yyyy')}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="flex -space-x-2">
                {household.members.slice(0, 3).map((m, idx) => (
                  <Image
                    key={m.uid || `member-${idx}`}
                    src={getAvatarUrl(m.photoURL, m.name)}
                    alt={m.name || 'Member'}
                    width={32}
                    height={32}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-card ring-1 ring-border"
                    title={m.name || 'Member'}
                    unoptimized
                  />
                ))}
                {household.members.length > 3 && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground ring-1 ring-border">
                    +{household.members.length - 3}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 text-muted-foreground bg-muted hover:bg-accent rounded-full transition-colors flex-shrink-0"
                title="Trip Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 mt-2 pb-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-8 sm:px-9 text-white">
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[280px]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Trip overview</div>
                  <div className="font-bold text-2xl sm:text-3xl mt-2 tracking-tight">{trip.title}</div>

                  {destinations.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {destinations.map((dest, idx) => {
                        const isCurrent = idx === tripStatus.currentDestinationIndex;
                        return (
                          <div key={`${dest.city}-${idx}`} className="flex items-center gap-2">
                            {idx > 0 && <ArrowRight className="w-4 h-4 text-white/50" />}
                            <span className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${isCurrent ? 'bg-white/25' : 'bg-white/10'}`}>
                              {dest.city}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-5 mt-5 flex-wrap text-sm text-white/80">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {format(parseISO(trip.startDate), 'MMM d')} &ndash; {format(parseISO(trip.endDate), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {household.members.length} traveler{household.members.length === 1 ? '' : 's'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4" />
                      {Math.max(tripStatus.totalDays - 1, 0)} night{Math.max(tripStatus.totalDays - 1, 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {tripStatus.currentDestination && (
                  <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 min-w-[180px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Right now</div>
                    <div className="flex items-center gap-2 mt-2 font-semibold text-xl">
                      <LocateFixed className="w-5 h-5" />
                      {tripStatus.currentDestination.city}
                    </div>
                    <div className="text-xs text-white/60 mt-1.5">Day {tripStatus.dayNumber} of {tripStatus.totalDays}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RouteTimeline
                  trip={trip}
                  destinations={destinations}
                  household={household}
                  onTripUpdate={(updates) => setTrip(prev => ({ ...prev, ...updates }))}
                  onDestinationsChange={(newDests) => {
                    setDestinations(newDests);
                    setTrip(prev => ({ ...prev, destinations: newDests, destination: newDests[0]?.city || '' }));
                  }}
                />
              </div>
              <div className="lg:col-span-1">
                <BudgetCard
                  tripId={trip.id}
                  initialBudgetItems={budgetItems}
                  budgetCategories={budgetCategories}
                  currency={household.currency || 'USD'}
                  wizardItems={wizardItems}
                  onBudgetChange={setBudgetItems}
                />
              </div>
            </div>

            <TripNotesSection
              tripId={trip.id}
              initialNotes={tripNotes}
              initialChecklist={tripChecklist}
              onNotesChange={setTripNotes}
              onChecklistChange={setTripChecklist}
            />

            <UpcomingSchedule
              wizardItems={wizardItems}
              itineraryLength={trip.itinerary.length}
              household={household}
              onViewFullItinerary={() => setActiveTab('itinerary')}
              onChecklistToggle={handleActivityChecklistToggle}
            />
          </div>
        )}

        {activeTab === 'itinerary' && (
          <ItineraryTab
            trip={trip}
            household={household}
            wizardItems={wizardItems}
            exchangeRates={trip.exchangeRates}
            onWizardItemsChange={setWizardItems}
            onNoteContentUpdated={handleNoteContentUpdated}
            onPreviewDocument={setPreviewDocument}
          />
        )}

        {activeTab === 'commute' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Commute</h2>
              <p className="text-muted-foreground">Plan routes between where you&apos;re staying and where you&apos;re going.</p>
            </div>
            <CommutePlannerTab
              tripId={trip.id}
              wizardItems={wizardItems}
              savedSettings={trip.commuteSettings}
              currency={household?.currency}
              tripDestinations={trip.destinations}
            />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Travel documents</h2>
              <p className="text-muted-foreground">Store tickets, passports, and hotel vouchers for the whole group.</p>
            </div>

            <DocumentVault
              tripId={trip.id}
              householdId={trip.householdId}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
              members={household.members}
              onActivitiesAdded={async () => {
                // Refresh wizard items when PDF analysis adds activities
                const result = await getWizardItemsAction(trip.id);
                if (result.items) {
                  setWizardItems(result.items);
                }
              }}
            />
          </div>
        )}

        {activeTab === 'expense' && (
          <ExpenseTab
            tripId={trip.id}
            householdId={trip.householdId}
            expenses={expenses}
            onExpensesChange={setExpenses}
            members={household.members}
            budgetCategories={budgetCategories}
            currency={household.currency || 'USD'}
            destinations={destinations}
            destinationCurrencies={trip.destinationCurrencies}
            exchangeRates={trip.exchangeRates}
          />
        )}

        {activeTab === 'explore' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Explore</h2>
              <p className="text-muted-foreground">Discover things to do, curated for this trip.</p>
            </div>
            <ExploreTab
              tripId={trip.id}
              destinations={aiPlannerDestinations.map(d => ({ city: d.city, country: d.country }))}
              days={trip.days}
              travelGroup="solo"
              budget="midrange"
              currency={household?.currency}
              accommodationAddress={
                wizardItems.find(item => item.travelType === 'accommodation')?.address
              }
            />
          </div>
        )}

        {activeTab === 'information' && trip.tripType === 'international' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Country information</h2>
              <p className="text-muted-foreground">
                Essential travel information for your destinations including immigration, customs, and cultural norms.
              </p>
            </div>

            <CountryInfo
              tripId={trip.id}
              countries={
                trip.destinations?.map(d => d.country).filter(Boolean) ||
                (trip.destination ? [trip.destination] : [])
              }
              originCountry={household?.countryOfOrigin}
            />
          </div>
        )}

      </div>

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          documentUrl={previewDocument.url}
          documentName={previewDocument.name}
          documentType={previewDocument.type}
        />
      )}

      {/* Trip Settings Sheet */}
      <TripSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        trip={trip}
        household={household}
        onTripUpdate={(updates) => setTrip((prev) => ({ ...prev, ...updates }))}
      />

      {/* Bottom Navigation for Mobile/Tablet */}
      <TripBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showInfoTab={trip.tripType === 'international'}
      />
    </div>
  );
}
