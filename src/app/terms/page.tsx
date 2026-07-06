import { redirect } from 'next/navigation';

// Canonical Terms of Service lives at /legal/terms. Mirrors the
// /privacy-policy redirect — keeps the short public URL stable for store
// listings and inbound links.
export default function TermsRedirect(): never {
  redirect('/legal/terms');
}
