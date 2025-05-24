'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../lib/firebase-client';
import { ArrowLeft } from 'lucide-react';
import Subscriptions from '../../components/index/Subscriptions/Subscriptions';

export default function BlenderBinPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black text-white">
      {/* Header */}
      <div className="relative mx-auto max-w-6xl pt-24 pb-8 px-4">
        <div className="flex items-center mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl mb-6">
            BlenderBin
            <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-zinc-300 max-w-2xl mx-auto">
            Get access to our complete collection of Blender add-ons with a 7-day free trial. 
            Cancel anytime, no commitment required.
          </p>
        </div>
      </div>

      {/* Subscriptions Component */}
      <Subscriptions />

      {/* Additional Information */}
      <div className="relative mx-auto max-w-6xl px-4 pb-16">
        {/* Features section */}
        <div className="grid gap-8 md:grid-cols-3 mb-20">
          <div className="rounded-3xl border border-blue-800/50 bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-8 backdrop-blur-sm text-center transition-all duration-200 hover:border-blue-700/50 hover:scale-[1.02]">
            <div className="text-4xl mb-6">🚀</div>
            <h3 className="text-xl font-semibold mb-4 text-white">Instant Access</h3>
            <p className="text-zinc-300 leading-relaxed">
              Start your free trial immediately and get access to all premium add-ons right away
            </p>
          </div>
          
          <div className="rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 p-8 backdrop-blur-sm text-center transition-all duration-200 hover:border-emerald-700/50 hover:scale-[1.02]">
            <div className="text-4xl mb-6">💰</div>
            <h3 className="text-xl font-semibold mb-4 text-white">No Risk</h3>
            <p className="text-zinc-300 leading-relaxed">
              7-day free trial with no commitment. Cancel anytime during or after the trial
            </p>
          </div>
          
          <div className="rounded-3xl border border-purple-800/50 bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-8 backdrop-blur-sm text-center transition-all duration-200 hover:border-purple-700/50 hover:scale-[1.02]">
            <div className="text-4xl mb-6">🔄</div>
            <h3 className="text-xl font-semibold mb-4 text-white">Always Updated</h3>
            <p className="text-zinc-300 leading-relaxed">
              Get weekly updates and new add-ons automatically included in your subscription
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50">
              <h3 className="font-semibold mb-4 text-white text-lg">How does the free trial work?</h3>
              <p className="text-zinc-300 leading-relaxed">
                You get immediate access to all BlenderBin add-ons for 7 days completely free. 
                We'll collect your payment method but won't charge you until after the trial ends. 
                You can cancel anytime during the trial.
              </p>
            </div>
            
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50">
              <h3 className="font-semibold mb-4 text-white text-lg">Can I cancel anytime?</h3>
              <p className="text-zinc-300 leading-relaxed">
                Yes! You can cancel your subscription at any time from your profile settings. 
                If you cancel during the trial, you won't be charged anything.
              </p>
            </div>
            
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50">
              <h3 className="font-semibold mb-4 text-white text-lg">What's included in the subscription?</h3>
              <p className="text-zinc-300 leading-relaxed">
                Full access to all current and future Blender add-ons, weekly updates, 
                custom add-on requests, artist collaborations, and offline usage rights.
              </p>
            </div>
          </div>
        </div>

        {/* Contact section */}
        <div className="text-center">
          <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold mb-4 text-white">Need help?</h3>
            <p className="mb-8 text-zinc-300 leading-relaxed">
              Have questions about BlenderBin or need support with your subscription?
            </p>
            <Link 
              href="mailto:help@blenderbin.com" 
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-6 py-3 font-medium text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:bg-zinc-700/50 hover:scale-105"
            >
              Contact Support
            </Link>
          </div>
        </div>

        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
          <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
        </div>
      </div>
    </section>
  );
} 