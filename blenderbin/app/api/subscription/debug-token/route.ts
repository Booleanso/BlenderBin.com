import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../server/http/shared';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Missing authentication token',
        help: 'Add Authorization: Bearer YOUR_FIREBASE_TOKEN header'
      }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    console.log(`=== DEBUG TOKEN VERIFICATION START ===`);
    
    try {
      // Verify token and check subscription status
      const decodedToken = await verifyFirebaseToken(token);
      
      console.log(`=== DEBUG TOKEN VERIFICATION END ===`);
      
      return NextResponse.json({
        success: true,
        userId: decodedToken.uid,
        email: decodedToken.email,
        tokenValid: true,
        subscriptionStatus: {
          hasSubscription: decodedToken.has_subscription || false,
          hasBlenderBinSubscription: decodedToken.has_blenderbin_subscription || false,
          hasGizmoSubscription: decodedToken.has_gizmo_subscription || false,
          isDeveloper: decodedToken.is_developer || false
        },
        message: 'Token verification completed - check server logs for detailed subscription lookup'
      });
      
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Invalid authentication token',
        details: String(error)
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Debug token verification error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow POST requests with token in body as well
  try {
    const body = await request.json();
    const token = body.token;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Missing token in request body',
        help: 'Send POST with {"token": "YOUR_FIREBASE_TOKEN"}'
      }, { status: 401 });
    }

    console.log(`=== DEBUG TOKEN VERIFICATION START (POST) ===`);
    
    try {
      const decodedToken = await verifyFirebaseToken(token);
      
      console.log(`=== DEBUG TOKEN VERIFICATION END (POST) ===`);
      
      return NextResponse.json({
        success: true,
        userId: decodedToken.uid,
        email: decodedToken.email,
        tokenValid: true,
        subscriptionStatus: {
          hasSubscription: decodedToken.has_subscription || false,
          hasBlenderBinSubscription: decodedToken.has_blenderbin_subscription || false,
          hasGizmoSubscription: decodedToken.has_gizmo_subscription || false,
          isDeveloper: decodedToken.is_developer || false
        },
        message: 'Token verification completed - check server logs for detailed subscription lookup'
      });
      
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Invalid authentication token',
        details: String(error)
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Debug token verification error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
} 