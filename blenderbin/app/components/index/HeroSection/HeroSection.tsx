"use client";

import React, { useEffect, useState } from "react";
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

  // Calculate opacity based on scroll position
  const opacity = Math.max(0, 1 - scrollY / 500); // Adjust 500 to control fade speed

  const scrollToSubscriptions = () => {
    const element = document.getElementById('subscriptions');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDownloadClick = () => {
    // If user is logged in, go directly to download page
    if (user) {
      router.push(`/download?userId=${user.uid}`);
    } else {
      // Otherwise go to signup page with from parameter
      router.push('/signup?from=download');
    }
  };

  return (
    <div 
      className="hero-container" 
      style={{ 
        transform: `translateY(${scrollY * 0.5}px)`,
        opacity: opacity 
      }}
    >
      <div className="hero-title-container">
        <h1 className="hero-title">All of your Blender addons, in one space.</h1>
        <p className="hero-description">You thought Gojo saw infinity? Wait till you see this.</p>
        <div className="hero-buttons">
          <button onClick={scrollToSubscriptions} className="hero-button">Get Started</button>
          <button 
            onClick={handleDownloadClick} 
            className="hero-button hero-button-secondary"
          >
            Download for Free
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
          quality={100}
        />
      </div>
      {/* <div className="first-square">
        
      </div> */}
    </div>
  ); 
};

export default HeroSection;