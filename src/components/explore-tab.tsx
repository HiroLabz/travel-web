'use client';

import { useState } from 'react';
import {
  getTopRatedPlacesAction,
  getTopReviewPlacesAction,
  getAirportTransferGuideAction
} from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import type { GenerateTopRatedPlacesOutput } from '@/ai/flows/generate-top-rated-places';
import type { GenerateTopReviewPlacesOutput } from '@/ai/flows/generate-top-review-places';
import type { GenerateAirportTransferGuideOutput } from '@/ai/flows/generate-airport-transfer-guide';
import {
  Loader2,
  MapPin,
  Star,
  MessageCircle,
  Plane,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Users,
  Lightbulb,
  Award,
  TrendingUp,
  Info,
  Navigation,
  Bus,
  Train,
  Car,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Destination {
  city: string;
  country?: string;
}

interface ExploreTabProps {
  tripId: string;
  destinations: Destination[]; // Array of destinations (excluding origin)
  days: number;
  travelGroup: string;
  budget: string;
  currency?: string;
  // For airport transfer, we need accommodation info
  accommodationAddress?: string;
}

type SectionType = 'topRated' | 'topReview' | 'airportTransfer';

type DataState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
  cached?: boolean;
};

export function ExploreTab({
  tripId,
  destinations,
  days,
  travelGroup,
  budget,
  currency,
  accommodationAddress,
}: ExploreTabProps) {
  const { user, subscription, refreshSubscription } = useAuth();
  const [selectedDestinationIndex, setSelectedDestinationIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionType>('topRated');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentDestination = destinations[selectedDestinationIndex] || destinations[0];
  const city = currentDestination?.city || '';
  const country = currentDestination?.country;
  const [topRatedData, setTopRatedData] = useState<DataState<GenerateTopRatedPlacesOutput>>({
    loading: false,
    error: null,
    data: null,
  });
  const [topReviewData, setTopReviewData] = useState<DataState<GenerateTopReviewPlacesOutput>>({
    loading: false,
    error: null,
    data: null,
  });
  const [airportTransferData, setAirportTransferData] = useState<DataState<GenerateAirportTransferGuideOutput>>({
    loading: false,
    error: null,
    data: null,
  });

  const fetchTopRatedPlaces = async (forceRefresh: boolean = false) => {
    setTopRatedData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await getTopRatedPlacesAction(
        city,
        country,
        days,
        travelGroup,
        budget,
        tripId,
        forceRefresh,
        user?.uid
      );
      if (result.creditError) {
        setShowUpgradeModal(true);
        setTopRatedData({ loading: false, error: result.error || 'Out of credits', data: null, cached: false });
        await refreshSubscription();
      } else if (result.error) {
        setTopRatedData({ loading: false, error: result.error, data: null, cached: false });
      } else if (result.data) {
        setTopRatedData({ loading: false, error: null, data: result.data, cached: result.cached });
        await refreshSubscription();
      }
    } catch (e) {
      setTopRatedData({ loading: false, error: 'Failed to load top rated places.', data: null, cached: false });
    }
  };

  const fetchTopReviewPlaces = async (forceRefresh: boolean = false) => {
    setTopReviewData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await getTopReviewPlacesAction(
        city,
        country,
        days,
        travelGroup,
        budget,
        tripId,
        forceRefresh,
        user?.uid
      );
      if (result.creditError) {
        setShowUpgradeModal(true);
        setTopReviewData({ loading: false, error: result.error || 'Out of credits', data: null, cached: false });
        await refreshSubscription();
      } else if (result.error) {
        setTopReviewData({ loading: false, error: result.error, data: null, cached: false });
      } else if (result.data) {
        setTopReviewData({ loading: false, error: null, data: result.data, cached: result.cached });
        await refreshSubscription();
      }
    } catch (e) {
      setTopReviewData({ loading: false, error: 'Failed to load top review places.', data: null, cached: false });
    }
  };

  const fetchAirportTransferGuide = async (forceRefresh: boolean = false) => {
    if (!accommodationAddress) {
      setAirportTransferData({
        loading: false,
        error: 'No accommodation address set. Please add your accommodation in the Itinerary tab.',
        data: null,
        cached: false,
      });
      return;
    }

    setAirportTransferData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await getAirportTransferGuideAction(
        city,
        country,
        accommodationAddress,
        travelGroup,
        budget,
        currency,
        tripId,
        forceRefresh,
        user?.uid
      );
      if (result.creditError) {
        setShowUpgradeModal(true);
        setAirportTransferData({ loading: false, error: result.error || 'Out of credits', data: null, cached: false });
        await refreshSubscription();
      } else if (result.error) {
        setAirportTransferData({ loading: false, error: result.error, data: null, cached: false });
      } else if (result.data) {
        setAirportTransferData({ loading: false, error: null, data: result.data, cached: result.cached });
        await refreshSubscription();
      }
    } catch (e) {
      setAirportTransferData({ loading: false, error: 'Failed to load airport transfer guide.', data: null, cached: false });
    }
  };

  // Reset all data when destination changes
  const handleDestinationChange = (index: number) => {
    setSelectedDestinationIndex(index);
    // Clear all cached data for the new destination
    setTopRatedData({ loading: false, error: null, data: null, cached: false });
    setTopReviewData({ loading: false, error: null, data: null, cached: false });
    setAirportTransferData({ loading: false, error: null, data: null, cached: false });
  };

  const handleSectionChange = (section: SectionType) => {
    setActiveSection(section);
    // Don't auto-fetch - user must click "Generate" button
  };

  // Handle no destinations case
  if (!destinations || destinations.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Destinations</h3>
          <p className="text-muted-foreground">
            Add destinations to your trip to explore recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <UpgradePromptModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      remainingCredits={subscription ? (subscription.creditsUsed >= 50 ? 0 : 50 - subscription.creditsUsed) : 0}
      planName={subscription?.plan || 'starter'}
    />
    <div className="space-y-6">
      {/* Destination Selector */}
      {destinations.length > 1 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-500" />
            Select Destination
          </h3>
          <div className="flex flex-wrap gap-2">
            {destinations.map((dest, index) => (
              <button
                key={`${dest.city}-${index}`}
                onClick={() => handleDestinationChange(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedDestinationIndex === index
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-muted text-foreground hover:bg-brand-subtle border border-border'
                }`}
              >
                {dest.city}
                {dest.country && `, ${dest.country}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSectionChange('topRated')}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeSection === 'topRated'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Award className="w-4 h-4" />
            Top Rated
            {topRatedData.loading && <Loader2 className="w-3 h-3 animate-spin" />}
          </button>
          <button
            onClick={() => handleSectionChange('topReview')}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeSection === 'topReview'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Most Popular
            {topReviewData.loading && <Loader2 className="w-3 h-3 animate-spin" />}
          </button>
          <button
            onClick={() => handleSectionChange('airportTransfer')}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeSection === 'airportTransfer'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Navigation className="w-4 h-4" />
            Airport Transfer
            {airportTransferData.loading && <Loader2 className="w-3 h-3 animate-spin" />}
          </button>
        </div>
      </div>

      {/* Top Rated Section */}
      {activeSection === 'topRated' && (
        <TopRatedSection
          data={topRatedData}
          onRefresh={() => fetchTopRatedPlaces(true)}
          onLoad={() => fetchTopRatedPlaces()}
          city={city}
        />
      )}

      {/* Top Review Section */}
      {activeSection === 'topReview' && (
        <TopReviewSection
          data={topReviewData}
          onRefresh={() => fetchTopReviewPlaces(true)}
          onLoad={() => fetchTopReviewPlaces()}
          city={city}
        />
      )}

      {/* Airport Transfer Section */}
      {activeSection === 'airportTransfer' && (
        <AirportTransferSection
          data={airportTransferData}
          onRefresh={() => fetchAirportTransferGuide(true)}
          onLoad={() => fetchAirportTransferGuide()}
        />
      )}
    </div>
    </>
  );
}

// Top Rated Places Section Component
function TopRatedSection({
  data,
  onRefresh,
  onLoad,
  city,
}: {
  data: DataState<GenerateTopRatedPlacesOutput>;
  onRefresh: () => void;
  onLoad: () => void;
  city: string;
}) {
  if (!data.data && !data.loading && !data.error) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Award className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Discover Top-Rated Attractions</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Get AI-curated recommendations for the highest-quality, award-winning attractions in {city}.
          </p>
          <Button onClick={onLoad} className="bg-brand-500 hover:bg-brand-600 rounded-lg">
            <Star className="w-4 h-4 mr-2" />
            Generate Recommendations
          </Button>
        </div>
      </div>
    );
  }

  if (data.loading && !data.data) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Finding Top-Rated Places</h3>
          <p className="text-muted-foreground text-sm">
            Searching for the highest-quality attractions in {city}...
          </p>
        </div>
      </div>
    );
  }

  if (data.error && !data.data) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 text-warning-accent mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Recommendations</h3>
          <p className="text-muted-foreground text-sm mb-4">{data.error}</p>
          <Button onClick={onLoad} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data.data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Award className="w-6 h-6 text-brand-500" />
                Top-Rated Places in {city}
              </h2>
              {data.cached && (
                <span className="text-xs font-medium text-success-accent bg-success-soft px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl">{data.data.summary}</p>
          </div>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={data.loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${data.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Places Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.data.places.map((place) => (
          <div key={place.id} className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">{place.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{place.address}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning-soft text-warning-accent rounded-md text-xs font-medium">
                    <Star className="w-3 h-3 fill-warning-accent text-warning-accent" />
                    {place.rating}
                  </span>
                  <span className="text-xs text-muted-foreground">{place.priceLevel}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{place.category}</span>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground text-sm mb-3">{place.description}</p>

            {place.accolades && (
              <div className="mb-3 p-2 bg-brand-subtle border border-brand-500/20 rounded-lg">
                <p className="text-xs font-medium text-brand-500 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {place.accolades}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Clock className="w-3 h-3" />
              <span>{place.estimatedDuration}</span>
            </div>

            {place.tips && (
              <div className="mb-3 p-2 bg-warning-soft border border-warning-accent/20 rounded-lg">
                <p className="text-xs text-warning-accent flex items-start gap-1">
                  <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{place.tips}</span>
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {place.googleMapsUrl && (
                <a
                  href={place.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-xs font-medium transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  View on Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {place.imageSearchUrl && (
                <a
                  href={place.imageSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Photos
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Top Review Places Section Component
function TopReviewSection({
  data,
  onRefresh,
  onLoad,
  city,
}: {
  data: DataState<GenerateTopReviewPlacesOutput>;
  onRefresh: () => void;
  onLoad: () => void;
  city: string;
}) {
  if (!data.data && !data.loading && !data.error) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Discover Most Popular Attractions</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Get AI-curated recommendations for the most-visited, highly-reviewed attractions in {city}.
          </p>
          <Button onClick={onLoad} className="bg-brand-500 hover:bg-brand-600 rounded-lg">
            <MessageCircle className="w-4 h-4 mr-2" />
            Generate Recommendations
          </Button>
        </div>
      </div>
    );
  }

  if (data.loading && !data.data) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Finding Most Popular Places</h3>
          <p className="text-muted-foreground text-sm">
            Searching for the most-reviewed attractions in {city}...
          </p>
        </div>
      </div>
    );
  }

  if (data.error && !data.data) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 text-warning-accent mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Recommendations</h3>
          <p className="text-muted-foreground text-sm mb-4">{data.error}</p>
          <Button onClick={onLoad} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data.data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-brand-500" />
                Most Popular Places in {city}
              </h2>
              {data.cached && (
                <span className="text-xs font-medium text-success-accent bg-success-soft px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl">{data.data.summary}</p>
          </div>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={data.loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${data.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Places Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.data.places.map((place) => (
          <div key={place.id} className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">{place.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{place.address}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-subtle text-brand-500 rounded-md text-xs font-medium">
                    <MessageCircle className="w-3 h-3" />
                    {place.reviewCount}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning-soft text-warning-accent rounded-md text-xs font-medium">
                    <Star className="w-3 h-3 fill-warning-accent text-warning-accent" />
                    {place.averageRating}
                  </span>
                  <span className="text-xs text-muted-foreground">{place.priceLevel}</span>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground text-sm mb-3">{place.description}</p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Clock className="w-3 h-3" />
              <span>{place.estimatedDuration}</span>
              <span>•</span>
              <span>{place.category}</span>
            </div>

            {place.tips && (
              <div className="mb-3 p-2 bg-warning-soft border border-warning-accent/20 rounded-lg">
                <p className="text-xs text-warning-accent flex items-start gap-1">
                  <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{place.tips}</span>
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {place.googleMapsUrl && (
                <a
                  href={place.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-xs font-medium transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  View on Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {place.imageSearchUrl && (
                <a
                  href={place.imageSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Photos
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Airport Transfer Section Component
function AirportTransferSection({
  data,
  onRefresh,
  onLoad,
}: {
  data: DataState<GenerateAirportTransferGuideOutput>;
  onRefresh: () => void;
  onLoad: () => void;
}) {
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

  const toggleOption = (optionId: string) => {
    const newExpanded = new Set(expandedOptions);
    if (newExpanded.has(optionId)) {
      newExpanded.delete(optionId);
    } else {
      newExpanded.add(optionId);
    }
    setExpandedOptions(newExpanded);
  };

  const getTransportIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'taxi':
        return <Car className="w-4 h-4" />;
      case 'shuttle':
        return <Bus className="w-4 h-4" />;
      case 'train':
      case 'metro':
        return <Train className="w-4 h-4" />;
      case 'bus':
        return <Bus className="w-4 h-4" />;
      case 'car_rental':
        return <Car className="w-4 h-4" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-success-soft text-success-accent border-success-accent/20';
      case 'moderate':
        return 'bg-warning-soft text-warning-accent border-warning-accent/20';
      case 'advanced':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  if (!data.data && !data.loading && !data.error) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Navigation className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Airport Transfer Guide</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Get detailed step-by-step instructions for getting from the airport to your accommodation.
          </p>
          <Button onClick={onLoad} className="bg-brand-500 hover:bg-brand-600 rounded-lg">
            <Plane className="w-4 h-4 mr-2" />
            Generate Transfer Guide
          </Button>
        </div>
      </div>
    );
  }

  if (data.loading && !data.data) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Generating Transfer Guide</h3>
          <p className="text-muted-foreground text-sm">
            Creating detailed transfer options and step-by-step instructions...
          </p>
        </div>
      </div>
    );
  }

  if (data.error && !data.data) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 text-warning-accent mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Generate Guide</h3>
          <p className="text-muted-foreground text-sm mb-4">{data.error}</p>
          {data.error.includes('accommodation') ? (
            <p className="text-xs text-muted-foreground">
              Add your accommodation details in the Itinerary tab first.
            </p>
          ) : (
            <Button onClick={onLoad} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!data.data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Plane className="w-6 h-6 text-brand-500" />
                {data.data.airportName} ({data.data.airportCode})
              </h2>
              {data.cached && (
                <span className="text-xs font-medium text-success-accent bg-success-soft px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">Complete transfer guide to your accommodation</p>
          </div>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={data.loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${data.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-success-soft border border-success-accent/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-success-accent mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Recommended for You
        </h3>
        <p className="text-sm text-success-accent">{data.data.recommendedOption}</p>
      </div>

      {/* Transfer Options */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Transfer Options</h3>
        {data.data.transferOptions.map((option) => (
          <div key={option.id} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <button
              onClick={() => toggleOption(option.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-brand-subtle rounded-lg">
                  {getTransportIcon(option.type)}
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-semibold text-foreground">{option.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {option.estimatedCost}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {option.estimatedDuration}
                    </span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getDifficultyColor(option.difficulty)}`}>
                      {option.difficulty}
                    </span>
                  </div>
                </div>
              </div>
              {expandedOptions.has(option.id) ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {expandedOptions.has(option.id) && (
              <div className="p-4 pt-0 space-y-4 border-t border-border">
                {/* Description */}
                <div>
                  <h5 className="text-sm font-semibold text-foreground mb-2">Step-by-Step Instructions</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{option.description}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Availability</span>
                    <p className="text-foreground font-medium">{option.availability}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Best For</span>
                    <p className="text-foreground font-medium">{option.bestFor}</p>
                  </div>
                </div>

                {/* Booking Info */}
                <div>
                  <h5 className="text-sm font-semibold text-foreground mb-1">How to Book</h5>
                  <p className="text-sm text-muted-foreground">{option.bookingInfo}</p>
                </div>

                {/* Tips */}
                {option.tips && option.tips.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-foreground mb-2">Practical Tips</h5>
                    <ul className="space-y-2">
                      {option.tips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-warning-accent mt-0.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* General Tips */}
      {data.data.generalTips && data.data.generalTips.length > 0 && (
        <div className="bg-info-soft border border-info-accent/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-info-accent mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            General Airport Tips
          </h3>
          <ul className="space-y-2">
            {data.data.generalTips.map((tip, idx) => (
              <li key={idx} className="text-sm text-info-accent flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Notes */}
      {data.data.importantNotes && data.data.importantNotes.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Important Safety Warnings
          </h3>
          <ul className="space-y-2">
            {data.data.importantNotes.map((note, idx) => (
              <li key={idx} className="text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
