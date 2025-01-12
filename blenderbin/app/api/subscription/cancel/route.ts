import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';  // Import your existing stripe instance

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (subscriptionsSnapshot.empty) {
      console.log('No active subscription found for user:', userId);
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const subscriptionDoc = subscriptionsSnapshot.docs[0];
    const subscriptionData = subscriptionDoc.data();

    // Get the Stripe subscription ID
    const stripeSubscriptionId = subscriptionData?.stripeSubscriptionId || subscriptionData?.items?.[0]?.subscription;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No Stripe subscription ID found' },
        { status: 400 }
      );
    }

    try {
      // Cancel the subscription in Stripe
      console.log('Cancelling Stripe subscription:', stripeSubscriptionId);
      const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

      if (canceledSubscription.status === 'canceled') {
        // Update Firestore document
        await subscriptionDoc.ref.update({
          status: 'canceled',
          cancel_at_period_end: true,
          canceled_at: {
            _seconds: Math.floor(Date.now() / 1000),
            _nanoseconds: 0
          },
          ended_at: {
            _seconds: Math.floor(Date.now() / 1000),
            _nanoseconds: 0
          }
        });

        return NextResponse.json(
          { 
            message: 'Subscription canceled successfully',
            subscriptionId: stripeSubscriptionId
          },
          { status: 200 }
        );
      }
    } catch (stripeError) {
      console.error('Stripe cancellation error:', stripeError);
      return NextResponse.json(
        { 
          error: 'Failed to cancel Stripe subscription',
          details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in subscription cancellation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}