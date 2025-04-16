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
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  status?: string;
}

const Subscriptions = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        try {
          await fetchSubscriptionStatus(user.uid);
        } catch (error) {
          console.error('Error fetching subscription status:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchSubscriptionStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/subscription/status?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      const data = await response.json();
      setSubscriptionStatus(data);
      return data;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      throw error;
    }
  };

  const handleCheckout = async (isYearly: boolean) => {
    if (!user) {
      router.push('/signup');
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
      
      // Use test key for localhost, live key for production
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const publishableKey = isDevelopment
        ? process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
        : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        
      console.log(`Using Stripe key for ${isDevelopment ? 'development' : 'production'}`);
      
      const stripe = await loadStripe(publishableKey!);
      if (!stripe) throw new Error('Failed to load Stripe');
      
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  const handleAuthRedirect = () => {
    router.push('/signup');
  };

  const handleCancelSubscription = async () => {
    try {
      if (!user?.uid) return;
      
      setCancellingSubscription(true);
      setCancelError('');

      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      // Refresh subscription status
      await fetchSubscriptionStatus(user.uid);
      setCancelDialogOpen(false);
      
      // Refresh the page to ensure all UI components are updated
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setCancelError(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setCancellingSubscription(false);
    }
  };

  const getCurrentPlan = () => {
    if (!subscriptionStatus.priceId) return null;
    return subscriptionStatus.priceId === process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID
      ? 'yearly'
      : 'monthly';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleDownloadRedirect = () => {
    // If user is logged in, go directly to download page
    if (user) {
      router.push(`/download?userId=${user.uid}`);
    } else {
      // Otherwise go to auth first with from parameter
      router.push('/signup?from=download');
    }
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

  const freeFeatures = [
    'Basic BlenderBin addon',
    'Essential rendering tools',
    'Standard model generation',
    'Free updates to basic version',
    'Community forum access'
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
      const isTrialing = subscriptionStatus.status === 'trialing';
      
      return (
        <>
          {isPlanMatch && (
            <div className={styles.currentPlan}>
              {isTrialing ? 'Free Trial Active' : 
                subscriptionStatus.cancelAtPeriodEnd 
                  ? `Your Current Plan (Cancels on ${formatDate(subscriptionStatus.currentPeriodEnd)})` 
                  : 'Your Current Plan'}
            </div>
          )}
          <button 
            onClick={() => setCancelDialogOpen(true)}
            className={`${styles.actionButton} ${styles.cancelButton} ${isTrialing ? styles.trialButton : ''}`}
            disabled={!isPlanMatch || subscriptionStatus.cancelAtPeriodEnd}
          >
            {!isPlanMatch 
              ? isTrialing
                ? 'In Free Trial'
                : `Subscribed to ${currentPlan === 'yearly' ? 'Yearly' : 'Monthly'}`
              : isTrialing
                ? 'Cancel Free Trial'
                : subscriptionStatus.cancelAtPeriodEnd
                  ? 'Cancellation Scheduled'
                  : 'Cancel Subscription'
            }
          </button>
        </>
      );
    }

    // Check if user has any active subscription in trial mode
    const isInAnyTrial = subscriptionStatus.status === 'trialing';

    return (
      <button 
        onClick={() => handleCheckout(isYearly)}
        className={`${styles.actionButton} ${isYearly ? styles.featuredButton : ''} ${isInAnyTrial ? styles.trialButton : ''}`}
        disabled={isInAnyTrial}
      >
        {isInAnyTrial ? 'In Free Trial' : 'Buy Now'}
      </button>
    );
  };

  return (
    <section id="subscriptions" className={styles.subscriptionsSection}>
      <h2 className={styles.title}>Choose your path</h2>
      <p className={styles.description}>Select the plan that best fits your needs</p>
      
      <div className={styles.plansContainer}>
        {/* Free Plan */}
        <div className={styles.freePlanCard}>
          <div className={styles.freePlanHeader}>
            <div className={styles.freeBadge}>Free Forever</div>
            <h3>Free Plan</h3>
            <div className={styles.freePrice}>
              <span className={styles.amount}>$0</span>
              <span className={styles.interval}> / forever</span>
            </div>
          </div>
          <ul className={styles.freeFeatures}>
            {freeFeatures.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
          <button 
            onClick={handleDownloadRedirect}
            className={styles.freeActionButton}
          >
            Download Now
          </button>
        </div>

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
            <DialogTitle>{subscriptionStatus.status === 'trialing' ? 'Cancel Free Trial' : 'Cancel Subscription'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your {subscriptionStatus.status === 'trialing' ? 'free trial' : 'subscription'}? You&apos;ll lose access to:
            </DialogDescription>
          </DialogHeader>
          <div className={styles.cancelDialogContent}>
            <ul>
              {features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <p className="text-red-500 mt-2 font-bold">
              Your {subscriptionStatus.status === 'trialing' ? 'free trial' : 'subscription'} will be canceled immediately and you will lose access right away.
            </p>
            {cancelError && (
              <p className="text-red-500 mt-2">{cancelError}</p>
            )}
          </div>
          <DialogFooter>
            <button 
              onClick={() => setCancelDialogOpen(false)}
              className={styles.cancelDialogButton}
              disabled={cancellingSubscription}
            >
              {subscriptionStatus.status === 'trialing' ? 'Keep Free Trial' : 'Keep Subscription'}
            </button>
            <button 
              onClick={handleCancelSubscription}
              className={styles.cancelDialogButtonDanger}
              disabled={cancellingSubscription}
            >
              {cancellingSubscription ? 'Cancelling...' : `Yes, Cancel ${subscriptionStatus.status === 'trialing' ? 'Trial' : 'Now'}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Subscriptions;
