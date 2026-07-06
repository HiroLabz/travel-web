// Client-safe Stripe configuration - no secret keys here

// Plan configuration
export const STRIPE_PLANS: Record<string, {
  name: string;
  price: number;
  credits: number;
  households: number;
  features: string[];
}> = {
  starter: {
    name: 'Starter',
    price: 9.99,
    credits: 50,
    households: 1,
    features: [
      '50 AI credits per month',
      '1 travel group',
      'Unlimited trips',
      'Document storage',
      'Expense tracking',
    ],
  },
  wanderer: {
    name: 'Wanderer',
    price: 14.99,
    credits: 1000,
    households: Infinity,
    features: [
      '1,000 AI credits per month',
      'Unlimited travel groups',
      'Unlimited trips',
      'Document storage',
      'Expense tracking',
      'Priority support',
    ],
  },
};

export type StripePlanId = 'starter' | 'wanderer';

// Trial period in days
export const TRIAL_PERIOD_DAYS = 7;
