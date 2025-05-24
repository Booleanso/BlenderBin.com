import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';

// BlenderBin price IDs to include in BlenderBin trial status checks
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
    console.log(`Checking BlenderBin trial status for user: ${userId}`);
    
    // Get active subscriptions - removed orderBy to avoid index issues
    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .limit(10) // Get more to filter through
      .get();

    console.log(`Found ${subscriptionsSnapshot.size} potential subscriptions for BlenderBin trial status check`);

    if (subscriptionsSnapshot.empty) {
      console.log(`No active subscriptions found for BlenderBin trial status check`);
      return NextResponse.json({
        hasActiveTrial: false,
        hasActiveSubscription: false,
        trialDaysRemaining: 0,
        trialEndDate: null,
        subscriptionStatus: 'none'
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
      console.log(`No active BlenderBin subscriptions found for trial status check`);
      return NextResponse.json({
        hasActiveTrial: false,
        hasActiveSubscription: false,
        trialDaysRemaining: 0,
        trialEndDate: null,
        subscriptionStatus: 'none'
      });
    }

    // Get the most recent BlenderBin subscription
    const subscriptionInfo = blenderBinSubscriptions[0];
    const subscription = subscriptionInfo.data;
    const status = subscription.status || 'active';
    const isTrialing = status === 'trialing';

    console.log(`BlenderBin trial status check - subscription: ${subscriptionInfo.id}, status: ${status}, isTrialing: ${isTrialing}`);

    let trialDaysRemaining = 0;
    let trialEndDate = null;
    let trialStartDate = null;

    if (isTrialing && subscription.trial_end) {
      // Convert trial end to Date object
      trialEndDate = subscription.trial_end.toDate ? 
        subscription.trial_end.toDate() : 
        new Date(subscription.trial_end);
      
      // Calculate days remaining
      const now = new Date();
      const diffTime = trialEndDate.getTime() - now.getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      
      // Get trial start date
      if (subscription.trial_start) {
        trialStartDate = subscription.trial_start.toDate ? 
          subscription.trial_start.toDate() : 
          new Date(subscription.trial_start);
      }
    }

    // Get price information
    let priceId = null;
    let planType = 'unknown';
    if (subscription.items && subscription.items.length > 0) {
      priceId = subscription.items[0].price?.id;
      
      // Determine plan type based on BlenderBin price ID (monthly vs yearly)
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 
          priceId === process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID) {
        planType = 'monthly';
      } else if (priceId === process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID || 
                 priceId === process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID) {
        planType = 'yearly';
      }
    }

    const response = {
      hasActiveTrial: isTrialing,
      hasActiveSubscription: status === 'active',
      subscriptionStatus: status,
      subscriptionId: subscriptionInfo.id,
      trialDaysRemaining: trialDaysRemaining,
      trialEndDate: trialEndDate ? trialEndDate.toISOString() : null,
      trialStartDate: trialStartDate ? trialStartDate.toISOString() : null,
      priceId: priceId,
      planType: planType,
      willAutoRenew: !subscription.cancel_at_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false
    };

    console.log(`BlenderBin trial status response:`, { isTrialing, trialDaysRemaining, status, planType });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting BlenderBin trial status for user', userId, ':', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('BlenderBin trial status error details:', { message: errorMessage, userId });
    
    return NextResponse.json(
      { 
        error: 'Failed to get BlenderBin trial status',
        details: errorMessage,
        userId: userId
      },
      { status: 500 }
    );
  }
} 