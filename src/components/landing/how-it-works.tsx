'use client';

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';
import { ImageIcon } from 'lucide-react';

const STEPS = [
  {
    title: 'Create Your Trip',
    description:
      'Choose your destinations, dates, and travel vibe. Tell us what kind of adventure you want.',
  },
  {
    title: 'Let AI Build Your Plan',
    description:
      'Get instant itineraries, route suggestions, and cost estimates powered by intelligent algorithms.',
  },
  {
    title: 'Collaborate & Refine',
    description:
      'Share with family, upload documents, and perfect your adventure together before you go.',
  },
];

// Spine geometry (px, within the 384-tall steps area) — dot centres + fill span.
const DOT_YS = [20, 148, 276];
const FIRST_Y = 20;
const LAST_Y = 276;
const SPAN = LAST_Y - FIRST_Y;

// Token-based colours for the SVG spine (attributes can't take Tailwind classes).
const C_FILL = 'hsl(var(--foreground))';
const C_TRACK = 'hsl(var(--border))';
const C_BG = 'hsl(var(--background))';
const C_MUTE = 'hsl(var(--muted-foreground))';

// On-scroll intro: children fade + rise in a stagger as the section enters view.
const introContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const introItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

// Mobile stepper completes a touch before the pinned stage unsticks.
const M_END = 0.9;

export function HowItWorks() {
  const trackRef = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const prefersReduced = useReducedMotion();
  const [p, setP] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });
  // Smooth spine fill (no re-render): drives the SVG line + moving head.
  const progressY = useTransform(scrollYProgress, [0, 1], [FIRST_Y, LAST_Y]);
  // Discrete step state — quantized so React only re-renders when it actually
  // changes (the smooth fill above is handled separately by the motion value).
  useMotionValueEvent(scrollYProgress, 'change', (v) => setP(Math.round(v * 200) / 200));

  // A dot is "reached" once the fill head passes it (small lead-in).
  const reached = (i: number) => FIRST_Y + p * SPAN + 3 >= DOT_YS[i];
  const active = p >= 0.995 ? 2 : p >= 0.5 ? 1 : 0;

  // Mobile: same scroll progress drives a horizontal fill (scaleX) + reached dots.
  const progressX = useTransform(scrollYProgress, [0, M_END], [0, 1]);
  const mReached = (i: number) => Math.min(1, p / M_END) + 0.03 >= i * 0.5;

  // Click a dot/row to scroll to that step (progress 0, 0.5, 1).
  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const sectionTopAbs = window.scrollY + rect.top;
    const targetP = Math.min(1, Math.max(0, i * 0.5));
    const to = sectionTopAbs + targetP * total;
    if (lenis) lenis.scrollTo(to, { duration: prefersReduced ? 0 : 0.65 });
    else window.scrollTo({ top: to, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  return (
    <section id="how-it-works" ref={trackRef} className="relative">
      {/* MOBILE: pinned tall track — horizontal stepper + image below, scroll-driven like desktop */}
      <div className="h-[240vh] lg:hidden">
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-6 py-12">
          <motion.div
            variants={introContainer}
            initial={prefersReduced ? false : 'hidden'}
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            <motion.h2
              variants={introItem}
              className="m-0 text-[clamp(30px,8vw,40px)] font-bold leading-[1.05] tracking-[-0.02em] text-foreground"
            >
              Start Planning in Minutes
            </motion.h2>
            <motion.p
              variants={introItem}
              className="mt-3 text-[15px] leading-[1.55] text-muted-foreground"
            >
              Three simple steps to your best trip yet.
            </motion.p>

            {/* Horizontal step-by-step — scroll-driven fill + dots, like the desktop spine */}
            <motion.div variants={introItem} className="relative mt-9">
              {/* connector track + live fill (spans dot centres: 1/6 → 5/6) */}
              <div className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-[16px] h-[2.5px]">
                <div className="absolute inset-0 rounded-full bg-border" />
                <motion.div
                  style={{ scaleX: progressX }}
                  className="absolute inset-0 origin-left rounded-full bg-foreground"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {STEPS.map((step, i) => {
                  const on = mReached(i);
                  return (
                    <div key={step.title} className="relative flex flex-col items-center">
                      <div
                        className={`relative z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full border-[2.5px] text-[14px] font-bold transition-colors duration-300 ${on
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-background text-muted-foreground'
                          }`}
                      >
                        {i + 1}
                      </div>
                      <div
                        className={`mt-3 text-[13px] font-bold leading-tight tracking-[-0.01em] transition-colors duration-300 ${on ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                      >
                        {step.title}
                      </div>
                      <p
                        className={`mt-1.5 text-[12px] leading-[1.5] transition-colors duration-300 ${on ? 'text-muted-foreground' : 'text-muted-foreground/60'
                          }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Image below the steps */}
            <motion.div
              variants={introItem}
              className="relative mt-9 flex aspect-[16/11] w-full items-center justify-center overflow-hidden rounded-[22px] border border-border"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--muted)))',
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, hsl(var(--background) / 0.5) 0 2px, transparent 2px 22px)',
                }}
              />
              <div className="relative flex flex-col items-center gap-3 text-muted-foreground">
                <ImageIcon className="h-14 w-14" strokeWidth={1.4} />
                <div className="text-[13px] font-bold uppercase tracking-[0.04em]">
                  Image placeholder
                </div>
                <div className="text-[13px] text-muted-foreground/80">
                  {STEPS[Math.min(2, Math.round(Math.min(1, p / M_END) * 2))].title}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* DESKTOP: tall track — the extra height is the scroll distance the steps play over. */}
      <div className="hidden h-[200vh] lg:block">
      {/* Pinned stage */}
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6 py-10 lg:px-[clamp(24px,5vw,72px)]">
        <motion.div
          className="grid w-full max-w-[1180px] grid-cols-1 items-center gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-[clamp(32px,5vw,72px)]"
          variants={introContainer}
          initial={prefersReduced ? false : 'hidden'}
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
        >
          {/* LEFT: copy + steps */}
          <div className="mx-auto w-full max-w-full lg:mx-0">

            <motion.h2
              variants={introItem}
              className="m-0 text-[clamp(36px,4.6vw,58px)] font-bold leading-[1.02] tracking-[-0.02em] text-foreground"
            >
              Start Planning in Minutes
            </motion.h2>

            <motion.p
              variants={introItem}
              className="mt-5 max-w-[34em] text-[16px] leading-[1.55] text-muted-foreground"
            >
              Three simple steps to your best trip yet.
            </motion.p>

            {/* Steps: SVG spine (track + live fill + dots) alongside content rows */}
            <motion.div variants={introItem} className="relative mt-[42px] h-[384px]">
              <svg
                width="40"
                height="384"
                viewBox="0 0 40 384"
                className="absolute left-0 top-0 overflow-visible"
              >
                {/* track */}
                <line
                  x1="20"
                  y1={FIRST_Y}
                  x2="20"
                  y2={LAST_Y}
                  stroke={C_TRACK}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* live progress fill */}
                <motion.line
                  x1="20"
                  y1={FIRST_Y}
                  x2="20"
                  y2={progressY}
                  stroke={C_FILL}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* dots */}
                {DOT_YS.map((cy, i) => {
                  const on = reached(i);
                  return (
                    <g key={i} className="cursor-pointer" onClick={() => goTo(i)}>
                      <circle
                        cx="20"
                        cy={cy}
                        r="13"
                        fill={on ? C_FILL : C_BG}
                        stroke={on ? C_FILL : C_TRACK}
                        strokeWidth="2.5"
                        style={{ transition: 'fill .35s ease, stroke .35s ease' }}
                      />
                      <text
                        x="20"
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="13"
                        fontWeight="700"
                        fill={on ? C_BG : C_MUTE}
                        style={{ transition: 'fill .35s ease' }}
                      >
                        {i + 1}
                      </text>
                    </g>
                  );
                })}
                {/* moving progress head */}
                <motion.circle cx="20" cy={progressY} r="4.5" fill={C_FILL} />
              </svg>

              {/* content rows */}
              <div className="absolute left-[60px] right-0 top-0">
                {STEPS.map((step, i) => {
                  const on = reached(i);
                  return (
                    <div
                      key={step.title}
                      onClick={() => goTo(i)}
                      className="box-border h-[128px] cursor-pointer pt-1"
                    >
                      <div
                        className={`text-[19px] font-bold leading-[1.5] tracking-[-0.01em] transition-colors duration-300 ${on ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                      >
                        0{i + 1}/ {step.title}
                      </div>
                      <p
                        className={`mt-1.5 max-w-[30em] text-[14px] leading-[1.6] transition-colors duration-300 ${on ? 'text-muted-foreground' : 'text-muted-foreground/60'
                          }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* RIGHT: image placeholder (hidden on mobile) */}
          <motion.div
            variants={introItem}
            className="relative hidden aspect-[21/20] max-h-[78vh] w-full items-center justify-center overflow-hidden rounded-[22px] border border-border lg:flex"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--muted)))',
            }}
          >
            {/* diagonal hatch texture */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, hsl(var(--background) / 0.5) 0 2px, transparent 2px 22px)',
              }}
            />
            <div className="relative flex flex-col items-center gap-3.5 text-muted-foreground">
              <ImageIcon className="h-[72px] w-[72px]" strokeWidth={1.4} />
              <div className="text-[14px] font-bold uppercase tracking-[0.04em]">
                Image placeholder
              </div>
              <div className="text-[13px] text-muted-foreground/80">{STEPS[active].title}</div>
            </div>
            {/* step counter pill */}
            <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-foreground/80 px-4 py-[9px] text-[13px] font-bold tracking-[0.02em] text-background backdrop-blur-sm">
              0{active + 1} / 03
            </div>
          </motion.div>
        </motion.div>
      </div>
      </div>
    </section>
  );
}
