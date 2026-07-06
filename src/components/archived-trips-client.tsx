'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, RotateCcw, Archive, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { restoreTripAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ArchivedTripsClient() {
  const { archivedTrips, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [restoreModal, setRestoreModal] = useState<{ tripId: string; title: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRestore = async () => {
    if (!restoreModal) return;
    setIsLoading(true);
    const result = await restoreTripAction(restoreModal.tripId);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Trip restored', description: `"${restoreModal.title}" has been restored.` });
    }
    setIsLoading(false);
    setRestoreModal(null);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/household')}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 mr-3 text-slate-500 dark:text-slate-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Archived Trips</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {archivedTrips.length} archived trip{archivedTrips.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {archivedTrips.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Archive className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">No archived trips</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              When you archive trips from your dashboard, they will appear here.
              Archived trips can be restored at any time.
            </p>
            <Link href="/dashboard">
              <Button className="mt-6">Back to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archivedTrips.map((trip) => {
              const image = PlaceHolderImages.find(img =>
                img.imageHint?.includes(trip.destination.toLowerCase())
              ) || PlaceHolderImages.find(img => img.id === 'default-trip');

              const destinationsDisplay = Array.isArray(trip.destinations)
                ? trip.destinations.map(d => d.city).join(' → ')
                : trip.destination;

              return (
                <div
                  key={trip.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div className="h-40 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                    <Image
                      src={trip.imageUrl || image?.imageUrl || 'https://picsum.photos/seed/default/1200/800'}
                      alt={trip.title}
                      fill
                      className="w-full h-full object-cover grayscale"
                    />
                    <div className="absolute bottom-3 left-3 z-20 text-white">
                      <h3 className="text-lg font-bold">{trip.title}</h3>
                      <p className="text-xs opacity-90">
                        {new Date(trip.startDate).getFullYear()}
                      </p>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-3 truncate">
                      <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                      <span className="truncate">{destinationsDisplay}</span>
                    </div>

                    <Button
                      onClick={() => setRestoreModal({ tripId: trip.id, title: trip.title })}
                      variant="outline"
                      className="w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore Trip
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      <AlertDialog open={!!restoreModal} onOpenChange={() => setRestoreModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore &quot;{restoreModal?.title}&quot;?
              This will move it back to your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
