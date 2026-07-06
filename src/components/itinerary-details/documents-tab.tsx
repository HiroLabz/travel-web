'use client';

import type { DocumentReference, WizardItineraryItem } from '@/types';
import { format, parseISO } from 'date-fns';
import {
  FileText,
  Ticket,
  CreditCard,
  FileCheck,
  File,
  ExternalLink,
} from 'lucide-react';

interface DocumentsTabProps {
  documents: DocumentReference[];
  documentMetadata?: WizardItineraryItem['documentMetadata'];
  onPreviewDocument: (doc: { url: string; name: string; type?: string }) => void;
}

// Get icon based on document type
const getDocumentIcon = (docType?: string, name?: string) => {
  const lowerType = docType?.toLowerCase() || '';
  const lowerName = name?.toLowerCase() || '';

  if (
    lowerType.includes('ticket') ||
    lowerType.includes('boarding') ||
    lowerName.includes('ticket') ||
    lowerName.includes('boarding')
  ) {
    return <Ticket className="w-5 h-5" />;
  }

  if (
    lowerType.includes('confirmation') ||
    lowerType.includes('voucher') ||
    lowerName.includes('confirmation') ||
    lowerName.includes('voucher')
  ) {
    return <FileCheck className="w-5 h-5" />;
  }

  if (
    lowerType.includes('receipt') ||
    lowerType.includes('payment') ||
    lowerName.includes('receipt') ||
    lowerName.includes('invoice')
  ) {
    return <CreditCard className="w-5 h-5" />;
  }

  if (lowerName.endsWith('.pdf')) {
    return <FileText className="w-5 h-5" />;
  }

  return <File className="w-5 h-5" />;
};

// Get friendly document type label
const getDocumentTypeLabel = (docType?: string) => {
  if (!docType) return 'Document';

  const typeMap: Record<string, string> = {
    ticket: 'Ticket',
    boarding_pass: 'Boarding Pass',
    confirmation: 'Confirmation',
    voucher: 'Voucher',
    receipt: 'Receipt',
  };

  return typeMap[docType.toLowerCase()] || docType;
};

export function DocumentsTab({
  documents,
  documentMetadata,
  onPreviewDocument,
}: DocumentsTabProps) {
  if (documents.length === 0) {
    return (
      <div className="px-1">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <FileText className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">No documents attached</p>
          <p className="text-xs mt-1">Add documents via the full editor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-1">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <FileText className="w-4 h-4" />
            Documents
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {documents.length} {documents.length === 1 ? 'file' : 'files'}
          </span>
        </div>
        <div className="p-4 space-y-2">
      {documents.map((doc, index) => {
        const metadata = documentMetadata?.[doc.id];
        const docType = metadata?.documentType || doc.type;

        return (
          <button
            key={`${doc.id}-${index}`}
            onClick={() =>
              onPreviewDocument({
                url: doc.url,
                name: doc.name,
                type: doc.type,
              })
            }
            className="w-full flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {getDocumentIcon(docType, doc.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {doc.name}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {docType && (
                  <>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {getDocumentTypeLabel(docType)}
                    </span>
                  </>
                )}

                {(doc.uploadedAt || metadata?.uploadedAt) && (
                  <span>
                    {(() => {
                      try {
                        const dateStr = metadata?.uploadedAt || doc.uploadedAt;
                        return format(parseISO(dateStr), 'MMM d, yyyy');
                      } catch {
                        return '';
                      }
                    })()}
                  </span>
                )}
              </div>

              {metadata?.contributedFields &&
                metadata.contributedFields.length > 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                    Used for: {metadata.contributedFields.slice(0, 3).join(', ')}
                    {metadata.contributedFields.length > 3 && '...'}
                  </p>
                )}
            </div>
          </button>
        );
      })}
        </div>
      </div>
    </div>
  );
}
