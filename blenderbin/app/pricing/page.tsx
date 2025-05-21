'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { auth } from '../lib/firebase-client';
import { motion } from 'framer-motion';

// Icons
import { Check, ArrowRight } from 'lucide-react';

// Components
import { Button } from '../../components/ui/button';

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubscription = async (priceId: string) => {
    if (!user) {
      // Redirect to signup if no user
      router.push('/signup');
      return;
    }

    try {
      setIsCheckingOut(true);
      setCheckoutError(null);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          priceId: priceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = `https://checkout.stripe.com/c/pay/${data.sessionId}`;
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError((error as Error).message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Pricing data based on Cursor's model
  const pricingData = {
    monthly: {
      pro: {
        price: '$20',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '',
        cycle: '/month'
      },
      business: {
        price: '$40',
        priceId: process.env.NEXT_PUBLIC_BUSINESS_STRIPE_PRICE_ID || '',
        cycle: '/user/month'
      }
    },
    yearly: {
      pro: {
        price: '$192',
        priceId: process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID || '',
        cycle: '/year'
      },
      business: {
        price: '$384',
        priceId: process.env.NEXT_PUBLIC_YEARLY_BUSINESS_STRIPE_PRICE_ID || '',
        cycle: '/user/year'
      }
    }
  };

  // Display loading spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Gizmo AI</h1>
            <div className="mt-6 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-black text-white pt-24 pb-12 px-4">
      <main className="container max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100 mb-4">Gizmo AI Pricing</h1>
          <p className="text-lg text-zinc-400">Choose the plan that works for you</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-zinc-900/50 border border-zinc-800 inline-flex p-1 rounded-lg backdrop-blur-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                billingCycle === 'monthly' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
              }`}
            >
              Yearly <span className="text-xs bg-orange-900/60 text-orange-400 px-1.5 py-0.5 rounded">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Hobby (Free) plan */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 backdrop-blur-sm flex flex-col shadow-xl">
            <h2 className="text-lg font-medium mb-2 text-zinc-100">Hobby</h2>
            <div className="text-4xl font-bold mb-4 text-white">Free</div>
            <div className="h-px bg-zinc-800 mb-6"></div>
            
            <h3 className="font-medium mb-4 text-zinc-300">Includes</h3>
            <ul className="mb-8 space-y-3 flex-1">
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Pro two-week trial</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>2000 completions</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>50 slow requests</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Gizmo AI Assistant</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>20 AI queries/day</span>
              </li>
            </ul>

            <div className="mt-auto space-y-3">
              <Link href="/download" className="w-full">
                <Button
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 shadow-sm text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Download
                </Button>
              </Link>
            </div>
          </div>

          {/* Pro plan */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 backdrop-blur-sm flex flex-col shadow-xl relative overflow-hidden">
            {/* Pro badge */}
            <div className="absolute -right-12 top-6 bg-blue-600 text-white px-12 py-1 transform rotate-45 text-sm font-semibold shadow-lg">
              RECOMMENDED
            </div>
            
            <h2 className="text-lg font-medium mb-2 text-zinc-100">Pro</h2>
            <div className="flex items-baseline gap-1">
              <div className="text-4xl font-bold text-white">{pricingData[billingCycle].pro.price}</div>
              <div className="text-zinc-400">{pricingData[billingCycle].pro.cycle}</div>
            </div>
            <div className="h-px bg-zinc-800 my-6"></div>
            
            <h3 className="font-medium mb-4 text-zinc-300">Everything in Hobby, plus</h3>
            <ul className="mb-8 space-y-3 flex-1">
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Unlimited completions</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>500 requests per month</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Unlimited slow requests</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Max mode</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Gizmo AI Priority</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>200 AI queries/day</span>
              </li>
            </ul>

            <div className="mt-auto">
              <Button
                className="w-full group relative flex justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50"
                onClick={() => handleSubscription(pricingData[billingCycle].pro.priceId)}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <span className="flex items-center">
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Get Started'
                )}
              </Button>
              {checkoutError && (
                <div className="mt-4 rounded-md bg-red-900/20 p-3 text-sm text-red-400">
                  <div className="flex">
                    <svg className="mr-2 h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{checkoutError}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Business plan */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 backdrop-blur-sm flex flex-col shadow-xl">
            <h2 className="text-lg font-medium mb-2 text-zinc-100">Business</h2>
            <div className="flex items-baseline gap-1">
              <div className="text-4xl font-bold text-white">{pricingData[billingCycle].business.price}</div>
              <div className="text-zinc-400">{pricingData[billingCycle].business.cycle}</div>
            </div>
            <div className="h-px bg-zinc-800 my-6"></div>
            
            <h3 className="font-medium mb-4 text-zinc-300">Everything in Pro, plus</h3>
            <ul className="mb-8 space-y-3 flex-1">
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Enforce privacy mode org-wide</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Centralized team billing</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Admin dashboard with usage stats</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>SAML/OIDC SSO</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Priority support</span>
              </li>
              <li className="flex items-start gap-2 text-zinc-300">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <span>Unlimited AI queries</span>
              </li>
            </ul>

            <div className="mt-auto">
              <Button
                className="w-full group relative flex justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50"
                onClick={() => handleSubscription(pricingData[billingCycle].business.priceId)}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <span className="flex items-center">
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Get Started'
                )}
              </Button>
              {checkoutError && (
                <div className="mt-4 rounded-md bg-red-900/20 p-3 text-sm text-red-400">
                  <div className="flex">
                    <svg className="mr-2 h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{checkoutError}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enterprise section */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 backdrop-blur-sm shadow-xl text-center mb-16 max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 text-zinc-100">Need a custom solution?</h3>
          <p className="mb-6 text-zinc-300">
            Questions about enterprise security, procurement, or custom contracts?
          </p>
          <Link 
            href="mailto:help@blenderbin.com" 
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/50 px-5 py-2.5 text-sm font-medium text-zinc-300 shadow-sm transition-colors hover:bg-zinc-700 focus:outline-none"
          >
            Contact Sales <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Trusted by section */}
        <div className="mt-24">
          <p className="text-center text-gray-500 text-sm uppercase tracking-widest mb-10">
            TRUSTED BY ENGINEERS AT
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 grayscale opacity-50">
            <div className="flex items-center justify-center">
              <Image src="/johnson-johnson-logo.svg" alt="Johnson & Johnson" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/openai-logo.svg" alt="OpenAI" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/stripe-logo.svg" alt="Stripe" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/samsung-logo.svg" alt="Samsung" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/instacart-logo.svg" alt="Instacart" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/perplexity-logo.svg" alt="Perplexity" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/ramp-logo.svg" alt="Ramp" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/shopify-logo.svg" alt="Shopify" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/us-foods-logo.svg" alt="US Foods" width={160} height={50} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/mercado-libre-logo.svg" alt="Mercado Libre" width={160} height={50} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 