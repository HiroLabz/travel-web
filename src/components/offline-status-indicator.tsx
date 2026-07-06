'use client';

import { useOffline } from '@/lib/offline';
import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function OfflineStatusIndicator() {
  const { isOnline, offlineTrips } = useOffline();

  const offlineCount = offlineTrips.size;
  const hasPendingSync = Array.from(offlineTrips.values()).some(
    t => t.syncStatus === 'syncing' || t.syncStatus === 'pending'
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-sm cursor-default">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500" />
            )}
            {offlineCount > 0 && (
              <>
                {hasPendingSync ? (
                  <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />
                ) : (
                  <CloudOff className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {offlineCount}
                </span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            <p className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </p>
            {offlineCount > 0 && (
              <p className="text-slate-400">
                {offlineCount} trip{offlineCount > 1 ? 's' : ''} available offline
                {hasPendingSync && ' (syncing...)'}
              </p>
            )}
            {!isOnline && offlineCount === 0 && (
              <p className="text-amber-400">
                Enable offline mode for trips to access them without internet
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
