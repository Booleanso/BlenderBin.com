'use client';

import Subscriptions from '../components/index/Subscriptions/Subscriptions';

export default function PricingPage() {
  return (
    <section className="relative min-h-screen bg-black px-4 py-24">
      <div className="relative mx-auto max-w-6xl">
        {/* Page header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tight text-white mb-4">
            BlenderBin
            <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Pricing</span>
          </h1>
          <p className="text-lg text-zinc-300 max-w-2xl mx-auto font-extralight">
            7‑day free trial, cancel anytime. Unlock the full library of professional Blender add‑ons.
          </p>
        </div>

        {/* Benefits strip */}
        <div className="mb-10">
          <div className="mx-auto max-w-4xl rounded-3xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm px-5 py-4">
            <ul className="grid gap-3 sm:grid-cols-3 text-sm text-zinc-300">
              <li className="flex items-center justify-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
                Full collection access
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
                Weekly updates
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Priority support
              </li>
            </ul>
          </div>
        </div>

        {/* Plans */}
        <section id="subscriptions">
          <Subscriptions />
        </section>

        {/* Extra info */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
            <h3 className="text-white font-medium mb-2">Transparent Pricing</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Choose monthly or yearly. No hidden fees. Your plan includes all current and future add‑ons.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
            <h3 className="text-white font-medium mb-2">Cancel Anytime</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Manage your plan from your dashboard. You can cancel during trial or at any time afterwards.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
            <h3 className="text-white font-medium mb-2">For Artists & Teams</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Optimized tools, frequent updates, and responsive support to fit professional workflows.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}