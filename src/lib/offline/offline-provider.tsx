'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { getAllOfflineTrips, clearAllOfflineData } from './db';
import {
  downloadTripFiles,
  clearTripOfflineData,
  getStorageQuota,
} from './sync-service';
import type { OfflineTripConfig, SyncEvent, FileDownloadStatus } from '@/types/offline';

interface TripSyncState {
  isSyncing: boolean;
  currentFile?: string;
  fileStatuses: Map<string, FileDownloadStatus>;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
}

interface OfflineContextType {
  isOnline: boolean;
  offlineTrips: Map<string, OfflineTripConfig>;
  enableOfflineMode: (tripId: string) => Promise<void>;
  disableOfflineMode: (tripId: string) => Promise<void>;
  syncTrip: (tripId: string) => Promise<void>;
  isTripOffline: (tripId: string) => boolean;
  getSyncStatus: (tripId: string) => OfflineTripConfig['syncStatus'] | null;
  getTripConfig: (tripId: string) => OfflineTripConfig | undefined;
  getTripSyncState: (tripId: string) => TripSyncState | undefined;
  storageInfo: { used: number; quota: number };
  syncEvents: SyncEvent[];
  retrySync: (tripId: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  refreshOfflineTrips: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineTrips, setOfflineTrips] = useState<Map<string, OfflineTripConfig>>(
    new Map()
  );
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 0 });
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [tripSyncStates, setTripSyncStates] = useState<Map<string, TripSyncState>>(
    new Map()
  );
  const syncingTripsRef = useRef<Set<string>>(new Set());
  const initialSyncDoneRef = useRef(false);

  // Load offline trips from IndexedDB
  const loadOfflineTrips = useCallback(async () => {
    try {
      const trips = await getAllOfflineTrips();
      setOfflineTrips(new Map(trips.map(t => [t.tripId, t])));
    } catch (error) {
      console.error('Failed to load offline trips:', error);
    }
  }, []);

  // Update storage info
  const updateStorageInfo = useCallback(async () => {
    try {
      const info = await getStorageQuota();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
  }, []);

  // Handle sync events and update state
  const handleSyncEvent = useCallback((tripId: string, event: SyncEvent) => {
    setSyncEvents(prev => [...prev.slice(-50), event]);

    setTripSyncStates(prev => {
      const newStates = new Map(prev);
      const currentState: TripSyncState = newStates.get(tripId) || {
        isSyncing: false,
        currentFile: undefined,
        fileStatuses: new Map(),
        totalFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
      };

      switch (event.type) {
        case 'sync-started':
          newStates.set(tripId, {
            isSyncing: true,
            currentFile: undefined,
            fileStatuses: new Map(),
            totalFiles: 0,
            completedFiles: 0,
            failedFiles: 0,
          });
          break;

        case 'file-downloading':
          if (event.fileStatus) {
            currentState.fileStatuses.set(event.fileStatus.id, event.fileStatus);
            currentState.currentFile = event.fileStatus.fileName;
            currentState.totalFiles = event.totalFiles || currentState.totalFiles;
          }
          newStates.set(tripId, { ...currentState });
          break;

        case 'file-downloaded':
          if (event.fileStatus) {
            currentState.fileStatuses.set(event.fileStatus.id, event.fileStatus);
            currentState.completedFiles = (event.completedFiles || 0) - currentState.failedFiles;
            currentState.totalFiles = event.totalFiles || currentState.totalFiles;
          }
          newStates.set(tripId, { ...currentState });
          break;

        case 'file-failed':
          if (event.fileStatus) {
            currentState.fileStatuses.set(event.fileStatus.id, event.fileStatus);
            currentState.failedFiles++;
            currentState.totalFiles = event.totalFiles || currentState.totalFiles;
          }
          newStates.set(tripId, { ...currentState });
          break;

        case 'sync-completed':
        case 'sync-error':
          currentState.isSyncing = false;
          currentState.currentFile = undefined;
          newStates.set(tripId, { ...currentState });
          break;
      }

      return newStates;
    });
  }, []);

  // Initialize online status and load offline trips
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline trips from IndexedDB
    loadOfflineTrips();
    updateStorageInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadOfflineTrips, updateStorageInfo]);

  // Auto-sync trips that need syncing on initial load
  useEffect(() => {
    // Only run once after initial load, when we have offline trips loaded
    if (!isOnline || offlineTrips.size === 0 || initialSyncDoneRef.current) return;

    initialSyncDoneRef.current = true;

    // Find trips that need syncing (pending, syncing, or synced but no files)
    const tripsNeedingSync = Array.from(offlineTrips.values()).filter(
      trip => trip.syncStatus === 'pending' ||
              trip.syncStatus === 'syncing' ||
              (trip.syncStatus === 'synced' && trip.downloadedFiles === 0)
    );

    if (tripsNeedingSync.length === 0) {
      console.log('[Offline Provider] No trips need syncing');
      return;
    }

    // Auto-sync each trip that needs it (with deduplication)
    tripsNeedingSync.forEach(trip => {
      if (syncingTripsRef.current.has(trip.tripId)) {
        console.log(`[Offline Provider] Trip ${trip.tripId} already syncing, skipping`);
        return;
      }

      console.log(`[Offline Provider] Auto-syncing trip: ${trip.tripId} (status: ${trip.syncStatus})`);
      syncingTripsRef.current.add(trip.tripId);

      downloadTripFiles(trip.tripId, event => {
        handleSyncEvent(trip.tripId, event);
      })
        .then(() => {
          console.log(`[Offline Provider] Auto-sync completed for trip ${trip.tripId}`);
          loadOfflineTrips();
          updateStorageInfo();
        })
        .catch(err => {
          console.error(`[Offline Provider] Auto-sync failed for trip ${trip.tripId}:`, err);
        })
        .finally(() => {
          syncingTripsRef.current.delete(trip.tripId);
        });
    });
  }, [isOnline, offlineTrips, handleSyncEvent, loadOfflineTrips, updateStorageInfo]);

  // Sync trip files (can be called for initial sync or re-sync)
  const syncTrip = useCallback(
    async (tripId: string) => {
      // Prevent duplicate syncs
      if (syncingTripsRef.current.has(tripId)) {
        console.log(`[Offline Provider] Trip ${tripId} already syncing, skipping`);
        return;
      }

      syncingTripsRef.current.add(tripId);
      try {
        await downloadTripFiles(tripId, event => {
          handleSyncEvent(tripId, event);
        });
        await loadOfflineTrips();
        await updateStorageInfo();
      } catch (error) {
        console.error('Failed to sync trip:', error);
        throw error;
      } finally {
        syncingTripsRef.current.delete(tripId);
      }
    },
    [handleSyncEvent, loadOfflineTrips, updateStorageInfo]
  );

  // Enable offline mode for a trip
  const enableOfflineMode = useCallback(
    async (tripId: string) => {
      await syncTrip(tripId);
    },
    [syncTrip]
  );

  // Disable offline mode for a trip
  const disableOfflineMode = useCallback(
    async (tripId: string) => {
      try {
        await clearTripOfflineData(tripId);
        await loadOfflineTrips();
        await updateStorageInfo();
      } catch (error) {
        console.error('Failed to disable offline mode:', error);
        throw error;
      }
    },
    [loadOfflineTrips, updateStorageInfo]
  );

  // Check if a trip is offline-enabled
  const isTripOffline = useCallback(
    (tripId: string) => {
      return offlineTrips.has(tripId);
    },
    [offlineTrips]
  );

  // Get sync status for a trip
  const getSyncStatus = useCallback(
    (tripId: string) => {
      return offlineTrips.get(tripId)?.syncStatus ?? null;
    },
    [offlineTrips]
  );

  // Get full config for a trip
  const getTripConfig = useCallback(
    (tripId: string) => {
      return offlineTrips.get(tripId);
    },
    [offlineTrips]
  );

  // Get sync state for a trip (file-level status)
  const getTripSyncState = useCallback(
    (tripId: string) => {
      return tripSyncStates.get(tripId);
    },
    [tripSyncStates]
  );

  // Retry sync for a failed trip
  const retrySync = useCallback(
    async (tripId: string) => {
      const config = offlineTrips.get(tripId);
      if (config?.syncStatus === 'error') {
        await syncTrip(tripId);
      }
    },
    [offlineTrips, syncTrip]
  );

  // Clear all offline data (for logout)
  const clearAllData = useCallback(async () => {
    try {
      await clearAllOfflineData();
      setOfflineTrips(new Map());
      await updateStorageInfo();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }, [updateStorageInfo]);

  // Refresh offline trips list
  const refreshOfflineTrips = useCallback(async () => {
    await loadOfflineTrips();
    await updateStorageInfo();
  }, [loadOfflineTrips, updateStorageInfo]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        offlineTrips,
        enableOfflineMode,
        disableOfflineMode,
        syncTrip,
        isTripOffline,
        getSyncStatus,
        getTripConfig,
        getTripSyncState,
        storageInfo,
        syncEvents,
        retrySync,
        clearAllData,
        refreshOfflineTrips,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}
