'use client';

import { useState, useEffect } from 'react';
import { WizardItineraryItem, RecommendedPlace, ActivityTravelType, Destination, DocumentReference, ChecklistItem, GeoLocation } from '@/types';
import { PlaceAutocomplete } from '@/components/place-autocomplete';
import {
  saveWizardItemAction,
  updateWizardItemAction,
  combineWizardItemsToDocAction,
  geocodeAddressAction,
  calculateDirectionsAction,
} from '@/lib/actions';
import {
  Loader2,
  DollarSign,
  Phone,
  Plane,
  Car,
  Ship,
  Hotel,
  MapPinned,
  Building2,
  Route,
  Paperclip,
  ListChecks,
  StickyNote,
  ChevronDown,
  Plus,
  Save,
} from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ActivityAttachmentPicker, PendingUpload } from '@/components/activity-attachment-picker';
import { DocumentVaultSelector } from '@/components/document-vault-selector';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChecklistEditor } from '@/components/checklist-editor';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MiniEditor } from '@/components/mini-editor';
import { OriginSelectorDialog } from '@/components/origin-selector-dialog';
import { cn } from '@/lib/utils';

interface ActivityFormProps {
  tripId: string;
  householdId: string;
  existingItems: WizardItineraryItem[];
  tripDestinations?: Destination[];
  editingItem?: WizardItineraryItem | null;
  prefilledPlace?: RecommendedPlace | null;
  onSave: (item: WizardItineraryItem) => void;
  onCancel: () => void;
  isMobilePage?: boolean;
  onItemsChange?: (items: WizardItineraryItem[]) => void;
  onCombineComplete?: (content: string) => void;
}

export function ActivityForm({
  tripId,
  householdId,
  existingItems,
  tripDestinations = [],
  editingItem,
  prefilledPlace,
  onSave,
  onCancel,
  isMobilePage = false,
  onItemsChange,
  onCombineComplete,
}: ActivityFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Form state
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [addressLocation, setAddressLocation] = useState<GeoLocation | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [contactNumber, setContactNumber] = useState('');

  // Travel type fields
  const [travelType, setTravelType] = useState<ActivityTravelType>('activity');
  const [terminalInfo, setTerminalInfo] = useState('');
  const [arrivalInfo, setArrivalInfo] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [arrivalGoogleMapsUrl, setArrivalGoogleMapsUrl] = useState('');

  // Distance from accommodation state
  const [distanceFromAccommodation, setDistanceFromAccommodation] = useState<string | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  // Find all accommodations
  const allAccommodations = existingItems.filter(item => item.travelType === 'accommodation');

  // Origin selector state
  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<WizardItineraryItem | null>(null);

  // State for detected accommodation after geocoding
  const [detectedAccommodation, setDetectedAccommodation] = useState<WizardItineraryItem | null>(null);
  const [accommodationStatus, setAccommodationStatus] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle');

  // Attachment state
  const [attachments, setAttachments] = useState<DocumentReference[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [vaultSelectorOpen, setVaultSelectorOpen] = useState(false);

  // Notes and checklist state
  const [quickNotes, setQuickNotes] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notesChecklistOpen, setNotesChecklistOpen] = useState(false);

  // Initialize form with editing item
  useEffect(() => {
    if (editingItem) {
      setPlaceName(editingItem.placeName);
      setAddress(editingItem.address || '');
      setDateFrom(editingItem.dateFrom);
      setDateTo(editingItem.dateTo || '');
      setTimeFrom(editingItem.timeFrom);
      setTimeTo(editingItem.timeTo || '');
      setDescription(editingItem.description || '');
      setEstimatedCost(editingItem.estimatedCost?.toString() || '');
      setContactNumber(editingItem.contactNumber || '');
      setTravelType(editingItem.travelType || 'activity');
      setTerminalInfo(editingItem.terminalInfo || '');
      setArrivalInfo(editingItem.arrivalInfo || '');
      setOperatorName(editingItem.operatorName || '');
      setGoogleMapsUrl(editingItem.googleMapsUrl || '');
      setArrivalGoogleMapsUrl(editingItem.arrivalGoogleMapsUrl || '');
      setAttachments(editingItem.sourceDocuments || []);
      setQuickNotes(editingItem.quickNotes || '');
      setChecklist(editingItem.checklist || []);
      setNotesChecklistOpen(!!(editingItem.quickNotes || (editingItem.checklist && editingItem.checklist.length > 0)));
    }
  }, [editingItem]);

  // Initialize form with prefilled place from AI recommendations
  useEffect(() => {
    if (prefilledPlace && !editingItem) {
      setPlaceName(prefilledPlace.name);
      setAddress(prefilledPlace.address || '');
      setDateFrom('');
      setDateTo('');
      setTimeFrom('09:00');
      setTimeTo('10:00');
      const desc = prefilledPlace.tips
        ? `${prefilledPlace.description}\n\nTip: ${prefilledPlace.tips}`
        : prefilledPlace.description;
      setDescription(desc);
    }
  }, [prefilledPlace, editingItem]);

  // Extract country from geocoded address
  const extractCountryFromAddress = (formattedAddress: string): string | null => {
    const addressLower = formattedAddress.toLowerCase();
    const tripCountries = tripDestinations
      .map(d => d.country?.toLowerCase().trim())
      .filter(Boolean) as string[];
    return tripCountries.find(country => addressLower.includes(country)) || null;
  };

  // Handle origin selection and calculate distance
  const handleOriginSelect = async (accommodation: WizardItineraryItem) => {
    setSelectedOrigin(accommodation);

    // Immediately calculate distance with the selected origin
    if (!address) {
      toast({
        title: 'Missing Information',
        description: 'Please enter an address first.',
        variant: 'destructive',
      });
      return;
    }

    setCalculatingDistance(true);
    setDistanceFromAccommodation(null);
    setDetectedAccommodation(null);
    setAccommodationStatus('checking');

    try {
      const tripCountryList = tripDestinations
        .map(d => d.country?.trim())
        .filter(Boolean) as string[];

      let activityGeo: { success?: boolean; error?: string; location?: { lat: number; lng: number; formattedAddress: string } } | null = null;

      // Use stored location from place search if available (skip geocoding)
      if (addressLocation) {
        activityGeo = { success: true, location: addressLocation };
      } else {
        activityGeo = await geocodeAddressAction(address);

        if (!activityGeo?.success || !activityGeo?.location) {
          // Try with country hints
          if (tripCountryList.length > 0) {
            for (const country of tripCountryList) {
              const addressWithCountry = `${address}, ${country}`;
              const geoWithCountry = await geocodeAddressAction(addressWithCountry);
              if (geoWithCountry.success && geoWithCountry.location) {
                activityGeo = geoWithCountry;
                break;
              }
            }
          }
        }
      }

      if (!activityGeo?.success || !activityGeo?.location) {
        toast({
          title: 'Geocoding Failed',
          description: 'Could not locate address. Try adding more details like city or country.',
          variant: 'destructive',
        });
        setCalculatingDistance(false);
        setAccommodationStatus('idle');
        return;
      }

      setDetectedAccommodation(accommodation);
      setAccommodationStatus('found');

      if (!accommodation.address) {
        toast({
          title: 'Missing Address',
          description: 'The selected accommodation does not have an address.',
          variant: 'destructive',
        });
        setCalculatingDistance(false);
        return;
      }

      const accommodationGeo = await geocodeAddressAction(accommodation.address);
      if (!accommodationGeo.success || !accommodationGeo.location) {
        toast({
          title: 'Geocoding Failed',
          description: `Could not locate accommodation: ${accommodationGeo.error || 'Unknown error'}`,
          variant: 'destructive',
        });
        setCalculatingDistance(false);
        return;
      }

      const result = await calculateDirectionsAction(
        accommodationGeo.location,
        activityGeo.location,
        'driving'
      );

      if (result.success && result.distance) {
        setDistanceFromAccommodation(result.distance.text);
        toast({
          title: 'Distance Calculated',
          description: `${result.distance.text} from ${accommodation.placeName}`,
        });
      } else {
        toast({
          title: 'Calculation Failed',
          description: result.error || 'Could not calculate distance.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while calculating distance.',
        variant: 'destructive',
      });
      setAccommodationStatus('idle');
    } finally {
      setCalculatingDistance(false);
    }
  };

  // Open origin selector dialog
  const handleCalculateDistance = () => {
    if (!address) {
      toast({
        title: 'Missing Information',
        description: 'Please enter an address first.',
        variant: 'destructive',
      });
      return;
    }

    if (allAccommodations.length === 0) {
      toast({
        title: 'No Accommodation',
        description: 'Add an accommodation to your itinerary first.',
        variant: 'destructive',
      });
      return;
    }

    // If only one accommodation, use it directly
    if (allAccommodations.length === 1) {
      handleOriginSelect(allAccommodations[0]);
      return;
    }

    // Multiple accommodations - show selector dialog
    setOriginSelectorOpen(true);
  };

  // Helper function to upload pending attachments
  const uploadPendingAttachments = async (): Promise<DocumentReference[]> => {
    const uploadedAttachments: DocumentReference[] = [...attachments];

    if (pendingUploads.length === 0) {
      return uploadedAttachments;
    }

    if (!storage) {
      throw new Error('Storage not initialized');
    }

    setUploadingAttachments(true);

    for (const pending of pendingUploads) {
      const timestamp = Date.now();
      const storagePath = `households/${householdId}/trips/${tripId}/activities/${timestamp}_${pending.file.name}`;

      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, pending.file);
      const downloadURL = await getDownloadURL(storageRef);

      uploadedAttachments.push({
        id: `attachment_${timestamp}_${pending.id}`,
        name: pending.name,
        type: pending.type,
        url: downloadURL,
        uploadedAt: new Date().toISOString(),
      });
    }

    setUploadingAttachments(false);
    return uploadedAttachments;
  };

  const handleSaveItem = async () => {
    if (!placeName || !dateFrom) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in place name and date.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    let finalAttachments: DocumentReference[] = [];
    try {
      finalAttachments = await uploadPendingAttachments();
    } catch {
      toast({
        title: 'Upload Error',
        description: 'Failed to upload one or more attachments.',
        variant: 'destructive',
      });
      setSaving(false);
      setUploadingAttachments(false);
      return;
    }

    if (editingItem) {
      // Update existing item
      const updates = {
        placeName,
        address,
        dateFrom,
        dateTo: dateTo || dateFrom,
        timeFrom,
        timeTo,
        description,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        contactNumber: contactNumber || undefined,
        travelType,
        terminalInfo: terminalInfo || undefined,
        arrivalInfo: arrivalInfo || undefined,
        operatorName: operatorName || undefined,
        googleMapsUrl: googleMapsUrl || undefined,
        arrivalGoogleMapsUrl: arrivalGoogleMapsUrl || undefined,
        sourceDocuments: finalAttachments.length > 0 ? finalAttachments : undefined,
        quickNotes: quickNotes || undefined,
        checklist: checklist.length > 0 ? checklist : undefined,
      };

      const result = await updateWizardItemAction(tripId, editingItem.id, updates);

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Activity updated!',
        });

        const updatedItem = { ...editingItem, ...updates };

        if (onItemsChange) {
          const updatedItems = existingItems.map(item =>
            item.id === editingItem.id ? updatedItem : item
          );
          onItemsChange(updatedItems);

          if (onCombineComplete) {
            const docResult = await combineWizardItemsToDocAction(tripId, updatedItems);
            if (docResult.content) {
              onCombineComplete(docResult.content);
            }
          }
        }

        onSave(updatedItem as WizardItineraryItem);
      }
    } else {
      // Add new item
      const newItem = {
        tripId,
        placeName,
        address,
        dateFrom,
        dateTo: dateTo || dateFrom,
        timeFrom,
        timeTo,
        description,
        order: existingItems.length,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        contactNumber: contactNumber || undefined,
        travelType,
        terminalInfo: terminalInfo || undefined,
        arrivalInfo: arrivalInfo || undefined,
        operatorName: operatorName || undefined,
        googleMapsUrl: googleMapsUrl || undefined,
        arrivalGoogleMapsUrl: arrivalGoogleMapsUrl || undefined,
        sourceDocuments: finalAttachments.length > 0 ? finalAttachments : undefined,
        quickNotes: quickNotes || undefined,
        checklist: checklist.length > 0 ? checklist : undefined,
      };

      const result = await saveWizardItemAction(tripId, newItem);

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.item) {
        toast({
          title: 'Success',
          description: 'Activity added!',
        });

        if (onItemsChange) {
          const updatedItems = [...existingItems, result.item as WizardItineraryItem];
          onItemsChange(updatedItems);

          if (onCombineComplete) {
            const docResult = await combineWizardItemsToDocAction(tripId, updatedItems);
            if (docResult.content) {
              onCombineComplete(docResult.content);
            }
          }
        }

        onSave(result.item as WizardItineraryItem);
      }
    }

    setSaving(false);
  };

  return (
    <>
      <div className={cn("space-y-5", isMobilePage && "pb-24")}>
        {/* Place Name */}
        <div className="space-y-2">
          <Label htmlFor="placeName">Place Name *</Label>
          <Input
            id="placeName"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="e.g., Eiffel Tower, Local Restaurant"
          />
        </div>

        {/* Activity Type Selector */}
        <div className="space-y-2">
          <Label>Activity Type</Label>
          <div className={cn("grid gap-2", isMobilePage ? "grid-cols-3" : "grid-cols-5")}>
            {([
              { type: 'activity' as ActivityTravelType, icon: MapPinned, label: 'Activity' },
              { type: 'air' as ActivityTravelType, icon: Plane, label: 'Air' },
              { type: 'land' as ActivityTravelType, icon: Car, label: 'Land' },
              { type: 'sea' as ActivityTravelType, icon: Ship, label: 'Sea' },
              { type: 'accommodation' as ActivityTravelType, icon: Hotel, label: 'Stay' },
            ]).map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => setTravelType(type)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs',
                  travelType === type
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Travel-specific fields */}
        {(travelType === 'air' || travelType === 'land' || travelType === 'sea') && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              {travelType === 'air' && <Plane className="w-4 h-4 text-indigo-500" />}
              {travelType === 'land' && <Car className="w-4 h-4 text-indigo-500" />}
              {travelType === 'sea' && <Ship className="w-4 h-4 text-indigo-500" />}
              {travelType === 'air' ? 'Flight Details' : travelType === 'land' ? 'Travel Details' : 'Voyage Details'}
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminalInfo">
                {travelType === 'air' ? 'Departure Terminal' : travelType === 'sea' ? 'Departure Port/Terminal' : 'Departure Station/Terminal'}
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="terminalInfo"
                  value={terminalInfo}
                  onChange={(e) => setTerminalInfo(e.target.value)}
                  placeholder={travelType === 'air' ? 'e.g., Terminal 1, Gate A23' : travelType === 'sea' ? 'e.g., Port Terminal, Dock 5' : 'e.g., Central Station, Platform 3'}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalInfo">
                {travelType === 'air' ? 'Arrival Terminal' : travelType === 'sea' ? 'Arrival Port/Terminal' : 'Arrival Station/Terminal'}
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="arrivalInfo"
                  value={arrivalInfo}
                  onChange={(e) => setArrivalInfo(e.target.value)}
                  placeholder={travelType === 'air' ? 'e.g., Terminal 2, Gate B15' : travelType === 'sea' ? 'e.g., Cruise Terminal, Pier 8' : 'e.g., North Station'}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operatorName">
                {travelType === 'air' ? 'Airline (optional)' : travelType === 'sea' ? 'Cruise Line / Ferry Operator (optional)' : 'Operator / Company (optional)'}
              </Label>
              <Input
                id="operatorName"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder={travelType === 'air' ? 'e.g., United Airlines, BA' : travelType === 'sea' ? 'e.g., Royal Caribbean' : 'e.g., Amtrak, Eurostar'}
              />
            </div>
          </div>
        )}

        {/* Date Range */}
        <div className={cn("grid gap-4", isMobilePage ? "grid-cols-1" : "grid-cols-2")}>
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Date From *</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">Date To</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Same as from"
            />
          </div>
        </div>

        {/* Time Range */}
        <div className={cn("grid gap-4", isMobilePage ? "grid-cols-1" : "grid-cols-2")}>
          <div className="space-y-2">
            <Label htmlFor="timeFrom">Time From</Label>
            <Input
              id="timeFrom"
              type="time"
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeTo">Time To</Label>
            <Input
              id="timeTo"
              type="time"
              value={timeTo}
              onChange={(e) => setTimeTo(e.target.value)}
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Exact Address</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <PlaceAutocomplete
                id="address"
                value={address}
                placeholder="Search for a place or enter address..."
                onChange={(value) => {
                  setAddress(value);
                  setAddressLocation(null);
                  setDistanceFromAccommodation(null);
                  setDetectedAccommodation(null);
                  setAccommodationStatus('idle');
                }}
                onSelect={(place) => {
                  setAddress(place.address);
                  setAddressLocation(place.location || null);
                  setDistanceFromAccommodation(null);
                  setDetectedAccommodation(null);
                  setAccommodationStatus('idle');
                }}
                allowManualEntry={true}
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCalculateDistance}
                    disabled={calculatingDistance || !address || allAccommodations.length === 0}
                    className="flex-shrink-0"
                  >
                    {calculatingDistance ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Route className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Calculate distance from accommodation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {distanceFromAccommodation && detectedAccommodation && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
              <Route className="w-4 h-4" />
              <span>
                <strong>{distanceFromAccommodation}</strong> from {detectedAccommodation.placeName}
              </span>
            </div>
          )}
          {accommodationStatus === 'not_found' && travelType !== 'accommodation' && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
              <Hotel className="w-4 h-4" />
              <span>No accommodation in the same country</span>
            </div>
          )}
          {allAccommodations.length === 0 && travelType !== 'accommodation' && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
              <Hotel className="w-4 h-4" />
              <span>Accommodation not available</span>
            </div>
          )}
        </div>

        {/* Contact & Cost */}
        <div className={cn("grid gap-4", isMobilePage ? "grid-cols-1" : "grid-cols-2")}>
          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number (optional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="contactNumber"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+1 234 567 8900"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Est. Cost (optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="estimatedCost"
                type="number"
                min="0"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description / Notes</Label>
          <MiniEditor
            value={description}
            onChange={setDescription}
            placeholder="Add any details, booking info, or notes..."
          />
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Attachments (Optional)
          </Label>
          <ActivityAttachmentPicker
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            pendingUploads={pendingUploads}
            onPendingUploadsChange={setPendingUploads}
            onOpenVaultSelector={() => setVaultSelectorOpen(true)}
          />
        </div>

        {/* Quick Notes & Checklist */}
        <Collapsible open={notesChecklistOpen} onOpenChange={setNotesChecklistOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-indigo-500" />
              <span className="font-medium text-sm">Quick Notes & Checklist</span>
            </div>
            <div className="flex items-center gap-2">
              {(quickNotes || checklist.length > 0) && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {checklist.length > 0
                    ? `${checklist.filter(c => c.completed).length}/${checklist.length}`
                    : 'Notes'}
                </span>
              )}
              <ChevronDown className={cn(
                "w-4 h-4 text-slate-400 transition-transform",
                notesChecklistOpen && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quickNotes" className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-500" />
                Quick Notes
              </Label>
              <Textarea
                id="quickNotes"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Reminders, tips, things to remember..."
                className="min-h-[80px] resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-indigo-500" />
                Packing / To-Do Checklist
              </Label>
              <ChecklistEditor
                items={checklist}
                onChange={setChecklist}
                placeholder="Add checklist item..."
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Document Vault Selector Modal */}
      <DocumentVaultSelector
        tripId={tripId}
        open={vaultSelectorOpen}
        onOpenChange={setVaultSelectorOpen}
        onSelect={(docs) => {
          setAttachments(prev => [...prev, ...docs]);
        }}
        excludeIds={attachments.map(a => a.id)}
      />

      {/* Origin Selector Dialog */}
      <OriginSelectorDialog
        open={originSelectorOpen}
        onOpenChange={setOriginSelectorOpen}
        accommodations={allAccommodations}
        onSelect={handleOriginSelect}
        selectedId={selectedOrigin?.id}
      />

      {/* Footer for mobile page */}
      {isMobilePage && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-3 z-50">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSaveItem} disabled={saving || uploadingAttachments} className="flex-1">
            {saving || uploadingAttachments ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadingAttachments ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              <>
                {editingItem ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingItem ? 'Update' : 'Add Activity'}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Footer for dialog */}
      {!isMobilePage && (
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveItem} disabled={saving || uploadingAttachments}>
            {saving || uploadingAttachments ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadingAttachments ? 'Uploading...' : (editingItem ? 'Updating...' : 'Adding...')}
              </>
            ) : (
              <>
                {editingItem ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingItem ? 'Update Activity' : 'Add Activity'}
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
