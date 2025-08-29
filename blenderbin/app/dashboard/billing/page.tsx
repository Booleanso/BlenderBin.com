'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '../../lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '../../../components/ui/button';

type SubscriptionStatus = {
  isSubscribed: boolean;
  subscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  cancelAtPeriodEnd: boolean | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  isTrialing: boolean;
  trialStart: string | null;
  trialEnd: string | null;
  trialDaysRemaining: number | null;
  stripeLink: string | null;
  hasPremiumAccess: boolean;
};

export default function BillingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
        return;
      }

      setUser(currentUser);
      try {
        const res = await fetch(`/api/subscription/status?userId=${currentUser.uid}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load subscription');
        }
        setStatus(data as SubscriptionStatus);
      } catch (e: any) {
        setError(e?.message || 'Failed to load subscription');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const planLabel = useMemo(() => {
    if (!status?.priceId) return status?.isSubscribed ? 'BlenderBin Pro' : 'Free';
    const monthly = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    const yearly = process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID;
    if (status.priceId === yearly) return 'BlenderBin Yearly';
    if (status.priceId === monthly) return 'BlenderBin Monthly';
    return 'BlenderBin Pro';
  }, [status]);

  const handleManageBilling = async () => {
    try {
      setRedirecting(true);
      // Include Firebase ID token for server authentication (fallback to session cookie if present)
      const idToken = await auth.currentUser?.getIdToken?.();
      const res = await fetch('/api/create-billing-portal/blenderbin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ returnUrl: window.location.origin + '/dashboard/billing' })
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || 'Could not open billing portal');
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong while opening billing portal');
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center mb-8">
          <Button variant="ghost" asChild className="mr-4">
            <Link href="/dashboard" className="flex items-center text-gray-300 hover:text-white">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Return to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-white">Billing — BlenderBin</h1>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-md text-red-300 mb-6">
            {error}
          </div>
        )}

        <div className="bg-black border border-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-gray-400 uppercase">Current Plan</div>
              <div className="text-xl font-semibold text-white mt-1">{planLabel}</div>
              {status?.isTrialing && status.trialEnd && (
                <div className="text-gray-400 mt-1">Trial ends {new Date(status.trialEnd).toLocaleDateString()}</div>
              )}
              {!status?.isTrialing && status?.currentPeriodEnd && (
                <div className="text-gray-400 mt-1">Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}</div>
              )}
              <div className="text-gray-400 mt-1">Status: {status?.status || 'none'}</div>
            </div>
            <div>
              <Button onClick={handleManageBilling} className="bg-indigo-600 hover:bg-indigo-500" disabled={redirecting}>
                {redirecting ? 'Opening…' : 'Manage billing'}
              </Button>
            </div>
          </div>
          {!status?.isSubscribed && (
            <div className="text-gray-400 text-sm">
              You don't have an active BlenderBin subscription yet. Visit the pricing page to subscribe.
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          For account help, email <a className="underline" href="mailto:help@blenderbin.com">help@blenderbin.com</a>.
        </div>
      </div>
    </div>
  );
}