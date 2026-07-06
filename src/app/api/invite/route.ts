import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Server-side env. Set in `.env.local` (web) or your production secrets store:
//   RESEND_API_KEY=re_live_xxxxxxxxxx
//   MAIL_FROM_ADDRESS=noreply@aviarthard.tech
//
// The mobile app POSTs to this route when an admin invites someone to
// their Wander Group. The email is informational — the recipient still
// has to sign in to WanderNest and the household admin still has to
// accept them via Firestore. We do NOT verify the Firebase ID token
// here yet because firebase-admin isn't installed (would add ~12 MB to
// the serverless bundle). Mitigations:
//   1. Resend's own rate limits cap the abuse blast radius.
//   2. We log every send with the inviter email — anomalous patterns
//      surface in Resend's dashboard.
//   3. The recipient's join still requires Firestore-rules-gated writes.
// If/when abuse becomes real, swap in firebase-admin `verifyIdToken` and
// match the `inviterUid` claim against `auth.uid`.

interface InvitePayload {
  recipientEmail: string;
  recipientName?: string;
  householdId: string;
  householdName: string;
  inviterName: string;
  inviterEmail: string;
  /// Deep-link the recipient is sent to after install — typically the
  /// mobile app's deep link, e.g. `https://wandernest.app/join/<hid>`.
  joinUrl?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildSubject(p: InvitePayload): string {
  return `${p.inviterName} invited you to join ${p.householdName} on WanderNest`;
}

function buildHtml(p: InvitePayload): string {
  const safeRecipient = escapeHtml(p.recipientName || 'there');
  const safeInviter = escapeHtml(p.inviterName);
  const safeInviterEmail = escapeHtml(p.inviterEmail);
  const safeHousehold = escapeHtml(p.householdName);
  const safeJoinUrl = p.joinUrl
    ? escapeHtml(p.joinUrl)
    : 'https://wandernest.app';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(buildSubject(p))}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#2563eb;padding:32px;text-align:center;">
                <div style="display:inline-block;background:#ffffff;color:#2563eb;font-weight:800;font-size:22px;letter-spacing:1px;padding:10px 14px;border-radius:10px;">WN</div>
                <h1 style="margin:18px 0 0;font-size:22px;color:#ffffff;font-weight:700;">You're invited to a Wander Group</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${safeRecipient},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                  <strong>${safeInviter}</strong> invited you to join
                  <strong>${safeHousehold}</strong> on WanderNest, a
                  collaborative travel-planning app for trips, expenses,
                  itineraries, and shared hike recordings.
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
                  Tap the button below to accept and join. If you don't
                  have the app yet, you'll be guided through the install
                  on iOS or Android first.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
                  <tr>
                    <td style="background:#2563eb;border-radius:999px;">
                      <a href="${safeJoinUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                        Accept invitation
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  Or copy this link into your browser:<br/>
                  <a href="${safeJoinUrl}" style="color:#2563eb;word-break:break-all;">${safeJoinUrl}</a>
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                  This invitation was sent by ${safeInviter} (${safeInviterEmail}).
                  If you don't recognise this person or didn't expect this
                  email, you can safely ignore it. No account is created
                  on your behalf.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f4f6f9;padding:16px 32px;text-align:center;font-size:12px;color:#64748b;">
                WanderNest · Plan trips together · <a href="https://wandernest.app/privacy-policy" style="color:#64748b;">Privacy</a> · <a href="https://wandernest.app/terms" style="color:#64748b;">Terms</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildText(p: InvitePayload): string {
  const join = p.joinUrl ?? 'https://wandernest.app';
  return [
    `Hi ${p.recipientName || 'there'},`,
    '',
    `${p.inviterName} (${p.inviterEmail}) invited you to join ${p.householdName} on WanderNest, a collaborative travel-planning app for trips, expenses, itineraries, and shared hike recordings.`,
    '',
    `Accept the invitation: ${join}`,
    '',
    `If you don't recognise this person or didn't expect this email, you can ignore it. No account is created on your behalf.`,
    '',
    'WanderNest · https://wandernest.app',
  ].join('\n');
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.MAIL_FROM_ADDRESS;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server not configured (RESEND_API_KEY missing).' },
      { status: 500 },
    );
  }
  if (!fromAddress) {
    return NextResponse.json(
      { error: 'Server not configured (MAIL_FROM_ADDRESS missing).' },
      { status: 500 },
    );
  }

  let body: InvitePayload;
  try {
    body = (await req.json()) as InvitePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.recipientEmail || !isValidEmail(body.recipientEmail)) {
    return NextResponse.json(
      { error: 'recipientEmail is required and must be a valid email.' },
      { status: 400 },
    );
  }
  if (!body.householdId || !body.householdName) {
    return NextResponse.json(
      { error: 'householdId and householdName are required.' },
      { status: 400 },
    );
  }
  if (!body.inviterName || !body.inviterEmail || !isValidEmail(body.inviterEmail)) {
    return NextResponse.json(
      { error: 'inviterName and a valid inviterEmail are required.' },
      { status: 400 },
    );
  }

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: `WanderNest <${fromAddress}>`,
      to: [body.recipientEmail],
      replyTo: body.inviterEmail,
      subject: buildSubject(body),
      html: buildHtml(body),
      text: buildText(body),
      tags: [
        { name: 'category', value: 'household_invite' },
        { name: 'household_id', value: body.householdId },
      ],
    });
    if (error) {
      console.error('[invite] resend error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send invite.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    console.error('[invite] unexpected error:', e);
    return NextResponse.json(
      { error: 'Unexpected error sending invite.' },
      { status: 500 },
    );
  }
}
