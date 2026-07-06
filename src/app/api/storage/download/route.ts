import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';

/**
 * Check if URL is a valid Firebase Storage URL
 * Supports both old and new Firebase Storage URL formats:
 * - https://firebasestorage.googleapis.com/v0/b/{bucket}/o/...
 * - https://{bucket}.firebasestorage.app/...
 */
function isValidFirebaseStorageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes('firebasestorage.googleapis.com') ||
      urlObj.hostname.endsWith('.firebasestorage.app')
    );
  } catch {
    return false;
  }
}

/**
 * Server-side proxy for downloading files from Firebase Storage
 * This bypasses CORS restrictions since the request is made from the server
 */
export async function GET(request: NextRequest) {
  // Auth check
  const { authenticated } = await verifyAuth();
  if (!authenticated) {
    return unauthorizedResponse();
  }

  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  console.log('[Storage Proxy] Received request for URL:', url?.substring(0, 100) + '...');

  if (!url) {
    console.log('[Storage Proxy] Error: Missing url parameter');
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Validate that the URL is a Firebase Storage URL
    if (!isValidFirebaseStorageUrl(url)) {
      console.log('[Storage Proxy] Error: Invalid storage URL format');
      return NextResponse.json(
        { error: 'Invalid storage URL' },
        { status: 400 }
      );
    }

    console.log('[Storage Proxy] Fetching file from Firebase Storage...');

    // Fetch the file from Firebase Storage (server-side, no CORS)
    const response = await fetch(url);

    if (!response.ok) {
      console.log('[Storage Proxy] Error: Firebase returned', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the file as a blob
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    console.log('[Storage Proxy] Success: Downloaded', blob.size, 'bytes, type:', blob.type);

    // Return the file with appropriate headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Length': blob.size.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[Storage Proxy] Exception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download file' },
      { status: 500 }
    );
  }
}
