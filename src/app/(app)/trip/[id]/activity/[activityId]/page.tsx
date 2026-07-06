import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Trip } from '@/types';
import { notFound } from 'next/navigation';
import { getHousehold } from '@/lib/get-household';
import { getWizardItemByIdAction } from '@/lib/actions';
import ViewActivityClient from './client';

export const dynamic = 'force-dynamic';

async function getTrip(id: string): Promise<Trip | null> {
  if (!db) return null;
  const docRef = doc(db, 'trips', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const tripData = { id: docSnap.id, ...docSnap.data() } as Trip;
    tripData.itinerary = JSON.parse(JSON.stringify(tripData.itinerary || []));
    if (tripData.documents) {
      tripData.documents = JSON.parse(JSON.stringify(tripData.documents));
    }
    return tripData;
  }
  return null;
}

export default async function ViewActivityPage({ params }: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  const { id, activityId } = await params;
  const trip = await getTrip(id);

  if (!trip) {
    notFound();
  }

  const householdData = await getHousehold(trip.householdId);

  if (!householdData) {
    notFound();
  }

  // Fetch the activity to view
  const activityResult = await getWizardItemByIdAction(id, activityId);

  if (!activityResult.item) {
    notFound();
  }

  // Convert to plain JSON
  const household = JSON.parse(JSON.stringify(householdData));
  const plainTrip = JSON.parse(JSON.stringify(trip));
  const plainActivity = JSON.parse(JSON.stringify(activityResult.item));

  return (
    <ViewActivityClient
      trip={plainTrip}
      household={household}
      activity={plainActivity}
    />
  );
}
