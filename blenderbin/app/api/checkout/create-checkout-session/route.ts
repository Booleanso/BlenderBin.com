// DEPRECATED: Use /api/checkout (for Gizmo) or /api/checkout/trial (for BlenderBin) instead.
// Keeping this route to avoid breaking links; it now delegates and prevents duplicate sessions.
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { auth, db } from '../../../lib/firebase-admin';
import { cookies } from 'next/headers';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session cookie from the request
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Verify the session cookie
    const decodedToken = await auth.verifySessionCookie(sessionCookie);
    const uid = decodedToken.uid;
    
    // Get user details
    const userRecord = await auth.getUser(uid);
    const email = userRecord.email || '';
    
    // Get request body
    const { priceId, returnUrl } = await request.json();
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Determine product type from price ID
    const productType = getSubscriptionType(priceId);
    
    if (productType === 'unknown') {
      console.log(`Unknown product type for price ID: ${priceId}`);
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    console.log(`[DEPRECATED] create-checkout-session hit for ${productType}. Delegating to modern endpoint.`);

    // Prevent duplicates
    const hasExistingSubscription = await checkExistingSubscription(uid, productType);
    if (hasExistingSubscription) {
      return NextResponse.json({ error: `User already has an active ${productType} subscription` }, { status: 400 });
    }

    // Set product-specific return URLs
    const origin = request.headers.get('origin') || 'https://blenderbin.com';
    const defaultSuccessUrl = productType === 'blenderbin' 
      ? `${origin}/download?success=true`
      : `${origin}/dashboard?success=true&product=gizmo`;
    const defaultCancelUrl = `${origin}/pricing?canceled=true`;
    
    // Delegate to the maintained endpoints
    if (productType === 'blenderbin') {
      const res = await fetch(`${origin}/api/checkout/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, priceId })
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const res = await fetch(`${origin}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, priceId })
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
} 