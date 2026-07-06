import { FeatureCard } from './feature-card';
import { Sparkles, Map, FileText, Users } from 'lucide-react';

export function FeatureSection() {
  return (
    <section id="features" className="py-16 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4">
            Everything You Need to Plan Better Trips
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            From AI-powered itineraries to smart document management,
            WanderNest brings modern tools to family travel planning.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-12">
          <FeatureCard
            icon={Sparkles}
            title="Intelligent Trip Planning"
            description="Generate complete itineraries in seconds. Our AI analyzes your preferences, budget, and dates to create personalized day-by-day plans with activity suggestions and cost estimates."
            highlights={[
              'Day-by-day itineraries generated instantly',
              'Automatic cost estimation',
              'Personalized activity recommendations'
            ]}
          />

          <FeatureCard
            icon={Map}
            title="Complex Multi-City Journeys"
            description="Planning a European adventure or cross-country road trip? Track multiple destinations, routes, and connections all in one place with intelligent route planning and travel recommendations."
            highlights={[
              'Multi-destination trip support',
              'Route planning between cities',
              'Transportation recommendations'
            ]}
          />

          <FeatureCard
            icon={FileText}
            title="Smart Document Management"
            description="Your family's digital travel binder. Upload boarding passes, hotel confirmations, and tickets. Our AI automatically extracts key information and adds it to your itinerary."
            highlights={[
              'Auto-organize documents by category',
              'PDF analysis with AI extraction',
              'One-click access to all trip files'
            ]}
          />

          <FeatureCard
            icon={Users}
            title="Family-Friendly Collaboration"
            description="Travel planning is better together. Invite household members to view itineraries, access documents, and add their own notes. Everyone stays in sync with real-time updates."
            highlights={[
              'Shared household planning',
              'Real-time collaboration',
              'Role-based access control'
            ]}
          />
        </div>
      </div>
    </section>
  );
}
