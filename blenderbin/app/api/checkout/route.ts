import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';
import { stripe } from '../../lib/stripe';
import { getAuth } from 'firebase-admin/auth';

// BlenderBin price IDs
const BLENDERBIN_PRICE_IDS = [
  // BlenderBin Production Price IDs
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID, // Yearly
  // BlenderBin Test Price IDs
  process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID, // Test Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID, // Test Yearly
].filter(Boolean); // Remove undefined values

// Gizmo AI price IDs (properly named)
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

// Helper function to determine subscription type
function getSubscriptionType(priceId: string): 'blenderbin' | 'gizmo' | 'unknown' {
  if (BLENDERBIN_PRICE_IDS.includes(priceId)) {
    return 'blenderbin';
  } else if (GIZMO_PRICE_IDS.includes(priceId)) {
    return 'gizmo';
  }
  return 'unknown';
}

// Check on Stripe for any existing active/trialing subscriptions for this customer and product type
async function hasExistingStripeSubscriptionForProduct(
  stripeCustomerId: string,
  productType: 'blenderbin' | 'gizmo'
): Promise<boolean> {
  const relevantPriceIds = productType === 'blenderbin' ? BLENDERBIN_PRICE_IDS : GIZMO_PRICE_IDS;

  // Fetch up to 100 recent subscriptions and filter locally by status and price
  const subs = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    limit: 100
  });

  return subs.data.some((sub) => {
    const isActiveOrTrial = sub.status === 'active' || sub.status === 'trialing';
    if (!isActiveOrTrial) return false;
    return sub.items.data.some((item) => relevantPriceIds.includes(item.price.id));
  });
}

// Helper function to check if user has existing subscription for specific product
async function checkExistingSubscription(userId: string, productType: 'blenderbin' | 'gizmo'): Promise<boolean> {
  const subscriptionsSnapshot = await db
    .collection('customers')
    .doc(userId)
    .collection('subscriptions')
    .where('status', 'in', ['active', 'trialing'])
    .get();

  if (subscriptionsSnapshot.empty) {
    return false;
  }

  // Filter subscriptions by product type
  const relevantPriceIds = productType === 'blenderbin' ? BLENDERBIN_PRICE_IDS : GIZMO_PRICE_IDS;
  
  for (const subDoc of subscriptionsSnapshot.docs) {
    const subData = subDoc.data();
    
    // Check if subscription has items with relevant price IDs
    if (subData.items && subData.items.length > 0) {
      for (const item of subData.items) {
        const priceId = item.price?.id;
        if (priceId && relevantPriceIds.includes(priceId)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

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
      name: user.displayName || 'BlenderBin Customer',
      createdAt: new Date()
    }, { merge: true });

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

    // Determine product type from price ID
    const productType = getSubscriptionType(priceId);
    
    if (productType === 'unknown') {
      console.log(`Unknown product type for price ID: ${priceId}`);
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    console.log(`Checkout for ${productType} subscription with price ID: ${priceId}`);

    // Check if user already has an active subscription for this specific product (Firestore)
    const hasExistingSubscription = await checkExistingSubscription(userId, productType);

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(userId);
    
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve Stripe customer' },
        { status: 400 }
      );
    }

    // Extra Stripe-side dedupe to avoid race conditions
    const hasStripeSubscription = await hasExistingStripeSubscriptionForProduct(stripeCustomerId, productType);
    if (hasExistingSubscription || hasStripeSubscription) {
      console.log(`User ${userId} already has an active ${productType} subscription (firestore=${hasExistingSubscription}, stripe=${hasStripeSubscription})`);
      return NextResponse.json(
        { error: `User already has an active ${productType} subscription` },
        { status: 400 }
      );
    }

    // Map the price ID based on environment
    let actualPriceId = priceId;
    
    // In development, use test price IDs
    if (isDevelopment) {
      // Map production price IDs to test price IDs for both products
      const priceIdMap: Record<string, string> = {
        // BlenderBin price ID mapping
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID || '',
        [process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID || '',
        // Gizmo AI price ID mapping (properly named)
        [process.env.NEXT_PUBLIC_GIZMO_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_GIZMO_STRIPE_TEST_PRICE_ID || '',
        [process.env.NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_TEST_PRICE_ID || '',
        [process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_TEST_PRICE_ID || '',
        [process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_TEST_PRICE_ID || ''
      };
      
      // Use mapped test price ID if available
      actualPriceId = priceIdMap[priceId] || priceId;
      console.log(`Mapped ${productType} price ID ${priceId} to test price ID ${actualPriceId}`);
    }

    // Verify the price ID exists
    try {
      const price = await stripe.prices.retrieve(actualPriceId);
      console.log(`Retrieved ${productType} price: ${price.id}, amount: ${price.unit_amount}, currency: ${price.currency}`);
    } catch (error) {
      console.error('Error retrieving price:', error);
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Set appropriate success and cancel URLs based on environment and product type
    const baseUrl = isDevelopment
      ? process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
      : 'https://blenderbin.com';
      
    // Set product-specific URLs
    const successUrl = productType === 'blenderbin' 
      ? `${baseUrl}/download?session_id={CHECKOUT_SESSION_ID}&userId=${userId}`
      : `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&userId=${userId}&product=gizmo`;
      
    const cancelUrl = `${baseUrl}/pricing`;
      
    // Create checkout session with proper trial setup
    const sessionParams = {
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: actualPriceId,
        quantity: 1
      }],
      subscription_data: {
        // Only apply trial to BlenderBin subscriptions
        ...(productType === 'blenderbin' && {
          trial_period_days: 7, // 7-day free trial for BlenderBin only
          trial_settings: {
            end_behavior: {
              missing_payment_method: 'cancel' // Cancel if no payment method after trial
            }
          }
        }),
        metadata: {
          firebaseUID: userId,
          productType: productType,
          environment: isDevelopment ? 'development' : 'production',
          trialEnabled: productType === 'blenderbin' ? 'true' : 'false'
        }
      },
      payment_method_collection: productType === 'blenderbin' ? 'always' : 'if_required', // Always collect payment method for BlenderBin trials
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      customer_update: {
        name: 'auto',
        address: 'auto'
      },
      client_reference_id: userId, // Critical for webhooks
      metadata: {
        firebaseUID: userId,
        productType: productType, // Add product type to metadata
        environment: isDevelopment ? 'development' : 'production',
        originalPriceId: priceId,
        mappedPriceId: actualPriceId,
        trialEnabled: productType === 'blenderbin' ? 'true' : 'false'
      }
    } as const;

    const idempotencyKey = `checkout:${userId}:${productType}:${actualPriceId}`;
    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });

    // Store checkout session info with product type
    await db.collection('customers').doc(userId).collection('checkout_sessions').doc(session.id).set({
      sessionId: session.id,
      created: new Date(),
      priceId: priceId,
      actualPriceId: actualPriceId,
      productType: productType, // Store product type
      status: 'created',
      environment: isDevelopment ? 'development' : 'production'
    });

    console.log(`Created ${productType} checkout session ${session.id} for user ${userId}`);

    return NextResponse.json({ sessionId: session.id, productType: productType });
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