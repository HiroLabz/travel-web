'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Transitions.dev — page side-by-side, adapted for App Router.
 *
 * A `template.tsx` is re-instantiated on every navigation (unlike `layout.tsx`),
 * so the incoming step remounts with `data-entered="false"` and animates to
 * "true" on the next frame — sliding, fading and un-blurring into place.
 *
 * Step 1 (plan) enters from the left, step 2 (group) from the right, matching
 * the transitions.dev direction convention. See `.t-page-enter` in globals.css.
 */
export default function OnboardingTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageId = pathname?.includes('/onboarding/group') ? 2 : 1;
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setEntered(false);
    // Double rAF: let the browser paint the initial (offset/blurred) state
    // before flipping to entered so the transition actually runs.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pathname]);

  return (
    <div className="t-page-enter" data-page-id={pageId} data-entered={entered ? 'true' : 'false'}>
      {children}
    </div>
  );
}
