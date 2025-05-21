import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '../../lib/firebase-admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('Update usage settings API route called');
  
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    console.log('Token extracted from header');
    
    // Verify the token
    try {
      const decodedToken = await auth.verifyIdToken(token);
      console.log('Token verified successfully for user:', decodedToken.uid);
      const uid = decodedToken.uid;
      
      // Get request body
      const body = await request.json();
      console.log('Request body:', body);
      const { settings } = body;
      
      // Validate request body
      if (!settings) {
        console.log('Missing settings in request body');
        return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
      }
      
      console.log('Settings to update:', settings);
      
      // Get user document
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        console.log('User document not found:', uid);
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      
      console.log('User document found');
      
      // Get current settings to merge with new settings
      const userData = userDoc.data() || {};
      const currentSettings = userData.usagePricingSettings || {
        enableUsageBasedPricing: true,
        enablePremiumUsageBasedPricing: true,
        onlyAdminsCanModify: false,
        monthlySpendingLimit: '$300',
        perUserMonthlyLimit: 'Not set'
      };
      
      console.log('Current settings:', currentSettings);
      
      // Merge new settings with existing settings
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };
      
      console.log('Updated settings:', updatedSettings);
      
      // Update settings in Firestore
      await db.collection('users').doc(uid).update({
        usagePricingSettings: updatedSettings,
        updatedAt: new Date()
      });
      
      console.log('Settings updated in Firestore');
      
      // Log the change for auditing
      await db.collection('settings_history').add({
        userId: uid,
        email: userData.email || 'unknown',
        settings,
        timestamp: new Date(),
        action: 'update_usage_settings'
      });
      
      console.log('Update logged to settings history');
      
      // Simulate a call to EC2 (replace with actual EC2 call)
      console.log(`Sending settings to EC2 for user ${userData.email || 'unknown'}:`, settings);
      
      // For demonstration purposes, let's simulate a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Returning successful response');
      return NextResponse.json({ 
        success: true, 
        message: 'Settings updated successfully',
        updatedSettings
      });
    } catch (tokenError) {
      console.error('Error verifying token:', tokenError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Error updating usage settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update settings' 
    }, { status: 500 });
  }
} 