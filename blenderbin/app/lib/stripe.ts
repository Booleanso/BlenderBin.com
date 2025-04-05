import Stripe from 'stripe';

// Determine if we're in development mode - server-side only approach
const isDevelopment = process.env.NODE_ENV === 'development';

// Choose the appropriate key based on environment
const stripeKey = isDevelopment 
  ? (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY!)
  : process.env.STRIPE_SECRET_KEY!;

// Log for debugging (remove in production)
console.log(`Using Stripe in ${isDevelopment ? 'TEST' : 'LIVE'} mode`);

// Initialize Stripe with the appropriate secret key
export const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia'
});