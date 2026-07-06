import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  saveOfflineTripConfig,
  saveCachedFile,
  deleteCachedFilesByTrip,
  deleteOfflineTripConfig,
  getCachedFile as getDBCachedFile,
  getStorageUsage as getDBStorageUsage,
  getCachedFilesByTrip,
} from './db';
import type { TravelDocument } from '@/types';
import type { OfflineTripConfig, CachedFile, SyncEvent } from '@/types/offline';

export type SyncEventCallback = (event: SyncEvent) => void;

/**
 * Download a file through the server-side proxy to bypass CORS
 */
async function downloadFileViaProxy(url: string, fileName: string): Promise<Blob> {
  console.log(`[Offline Sync] Downloading: ${fileName}`);
  console.log(`[Offline Sync] URL: ${url.substring(0, 80)}...`);

  const proxyUrl = `/api/storage/download?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    console.log(`[Offline Sync] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error(`[Offline Sync] Download failed:`, errorData);
      throw new Error(errorData.error || 'Failed to download file');
    }

    const blob = await response.blob();
    console.log(`[Offline Sync] Downloaded ${fileName}: ${blob.size} bytes`);
    return blob;
  } catch (error) {
    console.error(`[Offline Sync] Exception downloading ${fileName}:`, error);
    throw error;
  }
}

export async function downloadTripFiles(
  tripId: string,
  onProgress?: SyncEventCallback
): Promise<void> {
  console.log(`[Offline Sync] Starting sync for trip: ${tripId}`);

  if (!db) {
    console.error('[Offline Sync] Database not initialized');
    throw new Error('Database not initialized');
  }

  const emit = (event: SyncEvent) => {
    console.log(`[Offline Sync] Event: ${event.type}`, event.fileStatus?.fileName || '');
    onProgress?.(event);
  };
  emit({ type: 'sync-started', tripId });

  try {
    // 1. Fetch all documents for this trip from Firestore
    console.log('[Offline Sync] Fetching documents from Firestore...');
    const docsQuery = query(
      collection(db, 'documents'),
      where('tripId', '==', tripId)
    );
    const snapshot = await getDocs(docsQuery);
    const documents = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as TravelDocument));

    console.log(`[Offline Sync] Found ${documents.length} documents to sync`);
    documents.forEach((doc, i) => {
      console.log(`[Offline Sync]   ${i + 1}. ${doc.name} - ${doc.url?.substring(0, 50)}...`);
    });

    // 2. Calculate total size (parse from size string like "2.50 MB")
    let totalSize = 0;
    documents.forEach(doc => {
      if (doc.size) {
        const match = doc.size.match(/(\d+\.?\d*)\s*(MB|KB|GB)/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          if (unit === 'GB') totalSize += value * 1024 * 1024 * 1024;
          else if (unit === 'MB') totalSize += value * 1024 * 1024;
          else if (unit === 'KB') totalSize += value * 1024;
        }
      }
    });

    // 3. Create offline trip config
    const config: OfflineTripConfig = {
      tripId,
      enabledAt: new Date().toISOString(),
      lastSyncAt: null,
      syncStatus: 'syncing',
      totalFiles: documents.length,
      downloadedFiles: 0,
      totalSizeBytes: totalSize,
      downloadedSizeBytes: 0,
    };
    await saveOfflineTripConfig(config);

    // 4. Download each file through server-side proxy (bypasses CORS)
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      // Emit downloading status
      emit({
        type: 'file-downloading',
        tripId,
        fileStatus: {
          id: doc.id,
          fileName: doc.name,
          status: 'downloading',
        },
        totalFiles: documents.length,
        completedFiles: successCount + failCount,
      });

      try {
        // Download via server proxy to bypass CORS
        const blob = await downloadFileViaProxy(doc.url, doc.name);

        // Store in IndexedDB
        const cachedFile: CachedFile = {
          id: doc.id,
          tripId,
          fileName: doc.name,
          mimeType: blob.type || getMimeTypeFromFilename(doc.name),
          sizeBytes: blob.size,
          blob,
          downloadUrl: doc.url,
          cachedAt: new Date().toISOString(),
        };
        await saveCachedFile(cachedFile);

        successCount++;

        // Update progress
        config.downloadedFiles = successCount;
        config.downloadedSizeBytes += blob.size;
        await saveOfflineTripConfig(config);

        emit({
          type: 'file-downloaded',
          tripId,
          progress: ((successCount + failCount) / documents.length) * 100,
          message: `Downloaded ${doc.name}`,
          fileStatus: {
            id: doc.id,
            fileName: doc.name,
            status: 'completed',
            sizeBytes: blob.size,
          },
          totalFiles: documents.length,
          completedFiles: successCount + failCount,
        });
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to download ${doc.name}:`, errorMessage);

        emit({
          type: 'file-failed',
          tripId,
          progress: ((successCount + failCount) / documents.length) * 100,
          message: `Failed to download ${doc.name}`,
          fileStatus: {
            id: doc.id,
            fileName: doc.name,
            status: 'failed',
            error: errorMessage,
          },
          totalFiles: documents.length,
          completedFiles: successCount + failCount,
        });
        // Continue with other files
      }
    }

    // Update config with final counts
    config.downloadedFiles = successCount;
    config.totalFiles = documents.length;

    // 5. Mark as synced
    config.syncStatus = 'synced';
    config.lastSyncAt = new Date().toISOString();
    await saveOfflineTripConfig(config);

    emit({ type: 'sync-completed', tripId });
  } catch (error) {
    // Mark as error
    const errorConfig: OfflineTripConfig = {
      tripId,
      enabledAt: new Date().toISOString(),
      lastSyncAt: null,
      syncStatus: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      totalFiles: 0,
      downloadedFiles: 0,
      totalSizeBytes: 0,
      downloadedSizeBytes: 0,
    };
    await saveOfflineTripConfig(errorConfig);

    emit({
      type: 'sync-error',
      tripId,
      error: error instanceof Error ? error : new Error('Unknown error'),
    });
    throw error;
  }
}

/**
 * Clear all offline data for a trip
 */
export async function clearTripOfflineData(tripId: string): Promise<void> {
  // Delete cached files for this trip
  await deleteCachedFilesByTrip(tripId);

  // Delete offline trip config
  await deleteOfflineTripConfig(tripId);
}

/**
 * Get a cached file by document ID
 */
export async function getCachedFile(documentId: string): Promise<CachedFile | undefined> {
  return getDBCachedFile(documentId);
}

/**
 * Check if a file is cached
 */
export async function isFileCached(documentId: string): Promise<boolean> {
  const file = await getDBCachedFile(documentId);
  return !!file;
}

/**
 * Get storage usage information
 */
export async function getStorageUsage(): Promise<{ usedBytes: number; fileCount: number }> {
  return getDBStorageUsage();
}

/**
 * Get browser storage quota
 */
export async function getStorageQuota(): Promise<{ used: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { used: 0, quota: 0 };
}

/**
 * Get cached files count for a trip
 */
export async function getTripCachedFilesCount(tripId: string): Promise<number> {
  const files = await getCachedFilesByTrip(tripId);
  return files.length;
}

/**
 * Helper to get MIME type from filename
 */
function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Create a blob URL for a cached file
 */
export function createBlobUrl(cachedFile: CachedFile): string {
  return URL.createObjectURL(cachedFile.blob);
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}
