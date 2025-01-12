// app/api/download/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';
import { generateSignedDownloadUrl } from '../../lib/S3';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check subscription status in the correct collection
    const subscriptionQuery = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .limit(1)
      .get();

    if (subscriptionQuery.empty) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 403 }
      );
    }

    // Generate signed URL for download from S3
    const signedUrl = await generateSignedDownloadUrl(
      process.env.AWS_BUCKET_NAME!,
      'VERSIONS/BlenderBin v1.4.zip',
      300 // URL expires in 5 minutes
    );

    return NextResponse.json({ downloadUrl: signedUrl });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}