'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../lib/firebase-client';

// Icons
import { Check, ArrowRight, Box, Bot } from 'lucide-react';

// Components
import { Button } from '../../components/ui/button';
import WaitlistOverlay from '../components/WaitlistOverlay';
import { isWaitlistEnabled } from '../utils/waitlist';

export default function PricingPage() {
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
    <section className="relative min-h-screen bg-black px-4 py-24">
      {/* Content container */}
      <div className="relative mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tight text-white mb-4">
            Choose your
            <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              product.
            </span>
          </h1>
          <p className="text-lg text-zinc-300 max-w-2xl mx-auto font-extralight">
            Select the pricing for the product you're interested in
          </p>
        </div>

        {/* Product Selection Cards */}
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto mb-16">
          
          {/* BlenderBin Card */}
          <div 
            className="group rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-10 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50 hover:scale-[1.02] cursor-pointer"
            onClick={() => router.push('/pricing/blenderbin')}
          >
            <div className="flex items-center mb-8">
              <div className="p-4 rounded-2xl bg-zinc-800/50 mr-6 border border-zinc-700/50">
                <Box className="h-8 w-8 text-zinc-200" />
              </div>
              <div>
                <h2 className="text-3xl font-extralight text-white mb-2">BlenderBin</h2>
                <p className="text-zinc-300 font-extralight">Blender Add-ons Collection</p>
          </div>
        </div>

            <div className="h-px bg-zinc-800/50 mb-8"></div>
            
            <div className="mb-8">
              <p className="text-zinc-300 mb-6 leading-relaxed font-extralight">
                Access our complete collection of professional Blender add-ons with a 7-day free trial.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-zinc-200" />
                  </div>
                  <span className="text-sm">Full access to all Blender add-ons</span>
              </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-zinc-200" />
                  </div>
                  <span className="text-sm">7-day free trial</span>
              </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-zinc-200" />
                  </div>
                  <span className="text-sm">Weekly updates and new add-ons</span>
              </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-zinc-200" />
                  </div>
                  <span className="text-sm">Custom add-on requests</span>
              </li>
            </ul>
            </div>

            <div className="text-center">
              <div className="text-3xl font-semibold text-white mb-4">Starting at $14/month</div>
              <button className="w-full rounded-full py-3 px-6 font-medium bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2">
                View BlenderBin Pricing <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Gizmo AI Card */}
          <div 
            className="group rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-10 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50 hover:scale-[1.02] cursor-pointer"
            onClick={() => router.push('/pricing/gizmo')}
          >
            <div className="flex items-center mb-8">
              <div className="p-4 rounded-2xl bg-zinc-800/50 mr-6 border border-zinc-700/50">
                <Bot className="h-8 w-8 text-zinc-200" />
              </div>
              <div>
                <h2 className="text-3xl font-extralight text-white mb-2">Gizmo AI</h2>
                <p className="text-zinc-300 font-extralight">AI-Powered Blender Assistant</p>
              </div>
            </div>
            
            <div className="h-px bg-zinc-800/50 mb-8"></div>
            
            <div className="mb-8">
              <p className="text-zinc-300 mb-6 leading-relaxed font-extralight">
                Enhance your Blender workflow with AI-powered assistance and intelligent automation.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-zinc-200" />
                  </div>
                  <span className="text-sm">AI-powered Blender assistant</span>
              </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-zinc-200" />
                  </div>
                  <span className="text-sm">Intelligent code completion</span>
              </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-zinc-200" />
                  </div>
                  <span className="text-sm">Advanced AI queries</span>
              </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-zinc-200" />
                  </div>
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
                </div>

            <div className="text-center">
              <div className="text-3xl font-semibold text-white mb-4">Starting at $20/month</div>
              <button className="w-full rounded-full py-3 px-6 font-medium bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2">
                View Gizmo AI Pricing <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            </div>
          </div>

        {/* Feature Comparison Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight text-white mb-4">
              Product Comparison
            </h2>
            </div>
          
          <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm overflow-hidden max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800/50">
              {/* Features Column */}
              <div className="p-8">
                <h3 className="font-semibold text-zinc-100 mb-6 text-lg">Features</h3>
                <div className="space-y-4 text-zinc-300">
                  <div className="py-2">Blender Add-ons</div>
                  <div className="py-2">Free Trial</div>
                  <div className="py-2">AI Assistant</div>
                  <div className="py-2">Custom Requests</div>
                  <div className="py-2">Weekly Updates</div>
                  <div className="py-2">Priority Support</div>
                  <div className="py-2">Team Features</div>
                </div>
              </div>
              
              {/* BlenderBin Column */}
              <div className="p-8">
                <h3 className="font-semibold text-zinc-100 mb-6 flex items-center text-lg">
                  <Box className="h-5 w-5 text-blue-400 mr-2" />
                  BlenderBin
                </h3>
                <div className="space-y-4">
                  <div className="py-2 text-green-400 font-medium">✓ Full Collection</div>
                  <div className="py-2 text-green-400 font-medium">✓ 7 Days</div>
                  <div className="py-2 text-zinc-500">✗ Not Included</div>
                  <div className="py-2 text-green-400 font-medium">✓ Included</div>
                  <div className="py-2 text-green-400 font-medium">✓ Weekly</div>
                  <div className="py-2 text-zinc-300">Standard</div>
                  <div className="py-2 text-zinc-500">✗ Individual</div>
                </div>
                  </div>

              {/* Gizmo AI Column */}
              <div className="p-8">
                <h3 className="font-semibold text-zinc-100 mb-6 flex items-center text-lg">
                  <Bot className="h-5 w-5 text-purple-400 mr-2" />
                  Gizmo AI
                </h3>
                <div className="space-y-4">
                  <div className="py-2 text-zinc-500">✗ Not Included</div>
                  <div className="py-2 text-green-400 font-medium">✓ 14 Days</div>
                  <div className="py-2 text-green-400 font-medium">✓ Advanced AI</div>
                  <div className="py-2 text-zinc-500">✗ Not Included</div>
                  <div className="py-2 text-green-400 font-medium">✓ AI Updates</div>
                  <div className="py-2 text-green-400 font-medium">✓ Priority</div>
                  <div className="py-2 text-green-400 font-medium">✓ Team Plans</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact section */}
        <div className="text-center">
          <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm max-w-2xl mx-auto">
            <h3 className="text-2xl font-extralight mb-4 text-white">Need help choosing?</h3>
            <p className="mb-8 text-zinc-300 leading-relaxed font-extralight">
              Have questions about our products or need help selecting the right plan for your needs?
          </p>
          <Link 
            href="mailto:help@blenderbin.com" 
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-6 py-3 font-medium text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:bg-zinc-700/50 hover:scale-105"
          >
            Contact Sales <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
            </div>

        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
          <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
        </div>
    </div>
    </section>
  );
} 