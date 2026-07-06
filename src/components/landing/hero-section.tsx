import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-900 dark:to-indigo-950" />

      {/* Decorative Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom duration-500">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">AI-Powered Travel Planning</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom duration-700 delay-100">
          Plan Your Dream<br />Adventures Together
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-200">
          The collaborative travel binder modern families trust.
          Create itineraries, organize documents, and share your journey, all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-white/90 px-8 py-6 text-base sm:text-lg shadow-xl min-h-[52px]"
            asChild
          >
            <Link href="/login?mode=signup">
              Start Planning Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-white text-white bg-white/10 px-8 py-6 text-base sm:text-lg min-h-[52px]"
            onClick={() => {
              const element = document.getElementById('features');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Explore Features
          </Button>
        </div>

        {/* Social Proof */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-white/80 animate-in fade-in slide-in-from-bottom duration-700 delay-400">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 border-2 border-white flex items-center justify-center text-white font-semibold text-sm"
              >
                {i === 1 && '😊'}
                {i === 2 && '👨'}
                {i === 3 && '👩'}
                {i === 4 && '🌍'}
              </div>
            ))}
          </div>
          <p className="text-sm">
            Trusted by <strong className="font-semibold">10,000+</strong> families
          </p>
        </div>
      </div>
    </section>
  );
}
