'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SubscriptionInfo, AIFeature, SubscriptionPlan } from '@/types';
import { PLAN_LIMITS, AI_CREDIT_COST } from '@/types';
import {
  addDays,
  isAfter,
  createDefaultSubscription,
  getSubscriptionFromProfile,
} from './subscription-utils';

/**
 * Check if credit reset is due and return updated subscription if needed
 */
export async function checkAndResetCreditsIfNeeded(
  userId: string,
  subscription: SubscriptionInfo
): Promise<SubscriptionInfo> {
  const now = new Date();
  const resetDate = new Date(subscription.creditResetDate);

  if (isAfter(now, resetDate)) {
    // Reset credits
    const newResetDate = addDays(now, 30).toISOString();
    const updatedSubscription: SubscriptionInfo = {
      ...subscription,
      creditsUsed: 0,
      creditResetDate: newResetDate,
      updatedAt: now.toISOString(),
    };

    if (db) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { subscription: updatedSubscription });
    }

    return updatedSubscription;
  }

  return subscription;
}

/**
 * Check if user can use AI feature (has enough credits)
 */
export async function canUseAIFeature(
  userId: string,
  feature: AIFeature
): Promise<{ allowed: boolean; remainingCredits: number; requiredCredits: number }> {
  if (!db) {
    return { allowed: false, remainingCredits: 0, requiredCredits: AI_CREDIT_COST[feature] };
  }

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { allowed: false, remainingCredits: 0, requiredCredits: AI_CREDIT_COST[feature] };
  }

  const userData = userSnap.data();
  let subscription = getSubscriptionFromProfile(userData);

  // Check and reset credits if needed
  subscription = await checkAndResetCreditsIfNeeded(userId, subscription);

  const planLimits = PLAN_LIMITS[subscription.plan];
  const remainingCredits = planLimits.monthlyCredits - subscription.creditsUsed;
  const requiredCredits = AI_CREDIT_COST[feature];

  return {
    allowed: remainingCredits >= requiredCredits,
    remainingCredits,
    requiredCredits,
  };
}

/**
 * Deduct credits for using an AI feature
 */
export async function deductCredits(
  userId: string,
  feature: AIFeature
): Promise<{ success: boolean; remainingCredits: number; error?: string }> {
  if (!db) {
    return { success: false, remainingCredits: 0, error: 'Database not initialized' };
  }

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { success: false, remainingCredits: 0, error: 'User not found' };
  }

  const userData = userSnap.data();
  let subscription = getSubscriptionFromProfile(userData);

  // Check and reset credits if needed
  subscription = await checkAndResetCreditsIfNeeded(userId, subscription);

  const planLimits = PLAN_LIMITS[subscription.plan];
  const remainingCredits = planLimits.monthlyCredits - subscription.creditsUsed;
  const requiredCredits = AI_CREDIT_COST[feature];

  if (remainingCredits < requiredCredits) {
    return {
      success: false,
      remainingCredits,
      error: 'Insufficient credits',
    };
  }

  const newCreditsUsed = subscription.creditsUsed + requiredCredits;

  await updateDoc(userRef, {
    'subscription.creditsUsed': newCreditsUsed,
    'subscription.updatedAt': new Date().toISOString(),
  });

  return {
    success: true,
    remainingCredits: planLimits.monthlyCredits - newCreditsUsed,
  };
}

/**
 * Check if user can create more households
 */
export async function canCreateHousehold(
  userId: string,
  currentHouseholdCount: number
): Promise<{ allowed: boolean; maxHouseholds: number; currentCount: number; plan: SubscriptionPlan }> {
  if (!db) {
    return { allowed: false, maxHouseholds: 1, currentCount: currentHouseholdCount, plan: 'starter' };
  }

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { allowed: false, maxHouseholds: 1, currentCount: currentHouseholdCount, plan: 'starter' };
  }

  const userData = userSnap.data();
  const subscription = getSubscriptionFromProfile(userData);
  const planLimits = PLAN_LIMITS[subscription.plan];

  return {
    allowed: currentHouseholdCount < planLimits.maxHouseholds,
    maxHouseholds: planLimits.maxHouseholds,
    currentCount: currentHouseholdCount,
    plan: subscription.plan,
  };
}

/**
 * Initialize subscription for a user if they don't have one
 * Called when creating new users or upgrading existing users without subscription
 */
export async function initializeSubscription(userId: string): Promise<SubscriptionInfo> {
  if (!db) {
    return createDefaultSubscription();
  }

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return createDefaultSubscription();
  }

  const userData = userSnap.data();

  // If user already has a subscription, return it (after checking for reset)
  if (userData.subscription) {
    return checkAndResetCreditsIfNeeded(userId, userData.subscription);
  }

  // Create and save default subscription
  const defaultSubscription = createDefaultSubscription();
  await updateDoc(userRef, { subscription: defaultSubscription });

  return defaultSubscription;
}
