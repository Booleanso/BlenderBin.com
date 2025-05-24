"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth } from "../../../lib/firebase-client";
import { User } from "firebase/auth";
import "./HeroSection.scss";

interface HeroSectionProps { 
  scrollY: number;
} 

const HeroSection = ({ scrollY }: HeroSectionProps) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Memoize expensive calculations and throttle updates
  const transformStyles = useMemo(() => {
    // Throttle scroll calculations for better performance
    const throttledScrollY = Math.floor(scrollY / 10) * 10;
    
    // Use CSS transform3d for hardware acceleration
    const translateY = throttledScrollY * 0.3; // Reduced parallax effect
    const opacity = Math.max(0.1, Math.min(1, 1 - throttledScrollY / 600));
    
    return {
      transform: `translate3d(0, ${translateY}px, 0)`,
      opacity: opacity,
      willChange: scrollY > 0 ? 'transform, opacity' : 'auto' // Optimize GPU usage
    };
  }, [scrollY]);

  const scrollToSubscriptions = useCallback(() => {
    const element = document.getElementById('subscriptions');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleDownloadClick = useCallback(() => {
    // If user is logged in, go directly to download page
    if (user) {
      router.push(`/download?userId=${user.uid}`);
    } else {
      // Otherwise go to signup page with from parameter
      router.push('/signup?from=download');
    }
  }, [user, router]);

  const handleViewAddOns = useCallback(() => {
    router.push('/addons');
  }, [router]);

  return (
    <div 
      className="hero-container" 
      style={transformStyles}
    >
      <div className="hero-title-container">
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl mb-4 text-center">
          All of your Blender add-ons,
          <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            in one space.
          </span>
        </h1>
        <p className="text-lg leading-relaxed text-zinc-300 max-w-xl mx-auto text-center mb-8">
          Professional Blender add-ons, curated and optimized for your workflow.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={scrollToSubscriptions} 
            className="group inline-flex items-center rounded-full bg-white/10 px-8 py-4 text-base font-medium text-white backdrop-blur-sm border border-white/20 transition-all duration-200 hover:bg-white/20 hover:border-white/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            Try for Free
            <svg 
              className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button 
            onClick={handleViewAddOns}
            className="group inline-flex items-center rounded-full bg-zinc-900/50 px-8 py-4 text-base font-medium text-white backdrop-blur-sm border border-zinc-800/50 transition-all duration-200 hover:bg-zinc-800/50 hover:border-zinc-700/50 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            View Add-Ons
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
      </div>

      <div className="hero-image">
        <Image
          src="/BlenderBin-preview.svg"
          alt="BlenderBin Preview"
          width={1500}
          height={800}
          priority
          quality={85}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwMCIgaGVpZ2h0PSI4MDAiIHZpZXdCb3g9IjAgMCAxNTAwIDgwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE1MDAiIGhlaWdodD0iODAwIiBmaWxsPSIjMTExMTExIi8+Cjwvc3ZnPgo="
          sizes="(max-width: 768px) 85vw, (max-width: 480px) 95vw, 1500px"
          onError={(e) => {
            console.log('BlenderBin preview image failed to load');
            // Fallback to a placeholder if the main image fails
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwMCIgaGVpZ2h0PSI4MDAiIHZpZXdCb3g9IjAgMCAxNTAwIDgwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE1MDAiIGhlaWdodD0iODAwIiBmaWxsPSIjMjIyMjIyIi8+CjwvcGF0aCBkPSJNNzUwIDI1MEMzNTAgMjUwIDEwMCA1MDAgMTAwIDgwMEg5MDBDOTAwIDUwMCA2NTAgMjUwIDc1MCAyNTBaIiBmaWxsPSIjNDQ0NDQ0Ii8+CjwvcGF0aCBkPSJNNzUwIDUwMEM2NTAgNTAwIDU1MCA2MDAgNTUwIDcwMEg5NTBDOTUwIDYwMCA4NTAgNTAwIDc1MCA1MDBaIiBmaWxsPSIjNjY2NjY2Ii8+CjwvcGF0aCBkPSJNNzUwIDM1MEM2NTAgMzUwIDU1MCA0NTAgNTUwIDU1MEg5NTBDOTUwIDQ1MCA4NTAgMzUwIDc1MCAzNTBaIiBmaWxsPSIjNTU1NTU1Ii8+Cjx0ZXh0IHg9Ijc1MCIgeT0iNDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCI+QmxlbmRlckJpbiBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K';
          }}
        />
      </div>
      {/* <div className="first-square">
        
      </div> */}
    </div>
  ); 
};

export default HeroSection;