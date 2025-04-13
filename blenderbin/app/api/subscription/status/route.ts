// app/api/subscription/status/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    // Check the customers collection where the extension stores subscription data
    const customerDoc = await db.collection('customers').doc(userId).get();
    
    if (!customerDoc.exists) {
      return NextResponse.json({ isSubscribed: false });
    }

    // Look for subscriptions with active or trialing status
    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .get();

    // Check for placeholder documents with status field set to "trialing"
    const placeholderSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', '==', 'trialing')
      .get();

    // If we don't have active or trialing subscriptions in either query
    if (subscriptionsSnapshot.empty && placeholderSnapshot.empty) {
      return NextResponse.json({ isSubscribed: false });
    }

    // Prioritize the regular subscription records
    let subscription;
    let isTrialOnly = false;
    
    if (!subscriptionsSnapshot.empty) {
      subscription = subscriptionsSnapshot.docs[0].data();
    } else if (!placeholderSnapshot.empty) {
      subscription = placeholderSnapshot.docs[0].data();
      isTrialOnly = true;
    } else {
      return NextResponse.json({ isSubscribed: false });
    }
    
    // Check if the subscription is set to cancel at the end of the period - safely
    const isCanceling = subscription.cancel_at_period_end === true;
    
    // Safely determine status, default to active if not specified
    const status = subscription.status || 'active';
    
    // Safely extract price ID
    let priceId = null;
    if (subscription.price && typeof subscription.price === 'object' && subscription.price.id) {
      priceId = subscription.price.id;
    }
    
    // Safely get current period end timestamp
    let currentPeriodEnd = null;
    if (subscription.current_period_end) {
      if (typeof subscription.current_period_end === 'object' && subscription.current_period_end._seconds) {
        currentPeriodEnd = new Date(subscription.current_period_end._seconds * 1000).toISOString();
      } else if (subscription.current_period_end instanceof Date) {
        currentPeriodEnd = subscription.current_period_end.toISOString();
      } else if (typeof subscription.current_period_end === 'string') {
        currentPeriodEnd = subscription.current_period_end;
      }
    }
    
    return NextResponse.json({
      isSubscribed: true,
      priceId: priceId,
      subscriptionId: subscription.id || 'placeholder',
      status: status,
      cancelAtPeriodEnd: isCanceling,
      currentPeriodEnd: currentPeriodEnd,
      isTrialOnly: isTrialOnly
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}