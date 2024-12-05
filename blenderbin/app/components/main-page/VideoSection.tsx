"use client";

import { useEffect, useState } from "react";

interface Position {
  x: number;
  y: number;
}

const VideoSection = (): JSX.Element => {
  const [position, setPosition] = useState<Position>({ x: 75, y: 50 });

  useEffect(() => {
    let frame: number;
    let angle = 0;

    const animate = () => {
      angle += 0.002;
      setPosition({
        x: 75 + Math.cos(angle) * 10,
        y: 50 + Math.sin(angle) * 10,
      });
      frame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="relative flex min-h-screen items-center bg-black px-4 py-16">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid h-full w-full grid-cols-12 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-full border-l border-gray-700" />
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Text Content */}
        <div className="space-y-6">
          <h2 className="text-5xl font-bold text-white md:text-6xl">
            Experience ease like never before.
          </h2>
          <p className="text-lg text-gray-300 md:text-xl">
            Easy, user-friendly Blender UI to help you with complex projects,
            without having to put the complex in complex.
          </p>
          <button className="rounded-full bg-white/10 px-8 py-3 text-white backdrop-blur-sm transition-all hover:bg-white/20">
            View Plugin Preview
          </button>
        </div>

        {/* Video Placeholder */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
          <div className="absolute right-4 top-4 rounded-full bg-black/50 p-2 backdrop-blur-sm">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Animated gradient blob */}
      <div
        className="absolute h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: "translate(-50%, -50%)",
          transition: "all 0.5s ease-out",
        }}
      />
    </section>
  );
};

export default VideoSection;