'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  WifiOff,
  Maximize2,
} from 'lucide-react';
import { getCachedFile } from '@/lib/offline';
import { useOffline } from '@/lib/offline';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Memoized options object - created once outside component
const PDF_OPTIONS = {
  cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

interface PDFViewerProps {
  documentId: string;
  documentUrl: string;
  documentName: string;
}

export function PDFViewer({ documentId, documentUrl, documentName }: PDFViewerProps) {
  const { isOnline } = useOffline();
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(0.75);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width for fit-width calculation
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load PDF from cache or network
  useEffect(() => {
    let isMounted = true;

    async function loadPDF() {
      setLoading(true);
      setError(null);
      setPdfData(null);

      try {
        // Try to get cached version first (works offline)
        const cachedFile = await getCachedFile(documentId);

        if (cachedFile && cachedFile.blob) {
          // Convert blob to ArrayBuffer for react-pdf
          const arrayBuffer = await cachedFile.blob.arrayBuffer();
          if (isMounted) {
            setPdfData(arrayBuffer);
            setLoading(false);
          }
        } else if (isOnline) {
          // Fetch from Firebase Storage via proxy API route (bypasses CORS)
          const proxyUrl = `/api/storage/download?url=${encodeURIComponent(documentUrl)}`;
          const response = await fetch(proxyUrl);

          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          if (isMounted) {
            setPdfData(arrayBuffer);
            setLoading(false);
          }
        } else {
          if (isMounted) {
            setError('Document not available offline. Enable offline mode for this trip to view offline.');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to load PDF:', err);
        if (isMounted) {
          setError('Failed to load PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
          setLoading(false);
        }
      }
    }

    loadPDF();

    return () => {
      isMounted = false;
    };
  }, [documentId, documentUrl, isOnline]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const onPageLoadSuccess = useCallback((page: { originalWidth: number; originalHeight: number }) => {
    // Only set page width from the first page
    if (pageWidth === 0) {
      setPageWidth(page.originalWidth);
    }
  }, [pageWidth]);

  const fitToWidth = useCallback(() => {
    if (containerWidth > 0 && pageWidth > 0) {
      const fitScale = containerWidth / pageWidth;
      setScale(Math.max(0.5, Math.min(fitScale, 2)));
    }
  }, [containerWidth, pageWidth]);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError('Failed to load PDF: ' + err.message);
  }, []);

  // Memoize the file prop - use data directly instead of URL
  const fileData = useMemo(() => {
    if (!pdfData) return null;
    return { data: pdfData };
  }, [pdfData]);

  const zoomIn = useCallback(() => setScale(prev => Math.min(prev + 0.25, 3)), []);
  const zoomOut = useCallback(() => setScale(prev => Math.max(prev - 0.25, 0.25)), []);
  const rotate = useCallback(() => setRotation(prev => (prev + 90) % 360), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-4">
        {!isOnline && <WifiOff className="w-12 h-12 text-amber-500 mb-4" />}
        <p className="text-red-500 mb-2">{error}</p>
        {!isOnline && (
          <p className="text-sm text-slate-500">
            Connect to the internet or enable offline mode for this trip.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-slate-100 border-b border-slate-200 flex-wrap">
        <span className="text-sm text-slate-600 min-w-[60px] text-center">
          {numPages} {numPages === 1 ? 'page' : 'pages'}
        </span>
        <div className="w-px h-6 bg-slate-300 mx-1 sm:mx-2 hidden sm:block" />
        <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5} className="h-8 w-8 p-0">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-slate-600 min-w-[45px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3} className="h-8 w-8 p-0">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={fitToWidth} className="h-8 w-8 p-0" title="Fit to width">
          <Maximize2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-slate-300 mx-1 sm:mx-2 hidden sm:block" />
        <Button variant="outline" size="sm" onClick={rotate} className="h-8 w-8 p-0">
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

      {/* PDF Display - Continuous scroll */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-slate-200 flex justify-center p-4">
        {fileData && (
          <Document
            file={fileData}
            options={PDF_OPTIONS}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            }
          >
            <div className="flex flex-col items-center gap-4">
              {Array.from({ length: numPages }, (_, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  rotate={rotation}
                  className="shadow-lg"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  onLoadSuccess={index === 0 ? onPageLoadSuccess : undefined}
                />
              ))}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
