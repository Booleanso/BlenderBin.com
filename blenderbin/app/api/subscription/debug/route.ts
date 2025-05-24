import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../server/http/shared';
import { db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';

interface DebugInfo {
  userId: string;
  firestore: {
    exists: boolean;
    usersCollection: {
      exists: boolean;
      data: any;
    };
    customersCollection: {
      exists: boolean;
      data: any;
    };
    subscriptionsSubcollection: any;
    stripeRole: any;
    stripeCustomerId: any;
    stripeSubscriptionId: any;
    lastUpdated: any;
  };
  stripe: {
    customer: any;
    subscription: any;
    error: string | null;
  };
  statusApi?: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify the request is from an authenticated user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decodedToken = await verifyFirebaseToken(token);
      if (decodedToken.uid !== userId) {
        return NextResponse.json({ error: 'Token does not match requested user ID' }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🔍 Debug: Fetching detailed subscription info for user:', userId);

    // Get user data from both possible collections
    const userDoc = await db.collection('users').doc(userId).get();
    const customerDoc = await db.collection('customers').doc(userId).get();
    const userData = userDoc.data();
    const customerData = customerDoc.data();

    console.log('🔍 Debug: User data from users collection:', userData);
    console.log('🔍 Debug: Customer data from customers collection:', customerData);

    // Also check for subscriptions in the subcollection
    let subscriptionsData = null;
    if (customerDoc.exists) {
      try {
        const subscriptionsSnapshot = await db
          .collection('customers')
          .doc(userId)
          .collection('subscriptions')
          .get();
        
        subscriptionsData = {
          count: subscriptionsSnapshot.size,
          subscriptions: subscriptionsSnapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
        };
        
        console.log('🔍 Debug: Subscriptions subcollection:', subscriptionsData);
      } catch (error) {
        console.error('🔍 Debug: Error fetching subscriptions subcollection:', error);
        subscriptionsData = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    const debugInfo: DebugInfo = {
      userId,
      firestore: {
        exists: userDoc.exists || customerDoc.exists,
        usersCollection: {
          exists: userDoc.exists,
          data: userData || null
        },
        customersCollection: {
          exists: customerDoc.exists,
          data: customerData || null
        },
        subscriptionsSubcollection: subscriptionsData,
        stripeRole: userData?.stripeRole || customerData?.stripeRole || null,
        stripeCustomerId: userData?.stripeCustomerId || customerData?.stripeId || null,
        stripeSubscriptionId: userData?.stripeSubscriptionId || null,
        lastUpdated: userData?.lastUpdated || customerData?.createdAt || null,
      },
      stripe: {
        customer: null,
        subscription: null,
        error: null
      }
    };

    // If user has Stripe customer ID, fetch Stripe data
    const stripeCustomerId = userData?.stripeCustomerId || customerData?.stripeId;
    if (stripeCustomerId) {
      try {
        console.log('🔍 Debug: Fetching Stripe customer:', stripeCustomerId);
        
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        debugInfo.stripe.customer = customer;

        // Get all subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          limit: 10,
          expand: ['data.items.data.price']
        });

        console.log('🔍 Debug: Stripe subscriptions:', subscriptions.data);

        debugInfo.stripe.subscription = subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          trial_start: sub.trial_start,
          trial_end: sub.trial_end,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
          items: sub.items.data.map(item => ({
            price_id: item.price.id,
            price_nickname: item.price.nickname
          }))
        }));

      } catch (stripeError) {
        console.error('🔍 Debug: Stripe error:', stripeError);
        debugInfo.stripe.error = stripeError instanceof Error ? stripeError.message : 'Unknown error';
      }
    }

    // Also test the status API
    try {
      const statusResponse = await fetch(`${request.nextUrl.origin}/api/subscription/status?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statusResponse.ok) {
        debugInfo.statusApi = await statusResponse.json();
      } else {
        debugInfo.statusApi = { error: `Status API returned ${statusResponse.status}` };
      }
    } catch (statusError) {
      debugInfo.statusApi = { error: statusError instanceof Error ? statusError.message : 'Unknown error' };
    }

    console.log('🔍 Debug: Complete debug info:', debugInfo);

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
} 