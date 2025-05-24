import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../server/http/shared';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        hasAccess: false,
        error: 'Missing authentication token' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify token and check subscription status
      const decodedToken = await verifyFirebaseToken(token);
      
      return NextResponse.json({
        hasAccess: decodedToken.has_subscription || false,
        hasBlenderBinAccess: decodedToken.has_blenderbin_subscription || false,
        hasGizmoAccess: decodedToken.has_gizmo_subscription || false,
        userId: decodedToken.uid,
        email: decodedToken.email,
        isDeveloper: decodedToken.is_developer || false,
        subscriptionStatus: decodedToken.has_subscription ? 'active' : 'none',
        subscriptionBreakdown: {
          blenderBin: decodedToken.has_blenderbin_subscription || false,
          gizmo: decodedToken.has_gizmo_subscription || false,
          combined: decodedToken.has_subscription || false
        },
        message: decodedToken.has_subscription 
          ? `User has valid subscription access - BlenderBin: ${decodedToken.has_blenderbin_subscription}, Gizmo: ${decodedToken.has_gizmo_subscription}` 
          : 'User does not have any active subscriptions'
      });
      
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        hasAccess: false,
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Subscription verification error:', error);
    return NextResponse.json({ 
      hasAccess: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 