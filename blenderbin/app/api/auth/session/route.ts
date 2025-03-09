// app/api/auth/session/route.ts
import { auth } from '../../../lib/firebase-admin';
import { db } from '../../../lib/firebase-admin';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper function to create necessary Stripe documents for a user
async function ensureUserDocuments(userId: string, email: string | undefined) {
  try {
    // Check if customer document already exists
    const customerDoc = await db.collection('customers').doc(userId).get();
    
    // If document doesn't exist, create it
    if (!customerDoc.exists) {
      await db.collection('customers').doc(userId).set({
        email: email,
        name: 'BlenderBin Customer',
        created: new Date().toISOString()
        // The stripeId will be populated by the Firebase extension when the user makes their first payment
      });
      
      // Create an empty subscriptions subcollection document
      // This ensures the collection exists and appears in the Firebase console
      await db.collection('customers').doc(userId).collection('subscriptions').doc('placeholder').set({
        placeholder: true,
        created: new Date().toISOString()
      });
      
      console.log(`Created initial documents for user ${userId}`);
    }
  } catch (error) {
    console.error('Error ensuring user documents:', error);
    // We don't throw here to prevent blocking the auth flow
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing idToken' }, 
        { status: 400 }
      );
    }

    // Verify the ID token and get user info
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    const email = decodedToken.email;

    // Create session cookie (5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    // Ensure the user has the necessary Stripe documents
    await ensureUserDocuments(userId, email);
    
    // Create response
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Set cookie in the response
    response.cookies.set({
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Unauthorized request' },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  );
  
  response.cookies.delete('session');
  
  return response;
}