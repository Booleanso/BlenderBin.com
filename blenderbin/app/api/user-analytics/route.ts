import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // Extract authorization token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 401 });
    }
    
    // Get user analytics data from Firestore
    const userUsageRef = db.collection('api_usage').doc(userId);
    const userUsage = await userUsageRef.get();
    
    if (!userUsage.exists) {
      return NextResponse.json({ 
        success: true,
        data: {
          total_queries: 0,
          daily_counts: [],
          model_usage: [],
          recent_queries: [],
          sessions: [],
          client_info: {},
          platform: 'unknown',
        }
      });
    }
    
    const usageData = userUsage.data();
    
    // Get session data for this user
    const sessionsSnapshot = await db.collection('api_sessions')
      .where('user_id', '==', userId)
      .orderBy('last_activity', 'desc')
      .limit(10)
      .get();
    
    const sessions = sessionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Get recent queries for this user (limited to last 20)
    const recentQueries = usageData?.queries?.slice(-20) || [];
    
    // Calculate usage trends
    const dailyCounts = usageData?.daily_counts || {};
    const dailyCountsArray = Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30); // Last 30 days
    
    // Calculate model usage breakdown
    const modelUsage = usageData?.model_usage || {};
    const modelUsageArray = Object.entries(modelUsage).map(([model, count]) => ({
      model,
      count,
    })).sort((a, b) => (b.count as number) - (a.count as number)); // Sort by count descending
    
    // Return the analytics data
    return NextResponse.json({
      success: true,
      data: {
        total_queries: usageData?.total_queries || 0,
        first_query_time: usageData?.first_query_time,
        last_query_time: usageData?.last_query_time,
        daily_counts: dailyCountsArray,
        model_usage: modelUsageArray,
        recent_queries: recentQueries,
        sessions: sessions,
        client_info: usageData?.client_info || {},
        platform: usageData?.platform || 'unknown',
      }
    });
    
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch analytics data' 
    }, { status: 500 });
  }
} 