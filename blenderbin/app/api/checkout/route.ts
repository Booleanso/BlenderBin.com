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
          name: user.displayName || 'BlenderBin Customer',
          metadata: {
            firebaseUID: userId
          }
        });

        // Update the customer document with the new live mode customer ID
        await db.collection('customers').doc(userId).set({
          stripeId: newCustomer.id,
          email: user.email,
          name: user.displayName || 'BlenderBin Customer'
        }, { merge: true });

        // Ensure subscriptions subcollection exists
        const subscriptionsRef = db.collection('customers').doc(userId).collection('subscriptions');
        const subscriptionsSnapshot = await subscriptionsRef.limit(1).get();
        
        if (subscriptionsSnapshot.empty) {
          await subscriptionsRef.doc('placeholder').set({
            placeholder: true,
            created: new Date().toISOString()
          });
        }

        return newCustomer.id;
      }
      
      // If not a test mode customer, return existing ID
      return existingStripeId;
    }

    // If no customer exists at all, create a new one (existing flow)
    const user = await getAuth().getUser(userId);
    
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.displayName || 'BlenderBin Customer',
      metadata: {
        firebaseUID: userId
      }
    });

    // Create the customer document
    await db.collection('customers').doc(userId).set({
      stripeId: customer.id,
      email: user.email,
      name: user.displayName || 'BlenderBin Customer'
    }, { merge: true });

    // Ensure subscriptions subcollection exists
    const subscriptionsRef = db.collection('customers').doc(userId).collection('subscriptions');
    const subscriptionsSnapshot = await subscriptionsRef.limit(1).get();
    
    if (subscriptionsSnapshot.empty) {
      await subscriptionsRef.doc('placeholder').set({
        placeholder: true,
        created: new Date().toISOString()
      });
    }

    return customer.id;
  } catch (error) {
    console.error('Error in getOrCreateStripeCustomer:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // Check if we're in development mode for localhost
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const body = await request.json();
    const { userId, priceId } = body;

    if (!userId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Log environment for debugging
    console.log(`Processing checkout in ${isDevelopment ? 'development' : 'production'} mode`);

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(userId);
    
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve Stripe customer' },
        { status: 400 }
      );
    }

    // Map the price ID based on environment
    let actualPriceId = priceId;
    
    // In development, use test price IDs
    if (isDevelopment) {
      // Map production price IDs to test price IDs
      const priceIdMap: Record<string, string> = {
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID || '',
        [process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID || ''
      };
      
      // Use mapped test price ID if available
      actualPriceId = priceIdMap[priceId] || priceId;
      console.log(`Mapped price ID ${priceId} to test price ID ${actualPriceId}`);
    }

    // Verify the price ID exists
    try {
      await stripe.prices.retrieve(actualPriceId);
    } catch (error) {
      console.error('Error retrieving price:', error);
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Set appropriate success and cancel URLs based on environment
    const baseUrl = isDevelopment
      ? process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
      : 'https://blenderbin.com';
      
    // Create checkout session with updated parameters for Firebase extension
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: actualPriceId,
        quantity: 1
      }],
      subscription_data: {
        trial_period_days: 7 // Add 7-day free trial for all subscriptions
      },
      success_url: `${baseUrl}/download?session_id={CHECKOUT_SESSION_ID}&userId=${userId}`,
      cancel_url: `${baseUrl}/`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      customer_update: {
        name: 'auto',
        address: 'auto'
      },
      client_reference_id: userId, // Critical for Firebase extension
      metadata: {
        firebaseUID: userId,
        environment: isDevelopment ? 'development' : 'production',
        originalPriceId: priceId,
        mappedPriceId: actualPriceId
      }
    });

    // Pre-create a subscription document to help with tracking
    await db.collection('users').doc(userId).collection('checkout_sessions').doc(session.id).set({
      sessionId: session.id,
      created: new Date().toISOString(),
      priceId: priceId,
      actualPriceId: actualPriceId,
      status: 'created',
      trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Add trial end date
      environment: isDevelopment ? 'development' : 'production'
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