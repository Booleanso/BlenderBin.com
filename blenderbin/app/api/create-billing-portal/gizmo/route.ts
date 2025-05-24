import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    // If no auth header, try to get from session cookie
    let decodedToken;
    let uid = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use token from Authorization header
      const token = authHeader.split('Bearer ')[1];
      decodedToken = await auth.verifyIdToken(token);
      uid = decodedToken.uid;
    } else {
      // Fall back to session cookie
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;
      
      if (!sessionCookie) {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
      }
      
      // Verify the session cookie
      decodedToken = await auth.verifySessionCookie(sessionCookie);
      uid = decodedToken.uid;
    }
    
    // Get request body for return URL if provided
    const body = await request.json().catch(() => ({}));
    const { returnUrl } = body;
    
    // Find user by uid - check customers collection first (where subscription data is stored)
    const customerDoc = await db.collection('customers').doc(uid).get();
    let stripeCustomerId = null;
    
    if (customerDoc.exists) {
      // Customer exists in customers collection
      const customerData = customerDoc.data();
      stripeCustomerId = customerData?.stripeId;
    } else {
      // Fallback to users collection for backwards compatibility
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        stripeCustomerId = userData?.stripeCustomerId;
      }
    }
    
    // Check if the user has a Gizmo Stripe customer ID
    if (!stripeCustomerId) {
      // No Stripe customer yet, create one for Gizmo
      try {
        const user = await auth.getUser(uid);
        const email = user.email || 'unknown@example.com';
        
        // Create a new customer for Gizmo
        const customer = await stripe.customers.create({
          email: email,
          name: user.displayName || 'Gizmo Customer',
          metadata: {
            firebaseUID: uid,
            productType: 'gizmo'
          }
        });
        
        // Save the customer ID to both collections for consistency
        await db.collection('customers').doc(uid).set({
          stripeId: customer.id,
          email: user.email,
          name: user.displayName || 'Gizmo Customer',
          createdAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });
        
        await db.collection('users').doc(uid).set({
          stripeCustomerId: customer.id,
          updatedAt: new Date()
        }, { merge: true });
        
        // Now create a billing portal session with the new customer
        const session = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: returnUrl || `${request.headers.get('origin')}/dashboard`,
        });
        
        return NextResponse.json({ 
          success: true, 
          url: session.url,
          newCustomer: true,
          productType: 'gizmo'
        });
      } catch (error) {
        console.error('Error creating Gizmo Stripe customer:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create Gizmo Stripe customer',
          redirectUrl: '/pricing/gizmo'
        });
      }
    }
    
    // If we get here, the user has a Stripe customer ID
    // Create a billing portal session for Gizmo
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${request.headers.get('origin')}/dashboard`,
    });
    
    return NextResponse.json({ 
      success: true, 
      url: session.url,
      productType: 'gizmo'
    });
    
  } catch (error) {
    console.error('Error creating Gizmo billing portal session:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create Gizmo billing portal session' 
    }, { status: 500 });
  }
} 