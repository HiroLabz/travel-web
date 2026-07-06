import { Plus, Sparkles, Users } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Plus,
      title: 'Create Your Trip',
      description: 'Choose your destinations, dates, and travel vibe. Tell us what kind of adventure you want.'
    },
    {
      icon: Sparkles,
      title: 'Let AI Build Your Plan',
      description: 'Get instant itineraries, route suggestions, and cost estimates powered by intelligent algorithms.'
    },
    {
      icon: Users,
      title: 'Collaborate & Refine',
      description: 'Share with family, upload documents, and perfect your adventure together before you go.'
    }
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4">
            Start Planning in Minutes
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400">
            Three simple steps to your best trip yet
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center px-4 md:px-0">
              {/* Step Number */}
              <div className="absolute -top-2 left-4 md:left-1/2 md:-translate-x-1/2 md:-top-4 lg:-left-4 lg:translate-x-0 w-10 h-10 md:w-12 md:h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-base md:text-lg z-10">
                {index + 1}
              </div>

              {/* Icon */}
              <div className="mb-4 md:mb-6 flex justify-center pt-6 md:pt-0">
                <div className="p-3 md:p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                  <step.icon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">{step.title}</h3>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">{step.description}</p>

              {/* Connector Line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
