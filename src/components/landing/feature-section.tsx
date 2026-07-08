'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { Sparkles, Map, FileText, Users, type LucideIcon } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: 'Intelligent trip planning',
    description:
      'Generate complete itineraries in seconds. Our AI analyzes your preferences, budget, and dates to build personalized day-by-day plans with activity ideas and cost estimates.',
  },
  {
    icon: Map,
    title: 'Complex multi-city journeys',
    description:
      'Planning a European adventure or cross-country road trip? Track multiple destinations, routes, and connections in one place with intelligent route planning.',
  },
  {
    icon: FileText,
    title: 'Smart document management',
    description:
      "Your family's digital travel binder. Upload boarding passes, hotel confirmations, and tickets, and our AI extracts the key details and adds them to your itinerary.",
  },
  {
    icon: Users,
    title: 'Family-friendly collaboration',
    description:
      'Travel planning is better together. Invite household members to view itineraries, open documents, and add their own notes, all kept in sync with real-time updates.',
  },
];

export function FeatureSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();

  // Scroll-linked parallax: 0 as the section enters the bottom of the
  // viewport → 1 as it leaves the top. Mapped to the design's px drifts.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const glowY = useTransform(scrollYProgress, [0, 1], prefersReduced ? [0, 0] : [-90, 90]);
  const headerY = useTransform(scrollYProgress, [0, 1], prefersReduced ? [0, 0] : [34, -34]);

  // Staggered reveal, matching the design's IntersectionObserver choreography.
  const reveal = (delay: number) => ({
    initial: prefersReduced ? { opacity: 0 } : { opacity: 0, y: 30 },
    whileInView: prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.18, margin: '0px 0px -8% 0px' } as const,
    transition: { duration: 0.8, ease: EASE, delay: prefersReduced ? 0 : delay },
  });

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative overflow-hidden bg-muted/30 px-5 pt-[76px] pb-[84px] min-[720px]:px-10 min-[720px]:pt-[120px] min-[720px]:pb-[130px]"
    >
      {/* Parallax glow blob */}
      <motion.div
        aria-hidden
        style={{ y: glowY }}
        className="pointer-events-none absolute left-1/2 top-[-160px] -ml-[450px] h-[520px] w-[900px] max-w-[100vw]"
      >
        <motion.div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(circle at center, hsl(var(--primary) / 0.16), hsl(var(--primary) / 0) 62%)',
            filter: 'blur(10px)',
          }}
          animate={
            prefersReduced
              ? undefined
              : { x: ['0%', '4%', '0%'], y: ['0%', '-3%', '0%'], scale: [1, 1.08, 1] }
          }
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-none min-[720px]:max-w-[70vw]">
        {/* Header — left-aligned on mobile, centered from 720px up */}
        <motion.div
          {...reveal(0)}
          className="mb-10 max-w-full text-left min-[720px]:mx-auto min-[720px]:mb-[68px] min-[720px]:text-center"
        >
          <motion.div style={{ y: headerY }}>
            <h2 className="mb-5 text-[32px] min-[720px]:text-[54px] font-bold leading-[1.08] tracking-[-0.02em] text-foreground">
              Everything you need to <span className="text-primary">plan better trips</span>
            </h2>
            <p className="m-0 text-[16px] min-[720px]:text-[18px] leading-[1.55] text-muted-foreground">
              From AI-powered itineraries to smart document management, WanderNest brings modern
              tools to family travel planning.
            </p>
          </motion.div>
        </motion.div>

        {/* Feature panel — 1px gaps over the panel background render the dividers,
            so the seamless bordered look holds up as columns wrap on smaller screens. */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border min-[720px]:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...reveal(i * 0.11)}
              className="relative bg-card"
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <div className="group relative h-full px-6 pt-[30px] pb-[34px] min-[720px]:px-8 min-[720px]:pt-10 min-[720px]:pb-11 transition-[transform,box-shadow,background-color] duration-[450ms] ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2 hover:bg-primary/5">
      {/* Icon chip */}
      <div className="mb-6 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-primary/10 text-primary transition-[background-color,transform,color] duration-[450ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" strokeWidth={2} />
      </div>
      <h3 className="mb-3 text-md md:text-lg lg:text-xl xl:text-2xl font-bold leading-[1.3] tracking-[-0.01em] text-foreground">
        {title}
      </h3>
      <p className="m-0 text-xs md:text-sm lg:text-md xl:text-lg leading-[1.6] text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
