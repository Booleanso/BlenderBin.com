'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, DownloadIcon, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { auth } from '../lib/firebase-client';
import { useAuthState } from 'react-firebase-hooks/auth';
import axios from 'axios';

// Stripe price IDs (placeholders)
const PRICE_IDS = {
  pro: {
    monthly: 'price_1NcXXXXXXXXXXXXXXXXXXXXX',
    yearly: 'price_1NcYYYYYYYYYYYYYYYYYYYYY',
  },
  business: {
    monthly: 'price_1NcZZZZZZZZZZZZZZZZZZZZZ',
    yearly: 'price_1NdAAAAAAAAAAAAAAAAAAAAAA',
  }
};

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();
  const [user] = useAuthState(auth);

  // Calculate yearly prices with 20% discount
  const getYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.8);
  };

  const handleSubscription = async (priceId: string) => {
    if (!user) {
      router.push('/signup?return_to=/pricing');
      return;
    }

    try {
      setIsLoading(priceId);
      const response = await axios.post('/api/checkout/create-checkout-session', {
        priceId,
        returnUrl: window.location.origin + '/dashboard'
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Pricing</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">Choose the plan that works for you</p>
        </div>

        {/* Billing Interval Toggle */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex items-center bg-gray-900 p-1 rounded-md">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 rounded ${
                billingInterval === 'monthly' ? 'bg-gray-800' : ''
              }`}
            >
              MONTHLY
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-4 py-2 rounded flex items-center ${
                billingInterval === 'yearly' ? 'bg-gray-800' : ''
              }`}
            >
              YEARLY <span className="ml-2 text-xs text-green-400">(SAVE 20%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Hobby (Free) Plan */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="p-8">
              <h2 className="text-lg font-semibold mb-4">Hobby</h2>
              <div className="mb-6">
                <div className="text-5xl font-bold">Free</div>
              </div>
              <div className="border-t border-gray-800 pt-6 mt-6">
                <h3 className="font-medium mb-4">Includes</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Pro two-week trial</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>2000 completions</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>50 slow requests</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="p-6 bg-gray-950 flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1 bg-white text-black hover:bg-gray-200 border-0"
                asChild
              >
                <Link href="/download">
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </Link>
              </Button>
              <Button variant="ghost" className="flex-1">Others</Button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-purple-600/20 to-blue-600/20 pointer-events-none"></div>
            <div className="p-8 relative">
              <h2 className="text-lg font-semibold mb-4">Pro</h2>
              <div className="mb-6">
                <div className="text-5xl font-bold">${billingInterval === 'monthly' ? '20' : getYearlyPrice(20)}</div>
                <div className="text-gray-400">{billingInterval === 'monthly' ? '/month' : '/year'}</div>
              </div>
              <div className="border-t border-gray-800 pt-6 mt-6">
                <h3 className="font-medium mb-4">Everything in Hobby, plus</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Unlimited completions</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>500 requests per month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="flex items-center">
                      <span>Unlimited slow requests</span>
                      <Info className="h-4 w-4 text-gray-400 ml-1" />
                    </div>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="flex items-center">
                      <span>Max mode</span>
                      <Info className="h-4 w-4 text-gray-400 ml-1" />
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            <div className="p-6 bg-gray-950 relative">
              <Button 
                className="w-full" 
                onClick={() => handleSubscription(PRICE_IDS.pro[billingInterval])}
                disabled={isLoading === PRICE_IDS.pro[billingInterval]}
              >
                {isLoading === PRICE_IDS.pro[billingInterval] ? 'Processing...' : 'Get Started'}
              </Button>
            </div>
          </div>

          {/* Business Plan */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="p-8">
              <h2 className="text-lg font-semibold mb-4">Business</h2>
              <div className="mb-6">
                <div className="text-5xl font-bold">${billingInterval === 'monthly' ? '40' : getYearlyPrice(40)}</div>
                <div className="text-gray-400">{billingInterval === 'monthly' ? '/user/month' : '/user/year'}</div>
              </div>
              <div className="border-t border-gray-800 pt-6 mt-6">
                <h3 className="font-medium mb-4">Everything in Pro, plus</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Enforce privacy mode org-wide</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Centralized team billing</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Admin dashboard with usage stats</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span>SAML/OIDC SSO</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="p-6 bg-gray-950">
              <Button 
                className="w-full" 
                onClick={() => handleSubscription(PRICE_IDS.business[billingInterval])}
                disabled={isLoading === PRICE_IDS.business[billingInterval]}
              >
                {isLoading === PRICE_IDS.business[billingInterval] ? 'Processing...' : 'Get Started'}
              </Button>
            </div>
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="mt-20 text-center">
          <p className="text-xl font-medium mb-4">
            Questions about enterprise security, procurement, or custom contracts?
          </p>
          <Button variant="ghost" className="flex items-center mx-auto hover:bg-gray-800 hover:text-white" asChild>
            <Link href="/contact-sales">
              Contact Sales <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {/* Trusted By Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-wider text-gray-500">TRUSTED BY ENGINEERS AT</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12">
            {/* These would be logos, but I'll use text placeholders for now */}
            <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition">
              <svg className="h-8 text-gray-500" viewBox="0 0 120 40" fill="currentColor">
                <rect width="120" height="40" fillOpacity="0" />
                <text x="60" y="25" textAnchor="middle" fontSize="12">OpenAI</text>
              </svg>
            </div>
            <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition">
              <svg className="h-8 text-gray-500" viewBox="0 0 120 40" fill="currentColor">
                <rect width="120" height="40" fillOpacity="0" />
                <text x="60" y="25" textAnchor="middle" fontSize="12">Stripe</text>
              </svg>
            </div>
            <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition">
              <svg className="h-8 text-gray-500" viewBox="0 0 120 40" fill="currentColor">
                <rect width="120" height="40" fillOpacity="0" />
                <text x="60" y="25" textAnchor="middle" fontSize="12">Samsung</text>
              </svg>
            </div>
            <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition">
              <svg className="h-8 text-gray-500" viewBox="0 0 120 40" fill="currentColor">
                <rect width="120" height="40" fillOpacity="0" />
                <text x="60" y="25" textAnchor="middle" fontSize="12">Shopify</text>
              </svg>
            </div>
            <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition">
              <svg className="h-8 text-gray-500" viewBox="0 0 120 40" fill="currentColor">
                <rect width="120" height="40" fillOpacity="0" />
                <text x="60" y="25" textAnchor="middle" fontSize="12">Instacart</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 