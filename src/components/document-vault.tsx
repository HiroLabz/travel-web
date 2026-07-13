'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { addDoc, collection, query, where, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { TravelDocument, TripFolder, HouseholdMember } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Trash2, ShieldCheck, Plane, FileQuestion, Plus, VenetianMask, FileBadge, Folder, FolderPlus, Pencil, Eye, ExternalLink, Image as ImageIcon, FileIcon, ZoomIn, ZoomOut, RotateCw, Sparkles, Search, MoreVertical, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PDFViewer } from '@/components/pdf-viewer';

function UploadDialog({
    tripId,
    householdId,
    availableFolders,
    onUploadComplete,
    tripStartDate,
    tripEndDate,
    onActivitiesAdded,
    members,
    onCreditError
}: {
    tripId: string,
    householdId: string,
    availableFolders: string[],
    onUploadComplete: () => void,
    tripStartDate?: string,
    tripEndDate?: string,
    onActivitiesAdded?: () => void,
    members: HouseholdMember[],
    onCreditError?: () => void
}) {
    const { user, refreshSubscription } = useAuth();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('');
    const [folder, setFolder] = useState('Others');
    const [newFolder, setNewFolder] = useState('');
    const [assignedTo, setAssignedTo] = useState('all');
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [autoAnalyze, setAutoAnalyze] = useState(true);

    const resetForm = () => {
        setFile(null);
        setFileName('');
        setFolder('Others');
        setNewFolder('');
        setAssignedTo('all');
        setAutoAnalyze(true);
    };

    const isPdf = file?.name.toLowerCase().endsWith('.pdf') || fileName.toLowerCase().endsWith('.pdf');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };

    const handleUpload = async () => {
        if (!file || !fileName || !user || !db || !storage) return;

        const targetFolder = folder === 'new' ? newFolder : folder;
        if (!targetFolder) {
            toast({ title: 'Error', description: 'Please select or create a folder.', variant: 'destructive' });
            return;
        }

        setUploading(true);
        try {
            const storageRef = ref(storage, `households/${householdId}/trips/${tripId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const assignedMember = members.find(m => (m.uid || m.name) === assignedTo);
            const docRef = await addDoc(collection(db, "documents"), {
                tripId,
                householdId,
                name: fileName,
                url: downloadURL,
                folder: targetFolder,
                uploadDate: serverTimestamp(),
                uploader: {
                    uid: user.uid,
                    name: user.displayName
                },
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                assignedTo: assignedTo,
                assignedToName: assignedTo === 'all' ? 'All' : (assignedMember?.name || assignedTo)
            });

            toast({ title: 'Success', description: 'Document uploaded.' });

            // Auto-analyze PDF if enabled
            if (isPdf && autoAnalyze) {
                setUploading(false);
                setAnalyzing(true);
                toast({ title: 'Analyzing PDF', description: 'Extracting travel information with AI...' });

                try {
                    const { analyzeTravelPdfAction } = await import('@/lib/actions');
                    const result = await analyzeTravelPdfAction(
                        tripId,
                        downloadURL,
                        docRef.id,
                        fileName,
                        tripStartDate,
                        tripEndDate,
                        user.uid
                    );

                    // Refresh subscription after AI usage
                    await refreshSubscription();

                    if (result.creditError) {
                        onCreditError?.();
                        return;
                    }

                    if (result.error) {
                        toast({
                            title: 'Analysis Failed',
                            description: result.error,
                            variant: 'destructive'
                        });
                    } else if (result.activities && result.activities.length > 0) {
                        const created = result.created || 0;
                        const merged = result.merged || 0;

                        if (created > 0 && merged > 0) {
                            toast({
                                title: 'Activities Processed',
                                description: `Created ${created} new and merged with ${merged} existing activit${merged === 1 ? 'y' : 'ies'}.`,
                            });
                        } else if (created > 0) {
                            toast({
                                title: 'Activities Created',
                                description: `Extracted ${created} activit${created === 1 ? 'y' : 'ies'} from ${result.documentType || 'document'}.`,
                            });
                        } else if (merged > 0) {
                            toast({
                                title: 'Activities Merged',
                                description: `Merged information with ${merged} existing activit${merged === 1 ? 'y' : 'ies'}.`,
                            });
                        }
                        onActivitiesAdded?.();
                    } else {
                        toast({
                            title: 'Analysis Complete',
                            description: 'No activities found in this document.',
                        });
                    }
                } catch (error) {
                    console.error('Error analyzing PDF:', error);
                    toast({
                        title: 'Analysis Error',
                        description: 'Failed to analyze PDF. You can try again from the document list.',
                        variant: 'destructive'
                    });
                } finally {
                    setAnalyzing(false);
                }
            }

            resetForm();
            onUploadComplete();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to upload document.', variant: 'destructive' });
        } finally {
            setUploading(false);
            setAnalyzing(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Input type="file" onChange={handleFileSelect} />
                {file && (
                    <>
                        <div>
                            <Label htmlFor="fileName">File Name</Label>
                            <Input id="fileName" value={fileName} onChange={(e) => setFileName(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="folder">Folder</Label>
                            <Select value={folder} onValueChange={setFolder}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a folder" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFolders.filter(f => f !== 'All').map((f) => (
                                        <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                    <SelectItem value="new">Create New Folder</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {folder === 'new' && (
                            <div>
                                <Label htmlFor="newFolder">New Folder Name</Label>
                                <Input id="newFolder" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="e.g., Hotel Bookings" />
                            </div>
                        )}
                        <div>
                            <Label htmlFor="assignedTo">Assign To</Label>
                            <Select value={assignedTo} onValueChange={setAssignedTo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a member" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Members</SelectItem>
                                    {members.map((member) => (
                                        <SelectItem key={member.uid || member.name} value={member.uid || member.name || ''}>
                                            {member.name || member.email || 'Unknown'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {isPdf && (
                            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <input
                                    type="checkbox"
                                    id="autoAnalyze"
                                    checked={autoAnalyze}
                                    onChange={(e) => setAutoAnalyze(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <label htmlFor="autoAnalyze" className="flex items-center gap-2 text-sm text-blue-700 cursor-pointer">
                                    <Sparkles className="w-4 h-4" />
                                    Auto-analyze PDF and create activities
                                </label>
                            </div>
                        )}
                    </>
                )}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => { resetForm(); onUploadComplete(); }} disabled={uploading || analyzing}>Cancel</Button>
                <Button onClick={handleUpload} disabled={!file || !fileName || uploading || analyzing}>
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                        </>
                    ) : analyzing ? (
                        <>
                            <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                            Analyzing...
                        </>
                    ) : (
                        'Upload'
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function CreateFolderDialog({ tripId, householdId, existingFolders, onComplete }: {
    tripId: string,
    householdId: string,
    existingFolders: string[],
    onComplete: () => void
}) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [folderName, setFolderName] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!folderName.trim() || !user || !db) return;

        if (existingFolders.includes(folderName.trim())) {
            toast({ title: 'Error', description: 'A folder with this name already exists.', variant: 'destructive' });
            return;
        }

        setCreating(true);
        try {
            await addDoc(collection(db, "folders"), {
                tripId,
                householdId,
                name: folderName.trim(),
                createdAt: serverTimestamp(),
                createdBy: {
                    uid: user.uid,
                    name: user.displayName
                }
            });
            toast({ title: 'Success', description: 'Folder created.' });
            setFolderName('');
            onComplete();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to create folder.', variant: 'destructive' });
        } finally {
            setCreating(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <Label htmlFor="folderName">Folder Name</Label>
                    <Input
                        id="folderName"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        placeholder="e.g., Hotel Bookings"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={onComplete}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!folderName.trim() || creating}>
                    {creating ? <Loader2 className="animate-spin" /> : 'Create'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function EditDocumentDialog({
    document,
    availableFolders,
    onComplete,
    members
}: {
    document: TravelDocument,
    availableFolders: string[],
    onComplete: () => void,
    members: HouseholdMember[]
}) {
    const { toast } = useToast();
    const [name, setName] = useState(document.name);
    const [folder, setFolder] = useState(document.folder);
    const [assignedTo, setAssignedTo] = useState(document.assignedTo || 'all');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || !folder || !db) return;

        setSaving(true);
        try {
            const assignedMember = members.find(m => (m.uid || m.name) === assignedTo);
            await updateDoc(doc(db, "documents", document.id), {
                name: name.trim(),
                folder,
                assignedTo: assignedTo,
                assignedToName: assignedTo === 'all' ? 'All' : (assignedMember?.name || assignedTo)
            });
            toast({ title: 'Success', description: 'Document updated.' });
            onComplete();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to update document.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <Label htmlFor="docName">Document Name</Label>
                    <Input
                        id="docName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div>
                    <Label htmlFor="docFolder">Folder</Label>
                    <Select value={folder} onValueChange={setFolder}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a folder" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFolders.filter(f => f !== 'All').map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="editAssignedTo">Assign To</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a member" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Members</SelectItem>
                            {members.map((member) => (
                                <SelectItem key={member.uid || member.name} value={member.uid || member.name || ''}>
                                    {member.name || member.email || 'Unknown'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={onComplete}>Cancel</Button>
                <Button onClick={handleSave} disabled={!name.trim() || !folder || saving}>
                    {saving ? <Loader2 className="animate-spin" /> : 'Save'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function DocumentPreviewDialog({
    document,
    documents,
    onClose,
    onNavigate
}: {
    document: TravelDocument,
    documents: TravelDocument[],
    onClose: () => void,
    onNavigate: (document: TravelDocument) => void
}) {
    const isMobile = useIsMobile();
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
    const [showControls, setShowControls] = useState(true);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Navigation state
    const currentIndex = documents.findIndex(d => d.id === document.id);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < documents.length - 1;

    // Auto-hide controls after inactivity
    const resetHideTimeout = useCallback(() => {
        setShowControls(true);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000); // Hide after 3 seconds
    }, []);

    // Initialize hide timeout and cleanup
    useEffect(() => {
        resetHideTimeout();
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, [resetHideTimeout]);

    // Reset timeout on user interaction
    const handleInteraction = useCallback(() => {
        resetHideTimeout();
    }, [resetHideTimeout]);

    // Embla carousel for swipe gestures (mobile only)
    const [emblaRef, emblaApi] = useEmblaCarousel({
        startIndex: currentIndex,
        watchDrag: isMobile,
        loop: false,
    });

    // Sync embla with document prop changes
    useEffect(() => {
        if (emblaApi && currentIndex >= 0) {
            emblaApi.scrollTo(currentIndex, !isMobile);
        }
    }, [emblaApi, currentIndex, isMobile]);

    // Handle embla slide change
    useEffect(() => {
        if (!emblaApi) return;

        const onSelect = () => {
            const index = emblaApi.selectedScrollSnap();
            const newDoc = documents[index];
            if (newDoc && newDoc.id !== document.id) {
                // Reset zoom/rotation when navigating
                setScale(1.0);
                setRotation(0);
                onNavigate(newDoc);
            }
        };

        emblaApi.on('select', onSelect);
        return () => { emblaApi.off('select', onSelect); };
    }, [emblaApi, documents, document.id, onNavigate]);

    // Navigation handlers
    const handlePrev = useCallback(() => {
        if (hasPrev) {
            setScale(1.0);
            setRotation(0);
            onNavigate(documents[currentIndex - 1]);
        }
    }, [hasPrev, currentIndex, documents, onNavigate]);

    const handleNext = useCallback(() => {
        if (hasNext) {
            setScale(1.0);
            setRotation(0);
            onNavigate(documents[currentIndex + 1]);
        }
    }, [hasNext, currentIndex, documents, onNavigate]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    handlePrev();
                    break;
                case 'ArrowRight':
                    handleNext();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePrev, handleNext]);

    // Determine file type from name or URL
    const getFileType = (name: string, url: string): 'image' | 'pdf' | 'other' => {
        const lowerName = name.toLowerCase();
        const lowerUrl = url.toLowerCase();

        if (lowerName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/) ||
            lowerUrl.includes('image/') ||
            lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)/)) {
            return 'image';
        }
        if (lowerName.endsWith('.pdf') || lowerUrl.includes('.pdf')) {
            return 'pdf';
        }
        return 'other';
    };

    const fileType = getFileType(document.name, document.url);

    const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const rotate = () => setRotation(prev => (prev + 90) % 360);

    // Render document content
    const renderDocumentContent = (doc: TravelDocument, isActive: boolean) => {
        const docFileType = getFileType(doc.name, doc.url);
        const isImageLoaded = loadedImages.has(doc.id);

        return (
            <>
                {/* Image Preview */}
                {docFileType === 'image' && (
                    <div className="flex items-center justify-center min-h-[500px] p-4">
                        {isActive && !isImageLoaded && (
                            <div className="absolute">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        )}
                        <img
                            src={doc.url}
                            alt={doc.name}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                            style={{
                                transform: isActive ? `scale(${scale}) rotate(${rotation}deg)` : 'none',
                                transition: 'transform 0.2s ease, opacity 0.3s ease',
                                opacity: isImageLoaded ? 1 : 0
                            }}
                            onLoad={() => {
                                if (!loadedImages.has(doc.id)) {
                                    setLoadedImages(prev => new Set([...prev, doc.id]));
                                }
                            }}
                        />
                    </div>
                )}

                {/* PDF Preview */}
                {docFileType === 'pdf' && (
                    <div className="h-full min-h-[500px]" style={{ height: 'calc(90vh - 180px)' }}>
                        <PDFViewer
                            documentId={doc.id}
                            documentUrl={doc.url}
                            documentName={doc.name}
                        />
                    </div>
                )}

                {/* Other files */}
                {docFileType === 'other' && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-4">
                        <FileQuestion className="w-16 h-16 text-slate-300 mb-4" />
                        <p className="text-slate-600 font-medium mb-2">Preview not available</p>
                        <p className="text-sm text-slate-500 mb-4">This file type cannot be previewed directly.</p>
                        <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Download File
                        </a>
                    </div>
                )}
            </>
        );
    };

    return (
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                <DialogTitle className="flex items-center justify-between pr-8">
                    <div className="flex items-center gap-2 min-w-0">
                        {fileType === 'image' && <ImageIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                        {fileType === 'pdf' && <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />}
                        {fileType === 'other' && <FileQuestion className="w-5 h-5 text-slate-500 flex-shrink-0" />}
                        <span className="truncate">{document.name}</span>
                        {documents.length > 1 && (
                            <span className="text-sm text-slate-400 font-normal ml-2">
                                {currentIndex + 1} / {documents.length}
                            </span>
                        )}
                    </div>
                    <a
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-normal flex-shrink-0"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Download
                    </a>
                </DialogTitle>
            </DialogHeader>

            {/* Toolbar for Image only */}
            {fileType === 'image' && (
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200">
                    <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600 min-w-[50px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3}>
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-slate-300 mx-2" />
                    <Button variant="outline" size="sm" onClick={rotate}>
                        <RotateCw className="w-4 h-4" />
                    </Button>
                </div>
            )}

            <div
                className="flex-1 overflow-hidden bg-slate-100 relative"
                style={{ minHeight: '500px' }}
                onMouseMove={handleInteraction}
                onTouchStart={handleInteraction}
                onClick={handleInteraction}
            >
                {/* Navigation buttons with auto-hide */}
                {hasPrev && documents.length > 1 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 bg-black/30 text-white hover:bg-black/50 rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrev();
                            resetHideTimeout();
                        }}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                )}
                {hasNext && documents.length > 1 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 bg-black/30 text-white hover:bg-black/50 rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                            resetHideTimeout();
                        }}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                )}

                {/* Embla carousel container */}
                <div ref={emblaRef} className="overflow-hidden h-full">
                    <div className="flex h-full">
                        {documents.map((doc, index) => (
                            <div key={doc.id} className="min-w-0 shrink-0 grow-0 basis-full h-full overflow-auto">
                                {renderDocumentContent(doc, index === currentIndex)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                <div className="text-sm text-slate-500">
                    {document.size} • {document.folder}
                </div>
                <Button variant="outline" onClick={onClose}>
                    Close
                </Button>
            </div>
        </DialogContent>
    );
}

import { analyzeTravelPdfAction } from '@/lib/actions';
import { UpgradePromptModal } from '@/components/upgrade-prompt-modal';
import { PLAN_LIMITS } from '@/types';

export function DocumentVault({ tripId, householdId, tripStartDate, tripEndDate, onActivitiesAdded, members = [] }: {
  tripId: string,
  householdId: string,
  tripStartDate?: string,
  tripEndDate?: string,
  onActivitiesAdded?: () => void,
  members?: HouseholdMember[]
}) {
  const { user, subscription, refreshSubscription } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [firestoreFolders, setFirestoreFolders] = useState<TripFolder[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [folders, setFolders] = useState<string[]>(['All', 'Ticket', 'Insurance', 'Passes', 'Others']);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<TravelDocument | null>(null);
  const [previewDocument, setPreviewDocument] = useState<TravelDocument | null>(null);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [memberFilter, setMemberFilter] = useState<string>('all');

  const { toast } = useToast();

  // Check if a document is a PDF
  const isPdfDocument = (doc: TravelDocument): boolean => {
    const lowerName = doc.name.toLowerCase();
    const lowerUrl = doc.url.toLowerCase();
    return lowerName.endsWith('.pdf') || lowerUrl.includes('.pdf');
  };

  // Handle PDF analysis
  const handleAnalyzePdf = async (doc: TravelDocument) => {
    if (!isPdfDocument(doc)) return;

    setAnalyzingDocId(doc.id);
    try {
      const result = await analyzeTravelPdfAction(
        tripId,
        doc.url,
        doc.id,
        doc.name,
        tripStartDate,
        tripEndDate,
        user?.uid
      );

      // Refresh subscription after AI usage
      await refreshSubscription();

      if (result.creditError) {
        setShowUpgradeModal(true);
        return;
      }

      if (result.error) {
        toast({
          title: 'Analysis Failed',
          description: result.error,
          variant: 'destructive'
        });
        return;
      }

      const created = result.created || 0;
      const merged = result.merged || 0;

      if (created > 0 && merged > 0) {
        toast({
          title: 'Activities Processed',
          description: `Created ${created} new and merged with ${merged} existing activit${merged === 1 ? 'y' : 'ies'}.`,
        });
      } else if (created > 0) {
        toast({
          title: 'Activities Created',
          description: `Extracted ${created} activit${created === 1 ? 'y' : 'ies'}.`,
        });
      } else if (merged > 0) {
        toast({
          title: 'Activities Merged',
          description: `Merged information with ${merged} existing activit${merged === 1 ? 'y' : 'ies'}.`,
        });
      } else {
        toast({
          title: 'Analysis Complete',
          description: 'No activities found in this document.',
        });
      }

      // Notify parent component that activities were added
      if (onActivitiesAdded && result.activities && result.activities.length > 0) {
        onActivitiesAdded();
      }
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze the PDF. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setAnalyzingDocId(null);
    }
  };

  // Fetch folders from Firestore
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "folders"), where("tripId", "==", tripId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const foldersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TripFolder));
      setFirestoreFolders(foldersData);
    }, (error) => {
      console.error("Error fetching folders: ", error);
    });
    return () => unsubscribe();
  }, [tripId]);

  // Fetch documents and merge folder lists
  useEffect(() => {
    if (!db) {
        setLoadingDocs(false);
        return;
    }
    const q = query(collection(db, "documents"), where("tripId", "==", tripId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TravelDocument));
      setDocuments(docsData);
      setLoadingDocs(false);
    }, (error) => {
        console.error("Error fetching documents: ", error);
        setLoadingDocs(false);
    });

    return () => unsubscribe();
  }, [tripId]);

  // Merge folders from Firestore, documents, and defaults
  // Ensure 'Others' is always the last tab
  useEffect(() => {
    const defaultFolders = ['Ticket', 'Insurance', 'Passes'];
    const firestoreFolderNames = firestoreFolders.map(f => f.name).filter(f => f !== 'Others');
    const docFolders = documents.map(d => d.folder).filter(f => f && !defaultFolders.includes(f) && f !== 'Others');
    const allCustomFolders = [...new Set([...firestoreFolderNames, ...docFolders])];
    setFolders(['All', ...defaultFolders, ...allCustomFolders, 'Others']);
  }, [firestoreFolders, documents]);
  
  const handleDelete = async (docToDelete: TravelDocument) => {
     if (!storage || !db) return;
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
        const fileRef = ref(storage, docToDelete.url);
        await deleteObject(fileRef);
        await deleteDoc(doc(db, "documents", docToDelete.id));
        toast({ title: 'Success', description: 'Document deleted.' });
    } catch(error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to delete document.', variant: 'destructive' });
    }
  }

  const getIcon = (folder: TravelDocument['folder']) => {
    switch (folder?.toLowerCase()) {
      case 'ticket': return <Plane className="w-5 h-5 text-blue-500" />;
      case 'insurance': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'passes': return <VenetianMask className="w-5 h-5 text-blue-500" />;
      case 'others': return <FileQuestion className="w-5 h-5 text-slate-500" />;
      default: return <FileBadge className="w-5 h-5 text-amber-600" />;
    }
  };

  const filteredDocs = documents.filter(d => {
    const matchesFolder = activeTab === 'All' || d.folder === activeTab;
    const matchesSearch = !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMember = memberFilter === 'all' || d.assignedTo === memberFilter || d.assignedTo === 'all';
    return matchesFolder && matchesSearch && matchesMember;
  });

  return (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-warning-soft text-warning-accent flex items-center justify-center flex-shrink-0">
            <Folder className="w-5 h-5" />
          </span>
          Family binder
        </h3>
        <div className="flex items-center space-x-2">
          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center border-border text-muted-foreground hover:bg-muted rounded-lg">
                <FolderPlus className="w-4 h-4 mr-1.5" />
                New Folder
              </Button>
            </DialogTrigger>
            <CreateFolderDialog
              tripId={tripId}
              householdId={householdId}
              existingFolders={folders}
              onComplete={() => setIsFolderDialogOpen(false)}
            />
          </Dialog>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center bg-brand-500 hover:bg-brand-600 rounded-lg">
                <Upload className="w-4 h-4 mr-1.5" />
                Add Doc
              </Button>
            </DialogTrigger>
            <UploadDialog
              tripId={tripId}
              householdId={householdId}
              availableFolders={folders}
              onUploadComplete={() => setIsUploadDialogOpen(false)}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              onActivitiesAdded={onActivitiesAdded}
              members={members}
              onCreditError={() => setShowUpgradeModal(true)}
            />
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {members.length > 0 && (
          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <Users className="w-4 h-4 mr-1.5 text-slate-400" />
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.uid || member.name} value={member.uid || member.name || ''}>
                  {member.name || member.email || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
        {folders.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-brand-subtle text-brand-500'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loadingDocs && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
      
      {!loadingDocs && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDocs.map((d) => (
            <div
              key={d.id}
              className="p-3 border border-border rounded-lg hover:border-brand-300 hover:shadow-sm transition-all group bg-muted/50 cursor-pointer"
              onClick={() => setPreviewDocument(d)}
            >
                <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className="bg-card p-2 rounded-md shadow-sm">
                    {getIcon(d.folder)}
                    </div>
                    <div className="overflow-hidden">
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px] block group-hover:text-brand-500">{d.name}</span>
                     <p className="text-xs text-muted-foreground">{d.size} • {d.folder}{d.assignedToName && d.assignedToName !== 'All' && <span className="ml-1 text-brand-500">• {d.assignedToName}</span>}</p>
                    </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setPreviewDocument(d)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingDocument(d)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {isPdfDocument(d) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleAnalyzePdf(d)}
                            disabled={analyzingDocId === d.id}
                          >
                            {analyzingDocId === d.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Analyze with AI
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(d)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                </div>
            </div>
            ))}
            {filteredDocs.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? 'No documents match your search.' : 'No documents in this folder.'}
            </div>
            )}
        </div>
      )}

      {/* Edit Document Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={(open) => !open && setEditingDocument(null)}>
        {editingDocument && (
          <EditDocumentDialog
            document={editingDocument}
            availableFolders={folders}
            onComplete={() => setEditingDocument(null)}
            members={members}
          />
        )}
      </Dialog>

      {/* Preview Document Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        {previewDocument && (
          <DocumentPreviewDialog
            document={previewDocument}
            documents={filteredDocs}
            onClose={() => setPreviewDocument(null)}
            onNavigate={(doc) => setPreviewDocument(doc)}
          />
        )}
      </Dialog>

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remainingCredits={subscription ? Math.max(0, PLAN_LIMITS[subscription.plan].monthlyCredits - subscription.creditsUsed) : 0}
        planName={subscription?.plan || 'starter'}
      />
    </div>
  );
}
