'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Plus, MoreVertical, Pin, PinOff, Pencil, Trash2, X, Archive, Copy } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { parseISO, differenceInDays } from 'date-fns';
import { deleteTripAction, renameTripAction, toggleTripPinAction, archiveTripAction, copyTripAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useLoading } from '@/contexts/loading-context';
import { LoadingScreen } from '@/components/ui/loading-screen';
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

  // Sort: pinned first, then upcoming trips by start date, then completed trips by end date (most recent first)
  const sortedTrips = [...localTrips].sort((a, b) => {
    // 1. Pinned trips always first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    // 2. Determine if trips are completed (end date is before today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
      {sortedTrips.map((trip) => {
        const image = PlaceHolderImages.find(img => img.imageHint?.includes(trip.destination.toLowerCase())) || PlaceHolderImages.find(img => img.id === 'default-trip');
        const days = differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1;

        const destinationsDisplay = Array.isArray(trip.destinations)
          ? trip.destinations.map(d => d.city).join(' → ')
          : trip.destination;

        return (
            <div key={trip.id} className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 dark:border-slate-700">
               {/* Pin indicator */}
               {trip.pinned && (
                 <div className="absolute top-3 left-3 z-30 bg-amber-500 text-white p-1.5 rounded-full shadow-lg">
                   <Pin className="w-3 h-3" />
                 </div>
               )}

               {/* Menu button */}
               <div className="absolute top-3 right-3 z-30">
                 <button
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     setMenuOpen(menuOpen === trip.id ? null : trip.id);
                   }}
                   className="bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full transition-colors"
                 >
                   <MoreVertical className="w-4 h-4" />
                 </button>

                 {/* Dropdown menu */}
                 {menuOpen === trip.id && (
                   <div
                     className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl py-1 border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150"
                     onClick={(e) => e.stopPropagation()}
                   >
                     <button
                       onClick={() => handlePin(trip.id, !!trip.pinned)}
                       className="w-full flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                     >
                       {trip.pinned ? (
                         <><PinOff className="w-4 h-4 mr-2" /> Unpin</>
                       ) : (
                         <><Pin className="w-4 h-4 mr-2" /> Pin to top</>
                       )}
                     </button>
                     <button
                       onClick={() => openRenameModal(trip)}
                       className="w-full flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                     >
                       <Pencil className="w-4 h-4 mr-2" /> Rename
                     </button>
                     <button
                       onClick={() => handleCopy(trip.id, trip.title)}
                       className="w-full flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                     >
                       <Copy className="w-4 h-4 mr-2" /> Duplicate
                     </button>
                     <button
                       onClick={() => handleArchive(trip.id, trip.title)}
                       className="w-full flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                     >
                       <Archive className="w-4 h-4 mr-2" /> Archive
                     </button>
                     <button
                       onClick={() => openDeleteModal(trip)}
                       className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                     >
                       <Trash2 className="w-4 h-4 mr-2" /> Delete
                     </button>
                   </div>
                 )}
               </div>

               <div
                 onClick={() => handleTripClick(trip.id, trip.title)}
                 className="cursor-pointer"
               >
                 <div className="h-48 overflow-hidden relative">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                   {navigatingTripId === trip.id && (
                     <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                       <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     </div>
                   )}
                   <Image
                      src={trip.imageUrl || image?.imageUrl || 'https://picsum.photos/seed/default/1200/800'}
                      alt={trip.title}
                      fill
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      data-ai-hint={trip.imageHint || image?.imageHint}
                   />
                   <div className="absolute bottom-4 left-4 z-20 text-white">
                     <h3 className="text-xl font-bold">{trip.title}</h3>
                     <p className="text-sm opacity-90">{new Date(trip.startDate).getFullYear()}</p>
                   </div>
                 </div>
                 <div className="p-5">
                   <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-4 truncate">
                     <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                     <span className="truncate">{destinationsDisplay}</span>
                   </div>
                   <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                      <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                        {trip.days} Days
                      </span>
                   </div>
                 </div>
               </div>
            </div>
        );
      })}

      <Link href="/create" className="group flex flex-col items-center justify-center h-full min-h-[300px] bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors">
        <div className="bg-white dark:bg-slate-700 p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <span className="font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary-focus">Plan a new trip</span>
      </Link>
    </div>

    {/* Rename Modal */}
    {renameModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRenameModal(null)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
          <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Rename Trip</h3>
            <button onClick={() => setRenameModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trip Name</label>
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
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
            <h3 className="font-bold text-red-900 dark:text-red-400">Delete Trip</h3>
            <button onClick={() => setDeleteModal(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <p className="text-slate-600 dark:text-slate-300 mb-4">
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
