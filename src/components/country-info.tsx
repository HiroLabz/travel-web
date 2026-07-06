'use client';

import { useState, useEffect } from 'react';
import { getCountryInfoAction } from '@/lib/actions';
import type { GenerateCountryInfoOutput } from '@/ai/flows/generate-country-info';
import { PLAN_LIMITS } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import {
  Loader2,
  Plane,
  ShieldCheck,
  Globe,
  Heart,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  Banknote,
  Languages,
  Phone,
  Plug,
  Clock,
  Syringe,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CountryInfoProps {
  countries: string[];
  originCountry?: string;
  tripId?: string;
}

type CountryData = {
  loading: boolean;
  error: string | null;
  info: GenerateCountryInfoOutput | null;
  cached?: boolean;
};

export function CountryInfo({ countries, originCountry, tripId }: CountryInfoProps) {
  const { user, subscription, refreshSubscription } = useAuth();

  // Remove duplicates and empty strings
  const uniqueCountries = [...new Set(countries.filter(c => c && c.trim()))];

  const [activeCountry, setActiveCountry] = useState(uniqueCountries[0] || '');
  const [countryData, setCountryData] = useState<Record<string, CountryData>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['immigration', 'cultural', 'practical'])
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchCountryInfo = async (country: string, forceRefresh: boolean = false) => {
    if (!country) return;

    setCountryData(prev => ({
      ...prev,
      [country]: { loading: true, error: null, info: prev[country]?.info || null, cached: prev[country]?.cached }
    }));

    try {
      const result = await getCountryInfoAction(country, originCountry, tripId, forceRefresh, user?.uid);

      // Refresh subscription after AI usage
      await refreshSubscription();

      if (result.creditError) {
        setShowUpgradeModal(true);
        setCountryData(prev => ({
          ...prev,
          [country]: { loading: false, error: null, info: null, cached: false }
        }));
        return;
      }

      if (result.error) {
        setCountryData(prev => ({
          ...prev,
          [country]: { loading: false, error: result.error!, info: null, cached: false }
        }));
      } else if (result.info) {
        setCountryData(prev => ({
          ...prev,
          [country]: { loading: false, error: null, info: result.info!, cached: result.cached }
        }));
      }
    } catch (e) {
      setCountryData(prev => ({
        ...prev,
        [country]: { loading: false, error: 'Failed to load country information.', info: null, cached: false }
      }));
    }
  };

  useEffect(() => {
    // Fetch info for active country if not already fetched
    if (activeCountry && !countryData[activeCountry]) {
      fetchCountryInfo(activeCountry);
    }
  }, [activeCountry]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const currentData = countryData[activeCountry];
  const loading = currentData?.loading ?? true;
  const error = currentData?.error;
  const info = currentData?.info;
  const cached = currentData?.cached;

  if (uniqueCountries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Globe className="w-10 h-10 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No Destination Countries
          </h3>
          <p className="text-slate-500 text-sm">
            Add countries to your destinations to see travel information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Country Tabs */}
      {uniqueCountries.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2">
          <div className="flex flex-wrap gap-2">
            {uniqueCountries.map((country) => (
              <button
                key={country}
                onClick={() => setActiveCountry(country)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeCountry === country
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-4 h-4" />
                {country}
                {countryData[country]?.loading && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !info && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Loading Travel Information
            </h3>
            <p className="text-slate-500 text-sm">
              Gathering immigration, customs, and cultural information for {activeCountry}...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !info && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Unable to Load Information
            </h3>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <Button onClick={() => fetchCountryInfo(activeCountry)} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Country Info Content */}
      {info && (
        <>
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-50 p-6 rounded-xl border border-blue-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Globe className="w-6 h-6 text-blue-600" />
                    {info.countryName}
                  </h2>
                  {cached && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Saved
                    </span>
                  )}
                </div>
                <p className="text-slate-600 max-w-2xl">{info.summary}</p>
              </div>
              <Button
                onClick={() => fetchCountryInfo(activeCountry, true)}
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-blue-600"
                title="Regenerate information"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Immigration & Entry */}
          <Section
            title="Immigration & Entry"
            icon={<Plane className="w-5 h-5 text-blue-500" />}
            expanded={expandedSections.has('immigration')}
            onToggle={() => toggleSection('immigration')}
          >
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Visa Information
                </h4>
                <p className="text-slate-600 text-sm">{info.immigration.visaInfo}</p>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-2">Entry Requirements</h4>
                <ul className="space-y-2">
                  {info.immigration.entryRequirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="text-xs font-medium text-slate-500 uppercase">Typical Stay Duration</span>
                <p className="text-slate-700 text-sm mt-1">{info.immigration.stayDuration}</p>
              </div>
            </div>
          </Section>

          {/* Customs */}
          <Section
            title="Customs & Restrictions"
            icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
            expanded={expandedSections.has('customs')}
            onToggle={() => toggleSection('customs')}
          >
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Prohibited Items
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {info.customs.prohibited.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-red-50 p-2 rounded">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Restricted Items
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {info.customs.restricted.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-amber-50 p-2 rounded">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="text-xs font-medium text-slate-500 uppercase">Duty-Free Allowance</span>
                <p className="text-slate-700 text-sm mt-1">{info.customs.dutyFree}</p>
              </div>
            </div>
          </Section>

          {/* Cultural Norms */}
          <Section
            title="Cultural Norms"
            icon={<Heart className="w-5 h-5 text-rose-500" />}
            expanded={expandedSections.has('cultural')}
            onToggle={() => toggleSection('cultural')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <span className="text-xs font-medium text-slate-500 uppercase">Greetings</span>
                  <p className="text-slate-700 text-sm mt-1">{info.cultural.greetings}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <span className="text-xs font-medium text-slate-500 uppercase">Dress Code</span>
                  <p className="text-slate-700 text-sm mt-1">{info.cultural.dressCode}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-3">Do&apos;s and Don&apos;ts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {info.cultural.doAndDont
                    .filter(item => item.type === 'do')
                    .map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-emerald-50 p-3 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-700">{item.text}</span>
                      </div>
                    ))}
                  {info.cultural.doAndDont
                    .filter(item => item.type === 'dont')
                    .map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-red-50 p-3 rounded-lg">
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-700">{item.text}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <span className="text-xs font-medium text-amber-700 uppercase">Tipping</span>
                <p className="text-slate-700 text-sm mt-1">{info.cultural.tipping}</p>
              </div>
            </div>
          </Section>

          {/* Practical Information */}
          <Section
            title="Practical Information"
            icon={<Lightbulb className="w-5 h-5 text-amber-500" />}
            expanded={expandedSections.has('practical')}
            onToggle={() => toggleSection('practical')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard
                icon={<Banknote className="w-4 h-4 text-emerald-500" />}
                label="Currency"
                value={info.practical.currency}
              />
              <InfoCard
                icon={<Languages className="w-4 h-4 text-blue-500" />}
                label="Language"
                value={info.practical.language}
              />
              <InfoCard
                icon={<Phone className="w-4 h-4 text-red-500" />}
                label="Emergency"
                value={info.practical.emergency}
              />
              <InfoCard
                icon={<Plug className="w-4 h-4 text-slate-500" />}
                label="Electricity"
                value={info.practical.electricity}
              />
              <InfoCard
                icon={<Clock className="w-4 h-4 text-blue-500" />}
                label="Timezone"
                value={info.practical.timezone}
              />
            </div>
          </Section>

          {/* Health Information */}
          <Section
            title="Health & Safety"
            icon={<Heart className="w-5 h-5 text-red-500" />}
            expanded={expandedSections.has('health')}
            onToggle={() => toggleSection('health')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Syringe className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-slate-500 uppercase">Vaccinations</span>
                  </div>
                  <p className="text-slate-700 text-sm">{info.health.vaccinations}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs font-medium text-slate-500 uppercase">Water Safety</span>
                  </div>
                  <p className="text-slate-700 text-sm">{info.health.waterSafety}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-2">Health Tips</h4>
                <ul className="space-y-2">
                  {info.health.healthTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          {/* Disclaimer */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              This information is AI-generated and may not be fully up-to-date.
              Always verify with official government sources before traveling.
            </p>
          </div>
        </>
      )}

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remainingCredits={subscription ? Math.max(0, PLAN_LIMITS[subscription.plan].monthlyCredits - subscription.creditsUsed) : 0}
        planName={subscription?.plan || 'starter'}
      />
    </div>
  );
}

// Helper Components
function Section({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-semibold text-slate-800">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-slate-500 uppercase">{label}</span>
      </div>
      <p className="text-slate-700 text-sm">{value}</p>
    </div>
  );
}
