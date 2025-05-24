'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { auth } from '../../lib/firebase-client';

// Icons
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

// Components
import { Button } from '../../../components/ui/button';
import WaitlistOverlay from '../../components/WaitlistOverlay';
import { isWaitlistEnabled } from '../../utils/waitlist';

export default function GizmoPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);

  useEffect(() => {
    // Check waitlist setting - only apply to Gizmo pricing
    setShowWaitlist(isWaitlistEnabled());
    
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

  // Pricing data for Gizmo AI
  const pricingData = {
    monthly: {
      pro: {
        price: '$20',
        priceId: process.env.NEXT_PUBLIC_GIZMO_STRIPE_PRICE_ID || '',
        cycle: '/month'
      },
      business: {
        price: '$40',
        priceId: process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_PRICE_ID || '',
        cycle: '/user/month'
      }
    },
    yearly: {
      pro: {
        price: '$192',
        priceId: process.env.NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_PRICE_ID || '',
        cycle: '/year'
      },
      business: {
        price: '$384',
        priceId: process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_PRICE_ID || '',
        cycle: '/user/year'
      }
    }
  };

  // Display loading spinner
  if (loading) {
    return (
      <section className="relative min-h-screen bg-black px-4 py-20">
        <div className="flex items-center justify-center">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black text-white px-4 py-24">
      {/* Waitlist Overlay - shown only when enabled for Gizmo */}
      {showWaitlist && <WaitlistOverlay />}
      
      {/* Content container */}
      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="text-center mb-20">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl mb-6">
            Gizmo AI
            <span className="block bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-zinc-300 max-w-2xl mx-auto">
            Choose the plan that works for you
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-16">
          <div className="bg-zinc-900/50 border border-zinc-800/50 inline-flex p-1 rounded-full backdrop-blur-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                billingCycle === 'monthly' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-3 rounded-full font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
              }`}
            >
              Yearly <span className="text-xs bg-orange-600/20 text-orange-400 px-2 py-1 rounded-full border border-orange-600/30">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing cards grid */}
        <div className="grid gap-8 md:grid-cols-3 mb-20 max-w-5xl mx-auto">
          
          {/* Hobby (Free) plan */}
          <div className="rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 p-8 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/50 hover:scale-[1.02]">
            <h2 className="text-2xl font-semibold mb-4 text-white">Hobby</h2>
            <div className="text-4xl font-bold mb-6 text-white">Free</div>
            <div className="h-px bg-zinc-800/50 mb-8"></div>
            
            <h3 className="font-medium mb-6 text-zinc-300 text-lg">Includes</h3>
            <ul className="mb-8 space-y-4 flex-1">
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span>Pro two-week trial</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span>2000 completions</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span>50 slow requests</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span>Gizmo AI Assistant</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span>20 AI queries/day</span>
              </li>
            </ul>

            <div className="mt-auto">
              <Link href="/download" className="w-full">
                <button className="w-full rounded-full py-3 px-6 font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200 hover:scale-105">
                  Download
                </button>
              </Link>
            </div>
          </div>

          {/* Pro plan */}
          <div className="rounded-3xl border border-purple-800/50 bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-8 backdrop-blur-sm transition-all duration-200 hover:border-purple-700/50 hover:scale-[1.02] relative overflow-hidden">
            {/* Pro badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-1 text-xs font-medium text-white">
                RECOMMENDED
              </div>
            </div>
            
            <h2 className="text-2xl font-semibold mb-4 text-white">Pro</h2>
            <div className="flex items-baseline gap-1 mb-6">
              <div className="text-4xl font-bold text-white">{pricingData[billingCycle].pro.price}</div>
              <div className="text-zinc-400">{pricingData[billingCycle].pro.cycle}</div>
            </div>
            <div className="h-px bg-zinc-800/50 mb-8"></div>
            
            <h3 className="font-medium mb-6 text-zinc-300 text-lg">Everything in Hobby, plus</h3>
            <ul className="mb-8 space-y-4 flex-1">
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-purple-400" />
                </div>
                <span>Unlimited completions</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-purple-400" />
                </div>
                <span>500 requests per month</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-purple-400" />
                </div>
                <span>Unlimited slow requests</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-purple-400" />
                </div>
                <span>Max mode</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-purple-400" />
                </div>
                <span>Gizmo AI Priority</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-purple-400" />
                </div>
                <span>200 AI queries/day</span>
              </li>
            </ul>

            <div className="mt-auto">
              <button
                className="w-full rounded-full py-3 px-6 font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                onClick={() => handleSubscription(pricingData[billingCycle].pro.priceId)}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Get Started'
                )}
              </button>
              {checkoutError && (
                <div className="mt-4 rounded-xl bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/30">
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
          <div className="rounded-3xl border border-blue-800/50 bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-8 backdrop-blur-sm transition-all duration-200 hover:border-blue-700/50 hover:scale-[1.02]">
            <h2 className="text-2xl font-semibold mb-4 text-white">Business</h2>
            <div className="flex items-baseline gap-1 mb-6">
              <div className="text-4xl font-bold text-white">{pricingData[billingCycle].business.price}</div>
              <div className="text-zinc-400">{pricingData[billingCycle].business.cycle}</div>
            </div>
            <div className="h-px bg-zinc-800/50 mb-8"></div>
            
            <h3 className="font-medium mb-6 text-zinc-300 text-lg">Everything in Pro, plus</h3>
            <ul className="mb-8 space-y-4 flex-1">
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-blue-400" />
                </div>
                <span>Enforce privacy mode org-wide</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-blue-400" />
                </div>
                <span>Centralized team billing</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-blue-400" />
                </div>
                <span>Admin dashboard with usage stats</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-blue-400" />
                </div>
                <span>SAML/OIDC SSO</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-blue-400" />
                </div>
                <span>Priority support</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-blue-400" />
                </div>
                <span>Unlimited AI queries</span>
              </li>
            </ul>

            <div className="mt-auto">
              <button
                className="w-full rounded-full py-3 px-6 font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                onClick={() => handleSubscription(pricingData[billingCycle].business.priceId)}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Get Started'
                )}
              </button>
              {checkoutError && (
                <div className="mt-4 rounded-xl bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/30">
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
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm text-center mb-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-semibold mb-4 text-white">Need a custom solution?</h3>
          <p className="mb-8 text-zinc-300 leading-relaxed">
            Questions about enterprise security, procurement, or custom contracts?
          </p>
          <Link 
            href="mailto:help@blenderbin.com" 
            className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-6 py-3 font-medium text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:bg-zinc-700/50 hover:scale-105"
          >
            Contact Sales <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Trusted by section */}
        <div className="mb-20">
          <p className="text-center text-zinc-500 text-sm uppercase tracking-widest mb-12">
            TRUSTED BY ENGINEERS AT
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 grayscale opacity-30 max-w-4xl mx-auto">
            <div className="flex items-center justify-center">
              <Image src="/johnson-johnson-logo.svg" alt="Johnson & Johnson" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/openai-logo.svg" alt="OpenAI" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/stripe-logo.svg" alt="Stripe" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/samsung-logo.svg" alt="Samsung" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/instacart-logo.svg" alt="Instacart" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/perplexity-logo.svg" alt="Perplexity" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/ramp-logo.svg" alt="Ramp" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/shopify-logo.svg" alt="Shopify" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/us-foods-logo.svg" alt="US Foods" width={120} height={40} />
            </div>
            <div className="flex items-center justify-center">
              <Image src="/mercado-libre-logo.svg" alt="Mercado Libre" width={120} height={40} />
            </div>
          </div>
        </div>

        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
          <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
        </div>
      </div>
    </section>
  );
} 