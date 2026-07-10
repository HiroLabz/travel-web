'use client';

import Image from 'next/image';
import { MapPin, MoreVertical, Pin, PinOff, Pencil, Trash2, Archive, Copy, Calendar, CheckCircle2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { parseISO, differenceInDays } from 'date-fns';
import { getAvatarUrl } from '@/lib/avatar';
import type { HouseholdMember, Trip } from '@/types';

interface TripCardProps {
  trip: Trip;
  travelers: HouseholdMember[];
  isMenuOpen: boolean;
  isNavigating: boolean;
  onToggleMenu: () => void;
  onClick: () => void;
  onPin: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function TripCard({
  trip,
  travelers,
  isMenuOpen,
  isNavigating,
  onToggleMenu,
  onClick,
  onPin,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
}: TripCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const image = PlaceHolderImages.find(img => img.imageHint?.includes(trip.destination.toLowerCase())) || PlaceHolderImages.find(img => img.id === 'default-trip');
  const days = differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1;
  const isCompleted = parseISO(trip.endDate) < today;

  const destinationsDisplay = Array.isArray(trip.destinations)
    ? trip.destinations.map(d => d.city).join(' → ')
    : trip.destination;

  return (
    <div className="group relative bg-card rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-border">
      {/* Pin indicator */}
      {trip.pinned && (
        <div className="absolute top-3 left-3 z-30 bg-amber-500 text-white p-1.5 rounded-full shadow-lg">
          <Pin className="w-3 h-3" />
        </div>
      )}

      {/* Status pill */}
      <div className={`absolute top-3 ${trip.pinned ? 'left-11' : 'left-3'} z-30 text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${isCompleted ? 'bg-black/40 text-white' : 'bg-primary/90 text-primary-foreground'}`}>
        {isCompleted ? 'Completed' : 'Upcoming'}
      </div>

      {/* Menu button */}
      <div className="absolute top-3 right-3 z-30">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleMenu();
          }}
          className="bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div
            className="absolute right-0 mt-1 w-40 bg-card rounded-lg shadow-xl py-1 border border-border animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onPin}
              className="w-full flex items-center px-3 py-2 text-sm text-card-foreground hover:bg-accent"
            >
              {trip.pinned ? (
                <><PinOff className="w-4 h-4 mr-2" /> Unpin</>
              ) : (
                <><Pin className="w-4 h-4 mr-2" /> Pin to top</>
              )}
            </button>
            <button
              onClick={onRename}
              className="w-full flex items-center px-3 py-2 text-sm text-card-foreground hover:bg-accent"
            >
              <Pencil className="w-4 h-4 mr-2" /> Rename
            </button>
            <button
              onClick={onDuplicate}
              className="w-full flex items-center px-3 py-2 text-sm text-card-foreground hover:bg-accent"
            >
              <Copy className="w-4 h-4 mr-2" /> Duplicate
            </button>
            <button
              onClick={onArchive}
              className="w-full flex items-center px-3 py-2 text-sm text-card-foreground hover:bg-accent"
            >
              <Archive className="w-4 h-4 mr-2" /> Archive
            </button>
            <button
              onClick={onDelete}
              className="w-full flex items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        )}
      </div>

      <div onClick={onClick} className="cursor-pointer">
        <div className="h-48 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          {isNavigating && (
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
          <div className="flex items-center text-sm text-muted-foreground mb-4 truncate">
            <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">{destinationsDisplay}</span>
          </div>
          <div className="border-t border-border pt-4 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isCompleted ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary-accent'}`}>
              <Calendar className="w-3.5 h-3.5" /> {days} Days
            </span>
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-accent">
                <CheckCircle2 className="w-3.5 h-3.5" /> Voyage complete
              </span>
            ) : travelers.length > 0 ? (
              <div className="flex">
                {travelers.slice(0, 2).map((member, i) => (
                  <Image
                    key={member.uid || member.email || i}
                    src={getAvatarUrl(member.photoURL, member.name, member.email)}
                    alt={member.name || 'Traveler'}
                    width={26}
                    height={26}
                    className={`w-[26px] h-[26px] rounded-full border-2 border-card ${i > 0 ? '-ml-2' : ''}`}
                    unoptimized
                  />
                ))}
                {travelers.length > 2 && (
                  <div className="w-[26px] h-[26px] rounded-full border-2 border-card bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center -ml-2">
                    +{travelers.length - 2}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
