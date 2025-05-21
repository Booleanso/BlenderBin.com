import { NextRequest, NextResponse } from 'next/server';

// In-memory session storage (this would be a database in production)
const sessionTokens: Record<string, any> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, session_id, user } = body;
    
    if (!token || !session_id) {
      return NextResponse.json({ error: 'Missing token or session ID' }, { status: 400 });
    }
    
    // Store the token with the session ID
    sessionTokens[session_id] = {
      token,
      user,
      timestamp: Date.now(),
      authenticated: true
    };
    
    console.log(`Stored authentication token for session ${session_id}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get session status for the Blender addon to poll
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get('session_id');
    
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }
    
    // Return session data if it exists
    if (sessionTokens[session_id]) {
      const sessionData = sessionTokens[session_id];
      
      // Clean up the session after returning it (one-time use)
      setTimeout(() => {
        delete sessionTokens[session_id];
        console.log(`Cleaned up session ${session_id}`);
      }, 5000);
      
      return NextResponse.json({
        authenticated: true,
        token: sessionData.token,
        user: sessionData.user
      });
    }
    
    // Session not found
    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Error getting auth status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 