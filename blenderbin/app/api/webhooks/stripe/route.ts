import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import { db } from '../../../lib/firebase-admin';
import { Readable } from 'stream';

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
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Update the session status in Firestore
        await db.collection('stripe_checkout_sessions').doc(session.id).update({
          status: 'completed',
          updated: new Date()
        });
        
        // Get customer details
        const customerId = session.customer as string;
        const userId = session.client_reference_id as string;
        
        if (userId) {
          // Update user's subscription status in Firestore
          await db.collection('users').doc(userId).set({
            stripeCustomerId: customerId,
            stripeRole: 'pro', // Default to 'pro' for new subscriptions
            updatedAt: new Date()
          }, { merge: true });
        }
        
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        
        // Find the user with this customer ID
        const userSnapshotForUpdate = await db
          .collection('users')
          .where('stripeCustomerId', '==', subscription.customer)
          .limit(1)
          .get();
        
        if (!userSnapshotForUpdate.empty) {
          const userDoc = userSnapshotForUpdate.docs[0];
          
          // Update subscription status based on status
          const status = subscription.status;
          
          if (status === 'active') {
            // Get the subscription plan
            const plan = subscription.items?.data[0]?.price?.product;
            let role = 'pro'; // Default role
            
            // Logic to determine role based on product/price
            if (plan === process.env.STRIPE_PRODUCT_TEAM) {
              role = 'team';
            }
            
            await db.collection('users').doc(userDoc.id).update({
              stripeRole: role,
              stripeSubscriptionStatus: 'active',
              updatedAt: new Date()
            });
          } else if (status === 'canceled' || status === 'unpaid') {
            await db.collection('users').doc(userDoc.id).update({
              stripeRole: 'free',
              stripeSubscriptionStatus: status,
              updatedAt: new Date()
            });
          }
        }
        
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        
        // Find the user with this customer ID
        const userSnapshotForDelete = await db
          .collection('users')
          .where('stripeCustomerId', '==', deletedSubscription.customer)
          .limit(1)
          .get();
        
        if (!userSnapshotForDelete.empty) {
          const userDoc = userSnapshotForDelete.docs[0];
          
          // Downgrade the user to free tier
          await db.collection('users').doc(userDoc.id).update({
            stripeRole: 'free',
            stripeSubscriptionStatus: 'canceled',
            updatedAt: new Date()
          });
        }
        
        break;
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
} 