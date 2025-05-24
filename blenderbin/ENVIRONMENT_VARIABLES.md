# Environment Variables Setup

This document outlines all the environment variables needed for the BlenderBin.com application, specifically for managing both BlenderBin and Gizmo AI subscriptions.

## Required Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

### Stripe Configuration
```bash
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
```

### BlenderBin Subscription Price IDs (Production)
```bash
NEXT_PUBLIC_STRIPE_PRICE_ID=price_... # BlenderBin Monthly
NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID=price_... # BlenderBin Yearly
```

### BlenderBin Subscription Price IDs (Test/Development)
```bash
NEXT_PUBLIC_STRIPE_TEST_PRICE_ID=price_... # BlenderBin Test Monthly
NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID=price_... # BlenderBin Test Yearly
```

### Gizmo AI Subscription Price IDs (Production)
```bash
NEXT_PUBLIC_GIZMO_STRIPE_PRICE_ID=price_... # Gizmo Monthly
NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_PRICE_ID=price_... # Gizmo Yearly
NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_PRICE_ID=price_... # Gizmo Business Monthly
NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_PRICE_ID=price_... # Gizmo Business Yearly
```

### Gizmo AI Subscription Price IDs (Test/Development)
```bash
NEXT_PUBLIC_GIZMO_STRIPE_TEST_PRICE_ID=price_... # Gizmo Test Monthly
NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_TEST_PRICE_ID=price_... # Gizmo Test Yearly
NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_TEST_PRICE_ID=price_... # Gizmo Test Business Monthly
NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_TEST_PRICE_ID=price_... # Gizmo Test Business Yearly
```

### Other Configuration
```bash
NEXT_PUBLIC_URL=http://localhost:3000 # or your production URL
NODE_ENV=development # or production
NEXT_PUBLIC_WAITLIST=false # Set to true to enable waitlist overlay
```

## Price ID Structure

### BlenderBin Products
- **Monthly Subscription**: BlenderBin access with monthly billing
- **Yearly Subscription**: BlenderBin access with yearly billing (typically discounted)

### Gizmo AI Products
- **Monthly Subscription**: Gizmo AI access with monthly billing
- **Yearly Subscription**: Gizmo AI access with yearly billing (typically discounted)
- **Business Monthly**: Gizmo AI business tier with additional features, monthly billing
- **Business Yearly**: Gizmo AI business tier with additional features, yearly billing

## Important Note About Environment Variable Names

All Gizmo AI environment variables must include "GIZMO" in their name to avoid confusion:
- ✅ `NEXT_PUBLIC_GIZMO_STRIPE_PRICE_ID` - Correctly named Gizmo price ID
- ❌ `NEXT_PUBLIC_BUSINESS_STRIPE_PRICE_ID` - Confusingly named, NOT for Gizmo

**BlenderBin does NOT have business tiers** - only monthly and yearly subscriptions.

## How the System Works

1. **Subscription Separation**: The system uses price IDs to differentiate between BlenderBin and Gizmo subscriptions
2. **Environment-Based Testing**: Test price IDs are used in development, production price IDs in live environment
3. **Profile Modal**: Users can manage both subscriptions separately in the profile modal
4. **API Endpoints**: 
   - `/api/subscription/*` handles BlenderBin subscriptions (monthly/yearly only)
   - `/api/gizmo/subscription/*` handles Gizmo AI subscriptions (monthly/yearly/business)

## Setting Up Price IDs in Stripe

1. Go to your Stripe Dashboard → Products
2. Create separate products for BlenderBin and Gizmo AI
3. For BlenderBin: Create monthly and yearly prices only
4. For Gizmo AI: Create monthly, yearly, business monthly, and business yearly prices
5. Copy the price IDs (they start with `price_`) into your `.env.local` file
6. Create test versions of all products for development

## Firebase Extensions

This system is designed to work with the Firebase "Run Payments with Stripe" extension, which automatically syncs subscription data to Firestore.

## Important Notes

- Never commit `.env.local` to version control (it's already in `.gitignore`)
- Use test price IDs during development
- Ensure all price IDs are correctly mapped to prevent subscription mix-ups
- The system will filter subscriptions based on these price IDs to maintain separation between BlenderBin and Gizmo products
- **BlenderBin only has monthly and yearly tiers (no business version)**
- **Gizmo AI has monthly, yearly, and business tiers with both monthly and yearly billing options**
- **All Gizmo AI environment variables must include "GIZMO" in their name** 