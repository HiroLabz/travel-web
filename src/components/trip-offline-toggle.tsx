'use client';

import { useState } from 'react';
import { useOffline } from '@/lib/offline';
import { Switch } from '@/components/motion/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CloudDownload,
  CloudOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  WifiOff,
  FileText,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface TripOfflineToggleProps {
  tripId: string;
  tripName?: string;
}

export function TripOfflineToggle({ tripId, tripName }: TripOfflineToggleProps) {
  const {
    isOnline,
    offlineTrips,
    enableOfflineMode,
    disableOfflineMode,
    syncTrip,
    storageInfo,
    retrySync,
    getTripSyncState,
  } = useOffline();

  const [isToggling, setIsToggling] = useState(false);
  const [showFileList, setShowFileList] = useState(false);

  const config = offlineTrips.get(tripId);
  const syncState = getTripSyncState(tripId);
  const isOffline = !!config;
  const syncStatus = config?.syncStatus;

  // Calculate progress from sync state
  const totalFiles = syncState?.totalFiles || config?.totalFiles || 0;
  const completedFiles = syncState?.completedFiles || 0;
  const failedFiles = syncState?.failedFiles || 0;
  const progress = totalFiles > 0 ? ((completedFiles + failedFiles) / totalFiles) * 100 : 0;
  const isSyncing = syncState?.isSyncing || syncStatus === 'syncing';

  // Get file statuses as array
  const fileStatuses = syncState?.fileStatuses
    ? Array.from(syncState.fileStatuses.values())
    : [];

  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      if (enabled) {
        await enableOfflineMode(tripId);
      } else {
        await disableOfflineMode(tripId);
      }
    } catch (error) {
      console.error('Failed to toggle offline mode:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSync = async () => {
    setIsToggling(true);
    setShowFileList(true);
    try {
      await syncTrip(tripId);
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleRetry = async () => {
    setIsToggling(true);
    setShowFileList(true);
    try {
      await retrySync(tripId);
    } catch (error) {
      console.error('Failed to retry sync:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOffline ? (
            <CloudDownload className="w-5 h-5 text-blue-500" />
          ) : (
            <CloudOff className="w-5 h-5 text-slate-400" />
          )}
          <Label htmlFor="offline-toggle" className="font-medium">
            Available Offline
          </Label>
        </div>
        <Switch
          id="offline-toggle"
          checked={isOffline}
          onCheckedChange={handleToggle}
          disabled={isToggling || isSyncing || (!isOnline && !isOffline)}
        />
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500">
        {isOffline
          ? 'All trip documents and data are available without internet'
          : "Enable to access this trip's documents and data offline"}
      </p>

      {/* Online/Offline Status Warning */}
      {!isOnline && !isOffline && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
          <WifiOff className="w-4 h-4" />
          Connect to the internet to enable offline mode
        </div>
      )}

      {/* Sync Button - Show when offline mode is enabled */}
      {isOffline && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={!isOnline || isToggling || isSyncing}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Files Now
            </>
          )}
        </Button>
      )}

      {/* Sync Progress */}
      {isSyncing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Syncing files...</span>
            </div>
            <span className="text-xs text-slate-500">
              {completedFiles + failedFiles}/{totalFiles}
            </span>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Current file being downloaded */}
          {syncState?.currentFile && (
            <p className="text-xs text-slate-500 truncate">
              Downloading: {syncState.currentFile}
            </p>
          )}
        </div>
      )}

      {/* Sync Results Summary */}
      {!isSyncing && syncState && totalFiles > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              {completedFiles > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {completedFiles} downloaded
                </span>
              )}
              {failedFiles > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="w-4 h-4" />
                  {failedFiles} failed
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFileList(!showFileList)}
              className="h-6 px-2"
            >
              {showFileList ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* File List */}
          {showFileList && fileStatuses.length > 0 && (
            <ScrollArea className="h-40 rounded-md border bg-white">
              <div className="p-2 space-y-1">
                {fileStatuses.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 p-1.5 rounded text-xs"
                  >
                    {file.status === 'completed' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    )}
                    {file.status === 'failed' && (
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                    {file.status === 'downloading' && (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
                    )}
                    {file.status === 'pending' && (
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <span
                      className={`truncate flex-1 ${
                        file.status === 'failed' ? 'text-red-600' : 'text-slate-600'
                      }`}
                    >
                      {file.fileName}
                    </span>
                    {file.sizeBytes && file.status === 'completed' && (
                      <span className="text-slate-400 flex-shrink-0">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    )}
                    {file.status === 'failed' && file.error && (
                      <span className="text-red-400 truncate max-w-[100px]" title={file.error}>
                        {file.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Sync Status - Synced (no active sync state) */}
      {syncStatus === 'synced' && !syncState && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            All files downloaded ({config?.downloadedFiles} files)
          </div>
          {config?.lastSyncAt && (
            <p className="text-xs text-slate-500">
              Last synced: {new Date(config.lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Sync Status - Error */}
      {syncStatus === 'error' && !isSyncing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            Sync failed: {config?.errorMessage || 'Unknown error'}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={!isOnline || isToggling}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Storage Info */}
      {isOffline && config && (
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
          <HardDrive className="w-3 h-3" />
          Using {formatBytes(config.downloadedSizeBytes)}
          {storageInfo.quota > 0 && (
            <span className="text-slate-400">
              ({((config.downloadedSizeBytes / storageInfo.quota) * 100).toFixed(1)}% of
              available storage)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
