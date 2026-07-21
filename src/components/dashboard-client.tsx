'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { parseISO } from 'date-fns';
import { deleteTripAction, renameTripAction, toggleTripPinAction, archiveTripAction, copyTripAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/motion/input';
import { useLoading } from '@/contexts/loading-context';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { TripCard } from '@/components/trip-card';
import type { Trip } from '@/types';

export default function DashboardClient() {
  const router = useRouter();
  const { trips: tripsFromAuth, household, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const { showLoading, hideLoading } = useLoading();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<{ tripId: string; currentTitle: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ tripId: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [localTrips, setLocalTrips] = useState<Trip[]>([]);
  const [navigatingTripId, setNavigatingTripId] = useState<string | null>(null);

  // Sync local trips with auth trips
  useEffect(() => {
    setLocalTrips(tripsFromAuth);
  }, [tripsFromAuth]);

  const handlePin = async (tripId: string, currentlyPinned: boolean) => {
    setMenuOpen(null);

    // Optimistic update
    setLocalTrips(prev =>
      prev.map(trip =>
        trip.id === tripId ? { ...trip, pinned: !currentlyPinned } : trip
      )
    );

    const result = await toggleTripPinAction(tripId, !currentlyPinned);
    if (result.error) {
      // Revert on error
      setLocalTrips(tripsFromAuth);
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: currentlyPinned ? 'Trip unpinned' : 'Trip pinned' });
    }
  };

  const handleRename = async () => {
    if (!renameModal || !newTitle.trim()) return;
    showLoading('Renaming trip...');
    const result = await renameTripAction(renameModal.tripId, newTitle);
    hideLoading();
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Trip renamed successfully' });
    }
    setRenameModal(null);
    setNewTitle('');
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    showLoading('Deleting trip...');
    const result = await deleteTripAction(deleteModal.tripId);
    hideLoading();
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Trip deleted successfully' });
    }
    setDeleteModal(null);
  };

  const openRenameModal = (trip: Trip) => {
    setMenuOpen(null);
    setNewTitle(trip.title);
    setRenameModal({ tripId: trip.id, currentTitle: trip.title });
  };

  const openDeleteModal = (trip: Trip) => {
    setMenuOpen(null);
    setDeleteModal({ tripId: trip.id, title: trip.title });
  };

  const handleArchive = async (tripId: string, title: string) => {
    setMenuOpen(null);
    const result = await archiveTripAction(tripId);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Trip archived', description: `"${title}" has been archived.` });
    }
  };

  const handleCopy = async (tripId: string, title: string) => {
    if (!user) return;
    setMenuOpen(null);
    showLoading('Duplicating trip...');
    const result = await copyTripAction(tripId, user.uid, user.displayName);
    hideLoading();
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Trip duplicated', description: `Created "Copy of ${title}"` });
    }
  };

  const handleTripClick = (tripId: string, tripTitle: string) => {
    setNavigatingTripId(tripId);
    showLoading(`Loading ${tripTitle}...`);
    router.push(`/trip/${tripId}`);
  };

  if (authLoading) {
    return <LoadingScreen message="Loading your trips..." />;
  }

  if (!household) {
    return (
      <div className="text-center py-16 col-span-full">
        <h2 className="text-xl font-semibold">No travel group found</h2>
        <p className="text-muted-foreground mt-2">Create or join a travel group to start planning trips.</p>
        <Link href="/household" passHref>
          <Button className="mt-4">Go to Travel Group</Button>
        </Link>
      </div>
    );
  }

  // Trips are "completed" once their end date is before today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort: pinned first, then upcoming trips by start date, then completed trips by end date (most recent first)
  const sortedTrips = [...localTrips].sort((a, b) => {
    // 1. Pinned trips always first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    const aCompleted = parseISO(a.endDate) < today;
    const bCompleted = parseISO(b.endDate) < today;

    // 3. Upcoming/current trips before completed trips
    if (!aCompleted && bCompleted) return -1;
    if (aCompleted && !bCompleted) return 1;

    // 4. Within same category, sort by date
    if (!aCompleted && !bCompleted) {
      // Both upcoming/current: sort by startDate ascending (earliest first)
      return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
    } else {
      // Both completed: sort by endDate descending (most recent first)
      return parseISO(b.endDate).getTime() - parseISO(a.endDate).getTime();
    }
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTrips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            travelers={household?.members ?? []}
            isMenuOpen={menuOpen === trip.id}
            isNavigating={navigatingTripId === trip.id}
            onToggleMenu={() => setMenuOpen(menuOpen === trip.id ? null : trip.id)}
            onClick={() => handleTripClick(trip.id, trip.title)}
            onPin={() => handlePin(trip.id, !!trip.pinned)}
            onRename={() => openRenameModal(trip)}
            onDuplicate={() => handleCopy(trip.id, trip.title)}
            onArchive={() => handleArchive(trip.id, trip.title)}
            onDelete={() => openDeleteModal(trip)}
          />
        ))}
      </div>

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRenameModal(null)}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="bg-muted px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-foreground">Rename Trip</h3>
              <button onClick={() => setRenameModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-foreground mb-2">Trip Name</label>
              <Input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter trip name"
                className="mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRenameModal(null)}>
                  Cancel
                </Button>
                <Button onClick={handleRename} disabled={!newTitle.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(null)}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="bg-destructive/10 px-6 py-4 border-b border-destructive/20 flex justify-between items-center">
              <h3 className="font-bold text-destructive">Delete Trip</h3>
              <button onClick={() => setDeleteModal(null)} className="text-destructive/70 hover:text-destructive">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete <strong>&quot;{deleteModal.title}&quot;</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteModal(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
