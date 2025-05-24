import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';

// BlenderBin price IDs to include in BlenderBin subscription operations
const BLENDERBIN_PRICE_IDS = [
  // BlenderBin Production Price IDs
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID, // Yearly
  // BlenderBin Test Price IDs
  process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID, // Test Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID, // Test Yearly
].filter(Boolean); // Remove undefined values

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('Processing BlenderBin subscription cancellation for user:', userId);

    // Get user's subscription from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const stripeSubscriptionId = userData?.subscriptionId;

    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: 'No BlenderBin subscription found for this user' }, { status: 404 });
    }

    try {
      // Cancel the subscription immediately in Stripe
      console.log('Cancelling Stripe BlenderBin subscription immediately:', stripeSubscriptionId);
      
      const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
      console.log('BlenderBin subscription canceled in Stripe:', canceledSubscription.id, 'Status:', canceledSubscription.status);

      // Update the subscription document in Firestore
      await db.collection('customers').doc(userId).collection('subscriptions').doc(stripeSubscriptionId).update({
        status: 'canceled',
        canceled_at: new Date(),
        ended_at: new Date(),
        updated: new Date()
      });
      
      // Update user's main record
      await db.collection('users').doc(userId).update({
        stripeRole: 'free',
        subscriptionStatus: 'canceled',
        updatedAt: new Date()
      });

      console.log(`Successfully canceled BlenderBin subscription ${stripeSubscriptionId} for user ${userId}`);

      return NextResponse.json(
        { 
          message: 'BlenderBin subscription canceled successfully',
          subscriptionId: stripeSubscriptionId,
          status: canceledSubscription.status
        },
        { status: 200 }
      );

    } catch (stripeError) {
      console.error('Stripe BlenderBin cancellation error:', stripeError);
      
      // If the subscription is already canceled in Stripe, update our records
      if (stripeError instanceof Error && 
          (stripeError.message.includes('already been canceled') || 
           stripeError.message.includes('No such subscription'))) {
        
        // Update Firestore to reflect the canceled state
        await db.collection('customers').doc(userId).collection('subscriptions').doc(stripeSubscriptionId).update({
          status: 'canceled',
          canceled_at: new Date(),
          ended_at: new Date(),
          updated: new Date()
        });
        
        await db.collection('users').doc(userId).update({
          stripeRole: 'free',
          subscriptionStatus: 'canceled',
          updatedAt: new Date()
        });
        
        return NextResponse.json(
          { 
            message: 'BlenderBin subscription was already canceled',
            subscriptionId: stripeSubscriptionId
          },
          { status: 200 }
        );
      }
      
      // For other Stripe errors, return error response
      return NextResponse.json(
        { 
          error: 'Failed to cancel Stripe BlenderBin subscription',
          details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in BlenderBin subscription cancellation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}