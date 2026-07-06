import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | WanderNest',
  description: 'How to reach the WanderNest team for support, privacy, and security inquiries.',
};

export default function ContactPage() {
  return (
    <article>
      <h1>Contact</h1>

      <h2>Support</h2>
      <p>
        For help using WanderNest (bugs, feature requests, billing
        questions), email
        {' '}<a href="mailto:support@wandernest.app">support@wandernest.app</a>.
        We aim to reply within 2 business days.
      </p>

      <h2>Privacy &amp; data requests</h2>
      <p>
        For privacy questions, data access requests, or account deletion,
        email
        {' '}<a href="mailto:privacy@wandernest.app">privacy@wandernest.app</a>.
        You can also delete your account directly from the mobile app
        under <em>Profile → Delete account</em>.
      </p>

      <h2>Security</h2>
      <p>
        Found a vulnerability? Please disclose it responsibly to
        {' '}<a href="mailto:security@wandernest.app">security@wandernest.app</a>.
        We&apos;ll acknowledge within 72 hours and keep you posted on the
        fix.
      </p>

      <h2>Mailing address</h2>
      <p>
        WanderNest
        <br />
        Makati City, Philippines
      </p>
    </article>
  );
}
