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
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <MapPin className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Destinations</h3>
          <p className="text-slate-500">
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
        <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl border border-blue-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Select Destination
          </h3>
          <div className="flex flex-wrap gap-2">
            {destinations.map((dest, index) => (
              <button
                key={`${dest.city}-${index}`}
                onClick={() => handleDestinationChange(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedDestinationIndex === index
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSectionChange('topRated')}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeSection === 'topRated'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Award className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Discover Top-Rated Attractions</h3>
          <p className="text-slate-500 mb-6 max-w-md">
            Get AI-curated recommendations for the highest-quality, award-winning attractions in {city}.
          </p>
          <Button onClick={onLoad} className="bg-blue-600 hover:bg-blue-700">
            <Star className="w-4 h-4 mr-2" />
            Generate Recommendations
          </Button>
        </div>
      </div>
    );
  }

  if (data.loading && !data.data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Finding Top-Rated Places</h3>
          <p className="text-slate-500 text-sm">
            Searching for the highest-quality attractions in {city}...
          </p>
        </div>
      </div>
    );
  }

  if (data.error && !data.data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Unable to Load Recommendations</h3>
          <p className="text-slate-500 text-sm mb-4">{data.error}</p>
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
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-6 h-6 text-blue-600" />
                Top-Rated Places in {city}
              </h2>
              {data.cached && (
                <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-slate-600 max-w-2xl">{data.data.summary}</p>
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
          <div key={place.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{place.name}</h3>
                <p className="text-sm text-slate-500 mb-2">{place.address}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {place.rating}
                  </span>
                  <span className="text-xs text-slate-500">{place.priceLevel}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500">{place.category}</span>
                </div>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-3">{place.description}</p>

            {place.accolades && (
              <div className="mb-3 p-2 bg-purple-50 border border-purple-100 rounded-lg">
                <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {place.accolades}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
              <Clock className="w-3 h-3" />
              <span>{place.estimatedDuration}</span>
            </div>

            {place.tips && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-700 flex items-start gap-1">
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
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
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
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Discover Most Popular Attractions</h3>
          <p className="text-slate-500 mb-6 max-w-md">
            Get AI-curated recommendations for the most-visited, highly-reviewed attractions in {city}.
          </p>
          <Button onClick={onLoad} className="bg-blue-600 hover:bg-blue-700">
            <MessageCircle className="w-4 h-4 mr-2" />
            Generate Recommendations
          </Button>
        </div>
      </div>
    );
  }

  if (data.loading && !data.data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Finding Most Popular Places</h3>
          <p className="text-slate-500 text-sm">
            Searching for the most-reviewed attractions in {city}...
          </p>
        </div>
      </div>
    );
  }

  if (data.error && !data.data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Unable to Load Recommendations</h3>
          <p className="text-slate-500 text-sm mb-4">{data.error}</p>
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
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Most Popular Places in {city}
              </h2>
              {data.cached && (
                <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-slate-600 max-w-2xl">{data.data.summary}</p>
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
          <div key={place.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{place.name}</h3>
                <p className="text-sm text-slate-500 mb-2">{place.address}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                    <MessageCircle className="w-3 h-3" />
                    {place.reviewCount}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {place.averageRating}
                  </span>
                  <span className="text-xs text-slate-500">{place.priceLevel}</span>
                </div>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-3">{place.description}</p>

            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
              <Clock className="w-3 h-3" />
              <span>{place.estimatedDuration}</span>
              <span>•</span>
              <span>{place.category}</span>
            </div>

            {place.tips && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-700 flex items-start gap-1">
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
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
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
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
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
        return 'bg-green-50 text-green-700 border-green-200';
      case 'moderate':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'advanced':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (!data.data && !data.loading && !data.error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Navigation className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Airport Transfer Guide</h3>
          <p className="text-slate-500 mb-6 max-w-md">
            Get detailed step-by-step instructions for getting from the airport to your accommodation.
          </p>
          <Button onClick={onLoad} className="bg-blue-600 hover:bg-blue-700">
            <Plane className="w-4 h-4 mr-2" />
            Generate Transfer Guide
          </Button>
        </div>
      </div>
    );
  }

  if (data.loading && !data.data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Generating Transfer Guide</h3>
          <p className="text-slate-500 text-sm">
            Creating detailed transfer options and step-by-step instructions...
          </p>
        </div>
      </div>
    );
  }

  if (data.error && !data.data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Unable to Generate Guide</h3>
          <p className="text-slate-500 text-sm mb-4">{data.error}</p>
          {data.error.includes('accommodation') ? (
            <p className="text-xs text-slate-500">
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
      <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-6 rounded-xl border border-blue-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Plane className="w-6 h-6 text-blue-600" />
                {data.data.airportName} ({data.data.airportCode})
              </h2>
              {data.cached && (
                <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-slate-600 text-sm">Complete transfer guide to your accommodation</p>
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
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Recommended for You
        </h3>
        <p className="text-sm text-emerald-700">{data.data.recommendedOption}</p>
      </div>

      {/* Transfer Options */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-800">Transfer Options</h3>
        {data.data.transferOptions.map((option) => (
          <div key={option.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              onClick={() => toggleOption(option.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {getTransportIcon(option.type)}
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-semibold text-slate-800">{option.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
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
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {expandedOptions.has(option.id) && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-100">
                {/* Description */}
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Step-by-Step Instructions</h5>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{option.description}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">Availability</span>
                    <p className="text-slate-800 font-medium">{option.availability}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Best For</span>
                    <p className="text-slate-800 font-medium">{option.bestFor}</p>
                  </div>
                </div>

                {/* Booking Info */}
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-1">How to Book</h5>
                  <p className="text-sm text-slate-600">{option.bookingInfo}</p>
                </div>

                {/* Tips */}
                {option.tips && option.tips.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Practical Tips</h5>
                    <ul className="space-y-2">
                      {option.tips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            General Airport Tips
          </h3>
          <ul className="space-y-2">
            {data.data.generalTips.map((tip, idx) => (
              <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Notes */}
      {data.data.importantNotes && data.data.importantNotes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Important Safety Warnings
          </h3>
          <ul className="space-y-2">
            {data.data.importantNotes.map((note, idx) => (
              <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
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
