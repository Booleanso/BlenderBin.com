import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';
import Stripe from 'stripe';

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
    console.log(`DEBUG: Checking trial status for user: ${userId}`);
    
    // Get customer document
    const customerDoc = await db.collection('customers').doc(userId).get();
    
    if (!customerDoc.exists) {
      return NextResponse.json({ 
        error: 'Customer not found',
        userId 
      });
    }

    const customerData = customerDoc.data();
    const stripeCustomerId = customerData?.stripeId;

    // Get all subscriptions for this user
    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .get();

    const subscriptions = subscriptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get Stripe customer info if available
    let stripeCustomer: Stripe.Customer | null = null;
    let stripeSubscriptions: Stripe.Subscription[] = [];
    
    if (stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (!customer.deleted) {
          stripeCustomer = customer as Stripe.Customer;
        }
        const stripeSubsResponse = await stripe.subscriptions.list({
          customer: stripeCustomerId
        });
        stripeSubscriptions = stripeSubsResponse.data;
      } catch (error) {
        console.error('Error fetching Stripe data:', error);
      }
    }

    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    const debugInfo = {
      userId,
      customerData: {
        stripeId: stripeCustomerId,
        email: customerData?.email,
        name: customerData?.name
      },
      userData: {
        stripeRole: userData?.stripeRole,
        subscriptionStatus: userData?.subscriptionStatus,
        subscriptionId: userData?.subscriptionId
      },
      firestoreSubscriptions: subscriptions,
      stripeCustomer: stripeCustomer ? {
        id: stripeCustomer.id,
        email: stripeCustomer.email,
        created: stripeCustomer.created
      } : null,
      stripeSubscriptions: stripeSubscriptions.map((sub: Stripe.Subscription) => ({
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
      })),
      summary: {
        hasFirestoreSubscriptions: subscriptions.length > 0,
        hasStripeSubscriptions: stripeSubscriptions.length > 0,
        activeTrials: subscriptions.filter((sub: any) => sub.status === 'trialing').length,
        activeSubscriptions: subscriptions.filter((sub: any) => sub.status === 'active').length
      }
    };

    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch debug info',
        details: error instanceof Error ? error.message : 'Unknown error',
        userId: userId
      },
      { status: 500 }
    );
  }
} 