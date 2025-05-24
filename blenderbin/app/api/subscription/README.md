# Free Trial System Documentation

## Overview

This system implements a proper 7-day free trial using Stripe's native trial functionality. Users get immediate access to all features for 7 days, and are automatically charged after the trial ends if they have a valid payment method.

## How It Works

### 1. Trial Creation
- When users sign up for a subscription, they automatically get a 7-day free trial
- The trial is created through Stripe Checkout with `trial_period_days: 7`
- Payment method is collected during signup but not charged until trial ends
- If no payment method is provided, the subscription is canceled when trial ends

### 2. Trial Management
- Trial status is tracked in real-time through Stripe webhooks
- Users can see trial days remaining in their dashboard
- Trial can be canceled at any time through the dashboard or API

### 3. Automatic Conversion
- After 7 days, Stripe automatically charges the payment method
- If payment succeeds, user continues with full subscription
- If payment fails, subscription is canceled and user is downgraded to free tier

## API Endpoints

### `/api/subscription/status`
Returns comprehensive subscription status including trial information:
```json
{
  "isSubscribed": true,
  "status": "trialing",
  "subscriptionId": "sub_1234567890",
  "trialDaysRemaining": 5,
  "trialEnd": "2024-01-15T00:00:00.000Z",
  "isTrialing": true,
  "priceId": "price_1234567890"
}
```

### `/api/subscription/trial-status`
Provides detailed trial-specific information:
```json
{
  "hasActiveTrial": true,
  "trialDaysRemaining": 5,
  "trialEndDate": "2024-01-15T00:00:00.000Z",
  "planType": "pro",
  "willAutoRenew": true
}
```

### `/api/subscription/cancel`
Cancels active subscriptions or trials immediately.

## Webhook Events Handled

The system processes these Stripe webhook events:

- `customer.subscription.created` - New subscription/trial started
- `customer.subscription.updated` - Trial status changes
- `customer.subscription.trial_will_end` - 3 days before trial ends
- `invoice.payment_succeeded` - First payment after trial
- `invoice.payment_failed` - Payment failure handling
- `customer.subscription.deleted` - Subscription canceled

## Database Structure

Subscriptions are stored in Firestore:
```
customers/{userId}/subscriptions/{subscriptionId}
{
  "id": "sub_1234567890",
  "status": "trialing",
  "trial_start": "2024-01-08T00:00:00.000Z",
  "trial_end": "2024-01-15T00:00:00.000Z",
  "current_period_start": "2024-01-08T00:00:00.000Z",
  "current_period_end": "2024-02-08T00:00:00.000Z",
  "items": [...],
  "cancel_at_period_end": false
}
```

## Frontend Integration

### Dashboard Display
- Shows trial days remaining prominently
- Displays trial end date
- Provides cancel trial button

### Pricing Page
- Prevents duplicate subscriptions
- Shows trial status for existing users

## Environment Variables Required

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# BlenderBin Price IDs (Production)
NEXT_PUBLIC_STRIPE_PRICE_ID=price_... # BlenderBin Monthly
NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID=price_... # BlenderBin Yearly

# BlenderBin Price IDs (Test/Development)
NEXT_PUBLIC_STRIPE_TEST_PRICE_ID=price_... # BlenderBin Test Monthly
NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID=price_... # BlenderBin Test Yearly

# Note: BlenderBin only has monthly and yearly subscriptions
# For Gizmo AI price IDs, see the main ENVIRONMENT_VARIABLES.md file
```

## Testing

1. **Start Trial**: Create a checkout session and complete it
2. **Check Status**: Verify trial shows correct days remaining
3. **Cancel Trial**: Test cancellation through API or dashboard
4. **Auto Conversion**: Wait for trial to expire or use Stripe CLI to simulate

## Security Features

- All subscription operations require user authentication
- Stripe webhook signatures are verified
- User can only access their own subscription data
- Duplicate subscriptions are prevented

## Benefits Over Previous System

1. **Native Stripe Integration**: Uses Stripe's built-in trial system
2. **Automatic Charging**: No manual intervention needed for conversion
3. **Real-time Updates**: Webhook-driven status updates
4. **Simplified Logic**: Removed complex placeholder system
5. **Better UX**: Clear trial status and days remaining display 