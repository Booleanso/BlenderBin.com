import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session cookie for authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { email, settings } = body;
    
    // Validate request body
    if (!email || !settings) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Find user by email
    const userSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    const userDoc = userSnapshot.docs[0];
    
    // Get current settings to merge with new settings
    const userData = userDoc.data();
    const currentSettings = userData.usagePricingSettings || {
      enableUsageBasedPricing: true,
      enablePremiumUsageBasedPricing: true,
      onlyAdminsCanModify: false,
      monthlySpendingLimit: '$300',
      perUserMonthlyLimit: 'Not set'
    };
    
    // Merge new settings with existing settings
    const updatedSettings = {
      ...currentSettings,
      ...settings
    };
    
    // Update settings in Firestore
    await db.collection('users').doc(userDoc.id).update({
      usagePricingSettings: updatedSettings,
      updatedAt: new Date()
    });
    
    // Log the change for auditing
    await db.collection('settings_history').add({
      userId: userDoc.id,
      email,
      settings,
      timestamp: new Date(),
      action: 'update_usage_settings'
    });
    
    // Simulate a call to EC2 (replace with actual EC2 call)
    console.log(`Sending settings to EC2 for user ${email}:`, settings);
    
    // For demonstration purposes, let's simulate a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Settings updated successfully',
      updatedSettings
    });
    
  } catch (error) {
    console.error('Error updating usage settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update settings' 
    }, { status: 500 });
  }
} 