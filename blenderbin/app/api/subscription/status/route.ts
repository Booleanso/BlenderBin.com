// app/api/subscription/status/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Query the subscriptions collection instead of purchases
    const subscriptionDoc = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing']) // Check for active subscriptions
      .limit(1)
      .get();

    const isSubscribed = !subscriptionDoc.empty;
    const subscription = subscriptionDoc.docs[0]?.data();

    return NextResponse.json({
      isSubscribed,
      priceId: subscription?.price?.id
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}