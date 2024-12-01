// app/api/download/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET!);

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

    // Generate signed URL for download
    const file = bucket.file('your-product-file.zip'); // Replace with your actual file path
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000, // URL expires in 5 minutes
    });

    return NextResponse.json({ downloadUrl: signedUrl });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}