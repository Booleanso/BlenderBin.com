"use client";

import React, { useEffect, useState } from "react";

interface Position {
  x: number;
  y: number;
}

const DTFA = (): React.ReactElement => {
  const [position1, setPosition1] = useState<Position>({ x: 25, y: 25 });
  const [position2, setPosition2] = useState<Position>({ x: 75, y: 75 });

  useEffect(() => {
    let frame: number;
    let angle1 = 0;
    let angle2 = Math.PI;

    const animate = () => {
      angle1 += 0.002;
      angle2 += 0.003;

      setPosition1({
        x: 50 + Math.cos(angle1) * 25,
        y: 50 + Math.sin(angle1) * 25,
      });

      setPosition2({
        x: 50 + Math.cos(angle2) * 25,
        y: 50 + Math.sin(angle2) * 25,
      });

      frame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

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

  return (
    <section className="relative min-h-25vh overflow-hidden bg-black px-4 py-16 text-white">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid h-full w-full grid-cols-12 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-full border-l border-gray-700" />
          ))}
        </div>
      </div>

      {/* Content container */}
      <div className="relative mx-auto max-w-7xl space-y-8 text-center">
        {/* Logo */}
        <div className="mb-12">
          <div className="inline-block text-4xl font-bold">b</div>
        </div>

        {/* Heading */}
        <h1 className="mb-6 text-5xl font-bold md:text-6xl">
          Designed to fix annoyances.
        </h1>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-300 md:text-xl">
          The creators for BlenderBin thought of an idea, to bring together a
          plugin marketplace that focuses on easy plugins that everyone needs, but
          no one wants to pay for individually. So, we introduced a subscription
          model.
        </p>

        {/* CTA Button */}
        <button 
          onClick={() => {
            const subscriptionsSection = document.getElementById('subscriptions');
            subscriptionsSection?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="rounded-full bg-white/10 px-8 py-3 text-white backdrop-blur-sm transition-all hover:bg-white/20"
        >
          See Subscriptions
        </button>

        {/* Creators list */}
        <div className="mt-16 border-t border-gray-800 pt-8">
          <h3 className="mb-6 text-xl font-bold text-gray-300">
            Inspired by these talented artists and more.
          </h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            {creators.map((creator) => (
              <span
                key={creator}
                className="cursor-pointer transition-colors hover:text-gray-300"
              >
                {creator}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Animated gradient blobs */}
      <div
        className="absolute h-72 w-72 rounded-full bg-purple-500/20 blur-3xl"
        style={{
          left: `${position1.x}%`,
          top: `${position1.y}%`,
          transform: "translate(-50%, -50%)",
          transition: "all 0.5s ease-out",
        }}
      />
      <div
        className="absolute h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
        style={{
          left: `${position2.x}%`,
          top: `${position2.y}%`,
          transform: "translate(-50%, -50%)",
          transition: "all 0.5s ease-out",
        }}
      />
    </section>
  );
};

export default DTFA;