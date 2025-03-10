import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Log the request for debugging
    console.log('Cancellation request for user:', userId);

    // Get active subscriptions for the user
    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
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
    
    console.log('Found subscription data:', JSON.stringify(subscriptionData, null, 2));

    // Get the Stripe subscription ID from the document
    // Based on the data structure shown in the image, we need to look for it in different places
    let stripeSubscriptionId = null;
    
    // First check if it's in the document ID itself
    if (subscriptionDoc.id.startsWith('sub_')) {
      stripeSubscriptionId = subscriptionDoc.id;
    } 
    // Then check if it's in the data
    else if (subscriptionData.id) {
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

    if (!stripeSubscriptionId) {
      console.error('No Stripe subscription ID found in document:', subscriptionDoc.id);
      console.error('Subscription data:', subscriptionData);
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

      // The Firebase extension will automatically update the subscription status in Firestore
      // via the webhook, but we can also update it here for immediate feedback to the user
      await subscriptionDoc.ref.update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        ended_at: new Date().toISOString()
      });

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