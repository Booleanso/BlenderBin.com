'use client';

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from 'next/image';
import Link from 'next/link';
import InfiniteScroll from './InfiniteScroll/InfiniteScroll';
import TiltedCard from './TiltedCard/TiltedCard';

interface S3Files {
  premium: string[];
  free: string[];
  icons: Record<string, string>;
}

interface Section {
  title: string;
  description: string;
  type: "scroll" | "video" | "image" | "tiltedCard";
  videoPath?: string;
  imagePath?: string;
}

const TabComponent: React.FC = () => {
  const [s3Files, setS3Files] = useState<S3Files>({ premium: [], free: [], icons: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchS3Files = async () => {
      try {
        const [filesResponse, iconsResponse] = await Promise.all([
          fetch('/api/aws-s3-listObjects'),
          fetch('/api/aws-s3-listIcons')
        ]);

        if (!filesResponse.ok || !iconsResponse.ok) {
          throw new Error('Failed to fetch S3 files or icons');
        }

        const filesData = await filesResponse.json();
        const iconsData = await iconsResponse.json();

        setS3Files({
          premium: filesData.premium,
          free: filesData.free,
          icons: iconsData
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching S3 files:', error);
        setLoading(false);
      }
    };

    fetchS3Files();
  }, []);

  const getDisplayName = useCallback((filename: string) => {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .toUpperCase();
  }, []);

  const getIconUrl = useCallback((filename: string) => {
    const baseName = filename.replace(/\.[^/.]+$/, '');
    return s3Files.icons[baseName] || null;
  }, [s3Files.icons]);

  // Memoize scroll items for performance
  const scrollItems = useMemo(() => 
    [...s3Files.free, ...s3Files.premium].map(filename => ({
    content: (
        <div className="flex items-center rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50 hover:bg-zinc-800/40 hover:scale-105">
          <div className="flex items-center gap-3">
          {getIconUrl(filename) && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <Image
                src={getIconUrl(filename)!}
                alt={`${getDisplayName(filename)} icon`}
                  width={20}
                  height={20}
                  className="opacity-90"
              />
            </div>
          )}
          <Link
            href={`/library/${encodeURIComponent(filename)}`}
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            {getDisplayName(filename)}
          </Link>
        </div>
      </div>
    )
    })), [s3Files.free, s3Files.premium, getIconUrl, getDisplayName]
  );

  const sections: Section[] = [
    {
      title: "Full Library of Blender Add-ons",
      description:
        "Access a wide range of Blender add-ons, from basic tools to advanced features.",
      type: "scroll" as const,
    },
    {
      title: "Familiar Interface",
      description:
        "Didn't change a thing you already know. Access to all add-ons in the same place.",
      type: "video" as const,
      videoPath: "/index/TabComponent/iterations.mp4",
    },
    {
      title: "No More Paying for Multiple Add-ons",
      description: "One subscription, one account, and all the add-ons you need in one place.",
      type: "tiltedCard" as const,
      imagePath: "/index/TabComponent/paywall.png",
    },
  ];

  const renderSectionContent = useCallback((section: Section) => {
    switch (section.type) {
      case "scroll":
        return (
          <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-zinc-400">Loading...</div>
              </div>
            ) : (
              <InfiniteScroll
                items={scrollItems}
                isTilted={true}
                tiltDirection='right'
                autoplay={true}
                autoplaySpeed={0.5}
                autoplayDirection="up"
                pauseOnHover={true}
              />
            )}
          </div>
        );
      case "video":
        return (
          <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm p-6">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-auto w-full rounded-xl"
              onError={(e) => {
                console.error('Video error:', e);
              }}
            >
              <source 
                src={section.videoPath} 
                type="video/mp4"
                onError={(e) => {
                  console.error('Source error:', e);
                }}
              />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case "tiltedCard":
        return (
          <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
            <TiltedCard
              imageSrc={section.imagePath}
              altText={section.title}
              containerHeight="100%"
              containerWidth="100%"
              imageHeight="100%"
              imageWidth="100%"
              scaleOnHover={1.05}
              rotateAmplitude={10}
            />
          </div>
        );
      default:
        return <div className="h-[400px] w-full rounded-2xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm" />;
    }
  }, [loading, scrollItems]);

  return (
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black px-4 py-24">
      {/* Content container - Apple-like centered layout */}
      <div className="relative mx-auto max-w-6xl">
        
        {/* Main header */}
        <div className="text-center mb-20">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl mb-6">
            Built for
            <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              creators.
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-zinc-300 md:text-xl max-w-2xl mx-auto">
            Everything you need to streamline your Blender workflow, packaged in one beautiful subscription.
          </p>
        </div>

        {/* Features grid */}
        <div className="space-y-24">
        {sections.map((section, index) => (
            <div key={index} className="relative">
              {/* Individual feature card */}
              <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm shadow-2xl">
                
                {/* Feature header */}
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl mb-4">
                    {section.title}
                  </h2>
                  <p className="text-lg leading-relaxed text-zinc-300 max-w-2xl mx-auto">
                    {section.description}
                  </p>
            </div>

                {/* Feature content */}
                <div className="mx-auto max-w-4xl">
            {renderSectionContent(section)}
                </div>
              </div>
          </div>
        ))}
        </div>

        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10">
          {/* Gradient orbs */}
          <div className="absolute top-1/3 left-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
        </div>
      </div>
    </section>
  );
};

export default TabComponent;