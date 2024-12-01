import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';

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

    const purchaseDoc = await db.collection('purchases').doc(userId).get();
    const purchaseData = purchaseDoc.data();

    return NextResponse.json({
      isSubscribed: !!purchaseData?.purchaseVerified,
      priceId: purchaseData?.priceId
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}