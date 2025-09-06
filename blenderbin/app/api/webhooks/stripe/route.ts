import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { db } from '../../../lib/firebase-admin';
import { Readable } from 'stream';
import { sendEmail } from '../../../lib/email';
import { welcomeBlenderBinHTML } from '../../../lib/email-templates/welcomeBlenderBin';

// BlenderBin price IDs
const BLENDERBIN_PRICE_IDS = [
  // BlenderBin Production Price IDs
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID, // Yearly
  // BlenderBin Test Price IDs
  process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID, // Test Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID, // Test Yearly
].filter(Boolean); // Remove undefined values

// Gizmo removed

// Helper function to determine subscription type
function getSubscriptionType(priceId: string): 'blenderbin' | 'unknown' {
  if (BLENDERBIN_PRICE_IDS.includes(priceId)) {
    return 'blenderbin';
  }
  return 'unknown';
}

// Helper function to determine tier based on price ID and product type
function getTierFromPriceId(priceId: string, productType: 'blenderbin'): string {
  if (productType === 'blenderbin') {
    // BlenderBin only has monthly/yearly (no business tier)
    if (priceId === process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID || 
        priceId === process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID) {
      return 'yearly';
    }
    return 'monthly'; // Default for BlenderBin
  }
  return 'unknown';
}

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the signature from headers
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }
    
    // Parse the request body to get the raw data
    const rawBody = await request.text();
    
    // Construct event using the webhook secret
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    console.log(`Processing webhook event: ${event.type}`);
    
    // Idempotency: ensure we process each event only once
    try {
      const eventRef = db.collection('webhook_events').doc(event.id);
      // create() will throw if the document already exists
      await eventRef.create({
        id: event.id,
        type: event.type,
        created: new Date(),
        source: 'stripe'
      });
    } catch (idempoErr: any) {
      // Duplicate delivery - acknowledge and stop further processing
      console.log(`Duplicate webhook event received and ignored: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}

async function handleCheckoutCompleted(session: any) {
  try {
    console.log('Processing checkout.session.completed', session.id);
    
    // Update the session status in Firestore
    await db.collection('stripe_checkout_sessions').doc(session.id).update({
      status: 'completed',
      updated: new Date()
    });
    
    // Get customer details
    const customerId = session.customer as string;
    const userId = session.client_reference_id as string || session.metadata?.firebaseUID;
    
    if (userId && customerId) {
      // Update user's customer record
      await db.collection('customers').doc(userId).set({
        stripeId: customerId,
        updatedAt: new Date()
      }, { merge: true });
      
      console.log(`Updated customer record for user ${userId} with Stripe customer ${customerId}`);
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    console.log('Processing customer.subscription.created', subscription.id);
    
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    
    // Find user by Stripe customer ID
    const customerQuery = await db.collection('customers')
      .where('stripeId', '==', customerId)
      .limit(1)
      .get();
    
    if (customerQuery.empty) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }
    
    const userId = customerQuery.docs[0].id;

    // Fetch user record for name/email
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {} as any;
    const profileEmail = userData?.email;
    
    // Determine subscription type and tier based on price
    const priceId = subscription.items.data[0]?.price?.id;
    const productType = getSubscriptionType(priceId);
    
    if (productType === 'unknown') {
      console.warn(`Unknown subscription type for price ID: ${priceId}, subscription ${subscriptionId}`);
      return; // Skip processing unknown subscription types
    }
    
    // Guard: prevent duplicate BlenderBin subscriptions for same user (Stripe-side authoritative)
    if (productType === 'blenderbin') {
      try {
        const allSubs = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 100
        });
        const relevantStatuses = new Set(['trialing', 'active', 'incomplete', 'past_due', 'unpaid']);
        const relevantPriceIds = new Set(BLENDERBIN_PRICE_IDS);
        const related = allSubs.data.filter((sub: any) => {
          const matchesPrice = sub.items.data.some((item: any) => item?.price?.id && relevantPriceIds.has(item.price.id));
          return matchesPrice && relevantStatuses.has(sub.status);
        });
        if (related.length > 1) {
          // Keep the oldest by created, cancel the rest
          const sorted = related.sort((a: any, b: any) => a.created - b.created);
          const keepId = sorted[0].id;
          for (const dup of sorted) {
            if (dup.id !== keepId) {
              try {
                await stripe.subscriptions.cancel(dup.id);
                console.log(`Canceled duplicate BlenderBin subscription ${dup.id}, kept ${keepId}`);
              } catch (cancelErr) {
                console.error(`Error canceling duplicate subscription ${dup.id}:`, cancelErr);
              }
            }
          }
          // If the current event's subscription was canceled above, stop processing it
          if (subscriptionId !== keepId) {
            return;
          }
        }
      } catch (stripeErr) {
        console.error('Error checking/canceling duplicate subscriptions via Stripe:', stripeErr);
      }
    }

    const tier = getTierFromPriceId(priceId, productType);
    
    console.log(`Subscription ${subscriptionId} is for ${productType} with tier ${tier}`);
    
    // Create subscription document in customers/{userId}/subscriptions/{subscriptionId}
    const subscriptionData = {
      id: subscriptionId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      items: subscription.items.data.map((item: any) => ({
        id: item.id,
        price: {
          id: item.price.id,
          unit_amount: item.price.unit_amount,
          currency: item.price.currency,
          recurring: item.price.recurring
        },
        quantity: item.quantity
      })),
      metadata: subscription.metadata,
      created: new Date(subscription.created * 1000),
      stripeLink: `https://dashboard.stripe.com/subscriptions/${subscriptionId}`,
      productType: productType // Add product type to subscription data
    };
    
    // Store the subscription
    await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).set(subscriptionData);
    
    // Update user's subscription fields based on product type
    const userUpdates: any = { updatedAt: new Date() };
    
    if (productType === 'blenderbin') {
      // For BlenderBin, users get pro access during trial and active periods
      userUpdates.stripeRole = subscription.status === 'trialing' || subscription.status === 'active' ? tier : 'free';
      userUpdates.subscriptionStatus = subscription.status;
      userUpdates.subscriptionId = subscriptionId;
    }
    
    await db.collection('users').doc(userId).set(userUpdates, { merge: true });
    
    // Remove placeholder document if it exists
    try {
      await db.collection('customers').doc(userId).collection('subscriptions').doc('placeholder').delete();
    } catch (error) {
      // Placeholder might not exist, that's fine
    }
    
    console.log(`Created ${productType} subscription ${subscriptionId} for user ${userId} with tier ${tier}`);

    // Send welcome email only for BlenderBin
    if (productType === 'blenderbin') {
      // Idempotency: ensure we send once per subscription
      const sentDocRef = db.collection('customers').doc(userId).collection('emails_sent').doc(`welcome_${subscriptionId}`);
      const sentDoc = await sentDocRef.get();
      if (!sentDoc.exists) {
        // Determine recipient email: prefer Stripe customer email, then profile/email
        let toEmail: string | null = null;
        try {
          const stripeCustomer = await stripe.customers.retrieve(customerId);
          // @ts-ignore - Stripe types
          toEmail = (stripeCustomer && 'email' in stripeCustomer) ? (stripeCustomer as any).email : null;
        } catch {}
        if (!toEmail) toEmail = profileEmail || userData?.email;

        if (toEmail) {
          const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
          const manageUrl = `https://blenderbin.com/dashboard/billing`;
          const downloadUrl = `https://blenderbin.com/download`;
          const html = welcomeBlenderBinHTML({
            name: userData?.displayName || userData?.name || null,
            plan: tier,
            trialEndDate: trialEnd,
            downloadUrl,
            manageUrl,
            supportUrl: 'https://blenderbin.com/support'
          });
          const subject = 'Welcome to BlenderBin — let’s get you set up';
          const result = await sendEmail({ to: toEmail, subject, html });
          if (result) {
            await sentDocRef.set({ sentAt: new Date(), email: toEmail, subject });
            console.log(`Sent welcome email to ${toEmail} for subscription ${subscriptionId}`);
          } else {
            console.warn(`Welcome email not sent (provider issue) for user ${userId}`);
          }
        } else {
          console.warn(`No email found to send welcome email for user ${userId}`);
        }
      } else {
        console.log(`Welcome email already sent for subscription ${subscriptionId}`);
      }
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    console.log('Processing customer.subscription.updated', subscription.id);
    
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    
    // Find user by Stripe customer ID
    const customerQuery = await db.collection('customers')
      .where('stripeId', '==', customerId)
      .limit(1)
      .get();
    
    if (customerQuery.empty) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }
    
    const userId = customerQuery.docs[0].id;
    
    // Get the existing subscription to determine product type
    const existingSubDoc = await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).get();
    let productType = 'unknown';
    
    if (existingSubDoc.exists) {
      const existingData = existingSubDoc.data();
      productType = existingData?.productType || 'unknown';
    }
    
    // If we don't have product type, determine from price ID
    if (productType === 'unknown') {
      const priceId = subscription.items.data[0]?.price?.id;
      productType = getSubscriptionType(priceId);
    }
    
    // Update subscription document
    const subscriptionData = {
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      updated: new Date(),
      productType: productType
    };
    
    await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).update(subscriptionData);
    
    // Update user's main record based on product type
    const userUpdates: any = { updatedAt: new Date() };
    
    if (productType === 'blenderbin') {
      userUpdates.subscriptionStatus = subscription.status;
    }
    
    await db.collection('users').doc(userId).update(userUpdates);
    
    console.log(`Updated ${productType} subscription ${subscriptionId} for user ${userId}, status: ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    console.log('Processing customer.subscription.deleted', subscription.id);
    
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    
    // Find user by Stripe customer ID
    const customerQuery = await db.collection('customers')
      .where('stripeId', '==', customerId)
      .limit(1)
      .get();
    
    if (customerQuery.empty) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }
    
    const userId = customerQuery.docs[0].id;
    
    // Get the existing subscription to determine product type
    const existingSubDoc = await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).get();
    let productType = 'unknown';
    
    if (existingSubDoc.exists) {
      const existingData = existingSubDoc.data();
      productType = existingData?.productType || 'unknown';
    }
    
    // If we don't have product type, determine from price ID
    if (productType === 'unknown') {
      const priceId = subscription.items.data[0]?.price?.id;
      productType = getSubscriptionType(priceId);
    }
    
    // Update subscription document to mark as deleted
    await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).update({
      status: 'canceled',
      ended_at: new Date(),
      updated: new Date()
    });
    
    // Update user's main record based on product type
    const userUpdates: any = { updatedAt: new Date() };
    
    if (productType === 'blenderbin') {
      userUpdates.stripeRole = 'free';
      userUpdates.subscriptionStatus = 'canceled';
    }
    
    await db.collection('users').doc(userId).update(userUpdates);
    
    console.log(`Canceled ${productType} subscription ${subscriptionId} for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleTrialWillEnd(subscription: any) {
  try {
    console.log('Processing customer.subscription.trial_will_end', subscription.id);
    
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const customerQuery = await db.collection('customers')
      .where('stripeId', '==', customerId)
      .limit(1)
      .get();
    
    if (customerQuery.empty) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }
    
    const userId = customerQuery.docs[0].id;
    
    // Determine product type
    const priceId = subscription.items.data[0]?.price?.id;
    const productType = getSubscriptionType(priceId);
    
    console.log(`Trial will end soon for user ${userId}, ${productType} subscription ${subscription.id}`);
    
    // You could add product-specific email notification logic here
    // await sendTrialEndingEmail(userData.email, subscription.trial_end, productType);
    
  } catch (error) {
    console.error('Error handling trial will end:', error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  try {
    console.log('Processing invoice.payment_succeeded', invoice.id);
    
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;
    
    if (!subscriptionId) {
      console.log('Invoice is not related to a subscription, skipping');
      return; // Not a subscription invoice
    }
    
    // Find user by Stripe customer ID
    const customerQuery = await db.collection('customers')
      .where('stripeId', '==', customerId)
      .limit(1)
      .get();
    
    if (customerQuery.empty) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }
    
    const userId = customerQuery.docs[0].id;
    
    // Get subscription to determine product type
    const subDoc = await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).get();
    let productType = 'unknown';
    
    if (subDoc.exists) {
      const subData = subDoc.data();
      productType = subData?.productType || 'unknown';
    }
    
    // If we don't have product type, determine from price ID
    if (productType === 'unknown') {
      const priceId = invoice.lines?.data?.[0]?.price?.id;
      if (priceId) {
        productType = getSubscriptionType(priceId);
      }
    }
    
    console.log(`Payment succeeded for user ${userId}, ${productType} subscription ${subscriptionId}`);
    console.log(`Invoice billing reason: ${invoice.billing_reason}`);
    console.log(`Invoice period: ${new Date(invoice.period_start * 1000).toISOString()} to ${new Date(invoice.period_end * 1000).toISOString()}`);
    console.log(`Invoice amount: ${invoice.amount_paid} ${invoice.currency}`);
    
    // Get the full subscription from Stripe to update our records
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(`Stripe subscription status: ${stripeSubscription.status}`);
    
    // Handle trial-to-paid conversion and regular payments
    if (invoice.billing_reason === 'subscription_cycle' || 
        invoice.billing_reason === 'subscription_create' ||
        stripeSubscription.status === 'active') {
      
      console.log('Processing trial-to-paid conversion or subscription payment');
      
      // Update subscription status to active
      const subscriptionUpdates = {
        status: 'active',
        updated: new Date(),
        lastPaymentDate: new Date(invoice.created * 1000),
        lastPaymentAmount: invoice.amount_paid,
        lastPaymentCurrency: invoice.currency,
        // Update trial information if it was previously trialing
        trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end
      };
      
      await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).update(subscriptionUpdates);
      
      const userUpdates: any = {
        lastPaymentDate: new Date(invoice.created * 1000),
        updatedAt: new Date()
      };
      
      if (productType === 'blenderbin') {
        userUpdates.subscriptionStatus = 'active';
        userUpdates.stripeRole = 'pro'; // Ensure they keep pro access after trial
        console.log('Updated BlenderBin user to active subscription status after payment');
      }
      
      await db.collection('users').doc(userId).update(userUpdates);
      
      console.log(`Successfully processed payment for user ${userId}, subscription ${subscriptionId}`);
      console.log(`User now has active ${productType} subscription with pro access`);
    }
    
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: any) {
  try {
    console.log('Processing invoice.payment_failed', invoice.id);
    
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;
    
    if (!subscriptionId) return; // Not a subscription invoice
    
    // Find user by Stripe customer ID
    const customerQuery = await db.collection('customers')
      .where('stripeId', '==', customerId)
      .limit(1)
      .get();
    
    if (customerQuery.empty) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }
    
    const userId = customerQuery.docs[0].id;
    
    // Get subscription to determine product type
    const subDoc = await db.collection('customers').doc(userId).collection('subscriptions').doc(subscriptionId).get();
    let productType = 'unknown';
    
    if (subDoc.exists) {
      const subData = subDoc.data();
      productType = subData?.productType || 'unknown';
    }
    
    // Log payment failure and potentially send notification
    console.log(`Payment failed for user ${userId}, ${productType} subscription ${subscriptionId}`);
    
    // You could add product-specific payment failure notification logic here
    // await sendPaymentFailedEmail(userData.email, invoice, productType);
    
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
} 