import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../server/http/shared';
import { db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify the request is from an authenticated user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    try {
      const decodedToken = await verifyFirebaseToken(token);
      if (decodedToken.uid !== userId) {
        return NextResponse.json({ error: 'Token does not match requested user ID' }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🔄 Force sync: Starting subscription sync for user:', userId);

    // Get customer data from Firestore
    const customerDoc = await db.collection('customers').doc(userId).get();
    
    if (!customerDoc.exists) {
      return NextResponse.json({ 
        error: 'No customer document found',
        suggestion: 'User needs to complete checkout first'
      }, { status: 404 });
    }

    const customerData = customerDoc.data();
    const stripeCustomerId = customerData?.stripeId;

    if (!stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No Stripe customer ID found',
        suggestion: 'User needs to complete checkout first'
      }, { status: 404 });
    }

    console.log('🔄 Force sync: Found Stripe customer ID:', stripeCustomerId);

    // Get all subscriptions for this customer from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 10,
      expand: ['data.items.data.price']
    });

    console.log('🔄 Force sync: Found', subscriptions.data.length, 'Stripe subscriptions');

    let syncedCount = 0;
    const results = [];

    for (const subscription of subscriptions.data) {
      const subscriptionId = subscription.id;
      
      // Check if subscription document already exists
      const existingSubDoc = await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).get();
      
      if (existingSubDoc.exists) {
        console.log('🔄 Force sync: Subscription', subscriptionId, 'already exists in Firestore');
        results.push({
          id: subscriptionId,
          status: 'already_exists',
          subscription_status: subscription.status
        });
        continue;
      }

      // Determine product type
      const priceId = subscription.items.data[0]?.price?.id;
      const isBlenderBin = [
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID,
        process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID
      ].includes(priceId);
      
      if (!isBlenderBin) {
        console.log('🔄 Force sync: Skipping non-BlenderBin subscription:', subscriptionId);
        results.push({
          id: subscriptionId,
          status: 'skipped_non_blenderbin',
          price_id: priceId
        });
        continue;
      }

      console.log('🔄 Force sync: Creating missing subscription document:', subscriptionId);

      // Create the subscription document
      const subscriptionData = {
        id: subscriptionId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        items: subscription.items.data.map((item: any) => ({
          id: item.id,
          price: {
            id: item.price.id,
            unit_amount: item.price.unit_amount,
            currency: item.price.currency,
            recurring: item.price.recurring
          },
          quantity: item.quantity
        })),
        metadata: subscription.metadata,
        created: new Date(subscription.created * 1000),
        stripeLink: `https://dashboard.stripe.com/subscriptions/${subscriptionId}`,
        productType: 'blenderbin',
        syncedFromStripe: true,
        syncedAt: new Date()
      };

      await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).set(subscriptionData);

      // Update user's main record if this is an active/trialing subscription
      if (['active', 'trialing'].includes(subscription.status)) {
        const tier = priceId === process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID || 
                    priceId === process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID 
                    ? 'yearly' : 'monthly';

        await db.collection('users').doc(userId).set({
          stripeRole: tier,
          subscriptionStatus: subscription.status,
          subscriptionId: subscriptionId,
          updatedAt: new Date(),
          lastSyncedFromStripe: new Date()
        }, { merge: true });

        console.log('🔄 Force sync: Updated user record with subscription status:', subscription.status);
      }

      syncedCount++;
      results.push({
        id: subscriptionId,
        status: 'created',
        subscription_status: subscription.status,
        is_trial: subscription.status === 'trialing'
      });
    }

    console.log('🔄 Force sync: Completed. Synced', syncedCount, 'subscriptions');

    return NextResponse.json({
      message: 'Force sync completed',
      userId,
      stripeCustomerId,
      totalSubscriptions: subscriptions.data.length,
      syncedSubscriptions: syncedCount,
      results
    });

  } catch (error) {
    console.error('🔄 Force sync error:', error);
    return NextResponse.json(
      { 
        error: 'Force sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
} 