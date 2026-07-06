import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Household } from '@/types';
import { cache } from 'react';

export const getHousehold = cache(async (householdId: string): Promise<Household | null> => {
    if (!db) return null;
    
    const docRef = doc(db, 'households', householdId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Household;
    }
    
    return null;
});
