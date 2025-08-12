import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { generateSignedDownloadUrl } from '../../../lib/S3';

// After successful one-off purchase, return a signed S3 URL for the zip file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const addon = searchParams.get('addon');
    if (!sessionId || !addon) {
      return NextResponse.json({ error: 'session_id and addon are required' }, { status: 400 });
    }

    // Verify checkout session and payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== 'payment' || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    // Build S3 key
    const bucket = process.env.AWS_BUCKET_NAME!;
    const key = `BACKEND/INDIVIDUAL_ADDONS/${addon}.zip`;

    // Generate signed URL
    const downloadUrl = await generateSignedDownloadUrl(bucket, key, 300);
    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error('Addon download error:', error);
    return NextResponse.json({ error: 'Failed to generate download' }, { status: 500 });
  }
}

