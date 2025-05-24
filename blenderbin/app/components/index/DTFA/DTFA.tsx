"use client";

import React from "react";

const DTFA = (): React.ReactElement => {
  const creators = [
    "@MARV.OS",
    "@THEDIZZYVIPER",
    "@0XVIZION",
    "@ARTYOMTOGO",
    "@SKINNY.DESIGNWHH",
    "@SPACEHEADTR",
    "@DISNEYPRINCE",
    "@KYLEC3D",
    "@POKRASLAMPAS",
    "@KODYKURTH",
    "@DAVIDHLT",
  ];

  const scrollToSubscriptions = () => {
    const subscriptionsSection = document.getElementById('subscriptions');
    subscriptionsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black px-4 py-24">
      {/* Content container - Apple-like centered layout */}
      <div className="relative mx-auto max-w-4xl">
        
        {/* Main content card */}
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-12 backdrop-blur-sm shadow-2xl md:p-16">
          
          {/* Logo section */}
          <div className="mb-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <span className="text-2xl font-bold text-white">b</span>
        </div>
      </div>

          {/* Main heading */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
              Designed to fix
              <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                annoyances.
              </span>
            </h1>
        </div>

        {/* Description */}
          <div className="mx-auto max-w-2xl text-center mb-10">
            <p className="text-lg leading-relaxed text-zinc-300 md:text-xl">
              The creators for BlenderBin thought of an idea, to bring together a plugin marketplace that focuses on 
              <span className="text-white font-medium"> easy plugins that everyone needs</span>, but no one wants to pay for individually.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-zinc-400">
              So, we introduced a subscription model.
        </p>
          </div>

        {/* CTA Button */}
          <div className="text-center mb-16">
        <button 
              onClick={scrollToSubscriptions}
              className="group inline-flex items-center rounded-full bg-white/10 px-8 py-4 text-base font-medium text-white backdrop-blur-sm border border-white/20 transition-all duration-200 hover:bg-white/20 hover:border-white/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
        >
          See Subscriptions
              <svg 
                className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
        </button>
          </div>

          {/* Creators section */}
          <div className="border-t border-zinc-800/50 pt-12">
            <div className="text-center mb-8">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Inspired by these talented artists and more
          </h3>
            </div>
            
            {/* Creators grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {creators.map((creator, index) => (
                <div
                key={creator}
                  className="group rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 text-center backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50 hover:bg-zinc-800/40 hover:scale-105"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
              >
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                {creator}
              </span>
                </div>
            ))}
          </div>
        </div>
      </div>

        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10">
          {/* Gradient orbs */}
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        </div>
      </div>
    </section>
  );
};

export default DTFA;