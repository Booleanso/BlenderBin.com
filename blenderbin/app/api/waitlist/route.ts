import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // Check if the service account key is provided as an environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Parse the service account key JSON
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      // Initialize with the service account
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log(`Firebase Admin initialized for waitlist API`);
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Waitlist will not be recorded.');
      // Initialize with a default config to prevent errors
      initializeApp({
        projectId: 'blenderbin-default'
      });
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }
    
    // Get Firestore instance
    const db = getFirestore();
    
    // Add email to waitlist collection
    await db.collection('waitlist').add({
      email,
      createdAt: new Date(),
      source: 'pricing_page',
      status: 'pending'
    });
    
    console.log(`Added ${email} to waitlist`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json({ success: false, error: 'Failed to add to waitlist' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: "Use POST to submit to the waitlist" });
} 