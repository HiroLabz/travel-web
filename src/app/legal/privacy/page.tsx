import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | WanderNest',
  description:
    'How WanderNest collects, uses, stores, shares, and deletes your personal data across the web app and the iOS and Android mobile apps.',
};

const LAST_UPDATED = 'May 17, 2026';

export default function PrivacyPolicyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

      <p>
        WanderNest (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides a collaborative travel
        planning service via the WanderNest web app at{' '}
        <em>wandernest.app</em> and the WanderNest mobile apps for iOS and
        Android (collectively, the &quot;Service&quot;). This Privacy Policy
        explains what personal data we collect, why we collect it, how we
        use and share it, and the choices you have, including how to
        delete your account. By using the Service you agree to the terms
        below. If you do not agree, please do not use the Service.
      </p>

      <h2>1. Information we collect</h2>
      <p>
        We only collect what we need to operate the Service. Concretely:
      </p>
      <ul>
        <li>
          <strong>Account data.</strong> Email address, display name, and
          password hash when you sign up directly; or your basic profile
          (email, name, avatar) when you sign in with Google.
        </li>
        <li>
          <strong>Trip content.</strong> Trips, destinations, itineraries,
          activities, expenses, budgets, attached documents, and notes you
          create. These are visible to other members of the same Wander
          Group but never to the public.
        </li>
        <li>
          <strong>Files and photos.</strong> Documents, receipts, and
          images you upload, stored via Firebase Cloud Storage.
        </li>
        <li>
          <strong>Location (foreground).</strong> Approximate or precise
          device location, only when you explicitly grant permission, to
          show your position on a trip map or to geocode a destination.
        </li>
        <li>
          <strong>Location, background (Hike Mode only).</strong> When
          you start a hike or trail-run recording, the app continues to
          sample your GPS position while the screen is off or the app is
          backgrounded. On Android this runs as an explicit foreground
          service with a persistent notification; on iOS it relies on the{' '}
          <code>location</code> background mode and the system shows the
          standard blue status-bar indicator. Recording stops when you
          tap <em>Finish</em> or <em>Discard</em>. The resulting trail of
          breadcrumbs (latitude, longitude, altitude, speed, accuracy,
          timestamp) is saved to your selected Wander Group.
        </li>
        <li>
          <strong>Diagnostics.</strong> App version, device model, OS
          version, anonymous installation ID, crash stack traces, and
          aggregated interaction events (Firebase Analytics &amp;
          Crashlytics) so we can diagnose bugs and improve usability.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create and authenticate your account.</li>
        <li>To store and sync your trip data across devices.</li>
        <li>
          To enable collaboration with members of the Wander Groups you
          belong to.
        </li>
        <li>
          To provide AI-assisted features (e.g. parsing travel PDFs into
          itinerary entries, generating hike briefs grounded in recent
          web sources). Content you submit to those features is processed
          by Google Gemini via Firebase AI on our behalf and is not used
          to train third-party models.
        </li>
        <li>
          To compute hike statistics (distance, moving time, pace,
          elevation gain) from your recorded GPS breadcrumbs.
        </li>
        <li>
          To deliver the trail-information that appears in the Hike Brief
          card by combining your activity location with publicly
          available data from OpenStreetMap, Open-Elevation, and
          Open-Meteo. Your account identity is not sent to those
          services. Only the coordinates needed to answer the query are sent.
        </li>
        <li>To detect, prevent, and respond to abuse, fraud, and bugs.</li>
        <li>
          To send you essential service emails (password resets, security
          notices). We do not send marketing emails.
        </li>
      </ul>

      <h2>3. Legal bases (EEA / UK)</h2>
      <p>
        We rely on (a) your consent for optional features such as
        location, AI features, and analytics; (b) the necessity to
        perform the contract you have with us when delivering core
        trip-planning features; and (c) our legitimate interests in
        keeping the Service safe and improving it.
      </p>

      <h2>4. How we share data</h2>
      <p>
        We do not sell your personal data. We share it only with the
        following categories of recipients:
      </p>
      <ul>
        <li>
          <strong>Service providers.</strong>{' '}
          Google (Firebase Authentication, Firestore, Cloud Storage,
          Crashlytics, Analytics, App Check, Firebase AI / Gemini) under
          data-processing agreements. Servers are located in the United
          States and Europe.
        </li>
        <li>
          <strong>Web grounding (Tavily).</strong> When you generate an
          AI Hike Brief or trip explore card, we send the search query
          (e.g. the name of the trail or city you typed) to Tavily so we
          can ground the AI&apos;s answer in recent web sources. We do not
          send your identity, account email, or location to Tavily.
        </li>
        <li>
          <strong>Public mapping &amp; weather services.</strong>{' '}
          OpenStreetMap (Overpass API), Open-Elevation, Open-Meteo, and
          the MapLibre demo style endpoint receive only the coordinates
          and bounding boxes needed to answer your request. No account
          information is included.
        </li>
        <li>
          <strong>Other Wander Group members.</strong> Trip content,
          including any hike recordings you save to the group, is
          visible to people you invite into a Wander Group.
        </li>
        <li>
          <strong>Legal &amp; safety.</strong> When required by law,
          court order, or to protect rights and safety.
        </li>
      </ul>

      <h2>5. Data retention</h2>
      <p>
        We retain account and trip data for as long as your account is
        active. When you delete your account (see <em>Section 7</em>),
        we permanently remove your profile, trips you solely own, hike
        recordings, photo timeline entries, and uploaded files within 30
        days, except where we are legally required to keep records (e.g.
        financial logs, abuse reports). Crash reports and aggregated
        analytics retain pseudonymous installation identifiers; those
        identifiers are not linked to your email after deletion.
      </p>

      <h2>6. Your rights</h2>
      <p>You can at any time:</p>
      <ul>
        <li>Access and download your trip data from inside the app.</li>
        <li>Correct your profile information.</li>
        <li>
          Delete your account from the <em>Profile → Delete account</em>{' '}
          screen in the mobile app, or by emailing{' '}
          <a href="mailto:privacy@wandernest.app">privacy@wandernest.app</a>.
          See <em>Section 7</em> below for what gets removed.
        </li>
        <li>
          Withdraw consent for optional features (location, background
          location, analytics, AI features). Withdrawing consent does
          not affect processing already done.
        </li>
        <li>
          Lodge a complaint with your local data-protection authority.
        </li>
      </ul>

      <h2 id="account-deletion">7. Account deletion</h2>
      <p>
        You can delete your WanderNest account at any time. Two ways:
      </p>
      <ol>
        <li>
          <strong>In the app.</strong> Open <em>Profile → Delete
          account</em>. You will be asked to re-authenticate (Firebase
          requires a recent sign-in for destructive operations) and to
          confirm. The operation cannot be undone.
        </li>
        <li>
          <strong>By email.</strong> Send a deletion request from the
          email address tied to your account to{' '}
          <a href="mailto:privacy@wandernest.app">
            privacy@wandernest.app
          </a>
          . We respond within 7 days and complete deletion within 30.
        </li>
      </ol>
      <p>
        <strong>What gets deleted:</strong>
      </p>
      <ul>
        <li>Your Firebase Authentication record (email, hashed password, linked Google identity).</li>
        <li>Your user profile document (display name, avatar, subscription state, preferences).</li>
        <li>Trips and Wander Groups where you are the sole owner.</li>
        <li>
          Hike and trail-run recordings you created (including all GPS
          breadcrumbs and chunked breadcrumb tails), regardless of which
          Wander Group they were shared to.
        </li>
        <li>
          Photos, receipts, and documents you uploaded that are not
          attached to a Wander Group still active under another member.
        </li>
        <li>AI request caches keyed to your account (e.g. cached hike briefs).</li>
      </ul>
      <p>
        <strong>What may remain:</strong>
      </p>
      <ul>
        <li>
          Content you contributed to a Wander Group you do not solely
          own (e.g. a trip co-owned with family). The other members
          retain that content; your authorship reference becomes
          anonymized to <em>&quot;Former member&quot;</em>.
        </li>
        <li>
          Aggregated, pseudonymous analytics and crash logs that cannot
          be re-associated with your identity after deletion.
        </li>
        <li>
          Records we must retain by law (tax, anti-fraud, court order).
        </li>
      </ul>
      <p>
        If you only want to leave a Wander Group without closing your
        account, use <em>Profile → My Wander Groups → Leave</em>{' '}
        instead. That preserves your account and other groups intact.
      </p>

      <h2>8. Children</h2>
      <p>
        WanderNest is not directed at children under 13 (or under 16 in
        the EEA). We do not knowingly collect personal data from
        children. If you believe a child has provided us data, contact us
        and we will delete it.
      </p>

      <h2>9. Security</h2>
      <p>
        Data is encrypted in transit using TLS and at rest using
        provider-managed keys. We follow Firebase security best
        practices, including least-privilege Firestore security rules
        and Firebase App Check (Play Integrity on Android, DeviceCheck
        on iOS) to block unauthorized requests. No system is perfectly
        secure; please use a strong unique password and enable
        two-factor authentication on your linked Google account.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Your data may be processed in countries other than your own,
        including the United States. We rely on Google&apos;s Standard
        Contractual Clauses for transfers from the EEA / UK.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We will update this page when our practices change and revise
        the &quot;Last updated&quot; date. Material changes will be announced
        in-app at least 14 days before they take effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about this policy? Email us at{' '}
        <a href="mailto:privacy@wandernest.app">privacy@wandernest.app</a>.
      </p>
    </article>
  );
}
