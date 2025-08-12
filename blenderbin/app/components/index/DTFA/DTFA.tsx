"use client";

import React, { useEffect, useMemo, useRef } from "react";

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

  // Build an extended list so the carousel can loop smoothly
  const loopedCreators = useMemo(() => [...creators, ...creators, ...creators], [creators]);
  const itemWidth = 192; // px (w-48), gap is 12px below
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Continuous marquee-style scroll using requestAnimationFrame
  useEffect(() => {
    let raf = 0;
    const gap = 12; // px
    const speed = 50; // px per second
    const total = (itemWidth + gap) * creators.length; // loop length
    let last = performance.now();
    let offset = 0;

    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      offset = (offset + speed * dt) % total;
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(-${offset}px)`;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [creators.length]);

  const scrollToSubscriptions = () => {
    const subscriptionsSection = document.getElementById('subscriptions');
    subscriptionsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black px-4 py-6 md:py-8 mb-24 md:mb-32">
      {/* Content container - Apple-like centered layout */}
      <div className="relative mx-auto max-w-5xl">
        
        {/* Main content card */}
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-10 backdrop-blur-sm shadow-2xl">
          
          {/* Logo removed per request */}

          {/* Main heading */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extralight tracking-tight text-white md:text-5xl lg:text-6xl">
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
          <div className="text-center mb-12">
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

          {/* Creators carousel */}
          <div className="border-t border-zinc-800/50 pt-12">
            <div className="text-center mb-8">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Inspired by these talented artists and more
              </h3>
            </div>

            <div className="relative mx-auto w-full max-w-4xl overflow-hidden">
              {/* Fade masks on edges */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black via-black/80 to-transparent z-10" />

              {/* Track */}
              <div
                ref={trackRef}
                className="flex gap-3 will-change-transform"
              >
                {loopedCreators.map((creator, i) => (
                  <div
                    key={`${creator}-${i}`}
                    className="shrink-0 w-48 md:w-56 rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-4 text-center backdrop-blur-sm"
                  >
                    <span className="text-base md:text-lg font-extralight text-zinc-200">
                      {creator}
                    </span>
                  </div>
                ))}
              </div>
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