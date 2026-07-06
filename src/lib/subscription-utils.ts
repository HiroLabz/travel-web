import type { SubscriptionInfo } from '@/types';
import { PLAN_LIMITS } from '@/types';

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if date a is after date b
 */
export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

/**
 * Create default subscription for new users
 */
export function createDefaultSubscription(): SubscriptionInfo {
  const now = new Date().toISOString();
  return {
    plan: 'starter',
    planStartDate: now,
    creditsUsed: 0,
    creditResetDate: addDays(new Date(), 30).toISOString(),
    updatedAt: now,
  };
}

/**
 * Get user's subscription info from their profile data
 * If no subscription exists, returns a default starter subscription
 */
export function getSubscriptionFromProfile(profileData: { subscription?: SubscriptionInfo } | null): SubscriptionInfo {
  if (!profileData?.subscription) {
    return createDefaultSubscription();
  }
  return profileData.subscription;
}

/**
 * Get remaining credits for a subscription
 */
export function getRemainingCredits(subscription: SubscriptionInfo): number {
  const planLimits = PLAN_LIMITS[subscription.plan];
  return Math.max(0, planLimits.monthlyCredits - subscription.creditsUsed);
}
