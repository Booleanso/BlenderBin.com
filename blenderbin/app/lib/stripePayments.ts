// /api/firebase/stripePayments.ts
import Stripe from 'stripe';
import { db } from './firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

async function getStripeCustomerId(userId: string) {
  const userDoc = await db.collection('customers').doc(userId).get();
  return userDoc.data()?.stripeId;
}

async function createCheckoutSession(userId: string, priceId: string) {
  const stripeCustomerId = await getStripeCustomerId(userId);
  
  return stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/canceled`
  });
}

export { stripe, createCheckoutSession };