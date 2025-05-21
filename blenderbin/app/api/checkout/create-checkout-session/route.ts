import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { auth, db } from '../../../lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session cookie from the request
    const sessionCookie = cookies().get('session')?.value;
    
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
    
    // Create a checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: returnUrl || `${request.headers.get('origin')}/dashboard?success=true`,
      cancel_url: returnUrl || `${request.headers.get('origin')}/dashboard?canceled=true`,
      customer_email: email,
      client_reference_id: uid,
      metadata: {
        userId: uid,
      },
    });
    
    // Store the checkout session in Firestore
    await db.collection('stripe_checkout_sessions').doc(checkoutSession.id).set({
      userId: uid,
      sessionId: checkoutSession.id,
      status: 'created',
      priceId,
      created: new Date(),
    });
    
    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
} 