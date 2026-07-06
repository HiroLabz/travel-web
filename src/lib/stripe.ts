import 'server-only';
import Stripe from 'stripe';

// Server-side Stripe instance - only import this file in API routes
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
  typescript: true,
});

// Price IDs from environment
export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  wanderer: process.env.STRIPE_PRICE_WANDERER!,
};

// Re-export config for convenience in API routes
export { STRIPE_PLANS, TRIAL_PERIOD_DAYS, type StripePlanId } from './stripe-config';
