import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const auth = getAuth();

// Persist session tokens in Firestore to survive serverless cold starts
// Collection: auth_sessions/{session_id} → { token, user, authenticated, timestamp }

// BlenderBin price IDs
const BLENDERBIN_PRICE_IDS = [
  // BlenderBin Production Price IDs
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID, // Yearly
  // BlenderBin Test Price IDs
  process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID, // Test Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID, // Test Yearly
].filter(Boolean); // Remove undefined values

// Gizmo removed

// Helper function to check if price ID belongs to a product
function isBlenderBinPrice(priceId: string): boolean {
  return BLENDERBIN_PRICE_IDS.includes(priceId);
}

// Gizmo removed

// Helper function to fetch subscription information
async function fetchSubscriptionInfo(user: any) {
  try {
    const email = user.email;
    const uid = user.uid;
    
    if (!email) {
      return {
        has_subscription: false,
        subscription_tier: "free",
        usage_based_pricing_enabled: false
      };
    }
    
    console.log(`Checking subscriptions for email: ${email}`);
    
    // Step 1: Get user document from customers collection
    const usersQuery = await db.collection('customers').where('email', '==', email).limit(1).get();
    
    if (usersQuery.empty) {
      console.log(`No user document found for email: ${email}`);
      return {
        has_subscription: false,
        subscription_tier: "free",
        usage_based_pricing_enabled: false
      };
    }
    
    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();
    
    // Step 2: Check if user is a developer (developers get automatic subscription)
    const isDeveloper = userData.developer === true;
    if (isDeveloper) {
      console.log(`User ${email} is a developer - granting subscription access`);
      return {
        has_subscription: true,
        subscription_tier: "pro",
        usage_based_pricing_enabled: false,
        is_developer: true
      };
    }
    
    let activeBlenderBinSubscription = false;
    let blenderBinTier = "free";
    
    // Step 3: Check direct subscriptions in customers/{userId}/subscriptions
    console.log("Checking direct subscriptions...");
    const customerRef = db.collection('customers').doc(userDoc.id);
    const subscriptionsQuery = await customerRef.collection('subscriptions')
      .where('status', 'in', ['trialing', 'active'])
      .get();
    
    for (const subDoc of subscriptionsQuery.docs) {
      const subData = subDoc.data();
      console.log(`Found subscription: ${subDoc.id}`, subData);
      
      // Check if subscription is active or trialing
      if (['trialing', 'active'].includes(subData.status)) {
        
        // Check subscription items for BlenderBin or Gizmo prices
        if (subData.items) {
          for (const item of subData.items) {
            if (typeof item === 'object' && item.price) {
              const priceId = item.price.id;
              if (isBlenderBinPrice(priceId)) {
                activeBlenderBinSubscription = true;
                // Users get pro access during trial and active subscription
                blenderBinTier = "pro";
                console.log(`Found active BlenderBin subscription with price ID: ${priceId}, status: ${subData.status}`);
              }
            }
          }
        } else if (subData.price) {
          // Handle legacy format with direct price field
          const priceId = subData.price.id || subData.price;
          if (isBlenderBinPrice(priceId)) {
            activeBlenderBinSubscription = true;
            blenderBinTier = "pro";
            console.log(`Found active BlenderBin subscription with price ID: ${priceId}, status: ${subData.status}`);
          }
        }
      }
    }
    
    // Step 4: Check product subscriptions if no direct subscription found
    if (!activeBlenderBinSubscription) {
      console.log("Checking product subscriptions...");
      const productsQuery = await customerRef.collection('products')
        .where('status', 'in', ['trialing', 'active'])
        .get();
        
      for (const productDoc of productsQuery.docs) {
        const productData = productDoc.data();
        console.log(`Found product: ${productDoc.id}`, productData);
        
        if (productData.prices) {
          for (const [priceId, priceData] of Object.entries(productData.prices)) {
            if ((priceData as any).status && 
                ['trialing', 'active'].includes((priceData as any).status)) {
              
              if (isBlenderBinPrice(priceId)) {
                activeBlenderBinSubscription = true;
                blenderBinTier = "pro";
                console.log(`Found active BlenderBin product subscription with price ID: ${priceId}`);
              }
            }
          }
        }
      }
    }
    
    // Step 5: Check Stripe subscriptions using customer Stripe ID
    if (!activeBlenderBinSubscription) {
      console.log("Checking Stripe subscriptions...");
      const stripeId = userData.stripeid;
      
      if (stripeId) {
        console.log(`Found Stripe customer ID: ${stripeId}`);
        const stripeSubsQuery = await db.collection('subscriptions')
          .where('customer', '==', stripeId)
          .where('status', 'in', ['trialing', 'active'])
          .get();
          
        for (const subDoc of stripeSubsQuery.docs) {
          const subData = subDoc.data();
          console.log(`Found Stripe subscription: ${subDoc.id}`, subData);
          
          // Check subscription items
          if (subData.items) {
            for (const item of subData.items) {
              if (typeof item === 'object' && item.price) {
                const priceId = item.price.id;
                if (isBlenderBinPrice(priceId)) {
                  activeBlenderBinSubscription = true;
                  blenderBinTier = "pro";
                  console.log(`Found active BlenderBin Stripe subscription with price ID: ${priceId}`);
                }
              }
            }
          } else if (subData.price) {
            const priceId = subData.price;
            if (isBlenderBinPrice(priceId)) {
              activeBlenderBinSubscription = true;
              blenderBinTier = "pro";
              console.log(`Found active BlenderBin Stripe subscription with price ID: ${priceId}`);
            }
          }
        }
      }
    }
    
    const result = {
      has_subscription: activeBlenderBinSubscription,
      subscription_tier: blenderBinTier,
      usage_based_pricing_enabled: false,
      is_developer: isDeveloper
    };
    
    console.log(`Subscription check result for ${email}:`, result);
    return result;
    
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    // Return default values on error
    return {
      has_subscription: false,
      subscription_tier: "free",
      usage_based_pricing_enabled: false
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, session_id, user } = body;
    
    if (!token || !session_id) {
      return NextResponse.json({ error: 'Missing token or session ID' }, { status: 400 });
    }
    
    // Fetch subscription information for the user
    const subscriptionInfo = await fetchSubscriptionInfo(user);
    
    // Enhance user object with subscription information
    const enhancedUser = {
      ...user,
      ...subscriptionInfo
    };
    
    // Store the token to Firestore for the polling GET to pick up
    await db.collection('auth_sessions').doc(session_id).set({
      token,
      user: enhancedUser,
      authenticated: true,
      timestamp: new Date()
    });
    
    console.log(`Stored authentication token for session ${session_id} with subscription info:`, subscriptionInfo);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get session status for the Blender addon to poll
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get('session_id');
    
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }
    
    // Look up session doc in Firestore (serverless-safe)
    const docRef = await db.collection('auth_sessions').doc(session_id).get();
    if (docRef.exists) {
      const sessionData = docRef.data() as any;
      // One-time use: delete after read
      try { await db.collection('auth_sessions').doc(session_id).delete(); } catch {}
      return NextResponse.json({
        authenticated: true,
        token: sessionData.token,
        user: sessionData.user
      });
    }
    
    // Session not found
    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Error getting auth status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 