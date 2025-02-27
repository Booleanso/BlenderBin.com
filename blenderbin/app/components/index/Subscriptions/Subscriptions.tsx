'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { auth } from '../../../lib/firebase-client';
import { User } from 'firebase/auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { useRouter } from 'next/navigation';
import styles from './Subscriptions.module.scss';

interface SubscriptionStatus {
  isSubscribed: boolean;
  priceId?: string;
}

const Subscriptions = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        try {
          const response = await fetch(`/api/subscription/status?userId=${user.uid}`);
          if (!response.ok) {
            throw new Error('Failed to fetch subscription status');
          }
          const data = await response.json();
          setSubscriptionStatus(data);
        } catch (error) {
          console.error('Error fetching subscription status:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCheckout = async (isYearly: boolean) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    
    try {
      const priceId = isYearly 
        ? process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID 
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          priceId: priceId || '',
        }),
      });

      if (!response.ok) throw new Error('Checkout failed');
      
      const { sessionId } = await response.json();
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('Failed to load Stripe');
      
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  const handleAuthRedirect = () => {
    router.push('/auth');
  };

  const handleCancelSubscription = async () => {
    try {
      if (!user?.uid) return;

      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');

      const statusResponse = await fetch(`/api/subscription/status?userId=${user.uid}`);
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setSubscriptionStatus(data);
      }

      setCancelDialogOpen(false);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  const getCurrentPlan = () => {
    if (!subscriptionStatus.priceId) return null;
    return subscriptionStatus.priceId === process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID
      ? 'yearly'
      : 'monthly';
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  const features = [
    'Full access to all Blender add-ons',
    'Custom add-on requests',
    'Weekly add-on updates',
    'Artist collaborations',
    'Offline add-on usage',
    'Future add-ons included'
  ];

  const renderActionButton = (isYearly: boolean) => {
    if (!user) {
      return (
        <button 
          onClick={handleAuthRedirect}
          className={`${styles.actionButton} ${isYearly ? styles.featuredButton : ''}`}
        >
          Sign in to Subscribe
        </button>
      );
    }

    if (subscriptionStatus.isSubscribed) {
      const currentPlan = getCurrentPlan();
      const isPlanMatch = isYearly ? currentPlan === 'yearly' : currentPlan === 'monthly';
      
      return (
        <>
          {isPlanMatch && (
            <div className={styles.currentPlan}>
              Your Current Plan
            </div>
          )}
          <button 
            onClick={() => setCancelDialogOpen(true)}
            className={`${styles.actionButton} ${styles.cancelButton}`}
            disabled={!isPlanMatch}
          >
            {isPlanMatch ? 'Cancel Subscription' : `Subscribed to ${currentPlan === 'yearly' ? 'Yearly' : 'Monthly'}`}
          </button>
        </>
      );
    }

    return (
      <button 
        onClick={() => handleCheckout(isYearly)}
        className={`${styles.actionButton} ${isYearly ? styles.featuredButton : ''}`}
      >
        Buy Now
      </button>
    );
  };

  return (
    <section id="subscriptions" className={styles.subscriptionsSection}>
      <h2 className={styles.title}>Choose your path</h2>
      <p className={styles.description}>Select the plan that best fits your needs</p>
      
      <div className={styles.plansContainer}>
        {/* Monthly Plan */}
        <div className={`${styles.planCard} ${getCurrentPlan() === 'monthly' ? styles.currentPlan : ''}`}>
          <div className={styles.planHeader}>
            <h3>Monthly Plan</h3>
            <div className={styles.price}>
              <span className={styles.amount}>$14</span>
              <span className={styles.interval}> / month</span>
            </div>
          </div>
          <ul className={styles.features}>
            {features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
          {renderActionButton(false)}
        </div>

        {/* Yearly Plan */}
        <div className={`${styles.planCard} ${styles.featuredPlan} ${getCurrentPlan() === 'yearly' ? styles.currentPlan : ''}`}>
          <div className={styles.planHeader}>
            <div className={styles.saveBadge}>Save 25%</div>
            <h3>Yearly Plan</h3>
            <div className={styles.price}>
              <span className={styles.amount}>$126</span>
              <span className={styles.interval}> / year</span>
            </div>
          </div>
          <ul className={styles.features}>
            {features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
          {renderActionButton(true)}
        </div>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You'll lose access to:
            </DialogDescription>
          </DialogHeader>
          <div className={styles.cancelDialogContent}>
            <ul>
              {features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <button 
              onClick={() => setCancelDialogOpen(false)}
              className={styles.cancelDialogButton}
            >
              Keep Subscription
            </button>
            <button 
              onClick={handleCancelSubscription}
              className={styles.cancelDialogButtonDanger}
            >
              Yes, Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Subscriptions;
