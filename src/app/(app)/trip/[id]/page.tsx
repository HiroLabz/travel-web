import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Trip } from '@/types';
import TripClient from '@/components/trip-client';
import { notFound } from 'next/navigation';
import { getHousehold } from '@/lib/get-household';

// Force dynamic rendering to avoid build-time Firebase initialization issues
export const dynamic = 'force-dynamic';

async function getTrip(id: string): Promise<Trip | null> {
  if (!db) return null;
  const docRef = doc(db, 'trips', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const tripData = { id: docSnap.id, ...docSnap.data() } as Trip;
    // Ensure nested objects are plain
    tripData.itinerary = JSON.parse(JSON.stringify(tripData.itinerary || []));
    if (tripData.documents) {
        tripData.documents = JSON.parse(JSON.stringify(tripData.documents));
    }
    return tripData;
  }
  return null;
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTrip(id);

  if (!trip) {
    notFound();
  }

  const householdData = await getHousehold(trip.householdId);

  if (!householdData) {
      notFound();
  }

  // Convert Firestore Timestamps and other complex objects to plain JSON
  const household = JSON.parse(JSON.stringify(householdData));
  const plainTrip = JSON.parse(JSON.stringify(trip));


  return <TripClient trip={plainTrip} household={household} />;
}
