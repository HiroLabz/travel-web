'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';

/**
 * transitions.dev — "Success check with blur and rotate".
 * Full-screen overlay that reveals a spring-animated check on success,
 * held briefly before navigation kicks in. Mirrors the login page overlay
 * so success feedback feels consistent across the auth → onboarding flow.
 */
export function SuccessOverlay({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, filter: 'blur(8px)', rotate: -25 }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-success-500 text-white shadow-lg"
      >
        <Check className="h-8 w-8" strokeWidth={3} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </motion.p>
    </motion.div>
  );
}
