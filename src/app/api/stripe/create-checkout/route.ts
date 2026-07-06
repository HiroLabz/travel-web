import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICE_IDS, TRIAL_PERIOD_DAYS, StripePlanId } from '@/lib/stripe';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  // Auth check
  const { authenticated } = await verifyAuth();
  if (!authenticated) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { planId, userId, userEmail, stripeCustomerId } = body as {
      planId: StripePlanId;
      userId: string;
      userEmail: string;
      stripeCustomerId?: string;
    };

    if (!planId || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, userId, userEmail' },
        { status: 400 }
      );
    }

    const priceId = STRIPE_PRICE_IDS[planId];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    let customerId = stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUserId: userId,
        },
      });
      customerId = customer.id;
    }

    // Create Checkout Session with trial
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          firebaseUserId: userId,
          planId: planId,
        },
      },
      success_url: `${appUrl}/onboarding/group?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/onboarding/plan?canceled=true`,
      metadata: {
        firebaseUserId: userId,
        planId: planId,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      customerId, // Return so client can save it
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
