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

    // Verify purchase
    const purchaseDoc = await db.collection('purchases').doc(userId).get();
    const purchaseData = purchaseDoc.data();

    if (!purchaseData?.purchaseVerified) {
      return NextResponse.json(
        { error: 'No verified purchase found' },
        { status: 403 }
      );
    }

    // Generate signed URL for download from S3
    const signedUrl = await generateSignedDownloadUrl(
      process.env.AWS_S3_BUCKET!,
      'path/to/your-product-file.zip', // Replace with your actual S3 file path
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