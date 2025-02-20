import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';
import { stripe } from '../../lib/stripe';
import { getAuth } from 'firebase-admin/auth';

async function getOrCreateStripeCustomer(userId: string) {
  try {
    // First try to get existing customer
    const userDoc = await db.collection('customers').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.stripeId) {
      return userDoc.data()?.stripeId;
    }

    // If no customer exists, get user data to create one
    const user = await getAuth().getUser(userId);
    
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        firebaseUID: userId
      }
    });

    // Store the customer ID in Firestore
    await db.collection('customers').doc(userId).set({
      stripeId: customer.id,
      email: user.email
    }, { merge: true });

    return customer.id;
  } catch (error) {
    console.error('Error in getOrCreateStripeCustomer:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, priceId } = body;

    if (!userId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(userId);
    
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve Stripe customer' },
        { status: 400 }
      );
    }

    // Verify the price ID exists
    try {
      await stripe.prices.retrieve(priceId);
    } catch (error) {
      console.error('Error retrieving price:', error);
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Create checkout session with updated success_url
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: `${process.env.NEXT_PUBLIC_URL}/download?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    
    if (error instanceof Error && 'type' in error && error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}