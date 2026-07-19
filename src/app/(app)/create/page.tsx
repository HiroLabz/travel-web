import { redirect } from 'next/navigation';

// The create-trip flow now lives in a modal on the dashboard
// (see src/components/create-trip-modal.tsx). This route only exists
// so bookmarks/shared links/refreshes still land somewhere sensible.
export default function CreateTripRedirectPage() {
  redirect('/dashboard?create=1');
}
