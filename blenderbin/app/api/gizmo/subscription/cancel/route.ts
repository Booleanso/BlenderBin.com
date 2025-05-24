import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase-admin';
import { stripe } from '../../../../lib/stripe';

// Gizmo AI price IDs to include in Gizmo subscription operations
const GIZMO_PRICE_IDS = [
  // Gizmo Production Price IDs
  process.env.NEXT_PUBLIC_GIZMO_STRIPE_PRICE_ID, // Gizmo Monthly
  process.env.NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_PRICE_ID, // Gizmo Yearly
  process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_PRICE_ID, // Gizmo Business Monthly
  process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_PRICE_ID, // Gizmo Business Yearly
  // Gizmo Test Price IDs
  process.env.NEXT_PUBLIC_GIZMO_STRIPE_TEST_PRICE_ID, // Gizmo Test Monthly
  process.env.NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_TEST_PRICE_ID, // Gizmo Test Yearly
  process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_TEST_PRICE_ID, // Gizmo Test Business Monthly
  process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_TEST_PRICE_ID, // Gizmo Test Business Yearly
].filter(Boolean); // Remove undefined values

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('Processing Gizmo subscription cancellation for user:', userId);

    // Get user's subscription from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const stripeSubscriptionId = userData?.gizmoSubscriptionId;

    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: 'No Gizmo subscription found for this user' }, { status: 404 });
    }

    try {
      // Cancel the subscription immediately in Stripe
      console.log('Cancelling Stripe Gizmo subscription immediately:', stripeSubscriptionId);
      
      const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
      console.log('Gizmo subscription canceled in Stripe:', canceledSubscription.id, 'Status:', canceledSubscription.status);

      // Update the subscription document in Firestore
      await db.collection('customers').doc(userId).collection('subscriptions').doc(stripeSubscriptionId).update({
        status: 'canceled',
        canceled_at: new Date(),
        ended_at: new Date(),
        updated: new Date()
      });
      
      // Update user's Gizmo subscription status in their main record
      await db.collection('users').doc(userId).update({
        gizmoSubscription: 'free',
        gizmoSubscriptionStatus: 'canceled',
        updatedAt: new Date()
      });

      console.log(`Successfully canceled Gizmo subscription ${stripeSubscriptionId} for user ${userId}`);

      return NextResponse.json(
        { 
          message: 'Gizmo subscription canceled successfully',
          subscriptionId: stripeSubscriptionId,
          status: canceledSubscription.status
        },
        { status: 200 }
      );

    } catch (stripeError) {
      console.error('Stripe Gizmo cancellation error:', stripeError);
      
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
          gizmoSubscription: 'free',
          gizmoSubscriptionStatus: 'canceled',
          updatedAt: new Date()
        });
        
        return NextResponse.json(
          { 
            message: 'Gizmo subscription was already canceled',
            subscriptionId: stripeSubscriptionId
          },
          { status: 200 }
        );
      }
      
      // For other Stripe errors, return error response
      return NextResponse.json(
        { 
          error: 'Failed to cancel Stripe Gizmo subscription',
          details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in Gizmo subscription cancellation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 