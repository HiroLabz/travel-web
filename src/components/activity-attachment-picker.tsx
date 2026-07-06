'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Link as LinkIcon, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { DocumentReference } from '@/types';

export interface PendingUpload {
  id: string;
  file: File;
  preview?: string;
  name: string;
  type: string;
}

interface AttachmentPickerProps {
  attachments: DocumentReference[];
  onAttachmentsChange: (attachments: DocumentReference[]) => void;
  pendingUploads: PendingUpload[];
  onPendingUploadsChange: (uploads: PendingUpload[]) => void;
  onOpenVaultSelector: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ActivityAttachmentPicker({
  attachments,
  onAttachmentsChange,
  pendingUploads,
  onPendingUploadsChange,
  onOpenVaultSelector,
}: AttachmentPickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not allowed: ${file.name}. Only JPG, PNG, GIF, and PDF files are accepted.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${file.name}. Maximum size is 10MB.`;
    }
    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newPending: PendingUpload[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        continue;
      }

      const pending: PendingUpload = {
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        type: file.type,
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        pending.preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      newPending.push(pending);
    }

    if (errors.length > 0) {
      toast({
        title: 'Some files were not added',
        description: errors[0],
        variant: 'destructive',
      });
    }

    if (newPending.length > 0) {
      onPendingUploadsChange([...pendingUploads, ...newPending]);
    }
  }, [pendingUploads, onPendingUploadsChange, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  const removePending = (id: string) => {
    const pending = pendingUploads.find(p => p.id === id);
    if (pending?.preview) {
      URL.revokeObjectURL(pending.preview);
    }
    onPendingUploadsChange(pendingUploads.filter(p => p.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-emerald-500" />;
    if (type === 'application/pdf') return <FileText className="w-6 h-6 text-red-500" />;
    return <FileText className="w-6 h-6 text-slate-400" />;
  };

  const allItems = [
    ...attachments.map(a => ({ ...a, isPending: false })),
    ...pendingUploads.map(p => ({ id: p.id, name: p.name, type: p.type, url: p.preview || '', uploadedAt: '', isPending: true, preview: p.preview })),
  ];

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
          isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-600 mb-2">
          Drop files here or use buttons below
        </p>
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload File
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenVaultSelector}
          >
            <LinkIcon className="w-4 h-4 mr-1" />
            Link from Vault
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          JPG, PNG, GIF, PDF (max 10MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.pdf,image/jpeg,image/png,image/gif,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Attachment Grid */}
      {allItems.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {allItems.map((item) => (
            <div key={item.id} className="relative group">
              <div className={cn(
                'aspect-square border rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center',
                item.isPending && 'border-indigo-200'
              )}>
                {item.type.startsWith('image/') && (item.url || (item as { preview?: string }).preview) ? (
                  <img
                    src={(item as { preview?: string }).preview || item.url}
                    alt={item.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  getFileIcon(item.type)
                )}
                {item.isPending && (
                  <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                    <span className="text-[10px] text-indigo-600 font-medium bg-white/80 px-1 rounded">
                      Pending
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 truncate mt-1" title={item.name}>
                {item.name}
              </p>
              <button
                type="button"
                onClick={() => item.isPending ? removePending(item.id) : removeAttachment(item.id)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
