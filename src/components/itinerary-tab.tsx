'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Trip, Household, WizardItineraryItem, RecommendedPlace, ActivityTravelType, ExchangeRateCache } from '@/types';
import { ACTIVITY_TRAVEL_TYPE_LABELS, ACTIVITY_TRAVEL_TYPE_ICONS } from '@/types';
import { formatTime } from '@/lib/constants';
import { ItineraryGenerator } from '@/components/itinerary-generator';
import { ItineraryWizard } from '@/components/itinerary-wizard';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { useSortableItinerary } from '@/hooks/use-sortable-itinerary';
import { DroppableDateContainer } from '@/components/droppable-date-container';
import { ItineraryDragOverlay } from '@/components/drag-overlay-item';
import { TimelineSortableItem } from '@/components/timeline-sortable-item';
import { ItineraryDetailsDialog } from '@/components/itinerary-details';
import { RoutePlannerFAB } from '@/components/route-planner-fab';
import { useIsMobile } from '@/hooks/use-mobile';
import dynamic from 'next/dynamic';
import {
  Calendar,
  FileText,
  Sparkles,
  MapPin,
  Clock,
  Home,
  Plane,
  Hotel,
  Utensils,
  Camera,
  Plus,
  Pencil,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
  ExternalLink,
  Ship,
  Car,
  Info,
  Ticket,
  User,
  Users,
  Armchair,
  Download,
  MoreVertical,
  Trash2,
  Route,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { exportItineraryToPdf } from '@/lib/pdf-export';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  analyzeTravelPdfAction,
  getWizardItemsAction,
  updateTripNoteAction,
  deleteWizardItemAction,
  combineWizardItemsToDocAction,
} from '@/lib/actions';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/contexts/loading-context';
import { useDebouncedCallback } from 'use-debounce';

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

const RoutePlannerTab = dynamic(() => import('@/components/route-planner-tab').then(mod => ({ default: mod.RoutePlannerTab })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[50vh]">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  ),
});

type PlannerTab = 'home' | 'ai' | 'document' | 'route';

interface ItineraryTabProps {
  trip: Trip;
  household: Household;
  wizardItems: WizardItineraryItem[];
  exchangeRates?: ExchangeRateCache;
  onWizardItemsChange: (items: WizardItineraryItem[]) => void;
  onNoteContentUpdated: (content: string) => void;
  onPreviewDocument: (doc: { url: string; name: string; type?: string }) => void;
}

export function ItineraryTab({
  trip,
  household,
  wizardItems,
  exchangeRates,
  onWizardItemsChange,
  onNoteContentUpdated,
  onPreviewDocument,
}: ItineraryTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [plannerTab, setPlannerTab] = useState<PlannerTab>('home');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WizardItineraryItem | null>(null);
  const [prefilledPlace, setPrefilledPlace] = useState<RecommendedPlace | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing'>('idle');
  const [loadingActivityId, setLoadingActivityId] = useState<string | null>(null);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [detailsItem, setDetailsItem] = useState<WizardItineraryItem | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Collapsed dates state (accordion)
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const hasAutoCollapsed = useRef(false);

  // AI Planner destination selection
  const [selectedAiDestinationIndex, setSelectedAiDestinationIndex] = useState<number>(0);

  // Get destinations excluding household origin for AI planner
  const getAiPlannerDestinations = () => {
    if (!household?.cityOfOrigin) return trip.destinations;

    const originCity = household.cityOfOrigin?.toLowerCase().trim();
    const originCountry = household.countryOfOrigin?.toLowerCase().trim();

    return trip.destinations.filter(d => {
      const destCity = d.city?.toLowerCase().trim();
      const destCountry = d.country?.toLowerCase().trim();

      if (destCity === originCity) {
        if (originCountry && destCountry) {
          return !(destCountry === originCountry ||
                   destCountry.includes(originCountry) ||
                   originCountry.includes(destCountry));
        }
        return false;
      }
      return true;
    });
  };

  const aiPlannerDestinations = getAiPlannerDestinations();
  const selectedAiDestination = aiPlannerDestinations[selectedAiDestinationIndex] || aiPlannerDestinations[0];

  // Drag and drop for timeline
  const {
    sensors,
    activeItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useSortableItinerary({
    items: wizardItems,
    tripId: trip.id,
    onItemsChange: onWizardItemsChange,
  });

  // Helper functions
  const isToday = (dateStr: string) => {
    const today = new Date();
    const date = new Date(dateStr);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isDateCompleted = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    date.setHours(23, 59, 59, 999);
    return date < now;
  };

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const handleEditActivity = (item: WizardItineraryItem) => {
    if (isMobile) {
      setLoadingActivityId(item.id);
      router.push(`/trip/${trip.id}/activity/${item.id}/edit`);
    } else {
      setEditingItem(item);
      setWizardOpen(true);
    }
  };

  const handleViewDetails = (item: WizardItineraryItem) => {
    if (isMobile) {
      setLoadingActivityId(item.id);
      router.push(`/trip/${trip.id}/activity/${item.id}`);
    } else {
      setDetailsItem(item);
    }
  };

  const handleDetailsItemUpdate = (updatedItem: WizardItineraryItem) => {
    const updatedItems = wizardItems.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    onWizardItemsChange(updatedItems);
    setDetailsItem(updatedItem);
  };

  const handleEditFromDetails = (item: WizardItineraryItem) => {
    setDetailsItem(null);
    setEditingItem(item);
    setWizardOpen(true);
  };

  const handleAddPlaceToItinerary = (place: RecommendedPlace) => {
    if (isMobile) {
      const params = new URLSearchParams({
        prefillName: place.name,
        prefillAddress: place.address || '',
        prefillDescription: place.description || '',
        prefillTips: place.tips || '',
      });
      router.push(`/trip/${trip.id}/activity/new?${params.toString()}`);
    } else {
      setPrefilledPlace(place);
      setEditingItem(null);
      setWizardOpen(true);
    }
  };

  const handleDeleteActivity = async (itemId: string) => {
    const result = await deleteWizardItemAction(trip.id, itemId);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      const updatedItems = wizardItems.filter(item => item.id !== itemId);
      onWizardItemsChange(updatedItems);

      if (updatedItems.length > 0) {
        const docResult = await combineWizardItemsToDocAction(trip.id, updatedItems);
        if (docResult.content) {
          onNoteContentUpdated(docResult.content);
        }
      }

      toast({
        title: 'Deleted',
        description: 'Activity removed from itinerary.',
      });
    }
  };

  const handleNoteChange = useDebouncedCallback(async (content: string) => {
    const result = await updateTripNoteAction(trip.id, content);
    if (result.success) {
      toast({
        title: 'Note Saved',
        description: 'Your changes have been saved.',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  }, 1500);

  // Handle PDF upload and auto-analyze
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage || !db) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a PDF file.',
        variant: 'destructive'
      });
      return;
    }

    showLoading('Uploading PDF...');
    try {
      const storageRef = ref(storage, `households/${trip.householdId}/trips/${trip.id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await addDoc(collection(db, "documents"), {
        tripId: trip.id,
        householdId: trip.householdId,
        name: file.name,
        url: downloadURL,
        folder: 'Ticket',
        uploadDate: serverTimestamp(),
        uploader: {
          uid: user.uid,
          name: user.displayName
        },
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
      });

      showLoading('Analyzing document with AI...');
      const result = await analyzeTravelPdfAction(
        trip.id,
        downloadURL,
        `pdf_${Date.now()}`,
        file.name,
        trip.startDate,
        trip.endDate,
        user.uid
      );

      hideLoading();

      if (result.error) {
        toast({
          title: 'Analysis Failed',
          description: result.error,
          variant: 'destructive'
        });
      } else if (result.activities && result.activities.length > 0) {
        toast({
          title: 'Activities Created!',
          description: `Extracted ${result.activities.length} activities from ${result.documentType || 'document'}.`,
        });
        const itemsResult = await getWizardItemsAction(trip.id);
        if (itemsResult.items) {
          onWizardItemsChange(itemsResult.items);
        }
      } else {
        toast({
          title: 'Analysis Complete',
          description: 'No activities found in this document.',
        });
      }
    } catch (error) {
      hideLoading();
      console.error('Error uploading/analyzing PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to process PDF. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadStatus('idle');
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  // Icon helpers for activity cards
  const getActivityIcon = (item: WizardItineraryItem) => {
    if (item.travelType === 'air') return <Plane className="w-4 h-4" />;
    if (item.travelType === 'land') return <Car className="w-4 h-4" />;
    if (item.travelType === 'sea') return <Ship className="w-4 h-4" />;
    if (item.travelType === 'accommodation') return <Hotel className="w-4 h-4" />;
    const name = item.placeName.toLowerCase();
    if (name.includes('flight') || name.includes('airport') || name.includes('plane')) return <Plane className="w-4 h-4" />;
    if (name.includes('hotel') || name.includes('resort') || name.includes('airbnb') || name.includes('bnb')) return <Hotel className="w-4 h-4" />;
    if (name.includes('ferry') || name.includes('cruise') || name.includes('boat')) return <Ship className="w-4 h-4" />;
    if (name.includes('bus') || name.includes('train') || name.includes('taxi')) return <Car className="w-4 h-4" />;
    if (name.includes('restaurant') || name.includes('dinner') || name.includes('lunch') || name.includes('food')) return <Utensils className="w-4 h-4" />;
    return <Camera className="w-4 h-4" />;
  };

  const getActivityIconColor = (item: WizardItineraryItem) => {
    if (item.travelType === 'air') return 'bg-blue-500';
    if (item.travelType === 'land') return 'bg-amber-500';
    if (item.travelType === 'sea') return 'bg-cyan-500';
    if (item.travelType === 'accommodation') return 'bg-blue-500';
    const name = item.placeName.toLowerCase();
    if (name.includes('flight') || name.includes('airport')) return 'bg-blue-500';
    if (name.includes('hotel') || name.includes('resort') || name.includes('bnb')) return 'bg-blue-500';
    if (name.includes('ferry') || name.includes('cruise')) return 'bg-cyan-500';
    if (name.includes('bus') || name.includes('train')) return 'bg-amber-500';
    if (name.includes('restaurant') || name.includes('food')) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  const getTravelTypeBadge = (item: WizardItineraryItem) => {
    if (!item.travelType) return null;
    const colorMap: Record<ActivityTravelType, string> = {
      air: 'bg-blue-100 text-blue-700',
      land: 'bg-amber-100 text-amber-700',
      sea: 'bg-cyan-100 text-cyan-700',
      accommodation: 'bg-blue-100 text-blue-700',
      activity: 'bg-emerald-100 text-emerald-700'
    };
    return (
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colorMap[item.travelType]}`}>
        {ACTIVITY_TRAVEL_TYPE_ICONS[item.travelType]} {ACTIVITY_TRAVEL_TYPE_LABELS[item.travelType]}
      </span>
    );
  };

  // Group items by date
  const groupedByDate = wizardItems.reduce((acc, item) => {
    const date = item.dateFrom;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, WizardItineraryItem[]>);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Itinerary Planner</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Create your perfect trip schedule.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex shadow-sm overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setPlannerTab('home')}
            className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all whitespace-nowrap ${
              plannerTab === 'home'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <button
            onClick={() => setPlannerTab('route')}
            className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all whitespace-nowrap ${
              plannerTab === 'route'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Route className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Route</span>
          </button>
          <button
            onClick={() => setPlannerTab('ai')}
            className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all whitespace-nowrap ${
              plannerTab === 'ai'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">AI Planner</span>
          </button>
          <button
            onClick={() => setPlannerTab('document')}
            className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all whitespace-nowrap ${
              plannerTab === 'document'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Document</span>
          </button>
        </div>
      </div>

      {/* Home Tab - Timeline View */}
      {plannerTab === 'home' && (
        <div className="space-y-6">
          {/* Hidden PDF Input */}
          <input
            type="file"
            ref={pdfInputRef}
            onChange={handlePdfUpload}
            accept=".pdf"
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => {
                if (isMobile) {
                  setIsAddingActivity(true);
                  router.push(`/trip/${trip.id}/activity/new`);
                } else {
                  setWizardOpen(true);
                }
              }}
              disabled={isAddingActivity}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {isAddingActivity ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Activity
                  {wizardItems.length > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {wizardItems.length}
                    </span>
                  )}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => pdfInputRef.current?.click()}
              disabled={uploadStatus !== 'idle'}
              className="border-dashed border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-black"
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : uploadStatus === 'analyzing' ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload PDF
                </>
              )}
            </Button>

            {wizardItems.length > 0 && (
              <Button
                variant="outline"
                disabled={isExportingPdf}
                onClick={async () => {
                  setIsExportingPdf(true);
                  try {
                    await exportItineraryToPdf(wizardItems, trip.title || 'Trip Itinerary', household.currency || 'USD');
                    toast({ title: 'PDF exported successfully' });
                  } catch (error) {
                    console.error('Failed to export PDF:', error);
                    toast({ title: 'Failed to export PDF', variant: 'destructive' });
                  } finally {
                    setIsExportingPdf(false);
                  }
                }}
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExportingPdf ? 'Exporting...' : 'Export PDF'}
              </Button>
            )}
          </div>

          {/* Timeline View */}
          {wizardItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">No activities planned yet</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">Start building your itinerary by adding activities or upload a travel PDF</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setWizardOpen(true)}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Add activity manually &rarr;
                </button>
                <span className="text-slate-300">or</span>
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={uploadStatus !== 'idle'}
                  className="text-blue-600 font-semibold hover:underline disabled:opacity-50"
                >
                  Upload a PDF &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Happening Now Section - Today's Activities */}
              {(() => {
                const todayItems = wizardItems.filter(item => isToday(item.dateFrom));
                if (todayItems.length === 0) return null;

                return (
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg border border-emerald-200 overflow-hidden">
                    <div className="px-5 py-4">
                      <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                        <Sparkles className="w-5 h-5" />
                        Happening Now
                        <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">
                          {todayItems.length} {todayItems.length === 1 ? 'activity' : 'activities'}
                        </span>
                      </h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4">
                      <div className="space-y-3">
                        {todayItems.sort((a, b) => a.timeFrom.localeCompare(b.timeFrom))
                          .map((item, itemIdx) => (
                            <div key={`${item.id}-${itemIdx}`} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{item.placeName}</div>
                                  <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(item.timeFrom, household.timeFormat || '24h')} - {formatTime(item.timeTo, household.timeFormat || '24h')}
                                  </div>
                                </div>
                                <button onClick={() => handleEditActivity(item)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 p-1">
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                {Object.entries(groupedByDate)
                  .sort(([dateA], [dateB]) => {
                    const isACompleted = isDateCompleted(dateA);
                    const isBCompleted = isDateCompleted(dateB);
                    
                    // Upcoming dates come first, completed dates at bottom
                    if (isACompleted !== isBCompleted) {
                      return isACompleted ? 1 : -1;
                    }
                    
                    // Within same status group:
                    if (!isACompleted) {
                      // Both upcoming: sort chronologically (earliest first)
                      return dateA.localeCompare(dateB);
                    } else {
                      // Both completed: sort reverse chronologically (most recent first)
                      return dateB.localeCompare(dateA);
                    }
                  })
                  .map(([date, items]) => {
                    const dateIsCompleted = isDateCompleted(date);
                    const dateIsToday = isToday(date);
                    const isCollapsed = collapsedDates.has(date);

                    // Auto-collapse completed dates on first render ONLY
                    if (!hasAutoCollapsed.current && dateIsCompleted) {
                      setTimeout(() => {
                        setCollapsedDates(prev => {
                          const newSet = new Set(prev);
                          Object.keys(
                            wizardItems.reduce((acc, item) => {
                              if (isDateCompleted(item.dateFrom)) {
                                acc[item.dateFrom] = true;
                              }
                              return acc;
                            }, {} as Record<string, boolean>)
                          ).forEach(d => newSet.add(d));
                          hasAutoCollapsed.current = true;
                          return newSet;
                        });
                      }, 0);
                    }

                    return (
                      <div key={date} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                        {/* Date Header - Clickable */}
                        <button
                          onClick={() => toggleDateCollapse(date)}
                          className={`w-full px-5 py-3 flex items-center justify-between transition-colors ${
                            dateIsToday
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                              : dateIsCompleted
                              ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          } hover:opacity-90`}
                        >
                          <h3 className="text-white font-semibold flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                            {dateIsCompleted && (
                              <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">
                                Completed
                              </span>
                            )}
                          </h3>
                          <div className="text-white">
                            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                          </div>
                        </button>

                        {/* Timeline Items - Only show if not collapsed */}
                        {!isCollapsed && (
                          <div className="p-4 pl-8">
                            <DroppableDateContainer
                              date={date}
                              itemIds={items.map(i => i.id)}
                            >
                              <div className="relative">
                                {/* Timeline Line */}
                                <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

                                {/* Items */}
                                <div className="space-y-4">
                                  {items
                                    .sort((a, b) => {
                                      // Determine if items are completed based on end date/time
                                      const now = new Date();
                                      const aEndDateTime = new Date(`${a.dateTo}T${a.timeTo}`);
                                      const bEndDateTime = new Date(`${b.dateTo}T${b.timeTo}`);
                                      const aCompleted = aEndDateTime < now;
                                      const bCompleted = bEndDateTime < now;
                                      
                                      // Upcoming items first, completed items last
                                      if (aCompleted !== bCompleted) {
                                        return aCompleted ? 1 : -1;
                                      }
                                      
                                      // Within same status, sort by start time
                                      return a.timeFrom.localeCompare(b.timeFrom);
                                    })
                                    .map((item, index) => (
                                      <TimelineSortableItem key={`${date}-${item.id}-${index}`} id={item.id}>
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-full ${getActivityIconColor(item)} text-white flex items-center justify-center flex-shrink-0 z-10 shadow-md`}>
                                          {getActivityIcon(item)}
                                        </div>

                                        {/* Content */}
                                        <div
                                          className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-100 dark:border-slate-600 group hover:border-blue-200 dark:hover:border-blue-500 transition-colors cursor-pointer"
                                          onClick={() => handleViewDetails(item)}
                                        >
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex flex-col gap-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-100">{item.placeName}</h4>
                                                {getTravelTypeBadge(item)}
                                                {item.flightNumber && item.flightNumber !== 'N/A' && (
                                                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200">
                                                    {item.flightNumber}
                                                  </span>
                                                )}
                                                {/* Time inline for transport types */}
                                                {['air', 'land', 'sea'].includes(item.travelType || '') && (
                                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                                    {formatTime(item.timeFrom, household.timeFormat || '24h')} - {formatTime(item.timeTo, household.timeFormat || '24h')}
                                                  </span>
                                                )}
                                              </div>
                                              {item.operatorName && item.operatorName !== 'N/A' && (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{item.operatorName}</span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {/* Time badge for non-transport types */}
                                              {!['air', 'land', 'sea'].includes(item.travelType || '') && (
                                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                                  {formatTime(item.timeFrom, household.timeFormat || '24h')} - {formatTime(item.timeTo, household.timeFormat || '24h')}
                                                </span>
                                              )}
                                              {/* Desktop: hover-based edit button */}
                                              {!isMobile && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditActivity(item);
                                                  }}
                                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                  title="Edit activity"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </button>
                                              )}
                                              {/* Mobile: 3-dot menu with loading state */}
                                              {isMobile && (
                                                loadingActivityId === item.id ? (
                                                  <div className="p-1.5">
                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                  </div>
                                                ) : (
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <button
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-all"
                                                        title="More options"
                                                      >
                                                        <MoreVertical className="w-4 h-4" />
                                                      </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                      <DropdownMenuItem onClick={() => handleEditActivity(item)}>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => handleDeleteActivity(item.id)}
                                                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                                      >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                )
                                              )}
                                            </div>
                                          </div>

                                          {/* Departure & Arrival Info for Transport */}
                                          {((item.terminalInfo && item.terminalInfo !== 'N/A') || (item.arrivalInfo && item.arrivalInfo !== 'N/A')) && (
                                            <div className="bg-slate-100 dark:bg-slate-600 rounded-lg p-3 mb-2 space-y-2">
                                              {item.terminalInfo && item.terminalInfo !== 'N/A' && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase w-12">From</span>
                                                  {item.googleMapsUrl ? (
                                                    <a
                                                      href={item.googleMapsUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                                    >
                                                      <Plane className="w-3 h-3 rotate-45" />
                                                      {item.terminalInfo}
                                                      <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
                                                    </a>
                                                  ) : (
                                                    <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                                                      <Plane className="w-3 h-3 rotate-45" />
                                                      {item.terminalInfo}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                              {item.arrivalInfo && item.arrivalInfo !== 'N/A' && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase w-12">To</span>
                                                  {item.arrivalGoogleMapsUrl ? (
                                                    <a
                                                      href={item.arrivalGoogleMapsUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                                    >
                                                      <Plane className="w-3 h-3 -rotate-45" />
                                                      {item.arrivalInfo}
                                                      <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
                                                    </a>
                                                  ) : (
                                                    <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded flex items-center gap-1">
                                                      <Plane className="w-3 h-3 -rotate-45" />
                                                      {item.arrivalInfo}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Address with Maps Link */}
                                          {item.address && item.address !== 'N/A' && !item.terminalInfo && !item.arrivalInfo && (
                                            <div className="flex items-center gap-2 mb-2">
                                              <p className="text-sm text-slate-500 dark:text-slate-300 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {item.address}
                                              </p>
                                              {item.googleMapsUrl && (
                                                <a
                                                  href={item.googleMapsUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                                >
                                                  <ExternalLink className="w-3 h-3" />
                                                  Maps
                                                </a>
                                              )}
                                            </div>
                                          )}

                                          {/* Booking Info Row */}
                                          <div className="flex flex-wrap items-center gap-3 mb-2">
                                            {item.confirmationNumber && item.confirmationNumber !== 'N/A' && (
                                              <div className="flex items-center gap-1">
                                                <Ticket className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Ref:</span>
                                                <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded">
                                                  {item.confirmationNumber}
                                                </span>
                                              </div>
                                            )}
                                            {item.gateNumber && item.gateNumber !== 'null' && item.gateNumber !== 'N/A' && ['air', 'land', 'sea'].includes(item.travelType || '') && (
                                              <div className="flex items-center gap-1">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Gate:</span>
                                                <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
                                                  {item.gateNumber}
                                                </span>
                                              </div>
                                            )}
                                            {item.boardingTime && item.boardingTime !== 'null' && item.boardingTime !== 'N/A' && ['air', 'land', 'sea'].includes(item.travelType || '') && (
                                              <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Boarding:</span>
                                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                                                  {formatTime(item.boardingTime, household.timeFormat || '24h')}
                                                </span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Passenger Information */}
                                          {item.passengers && item.passengers.length > 0 && ['air', 'land', 'sea'].includes(item.travelType || '') && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 mb-2">
                                              <div className="flex items-center gap-2 mb-2">
                                                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                                  Passengers ({item.passengers.length})
                                                </span>
                                              </div>
                                              <div className="space-y-1.5">
                                                {item.passengers.map((passenger, pIdx) => {
                                                  const isValid = (val: string | undefined | null) =>
                                                    val && val !== 'null' && val !== 'N/A' && val.trim() !== '';

                                                  return (
                                                    <div key={pIdx} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded px-2 py-1.5 text-xs">
                                                      <div className="flex items-center gap-2">
                                                        <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                        <span className="font-medium text-slate-700 dark:text-slate-200">{passenger.name}</span>
                                                        {isValid(passenger.class) && (
                                                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-600 px-1 rounded">
                                                            {passenger.class}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        {isValid(passenger.seatNumber) && (
                                                          <span className="flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                                            <Armchair className="w-3 h-3" />
                                                            {passenger.seatNumber}
                                                          </span>
                                                        )}
                                                        {isValid(passenger.ticketNumber) && (
                                                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                            #{passenger.ticketNumber}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}

                                          {/* Contact Numbers */}
                                          <div className="flex flex-wrap items-center gap-2 mb-2">
                                            {item.operatorContact && (
                                              <a
                                                href={`tel:${item.operatorContact}`}
                                                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                                              >
                                                <Phone className="w-3 h-3" />
                                                {item.operatorName && item.operatorName !== 'N/A' ? `${item.operatorName}: ` : ''}{item.operatorContact}
                                              </a>
                                            )}
                                            {item.contactNumber && item.contactNumber !== item.operatorContact && (
                                              <a
                                                href={`tel:${item.contactNumber}`}
                                                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                                              >
                                                <Phone className="w-3 h-3" />
                                                {item.contactNumber}
                                              </a>
                                            )}
                                          </div>

                                          {/* Check-in Instructions */}
                                          {item.checkInInstructions && item.checkInInstructions !== 'N/A' && item.checkInInstructions !== 'null' && (
                                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-2">
                                              <div className="flex items-start gap-2">
                                                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                  <span className="text-xs font-semibold text-amber-700 block mb-1">Check-in Instructions</span>
                                                  <p className="text-xs text-amber-800">{item.checkInInstructions}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Linked Documents */}
                                          {item.sourceDocuments && item.sourceDocuments.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                              {item.sourceDocuments.map((doc, docIdx) => {
                                                const meta = item.documentMetadata?.[doc.id];
                                                const icon = meta?.documentType === 'boarding_pass' ? '🎫' :
                                                             meta?.documentType === 'ticket' ? '📄' :
                                                             meta?.documentType === 'hotel_voucher' ? '🏨' :
                                                             meta?.documentType === 'confirmation' ? '📋' : '📎';

                                                return (
                                                  <button
                                                    key={`${item.id}-doc-${doc.id}-${docIdx}`}
                                                    onClick={() => onPreviewDocument({ url: doc.url, name: doc.name, type: meta?.documentType })}
                                                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors border border-blue-200"
                                                    title={`View ${doc.name}`}
                                                  >
                                                    <span>{icon}</span>
                                                    <span className="truncate max-w-[120px]">{doc.name}</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                  </button>
                                                );
                                              })}
                                              {item.mergeCount && item.mergeCount > 1 && (
                                                <span className="text-xs text-slate-400 italic">
                                                  (merged from {item.mergeCount} documents)
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {/* Description */}
                                          {item.description && (
                                            <div
                                              className="text-sm text-slate-600 prose prose-sm max-w-none"
                                              dangerouslySetInnerHTML={{ __html: item.description }}
                                            />
                                          )}
                                        </div>
                                      </TimelineSortableItem>
                                    ))}
                                </div>
                              </div>
                            </DroppableDateContainer>
                          </div>
                        )}
                      </div>
                    );
                  })}
                <ItineraryDragOverlay activeItem={activeItem} />
              </DndContext>
            </div>
          )}
        </div>
      )}

      {/* AI Planner Tab */}
      {plannerTab === 'ai' && (
        <div className="space-y-4">
          {aiPlannerDestinations.length > 1 && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 p-4 rounded-xl border border-blue-100">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Select Destination to Plan
              </Label>
              <Select
                value={String(selectedAiDestinationIndex)}
                onValueChange={(val) => setSelectedAiDestinationIndex(Number(val))}
              >
                <SelectTrigger className="w-full bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {aiPlannerDestinations.map((dest, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>{dest.city}{dest.country ? `, ${dest.country}` : ''}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                Planning for: <span className="font-medium text-blue-600">{selectedAiDestination?.city}{selectedAiDestination?.country ? `, ${selectedAiDestination.country}` : ''}</span>
              </p>
            </div>
          )}

          {aiPlannerDestinations.length === 1 && selectedAiDestination && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm text-slate-600">
                Planning for: <span className="font-medium text-blue-600">{selectedAiDestination.city}{selectedAiDestination.country ? `, ${selectedAiDestination.country}` : ''}</span>
              </p>
            </div>
          )}

          <ItineraryGenerator
            tripId={trip.id}
            city={selectedAiDestination?.city || trip.destination}
            country={selectedAiDestination?.country}
            daysCount={trip.days}
            onAddToItinerary={handleAddPlaceToItinerary}
          />
        </div>
      )}

      {/* Document Tab */}
      {plannerTab === 'document' && (
        <div className="h-[70vh]">
          <RichTextEditor
            content={trip.noteContent || ''}
            onChange={handleNoteChange}
          />
        </div>
      )}

      {/* Route Tab */}
      {plannerTab === 'route' && (
        <div className="h-[calc(100vh-200px)] min-h-[500px]">
          <RoutePlannerTab
            tripId={trip.id}
            wizardItems={wizardItems}
            tripDestinations={trip.destinations}
            household={household}
            onItemsChange={onWizardItemsChange}
          />
        </div>
      )}

      {/* Itinerary Wizard Dialog */}
      <ItineraryWizard
        tripId={trip.id}
        householdId={trip.householdId}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        existingItems={wizardItems}
        onItemsChange={onWizardItemsChange}
        onCombineComplete={onNoteContentUpdated}
        editingItem={editingItem}
        onEditingItemChange={setEditingItem}
        prefilledPlace={prefilledPlace}
        onPrefilledPlaceChange={setPrefilledPlace}
        tripDestinations={trip.destinations}
      />

      {/* Itinerary Details Dialog (Desktop) */}
      <ItineraryDetailsDialog
        item={detailsItem}
        open={!!detailsItem}
        onOpenChange={(open) => !open && setDetailsItem(null)}
        tripId={trip.id}
        householdId={trip.householdId}
        household={household}
        onItemUpdate={handleDetailsItemUpdate}
        onPreviewDocument={onPreviewDocument}
        onEditFull={handleEditFromDetails}
      />

      {/* Route Planner FAB */}
      <RoutePlannerFAB
        tripId={trip.id}
        wizardItems={wizardItems}
        tripDestinations={trip.destinations}
        household={household}
        exchangeRates={exchangeRates}
      />
    </div>
  );
}
