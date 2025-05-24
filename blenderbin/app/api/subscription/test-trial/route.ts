import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';
import Stripe from 'stripe';

// BlenderBin price IDs
const BLENDERBIN_PRICE_IDS = [
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID,
  process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID,
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID,
].filter(Boolean);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const action = url.searchParams.get('action') || 'status';

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`TEST: Checking trial functionality for user: ${userId}, action: ${action}`);
    
    // Get customer document
    const customerDoc = await db.collection('customers').doc(userId).get();
    
    if (!customerDoc.exists) {
      return NextResponse.json({ 
        error: 'Customer not found',
        userId,
        suggestions: [
          'User may not have completed signup',
          'Check if user exists in Firebase Auth',
          'Verify customer collection setup'
        ]
      });
    }

    const customerData = customerDoc.data();
    const stripeCustomerId = customerData?.stripeId;

    // Test subscription status endpoints
    const testResults: any = {
      userId,
      customerData: {
        stripeId: stripeCustomerId,
        email: customerData?.email,
        hasStripeCustomer: !!stripeCustomerId
      },
      subscriptionAPIs: {},
      stripeData: {},
      firebaseExtensionData: {},
      recommendations: []
    };

    // Test 1: Check BlenderBin subscription status API
    try {
      const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/subscription/status?userId=${userId}`);
      const statusData = statusResponse.ok ? await statusResponse.json() : { error: 'API call failed' };
      testResults.subscriptionAPIs.blenderBinStatus = {
        success: statusResponse.ok,
        data: statusData
      };
    } catch (error) {
      testResults.subscriptionAPIs.blenderBinStatus = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Check trial status API
    try {
      const trialResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/subscription/trial-status?userId=${userId}`);
      const trialData = trialResponse.ok ? await trialResponse.json() : { error: 'API call failed' };
      testResults.subscriptionAPIs.trialStatus = {
        success: trialResponse.ok,
        data: trialData
      };
    } catch (error) {
      testResults.subscriptionAPIs.trialStatus = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Get Firestore subscription data
    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .get();

    const subscriptions = subscriptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created: doc.data()?.created?.toDate?.()?.toISOString() || doc.data()?.created,
      trial_start: doc.data()?.trial_start?.toDate?.()?.toISOString() || doc.data()?.trial_start,
      trial_end: doc.data()?.trial_end?.toDate?.()?.toISOString() || doc.data()?.trial_end,
      current_period_start: doc.data()?.current_period_start?.toDate?.()?.toISOString() || doc.data()?.current_period_start,
      current_period_end: doc.data()?.current_period_end?.toDate?.()?.toISOString() || doc.data()?.current_period_end
    }));

    testResults.firebaseExtensionData.subscriptions = subscriptions;

    // Test 4: Get Stripe data if customer exists
    if (stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          limit: 10
        });

        testResults.stripeData = {
          customer: customer.deleted ? null : {
            id: customer.id,
            email: (customer as Stripe.Customer).email,
            created: (customer as Stripe.Customer).created
          },
          subscriptions: stripeSubscriptions.data.map((sub: Stripe.Subscription) => ({
            id: sub.id,
            status: sub.status,
            trial_start: sub.trial_start,
            trial_end: sub.trial_end,
            current_period_start: sub.current_period_start,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
            items: sub.items.data.map((item: Stripe.SubscriptionItem) => ({
              price_id: item.price.id,
              price_amount: item.price.unit_amount,
              price_currency: item.price.currency
            }))
          }))
        };
      } catch (error) {
        testResults.stripeData.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Test 5: Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    testResults.userData = userDoc.exists ? userDoc.data() : null;

    // Generate recommendations
    const activeTrials = subscriptions.filter((sub: any) => sub.status === 'trialing');
    const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');
    
    if (activeTrials.length === 0 && activeSubscriptions.length === 0) {
      testResults.recommendations.push('No active trials or subscriptions found');
      testResults.recommendations.push('User may need to start a trial via /api/checkout/trial');
    }

    if (activeTrials.length > 0) {
      testResults.recommendations.push(`Found ${activeTrials.length} active trial(s)`);
      activeTrials.forEach((trial: any, index: number) => {
        const trialEnd = new Date(trial.trial_end);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        testResults.recommendations.push(`Trial ${index + 1}: ${daysRemaining} days remaining (ends ${trialEnd.toLocaleDateString()})`);
      });
    }

    if (stripeCustomerId && testResults.stripeData.subscriptions?.length > 0) {
      testResults.recommendations.push('Stripe subscriptions found - webhook sync appears to be working');
    } else if (!stripeCustomerId) {
      testResults.recommendations.push('No Stripe customer ID - user may not have completed checkout');
    }

    // Summary
    testResults.summary = {
      hasFirestoreSubscriptions: subscriptions.length > 0,
      hasStripeSubscriptions: testResults.stripeData.subscriptions?.length > 0,
      activeTrials: activeTrials.length,
      activeSubscriptions: activeSubscriptions.length,
      apiEndpointsWorking: testResults.subscriptionAPIs.blenderBinStatus.success && testResults.subscriptionAPIs.trialStatus.success,
      trialFunctionalityStatus: activeTrials.length > 0 ? 'WORKING' : activeSubscriptions.length > 0 ? 'CONVERTED_TO_PAID' : 'NO_TRIAL_FOUND'
    };

    return NextResponse.json(testResults);
    
  } catch (error) {
    console.error('Error in trial test endpoint:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to test trial functionality',
        details: error instanceof Error ? error.message : 'Unknown error',
        userId: userId
      },
      { status: 500 }
    );
  }
} 