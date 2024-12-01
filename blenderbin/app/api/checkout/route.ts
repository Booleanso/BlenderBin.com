// app/api/checkout/route.ts
import { createCheckoutSession } from '../../lib/stripePayments';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, priceId } = await request.json();
    const session = await createCheckoutSession(userId, priceId);
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}