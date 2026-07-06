import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { OfflineTripConfig, CachedFile, SyncQueueItem } from '@/types/offline';
import { DB_NAME, DB_VERSION } from '@/types/offline';

interface WanderNestDB extends DBSchema {
  offlineTrips: {
    key: string; // tripId
    value: OfflineTripConfig;
    indexes: { 'by-sync-status': string };
  };
  cachedFiles: {
    key: string; // document ID
    value: CachedFile;
    indexes: { 'by-trip': string };
  };
  syncQueue: {
    key: string; // UUID
    value: SyncQueueItem;
    indexes: { 'by-status': string; 'by-timestamp': string };
  };
}

let dbPromise: Promise<IDBPDatabase<WanderNestDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<WanderNestDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (!dbPromise) {
    dbPromise = openDB<WanderNestDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Offline trips store
        if (!db.objectStoreNames.contains('offlineTrips')) {
          const tripStore = db.createObjectStore('offlineTrips', { keyPath: 'tripId' });
          tripStore.createIndex('by-sync-status', 'syncStatus');
        }

        // Cached files store
        if (!db.objectStoreNames.contains('cachedFiles')) {
          const fileStore = db.createObjectStore('cachedFiles', { keyPath: 'id' });
          fileStore.createIndex('by-trip', 'tripId');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

// Helper functions for offline trips
export async function getOfflineTripConfig(tripId: string): Promise<OfflineTripConfig | undefined> {
  const db = await getOfflineDB();
  return db.get('offlineTrips', tripId);
}

export async function getAllOfflineTrips(): Promise<OfflineTripConfig[]> {
  const db = await getOfflineDB();
  return db.getAll('offlineTrips');
}

export async function saveOfflineTripConfig(config: OfflineTripConfig): Promise<void> {
  const db = await getOfflineDB();
  await db.put('offlineTrips', config);
}

export async function deleteOfflineTripConfig(tripId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('offlineTrips', tripId);
}

// Helper functions for cached files
export async function getCachedFile(documentId: string): Promise<CachedFile | undefined> {
  const db = await getOfflineDB();
  return db.get('cachedFiles', documentId);
}

export async function getCachedFilesByTrip(tripId: string): Promise<CachedFile[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('cachedFiles', 'by-trip', tripId);
}

export async function saveCachedFile(file: CachedFile): Promise<void> {
  const db = await getOfflineDB();
  await db.put('cachedFiles', file);
}

export async function deleteCachedFile(documentId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('cachedFiles', documentId);
}

export async function deleteCachedFilesByTrip(tripId: string): Promise<void> {
  const db = await getOfflineDB();
  const files = await db.getAllFromIndex('cachedFiles', 'by-trip', tripId);
  const tx = db.transaction('cachedFiles', 'readwrite');
  await Promise.all([
    ...files.map(file => tx.store.delete(file.id)),
    tx.done
  ]);
}

// Helper functions for sync queue
export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getOfflineDB();
  await db.put('syncQueue', item);
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('syncQueue', 'by-status', 'pending');
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getOfflineDB();
  await db.put('syncQueue', item);
}

export async function deleteSyncQueueItem(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('syncQueue', id);
}

// Storage usage calculation
export async function getStorageUsage(): Promise<{ usedBytes: number; fileCount: number }> {
  const db = await getOfflineDB();
  const files = await db.getAll('cachedFiles');
  const usedBytes = files.reduce((acc, file) => acc + file.sizeBytes, 0);
  return { usedBytes, fileCount: files.length };
}

// Clear all offline data (for logout)
export async function clearAllOfflineData(): Promise<void> {
  const db = await getOfflineDB();
  const tx1 = db.transaction('offlineTrips', 'readwrite');
  const tx2 = db.transaction('cachedFiles', 'readwrite');
  const tx3 = db.transaction('syncQueue', 'readwrite');

  await Promise.all([
    tx1.store.clear(),
    tx1.done,
    tx2.store.clear(),
    tx2.done,
    tx3.store.clear(),
    tx3.done,
  ]);
}
