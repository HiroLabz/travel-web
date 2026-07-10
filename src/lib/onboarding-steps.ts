import { CreditCard, Users, type LucideIcon } from 'lucide-react';

export type OnboardingStepId = 'plan' | 'group';

export interface OnboardingStep {
  id: OnboardingStepId;
  /** Route path this step lives at, used for both `usePathname()` matching
   *  and (eventually) links. Does not include the (steps) route group,
   *  since route groups are invisible in the URL. */
  path: string;
  name: string;
  icon: LucideIcon;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'plan', path: '/onboarding/plan', name: 'Choose plan', icon: CreditCard },
  { id: 'group', path: '/onboarding/group', name: 'Create group', icon: Users },
];
