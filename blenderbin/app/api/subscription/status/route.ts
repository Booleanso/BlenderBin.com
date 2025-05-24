// app/api/subscription/status/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';

// BlenderBin price IDs to include in BlenderBin subscription checks
const BLENDERBIN_PRICE_IDS = [
  // BlenderBin Production Price IDs
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID, // Yearly
  // BlenderBin Test Price IDs
  process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID, // Test Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID, // Test Yearly
].filter(Boolean); // Remove undefined values

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
    console.log(`Checking BlenderBin subscription status for user: ${userId}`);
    
    // Check the customers collection where subscription data is stored
    const customerDoc = await db.collection('customers').doc(userId).get();
    
    if (!customerDoc.exists) {
      console.log(`No customer document found for user: ${userId}`);
      return NextResponse.json({ 
        isSubscribed: false,
        status: 'none',
        subscriptionId: null,
        priceId: null
      });
    }

    // Look for active subscriptions (including trialing) - removed orderBy to avoid index issues
    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .limit(10) // Get more to filter through
      .get();

    console.log(`Found ${subscriptionsSnapshot.size} potential subscriptions for user: ${userId}`);

    // If no active subscriptions found
    if (subscriptionsSnapshot.empty) {
      console.log(`No active subscriptions found for user: ${userId}`);
      return NextResponse.json({ 
        isSubscribed: false,
        status: 'none',
        subscriptionId: null,
        priceId: null
      });
    }

    // Filter for BlenderBin subscriptions by checking price IDs
    const blenderBinSubscriptions = subscriptionsSnapshot.docs
      .map(doc => ({ id: doc.id, data: doc.data(), ref: doc.ref }))
      .filter(sub => {
        // Include only BlenderBin subscriptions by checking price IDs
        if (sub.data.items && sub.data.items.length > 0) {
          return sub.data.items.some((item: any) => {
            const priceId = item.price?.id;
            return priceId && BLENDERBIN_PRICE_IDS.includes(priceId);
          });
        }
        return false; // Exclude if no items or price info
      })
      .sort((a, b) => {
        const aCreated = a.data.created?.toDate?.() || a.data.created || new Date(0);
        const bCreated = b.data.created?.toDate?.() || b.data.created || new Date(0);
        return new Date(bCreated).getTime() - new Date(aCreated).getTime();
      });

    if (blenderBinSubscriptions.length === 0) {
      console.log(`No active BlenderBin subscriptions found for user: ${userId}`);
      return NextResponse.json({ 
        isSubscribed: false,
        status: 'none',
        subscriptionId: null,
        priceId: null
      });
    }
    
    // Get the most recent BlenderBin subscription
    const subscriptionInfo = blenderBinSubscriptions[0];
    const subscription = subscriptionInfo.data;
    const subscriptionId = subscriptionInfo.id;
    
    console.log(`Using BlenderBin subscription: ${subscriptionId}, status: ${subscription.status}`);
    
    // Extract subscription details
    const status = subscription.status || 'active';
    const isTrialing = status === 'trialing';
    const isCanceling = subscription.cancel_at_period_end === true;
    
    // Get price ID from subscription items
    let priceId = null;
    if (subscription.items && subscription.items.length > 0) {
      priceId = subscription.items[0].price?.id || null;
    }
    
    // Get trial and billing period information
    let trialStart = null;
    let trialEnd = null;
    let currentPeriodStart = null;
    let currentPeriodEnd = null;
    
    // Handle trial dates
    if (subscription.trial_start) {
      trialStart = subscription.trial_start.toDate ? 
        subscription.trial_start.toDate().toISOString() : 
        subscription.trial_start.toISOString();
    }
    
    if (subscription.trial_end) {
      trialEnd = subscription.trial_end.toDate ? 
        subscription.trial_end.toDate().toISOString() : 
        subscription.trial_end.toISOString();
    }
    
    // Handle billing period dates
    if (subscription.current_period_start) {
      currentPeriodStart = subscription.current_period_start.toDate ? 
        subscription.current_period_start.toDate().toISOString() : 
        subscription.current_period_start.toISOString();
    }
    
    if (subscription.current_period_end) {
      currentPeriodEnd = subscription.current_period_end.toDate ? 
        subscription.current_period_end.toDate().toISOString() : 
        subscription.current_period_end.toISOString();
    }
    
    // For trialing subscriptions, use trial_end as the current period end
    const effectivePeriodEnd = isTrialing && trialEnd ? trialEnd : currentPeriodEnd;
    
    // Calculate days remaining in trial
    let trialDaysRemaining = null;
    if (isTrialing && trialEnd) {
      const trialEndDate = new Date(trialEnd);
      const now = new Date();
      const diffTime = trialEndDate.getTime() - now.getTime();
      trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Ensure we don't show negative days
      if (trialDaysRemaining < 0) {
        trialDaysRemaining = 0;
      }
    }
    
    const response = {
      isSubscribed: true,
      subscriptionId: subscriptionId,
      status: status,
      priceId: priceId,
      cancelAtPeriodEnd: isCanceling,
      currentPeriodStart: currentPeriodStart,
      currentPeriodEnd: effectivePeriodEnd,
      isTrialing: isTrialing,
      trialStart: trialStart,
      trialEnd: trialEnd,
      trialDaysRemaining: trialDaysRemaining,
      stripeLink: subscription.stripeLink || null,
      hasPremiumAccess: status === 'trialing' || status === 'active'
    };
    
    console.log(`BlenderBin subscription status response for user ${userId}:`, {
      subscriptionId,
      status,
      isTrialing,
      trialDaysRemaining
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error checking BlenderBin subscription status for user', userId, ':', error);
    
    // Return a more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json(
      { 
        error: 'Failed to check BlenderBin subscription status',
        details: errorMessage,
        userId: userId
      },
      { status: 500 }
    );
  }
}