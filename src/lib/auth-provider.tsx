
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, Household, Trip, HistoricalMember, SubscriptionInfo } from '@/types';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { getSubscriptionFromProfile } from '@/lib/subscription-utils';
import { checkAndResetCreditsIfNeeded, initializeSubscription } from '@/lib/subscription';

// Session management functions
async function createSession(idToken: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to create session:', error);
    return false;
  }
}

async function deleteSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete session:', error);
    return false;
  }
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  household: Household | null;
  trips: Trip[];
  archivedTrips: Trip[];
  loading: boolean;
  activeHouseholdId: string | null;
  setActiveHouseholdId: (id: string) => void;
  memberSuggestions: HistoricalMember[];
  subscription: SubscriptionInfo | null;
  refreshSubscription: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [archivedTrips, setArchivedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [memberSuggestions, setMemberSuggestions] = useState<HistoricalMember[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        setInitialDataLoaded(true);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // User is signed in - sync session cookie
        try {
          const idToken = await firebaseUser.getIdToken();
          await createSession(idToken);
        } catch (error) {
          console.error('Failed to sync session:', error);
        }
      } else {
        // User signed out - clear session cookie
        await deleteSession();
        setUserProfile(null);
        setHousehold(null);
        setTrips([]);
        setSubscription(null);
        setLoading(false);
        setInitialDataLoaded(true);
      }
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (user && db) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
        if (docSnap.exists()) {
          let profile = docSnap.data() as UserProfile;

          // AUTO-MIGRATION: Convert old householdId to householdIds array
          if (!profile.householdIds && profile.householdId && db) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              householdIds: [profile.householdId],
              defaultHouseholdId: profile.householdId
            });
            // Update local profile immediately
            profile = {
              ...profile,
              householdIds: [profile.householdId],
              defaultHouseholdId: profile.householdId
            };
          }

          setUserProfile(profile);

          // Initialize and set subscription
          let sub = getSubscriptionFromProfile(profile);
          // Check if credits need to be reset
          sub = await checkAndResetCreditsIfNeeded(user.uid, sub);
          setSubscription(sub);

          // If user doesn't have subscription in Firestore yet, initialize it
          if (!profile.subscription) {
            await initializeSubscription(user.uid);
          }

          // Set active household from localStorage first, then from profile, then first in array
          if (!activeHouseholdId) {
            const storedHouseholdId = typeof window !== 'undefined'
              ? localStorage.getItem('wandernest_active_household')
              : null;

            const householdToUse =
              storedHouseholdId && profile.householdIds?.includes(storedHouseholdId)
                ? storedHouseholdId
                : profile.defaultHouseholdId || profile.householdIds?.[0] || profile.householdId || null;

            if (householdToUse) {
              setActiveHouseholdId(householdToUse);
              // Don't set loading=false yet, wait for household data to load
            } else {
              // User has no households, loading is done
              setLoading(false);
              setInitialDataLoaded(true);
            }
          }
        } else {
          // No profile exists yet, loading is done
          setLoading(false);
          setInitialDataLoaded(true);
        }
      });
      return () => unsub();
    } else if (!user) {
        // No user, already handled in auth state effect
    }
  }, [user, activeHouseholdId]);


  useEffect(() => {
    if (!activeHouseholdId || !db) {
      setHousehold(null);
      setTrips([]);
      setArchivedTrips([]);
      return;
    };

    let householdLoaded = false;
    let tripsLoaded = false;

    const checkAllLoaded = () => {
      if (householdLoaded && tripsLoaded) {
        setLoading(false);
        setInitialDataLoaded(true);
      }
    };

    const householdUnsub = onSnapshot(doc(db, 'households', activeHouseholdId), (doc) => {
      if (doc.exists()) {
        setHousehold({ id: doc.id, ...doc.data() } as Household);
      } else {
        setHousehold(null);
      }
      householdLoaded = true;
      checkAllLoaded();
    });

    const tripsQuery = query(collection(db, 'trips'), where('householdId', '==', activeHouseholdId));
    const tripsUnsub = onSnapshot(tripsQuery, (snapshot) => {
        const allTrips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
        setTrips(allTrips.filter(trip => !trip.archived));
        setArchivedTrips(allTrips.filter(trip => trip.archived));
        tripsLoaded = true;
        checkAllLoaded();
    });

    return () => {
        householdUnsub();
        tripsUnsub();
    }

  }, [activeHouseholdId]);

  // Compute member suggestions from current household members + historical members
  useEffect(() => {
    if (!household && !userProfile?.historicalMembers) {
      setMemberSuggestions([]);
      return;
    }

    const suggestions: HistoricalMember[] = [];
    const seenUids = new Set<string>();
    const seenEmails = new Set<string>();

    // Add current household members
    if (household?.members) {
      household.members.forEach(member => {
        if (member.uid && !seenUids.has(member.uid)) {
          seenUids.add(member.uid);
          suggestions.push({
            uid: member.uid,
            email: member.email || undefined,
            name: member.name || 'Unknown',
            photoURL: member.photoURL,
            lastSeenInHouseholdId: household.id,
            addedAt: member.addedAt || new Date().toISOString()
          });
        } else if (member.email && !seenEmails.has(member.email)) {
          seenEmails.add(member.email);
          suggestions.push({
            email: member.email,
            name: member.name || 'Unknown',
            photoURL: member.photoURL,
            lastSeenInHouseholdId: household.id,
            addedAt: member.addedAt || new Date().toISOString()
          });
        }
      });
    }

    // Add historical members (deduplicate by uid/email)
    if (userProfile?.historicalMembers) {
      userProfile.historicalMembers.forEach(historical => {
        if (historical.uid && !seenUids.has(historical.uid)) {
          seenUids.add(historical.uid);
          suggestions.push(historical);
        } else if (historical.email && !seenEmails.has(historical.email)) {
          seenEmails.add(historical.email);
          suggestions.push(historical);
        }
      });
    }

    setMemberSuggestions(suggestions);
  }, [household, userProfile?.historicalMembers]);

  // Detect if user was removed from active household
  useEffect(() => {
    if (!activeHouseholdId || !userProfile || !user) return;

    // Check if activeHouseholdId is still in user's householdIds
    const stillMember = userProfile.householdIds?.includes(activeHouseholdId);

    if (!stillMember && userProfile.householdIds && userProfile.householdIds.length > 0) {
      // User was removed, switch to first available household
      const newActiveId = userProfile.householdIds[0];
      setActiveHouseholdId(newActiveId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wandernest_active_household', newActiveId);
      }
    } else if (!stillMember) {
      // User has no households, clear active household
      setActiveHouseholdId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wandernest_active_household');
      }
    }
  }, [activeHouseholdId, userProfile, user]);

  // Function to refresh subscription data (e.g., after credits are used)
  const refreshSubscription = useCallback(async () => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      let sub = getSubscriptionFromProfile(userData);
      sub = await checkAndResetCreditsIfNeeded(user.uid, sub);
      setSubscription(sub);
    }
  }, [user]);

  // Wrapper function to persist active household to localStorage and Firestore
  const handleSetActiveHouseholdId = async (id: string) => {
    setActiveHouseholdId(id);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('wandernest_active_household', id);
    }

    // Persist to Firestore
    if (user && db) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        defaultHouseholdId: id
      });
    }
  };

  const value = {
    user,
    userProfile,
    household,
    trips,
    archivedTrips,
    loading,
    activeHouseholdId,
    setActiveHouseholdId: handleSetActiveHouseholdId,
    memberSuggestions,
    subscription,
    refreshSubscription
  };

  if (loading) {
    return <LoadingScreen message="Loading your account..." />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
