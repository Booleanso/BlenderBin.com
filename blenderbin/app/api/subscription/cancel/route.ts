import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Ensure we're using the live mode Stripe key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-11-20.acacia', // Latest API version
    });

    console.log('Using Stripe in LIVE mode');

    // Log the request for debugging
    console.log('Cancellation request for user:', userId);

    // Get the customer document first to ensure we have access to the stripeId
    const customerDoc = await db.collection('customers').doc(userId).get();
    
    if (!customerDoc.exists) {
      console.log('No customer document found for user:', userId);
      return NextResponse.json(
        { error: 'User has no subscription information' },
        { status: 404 }
      );
    }
    
    const customerData = customerDoc.data();
    console.log('Customer data:', JSON.stringify(customerData, null, 2));
    
    const customerStripeId = customerData?.stripeId;
    
    if (!customerStripeId) {
      console.log('No Stripe customer ID found for user:', userId);
      return NextResponse.json(
        { error: 'No Stripe customer ID found' },
        { status: 400 }
      );
    }

    // Get active subscriptions for the user
    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .limit(1)
      .get();
      
    // Check for placeholder trial documents if no regular subscriptions found
    const placeholderSnapshot = subscriptionsSnapshot.empty ? 
      await db
        .collection('customers')
        .doc(userId)
        .collection('subscriptions')
        .where('status', '==', 'trialing')
        .limit(1)
        .get() : null;

    // If both queries returned empty, no active subscription
    if (subscriptionsSnapshot.empty && (placeholderSnapshot === null || placeholderSnapshot.empty)) {
      console.log('No active subscription found for user:', userId);
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Use the appropriate snapshot
    const subscriptionDoc = !subscriptionsSnapshot.empty ? 
      subscriptionsSnapshot.docs[0] : 
      (placeholderSnapshot && !placeholderSnapshot.empty ? placeholderSnapshot.docs[0] : null);
    
    if (!subscriptionDoc) {
      return NextResponse.json(
        { error: 'Unable to retrieve subscription document' },
        { status: 400 }
      );
    }
    
    const subscriptionData = subscriptionDoc.data();
    console.log('Found subscription data:', JSON.stringify(subscriptionData, null, 2));

    // Get the Stripe subscription ID from the document or look it up from customer
    let stripeSubscriptionId = null;
    let isTrialOnly = false;
    
    // First check if it's in the document ID itself
    if (subscriptionDoc.id.startsWith('sub_')) {
      stripeSubscriptionId = subscriptionDoc.id;
    } 
    // Then check if it's in the data
    else if (subscriptionData.id && subscriptionData.id.startsWith('sub_')) {
      stripeSubscriptionId = subscriptionData.id;
    } 
    // Check if it's in the stripeLink URL
    else if (subscriptionData.stripeLink && typeof subscriptionData.stripeLink === 'string') {
      const match = subscriptionData.stripeLink.match(/\/subscriptions\/([^\/]+)/);
      if (match && match[1]) {
        stripeSubscriptionId = match[1];
      }
    }
    // Check if it's in the items array
    else if (subscriptionData.items && Array.isArray(subscriptionData.items) && subscriptionData.items.length > 0) {
      const item = subscriptionData.items[0];
      if (item.id && item.id.startsWith('si_')) {
        // If we have an item ID, we can use it to find the subscription
        try {
          const subscriptionItem = await stripe.subscriptionItems.retrieve(item.id);
          stripeSubscriptionId = subscriptionItem.subscription;
        } catch (error) {
          console.error('Error retrieving subscription item:', error);
        }
      }
    }
    
    // If we couldn't find a subscription ID but we have a placeholder with trialing status,
    // we need to look up the customer's subscriptions directly from Stripe
    if (!stripeSubscriptionId && subscriptionData.status === 'trialing') {
      isTrialOnly = true;
      console.log('Looking up trial subscription from Stripe for customer:', customerStripeId);
      
      try {
        // List active subscriptions for the customer
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: customerStripeId,
          status: 'trialing',
          limit: 1
        });
        
        if (stripeSubscriptions.data.length > 0) {
          stripeSubscriptionId = stripeSubscriptions.data[0].id;
          console.log('Found trial subscription from Stripe API:', stripeSubscriptionId);
        }
      } catch (error) {
        console.error('Error looking up subscriptions from Stripe:', error);
      }
    }

    // If we still couldn't find a subscription ID, try to get it directly from Stripe using the customer ID
    if (!stripeSubscriptionId) {
      try {
        console.log('Attempting to find any subscription for customer:', customerStripeId);
        
        const allSubscriptions = await stripe.subscriptions.list({
          customer: customerStripeId,
          limit: 5,
          expand: ['data.default_payment_method']
        });
        
        if (allSubscriptions.data.length > 0) {
          // Use the most recent subscription if multiple exist
          stripeSubscriptionId = allSubscriptions.data[0].id;
          console.log('Found subscription from Stripe API:', stripeSubscriptionId);
        }
      } catch (error) {
        console.error('Error looking up all subscriptions from Stripe:', error);
      }
    }

    if (!stripeSubscriptionId) {
      console.error('No Stripe subscription ID found in document:', subscriptionDoc.id);
      console.error('Subscription data:', subscriptionData);
      
      // For trial-only users, update the document in Firestore even if we can't cancel in Stripe
      if (isTrialOnly && subscriptionDoc.id === 'placeholder') {
        console.log('Updating placeholder document for trial cancellation without Stripe call');
        await subscriptionDoc.ref.update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          ended_at: new Date().toISOString()
        });
        
        return NextResponse.json(
          { 
            message: 'Free trial canceled in database (no Stripe subscription found)',
            subscriptionId: 'placeholder'
          },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: 'No Stripe subscription ID found in the subscription data' },
        { status: 400 }
      );
    }

    try {
      // Cancel the subscription in Stripe immediately
      console.log('Cancelling Stripe subscription immediately:', stripeSubscriptionId);
      
      // Use cancel() to immediately cancel the subscription
      const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

      console.log('Subscription canceled:', canceledSubscription.id, 'Status:', canceledSubscription.status);

      // Update the subscription document in Firestore
      await subscriptionDoc.ref.update({
        status: null,
        canceled_at: new Date().toISOString(),
        ended_at: new Date().toISOString()
      });
      
      // For trial-only users with placeholder documents, we should also update the placeholder document
      if (isTrialOnly && subscriptionDoc.id === 'placeholder') {
        console.log('Updating placeholder document for trial cancellation');
        await subscriptionDoc.ref.update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          ended_at: new Date().toISOString()
        });
      }

      // Return success response
      return NextResponse.json(
        { 
          message: 'Subscription canceled successfully',
          subscriptionId: stripeSubscriptionId,
          status: canceledSubscription.status
        },
        { status: 200 }
      );
    } catch (stripeError) {
      console.error('Stripe cancellation error:', stripeError);
      
      // If the error is because the subscription is already canceled, return success
      if (stripeError instanceof Error && 
          stripeError.message.includes('already been canceled')) {
        return NextResponse.json(
          { 
            message: 'Subscription is already canceled',
            subscriptionId: stripeSubscriptionId
          },
          { status: 200 }
        );
      }
      
      // For placeholder trials, update in Firestore even if Stripe API fails
      if (isTrialOnly && subscriptionDoc.id === 'placeholder') {
        console.log('Updating placeholder document despite Stripe API failure');
        await subscriptionDoc.ref.update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          ended_at: new Date().toISOString()
        });
        
        return NextResponse.json(
          { 
            message: 'Free trial canceled in database (Stripe API error)',
            error: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error',
            subscriptionId: 'placeholder'
          },
          { status: 200 }
        );
      }
      
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