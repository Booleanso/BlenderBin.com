import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '../../lib/firebase-admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('💰 [API] Update usage settings API route called at /api/usage');
  
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('🔑 [API] Authorization header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API] Missing or invalid Authorization header');
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    console.log('✅ [API] Token extracted from header');
    
    // Verify the token
    try {
      const decodedToken = await auth.verifyIdToken(token);
      console.log('✅ [API] Token verified successfully for user:', decodedToken.uid);
      const uid = decodedToken.uid;
      
      // Get request body
      const body = await request.json();
      console.log('📦 [API] Request body:', body);
      const { settings } = body;
      
      // Validate request body
      if (!settings) {
        console.log('❌ [API] Missing settings in request body');
        return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
      }
      
      console.log('⚙️ [API] Settings to update:', settings);
      
      // Get user document
      const userDocRef = db.collection('users').doc(uid);
      const userDoc = await userDocRef.get();
      
      let userData: any = {};
      
      // If user document doesn't exist, create a new one
      if (!userDoc.exists) {
        console.log('⚠️ [API] User document not found, creating new one for user:', uid);
        
        // Get user info from Firebase Auth
        const userRecord = await auth.getUser(uid);
        console.log('📋 [API] User info from Auth:', userRecord.email);
        
        // Create default user data
        userData = {
          uid: uid,
          email: userRecord.email || 'unknown',
          displayName: userRecord.displayName || '',
          photoURL: userRecord.photoURL || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeRole: 'free', // Default role
          usagePricingSettings: {
            enableUsageBasedPricing: true,
            enablePremiumUsageBasedPricing: true,
            onlyAdminsCanModify: false,
            monthlySpendingLimit: '$300',
            perUserMonthlyLimit: 'Not set'
          }
        };
        
        // Create the user document
        await userDocRef.set(userData);
        console.log('✅ [API] Created new user document');
      } else {
        console.log('✅ [API] User document found');
        userData = userDoc.data() || {};
      }
      
      // Get current settings to merge with new settings
      const currentSettings = userData.usagePricingSettings || {
        enableUsageBasedPricing: true,
        enablePremiumUsageBasedPricing: true,
        onlyAdminsCanModify: false,
        monthlySpendingLimit: '$300',
        perUserMonthlyLimit: 'Not set'
      };
      
      console.log('📊 [API] Current settings:', currentSettings);
      
      // Merge new settings with existing settings
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };
      
      console.log('📝 [API] Updated settings:', updatedSettings);
      
      // Update settings in Firestore
      await userDocRef.update({
        usagePricingSettings: updatedSettings,
        updatedAt: new Date()
      });
      
      console.log('✅ [API] Settings updated in Firestore');
      
      // Log the change for auditing
      await db.collection('settings_history').add({
        userId: uid,
        email: userData.email || 'unknown',
        settings,
        timestamp: new Date(),
        action: 'update_usage_settings'
      });
      
      console.log('📋 [API] Update logged to settings history');
      
      // Return successful response
      console.log('✅ [API] Returning successful response');
      return NextResponse.json({ 
        success: true, 
        message: 'Settings updated successfully',
        updatedSettings,
        userCreated: !userDoc.exists
      });
    } catch (tokenError) {
      console.error('❌ [API] Error verifying token:', tokenError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('❌ [API] Error updating usage settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update settings' 
    }, { status: 500 });
  }
} 