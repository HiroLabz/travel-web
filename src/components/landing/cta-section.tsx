import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 md:mb-6">
          Ready to Start Your Next Adventure?
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 md:mb-12">
          Join thousands of families planning smarter, stress-free trips with WanderNest
        </p>
        <Button
          size="lg"
          className="w-full sm:w-auto bg-white text-blue-600 hover:bg-white/90 px-8 sm:px-10 py-6 text-base sm:text-lg shadow-2xl min-h-[52px]"
          asChild
        >
          <Link href="/login?mode=signup">
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
