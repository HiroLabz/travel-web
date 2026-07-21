'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/motion/morphing-modal';
import { FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType?: string;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  documentType,
}: DocumentPreviewModalProps) {
  // Google Docs Viewer for PDFs (same as DocumentVault)
  const getViewerUrl = (url: string) => {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const getDocumentTypeLabel = (type?: string) => {
    if (!type) return '';
    const labels: Record<string, string> = {
      'boarding_pass': 'Boarding Pass',
      'ticket': 'Ticket',
      'hotel_voucher': 'Hotel Voucher',
      'confirmation': 'Confirmation',
      'other': 'Document'
    };
    return labels[type] || 'Document';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="truncate">{documentName}</span>
            </div>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-normal flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              Download
            </a>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-slate-100" style={{ minHeight: '500px' }}>
          {/* PDF Preview using Google Docs Viewer */}
          <iframe
            src={getViewerUrl(documentUrl)}
            className="w-full h-full min-h-[500px] border-0"
            title={documentName}
            style={{ height: 'calc(90vh - 180px)' }}
          />
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {documentType && getDocumentTypeLabel(documentType)}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
