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
  Calendar,
  Settings,
  Folder,
  MapPin,
  Home,
  DollarSign,
  Globe,
  Route,
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16 gap-2">
                <div className="flex items-center min-w-0 flex-1">
                  <Link href="/dashboard" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 mr-2 sm:mr-3 text-slate-500 dark:text-slate-400 flex-shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">{trip.title}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
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
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white dark:border-slate-700 ring-1 ring-slate-200 dark:ring-slate-600"
                        title={m.name || 'Member'}
                        unoptimized
                      />
                    ))}
                    {household.members.length > 3 && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white dark:border-slate-700 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-600">
                        +{household.members.length - 3}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors flex-shrink-0"
                    title="Trip Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="hidden lg:flex space-x-4 sm:space-x-6 mt-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
                <button
                  onClick={() => setActiveTab('itinerary')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'itinerary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Calendar className="w-4 h-4" />
                  Itinerary
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Folder className="w-4 h-4" />
                  Docs
                </button>
                <button
                  onClick={() => setActiveTab('expense')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'expense' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <DollarSign className="w-4 h-4" />
                  Expense
                </button>
                <button
                  onClick={() => setActiveTab('commute')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'commute' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Route className="w-4 h-4" />
                  Commute
                </button>
                <button
                  onClick={() => setActiveTab('explore')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'explore' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <MapPin className="w-4 h-4" />
                  Explore
                </button>
                {trip.tripType === 'international' && (
                  <button
                    onClick={() => setActiveTab('information')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'information' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <Globe className="w-4 h-4" />
                    Info
                  </button>
                )}
              </div>
            </div>
          </div>
    
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Travel Documents</h2>
                    <p className="text-slate-500">Securely store and share tickets, passports, and hotel vouchers with your household.</p>
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
                  <h2 className="text-2xl font-bold text-slate mb-2">Country Information</h2>
                  <p className="text-slate-400">
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
