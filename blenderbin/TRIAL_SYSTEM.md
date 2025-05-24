# BlenderBin Free Trial System

## Overview

BlenderBin now offers a **7-day free trial** system that allows users to access premium features before being charged. The trial system is integrated with Stripe and the Firebase "Run Payments with Stripe" extension for automatic subscription management.

## Key Features

- **7-day free trial** for BlenderBin subscriptions only (Gizmo AI subscriptions are immediate)
- **Payment method collection** during trial signup (required for automatic charging)
- **Automatic charging** after 7 days if trial is not cancelled
- **Premium feature access** during trial period
- **Seamless trial-to-paid conversion** 

## How It Works

### 1. Trial Signup Process

1. User clicks "Start 7-Day Free Trial" on BlenderBin subscription
2. Redirected to custom trial checkout endpoint (`/api/checkout/trial`)
3. Stripe collects payment method with `payment_method_collection: 'always'`
4. Subscription created with `trial_period_days: 7`
5. User gets immediate access to premium BlenderBin features

### 2. During Trial Period

- User has full access to premium BlenderBin features
- Subscription status is `trialing`
- User can cancel anytime without charge
- UI shows "Pro (Trial)" status with trial badge

### 3. Trial Conversion

- After 7 days, Stripe automatically charges the saved payment method
- Subscription status changes from `trialing` to `active`
- User continues with premium access
- If payment fails, subscription is cancelled automatically

## API Endpoints

### Trial Checkout Endpoint
**POST** `/api/checkout/trial`

Creates a Stripe checkout session specifically for BlenderBin trials.

```json
{
  "userId": "firebase_user_id",
  "priceId": "price_1234567890"
}
```

**Features:**
- Only accepts BlenderBin price IDs
- Always collects payment method
- Sets up 7-day trial period
- Includes proper metadata for Firebase extension

### Subscription Status
**GET** `/api/subscription/status?userId={userId}`

Returns subscription status including trial information:

```json
{
  "isSubscribed": true,
  "subscriptionId": "sub_1234567890",
  "status": "trialing",
  "isTrialing": true,
  "trialDaysRemaining": 5,
  "trialStart": "2024-01-01T00:00:00Z",
  "trialEnd": "2024-01-08T00:00:00Z",
  "hasPremiumAccess": true
}
```

## Implementation Details

### Trial Logic

```typescript
// Only BlenderBin gets trials
subscription_data: {
  ...(productType === 'blenderbin' && {
    trial_period_days: 7,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel'
      }
    }
  })
}
```

### Premium Access Logic

Users get premium access during both `trialing` and `active` status:

```typescript
userUpdates.stripeRole = subscription.status === 'trialing' || subscription.status === 'active' ? 'pro' : 'free';
```

### UI Updates

- Subscription plans show "7-day free trial included"
- Buttons say "Start 7-Day Free Trial" instead of "Buy Now"
- Profile modal shows "Pro (Trial)" with trial badge
- Trial days remaining displayed in subscription status

## Firebase Extension Integration

The system leverages the Firebase "Run Payments with Stripe" extension:

- Automatic subscription sync to Firestore
- Webhook handling for subscription events
- Customer and payment method management
- Proper metadata tagging for product separation

## Environment Variables

The trial system uses existing BlenderBin price IDs:

```bash
# Production
NEXT_PUBLIC_STRIPE_PRICE_ID=price_monthly_prod
NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID=price_yearly_prod

# Test/Development  
NEXT_PUBLIC_STRIPE_TEST_PRICE_ID=price_monthly_test
NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID=price_yearly_test
```

## Webhook Events

The system handles these Stripe webhook events:

- `customer.subscription.created` - Trial starts
- `customer.subscription.updated` - Status changes
- `customer.subscription.deleted` - Trial/subscription cancelled
- `customer.subscription.trial_will_end` - Trial ending notification
- `invoice.payment_succeeded` - Trial converts to paid
- `invoice.payment_failed` - Payment failure handling

## Database Structure

### Customer Document
```typescript
{
  stripeId: "cus_1234567890",
  email: "user@example.com",
  // ... other fields
}
```

### Subscription Document
```typescript
{
  id: "sub_1234567890",
  status: "trialing", // or "active"
  trial_start: Timestamp,
  trial_end: Timestamp,
  current_period_start: Timestamp,
  current_period_end: Timestamp,
  productType: "blenderbin",
  // ... other Stripe subscription fields
}
```

## Testing

### Test the Trial Flow

1. Use test price IDs in development
2. Create trial subscription
3. Verify user gets premium access immediately
4. Check trial status in profile modal
5. Test cancellation during trial
6. Test trial-to-paid conversion (use Stripe test clock)

### Important Test Cases

- Trial signup with payment method collection
- Premium feature access during trial
- Trial cancellation (no charge)
- Failed payment after trial (subscription cancelled)
- Successful payment after trial (becomes active)
- Multiple trial prevention (user can't start multiple trials)

## Security Considerations

- Payment method always collected during trial
- Automatic cancellation if no payment method
- Metadata tracking for proper product separation
- User validation prevents multiple active subscriptions
- Proper webhook signature verification

## Monitoring

Monitor these metrics:

- Trial signup conversion rate
- Trial-to-paid conversion rate
- Trial cancellation rate
- Failed payment rate after trial
- Premium feature usage during trial

## Troubleshooting

### Common Issues

1. **User not getting premium access during trial**
   - Check subscription status is `trialing`
   - Verify `hasPremiumAccess` flag is true
   - Check webhook processing logs

2. **Payment not charged after trial**
   - Verify payment method was collected
   - Check Stripe subscription settings
   - Review webhook event processing

3. **User can start multiple trials**
   - Check existing subscription validation
   - Verify BlenderBin price ID filtering
   - Review subscription status checking logic

### Debugging

Check these logs:
- Checkout session creation logs
- Webhook processing logs
- Subscription status API logs
- Firebase extension logs

## Future Enhancements

Potential improvements:

- Trial reminder emails (3 days, 1 day before end)
- Different trial lengths for different plans
- Usage tracking during trial
- Trial extension capabilities
- A/B testing different trial lengths
- Trial onboarding flow optimization 