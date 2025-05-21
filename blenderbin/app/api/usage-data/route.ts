import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../lib/firebase-admin';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Get month parameter or use current month
    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');
    
    let month = monthParam;
    if (!month) {
      const today = new Date();
      month = `${today.getFullYear()}-${today.getMonth() + 1}`;
    }
    
    // Get user's usage data for the specified month
    const usageRef = db.collection('usage_tracking').doc(`${uid}_${month}`);
    const usageDoc = await usageRef.get();
    
    if (!usageDoc.exists) {
      return NextResponse.json({
        success: true,
        data: {
          month,
          currentBalance: 0,
          models: {},
          totalCost: 0,
          chargeHistory: []
        }
      });
    }
    
    const usageData = usageDoc.data();
    
    // Get charge history for this month
    const chargesSnapshot = await db.collection('usage_charges')
      .where('userId', '==', uid)
      .where('month', '==', month)
      .orderBy('timestamp', 'desc')
      .get();
    
    const chargeHistory = chargesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        amount: data.amount,
        timestamp: data.timestamp,
        status: data.paymentStatus
      };
    });
    
    // Get recent usage events
    const eventsSnapshot = await db.collection('usage_events')
      .where('userId', '==', uid)
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();
    
    const usageEvents = eventsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        model: data.model,
        requestCount: data.requestCount,
        tokenCount: data.tokenCount,
        cost: data.cost,
        timestamp: data.timestamp
      };
    });
    
    // Calculate total cost from model usage
    let totalCost = 0;
    const models = usageData?.models || {};
    
    Object.values(models).forEach((modelData: any) => {
      if (modelData && typeof modelData.cost === 'number') {
        totalCost += modelData.cost;
      }
    });
    
    // Add up charges that have been processed
    let totalCharged = 0;
    chargeHistory.forEach(charge => {
      if (charge.status === 'succeeded') {
        totalCharged += charge.amount;
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        month,
        currentBalance: usageData?.currentBalance || 0,
        models: usageData?.models || {},
        totalCost,
        totalCharged,
        remainingBalance: totalCost - totalCharged,
        chargeHistory,
        usageEvents,
        lastUpdated: usageData?.lastUpdated || null
      }
    });
    
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch usage data' 
    }, { status: 500 });
  }
} 