import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { db } from '../../../lib/firebase-admin';

// One-off purchase of a single addon. Creates or reuses a Stripe Product and Price, then starts a one-time Checkout.
export async function POST(request: NextRequest) {
  try {
    const { addonSlug, addonName, userId } = await request.json();
    if (!addonSlug || !addonName) {
      return NextResponse.json({ error: 'addonSlug and addonName are required' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://blenderbin.com';

    // Find or create a Product in Stripe for this addon
    const productKey = `addon_${addonSlug}`;

    // Look up cached mapping in Firestore to avoid product duplication
    const productDocRef = db.collection('addon_products').doc(addonSlug);
    const productDoc = await productDocRef.get();
    const docData = productDoc.exists ? productDoc.data() || {} : {};
    let productId: string | null = docData.stripeProductId || null;
    let priceId: string | null = docData.stripePriceId || null;

    // Allow per-addon price configuration via Firestore
    // Default to $10.00 (1000 cents) USD if not provided
    const desiredAmount: number = Number.isFinite(docData.amount) ? docData.amount : 1000;
    const desiredCurrency: string = typeof docData.currency === 'string' ? docData.currency : 'usd';

    // Helper to detect missing-resource errors when switching between test/live
    const isMissingResourceError = (err: any): boolean => {
      const message = (err && err.message) || '';
      const code = (err && err.code) || '';
      return (
        code === 'resource_missing' ||
        message.includes('No such product') ||
        message.includes('No such price')
      );
    };

    // Helper to (re)create both product and price in the current Stripe mode
    const createFreshProductAndPrice = async () => {
      const product = await stripe.products.create({
        name: addonName,
        metadata: { addonSlug }
      });
      const price = await stripe.prices.create({
        unit_amount: desiredAmount,
        currency: desiredCurrency,
        product: product.id
      });
      productId = product.id;
      priceId = price.id;
    };

    if (!productId) {
      await createFreshProductAndPrice();
    }

    if (!priceId) {
      try {
        const price = await stripe.prices.create({
          unit_amount: desiredAmount,
          currency: desiredCurrency,
          product: productId!
        });
        priceId = price.id;
      } catch (err) {
        if (isMissingResourceError(err)) {
          await createFreshProductAndPrice();
        } else {
          throw err;
        }
      }
    } else {
      // Ensure the cached price matches desired amount/currency; otherwise create a new one
      try {
        const existingPrice = await stripe.prices.retrieve(priceId);
        const amountMatches = existingPrice.unit_amount === desiredAmount;
        const currencyMatches = existingPrice.currency === desiredCurrency;
        if (!amountMatches || !currencyMatches) {
          try {
            const newPrice = await stripe.prices.create({
              unit_amount: desiredAmount,
              currency: desiredCurrency,
              product: productId!
            });
            priceId = newPrice.id;
          } catch (err) {
            if (isMissingResourceError(err)) {
              await createFreshProductAndPrice();
            } else {
              throw err;
            }
          }

          // Optionally deactivate the old price for cleanliness
          if (existingPrice.active) {
            try { await stripe.prices.update(existingPrice.id, { active: false }); } catch {}
          }
        }
      } catch (err) {
        // If retrieval fails, try to create a new price; if the product is missing (test/live switch), recreate both
        try {
          const fallbackPrice = await stripe.prices.create({
            unit_amount: desiredAmount,
            currency: desiredCurrency,
            product: productId!
          });
          priceId = fallbackPrice.id;
        } catch (innerErr) {
          if (isMissingResourceError(innerErr)) {
            await createFreshProductAndPrice();
          } else {
            throw innerErr;
          }
        }
      }
    }

    // Persist mapping (always save in case we recreated IDs in LIVE mode)
    await productDocRef.set({
      stripeProductId: productId,
      stripePriceId: priceId,
      amount: desiredAmount,
      currency: desiredCurrency,
      updatedAt: new Date()
    }, { merge: true });

    // Create a one-time checkout session
    const idempotencyKey = `addon:purchase:${addonSlug}:${userId || 'anon'}:${priceId}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/addons?purchase=success&session_id={CHECKOUT_SESSION_ID}&addon=${encodeURIComponent(addonSlug)}`,
      cancel_url: `${origin}/addons?purchase=cancelled&addon=${encodeURIComponent(addonSlug)}`,
      client_reference_id: userId || undefined,
      metadata: { addonSlug, addonName },
    }, { idempotencyKey });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating addon purchase session:', error);
    return NextResponse.json({ error: 'Failed to initiate addon purchase' }, { status: 500 });
  }
}

