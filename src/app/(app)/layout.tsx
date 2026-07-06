'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/ui/loading-screen';

// Routes that don't require a household
const householdExemptRoutes = ['/onboarding', '/household'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Determine if we're still waiting for user profile to load
  // userProfile will be null while loading, then either a profile object or remain null if no profile exists
  const isProfileLoading = loading || (user && userProfile === null);

  // Check if current route is exempt from household requirement
  const isHouseholdExemptRoute = householdExemptRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    // Client-side auth guard as fallback
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    // Redirect to change password if required (only after profile is loaded)
    if (!isProfileLoading && user && userProfile?.requirePasswordChange) {
      router.replace('/change-password');
      return;
    }

    // Redirect to onboarding if user has no household (except on exempt routes)
    if (!isProfileLoading && user && userProfile && !isHouseholdExemptRoute) {
      const hasHousehold = userProfile.householdIds && userProfile.householdIds.length > 0;
      if (!hasHousehold) {
        router.replace('/onboarding');
      }
    }
  }, [user, userProfile, loading, isProfileLoading, router, pathname, isHouseholdExemptRoute]);

  // Show loading screen while checking auth or loading profile
  if (isProfileLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // Don't render children if not authenticated
  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Don't render children if password change is required
  if (userProfile?.requirePasswordChange) {
    return <LoadingScreen message="Redirecting to change password..." />;
  }

  // Don't render children if user has no household (except on exempt routes)
  if (!isHouseholdExemptRoute && userProfile && (!userProfile.householdIds || userProfile.householdIds.length === 0)) {
    return <LoadingScreen message="Redirecting to setup..." />;
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
