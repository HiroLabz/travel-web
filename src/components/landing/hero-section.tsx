'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Track scroll progress across the tall section. The card sits in a sticky
  // wrapper, so this progress (0 → 1) plays out while the card is pinned.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Expand the inset card to a full-bleed hero. Everything finishes a little
  // before the pin releases (0 → 0.7) so the card holds "full screen" briefly
  // before the next section scrolls up.
  const paddingTop = useTransform(scrollYProgress, [0, 0.7], [80, 0]);
  const paddingX = useTransform(scrollYProgress, [0, 0.7], [28, 0]);
  const paddingBottom = useTransform(scrollYProgress, [0, 0.7], [28, 0]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.7], [40, 0]);
  const maxWidth = useTransform(scrollYProgress, [0, 0.7], [2000, 4000]);
  const imageScale = useTransform(scrollYProgress, [0, 0.7], [1, 1.08]);

  return (
    // Tall track: the extra height is the scroll distance the expansion plays over.
    <section ref={sectionRef} className="relative h-[155vh]">
      {/* Pinned viewport-height stage */}
      <motion.div
        style={{ paddingTop, paddingLeft: paddingX, paddingRight: paddingX, paddingBottom }}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {/* Inset hero card */}
        <motion.div
          style={{ borderRadius, maxWidth }}
          className="relative mx-auto h-full w-full overflow-hidden"
        >
          {/* Background photo */}
          <motion.img
            src="/assets/bg-image.jpg"
            alt="Coastal lake and mountains"
            style={{ scale: imageScale }}
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Diagonal teal gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(105deg, hsl(184 48% 14%) 0%, color-mix(in srgb, hsl(184 48% 14%) 82%, transparent) 38%, color-mix(in srgb, hsl(184 48% 14%) 30%, transparent) 62%, transparent 82%)',
            }}
          />

          {/* Text block */}
          <div className="absolute inset-0 flex flex-col justify-center px-[clamp(24px,5vw,72px)] max-w-full md:max-w-[60%]">
            <h1 className="m-0 text-white font-normal text-[clamp(40px,5.2vw,78px)] leading-[1.05] tracking-[-0.01em] duration-700">
              Plan Your{' '}<br />
              <strong className="font-bold">Dream Adventures</strong>
              <br />
              Together
            </h1>
            <p className="mt-7 text-white/80 text-[clamp(16px,1.15vw,19px)] leading-relaxed max-w-[35em] delay-100">
              The collaborative travel binder modern families trust. Create
              itineraries, organize documents, and share your journey, all in one
              place.
            </p>
            <div className="flex flex-row gap-4 mt-9 duration-700 delay-200">
              <Button
                size="lg"
                className="rounded-full bg-white  hover:bg-white/90 px-8 py-6 text-base font-semibold shadow-xl min-h-[52px]"
                asChild
              >
                <Link href="/login?mode=signup">Get Started</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-[1.5px] border-white/85 text-white bg-transparent hover:bg-white/10 hover:text-white px-8 py-6 text-base font-semibold min-h-[52px]"
                onClick={() => {
                  const element = document.getElementById('features');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
