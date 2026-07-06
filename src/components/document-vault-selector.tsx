'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TravelDocument, DocumentReference } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

interface DocumentVaultSelectorProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (documents: DocumentReference[]) => void;
  excludeIds?: string[];
}

export function DocumentVaultSelector({
  tripId,
  open,
  onOpenChange,
  onSelect,
  excludeIds = [],
}: DocumentVaultSelectorProps) {
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'documents'), where('tripId', '==', tripId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as TravelDocument))
        .filter(doc => {
          // Filter to images and PDFs only
          const name = doc.name.toLowerCase();
          const isImage = /\.(jpg|jpeg|png|gif)$/i.test(name);
          const isPdf = /\.pdf$/i.test(name);
          return (isImage || isPdf) && !excludeIds.includes(doc.id);
        });
      setDocuments(docs);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tripId, open, excludeIds]);

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearchQuery('');
    }
  }, [open]);

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const selected = documents.filter(d => selectedIds.has(d.id));
    const documentRefs: DocumentReference[] = selected.map(doc => ({
      id: doc.id,
      name: doc.name,
      type: doc.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*',
      url: doc.url,
      uploadedAt: typeof doc.uploadDate === 'string' ? doc.uploadDate : doc.uploadDate?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));
    onSelect(documentRefs);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const getIcon = (name: string) => {
    if (/\.(jpg|jpeg|png|gif)$/i.test(name)) {
      return <ImageIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
    }
    return <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link from Document Vault</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              {documents.length === 0
                ? 'No images or PDFs in the Document Vault'
                : 'No documents match your search'
              }
            </p>
          ) : (
            filteredDocs.map((doc) => (
              <label
                key={doc.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(doc.id)}
                  onCheckedChange={() => toggleSelection(doc.id)}
                />
                {getIcon(doc.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500">{doc.folder} &bull; {doc.size}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
