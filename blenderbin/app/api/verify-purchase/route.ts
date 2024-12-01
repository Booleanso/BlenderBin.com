// app/api/verify-purchase/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';
import { stripe } from '../../lib/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Session ID and User ID are required' },
        { status: 400 }
      );
    }

    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Update the purchase record
    await db.collection('purchases').doc(userId).set({
      sessionId,
      purchaseVerified: true,
      priceId: session.line_items?.data[0]?.price?.id,
      purchaseDate: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify purchase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}