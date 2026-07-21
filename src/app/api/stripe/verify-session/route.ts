import { NextRequest, NextResponse } from 'next/server';
import { getStripe, STRIPE_PRICE_IDS, StripePlanId } from '@/lib/stripe';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  // Auth check
  const { authenticated } = await verifyAuth();
  if (!authenticated) {
    return unauthorizedResponse();
  }

  try {
    const stripe = getStripe();
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    const subscription = session.subscription as import('stripe').Stripe.Subscription | null;

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400 }
      );
    }

    // Determine plan from metadata or price
    let plan: StripePlanId = (session.metadata?.planId as StripePlanId) || 'starter';
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId === STRIPE_PRICE_IDS.wanderer) {
      plan = 'wanderer';
    }

    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : undefined;

    return NextResponse.json({
      success: true,
      customerId: session.customer as string,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      plan,
      trialEnd,
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}
