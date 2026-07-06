'use server';

import { revalidatePath } from 'next/cache';
import { addDoc, collection, doc, writeBatch, serverTimestamp, getDoc, updateDoc, getDocs, query, where, deleteDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { generateTripItinerary } from '@/ai/flows/generate-trip-itinerary';
import { analyzeTravelPdf } from '@/ai/flows/analyze-travel-pdf';
import { generatePlaceRecommendations } from '@/ai/flows/generate-place-recommendations';
import { generateCountryInfo, type GenerateCountryInfoOutput } from '@/ai/flows/generate-country-info';
import { generateTravelPlan, type GenerateTravelPlanOutput } from '@/ai/flows/generate-travel-plan';
import { generateTopRatedPlaces, type GenerateTopRatedPlacesOutput } from '@/ai/flows/generate-top-rated-places';
import { generateTopReviewPlaces, type GenerateTopReviewPlacesOutput } from '@/ai/flows/generate-top-review-places';
import { generateAirportTransferGuide, type GenerateAirportTransferGuideOutput } from '@/ai/flows/generate-airport-transfer-guide';
import { generateCommuteRecommendations, type GenerateCommuteRecommendationsOutput } from '@/ai/flows/generate-commute-recommendations';
import { analyzeReceipt, type AnalyzeReceiptOutput } from '@/ai/flows/analyze-receipt';
import type { Trip, ItineraryDay, Destination, WizardItineraryItem, TravelPreferences, RecommendedPlace, ExperienceType, BudgetItem, TravelPlan, TransportRecommendation, DocumentReference, HouseholdMember, GeoLocation, CommuteTransportMode, CommuteRoute, CommuteRouteSegment, CommuteSettings, CommuteRecommendationOutput, Expense, ReceiptAnalysisOutput, ChecklistItem, ExchangeRateCache, DestinationCurrency, RouteWaypoint, RouteSegmentWithMode, RoutePlan, RoutePlannerPlaceCategory } from '@/types';
import { fetchExchangeRates } from '@/lib/exchange-rates';
import { DEFAULT_BUDGET_CATEGORIES } from '@/types';
import { canUseAIFeature, deductCredits } from '@/lib/subscription';
import { z } from 'zod';
import { headers } from 'next/headers';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

const TripSchema = z.object({
    destination: z.string().min(1, 'At least one destination is required.'),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid start date" }),
    householdId: z.string(),
    title: z.string().min(2, 'Title is required.'),
    tripType: z.enum(['local', 'international']).default('international'),
    days: z.coerce.number().min(1),
    vibe: z.string(),
    imageUrl: z.string().url().optional(),
    imageHint: z.string().optional()
});

export async function createTripAction(prevState: any, formData: FormData) {
    if (!db) {
        return { message: 'Database not initialized.', errors: {}, tripId: null };
    }
    const validatedFields = TripSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Invalid form data.',
        };
    }

    const { destination, startDate, householdId, title, tripType, vibe } = validatedFields.data;

    // Get userId from formData for credit checking
    const userId = formData.get('userId') as string;
    if (!userId) {
        return { message: 'User ID is required.', errors: {}, tripId: null };
    }

    // Check AI credits before proceeding
    const creditCheck = await canUseAIFeature(userId, 'trip_itinerary');
    if (!creditCheck.allowed) {
        return {
            message: 'You have run out of AI credits for this month. Please upgrade to Wanderer for more credits.',
            errors: {},
            tripId: null,
            creditError: true,
            remainingCredits: creditCheck.remainingCredits
        };
    }

    const destinationsArray = destination.split(';').map(dest => {
        const [city, country] = dest.split(',').map(s => s.trim());
        return { city, country };
    });

    const firstCity = destinationsArray[0]?.city;
    if (!firstCity) {
         return {
            errors: { destination: ['Could not determine a primary destination for the itinerary.'] },
            message: 'Invalid destination data.',
        };
    }

    let days = validatedFields.data.days;
    const formEndDate = formData.get('endDate');
    let endDate;
    if (formEndDate) {
        endDate = new Date(formEndDate as string);
        days = differenceInCalendarDays(endDate, parseISO(startDate)) + 1;
    } else {
        endDate = addDays(parseISO(startDate), days > 0 ? days - 1 : 0);
    }

    // Deduct credits before AI call
    const deductResult = await deductCredits(userId, 'trip_itinerary');
    if (!deductResult.success) {
        return {
            message: deductResult.error || 'Failed to process credits.',
            errors: {},
            tripId: null,
            creditError: true,
            remainingCredits: deductResult.remainingCredits
        };
    }

    try {
        const aiResponse = await generateTripItinerary({
            city: firstCity,
            days: days,
            vibe: vibe,
        });

        let itinerary: { itinerary: ItineraryDay[] } = { itinerary: [] };
        try {
          itinerary = JSON.parse(aiResponse.itinerary);
        } catch(e) {
          console.warn("AI returned invalid JSON for itinerary", aiResponse.itinerary);
          // Proceed with an empty itinerary
        }
        
        const newTrip: Omit<Trip, 'id'> = {
            householdId,
            title,
            tripType,
            destination: firstCity, // Keep a single primary destination for AI
            destinations: destinationsArray,
            days,
            vibe,
            startDate,
            endDate: endDate.toISOString(),
            itinerary: itinerary.itinerary || [],
            noteContent: `<h1>Trip to ${title}</h1><p>Planning our ${vibe} trip!</p>`,
            imageUrl: validatedFields.data.imageUrl || '',
            imageHint: validatedFields.data.imageHint || ''
        };

        const docRef = await addDoc(collection(db, 'trips'), newTrip);

        revalidatePath('/dashboard');
        revalidatePath(`/trip/${docRef.id}`);
        return { message: 'Trip created successfully', tripId: docRef.id, errors: {} };

    } catch (error) {
        console.error('Error creating trip:', error);
        return { message: 'Failed to create trip. The AI might be having a moment.', errors: {}, tripId: null };
    }
}

export async function deleteTripAction(tripId: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await deleteDoc(tripRef);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('Failed to delete trip:', e);
    return { error: 'Failed to delete trip.' };
  }
}

export async function renameTripAction(tripId: string, newTitle: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  if (!newTitle.trim()) {
    return { error: 'Trip title cannot be empty.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { title: newTitle.trim() });
    revalidatePath('/dashboard');
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to rename trip:', e);
    return { error: 'Failed to rename trip.' };
  }
}

export async function toggleTripPinAction(tripId: string, pinned: boolean) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { pinned });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('Failed to update trip pin status:', e);
    return { error: 'Failed to update trip pin status.' };
  }
}

export async function archiveTripAction(tripId: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { archived: true });
    revalidatePath('/dashboard');
    revalidatePath('/archived-trips');
    return { success: true };
  } catch (e) {
    console.error('Failed to archive trip:', e);
    return { error: 'Failed to archive trip.' };
  }
}

export async function restoreTripAction(tripId: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { archived: false });
    revalidatePath('/dashboard');
    revalidatePath('/archived-trips');
    return { success: true };
  } catch (e) {
    console.error('Failed to restore trip:', e);
    return { error: 'Failed to restore trip.' };
  }
}

export async function createHouseholdAction(
  name: string,
  userId: string,
  userEmail: string,
  userName: string | null,
  userPhoto: string | null,
  settings?: {
    currency?: string;
    countryOfOrigin?: string;
    cityOfOrigin?: string;
    timeFormat?: '12h' | '24h';
  }
) {
  if (!userId || !db) return { error: 'User not authenticated or DB not ready' };
  if (!name) return { error: 'Travel group name is required' };

  const batch = writeBatch(db);

  // Filter out undefined values from settings
  const filteredSettings: Record<string, any> = {};
  if (settings?.currency) filteredSettings.currency = settings.currency;
  if (settings?.countryOfOrigin) filteredSettings.countryOfOrigin = settings.countryOfOrigin;
  if (settings?.cityOfOrigin) filteredSettings.cityOfOrigin = settings.cityOfOrigin;
  if (settings?.timeFormat) filteredSettings.timeFormat = settings.timeFormat;

  const householdRef = doc(collection(db, 'households'));
  batch.set(householdRef, {
    name,
    members: [{ uid: userId, role: 'owner', name: userName, photoURL: userPhoto }],
    memberIds: [userId],
    createdAt: serverTimestamp(),
    ...filteredSettings,
  });

  const userRef = doc(db, 'users', userId);
  batch.set(userRef, {
    uid: userId,
    email: userEmail,
    displayName: userName,
    photoURL: userPhoto,
    householdId: householdRef.id, // Set the first household as the primary one
  }, { merge: true });

  await batch.commit();

  revalidatePath('/dashboard');
  return { success: true, householdId: householdRef.id };
}

export async function createHouseholdWithTemplateAction(
  name: string,
  userId: string,
  userEmail: string,
  userName: string | null,
  userPhoto: string | null,
  templateHouseholdId?: string | null
) {
  if (!userId || !db) return { error: 'User not authenticated or DB not ready' };
  if (!name) return { error: 'Travel group name is required' };

  try {
    // Fetch template household settings if provided
    let templateSettings = {
      currency: undefined,
      countryOfOrigin: undefined,
      cityOfOrigin: undefined,
      timeFormat: undefined as '12h' | '24h' | undefined,
      budgetCategories: DEFAULT_BUDGET_CATEGORIES
    };

    if (templateHouseholdId) {
      const templateRef = doc(db, 'households', templateHouseholdId);
      const templateSnap = await getDoc(templateRef);

      if (templateSnap.exists()) {
        const templateData = templateSnap.data();
        templateSettings = {
          currency: templateData.currency,
          countryOfOrigin: templateData.countryOfOrigin,
          cityOfOrigin: templateData.cityOfOrigin,
          timeFormat: templateData.timeFormat,
          budgetCategories: templateData.budgetCategories || DEFAULT_BUDGET_CATEGORIES
        };
      }
    }

    // Get current user profile to update householdIds
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const currentHouseholdIds = userSnap.exists() ? (userSnap.data().householdIds || []) : [];

    const batch = writeBatch(db);

    // Create new household with template settings
    const householdRef = doc(collection(db, 'households'));
    const ownerMember: HouseholdMember = {
      uid: userId,
      email: userEmail,
      role: 'owner',
      name: userName,
      photoURL: userPhoto,
      addedAt: new Date().toISOString(),
      addedBy: userId
    };

    // Filter out undefined values from templateSettings (Firestore doesn't accept undefined)
    const filteredSettings: Record<string, any> = {};
    if (templateSettings.currency !== undefined) filteredSettings.currency = templateSettings.currency;
    if (templateSettings.countryOfOrigin !== undefined) filteredSettings.countryOfOrigin = templateSettings.countryOfOrigin;
    if (templateSettings.cityOfOrigin !== undefined) filteredSettings.cityOfOrigin = templateSettings.cityOfOrigin;
    if (templateSettings.timeFormat !== undefined) filteredSettings.timeFormat = templateSettings.timeFormat;
    if (templateSettings.budgetCategories !== undefined) filteredSettings.budgetCategories = templateSettings.budgetCategories;

    batch.set(householdRef, {
      name,
      members: [ownerMember],
      memberIds: [userId],
      createdAt: serverTimestamp(),
      createdBy: userId,
      ...filteredSettings
    });

    // Update user's householdIds array
    batch.set(userRef, {
      uid: userId,
      email: userEmail,
      displayName: userName,
      photoURL: userPhoto,
      householdIds: [...currentHouseholdIds, householdRef.id],
      defaultHouseholdId: householdRef.id
    }, { merge: true });

    await batch.commit();

    revalidatePath('/dashboard');
    revalidatePath('/household');
    return { success: true, householdId: householdRef.id };
  } catch (error) {
    console.error('Failed to create household:', error);
    return { error: 'Failed to create travel group. Please try again.' };
  }
}

export async function updateHouseholdSettingsAction(
  householdId: string,
  settings: { currency?: string; countryOfOrigin?: string; cityOfOrigin?: string; timeFormat?: '12h' | '24h'; budgetCategories?: { id: string; name: string }[] }
) {
  if (!householdId || !db) {
    return { error: 'Household not found or database not initialized.' };
  }

  try {
    const householdRef = doc(db, 'households', householdId);
    await updateDoc(householdRef, settings);
    revalidatePath('/household');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('Failed to update household settings:', e);
    return { error: 'Failed to update household settings.' };
  }
}

export async function updateHouseholdNameAction(householdId: string, name: string) {
  if (!householdId || !db) {
    return { error: 'Household not found or database not initialized.' };
  }

  if (!name.trim()) {
    return { error: 'Household name cannot be empty.' };
  }

  try {
    const householdRef = doc(db, 'households', householdId);
    await updateDoc(householdRef, { name: name.trim() });
    revalidatePath('/household');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('Failed to update household name:', e);
    return { error: 'Failed to update household name.' };
  }
}

export async function deleteHouseholdAction(householdId: string, userId: string) {
  if (!householdId || !db || !userId) {
    return { error: 'Missing required parameters.' };
  }

  try {
    // Get the household to verify ownership and get member list
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return { error: 'Household not found.' };
    }

    const householdData = householdSnap.data();
    const members = householdData.members || [];
    const memberIds = householdData.memberIds || [];

    // Verify the user is the owner
    const userMember = members.find((m: HouseholdMember) => m.uid === userId);
    if (!userMember || userMember.role !== 'owner') {
      return { error: 'Only the owner can delete this travel group.' };
    }

    const batch = writeBatch(db);

    // 1. Delete all trips associated with this household
    const tripsQuery = query(collection(db, 'trips'), where('householdId', '==', householdId));
    const tripsSnapshot = await getDocs(tripsQuery);

    for (const tripDoc of tripsSnapshot.docs) {
      // Delete all wizardItems for this trip
      const wizardItemsQuery = query(collection(db, 'wizardItems'), where('tripId', '==', tripDoc.id));
      const wizardItemsSnapshot = await getDocs(wizardItemsQuery);
      wizardItemsSnapshot.docs.forEach(wizardDoc => {
        batch.delete(wizardDoc.ref);
      });

      // Delete the trip
      batch.delete(tripDoc.ref);
    }

    // 2. Remove householdId from all members' householdIds arrays
    for (const memberId of memberIds) {
      const userRef = doc(db, 'users', memberId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedHouseholdIds = (userData.householdIds || []).filter((id: string) => id !== householdId);

        // If this was their default household, clear it or set to first available
        const updates: Record<string, unknown> = { householdIds: updatedHouseholdIds };
        if (userData.defaultHouseholdId === householdId) {
          updates.defaultHouseholdId = updatedHouseholdIds.length > 0 ? updatedHouseholdIds[0] : null;
        }

        batch.update(userRef, updates);
      }
    }

    // 3. Delete the household document
    batch.delete(householdRef);

    await batch.commit();

    revalidatePath('/household');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('Failed to delete household:', e);
    return { error: 'Failed to delete travel group. Please try again.' };
  }
}

export async function addMemberByEmailAction(
  householdId: string,
  email: string,
  addedByUid: string,
  addedByName: string | null
) {
  if (!householdId || !db || !email) {
    return { error: 'Missing required fields.' };
  }

  try {
    // Find user by email
    const usersQuery = query(collection(db, 'users'), where('email', '==', email));
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      return { error: 'No user found with this email address.' };
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userData.uid;

    // Check if user is already a member
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return { error: 'Household not found.' };
    }

    const householdData = householdSnap.data();
    if (householdData.memberIds?.includes(userId)) {
      return { error: 'This user is already a member of this household.' };
    }

    // Add member to household
    const newMember: HouseholdMember = {
      uid: userId,
      email: userData.email,
      role: 'member',
      name: userData.displayName,
      photoURL: userData.photoURL,
      addedAt: new Date().toISOString(),
      addedBy: addedByUid
    };

    const batch = writeBatch(db);

    // Update household
    batch.update(householdRef, {
      members: [...(householdData.members || []), newMember],
      memberIds: [...(householdData.memberIds || []), userId]
    });

    // Update user's householdIds
    const userRef = doc(db, 'users', userId);
    const currentHouseholdIds = userData.householdIds || [];
    batch.update(userRef, {
      householdIds: [...currentHouseholdIds, householdId]
    });

    // Update adder's historical members
    const adderRef = doc(db, 'users', addedByUid);
    const adderSnap = await getDoc(adderRef);
    if (adderSnap.exists()) {
      const adderData = adderSnap.data();
      const historicalMembers = adderData.historicalMembers || [];

      // Check if member already exists in historical
      const existingIndex = historicalMembers.findIndex((m: any) => m.uid === userId || m.email === email);

      const newHistoricalMember = {
        uid: userId,
        email: userData.email,
        name: userData.displayName || 'Unknown',
        photoURL: userData.photoURL,
        lastSeenInHouseholdId: householdId,
        addedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        historicalMembers[existingIndex] = newHistoricalMember;
      } else {
        historicalMembers.push(newHistoricalMember);
      }

      batch.update(adderRef, { historicalMembers });
    }

    await batch.commit();

    revalidatePath('/household');
    revalidatePath('/dashboard');
    return { success: true, message: `${userData.displayName || email} has been added to the travel group.` };
  } catch (error) {
    console.error('Failed to add member:', error);
    return { error: 'Failed to add member. Please try again.' };
  }
}

export async function addManualMemberAction(
  householdId: string,
  name: string,
  role: 'member' | 'child',
  addedByUid: string,
  addedByName: string | null
) {
  if (!householdId || !db || !name.trim()) {
    return { error: 'Missing required fields.' };
  }

  try {
    // Get household
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return { error: 'Household not found.' };
    }

    const householdData = householdSnap.data();

    // Create manual member (no uid, no email for children)
    const newMember: HouseholdMember = {
      role,
      name: name.trim(),
      isManualEntry: true,
      addedAt: new Date().toISOString(),
      addedBy: addedByUid
    };

    const batch = writeBatch(db);

    // Update household (don't add to memberIds since they don't have a uid)
    batch.update(householdRef, {
      members: [...(householdData.members || []), newMember]
    });

    // Update adder's historical members
    const adderRef = doc(db, 'users', addedByUid);
    const adderSnap = await getDoc(adderRef);
    if (adderSnap.exists()) {
      const adderData = adderSnap.data();
      const historicalMembers = adderData.historicalMembers || [];

      const newHistoricalMember = {
        name: name.trim(),
        lastSeenInHouseholdId: householdId,
        addedAt: new Date().toISOString()
      };

      historicalMembers.push(newHistoricalMember);
      batch.update(adderRef, { historicalMembers });
    }

    await batch.commit();

    revalidatePath('/household');
    revalidatePath('/dashboard');
    return { success: true, message: `${name} has been added to the travel group.` };
  } catch (error) {
    console.error('Failed to add manual member:', error);
    return { error: 'Failed to add member. Please try again.' };
  }
}

export async function removeMemberAction(
  householdId: string,
  memberUid: string | null,
  memberKey: string | null, // For manual entries: "name|addedAt"
  isManualEntry: boolean,
  requestingUserId: string
) {
  if (!householdId || !db || !requestingUserId) {
    return { error: 'Missing required fields.' };
  }

  try {
    // Get household and verify requester is owner
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return { error: 'Household not found.' };
    }

    const householdData = householdSnap.data();
    const members = householdData.members || [];
    const requestingMember = members.find((m: HouseholdMember) => m.uid === requestingUserId);

    if (!requestingMember || requestingMember.role !== 'owner') {
      return { error: 'Only the owner can remove members.' };
    }

    // Find the member to remove
    let memberToRemove: HouseholdMember | undefined;
    let memberIndex: number;

    if (isManualEntry && memberKey) {
      const [name, addedAt] = memberKey.split('|');
      memberIndex = members.findIndex((m: HouseholdMember) =>
        m.isManualEntry && m.name === name && m.addedAt === addedAt
      );
      memberToRemove = members[memberIndex];
    } else if (memberUid) {
      memberIndex = members.findIndex((m: HouseholdMember) => m.uid === memberUid);
      memberToRemove = members[memberIndex];
    } else {
      return { error: 'Invalid member identifier.' };
    }

    if (!memberToRemove || memberIndex === -1) {
      return { error: 'Member not found.' };
    }

    // Cannot remove the owner
    if (memberToRemove.role === 'owner') {
      return { error: 'Cannot remove the owner. Delete the travel group instead.' };
    }

    const batch = writeBatch(db);

    // Remove member from household
    const updatedMembers = members.filter((_: HouseholdMember, idx: number) => idx !== memberIndex);
    const updatedMemberIds = (householdData.memberIds || []).filter((id: string) => id !== memberUid);

    batch.update(householdRef, {
      members: updatedMembers,
      memberIds: updatedMemberIds
    });

    // For members with accounts, remove householdId from their profile
    if (!isManualEntry && memberUid) {
      const userRef = doc(db, 'users', memberUid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedHouseholdIds = (userData.householdIds || []).filter((id: string) => id !== householdId);

        const updates: Record<string, unknown> = { householdIds: updatedHouseholdIds };
        if (userData.defaultHouseholdId === householdId) {
          updates.defaultHouseholdId = updatedHouseholdIds.length > 0 ? updatedHouseholdIds[0] : null;
        }

        batch.update(userRef, updates);
      }
    }

    await batch.commit();

    revalidatePath('/household');
    revalidatePath('/dashboard');
    return { success: true, message: `${memberToRemove.name || 'Member'} has been removed from the travel group.` };
  } catch (error) {
    console.error('Failed to remove member:', error);
    return { error: 'Failed to remove member. Please try again.' };
  }
}

export async function editMemberNameAction(
  householdId: string,
  memberUid: string | null,
  memberKey: string | null, // For manual entries: "name|addedAt"
  newName: string,
  isManualEntry: boolean,
  updateUserProfile: boolean,
  requestingUserId: string
) {
  if (!householdId || !db || !requestingUserId || !newName.trim()) {
    return { error: 'Missing required fields.' };
  }

  try {
    // Get household and verify requester is owner
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return { error: 'Household not found.' };
    }

    const householdData = householdSnap.data();
    const members = householdData.members || [];
    const requestingMember = members.find((m: HouseholdMember) => m.uid === requestingUserId);

    if (!requestingMember || requestingMember.role !== 'owner') {
      return { error: 'Only the owner can edit member names.' };
    }

    // Find the member to edit
    let memberIndex: number;

    if (isManualEntry && memberKey) {
      const [name, addedAt] = memberKey.split('|');
      memberIndex = members.findIndex((m: HouseholdMember) =>
        m.isManualEntry && m.name === name && m.addedAt === addedAt
      );
    } else if (memberUid) {
      memberIndex = members.findIndex((m: HouseholdMember) => m.uid === memberUid);
    } else {
      return { error: 'Invalid member identifier.' };
    }

    if (memberIndex === -1) {
      return { error: 'Member not found.' };
    }

    const batch = writeBatch(db);

    // Update member name in household
    const updatedMembers = [...members];
    updatedMembers[memberIndex] = { ...updatedMembers[memberIndex], name: newName.trim() };

    batch.update(householdRef, { members: updatedMembers });

    // If requested, also update user's displayName
    if (updateUserProfile && !isManualEntry && memberUid) {
      const userRef = doc(db, 'users', memberUid);
      batch.update(userRef, { displayName: newName.trim() });
    }

    await batch.commit();

    revalidatePath('/household');
    revalidatePath('/dashboard');
    return { success: true, message: `Member name updated to ${newName.trim()}.` };
  } catch (error) {
    console.error('Failed to edit member name:', error);
    return { error: 'Failed to update member name. Please try again.' };
  }
}

export async function createMemberWithAccountAction(
  householdId: string,
  newUserUid: string,
  email: string,
  name: string,
  role: 'member' | 'child',
  addedByUid: string,
  addedByName: string | null
) {
  if (!householdId || !db || !newUserUid || !email || !name.trim()) {
    return { error: 'Missing required fields.' };
  }

  try {
    // Get household and verify requester is owner
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);

    if (!householdSnap.exists()) {
      return { error: 'Household not found.' };
    }

    const householdData = householdSnap.data();
    const members = householdData.members || [];
    const requestingMember = members.find((m: HouseholdMember) => m.uid === addedByUid);

    if (!requestingMember || requestingMember.role !== 'owner') {
      return { error: 'Only the owner can create member accounts.' };
    }

    // Check if user is already a member
    if (householdData.memberIds?.includes(newUserUid)) {
      return { error: 'This user is already a member of this household.' };
    }

    const batch = writeBatch(db);

    // Create user document in Firestore
    const userRef = doc(db, 'users', newUserUid);
    batch.set(userRef, {
      uid: newUserUid,
      email,
      displayName: name.trim(),
      photoURL: null,
      householdIds: [householdId],
      defaultHouseholdId: householdId,
      requirePasswordChange: true,
      createdByHouseholdOwner: addedByUid,
    });

    // Add member to household
    const newMember: HouseholdMember = {
      uid: newUserUid,
      email,
      role,
      name: name.trim(),
      photoURL: null,
      addedAt: new Date().toISOString(),
      addedBy: addedByUid,
    };

    batch.update(householdRef, {
      members: [...members, newMember],
      memberIds: [...(householdData.memberIds || []), newUserUid],
    });

    // Update adder's historical members
    const adderRef = doc(db, 'users', addedByUid);
    const adderSnap = await getDoc(adderRef);
    if (adderSnap.exists()) {
      const adderData = adderSnap.data();
      const historicalMembers = adderData.historicalMembers || [];

      const newHistoricalMember = {
        uid: newUserUid,
        email,
        name: name.trim(),
        photoURL: null,
        lastSeenInHouseholdId: householdId,
        addedAt: new Date().toISOString()
      };

      historicalMembers.push(newHistoricalMember);
      batch.update(adderRef, { historicalMembers });
    }

    await batch.commit();

    revalidatePath('/household');
    revalidatePath('/dashboard');
    return { success: true, message: `Account created for ${name.trim()}. Share the temporary password with them.` };
  } catch (error) {
    console.error('Failed to create member account:', error);
    return { error: 'Failed to create member account. Please try again.' };
  }
}

export async function updateTripNoteAction(tripId: string, content: string) {
  if (!tripId) {
    return { error: 'Missing trip ID.' };
  }
   if (!db) {
    return { error: 'Database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      noteContent: content
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch(e) {
    console.error('Failed to save note:', e);
    return { error: 'Failed to save note.' };
  }
}

export async function regenerateItineraryAction(tripId: string, city: string, days: number, vibe: string, userId: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.', itinerary: null };
  }

  if (!userId) {
    return { error: 'User ID is required.', itinerary: null };
  }

  // Check AI credits
  const creditCheck = await canUseAIFeature(userId, 'trip_itinerary');
  if (!creditCheck.allowed) {
    return {
      error: 'You have run out of AI credits for this month.',
      itinerary: null,
      creditError: true,
      remainingCredits: creditCheck.remainingCredits
    };
  }

  // Deduct credits
  const deductResult = await deductCredits(userId, 'trip_itinerary');
  if (!deductResult.success) {
    return {
      error: deductResult.error || 'Failed to process credits.',
      itinerary: null,
      creditError: true,
      remainingCredits: deductResult.remainingCredits
    };
  }

  try {
    const aiResponse = await generateTripItinerary({
      city,
      days,
      vibe,
    });

    let itinerary: { itinerary: ItineraryDay[] } = { itinerary: [] };
    try {
      itinerary = JSON.parse(aiResponse.itinerary);
    } catch (e) {
      console.warn("AI returned invalid JSON for itinerary", aiResponse.itinerary);
      return { error: 'Failed to parse AI response.', itinerary: null };
    }

    return { success: true, itinerary: itinerary.itinerary || [], remainingCredits: deductResult.remainingCredits };
  } catch (error) {
    console.error('Error regenerating itinerary:', error);
    return { error: 'Failed to generate itinerary.', itinerary: null };
  }
}

export async function saveItineraryAction(tripId: string, itinerary: ItineraryDay[], vibe: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      itinerary,
      vibe
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to save itinerary:', e);
    return { error: 'Failed to save itinerary.' };
  }
}

export async function saveItineraryDocumentAction(
  tripId: string,
  docUrl: string,
  docName: string,
  docType: 'pdf' | 'docx'
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      itineraryDocUrl: docUrl,
      itineraryDocName: docName,
      itineraryDocType: docType
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to save itinerary document:', e);
    return { error: 'Failed to save itinerary document.' };
  }
}

export async function removeItineraryDocumentAction(tripId: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      itineraryDocUrl: null,
      itineraryDocName: null,
      itineraryDocType: null
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to remove itinerary document:', e);
    return { error: 'Failed to remove itinerary document.' };
  }
}

// Wizard Itinerary Actions
export async function saveWizardItemAction(
  tripId: string,
  item: Omit<WizardItineraryItem, 'id' | 'createdAt'>
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.', item: null };
  }

  try {
    const docRef = await addDoc(collection(db, 'wizardItems'), {
      ...item,
      tripId,
      createdAt: serverTimestamp()
    });

    revalidatePath(`/trip/${tripId}`);
    return { success: true, item: { id: docRef.id, ...item, createdAt: new Date().toISOString() } };
  } catch (e) {
    console.error('Failed to save wizard item:', e);
    return { error: 'Failed to save itinerary item.', item: null };
  }
}

export async function deleteWizardItemAction(tripId: string, itemId: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    await deleteDoc(doc(db, 'wizardItems', itemId));
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to delete wizard item:', e);
    return { error: 'Failed to delete itinerary item.' };
  }
}

export async function updateWizardItemAction(
  tripId: string,
  itemId: string,
  updates: Partial<Omit<WizardItineraryItem, 'id' | 'tripId' | 'createdAt'>>
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const itemRef = doc(db, 'wizardItems', itemId);
    await updateDoc(itemRef, updates);
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to update wizard item:', e);
    return { error: 'Failed to update itinerary item.' };
  }
}

// Lightweight update for quick inline editing (notes and checklist only)
export async function quickUpdateWizardItemAction(
  tripId: string,
  itemId: string,
  updates: { quickNotes?: string; checklist?: ChecklistItem[] }
) {
  if (!tripId || !itemId || !db) {
    return { error: 'Missing required parameters or database not initialized.' };
  }

  try {
    const itemRef = doc(db, 'wizardItems', itemId);
    await updateDoc(itemRef, updates);
    return { success: true };
  } catch (e) {
    console.error('Failed to quick update wizard item:', e);
    return { error: 'Failed to update item.' };
  }
}

export async function reorderWizardItemsAction(
  tripId: string,
  itemId: string,
  newOrder: number,
  allItems: { id: string; order: number; timeFrom: string; timeTo: string; dateFrom?: string; dateTo?: string }[]
): Promise<{ success?: boolean; error?: string; updatedItems?: { id: string; order: number; timeFrom: string; timeTo: string; dateFrom?: string; dateTo?: string }[] }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const batch = writeBatch(db);

    // Update all items with their new order, times, and optionally dates
    for (const item of allItems) {
      const itemRef = doc(db, 'wizardItems', item.id);
      const updates: Record<string, unknown> = {
        order: item.order,
        timeFrom: item.timeFrom,
        timeTo: item.timeTo
      };

      // Include date updates if provided (for cross-date moves)
      if (item.dateFrom !== undefined) {
        updates.dateFrom = item.dateFrom;
      }
      if (item.dateTo !== undefined) {
        updates.dateTo = item.dateTo;
      }

      batch.update(itemRef, updates);
    }

    await batch.commit();
    revalidatePath(`/trip/${tripId}`);

    return { success: true, updatedItems: allItems };
  } catch (e) {
    console.error('Failed to reorder wizard items:', e);
    return { error: 'Failed to reorder itinerary items.' };
  }
}

export async function getWizardItemsAction(tripId: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.', items: [] };
  }

  try {
    const q = query(
      collection(db, 'wizardItems'),
      where('tripId', '==', tripId)
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for client components
        createdAt: data.createdAt?.toDate?.()
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || new Date().toISOString()
      };
    }) as WizardItineraryItem[];

    // Sort by order client-side to avoid requiring a composite index
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return { success: true, items };
  } catch (e) {
    console.error('Failed to get wizard items:', e);
    return { error: 'Failed to load itinerary items.', items: [] };
  }
}

export async function getWizardItemByIdAction(tripId: string, itemId: string) {
  if (!tripId || !itemId || !db) {
    return { error: 'Missing required parameters or database not initialized.', item: null };
  }

  try {
    const docRef = doc(db, 'wizardItems', itemId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { error: 'Activity not found.', item: null };
    }

    const data = docSnap.data();
    if (data.tripId !== tripId) {
      return { error: 'Activity does not belong to this trip.', item: null };
    }

    const item = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || new Date().toISOString()
    } as WizardItineraryItem;

    return { success: true, item };
  } catch (e) {
    console.error('Failed to get wizard item:', e);
    return { error: 'Failed to load activity.', item: null };
  }
}

export async function combineWizardItemsToDocAction(tripId: string, items: WizardItineraryItem[]) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  if (items.length === 0) {
    return { error: 'No itinerary items to combine.' };
  }

  try {
    // Sort items by date and time
    const sortedItems = [...items].sort((a, b) => {
      const dateCompare = a.dateFrom.localeCompare(b.dateFrom);
      if (dateCompare !== 0) return dateCompare;
      return a.timeFrom.localeCompare(b.timeFrom);
    });

    // Group items by date
    const groupedByDate: Record<string, WizardItineraryItem[]> = {};
    sortedItems.forEach(item => {
      const date = item.dateFrom;
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(item);
    });

    // Generate HTML content
    let htmlContent = '<h1>Trip Itinerary</h1>';

    Object.entries(groupedByDate).forEach(([date, dateItems]) => {
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      htmlContent += `<h2>${formattedDate}</h2>`;

      dateItems.forEach(item => {
        htmlContent += `
          <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
            <h3 style="margin: 0 0 8px 0;">${item.placeName}</h3>
            <p style="margin: 4px 0; color: #64748b; font-size: 14px;">
              <strong>Time:</strong> ${item.timeFrom} - ${item.timeTo}
            </p>
            <p style="margin: 4px 0; color: #64748b; font-size: 14px;">
              <strong>Address:</strong> ${item.address}
            </p>
            ${item.description ? `<div style="margin-top: 8px;">${item.description}</div>` : ''}
          </div>
        `;
      });
    });

    // Save to trip's noteContent
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      noteContent: htmlContent
    });

    revalidatePath(`/trip/${tripId}`);
    return { success: true, content: htmlContent };
  } catch (e) {
    console.error('Failed to combine wizard items:', e);
    return { error: 'Failed to generate itinerary document.' };
  }
}

// Helper function to normalize flight numbers (remove spaces, uppercase)
function normalizeFlightNumber(flightNumber: string | undefined): string {
  if (!flightNumber) return '';
  return flightNumber.replace(/\s+/g, '').toUpperCase();
}

// Helper function to normalize passenger names for matching
// Handles variations like "GIPAYA/NEIL CHRISTOPHER" vs "NEIL CHRISTOPHER GIPAYA"
function normalizePassengerName(name: string): string {
  if (!name) return '';

  // Remove slashes, commas, extra spaces and convert to uppercase
  const cleaned = name
    .replace(/[\/,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // Split into words and sort alphabetically
  // This way "GIPAYA NEIL CHRISTOPHER" and "NEIL CHRISTOPHER GIPAYA" become the same
  const words = cleaned.split(' ').sort();

  return words.join(' ');
}

// Helper function to create a unique key for deduplication
function createActivityKey(activity: {
  flightNumber?: string;
  confirmationNumber?: string;
  travelType: string;
  dateFrom: string;
  timeFrom: string;
  placeName: string;
  terminalInfo?: string;
}): string {
  // For flights, use flight number + date as the key (normalize flight number)
  if (activity.travelType === 'air' && activity.flightNumber) {
    const normalizedFlight = normalizeFlightNumber(activity.flightNumber);
    return `air_${normalizedFlight}_${activity.dateFrom}`.toLowerCase();
  }
  // For other types with confirmation number, use that
  if (activity.confirmationNumber) {
    return `${activity.travelType}_${activity.confirmationNumber}_${activity.dateFrom}`.toLowerCase();
  }
  // Fallback to combination of fields
  return `${activity.travelType}_${activity.dateFrom}_${activity.timeFrom}_${activity.placeName}_${activity.terminalInfo || ''}`.toLowerCase().replace(/\s+/g, '_');
}

// Helper function to deduplicate activities
function deduplicateActivities<T extends {
  flightNumber?: string;
  confirmationNumber?: string;
  travelType: string;
  dateFrom: string;
  timeFrom: string;
  placeName: string;
  terminalInfo?: string;
  description: string;
}>(activities: T[]): T[] {
  const seen = new Map<string, T>();

  for (const activity of activities) {
    const key = createActivityKey(activity);

    if (!seen.has(key)) {
      seen.set(key, activity);
    } else {
      // If we see a duplicate, merge passenger info into description if different
      const existing = seen.get(key)!;
      if (existing.description !== activity.description) {
        // Append unique info from duplicate
        existing.description = `${existing.description} (Multiple passengers)`;
      }
    }
  }

  return Array.from(seen.values());
}

// Helper function to find matching activity for document merging
async function findMatchingActivity(
  tripId: string,
  newActivity: {
    flightNumber?: string;
    confirmationNumber?: string;
    travelType: string;
    dateFrom: string;
    timeFrom: string;
    placeName: string;
    terminalInfo?: string;
  }
): Promise<WizardItineraryItem | null> {
  const existingItems = await getWizardItemsAction(tripId);

  if (!existingItems.items || existingItems.items.length === 0) {
    return null;
  }

  // Strategy 1: Flight number + date (strongest for air travel)
  // Normalize flight numbers to handle spaces (e.g., "Z2778" vs "Z2 778")
  if (newActivity.travelType === 'air' && newActivity.flightNumber && newActivity.flightNumber !== 'N/A') {
    const normalizedNewFlight = normalizeFlightNumber(newActivity.flightNumber);
    const match = existingItems.items.find(item =>
      item.travelType === 'air' &&
      normalizeFlightNumber(item.flightNumber) === normalizedNewFlight &&
      item.dateFrom === newActivity.dateFrom
    );
    if (match) return match;
  }

  // Strategy 2: Confirmation number + date
  if (newActivity.confirmationNumber && newActivity.confirmationNumber !== 'N/A') {
    const match = existingItems.items.find(item =>
      item.confirmationNumber === newActivity.confirmationNumber &&
      item.dateFrom === newActivity.dateFrom
    );
    if (match) return match;
  }

  // Strategy 3: Composite key fallback
  const newKey = createActivityKey(newActivity);
  const match = existingItems.items.find(item => {
    const itemKey = createActivityKey({
      flightNumber: item.flightNumber,
      confirmationNumber: item.confirmationNumber,
      travelType: item.travelType || 'activity',
      dateFrom: item.dateFrom,
      timeFrom: item.timeFrom,
      placeName: item.placeName,
      terminalInfo: item.terminalInfo,
    });
    return itemKey === newKey;
  });

  return match || null;
}

// Helper function to merge activity data from new document
function mergeActivityData(
  existing: WizardItineraryItem,
  newData: any,
  documentRef: DocumentReference
): {
  updates: Partial<WizardItineraryItem>;
  contributedFields: string[];
} {
  const updates: Partial<WizardItineraryItem> = {};
  const contributedFields: string[] = [];

  // Merge Rules:
  // 1. Boarding pass data (gate, boarding time, seats) OVERWRITES ticket
  // 2. Non-empty values OVERWRITE 'N/A' or empty
  // 3. Passengers are MERGED, not replaced

  // Gate number (boarding pass usually has this)
  if (newData.gateNumber && newData.gateNumber !== 'N/A' && newData.gateNumber !== 'null') {
    if (!existing.gateNumber || existing.gateNumber === 'N/A') {
      updates.gateNumber = newData.gateNumber;
      contributedFields.push('gateNumber');
    }
  }

  // Boarding time
  if (newData.boardingTime && newData.boardingTime !== 'N/A' && newData.boardingTime !== 'null') {
    if (!existing.boardingTime || existing.boardingTime === 'N/A') {
      updates.boardingTime = newData.boardingTime;
      contributedFields.push('boardingTime');
    }
  }

  // Passengers - MERGE arrays
  if (newData.passengers && newData.passengers.length > 0) {
    const existingPassengers = existing.passengers || [];
    const mergedPassengers = [...existingPassengers];

    for (const newPassenger of newData.passengers) {
      // Use normalized name matching to handle variations like:
      // "GIPAYA/NEIL CHRISTOPHER" vs "NEIL CHRISTOPHER GIPAYA"
      const normalizedNewName = normalizePassengerName(newPassenger.name);
      const existingIndex = mergedPassengers.findIndex(p =>
        normalizePassengerName(p.name) === normalizedNewName
      );

      if (existingIndex >= 0) {
        // Update with new seat/ticket info from boarding pass
        // Prefer boarding pass name format (usually cleaner) if it doesn't have slashes
        const preferNewName = !newPassenger.name.includes('/') && mergedPassengers[existingIndex].name.includes('/');

        mergedPassengers[existingIndex] = {
          ...mergedPassengers[existingIndex],
          name: preferNewName ? newPassenger.name : mergedPassengers[existingIndex].name,
          seatNumber: newPassenger.seatNumber || mergedPassengers[existingIndex].seatNumber,
          ticketNumber: newPassenger.ticketNumber || mergedPassengers[existingIndex].ticketNumber,
          class: newPassenger.class || mergedPassengers[existingIndex].class,
        };
      } else {
        mergedPassengers.push(newPassenger);
      }
    }

    updates.passengers = mergedPassengers;
    contributedFields.push('passengers');
  }

  // Terminal info - prefer more detailed
  if (newData.terminalInfo && newData.terminalInfo !== 'N/A') {
    if (!existing.terminalInfo || existing.terminalInfo === 'N/A') {
      updates.terminalInfo = newData.terminalInfo;
      contributedFields.push('terminalInfo');
    }
  }

  // Arrival info - prefer more detailed
  if (newData.arrivalInfo && newData.arrivalInfo !== 'N/A') {
    if (!existing.arrivalInfo || existing.arrivalInfo === 'N/A') {
      updates.arrivalInfo = newData.arrivalInfo;
      contributedFields.push('arrivalInfo');
    }
  }

  // Confirmation number - prefer non-N/A values
  if (newData.confirmationNumber && newData.confirmationNumber !== 'N/A') {
    if (!existing.confirmationNumber || existing.confirmationNumber === 'N/A') {
      updates.confirmationNumber = newData.confirmationNumber;
      contributedFields.push('confirmationNumber');
    }
  }

  // Document metadata
  const existingMetadata = existing.documentMetadata || {};
  const existingDocs = existing.sourceDocuments || [];

  updates.documentMetadata = {
    ...existingMetadata,
    [documentRef.id]: {
      documentName: documentRef.name,
      documentUrl: documentRef.url,
      documentType: documentRef.type,
      contributedFields,
      uploadedAt: documentRef.uploadedAt,
    },
  };

  updates.sourceDocuments = [...existingDocs, documentRef];
  updates.mergedAt = new Date().toISOString();
  updates.mergeCount = (existing.mergeCount || 1) + 1;

  return { updates, contributedFields };
}

// Helper function to determine document type
function determineDocumentType(documentType: string, activity: any): string {
  const typeLC = documentType.toLowerCase();

  if (typeLC.includes('boarding pass') || typeLC.includes('boarding card')) {
    return 'boarding_pass';
  }
  if (typeLC.includes('ticket') || typeLC.includes('e-ticket')) {
    return 'ticket';
  }
  if (typeLC.includes('confirmation') || typeLC.includes('booking')) {
    return 'confirmation';
  }
  if (typeLC.includes('hotel') || typeLC.includes('accommodation')) {
    return 'hotel_voucher';
  }

  return 'other';
}

// PDF Analysis Actions
export async function analyzeTravelPdfAction(
  tripId: string,
  pdfUrl: string,
  documentId: string,
  documentName: string,
  tripStartDate?: string,
  tripEndDate?: string,
  userId?: string
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.', activities: [] };
  }

  // Check and deduct AI credits if userId is provided
  if (userId) {
    const creditCheck = await canUseAIFeature(userId, 'pdf_analysis');
    if (!creditCheck.allowed) {
      return {
        error: 'You have run out of AI credits for this month.',
        activities: [],
        creditError: true,
        remainingCredits: creditCheck.remainingCredits
      };
    }

    const deductResult = await deductCredits(userId, 'pdf_analysis');
    if (!deductResult.success) {
      return {
        error: deductResult.error || 'Failed to process credits.',
        activities: [],
        creditError: true,
        remainingCredits: deductResult.remainingCredits
      };
    }
  }

  try {
    // Analyze the PDF using Genkit
    const result = await analyzeTravelPdf({
      pdfUrl,
      tripStartDate,
      tripEndDate,
    });

    if (!result.activities || result.activities.length === 0) {
      return {
        success: true,
        activities: [],
        summary: result.summary,
        documentType: result.documentType,
        message: 'No activities found in the document.',
        created: 0,
        merged: 0,
      };
    }

    // Deduplicate activities (in case AI returns duplicates for multi-passenger bookings)
    const uniqueActivities = deduplicateActivities(result.activities);
    const duplicatesRemoved = result.activities.length - uniqueActivities.length;

    // Get existing wizard items to determine the order
    const existingItemsResult = await getWizardItemsAction(tripId);
    const existingItems = existingItemsResult.items || [];
    let currentOrder = existingItems.length > 0
      ? Math.max(...existingItems.map(item => item.order ?? 0)) + 1
      : 0;

    // Process each activity: either merge with existing or create new
    const savedItems: WizardItineraryItem[] = [];
    const mergedItems: WizardItineraryItem[] = [];
    let createdCount = 0;
    let mergedCount = 0;

    // Determine document type from AI result
    const docType = determineDocumentType(result.documentType || '', null);

    for (const activity of uniqueActivities) {
      // Check if matching activity exists
      const matchingActivity = await findMatchingActivity(tripId, {
        flightNumber: activity.flightNumber,
        confirmationNumber: activity.confirmationNumber,
        travelType: activity.travelType,
        dateFrom: activity.dateFrom,
        timeFrom: activity.timeFrom,
        placeName: activity.placeName,
        terminalInfo: activity.terminalInfo,
      });

      // Create document reference
      const documentRef: DocumentReference = {
        id: documentId,
        name: documentName,
        type: docType,
        url: pdfUrl,
        uploadedAt: new Date().toISOString(),
      };

      if (matchingActivity) {
        // MERGE: Update existing activity with new information
        const { updates } = mergeActivityData(matchingActivity, activity, documentRef);

        // Update the activity in Firestore
        const wizardItemRef = doc(db, 'wizardItems', matchingActivity.id);
        await updateDoc(wizardItemRef, updates);

        // Get updated item
        const updatedDoc = await getDoc(wizardItemRef);
        if (updatedDoc.exists()) {
          const data = updatedDoc.data();
          mergedItems.push({
            id: updatedDoc.id,
            ...data,
            // Convert Firestore Timestamp to ISO string for client components
            createdAt: data.createdAt?.toDate?.()
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString()
          } as WizardItineraryItem);
        }

        mergedCount++;
      } else {
        // CREATE: New activity with initial document metadata
        // Generate Google Maps URLs from the queries
        const googleMapsUrl = activity.googleMapsQuery
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.googleMapsQuery)}`
          : activity.terminalInfo
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.terminalInfo)}`
          : undefined;

        const arrivalGoogleMapsUrl = activity.arrivalGoogleMapsQuery
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.arrivalGoogleMapsQuery)}`
          : activity.arrivalInfo
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.arrivalInfo)}`
          : activity.address
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.address)}`
          : undefined;

        const itemToSave = {
          tripId,
          placeName: activity.placeName,
          address: activity.address || 'N/A',
          dateFrom: activity.dateFrom,
          dateTo: activity.dateTo,
          timeFrom: activity.timeFrom || '00:00',
          timeTo: activity.timeTo || '00:00',
          description: activity.description,
          order: currentOrder++,
          // Enhanced travel information
          travelType: activity.travelType,
          operatorName: activity.operatorName || 'N/A',
          operatorContact: activity.operatorContact,
          googleMapsUrl,
          terminalInfo: activity.terminalInfo || 'N/A',
          arrivalInfo: activity.arrivalInfo,
          arrivalGoogleMapsUrl,
          confirmationNumber: activity.confirmationNumber || 'N/A',
          checkInInstructions: activity.checkInInstructions,
          flightNumber: activity.flightNumber,
          // Passenger information
          passengers: activity.passengers,
          gateNumber: activity.gateNumber,
          boardingTime: activity.boardingTime,
          // Document linking
          sourceDocuments: [documentRef],
          documentMetadata: {
            [documentId]: {
              documentName,
              documentUrl: pdfUrl,
              documentType: docType,
              contributedFields: ['all'], // Initial creation contributes all fields
              uploadedAt: documentRef.uploadedAt,
            },
          },
          mergeCount: 1,
        };

        const saveResult = await saveWizardItemAction(tripId, itemToSave);
        if (saveResult.item) {
          savedItems.push(saveResult.item as WizardItineraryItem);
          createdCount++;
        }
      }
    }

    revalidatePath(`/trip/${tripId}`);

    // Build message with info about duplicates and merges
    const allActivities = [...savedItems, ...mergedItems];
    let message = '';

    if (createdCount > 0 && mergedCount > 0) {
      message = `Created ${createdCount} new activit${createdCount === 1 ? 'y' : 'ies'} and merged with ${mergedCount} existing activit${mergedCount === 1 ? 'y' : 'ies'}`;
    } else if (createdCount > 0) {
      message = `Successfully extracted ${createdCount} activit${createdCount === 1 ? 'y' : 'ies'} from the ${result.documentType}`;
    } else if (mergedCount > 0) {
      message = `Merged information with ${mergedCount} existing activit${mergedCount === 1 ? 'y' : 'ies'}`;
    }

    if (duplicatesRemoved > 0) {
      message += ` (${duplicatesRemoved} duplicate passenger entries consolidated)`;
    }

    return {
      success: true,
      activities: allActivities,
      summary: result.summary,
      documentType: result.documentType,
      message,
      created: createdCount,
      merged: mergedCount,
    };
  } catch (error) {
    console.error('Error analyzing PDF:', error);
    return { error: 'Failed to analyze the PDF document.', activities: [] };
  }
}

// Place Recommendations Action
export async function generatePlaceRecommendationsAction(
  city: string,
  days: number,
  preferences: TravelPreferences,
  country?: string
): Promise<{
  success?: boolean;
  error?: string;
  places?: RecommendedPlace[];
  groupedPlaces?: Record<ExperienceType, RecommendedPlace[]>;
  summary?: string
}> {
  try {
    const result = await generatePlaceRecommendations({
      city,
      country,
      days,
      vacationTypes: preferences.vacationTypes,
      travelGroup: preferences.travelGroup,
      budget: preferences.budget,
      transport: preferences.transport,
      dining: preferences.dining,
      experiences: preferences.experiences,
    });

    // Group places by category
    const groupedPlaces: Record<ExperienceType, RecommendedPlace[]> = {} as Record<ExperienceType, RecommendedPlace[]>;

    for (const place of result.places) {
      const category = place.category as ExperienceType;
      if (!groupedPlaces[category]) {
        groupedPlaces[category] = [];
      }
      const searchQuery = `${place.name} ${city}`;
      groupedPlaces[category].push({
        id: place.id,
        name: place.name,
        address: place.address,
        description: place.description,
        category,
        estimatedDuration: place.estimatedDuration,
        priceLevel: place.priceLevel,
        tips: place.tips,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`,
        imageSearchUrl: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`,
      });
    }

    // Also add URLs to the flat places array
    const placesWithUrls: RecommendedPlace[] = result.places.map(place => {
      const searchQuery = `${place.name} ${city}`;
      return {
        id: place.id,
        name: place.name,
        address: place.address,
        description: place.description,
        category: place.category as ExperienceType,
        estimatedDuration: place.estimatedDuration,
        priceLevel: place.priceLevel,
        tips: place.tips,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`,
        imageSearchUrl: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`,
      };
    });

    return {
      success: true,
      places: placesWithUrls,
      groupedPlaces,
      summary: result.summary,
    };
  } catch (error) {
    console.error('Error generating place recommendations:', error);
    return { error: 'Failed to generate place recommendations. Please try again.' };
  }
}

// Transport Recommendations Action
export async function generateTransportRecommendationsAction(
  city: string,
  days: number,
  travelGroup: string,
  budget: string,
  selectedTransportOptions: string[],
  country?: string
): Promise<{
  success?: boolean;
  error?: string;
  transportOptions?: TransportRecommendation[];
  generalTips?: string;
  cardRecommendation?: string;
}> {
  try {
    const { generateTransportRecommendations } = await import('@/ai/flows/generate-transport-recommendations');

    const result = await generateTransportRecommendations({
      city,
      country,
      days,
      travelGroup,
      budget,
      selectedTransportOptions,
    });

    return {
      success: true,
      transportOptions: result.transportOptions,
      generalTips: result.generalTips,
      cardRecommendation: result.cardRecommendation,
    };
  } catch (error) {
    console.error('Error generating transport recommendations:', error);
    return { error: 'Failed to generate transport recommendations. Please try again.' };
  }
}

// Budget Actions
export async function updateTripBudgetAction(
  tripId: string,
  budgetItems: BudgetItem[],
  currency: string = 'USD'
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      budgetItems,
      budgetCurrency: currency
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to update budget:', e);
    return { error: 'Failed to update budget.' };
  }
}

export async function getTripBudgetAction(tripId: string) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.', budgetItems: [], currency: 'USD' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.', budgetItems: [], currency: 'USD' };
    }

    const data = tripSnap.data();
    return {
      success: true,
      budgetItems: (data.budgetItems || []) as BudgetItem[],
      currency: data.budgetCurrency || 'USD'
    };
  } catch (e) {
    console.error('Failed to get budget:', e);
    return { error: 'Failed to load budget.', budgetItems: [], currency: 'USD' };
  }
}

// Destination/Route Actions
export async function updateTripDestinationsAction(
  tripId: string,
  destinations: Destination[]
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);

    // Update the primary destination to the first in the list
    const primaryDestination = destinations[0]?.city || '';

    await updateDoc(tripRef, {
      destinations,
      destination: primaryDestination
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to update destinations:', e);
    return { error: 'Failed to update destinations.' };
  }
}

export async function updateTripDetailsAction(
  tripId: string,
  details: {
    title?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);

    // Build update object with only provided fields
    const updateData: Record<string, string> = {};
    if (details.title !== undefined) updateData.title = details.title;
    if (details.startDate !== undefined) updateData.startDate = details.startDate;
    if (details.endDate !== undefined) updateData.endDate = details.endDate;

    if (Object.keys(updateData).length === 0) {
      return { error: 'No fields to update.' };
    }

    await updateDoc(tripRef, updateData);
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to update trip details:', e);
    return { error: 'Failed to update trip details.' };
  }
}

export async function addDestinationAction(
  tripId: string,
  destination: Destination
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.' };
    }

    const currentDestinations = tripSnap.data().destinations || [];
    const updatedDestinations = [...currentDestinations, destination];

    await updateDoc(tripRef, {
      destinations: updatedDestinations
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true, destinations: updatedDestinations };
  } catch (e) {
    console.error('Failed to add destination:', e);
    return { error: 'Failed to add destination.' };
  }
}

export async function deleteDestinationAction(
  tripId: string,
  destinationIndex: number
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.' };
    }

    const currentDestinations = tripSnap.data().destinations || [];

    if (currentDestinations.length <= 1) {
      return { error: 'Cannot delete the last destination.' };
    }

    const updatedDestinations = currentDestinations.filter((_: Destination, i: number) => i !== destinationIndex);

    // Update primary destination if the first one was deleted
    const primaryDestination = updatedDestinations[0]?.city || '';

    await updateDoc(tripRef, {
      destinations: updatedDestinations,
      destination: primaryDestination
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true, destinations: updatedDestinations };
  } catch (e) {
    console.error('Failed to delete destination:', e);
    return { error: 'Failed to delete destination.' };
  }
}

export async function reorderDestinationsAction(
  tripId: string,
  fromIndex: number,
  toIndex: number
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.' };
    }

    const currentDestinations = [...(tripSnap.data().destinations || [])];

    // Remove and reinsert at new position
    const [movedItem] = currentDestinations.splice(fromIndex, 1);
    currentDestinations.splice(toIndex, 0, movedItem);

    // Update primary destination to the first one
    const primaryDestination = currentDestinations[0]?.city || '';

    await updateDoc(tripRef, {
      destinations: currentDestinations,
      destination: primaryDestination
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true, destinations: currentDestinations };
  } catch (e) {
    console.error('Failed to reorder destinations:', e);
    return { error: 'Failed to reorder destinations.' };
  }
}

// Country Information Action - with Firebase caching
export async function getCountryInfoAction(
  country: string,
  originCountry?: string,
  tripId?: string,
  forceRefresh: boolean = false,
  userId?: string
): Promise<{
  success?: boolean;
  error?: string;
  info?: GenerateCountryInfoOutput;
  cached?: boolean;
  creditError?: boolean;
  remainingCredits?: number;
}> {
  if (!country) {
    return { error: 'Country name is required.' };
  }

  // Create a cache key based on country and origin
  const cacheKey = `${country.toLowerCase().trim()}_${(originCountry || 'none').toLowerCase().trim()}`;

  // Try to get cached info from trip document if tripId is provided
  if (tripId && db && !forceRefresh) {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        const cachedInfo = tripData.countryInfoCache?.[cacheKey];

        if (cachedInfo) {
          return {
            success: true,
            info: cachedInfo,
            cached: true,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to check country info cache:', e);
      // Continue to generate fresh info
    }
  }

  // Check and deduct AI credits for fresh generation
  if (userId) {
    const creditCheck = await canUseAIFeature(userId, 'country_info');
    if (!creditCheck.allowed) {
      return {
        error: 'You have run out of AI credits for this month.',
        creditError: true,
        remainingCredits: creditCheck.remainingCredits
      };
    }

    const deductResult = await deductCredits(userId, 'country_info');
    if (!deductResult.success) {
      return {
        error: deductResult.error || 'Failed to process credits.',
        creditError: true,
        remainingCredits: deductResult.remainingCredits
      };
    }
  }

  try {
    const info = await generateCountryInfo({
      country,
      originCountry,
    });

    // Save to cache if tripId is provided
    if (tripId && db) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);

        if (tripSnap.exists()) {
          const currentCache = tripSnap.data().countryInfoCache || {};
          await updateDoc(tripRef, {
            countryInfoCache: {
              ...currentCache,
              [cacheKey]: info,
            },
          });
        }
      } catch (e) {
        console.warn('Failed to save country info to cache:', e);
        // Still return the info even if caching fails
      }
    }

    return {
      success: true,
      info,
      cached: false,
    };
  } catch (error) {
    console.error('Error generating country info:', error);
    return { error: 'Failed to generate country information. Please try again.' };
  }
}

// Travel Plan Generation Action
export async function generateTravelPlanAction(
  destinations: Destination[],
  originCity?: string,
  originCountry?: string,
  budget?: string,
  travelGroup?: string,
  currency?: string,
  userId?: string
): Promise<{
  success?: boolean;
  error?: string;
  plan?: GenerateTravelPlanOutput;
  creditError?: boolean;
  remainingCredits?: number;
}> {
  if (!destinations || destinations.length === 0) {
    return { error: 'At least one destination is required.' };
  }

  // Check and deduct AI credits
  if (userId) {
    const creditCheck = await canUseAIFeature(userId, 'travel_plan');
    if (!creditCheck.allowed) {
      return {
        error: 'You have run out of AI credits for this month.',
        creditError: true,
        remainingCredits: creditCheck.remainingCredits
      };
    }

    const deductResult = await deductCredits(userId, 'travel_plan');
    if (!deductResult.success) {
      return {
        error: deductResult.error || 'Failed to process credits.',
        creditError: true,
        remainingCredits: deductResult.remainingCredits
      };
    }
  }

  try {
    const plan = await generateTravelPlan({
      destinations: destinations.map(d => ({
        city: d.city,
        country: d.country,
        startDate: d.startDate,
        endDate: d.endDate,
      })),
      originCity,
      originCountry,
      budget,
      travelGroup,
      currency,
    });

    return {
      success: true,
      plan,
    };
  } catch (error) {
    console.error('Error generating travel plan:', error);
    return { error: 'Failed to generate travel plan. Please try again.' };
  }
}

// Save Travel Plan to Trip
export async function saveTravelPlanAction(
  tripId: string,
  travelPlan: TravelPlan
): Promise<{ success?: boolean; error?: string }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { travelPlan });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to save travel plan:', e);
    return { error: 'Failed to save travel plan.' };
  }
}

// Clear Travel Plan from Trip
export async function clearTravelPlanAction(
  tripId: string
): Promise<{ success?: boolean; error?: string }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { travelPlan: null });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to clear travel plan:', e);
    return { error: 'Failed to clear travel plan.' };
  }
}

// Explore Tab Actions - Top Rated Places
export async function getTopRatedPlacesAction(
  city: string,
  country: string | undefined,
  days: number,
  travelGroup: string,
  budget: string,
  tripId?: string,
  forceRefresh: boolean = false,
  userId?: string
): Promise<{
  success?: boolean;
  error?: string;
  data?: GenerateTopRatedPlacesOutput;
  cached?: boolean;
  creditError?: boolean;
  remainingCredits?: number;
}> {
  if (!city) {
    return { error: 'City name is required.' };
  }

  // Create a cache key based on inputs
  const cacheKey = `toprated_${city.toLowerCase().trim()}_${(country || 'none').toLowerCase().trim()}_${days}_${travelGroup}_${budget}`;

  // Try to get cached data from trip document if tripId is provided
  if (tripId && db && !forceRefresh) {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        const cachedData = tripData.exploreCache?.topRatedPlaces;

        if (cachedData && cachedData.cacheKey === cacheKey) {
          return {
            success: true,
            data: {
              places: cachedData.places,
              summary: cachedData.summary,
            },
            cached: true,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to check top rated places cache:', e);
      // Continue to generate fresh data
    }
  }

  // Check and deduct AI credits for fresh generation
  if (userId) {
    const creditCheck = await canUseAIFeature(userId, 'top_rated_places');
    if (!creditCheck.allowed) {
      return {
        error: 'You have run out of AI credits for this month.',
        creditError: true,
        remainingCredits: creditCheck.remainingCredits
      };
    }

    const deductResult = await deductCredits(userId, 'top_rated_places');
    if (!deductResult.success) {
      return {
        error: deductResult.error || 'Failed to process credits.',
        creditError: true,
        remainingCredits: deductResult.remainingCredits
      };
    }
  }

  try {
    const result = await generateTopRatedPlaces({
      city,
      country,
      days,
      travelGroup,
      budget,
    });

    // Add Google Maps and image search URLs
    const placesWithUrls = result.places.map(place => ({
      ...place,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`,
      imageSearchUrl: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name + ' ' + city)}`,
    }));

    const data: GenerateTopRatedPlacesOutput = {
      places: placesWithUrls,
      summary: result.summary,
    };

    // Save to cache if tripId is provided
    if (tripId && db) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);

        if (tripSnap.exists()) {
          const currentCache = tripSnap.data().exploreCache || {};
          await updateDoc(tripRef, {
            exploreCache: {
              ...currentCache,
              topRatedPlaces: {
                places: placesWithUrls,
                summary: result.summary,
                generatedAt: new Date().toISOString(),
                cacheKey,
              },
            },
          });
        }
      } catch (e) {
        console.warn('Failed to save top rated places to cache:', e);
        // Still return the data even if caching fails
      }
    }

    return {
      success: true,
      data,
      cached: false,
    };
  } catch (error) {
    console.error('Error generating top rated places:', error);
    return { error: 'Failed to generate top rated places. Please try again.' };
  }
}

// Explore Tab Actions - Top Review Places
export async function getTopReviewPlacesAction(
  city: string,
  country: string | undefined,
  days: number,
  travelGroup: string,
  budget: string,
  tripId?: string,
  forceRefresh: boolean = false,
  userId?: string
): Promise<{
  success?: boolean;
  error?: string;
  data?: GenerateTopReviewPlacesOutput;
  cached?: boolean;
  creditError?: boolean;
  remainingCredits?: number;
}> {
  if (!city) {
    return { error: 'City name is required.' };
  }

  // Create a cache key based on inputs
  const cacheKey = `topreview_${city.toLowerCase().trim()}_${(country || 'none').toLowerCase().trim()}_${days}_${travelGroup}_${budget}`;

  // Try to get cached data from trip document if tripId is provided
  if (tripId && db && !forceRefresh) {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        const cachedData = tripData.exploreCache?.topReviewPlaces;

        if (cachedData && cachedData.cacheKey === cacheKey) {
          return {
            success: true,
            data: {
              places: cachedData.places,
              summary: cachedData.summary,
            },
            cached: true,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to check top review places cache:', e);
      // Continue to generate fresh data
    }
  }

  // Check and deduct AI credits for fresh generation
  if (userId) {
    const creditCheck = await canUseAIFeature(userId, 'top_review_places');
    if (!creditCheck.allowed) {
      return {
        error: 'You have run out of AI credits for this month.',
        creditError: true,
        remainingCredits: creditCheck.remainingCredits
      };
    }

    const deductResult = await deductCredits(userId, 'top_review_places');
    if (!deductResult.success) {
      return {
        error: deductResult.error || 'Failed to process credits.',
        creditError: true,
        remainingCredits: deductResult.remainingCredits
      };
    }
  }

  try {
    const result = await generateTopReviewPlaces({
      city,
      country,
      days,
      travelGroup,
      budget,
    });

    // Add Google Maps and image search URLs
    const placesWithUrls = result.places.map(place => ({
      ...place,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`,
      imageSearchUrl: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name + ' ' + city)}`,
    }));

    const data: GenerateTopReviewPlacesOutput = {
      places: placesWithUrls,
      summary: result.summary,
    };

    // Save to cache if tripId is provided
    if (tripId && db) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);

        if (tripSnap.exists()) {
          const currentCache = tripSnap.data().exploreCache || {};
          await updateDoc(tripRef, {
            exploreCache: {
              ...currentCache,
              topReviewPlaces: {
                places: placesWithUrls,
                summary: result.summary,
                generatedAt: new Date().toISOString(),
                cacheKey,
              },
            },
          });
        }
      } catch (e) {
        console.warn('Failed to save top review places to cache:', e);
        // Still return the data even if caching fails
      }
    }

    return {
      success: true,
      data,
      cached: false,
    };
  } catch (error) {
    console.error('Error generating top review places:', error);
    return { error: 'Failed to generate top review places. Please try again.' };
  }
}

// Explore Tab Actions - Airport Transfer Guide
export async function getAirportTransferGuideAction(
  arrivalCity: string,
  arrivalCountry: string | undefined,
  accommodationAddress: string,
  travelGroup: string,
  budget: string,
  currency: string | undefined,
  tripId?: string,
  forceRefresh: boolean = false,
  userId?: string
): Promise<{
  success?: boolean;
  error?: string;
  data?: GenerateAirportTransferGuideOutput;
  cached?: boolean;
  creditError?: boolean;
  remainingCredits?: number;
}> {
  if (!arrivalCity || !accommodationAddress) {
    return { error: 'Arrival city and accommodation address are required.' };
  }

  // Create a cache key based on inputs
  const cacheKey = `transfer_${arrivalCity.toLowerCase().trim()}_${(arrivalCountry || 'none').toLowerCase().trim()}_${accommodationAddress.toLowerCase().trim()}_${travelGroup}_${budget}`;

  // Try to get cached data from trip document if tripId is provided
  if (tripId && db && !forceRefresh) {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        const cachedData = tripData.exploreCache?.airportTransfer;

        if (cachedData && cachedData.cacheKey === cacheKey) {
          return {
            success: true,
            data: {
              airportName: cachedData.airportName,
              airportCode: cachedData.airportCode,
              transferOptions: cachedData.transferOptions,
              recommendedOption: cachedData.recommendedOption,
              generalTips: cachedData.generalTips,
              importantNotes: cachedData.importantNotes,
            },
            cached: true,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to check airport transfer guide cache:', e);
      // Continue to generate fresh data
    }
  }

  // Check and deduct AI credits for fresh generation
  if (userId) {
    const creditCheck = await canUseAIFeature(userId, 'airport_transfer');
    if (!creditCheck.allowed) {
      return {
        error: 'You have run out of AI credits for this month.',
        creditError: true,
        remainingCredits: creditCheck.remainingCredits
      };
    }

    const deductResult = await deductCredits(userId, 'airport_transfer');
    if (!deductResult.success) {
      return {
        error: deductResult.error || 'Failed to process credits.',
        creditError: true,
        remainingCredits: deductResult.remainingCredits
      };
    }
  }

  try {
    const result = await generateAirportTransferGuide({
      arrivalCity,
      arrivalCountry,
      accommodationAddress,
      travelGroup,
      budget,
      currency,
    });

    const data: GenerateAirportTransferGuideOutput = {
      airportName: result.airportName,
      airportCode: result.airportCode,
      transferOptions: result.transferOptions,
      recommendedOption: result.recommendedOption,
      generalTips: result.generalTips,
      importantNotes: result.importantNotes,
    };

    // Save to cache if tripId is provided
    if (tripId && db) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);

        if (tripSnap.exists()) {
          const currentCache = tripSnap.data().exploreCache || {};
          await updateDoc(tripRef, {
            exploreCache: {
              ...currentCache,
              airportTransfer: {
                airportName: result.airportName,
                airportCode: result.airportCode,
                transferOptions: result.transferOptions,
                recommendedOption: result.recommendedOption,
                generalTips: result.generalTips,
                importantNotes: result.importantNotes,
                generatedAt: new Date().toISOString(),
                cacheKey,
              },
            },
          });
        }
      } catch (e) {
        console.warn('Failed to save airport transfer guide to cache:', e);
        // Still return the data even if caching fails
      }
    }

    return {
      success: true,
      data,
      cached: false,
    };
  } catch (error) {
    console.error('Error generating airport transfer guide:', error);
    return { error: 'Failed to generate airport transfer guide. Please try again.' };
  }
}

// Commute Planner Actions

const MAPS_COMING_SOON_MESSAGE = 'Maps and location search are coming soon.';

/**
 * Geocode an address. Temporarily disabled while maps integration is paused.
 */
export async function geocodeAddressAction(
  _address: string
): Promise<{
  success?: boolean;
  error?: string;
  location?: GeoLocation;
}> {
  return { error: MAPS_COMING_SOON_MESSAGE };
}

/**
 * Calculate distance and duration. Temporarily disabled while maps integration is paused.
 */
export async function calculateDirectionsAction(
  _origin: GeoLocation,
  _destination: GeoLocation,
  _mode: CommuteTransportMode = 'driving'
): Promise<{
  success?: boolean;
  error?: string;
  distance?: { text: string; value: number };
  duration?: { text: string; value: number };
}> {
  return { error: MAPS_COMING_SOON_MESSAGE };
}

/**
 * Calculate complete commute route from accommodation to all selected activities
 */
export async function calculateCommuteRouteAction(
  _tripId: string,
  _baseAccommodationId: string,
  _selectedActivityIds: string[]
): Promise<{
  success?: boolean;
  error?: string;
  route?: CommuteRoute;
}> {
  return { error: MAPS_COMING_SOON_MESSAGE };
}

/**
 * Generate AI-powered commute recommendations for a specific route segment
 */
export async function getCommuteRecommendationsAction(
  tripId: string,
  originItemId: string,
  destinationItemId: string,
  userId?: string
): Promise<{
  success?: boolean;
  error?: string;
  recommendation?: CommuteRecommendationOutput;
  creditError?: boolean;
  remainingCredits?: number;
}> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  // Check and deduct AI credits
  if (userId) {
    const creditCheck = await canUseAIFeature(userId, 'commute_recommendations');
    if (!creditCheck.allowed) {
      return {
        error: 'You have run out of AI credits for this month.',
        creditError: true,
        remainingCredits: creditCheck.remainingCredits
      };
    }

    const deductResult = await deductCredits(userId, 'commute_recommendations');
    if (!deductResult.success) {
      return {
        error: deductResult.error || 'Failed to process credits.',
        creditError: true,
        remainingCredits: deductResult.remainingCredits
      };
    }
  }

  try {
    // Get the trip to get city/country info
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.' };
    }

    const tripData = tripSnap.data() as Trip;
    const city = tripData.destination || tripData.destinations?.[0]?.city || 'Unknown';
    const country = tripData.destinations?.[0]?.country || 'Unknown';

    // Get wizard items
    const itemsResult = await getWizardItemsAction(tripId);
    if (!itemsResult.success || !itemsResult.items) {
      return { error: 'Failed to load itinerary items.' };
    }

    const originItem = itemsResult.items.find(item => item.id === originItemId);
    const destinationItem = itemsResult.items.find(item => item.id === destinationItemId);

    if (!originItem || !destinationItem) {
      return { error: 'Origin or destination not found.' };
    }

    // Generate commute recommendations using AI
    const result = await generateCommuteRecommendations({
      originName: originItem.placeName,
      originAddress: originItem.address,
      destinationName: destinationItem.placeName,
      destinationAddress: destinationItem.address,
      city,
      country,
    });

    return {
      success: true,
      recommendation: {
        transitRecommendation: result.transitRecommendation,
        transitSteps: result.transitSteps,
        alternativeOptions: result.alternativeOptions,
        tips: result.tips,
        estimatedCost: result.estimatedCost,
        bestTimeToTravel: result.bestTimeToTravel,
      },
    };
  } catch (error) {
    console.error('Get commute recommendations error:', error);
    return { error: 'Failed to generate commute recommendations.' };
  }
}

/**
 * Optimize route order based on activity times
 */
export async function optimizeRouteOrderAction(
  tripId: string,
  baseAccommodationId: string,
  activityIds: string[]
): Promise<{
  success?: boolean;
  error?: string;
  optimizedOrder?: string[];
  explanation?: string;
}> {
  if (activityIds.length <= 1) {
    return {
      success: true,
      optimizedOrder: activityIds,
      explanation: 'Single activity - no optimization needed.',
    };
  }

  try {
    // Get items and sort by time
    const itemsResult = await getWizardItemsAction(tripId);
    if (!itemsResult.success || !itemsResult.items) {
      return { error: 'Failed to load items.' };
    }

    // Sort by scheduled time
    const activities = itemsResult.items
      .filter(item => activityIds.includes(item.id))
      .sort((a, b) => {
        // First by date
        const dateCompare = a.dateFrom.localeCompare(b.dateFrom);
        if (dateCompare !== 0) return dateCompare;
        // Then by time
        return a.timeFrom.localeCompare(b.timeFrom);
      });

    const optimizedOrder = activities.map(a => a.id);

    return {
      success: true,
      optimizedOrder,
      explanation: 'Route optimized based on scheduled times.',
    };
  } catch (error) {
    console.error('Route optimization error:', error);
    return { error: 'Failed to optimize route.' };
  }
}

/**
 * Save commute planner settings to trip document
 */
export async function saveCommuteSettingsAction(
  tripId: string,
  settings: Partial<CommuteSettings>
): Promise<{ success?: boolean; error?: string }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      commuteSettings: {
        ...settings,
        tripId,
        lastUpdated: new Date().toISOString(),
      },
    });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to save commute settings:', e);
    return { error: 'Failed to save settings.' };
  }
}

/**
 * Copy a trip and all its associated data (wizard items, documents, folders)
 */
export async function copyTripAction(
  tripId: string,
  userId: string,
  userName: string | null
): Promise<{ success?: boolean; error?: string; newTripId?: string }> {
  if (!tripId || !db || !storage) {
    return { error: 'Missing trip ID or services not initialized.' };
  }

  try {
    // 1. Fetch source trip
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.' };
    }

    const tripData = tripSnap.data() as Trip;

    // 2. Create new trip document
    const newTripRef = doc(collection(db, 'trips'));
    const newTrip: Omit<Trip, 'id'> = {
      ...tripData,
      title: `Copy of ${tripData.title}`,
      pinned: false,
      archived: false,
    };
    // Remove the id field if it exists in tripData spread
    delete (newTrip as any).id;

    await setDoc(newTripRef, newTrip);

    // 3. Copy wizard items
    const wizardItemsQuery = query(collection(db, 'wizardItems'), where('tripId', '==', tripId));
    const wizardItemsSnap = await getDocs(wizardItemsQuery);

    for (const itemDoc of wizardItemsSnap.docs) {
      const itemData = itemDoc.data();
      await addDoc(collection(db, 'wizardItems'), {
        ...itemData,
        tripId: newTripRef.id,
        createdAt: serverTimestamp(),
      });
    }

    // 4. Copy folders (build oldId -> newId mapping for document folder references)
    const folderMapping = new Map<string, string>();
    const foldersQuery = query(collection(db, 'folders'), where('tripId', '==', tripId));
    const foldersSnap = await getDocs(foldersQuery);

    for (const folderDoc of foldersSnap.docs) {
      const folderData = folderDoc.data();
      const newFolderRef = await addDoc(collection(db, 'folders'), {
        ...folderData,
        tripId: newTripRef.id,
        createdAt: serverTimestamp(),
        createdBy: { uid: userId, name: userName },
      });
      folderMapping.set(folderDoc.id, newFolderRef.id);
    }

    // 5. Copy documents and their files in Firebase Storage
    const documentsQuery = query(collection(db, 'documents'), where('tripId', '==', tripId));
    const documentsSnap = await getDocs(documentsQuery);

    for (const docSnap of documentsSnap.docs) {
      const docData = docSnap.data();

      try {
        // Download file from existing URL
        const response = await fetch(docData.url);
        if (!response.ok) {
          console.warn(`Failed to fetch file for document ${docData.name}, skipping...`);
          continue;
        }
        const blob = await response.blob();

        // Upload to new path
        const newPath = `households/${tripData.householdId}/trips/${newTripRef.id}/${Date.now()}_${docData.name}`;
        const newStorageRef = ref(storage, newPath);

        // Convert blob to ArrayBuffer for uploadBytes
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        await uploadBytes(newStorageRef, uint8Array);
        const newUrl = await getDownloadURL(newStorageRef);

        // Create new document metadata
        await addDoc(collection(db, 'documents'), {
          ...docData,
          tripId: newTripRef.id,
          url: newUrl,
          uploadDate: serverTimestamp(),
          uploader: { uid: userId, name: userName },
        });
      } catch (fileError) {
        console.warn(`Failed to copy file ${docData.name}:`, fileError);
        // Continue with other documents even if one fails
      }
    }

    revalidatePath('/dashboard');
    return { success: true, newTripId: newTripRef.id };
  } catch (e) {
    console.error('Failed to copy trip:', e);
    return { error: 'Failed to copy trip. Please try again.' };
  }
}

// ============================================
// EXPENSE TRACKING ACTIONS
// ============================================

export async function addExpenseAction(
  tripId: string,
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<{ success?: boolean; expense?: Expense; error?: string }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.' };
    }

    const tripData = tripSnap.data();
    const existingExpenses: Expense[] = tripData.expenses || [];

    const newExpense: Expense = {
      ...expense,
      id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    await updateDoc(tripRef, {
      expenses: [...existingExpenses, newExpense]
    });

    revalidatePath(`/trip/${tripId}`);
    return { success: true, expense: newExpense };
  } catch (e) {
    console.error('Failed to add expense:', e);
    return { error: 'Failed to add expense.' };
  }
}

export async function updateExpenseAction(
  tripId: string,
  expenseId: string,
  updates: Partial<Expense>
): Promise<{ success?: boolean; error?: string }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.' };
    }

    const tripData = tripSnap.data();
    const expenses: Expense[] = tripData.expenses || [];

    const updatedExpenses = expenses.map(exp =>
      exp.id === expenseId ? { ...exp, ...updates } : exp
    );

    await updateDoc(tripRef, { expenses: updatedExpenses });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to update expense:', e);
    return { error: 'Failed to update expense.' };
  }
}

export async function deleteExpenseAction(
  tripId: string,
  expenseId: string
): Promise<{ success?: boolean; error?: string }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return { error: 'Trip not found.' };
    }

    const tripData = tripSnap.data();
    const expenses: Expense[] = tripData.expenses || [];

    const updatedExpenses = expenses.filter(exp => exp.id !== expenseId);

    await updateDoc(tripRef, { expenses: updatedExpenses });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to delete expense:', e);
    return { error: 'Failed to delete expense.' };
  }
}

export async function analyzeReceiptAction(
  imageBase64: string,
  mimeType: string,
  tripCurrency: string,
  availableCategories: { id: string; name: string }[],
  userId?: string
): Promise<{
  success?: boolean;
  data?: ReceiptAnalysisOutput;
  error?: string;
  creditError?: boolean;
  remainingCredits?: number;
}> {
  // Check and deduct AI credits
  if (userId) {
    const creditCheck = await canUseAIFeature(userId, 'receipt_analysis');
    if (!creditCheck.allowed) {
      return {
        error: 'You have run out of AI credits for this month.',
        creditError: true,
        remainingCredits: creditCheck.remainingCredits
      };
    }

    const deductResult = await deductCredits(userId, 'receipt_analysis');
    if (!deductResult.success) {
      return {
        error: deductResult.error || 'Failed to process credits.',
        creditError: true,
        remainingCredits: deductResult.remainingCredits
      };
    }
  }

  try {
    const result = await analyzeReceipt({
      imageBase64,
      mimeType,
      tripCurrency,
      availableCategories,
    });

    return { success: true, data: result };
  } catch (e) {
    console.error('Failed to analyze receipt:', e);
    return { error: 'Failed to analyze receipt.' };
  }
}

export async function uploadReceiptAction(
  tripId: string,
  householdId: string,
  fileName: string,
  fileBase64: string,
  mimeType: string,
  uploaderInfo?: { uid: string; name: string | null }
): Promise<{ success?: boolean; url?: string; documentId?: string; error?: string }> {
  if (!storage || !tripId || !householdId) {
    return { error: 'Storage not initialized or missing IDs.' };
  }

  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(fileBase64, 'base64');

    // Create storage path
    const storagePath = `households/${householdId}/trips/${tripId}/receipts/${Date.now()}_${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    await uploadBytes(storageRef, buffer, { contentType: mimeType });
    const downloadUrl = await getDownloadURL(storageRef);

    // Also add to Family Binder (documents collection) in "Expenses" folder
    if (db) {
      try {
        // Check if "Expenses" folder exists, if not create it
        const foldersQuery = query(
          collection(db, 'folders'),
          where('tripId', '==', tripId),
          where('name', '==', 'Expenses')
        );
        const foldersSnapshot = await getDocs(foldersQuery);

        if (foldersSnapshot.empty) {
          // Create the Expenses folder
          await addDoc(collection(db, 'folders'), {
            tripId,
            householdId,
            name: 'Expenses',
            createdAt: serverTimestamp(),
            createdBy: uploaderInfo || { uid: 'system', name: 'System' }
          });
        }

        // Add document entry for the receipt
        const fileSize = buffer.length;
        const docRef = await addDoc(collection(db, 'documents'), {
          tripId,
          householdId,
          name: fileName,
          url: downloadUrl,
          folder: 'Expenses',
          uploadDate: serverTimestamp(),
          uploader: uploaderInfo || { uid: 'system', name: 'System' },
          size: fileSize > 1024 * 1024
            ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB`
            : `${(fileSize / 1024).toFixed(2)} KB`,
          assignedTo: 'all',
          assignedToName: 'All',
          isReceipt: true
        });

        return { success: true, url: downloadUrl, documentId: docRef.id };
      } catch (docError) {
        console.error('Failed to add receipt to family binder:', docError);
        // Still return success since the file was uploaded
        return { success: true, url: downloadUrl };
      }
    }

    return { success: true, url: downloadUrl };
  } catch (e) {
    console.error('Failed to upload receipt:', e);
    return { error: 'Failed to upload receipt.' };
  }
}

// ============================================
// Checklist and Notes Actions
// ============================================

/**
 * Toggle a checklist item's completed status for an activity
 */
export async function toggleActivityChecklistItemAction(
  tripId: string,
  itemId: string,
  checklistItemId: string,
  completed: boolean
) {
  if (!tripId || !itemId || !db) {
    return { error: 'Missing required parameters or database not initialized.' };
  }

  try {
    const itemRef = doc(db, 'wizardItems', itemId);
    const itemDoc = await getDoc(itemRef);

    if (!itemDoc.exists()) {
      return { error: 'Activity not found.' };
    }

    const data = itemDoc.data() as WizardItineraryItem;
    const checklist = data.checklist || [];

    const updatedChecklist = checklist.map((item) =>
      item.id === checklistItemId ? { ...item, completed } : item
    );

    await updateDoc(itemRef, { checklist: updatedChecklist });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to toggle checklist item:', e);
    return { error: 'Failed to toggle checklist item.' };
  }
}

/**
 * Update trip-level notes
 */
export async function updateTripNotesAction(
  tripId: string,
  notes: string
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { tripNotes: notes });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to update trip notes:', e);
    return { error: 'Failed to update trip notes.' };
  }
}

/**
 * Update trip-level checklist
 */
export async function updateTripChecklistAction(
  tripId: string,
  checklist: ChecklistItem[]
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { tripChecklist: checklist });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to update trip checklist:', e);
    return { error: 'Failed to update trip checklist.' };
  }
}

/**
 * Toggle a trip-level checklist item's completed status
 */
export async function toggleTripChecklistItemAction(
  tripId: string,
  checklistItemId: string,
  completed: boolean
) {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
      return { error: 'Trip not found.' };
    }

    const data = tripDoc.data() as Trip;
    const checklist = data.tripChecklist || [];

    const updatedChecklist = checklist.map((item) =>
      item.id === checklistItemId ? { ...item, completed } : item
    );

    await updateDoc(tripRef, { tripChecklist: updatedChecklist });
    revalidatePath(`/trip/${tripId}`);
    return { success: true };
  } catch (e) {
    console.error('Failed to toggle trip checklist item:', e);
    return { error: 'Failed to toggle trip checklist item.' };
  }
}

// Mapbox City Search Action

export interface CitySearchResult {
  id: string;
  city: string;
  country: string;
  fullName: string;
}

/**
 * Search for cities. Temporarily disabled while maps integration is paused.
 */
export async function searchCitiesAction(
  _query: string
): Promise<{
  success?: boolean;
  error?: string;
  results?: CitySearchResult[];
  comingSoon?: boolean;
}> {
  return { error: MAPS_COMING_SOON_MESSAGE, comingSoon: true, results: [] };
}

// ============================================
// TRIP SETTINGS ACTIONS
// ============================================

/**
 * Update trip settings (title, dates, destination currencies)
 */
export async function updateTripSettingsAction(
  tripId: string,
  settings: {
    title?: string;
    startDate?: string;
    endDate?: string;
    destinationCurrencies?: DestinationCurrency[];
  }
): Promise<{ success?: boolean; error?: string }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
      return { error: 'Trip not found.' };
    }

    const updates: Partial<Trip> = {};

    if (settings.title !== undefined) {
      updates.title = settings.title;
    }

    if (settings.startDate !== undefined) {
      updates.startDate = settings.startDate;
    }

    if (settings.endDate !== undefined) {
      updates.endDate = settings.endDate;
    }

    if (settings.destinationCurrencies !== undefined) {
      updates.destinationCurrencies = settings.destinationCurrencies;
    }

    await updateDoc(tripRef, updates);
    revalidatePath(`/trip/${tripId}`);
    revalidatePath('/dashboard');

    return { success: true };
  } catch (e) {
    console.error('Failed to update trip settings:', e);
    return { error: 'Failed to update trip settings.' };
  }
}

/**
 * Fetch and cache exchange rates for a trip
 */
export async function fetchAndCacheExchangeRatesAction(
  tripId: string,
  baseCurrency: string,
  targetCurrencies: string[]
): Promise<{ success?: boolean; rates?: ExchangeRateCache; error?: string }> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  if (!baseCurrency || targetCurrencies.length === 0) {
    return { error: 'Base currency and target currencies are required.' };
  }

  try {
    // Fetch exchange rates from API
    const rates = await fetchExchangeRates(baseCurrency, targetCurrencies);

    // Cache in trip document
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { exchangeRates: rates });

    revalidatePath(`/trip/${tripId}`);

    return { success: true, rates };
  } catch (e) {
    console.error('Failed to fetch exchange rates:', e);
    return { error: e instanceof Error ? e.message : 'Failed to fetch exchange rates.' };
  }
}

/**
 * Update user's photoURL in all their households
 * Called after a user uploads a new profile photo
 */
export async function updateMemberPhotoInHouseholdsAction(
  userId: string,
  newPhotoURL: string | null
): Promise<{ success?: boolean; error?: string }> {
  if (!userId || !db) {
    return { error: 'Missing user ID or database not initialized.' };
  }

  try {
    // Get user document to find all their households
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { error: 'User not found.' };
    }

    const userData = userSnap.data();
    // Support both new householdIds array and legacy householdId field
    let householdIds: string[] = userData.householdIds || [];
    if (householdIds.length === 0 && userData.householdId) {
      householdIds = [userData.householdId];
    }

    if (householdIds.length === 0) {
      return { success: true }; // No households to update
    }

    // Update photoURL in all households
    const batch = writeBatch(db);
    let updatedCount = 0;

    for (const householdId of householdIds) {
      const householdRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdRef);

      if (householdSnap.exists()) {
        const householdData = householdSnap.data();
        const members: HouseholdMember[] = householdData.members || [];

        // Find and update the member's photoURL
        let memberFound = false;
        const updatedMembers = members.map((member) => {
          if (member.uid === userId) {
            memberFound = true;
            return { ...member, photoURL: newPhotoURL };
          }
          return member;
        });

        if (memberFound) {
          batch.update(householdRef, { members: updatedMembers });
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    // Revalidate all relevant paths
    revalidatePath('/household');
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    // Revalidate all trip pages (using layout revalidation)
    revalidatePath('/trip', 'layout');

    return { success: true };
  } catch (error) {
    console.error('Failed to update member photo in households:', error);
    return { error: 'Failed to sync profile photo across travel groups.' };
  }
}

// ============================================================================
// Route Planner Actions
// ============================================================================

/**
 * Calculate route with geometry. Temporarily disabled while maps integration is paused.
 */
export async function calculateRouteWithGeometryAction(
  _origin: GeoLocation,
  _destination: GeoLocation,
  _mode: CommuteTransportMode = 'driving'
): Promise<{
  success?: boolean;
  error?: string;
  distance?: { text: string; value: number };
  duration?: { text: string; value: number };
  geometry?: { coordinates: [number, number][] };
}> {
  return { error: MAPS_COMING_SOON_MESSAGE };
}

/**
 * Calculate multi-point route. Temporarily disabled while maps integration is paused.
 */
export async function calculateMultiPointRouteAction(
  _tripId: string,
  _originId: string,
  _waypointIds: string[],
  _segmentModes: Record<string, CommuteTransportMode>
): Promise<{
  success?: boolean;
  error?: string;
  route?: RoutePlan;
}> {
  return { error: MAPS_COMING_SOON_MESSAGE };
}

/**
 * Sort activities by distance. Temporarily disabled while maps integration is paused.
 */
export async function sortActivitiesByDistanceAction(
  _tripId: string,
  _originId: string,
  _activityIds: string[],
  _order: 'nearest' | 'farthest'
): Promise<{
  success?: boolean;
  error?: string;
  sortedIds?: string[];
  distances?: Record<string, { value: number; text: string }>;
}> {
  return { error: MAPS_COMING_SOON_MESSAGE };
}

/**
 * Batch update activity times
 */
export async function batchUpdateActivityTimesAction(
  tripId: string,
  updates: Array<{
    itemId: string;
    timeFrom: string;
    timeTo: string;
    dateFrom?: string;
    dateTo?: string;
  }>
): Promise<{
  success?: boolean;
  error?: string;
  updatedCount?: number;
}> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  if (!updates || updates.length === 0) {
    return { error: 'No updates provided.' };
  }

  try {
    const batch = writeBatch(db);

    for (const update of updates) {
      const itemRef = doc(db, 'wizardItems', update.itemId);
      const updateData: Record<string, string> = {
        timeFrom: update.timeFrom,
        timeTo: update.timeTo,
      };

      if (update.dateFrom) {
        updateData.dateFrom = update.dateFrom;
      }
      if (update.dateTo) {
        updateData.dateTo = update.dateTo;
      }

      batch.update(itemRef, updateData);
    }

    await batch.commit();
    revalidatePath(`/trip/${tripId}`);

    return { success: true, updatedCount: updates.length };
  } catch (error) {
    console.error('Batch update activity times error:', error);
    return { error: 'Failed to update activity times.' };
  }
}

/**
 * Save or update a route plan for a trip
 */
export async function saveRoutePlanAction(
  tripId: string,
  route: RoutePlan
): Promise<{
  success?: boolean;
  error?: string;
  routeId?: string;
}> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const routeRef = doc(db, 'trips', tripId, 'routes', route.id);

    // Serialize the route for Firestore (flatten all nested objects)
    const routeData = {
      id: route.id,
      tripId: route.tripId,
      originId: route.originId,
      waypointIds: route.waypointIds,
      totalDistanceText: route.totalDistance.text,
      totalDistanceValue: route.totalDistance.value,
      totalDurationText: route.totalDuration.text,
      totalDurationValue: route.totalDuration.value,
      sortOrder: route.sortOrder,
      generatedAt: route.generatedAt,
      updatedAt: new Date().toISOString(),
      segments: route.segments.map(seg => ({
        id: seg.id,
        fromId: seg.from.itemId,
        fromName: seg.from.name,
        fromLat: seg.from.location.lat,
        fromLng: seg.from.location.lng,
        fromAddress: seg.from.location.formattedAddress || '',
        fromScheduledDate: seg.from.scheduledTime?.date || '',
        fromScheduledTimeFrom: seg.from.scheduledTime?.timeFrom || '',
        fromScheduledTimeTo: seg.from.scheduledTime?.timeTo || '',
        toId: seg.to.itemId,
        toName: seg.to.name,
        toLat: seg.to.location.lat,
        toLng: seg.to.location.lng,
        toAddress: seg.to.location.formattedAddress || '',
        toScheduledDate: seg.to.scheduledTime?.date || '',
        toScheduledTimeFrom: seg.to.scheduledTime?.timeFrom || '',
        toScheduledTimeTo: seg.to.scheduledTime?.timeTo || '',
        transportMode: seg.transportMode,
        distanceText: seg.distance.text,
        distanceValue: seg.distance.value,
        durationText: seg.duration.text,
        durationValue: seg.duration.value,
        // Store geometry as JSON string to avoid nested arrays issue
        geometryJson: seg.geometry?.coordinates ? JSON.stringify(seg.geometry.coordinates) : '',
      })),
    };

    await setDoc(routeRef, routeData);
    revalidatePath(`/trip/${tripId}`);

    return { success: true, routeId: route.id };
  } catch (error) {
    console.error('Save route plan error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to save route plan: ${errorMessage}` };
  }
}

/**
 * Get saved route plan for a trip
 */
export async function getRoutePlanAction(
  tripId: string
): Promise<{
  success?: boolean;
  error?: string;
  route?: RoutePlan | null;
}> {
  if (!tripId || !db) {
    return { error: 'Missing trip ID or database not initialized.' };
  }

  try {
    const routesRef = collection(db, 'trips', tripId, 'routes');
    const q = query(routesRef, orderBy('generatedAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: true, route: null };
    }

    const routeDoc = snapshot.docs[0];
    const data = routeDoc.data();

    // Reconstruct the route from Firestore data (matching flattened structure)
    const route: RoutePlan = {
      id: data.id,
      tripId: data.tripId,
      originId: data.originId,
      waypointIds: data.waypointIds,
      segments: data.segments.map((seg: {
        id: string;
        fromId: string;
        fromName: string;
        fromLat: number;
        fromLng: number;
        fromAddress?: string;
        fromScheduledDate?: string;
        fromScheduledTimeFrom?: string;
        fromScheduledTimeTo?: string;
        toId: string;
        toName: string;
        toLat: number;
        toLng: number;
        toAddress?: string;
        toScheduledDate?: string;
        toScheduledTimeFrom?: string;
        toScheduledTimeTo?: string;
        transportMode: CommuteTransportMode;
        distanceText: string;
        distanceValue: number;
        durationText: string;
        durationValue: number;
        geometryJson?: string;
      }) => {
        // Parse geometry from JSON string
        let geometryCoords: [number, number][] | undefined;
        if (seg.geometryJson) {
          try {
            geometryCoords = JSON.parse(seg.geometryJson);
          } catch {
            geometryCoords = undefined;
          }
        }

        return {
          id: seg.id,
          from: {
            id: `wp_${seg.fromId}`,
            itemId: seg.fromId,
            name: seg.fromName,
            location: {
              lat: seg.fromLat,
              lng: seg.fromLng,
              formattedAddress: seg.fromAddress || ''
            },
            order: 0,
            scheduledTime: seg.fromScheduledDate ? {
              date: seg.fromScheduledDate,
              timeFrom: seg.fromScheduledTimeFrom || '',
              timeTo: seg.fromScheduledTimeTo || '',
            } : undefined,
          },
          to: {
            id: `wp_${seg.toId}`,
            itemId: seg.toId,
            name: seg.toName,
            location: {
              lat: seg.toLat,
              lng: seg.toLng,
              formattedAddress: seg.toAddress || ''
            },
            order: 0,
            scheduledTime: seg.toScheduledDate ? {
              date: seg.toScheduledDate,
              timeFrom: seg.toScheduledTimeFrom || '',
              timeTo: seg.toScheduledTimeTo || '',
            } : undefined,
          },
          transportMode: seg.transportMode,
          distance: { text: seg.distanceText, value: seg.distanceValue },
          duration: { text: seg.durationText, value: seg.durationValue },
          geometry: geometryCoords && geometryCoords.length > 0
            ? { coordinates: geometryCoords }
            : undefined,
        };
      }),
      totalDistance: {
        text: data.totalDistanceText || data.totalDistance?.text || '',
        value: data.totalDistanceValue || data.totalDistance?.value || 0
      },
      totalDuration: {
        text: data.totalDurationText || data.totalDuration?.text || '',
        value: data.totalDurationValue || data.totalDuration?.value || 0
      },
      sortOrder: data.sortOrder,
      generatedAt: data.generatedAt,
    };

    return { success: true, route };
  } catch (error) {
    console.error('Get route plan error:', error);
    return { error: 'Failed to get route plan.' };
  }
}

// ============================================
// DAY ROUTE PLANNER ACTIONS
// ============================================

interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  location?: GeoLocation;
}

/**
 * Search for places. Temporarily disabled while maps integration is paused.
 */
export async function searchPlacesAction(
  _query: string,
  _proximity?: { lat: number; lng: number }
): Promise<{
  success?: boolean;
  error?: string;
  results?: PlaceSearchResult[];
  comingSoon?: boolean;
}> {
  return { error: MAPS_COMING_SOON_MESSAGE, comingSoon: true, results: [] };
}

/**
 * Calculate optimized route. Temporarily disabled while maps integration is paused.
 */
export async function calculateOptimizedRouteAction(
  _tripId: string,
  _originId: string,
  _places: Array<{
    id: string;
    name: string;
    address: string;
    location?: GeoLocation;
    visitDuration: number;
    isExistingActivity: boolean;
    existingActivityId?: string;
    category?: RoutePlannerPlaceCategory;
    entranceFee?: number;
    currency?: string;
  }>,
  _sortStrategy: 'nearest' | 'farthest',
  _startTime: string,
  _options?: {
    autoInsertMeals?: boolean;
    defaultCurrency?: string;
  }
): Promise<{
  success?: boolean;
  error?: string;
  results?: {
    id: string;
    tripId: string;
    originHotel: {
      id: string;
      name: string;
      address: string;
      location: GeoLocation;
    };
    items: Array<{
      place: {
        id: string;
        name: string;
        address: string;
        location?: GeoLocation;
        visitDuration: number;
        isExistingActivity: boolean;
        existingActivityId?: string;
        category?: RoutePlannerPlaceCategory;
        entranceFee?: number;
        currency?: string;
        isMealStop?: boolean;
        mealType?: 'lunch' | 'dinner';
      };
      orderNumber: number;
      distanceFromPrevious: { text: string; value: number };
      travelTimeFromPrevious: { text: string; value: number };
      estimatedArrival: string;
      estimatedDeparture: string;
      transportMode: CommuteTransportMode;
      isTimeEdited?: boolean;
    }>;
    totalDistance: { text: string; value: number };
    totalTravelTime: { text: string; value: number };
    totalVisitTime: number;
    totalEntranceFees: number;
    currency?: string;
    sortStrategy: 'nearest' | 'farthest' | 'manual';
    startTime: string;
    generatedAt: string;
  };
}> {
  return { error: MAPS_COMING_SOON_MESSAGE };
}
