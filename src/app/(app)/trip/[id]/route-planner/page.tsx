import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Trip } from '@/types';
import { notFound } from 'next/navigation';
import { getHousehold } from '@/lib/get-household';
import { getWizardItemsAction } from '@/lib/actions';
import RoutePlannerClient from './client';

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

export default async function RoutePlannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);

  if (!trip) {
    notFound();
  }

  const householdData = await getHousehold(trip.householdId);

  if (!householdData) {
    notFound();
  }

  // Fetch existing wizard items
  const wizardItemsResult = await getWizardItemsAction(id);
  const wizardItems = wizardItemsResult.items || [];

  // Convert to plain JSON
  const household = JSON.parse(JSON.stringify(householdData));
  const plainTrip = JSON.parse(JSON.stringify(trip));
  const plainWizardItems = JSON.parse(JSON.stringify(wizardItems));

  return (
    <RoutePlannerClient
      trip={plainTrip}
      household={household}
      wizardItems={plainWizardItems}
      exchangeRates={plainTrip.exchangeRates}
    />
  );
}
