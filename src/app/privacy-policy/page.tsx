import { redirect } from 'next/navigation';

// Canonical Privacy Policy lives at /legal/privacy. This top-level URL
// (/privacy-policy) exists because Play Console + App Store Connect both
// expect that exact path in the developer profile fields, and lots of
// inbound deep-links use it too. Keep content in /legal/privacy/page.tsx;
// this file just keeps the public URL stable.
export default function PrivacyPolicyRedirect(): never {
  redirect('/legal/privacy');
}
