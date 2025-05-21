import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../lib/firebase-admin';
import { stripe } from '../../lib/stripe';
import { cookies } from 'next/headers';

// Pricing rates for different models
const MODEL_PRICING: Record<string, number> = {
  'gemini-2-5-pro-exp-max': 0.05, // 5 cents per request
  'o3': 0.30, // 30 cents per request
  'extra-fast-premium': 0.04, // 4 cents per request beyond 500/month
  'premium-tool-call': 0.05, // 5 cents per tool call
  'claude-3.7-sonnet-max': 0.05, // 5 cents per request
  'claude-3.7-sonnet-thinking-max': 0.05, // 5 cents per request
  'token-based-claude': 0.000078, // Per token rate for Claude
  'default': 0.01 // 1 cent per request for any other model
};

// Threshold to charge the user (in USD)
const CHARGE_THRESHOLD = 20.00;

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    
    // Get request body
    const body = await request.json();
    const { model, requestCount, tokenCount } = body;
    
    if (!model) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get user data to check if usage-based pricing is enabled
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data() || {};
    const usagePricingSettings = userData.usagePricingSettings || {};
    
    // Check if usage-based pricing is enabled
    if (!usagePricingSettings.enableUsageBasedPricing) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usage-based pricing is not enabled for this user',
        remainingQueries: 0
      });
    }
    
    // Check if premium models are enabled (if this is a premium model)
    const isPremiumModel = ['o3', 'claude-3.7-sonnet-max', 'claude-3.7-sonnet-thinking-max', 'extra-fast-premium'].includes(model);
    
    if (isPremiumModel && !usagePricingSettings.enablePremiumUsageBasedPricing) {
      return NextResponse.json({ 
        success: false, 
        error: 'Premium model usage-based pricing is not enabled for this user',
        remainingQueries: 0 
      });
    }
    
    // Calculate usage costs
    let cost = 0;
    
    if (model === 'token-based-claude' && tokenCount) {
      // For token-based pricing
      cost = tokenCount * MODEL_PRICING['token-based-claude'];
    } else {
      // For request-based pricing
      const rate = MODEL_PRICING[model] || MODEL_PRICING.default;
      cost = (requestCount || 1) * rate;
    }
    
    // Get or create usage tracking record for the current month
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${today.getMonth() + 1}`;
    
    const usageRef = db.collection('usage_tracking').doc(`${uid}_${currentMonth}`);
    const usageDoc = await usageRef.get();
    
    let currentBalance = 0;
    let usage: Record<string, any> = {};
    
    if (usageDoc.exists) {
      usage = usageDoc.data() || {};
      currentBalance = usage.currentBalance || 0;
    }
    
    // Update the usage data
    const modelKey = model.replace(/\./g, '_');
    
    // Ensure models property exists
    if (!usage.models) {
      usage.models = {};
    }
    
    // Ensure the specific model entry exists
    if (!usage.models[modelKey]) {
      usage.models[modelKey] = { count: 0, cost: 0 };
    }
    
    const updatedUsage = {
      ...usage,
      userId: uid,
      month: currentMonth,
      lastUpdated: new Date(),
      currentBalance: currentBalance + cost,
      models: {
        ...usage.models,
        [modelKey]: {
          count: (usage.models[modelKey].count || 0) + (requestCount || 1),
          cost: (usage.models[modelKey].cost || 0) + cost
        }
      }
    };
    
    // Save the updated usage
    await usageRef.set(updatedUsage, { merge: true });
    
    // Log the usage event
    await db.collection('usage_events').add({
      userId: uid,
      model,
      requestCount: requestCount || 1,
      tokenCount: tokenCount || 0,
      cost,
      timestamp: new Date()
    });
    
    // Check if we need to charge the user
    if (updatedUsage.currentBalance >= CHARGE_THRESHOLD && userData.stripeCustomerId) {
      try {
        // Round to 2 decimal places and convert to cents for Stripe
        const amountToCharge = Math.round(updatedUsage.currentBalance * 100);
        
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountToCharge,
          currency: 'usd',
          customer: userData.stripeCustomerId,
          description: `Usage-based pricing charge for ${currentMonth}`,
          metadata: {
            userId: uid,
            month: currentMonth,
          },
          confirm: true,
          off_session: true,
        });
        
        // Reset the balance after successful charge
        await usageRef.update({
          currentBalance: 0,
          lastCharged: new Date(),
          chargeAmount: updatedUsage.currentBalance,
          paymentIntentId: paymentIntent.id,
          paymentStatus: paymentIntent.status
        });
        
        // Log the charge
        await db.collection('usage_charges').add({
          userId: uid,
          amount: updatedUsage.currentBalance,
          month: currentMonth,
          paymentIntentId: paymentIntent.id,
          paymentStatus: paymentIntent.status,
          timestamp: new Date()
        });
        
        return NextResponse.json({
          success: true,
          message: 'Usage recorded and payment processed',
          charged: true,
          chargeAmount: updatedUsage.currentBalance,
          newBalance: 0
        });
      } catch (error) {
        console.error('Error charging customer:', error);
        
        // Continue allowing usage but mark the charge as failed
        await usageRef.update({
          lastChargeAttempt: new Date(),
          lastChargeError: JSON.stringify(error)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Usage recorded successfully',
      charged: false,
      cost,
      currentBalance: updatedUsage.currentBalance
    });
    
  } catch (error) {
    console.error('Error recording usage:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to record usage' 
    }, { status: 500 });
  }
} 