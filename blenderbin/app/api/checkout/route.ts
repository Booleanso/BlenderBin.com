import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';
import { stripe } from '../../lib/stripe';
import { getAuth } from 'firebase-admin/auth';

async function getOrCreateStripeCustomer(userId: string) {
  try {
    // First try to get existing customer
    const userDoc = await db.collection('customers').doc(userId).get();
    const existingStripeId = userDoc.data()?.stripeId;

    // Check if customer exists and if it's a test mode customer
    if (userDoc.exists && existingStripeId) {
      // If the customer ID starts with 'cus_test_', we need to create a new live mode customer
      if (existingStripeId.startsWith('cus_test_')) {
        console.log(`Migrating test customer ${existingStripeId} to live mode`);
        
        // Get user data to create new customer
        const user = await getAuth().getUser(userId);
        
        // Create new live mode Stripe customer
        const newCustomer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            firebaseUID: userId
          }
        });

        // Update the customer document with the new live mode customer ID
        await db.collection('customers').doc(userId).set({
          stripeId: newCustomer.id,
          email: user.email
        }, { merge: true });

        return newCustomer.id;
      }
      
      // If not a test mode customer, return existing ID
      return existingStripeId;
    }

    // If no customer exists at all, create a new one (existing flow)
    const user = await getAuth().getUser(userId);
    
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        firebaseUID: userId
      }
    });

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

    // Create checkout session with updated parameters for Firebase extension
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
      tax_id_collection: { enabled: true },
      client_reference_id: userId, // Critical for Firebase extension
      metadata: {
        firebaseUID: userId
      }
    });

    // Pre-create a subscription document to help with tracking
    await db.collection('users').doc(userId).collection('checkout_sessions').doc(session.id).set({
      sessionId: session.id,
      created: new Date().toISOString(),
      priceId: priceId,
      status: 'created'
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