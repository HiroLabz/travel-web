'use client';

import { LandingNav } from './landing/landing-nav';
import { HeroSection } from './landing/hero-section';
import { FeatureSection } from './landing/feature-section';
import { PricingSection } from './landing/pricing-section';
import { HowItWorks } from './landing/how-it-works';
import { CTASection } from './landing/cta-section';
import { LandingFooter } from './landing/landing-footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main>
        <HeroSection />
        <FeatureSection />
        <PricingSection />
        <HowItWorks />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
