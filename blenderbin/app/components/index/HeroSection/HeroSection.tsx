"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import "./HeroSection.scss";

interface HeroSectionProps {
  scrollY: number;
} 

const HeroSection = ({ scrollY }: HeroSectionProps) => {
  const router = useRouter();
  // Calculate opacity based on scroll position
  const opacity = Math.max(0, 1 - scrollY / 500); // Adjust 500 to control fade speed

  const scrollToSubscriptions = () => {
    const element = document.getElementById('subscriptions');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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
            onClick={() => router.push('/download')} 
            className="hero-button hero-button-secondary"
          >
            Download for Free
          </button>
        </div>
      </div>
      <div className="first-square">
        <Image
          className="hero-image"
          src="/BlenderBin-preview.svg"
          alt="BlenderBin Preview"
          width={600}
          height={400}
        />
      </div>
    </div>
  );
};

export default HeroSection;