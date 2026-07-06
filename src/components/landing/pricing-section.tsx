'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { STRIPE_PLANS, TRIAL_PERIOD_DAYS } from '@/lib/stripe-config';
import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function PricingSection() {
  const plans = [
    { key: 'starter', popular: false },
    { key: 'wanderer', popular: true },
  ] as const;

  return (
    <section id="pricing" className="py-20 md:py-32 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your travel style. Start with a free trial and upgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {plans.map(({ key, popular }) => {
            const plan = STRIPE_PLANS[key];
            return (
              <Card
                key={key}
                className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-xl ${
                  popular
                    ? 'border-2 border-primary shadow-lg scale-100 md:scale-105'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Popular Badge */}
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-full shadow-lg">
                      <Sparkles className="w-4 h-4" />
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className={`text-center pb-4 ${popular ? 'pt-8' : 'pt-6'}`}>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    {key === 'starter' ? 'Perfect for solo travelers' : 'Best for families & groups'}
                  </CardDescription>

                  {/* Price */}
                  <div className="mt-4">
                    <span className="text-4xl md:text-5xl font-bold">${plan.price}</span>
                    <span className="text-slate-500 dark:text-slate-400">/month</span>
                  </div>

                  {/* Trial Badge */}
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-full">
                      {TRIAL_PERIOD_DAYS}-day free trial
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  {/* Features List */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    size="lg"
                    className={`w-full min-h-[48px] text-base font-semibold ${
                      popular
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900'
                    }`}
                    asChild
                  >
                    <Link href="/login?mode=signup">
                      Start Free Trial
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom Note */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
          No credit card required to start. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
