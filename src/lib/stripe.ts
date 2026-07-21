import 'server-only';
import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/**
 * Returns a lazily-instantiated server-side Stripe client.
 *
 * Constructing the client on first use (rather than at module load) keeps
 * `next build` page-data collection from requiring STRIPE_SECRET_KEY, so the
 * production image can be built without the secret and read it at runtime.
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return stripeClient;
}

// Price IDs from environment
export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  wanderer: process.env.STRIPE_PRICE_WANDERER!,
};

// Re-export config for convenience in API routes
export { STRIPE_PLANS, TRIAL_PERIOD_DAYS, type StripePlanId } from './stripe-config';
