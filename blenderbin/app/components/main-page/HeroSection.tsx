"use client";

import React from "react";
import Image from "next/image";

const HeroSection = () => {
  return (
    <div className="hero-container">
    
      
      <div className="hero-panel bg-gradient-to-br from-purple-900 via-red-500 to-green-600">
        <h1 className="hero-title">All of your Blender addons, in one space.</h1>
        <p className="hero-description">You thought Gojo saw infinity? Wait till you see this.</p>
        <Image 
          src="/public/editor-preview.png" // Update this path to where you store the image
          alt="AI Code Editor Interface"
          width={600}
          height={400}
          className="max-w-[90%] w-auto h-auto"
          priority
        />
      </div>
    </div>
  );
};

export default HeroSection;