'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { Check, Star } from 'lucide-react';
import { STRIPE_PLANS, TRIAL_PERIOD_DAYS } from '@/lib/stripe-config';

const EASE = [0.16, 1, 0.3, 1] as const;

const PLANS = [
  {
    key: 'starter',
    subtitle: 'Perfect for solo travelers',
    featIntro: 'Starter includes:',
    popular: false,
  },
  {
    key: 'wanderer',
    subtitle: 'Best for families & groups',
    featIntro: 'Everything in Starter, plus:',
    popular: true,
  },
] as const;

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const headerY = useTransform(scrollYProgress, [0, 1], prefersReduced ? [0, 0] : [34, -34]);

  // Staggered reveal, matching the feature section's choreography.
  const reveal = (delay: number) => ({
    initial: prefersReduced ? { opacity: 0 } : { opacity: 0, y: 30 },
    whileInView: prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.18, margin: '0px 0px -8% 0px' } as const,
    transition: { duration: 0.8, ease: EASE, delay: prefersReduced ? 0 : delay },
  });

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative overflow-hidden bg-background text-foreground"
    >


      <div className="relative mx-auto max-w-[940px] px-[clamp(16px,4vw,24px)] pt-[clamp(48px,9vw,104px)] pb-[60px]">
        {/* Header */}
        <motion.div {...reveal(0)} className="mb-[clamp(40px,4vw,40px)] text-center">
          <motion.div style={{ y: headerY }}>
            <h1 className="m-0 mb-4 text-[30px] sm:text-[clamp(34px,6vw,52px)] font-bold leading-[1.05] tracking-[-0.025em]">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto m-0 max-w-full text-[14px] sm:text-[clamp(15px,2.5vw,19px)] leading-[1.5] text-muted-foreground">
              Choose the plan that fits your travel style. Start with a free trial and upgrade
              anytime.
            </p>
          </motion.div>
        </motion.div>

        {/* Plan grid — always two columns, divided by a single border. */}
        <div className="grid grid-cols-2 border-y border-border">
          {PLANS.map(({ key, subtitle, featIntro, popular }, i) => {
            const plan = STRIPE_PLANS[key];
            return (
              <motion.div
                key={key}
                {...reveal(i * 0.11)}
                className={`flex flex-col px-[14px] py-[22px] sm:px-[34px] sm:py-[38px] ${popular ? 'border-l border-border' : ''
                  }`}
              >
                {/* Name + popular badge */}
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <h2 className="m-0 text-[18px] sm:text-[26px] font-bold tracking-[-0.02em]">
                    {plan.name}
                  </h2>
                  {popular && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-[7px] py-[2px] sm:px-[9px] sm:py-[3px] text-[9px] sm:text-[11px] font-bold text-primary">
                      <Star className="h-[11px] w-[11px] fill-current" />
                      Most Popular
                    </span>
                  )}
                </div>

                <p className="m-0 min-h-[30px] sm:min-h-[44px] text-[11px] sm:text-[15px] text-muted-foreground">
                  {subtitle}
                </p>

                {/* Price */}
                <div className="mt-[26px] mb-1.5 flex items-baseline gap-1.5">
                  <span className="text-[26px] sm:text-[38px] font-bold leading-none tracking-[-0.03em]">
                    ${plan.price}
                  </span>
                  <span className="text-[11px] sm:text-[14px] text-muted-foreground">/ month</span>
                </div>
                <p className="m-0 text-[11px] sm:text-[13px] font-bold text-green-500">
                  {TRIAL_PERIOD_DAYS}-day free trial
                </p>

                {/* CTA */}
                <Link
                  href="/login?mode=signup"
                  className={`mt-[26px] mb-[30px] block rounded-[11px] px-2 py-[9px] text-center text-[12px] font-bold transition-[transform,background-color,border-color] duration-200 hover:-translate-y-px sm:p-3 sm:text-[14px] ${popular
                    ? 'border border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-foreground/[0.12] bg-foreground/[0.03] text-foreground hover:border-foreground/20 hover:bg-foreground/[0.06]'
                    }`}
                >
                  Start free trial
                </Link>

                {/* Feature list */}
                <p className="m-0 mb-4 text-[11px] sm:text-[13px] text-muted-foreground">
                  {featIntro}
                </p>
                <ul className="m-0 flex list-none flex-col gap-[14px] p-0">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-[7px] text-[12px] text-foreground/90 sm:gap-2.5 sm:text-[14px]"
                    >
                      <span className="inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center sm:h-[17px] sm:w-[17px]">
                        <Check
                          className={`h-3.5 w-3.5 ${popular ? 'text-primary' : 'text-green-500'}`}
                          strokeWidth={3}
                        />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          {...reveal(0.2)}
          className="mt-[30px] m-0 text-center text-[13px] text-muted-foreground"
        >
          No credit card required to start. Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
}
