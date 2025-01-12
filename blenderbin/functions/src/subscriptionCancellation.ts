import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

export const onSubscriptionCancelled = functions.https.onRequest(async (request, response) => {
  const sig = request.headers['stripe-signature'];

  try {
    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(
      request.rawBody,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle subscription cancelled event
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;

      // Get Firebase user with this Stripe customer ID
      const customersRef = admin.firestore().collection('customers');
      const customerSnapshot = await customersRef
        .where('stripeCustomerId', '==', stripeCustomerId)
        .get();

      if (!customerSnapshot.empty) {
        const customerId = customerSnapshot.docs[0].id;
        const customerRef = customersRef.doc(customerId);

        // Update subscription status in Firestore
        const subscriptionRef = customerRef
          .collection('subscriptions')
          .doc(subscription.id);

        await subscriptionRef.update({
          status: 'cancelled',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update customer metadata if needed
        await customerRef.update({
          isSubscribed: false,
          subscriptionStatus: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    response.json({ received: true });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    if (error instanceof Error) {
      response.status(400).send(`Webhook Error: ${error.message}`);
    } else {
      response.status(400).send('Webhook Error: Unknown error occurred');
    }
  }
});