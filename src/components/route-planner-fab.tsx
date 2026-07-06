'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RoutePlannerDialog } from '@/components/route-planner-dialog';
import { Route } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { WizardItineraryItem, Household, Destination, ExchangeRateCache } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RoutePlannerFABProps {
  tripId: string;
  wizardItems: WizardItineraryItem[];
  tripDestinations: Destination[];
  household: Household;
  exchangeRates?: ExchangeRateCache;
}

export function RoutePlannerFAB({
  tripId,
  wizardItems,
  tripDestinations,
  household,
  exchangeRates,
}: RoutePlannerFABProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClick = () => {
    if (isMobile) {
      // Navigate to mobile page
      router.push(`/trip/${tripId}/route-planner`);
    } else {
      // Open dialog
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleClick}
              className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transition-all duration-200"
              size="icon"
            >
              <Route className="w-6 h-6" />
              <span className="sr-only">Plan day route</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="mr-2">
            <p>Plan day route</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Desktop dialog */}
      {!isMobile && (
        <RoutePlannerDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          tripId={tripId}
          wizardItems={wizardItems}
          tripDestinations={tripDestinations}
          household={household}
          exchangeRates={exchangeRates}
        />
      )}
    </>
  );
}
