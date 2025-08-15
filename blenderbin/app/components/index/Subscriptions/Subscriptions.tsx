'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { auth } from '../../../lib/firebase-client';
import { User } from 'firebase/auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { useRouter } from 'next/navigation';

interface SubscriptionStatus {
  isSubscribed: boolean;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  status?: string;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
}

const Subscriptions = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    isTrialing: false,
    trialDaysRemaining: null
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  // Add effect to periodically refresh subscription status for trial users
  useEffect(() => {
    if (user && subscriptionStatus.isTrialing) {
      console.log('Setting up periodic refresh for trial user');
      const interval = setInterval(async () => {
        try {
          await fetchSubscriptionStatus(user.uid);
        } catch (error) {
          console.error('Error in periodic status refresh:', error);
        }
      }, 30000); // Refresh every 30 seconds for trial users

      return () => clearInterval(interval);
    }
  }, [user, subscriptionStatus.isTrialing]);

  const fetchSubscriptionStatus = async (userId: string) => {
    try {
      console.log('Fetching subscription status for user:', userId);
      
      const response = await fetch(`/api/subscription/status?userId=${userId}&_t=${Date.now()}`);
      if (!response.ok) {
        console.error('Subscription status API response not ok:', response.status, response.statusText);
        throw new Error('Failed to fetch subscription status');
      }
      
      const data = await response.json();
      console.log('Subscription status data received:', data);
      
      setSubscriptionStatus(data);
      return data;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      
      // Set default status on error
      const defaultStatus = {
        isSubscribed: false,
        status: 'none',
        isTrialing: false,
        trialDaysRemaining: null
      };
      
      setSubscriptionStatus(defaultStatus);
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

      // Use the specific trial endpoint for BlenderBin
      const response = await fetch('/api/checkout/trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          priceId: priceId || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Checkout failed');
      }
      
      const { url } = await response.json();
      
      // Redirect directly to the Stripe Checkout URL
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('BlenderBin trial checkout error:', error);
      // You might want to show an error message to the user here
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

  // Manual refresh function
  const handleRefreshStatus = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      console.log('Manual refresh triggered by user');
      await fetchSubscriptionStatus(user.uid);
    } catch (error) {
      console.error('Error in manual refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <section className="relative bg-black px-4 py-20">
        <div className="flex items-center justify-center">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </section>
    );
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
    console.log('Rendering action button with status:', subscriptionStatus);
    
    if (!user) {
      return (
        <button 
          onClick={handleAuthRedirect}
          className={`w-full rounded-full py-3 px-6 font-medium transition-all duration-200 ${
            isYearly 
              ? 'bg-white text-black hover:bg-zinc-100' 
              : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
          }`}
        >
          Sign in to Subscribe
        </button>
      );
    }

    // Check if user has any subscription (including trial)
    if (subscriptionStatus.isSubscribed) {
      const currentPlan = getCurrentPlan();
      const isPlanMatch = isYearly ? currentPlan === 'yearly' : currentPlan === 'monthly';
      const isTrialing = subscriptionStatus.isTrialing;
      
      console.log('User has subscription:', { 
        currentPlan, 
        isPlanMatch, 
        isTrialing,
        status: subscriptionStatus.status,
        trialDaysRemaining: subscriptionStatus.trialDaysRemaining
      });
      
      return (
        <>
          {isPlanMatch && (
            <div className="text-center mb-4 py-2 px-4 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-sm">
              {isTrialing ? (
                subscriptionStatus.trialDaysRemaining !== null 
                  ? `Free Trial Active (${subscriptionStatus.trialDaysRemaining} days left)`
                  : 'Free Trial Active'
              ) : subscriptionStatus.cancelAtPeriodEnd 
                  ? `Your Current Plan (Cancels on ${formatDate(subscriptionStatus.currentPeriodEnd)})` 
                  : 'Your Current Plan'}
            </div>
          )}
          <button 
            onClick={() => setCancelDialogOpen(true)}
            className={`w-full rounded-full py-3 px-6 font-medium transition-all duration-200 ${
              isTrialing 
                ? 'bg-red-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/30'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            disabled={!isPlanMatch || subscriptionStatus.cancelAtPeriodEnd}
          >
            {!isPlanMatch 
              ? isTrialing
                ? `In Free Trial (${subscriptionStatus.trialDaysRemaining || 0} days left)`
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

    // User has no active subscription, show trial signup
    return (
      <button 
        onClick={() => handleCheckout(isYearly)}
        className={`w-full rounded-full py-3 px-6 font-medium transition-all duration-200 ${
          isYearly 
            ? 'bg-white text-black hover:bg-zinc-100 hover:scale-105' 
            : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 hover:scale-105'
        }`}
      >
        Start 7-Day Free Trial
      </button>
    );
  };

  return (
    <section id="subscriptions" className="relative bg-black px-4 py-20">
      {/* Content container */}
      <div className="relative mx-auto max-w-6xl">
        {/* Plans grid styled like addon cards */}
        <div className="grid gap-6 md:grid-cols-3">
           
          {/* Free Plan */}
          <div className="group rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 p-8 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/50 hover:bg-emerald-900/10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/30 mb-4">
                Free Forever
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Free Plan</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-zinc-400 ml-1">/ forever</span>
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={handleDownloadRedirect}
              className="w-full rounded-full py-3 px-6 font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200 hover:scale-105"
            >
              Download Now
            </button>
          </div>
 
          {/* Monthly Plan */}
          <div className={`group rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50 hover:bg-zinc-900/40 ${
            getCurrentPlan() === 'monthly' ? 'ring-2 ring-blue-500/50' : ''
          }`}>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-white mb-4">Monthly Plan</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">$14</span>
                <span className="text-zinc-400 ml-1">/ month</span>
              </div>
              <div className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300 border border-green-500/30">
                7-day free trial included
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="h-3 w-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            {renderActionButton(false)}
          </div>
 
          {/* Yearly Plan - Featured */}
          <div className={`group rounded-3xl border border-purple-800/50 bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-8 backdrop-blur-sm transition-all duration-200 hover:border-purple-700/50 hover:bg-purple-900/10 relative ${
            getCurrentPlan() === 'yearly' ? 'ring-2 ring-purple-500/50' : ''
          }`}>
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-1 text-xs font-medium text-white">
                Save 25%
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-white mb-4">Yearly Plan</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">$126</span>
                <span className="text-zinc-400 ml-1">/ year</span>
              </div>
              <div className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300 border border-green-500/30">
                7-day free trial included
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <svg className="h-3 w-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            {renderActionButton(true)}
          </div>
        </div>
 
        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
          <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
        </div>
      </div>
 
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {subscriptionStatus.status === 'trialing' ? 'Cancel Free Trial' : 'Cancel Subscription'}
            </DialogTitle>
            <DialogDescription className="text-zinc-300">
              Are you sure you want to cancel your {subscriptionStatus.status === 'trialing' ? 'free trial' : 'subscription'}? You&apos;ll lose access to:
            </DialogDescription>
          </DialogHeader>
          <div className="my-6">
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-zinc-300">
                  <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400 text-xs">•</span>
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <p className="text-red-400 mt-4 font-medium text-sm">
              Your {subscriptionStatus.status === 'trialing' ? 'free trial' : 'subscription'} will be canceled immediately and you will lose access right away.
            </p>
            {cancelError && (
              <p className="text-red-400 mt-2 text-sm">{cancelError}</p>
            )}
          </div>
          <DialogFooter className="gap-3">
            <button 
              onClick={() => setCancelDialogOpen(false)}
              className="px-6 py-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
              disabled={cancellingSubscription}
            >
              {subscriptionStatus.status === 'trialing' ? 'Keep Free Trial' : 'Keep Subscription'}
            </button>
            <button 
              onClick={handleCancelSubscription}
              className="px-6 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
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
