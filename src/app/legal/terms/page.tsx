import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | WanderNest',
  description:
    'Terms governing your use of the WanderNest web app and the WanderNest mobile apps for iOS and Android.',
};

const LAST_UPDATED = 'May 17, 2026';

export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use
        of the WanderNest web app at <em>wandernest.app</em> and the
        WanderNest mobile apps for iOS and Android (together, the
        &quot;Service&quot;), provided by WanderNest (&quot;we&quot;, &quot;us&quot;). By
        creating an account or using the Service you agree to these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 13 years old (16 in the EEA) and have the
        legal capacity to enter into a contract. If you use the Service on
        behalf of an organization or family, you represent that you have
        authority to bind that group.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You are responsible for keeping your credentials secret.</li>
        <li>
          You must notify us immediately of any unauthorized access at{' '}
          <a href="mailto:support@wandernest.app">support@wandernest.app</a>.
        </li>
        <li>
          One person, one account. You may not share login credentials.
        </li>
      </ul>

      <h2>3. Wander Groups and shared content</h2>
      <p>
        Trip data you create can be shared with members of any Wander
        Group you join or invite others into, including:
      </p>
      <ul>
        <li>Trips, destinations, itineraries, activities, and notes.</li>
        <li>Expenses, budgets, and shared receipts.</li>
        <li>Documents and photos you attach.</li>
        <li>
          Hike and trail-run recordings (including the recorded GPS
          breadcrumb trail, distance, elevation gain, and time) when
          you save them to a group.
        </li>
      </ul>
      <p>
        Once you share content with a Wander Group, other members can
        view, edit, and export it according to their role. Removing
        yourself from a group does not delete the content you contributed
        . See <a href="/privacy-policy#account-deletion">Section 7 of the
        Privacy Policy</a> for the deletion contract.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful purposes.</li>
        <li>
          Upload malware, illegal content, content infringing third-party
          rights, or content that harasses or impersonates others.
        </li>
        <li>
          Attempt to circumvent rate limits, security measures, or access
          controls (including the AI-credit gate or Firebase App Check).
        </li>
        <li>Reverse engineer, scrape, or resell the Service.</li>
        <li>
          Use the Service to build a competing product or to train a
          machine-learning model.
        </li>
        <li>
          Use the hike-recording features in a manner that endangers
          yourself or others (see the disclaimer in Section 10).
        </li>
      </ul>

      <h2>5. AI credits</h2>
      <p>
        AI-assisted features (trip itinerary generation, hike briefs,
        receipt parsing, country info, etc.) consume a monthly credit
        allowance. New free accounts start with 100 credits per month;
        unused credits do not roll over. The allowance and per-feature
        costs may change as the underlying model costs change. We will
        announce material changes in-app at least 14 days before they
        take effect.
      </p>

      <h2>6. Your content, your rights</h2>
      <p>
        You retain all rights to the trip content, photos, documents, and
        hike recordings you upload. By using the Service you grant
        WanderNest a worldwide, royalty-free, non-exclusive license to
        host, store, transmit, and display your content solely for the
        purpose of operating and improving the Service for you and your
        Wander Group.
      </p>

      <h2>7. AI-assisted features</h2>
      <p>
        The Service uses third-party AI models (Google Gemini via
        Firebase AI) and a web-search grounding provider (Tavily) to
        parse PDFs, suggest itineraries, analyze receipts, and generate
        hike briefs. Output is generated automatically and may be
        inaccurate. Always verify critical details (dates, prices,
        trail distances, elevation gain). You are responsible for the
        content you act on. We do not share your content with the AI
        provider for model training.
      </p>

      <h2>8. Location services</h2>
      <p>
        With your explicit permission, the mobile app accesses your
        device location:
      </p>
      <ul>
        <li>
          <strong>While in use</strong>: to centre maps and geocode
          destinations.
        </li>
        <li>
          <strong>In the background</strong>: only while a hike or
          trail-run recording is in progress. The recording, and the
          background-location use that supports it, ends when you tap
          Finish or Discard. Android displays a persistent ongoing
          notification while the recording runs; iOS shows the system
          background-location indicator.
        </li>
      </ul>
      <p>
        You can revoke location permission at any time through your
        device settings; recording features will be unavailable until
        you re-grant it.
      </p>

      <h2>9. Service changes and availability</h2>
      <p>
        We may add, remove, or modify features at any time. We aim for
        high availability but the Service is provided &quot;as is&quot; without
        uptime guarantees outside any separately agreed SLA.
      </p>

      <h2>10. Disclaimers (outdoor recreation)</h2>
      <p>
        WanderNest&apos;s hike briefs, trail data, weather forecasts, and
        recording features are <strong>informational only</strong>. They
        are assembled from third-party data (OpenStreetMap,
        Open-Elevation, Open-Meteo, AI-generated summaries grounded in
        public web reports) and may be incomplete or out of date. Trail
        conditions, weather, permits, and safety hazards change quickly
        , so always cross-reference with current local sources, carry
        adequate equipment, and turn back if conditions exceed your
        ability. You are solely responsible for your own safety and
        decisions in the field.
      </p>

      <h2>11. Termination</h2>
      <p>
        You can stop using the Service at any time and delete your
        account from <em>Profile → Delete account</em>. We may suspend
        or terminate your account if you breach these Terms or if
        required by law. On termination, sections 4, 6 (license to
        residual data), 10, 11, 12 and 14 survive.
      </p>

      <h2>12. General disclaimer</h2>
      <p>
        The Service is provided on an &quot;as is&quot; and &quot;as available&quot;
        basis. To the fullest extent permitted by law, we disclaim all
        warranties, express or implied, including merchantability,
        fitness for a particular purpose, and non-infringement. We do
        not warrant that the Service will be uninterrupted or
        error-free, or that AI-generated suggestions will be accurate.
      </p>

      <h2>13. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, WanderNest will not be
        liable for any indirect, incidental, special, consequential, or
        punitive damages, or any loss of profits or revenues. Our total
        liability for any claim arising out of or relating to these
        Terms or the Service is limited to the greater of (a) the
        amount you paid us in the twelve months before the claim, or
        (b) USD 100.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Republic of the
        Philippines, without regard to conflict-of-laws rules. Disputes
        will be heard in the courts of Makati City, except where local
        consumer-protection law gives you a non-waivable right to bring
        a claim in your home jurisdiction.
      </p>

      <h2>15. Changes to these Terms</h2>
      <p>
        We will post any changes here and update the &quot;Last updated&quot;
        date. Material changes will be announced in-app at least 14
        days before they take effect. Continued use after the effective
        date constitutes acceptance.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href="mailto:support@wandernest.app">support@wandernest.app</a>.
      </p>
    </article>
  );
}
