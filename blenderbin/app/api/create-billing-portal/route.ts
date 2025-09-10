import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../lib/firebase-admin';
import { stripe } from '../../lib/stripe';
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
    const isDevelopment = process.env.NODE_ENV === 'development';
    const origin = request.headers.get('origin');
    const baseUrl = returnUrl?.startsWith('http') ? undefined : (origin || process.env.NEXT_PUBLIC_URL || (isDevelopment ? 'http://localhost:3000' : 'https://blenderbin.com'));
    
    // Find user by uid
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    
    // Check if the user has a Stripe customer ID
    if (!userData?.stripeCustomerId) {
      // No Stripe customer yet, create one
      try {
        const user = await auth.getUser(uid);
        const email = user.email || 'unknown@example.com';
        
        // Create a new customer
        const customer = await stripe.customers.create({
          email: email,
          metadata: {
            firebaseUID: uid
          }
        });
        
        // Save the customer ID to the user's document
        await db.collection('users').doc(uid).update({
          stripeCustomerId: customer.id,
          updatedAt: new Date()
        });
        
        // Now create a billing portal session with the new customer
        const session = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: returnUrl || `${baseUrl}/dashboard`,
        });
        
        return NextResponse.json({ 
          success: true, 
          url: session.url,
          newCustomer: true
        });
      } catch (error) {
        console.error('Error creating Stripe customer:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create Stripe customer',
          redirectUrl: '/pricing'
        });
      }
    }
    
    // If we get here, the user has a Stripe customer ID
    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl || `${baseUrl}/dashboard`,
    });
    
    return NextResponse.json({ 
      success: true, 
      url: session.url 
    });
    
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create billing portal session' 
    }, { status: 500 });
  }
} 