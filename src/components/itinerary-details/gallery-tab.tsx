'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { DocumentReference } from '@/types';
import { ImageLightbox } from './image-lightbox';
import { ImageIcon } from 'lucide-react';

interface GalleryTabProps {
  images: DocumentReference[];
}

export function GalleryTab({ images }: GalleryTabProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="px-1">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <ImageIcon className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">No images attached</p>
          <p className="text-xs mt-1">Add images via the full editor</p>
        </div>
      </div>
    );
  }

  const lightboxImages = images.map((img) => ({
    url: img.url,
    name: img.name,
  }));

  return (
    <>
      <div className="px-1">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              <ImageIcon className="w-4 h-4" />
              Gallery
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => setLightboxIndex(index)}
            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all group"
          >
            <Image
              src={image.url}
              alt={image.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
            </div>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
