// Offline synchronization types

export interface OfflineTripConfig {
  tripId: string;
  enabledAt: string; // ISO timestamp
  lastSyncAt: string | null;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
  totalFiles: number;
  downloadedFiles: number;
  totalSizeBytes: number;
  downloadedSizeBytes: number;
}

export interface CachedFile {
  id: string; // Document ID from Firestore
  tripId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  downloadUrl: string; // Original Firebase Storage URL
  cachedAt: string; // ISO timestamp
}

export interface SyncQueueItem {
  id: string; // UUID
  timestamp: string;
  operation: 'create' | 'update' | 'delete';
  collection: string; // 'documents' | 'expenses' | 'wizardItems' | etc.
  documentId?: string; // For update/delete
  data: Record<string, unknown>;
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
  error?: string;
}

export interface OfflineState {
  isOnline: boolean;
  offlineTrips: Map<string, OfflineTripConfig>;
  syncQueue: SyncQueueItem[];
  storageUsedBytes: number;
  storageQuotaBytes: number;
}

export type SyncEventType =
  | 'sync-started'
  | 'sync-progress'
  | 'sync-completed'
  | 'sync-error'
  | 'file-downloading'
  | 'file-downloaded'
  | 'file-failed'
  | 'queue-item-synced';

export interface FileDownloadStatus {
  id: string;
  fileName: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
  sizeBytes?: number;
}

export interface SyncEvent {
  type: SyncEventType;
  tripId?: string;
  progress?: number;
  message?: string;
  error?: Error;
  fileStatus?: FileDownloadStatus;
  totalFiles?: number;
  completedFiles?: number;
}

// Database schema constants
export const DB_NAME = 'wandernest-offline';
export const DB_VERSION = 1;
