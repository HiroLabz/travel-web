'use client';

import { Logo } from '@/components/logo';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

// On-scroll entrance: brand, link columns, and bottom bar fade + rise in a stagger.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

export function LandingFooter() {
  const prefersReduced = useReducedMotion();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const linkClass =
    'text-sm text-muted-foreground transition-colors hover:text-foreground';

  return (
    // Blends with the page background — no card.
    <footer className="bg-background text-foreground">
      <motion.div
        variants={container}
        initial={prefersReduced ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        {/* Main content */}
        <div className="flex flex-wrap justify-between gap-12 py-14">
          {/* Brand */}
          <motion.div variants={item} className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              The collaborative travel binder modern families trust.
              Plan better trips together.
            </p>
          </motion.div>

          {/* Link columns */}
          <motion.div variants={item} className="flex flex-wrap gap-x-16 gap-y-10">
            <nav className="flex flex-col gap-3.5">
              <div className="text-[13px] font-medium text-muted-foreground/70">Product</div>
              <button onClick={() => scrollToSection('features')} className={`${linkClass} text-left`}>
                Features
              </button>
              <button onClick={() => scrollToSection('pricing')} className={`${linkClass} text-left`}>
                Pricing
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className={`${linkClass} text-left`}>
                How it works
              </button>
            </nav>

            <nav className="flex flex-col gap-3.5">
              <div className="text-[13px] font-medium text-muted-foreground/70">Legal</div>
              <Link href="/legal/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className={linkClass}>
                Terms of Service
              </Link>
              <Link href="/legal/contact" className={linkClass}>
                Contact
              </Link>
            </nav>

            <nav className="flex flex-col gap-3.5">
              <div className="text-[13px] font-medium text-muted-foreground/70">Support</div>
              <Link href="/login" className={linkClass}>
                Sign in
              </Link>
              <a href="mailto:hello@wandernest.app" className={linkClass}>
                hello@wandernest.app
              </a>
            </nav>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div
          variants={item}
          className="border-t border-border py-6"
        >
          <span className="text-[13px] text-muted-foreground">
            © {new Date().getFullYear()} WanderNest. All rights reserved.
          </span>
        </motion.div>
      </motion.div>
    </footer>
  );
}
