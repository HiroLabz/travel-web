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

const WIZARD_STEP_TITLES = ['Vacation type', 'Group & budget', 'Dining', 'Transport', 'Experiences'];

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

  // Wizard step (0-indexed, one preference category per step)
  const [wizardStep, setWizardStep] = useState(0);

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
    setWizardStep(0);
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
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-brand-500" />
              AI Trip Planner
            </h3>
            <span className="text-xs font-medium text-muted-foreground">
              Step {wizardStep + 1} of {WIZARD_STEP_TITLES.length}: {WIZARD_STEP_TITLES[wizardStep]}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-6">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${((wizardStep + 1) / WIZARD_STEP_TITLES.length) * 100}%` }}
            />
          </div>

          <div className="space-y-5 min-h-[140px]">
            {/* Step 1: Vacation Types - Multi-select */}
            {wizardStep === 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">What type of vacation are you planning? (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(VACATION_TYPE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleVacationType(key as VacationType)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        vacationTypes.includes(key as VacationType)
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-card border border-border text-muted-foreground hover:border-brand-300 hover:bg-brand-subtle'
                      }`}
                    >
                      <span className="text-lg">{VACATION_TYPE_ICONS[key as VacationType]}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Travel Group & Budget */}
            {wizardStep === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Travel Group</Label>
                  <Select value={travelGroup} onValueChange={(v) => setTravelGroup(v as TravelGroup)}>
                    <SelectTrigger className="bg-card">
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
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Accommodation Budget</Label>
                  <Select value={budget} onValueChange={(v) => setBudget(v as BudgetLevel)}>
                    <SelectTrigger className="bg-card">
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
            )}

            {/* Step 3: Dining */}
            {wizardStep === 2 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Dining Preference</Label>
                <Select value={dining} onValueChange={(v) => setDining(v as DiningPreference)}>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DINING_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 4: Transport Options with Suggestions */}
            {wizardStep === 3 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Available Transport</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TRANSPORT_LABELS).map(([key, label]) => (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => toggleTransport(key as TransportOption)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                            transport.includes(key as TransportOption)
                              ? 'bg-brand-500 text-white shadow-sm'
                              : 'bg-card border border-border text-muted-foreground hover:border-brand-300 hover:bg-brand-subtle'
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
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Hover over options for suggestions
                </p>
              </div>
            )}

            {/* Step 5: Experiences */}
            {wizardStep === 4 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Experiences (select what interests you)</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(EXPERIENCE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleExperience(key as ExperienceType)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                        experiences.includes(key as ExperienceType)
                          ? 'bg-brand-500 text-white'
                          : 'bg-card border border-border text-muted-foreground hover:border-brand-300'
                      }`}
                    >
                      <span>{EXPERIENCE_ICONS[key as ExperienceType]}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Wizard Navigation */}
          <div className="flex items-center gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
              disabled={wizardStep === 0}
              className="border-border text-muted-foreground hover:bg-muted rounded-lg"
            >
              Back
            </Button>

            {wizardStep < WIZARD_STEP_TITLES.length - 1 ? (
              <Button
                type="button"
                onClick={() => setWizardStep((s) => Math.min(WIZARD_STEP_TITLES.length - 1, s + 1))}
                disabled={wizardStep === 0 && vacationTypes.length === 0}
                className="flex-1 bg-brand-500 hover:bg-brand-600 rounded-lg"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={loading || vacationTypes.length === 0 || experiences.length === 0}
                className="flex-1 bg-brand-500 hover:bg-brand-600 rounded-lg text-white"
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
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Render results
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-brand-500" />
              Recommended Places for {city}{country ? `, ${country}` : ''}
            </h3>
            {summary && (
              <p className="text-sm text-muted-foreground mt-1">{summary}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTransport}
              disabled={loadingTransport}
              className="bg-brand-subtle border-brand-500/20 text-brand-500 hover:opacity-80"
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
        <div key={category} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Category Header */}
          <div className="bg-muted px-4 py-3 border-b border-border">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <span className="text-xl">{EXPERIENCE_ICONS[category as ExperienceType]}</span>
              {EXPERIENCE_LABELS[category as ExperienceType]}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({places.length} {places.length === 1 ? 'place' : 'places'})
              </span>
            </h4>
          </div>

          {/* Places List */}
          <div className="divide-y divide-border">
            {places.map((place) => (
              <div key={place.id} className="p-4 hover:bg-muted transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h5 className="font-semibold text-foreground">{place.name}</h5>
                      <div className="flex items-center gap-2">
                        <a
                          href={place.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-500 hover:text-brand-600 flex items-center gap-1 text-xs"
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
                          className="text-brand-500 hover:text-brand-600 flex items-center gap-1 text-xs"
                          title="View images on Google"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span className="hidden sm:inline">Images</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{place.address}</p>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{place.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {place.estimatedDuration}
                      </span>
                      <span className="font-medium text-success-accent">{place.priceLevel}</span>
                    </div>
                    {place.tips && (
                      <p className="text-xs text-warning-accent mt-2 italic">Tip: {place.tips}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddToItinerary(place)}
                    className="shrink-0 text-brand-500 border-brand-500/30 hover:bg-brand-subtle hover:border-brand-500/50"
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
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Transport Header */}
          <div className="bg-brand-subtle px-4 py-3 border-b border-border">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <Bus className="w-5 h-5 text-brand-500" />
              Getting Around {city}
            </h4>
            {transportCard && (
              <div className="mt-2 text-sm bg-warning-soft border border-warning-accent/20 rounded-lg px-3 py-2 text-warning-accent">
                <strong className="font-semibold">Recommended Card:</strong> {transportCard}
              </div>
            )}
          </div>

          {/* General Tips */}
          {transportGeneralTips && (
            <div className="px-4 py-3 bg-info-soft border-b border-border">
              <h5 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                <Info className="w-4 h-4 text-info-accent" />
                General Tips
              </h5>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{transportGeneralTips}</p>
            </div>
          )}

          {/* Transport Options Grid */}
          <div className="grid md:grid-cols-2 gap-4 p-4">
            {transportOptions.map((option, index) => (
              <div
                key={index}
                className="border border-border rounded-lg p-4 hover:border-brand-300 hover:bg-brand-subtle/50 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-brand-500" />
                    <h5 className="font-semibold text-foreground">{option.name}</h5>
                  </div>
                  <span className="text-xs bg-brand-subtle text-brand-500 px-2 py-1 rounded font-medium">
                    {option.type}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{option.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground min-w-[80px]">Cost:</span>
                    <span className="text-success-accent font-medium">{option.costInfo}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground min-w-[80px]">Hours:</span>
                    <span className="text-muted-foreground">{option.availability}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground min-w-[80px]">Best For:</span>
                    <span className="text-muted-foreground">{option.bestFor}</span>
                  </div>

                  {option.tips && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-warning-accent italic">
                        <strong>Tip:</strong> {option.tips}
                      </p>
                    </div>
                  )}

                  {option.apps && option.apps.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-xs font-medium text-foreground">Recommended Apps: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {option.apps.map((app, appIndex) => (
                          <span
                            key={appIndex}
                            className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
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
