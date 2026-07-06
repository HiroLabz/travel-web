'use client';

import { useState } from 'react';
import {
  TravelPreferences,
  VacationType,
  TravelGroup,
  BudgetLevel,
  TransportOption,
  DiningPreference,
  ExperienceType,
  RecommendedPlace,
  TransportRecommendation,
  VACATION_TYPE_LABELS,
  VACATION_TYPE_ICONS,
  TRAVEL_GROUP_LABELS,
  BUDGET_LABELS,
  TRANSPORT_LABELS,
  TRANSPORT_ICONS,
  TRANSPORT_SUGGESTIONS,
  DINING_LABELS,
  EXPERIENCE_LABELS,
  EXPERIENCE_ICONS,
} from '@/types';
import { generatePlaceRecommendationsAction, generateTransportRecommendationsAction } from '@/lib/actions';
import { Sparkles, Loader2, MapPin, Clock, Plus, ExternalLink, RotateCcw, Image as ImageIcon, Info, Bus, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ItineraryGeneratorProps {
  tripId: string;
  city: string;
  country?: string;
  daysCount: number;
  onAddToItinerary: (place: RecommendedPlace) => void;
}

export function ItineraryGenerator({
  tripId,
  city,
  country,
  daysCount,
  onAddToItinerary,
}: ItineraryGeneratorProps) {
  const { toast } = useToast();

  // Preferences state - vacationTypes is now an array
  const [vacationTypes, setVacationTypes] = useState<VacationType[]>(['city']);
  const [travelGroup, setTravelGroup] = useState<TravelGroup>('family');
  const [budget, setBudget] = useState<BudgetLevel>('midrange');
  const [transport, setTransport] = useState<TransportOption[]>(['taxi', 'walking']);
  const [dining, setDining] = useState<DiningPreference>('mix');
  const [experiences, setExperiences] = useState<ExperienceType[]>(['landmarks', 'museums']);

  // Results state
  const [loading, setLoading] = useState(false);
  const [groupedPlaces, setGroupedPlaces] = useState<Record<ExperienceType, RecommendedPlace[]> | null>(null);
  const [summary, setSummary] = useState<string>('');

  // Transport recommendations state
  const [loadingTransport, setLoadingTransport] = useState(false);
  const [transportOptions, setTransportOptions] = useState<TransportRecommendation[]>([]);
  const [transportGeneralTips, setTransportGeneralTips] = useState<string>('');
  const [transportCard, setTransportCard] = useState<string>('');
  const [showTransport, setShowTransport] = useState(false);

  const toggleVacationType = (type: VacationType) => {
    setVacationTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleTransport = (option: TransportOption) => {
    setTransport(prev =>
      prev.includes(option)
        ? prev.filter(t => t !== option)
        : [...prev, option]
    );
  };

  const toggleExperience = (exp: ExperienceType) => {
    setExperiences(prev =>
      prev.includes(exp)
        ? prev.filter(e => e !== exp)
        : [...prev, exp]
    );
  };

  const handleGenerate = async () => {
    if (vacationTypes.length === 0) {
      toast({
        title: 'Select Vacation Type',
        description: 'Please select at least one vacation type.',
        variant: 'destructive',
      });
      return;
    }

    if (experiences.length === 0) {
      toast({
        title: 'Select Experiences',
        description: 'Please select at least one experience type.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setGroupedPlaces(null);

    const preferences: TravelPreferences = {
      vacationTypes,
      travelGroup,
      budget,
      transport,
      dining,
      experiences,
    };

    // Include country for better location context
    const location = country ? `${city}, ${country}` : city;
    const result = await generatePlaceRecommendationsAction(location, daysCount, preferences);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else if (result.groupedPlaces) {
      setGroupedPlaces(result.groupedPlaces);
      setSummary(result.summary || '');
      toast({
        title: 'Recommendations Ready!',
        description: `Found ${result.places?.length || 0} places for your trip.`,
      });
    }
    setLoading(false);
  };

  const handleReset = () => {
    setGroupedPlaces(null);
    setSummary('');
    setTransportOptions([]);
    setTransportGeneralTips('');
    setTransportCard('');
    setShowTransport(false);
  };

  const handleGenerateTransport = async () => {
    setLoadingTransport(true);

    const result = await generateTransportRecommendationsAction(
      city,
      daysCount,
      travelGroup,
      budget,
      transport,
      country
    );

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      setTransportOptions(result.transportOptions || []);
      setTransportGeneralTips(result.generalTips || '');
      setTransportCard(result.cardRecommendation || '');
      setShowTransport(true);
      toast({
        title: 'Transport Guide Ready!',
        description: `Found ${result.transportOptions?.length || 0} transport options.`,
      });
    }
    setLoadingTransport(false);
  };

  // Render preferences form
  if (!groupedPlaces) {
    return (
      <TooltipProvider>
        <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-indigo-500" />
              AI Trip Planner
            </h3>
          </div>

          <div className="space-y-5">
            {/* Row 1: Vacation Types - Multi-select */}
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-2 block">What type of vacation are you planning? (select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(VACATION_TYPE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleVacationType(key as VacationType)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      vacationTypes.includes(key as VacationType)
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <span className="text-lg">{VACATION_TYPE_ICONS[key as VacationType]}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Travel Group & Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Travel Group</Label>
                <Select value={travelGroup} onValueChange={(v) => setTravelGroup(v as TravelGroup)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRAVEL_GROUP_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Accommodation Budget</Label>
                <Select value={budget} onValueChange={(v) => setBudget(v as BudgetLevel)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUDGET_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Dining */}
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Dining Preference</Label>
              <Select value={dining} onValueChange={(v) => setDining(v as DiningPreference)}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DINING_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 4: Transport Options with Suggestions */}
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-2 block">Available Transport</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TRANSPORT_LABELS).map(([key, label]) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => toggleTransport(key as TransportOption)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                          transport.includes(key as TransportOption)
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        <span>{TRANSPORT_ICONS[key as TransportOption]}</span>
                        {label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center">
                      <p className="text-xs">{TRANSPORT_SUGGESTIONS[key as TransportOption]}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Hover over options for suggestions
              </p>
            </div>

            {/* Row 5: Experiences */}
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-2 block">Experiences (select what interests you)</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EXPERIENCE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleExperience(key as ExperienceType)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                      experiences.includes(key as ExperienceType)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    <span>{EXPERIENCE_ICONS[key as ExperienceType]}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading || vacationTypes.length === 0 || experiences.length === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding places...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Render results
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-indigo-500" />
              Recommended Places for {city}{country ? `, ${country}` : ''}
            </h3>
            {summary && (
              <p className="text-sm text-slate-500 mt-1">{summary}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTransport}
              disabled={loadingTransport}
              className="bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
            >
              {loadingTransport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Bus className="w-4 h-4 mr-1" />
                  Transport Guide
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              New Search
            </Button>
          </div>
        </div>
      </div>

      {/* Grouped Results */}
      {Object.entries(groupedPlaces).map(([category, places]) => (
        <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Category Header */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-xl">{EXPERIENCE_ICONS[category as ExperienceType]}</span>
              {EXPERIENCE_LABELS[category as ExperienceType]}
              <span className="text-xs font-normal text-slate-500 ml-1">
                ({places.length} {places.length === 1 ? 'place' : 'places'})
              </span>
            </h4>
          </div>

          {/* Places List */}
          <div className="divide-y divide-slate-100">
            {places.map((place) => (
              <div key={place.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h5 className="font-semibold text-slate-800">{place.name}</h5>
                      <div className="flex items-center gap-2">
                        <a
                          href={place.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-xs"
                          title="Open in Google Maps"
                        >
                          <MapPin className="w-3 h-3" />
                          <span className="hidden sm:inline">Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href={place.imageSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:text-sky-700 flex items-center gap-1 text-xs"
                          title="View images on Google"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span className="hidden sm:inline">Images</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{place.address}</p>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">{place.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {place.estimatedDuration}
                      </span>
                      <span className="font-medium text-emerald-600">{place.priceLevel}</span>
                    </div>
                    {place.tips && (
                      <p className="text-xs text-amber-600 mt-2 italic">Tip: {place.tips}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddToItinerary(place)}
                    className="shrink-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Transport Recommendations Section */}
      {showTransport && transportOptions.length > 0 && (
        <div className="bg-white rounded-xl border border-sky-200 overflow-hidden">
          {/* Transport Header */}
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-3 border-b border-sky-200">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Bus className="w-5 h-5 text-sky-600" />
              Getting Around {city}
            </h4>
            {transportCard && (
              <div className="mt-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
                <strong className="font-semibold">Recommended Card:</strong> {transportCard}
              </div>
            )}
          </div>

          {/* General Tips */}
          {transportGeneralTips && (
            <div className="px-4 py-3 bg-blue-50 border-b border-sky-100">
              <h5 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Info className="w-4 h-4 text-blue-500" />
                General Tips
              </h5>
              <p className="text-sm text-slate-600 whitespace-pre-line">{transportGeneralTips}</p>
            </div>
          )}

          {/* Transport Options Grid */}
          <div className="grid md:grid-cols-2 gap-4 p-4">
            {transportOptions.map((option, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-lg p-4 hover:border-sky-300 hover:bg-sky-50/50 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-sky-600" />
                    <h5 className="font-semibold text-slate-800">{option.name}</h5>
                  </div>
                  <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded font-medium">
                    {option.type}
                  </span>
                </div>

                <p className="text-sm text-slate-600 mb-3">{option.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-slate-700 min-w-[80px]">Cost:</span>
                    <span className="text-emerald-600 font-medium">{option.costInfo}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-slate-700 min-w-[80px]">Hours:</span>
                    <span className="text-slate-600">{option.availability}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-slate-700 min-w-[80px]">Best For:</span>
                    <span className="text-slate-600">{option.bestFor}</span>
                  </div>

                  {option.tips && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-amber-600 italic">
                        <strong>Tip:</strong> {option.tips}
                      </p>
                    </div>
                  )}

                  {option.apps && option.apps.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <span className="text-xs font-medium text-slate-700">Recommended Apps: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {option.apps.map((app, appIndex) => (
                          <span
                            key={appIndex}
                            className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
