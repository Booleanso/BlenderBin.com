import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../lib/firebase-admin';
import { stripe } from '../../lib/stripe';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session cookie for authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    // Verify the session cookie
    const decodedToken = await auth.verifySessionCookie(sessionCookie);
    const uid = decodedToken.uid;
    
    // Get request body for return URL if provided
    const body = await request.json().catch(() => ({}));
    const { returnUrl } = body;
    
    // Find user by uid
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    
    // If the user doesn't have a Stripe customer ID, we can't create a billing portal session
    if (!userData?.stripeCustomerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Stripe customer found for this user',
        // Redirect to upgrade page instead
        redirectUrl: '/dashboard?upgrade=true'
      });
    }
    
    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl || `${request.headers.get('origin')}/dashboard`,
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