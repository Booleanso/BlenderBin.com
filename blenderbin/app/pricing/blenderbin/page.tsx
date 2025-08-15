'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '../../lib/firebase-client';
import { ArrowLeft } from 'lucide-react';
import Subscriptions from '../../components/index/Subscriptions/Subscriptions';
import { doc, getDoc } from 'firebase/firestore';

export default function BlenderBinPricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalOneOffCents, setTotalOneOffCents] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute total one-off price of all add-ons (based on Firestore prices)
  useEffect(() => {
    const baseNameFromFilename = (filename: string) => filename.replace(/\.[^/.]+$/, '');
    const formatSlug = (filename: string) => baseNameFromFilename(filename).toUpperCase();
    (async () => {
      try {
        const res = await fetch('/api/addons');
        const data = await res.json();
        if (!data || !data.success || !Array.isArray(data.addons)) return;
        const addons: any[] = data.addons;
        const entries = await Promise.all(
          addons.map(async (a: any) => {
            const slug = formatSlug(a.filename);
            try {
              const snap = await getDoc(doc(db, 'addon_products', slug));
              if (snap.exists()) {
                const d: any = snap.data();
                const amount = Number(d.amount) || 0;
                return amount;
              }
            } catch {}
            return 0;
          })
        );
        const sum = entries.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
        setTotalOneOffCents(sum);
      } catch {
        // Silent fail; just omit the line if unavailable
      }
    })();
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
    <section className="relative min-h-screen bg-black text-white">
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

      {/* Choice + plain benefits text (no boxes), placed right above subscriptions */}
      <div className="relative mx-auto max-w-6xl px-4 -mt-2 mb-4 text-center">
        <p className="text-base md:text-lg text-zinc-200">Choose how you want to get BlenderBin</p>
        <p className="text-sm text-zinc-400 mt-1">
          Subscribe to unlock everything, or buy individual add‑ons as you go
          {typeof totalOneOffCents === 'number' && totalOneOffCents > 0 ? (
            <>
              {' '}(<span>all add‑ons individually ≈ </span>
              <span className="font-medium text-zinc-200">${(totalOneOffCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>)
            </>
          ) : null}.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-6 justify-center text-sm text-zinc-300">
          <span>🚀 Instant access</span>
          <span>💰 7‑day free trial, cancel anytime</span>
          <span>🔄 Always updated</span>
        </div>
      </div>

      {/* Subscriptions Component */}
      <Subscriptions />

      {/* Additional Information */}
      <div className="relative mx-auto max-w-6xl px-4 pb-16">
        {/* (Removed colored feature boxes; concise benefits moved above subscriptions) */}

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="rounded-3xl p-8">
              <h3 className="font-semibold mb-4 text-white text-lg">How does the free trial work?</h3>
              <p className="text-zinc-300 leading-relaxed">
                You get immediate access to all BlenderBin add-ons for 7 days completely free. 
                We'll collect your payment method but won't charge you until after the trial ends. 
                You can cancel anytime during the trial.
              </p>
            </div>
            
            <div className="rounded-3xl p-8">
              <h3 className="font-semibold mb-4 text-white text-lg">Can I cancel anytime?</h3>
              <p className="text-zinc-300 leading-relaxed">
                Yes! You can cancel your subscription at any time from your profile settings. 
                If you cancel during the trial, you won't be charged anything.
              </p>
            </div>
            
            <div className="rounded-3xl p-8">
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

        {/* Removed inner glow/spotlight background elements for a flat look */}
      </div>
    </section>
  );
} 