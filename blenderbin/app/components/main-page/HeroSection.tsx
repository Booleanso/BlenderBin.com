"use client";

import React from "react";
import Image from "next/image";
import "../../css/main-page/HeroSection.scss";

interface HeroSectionProps {
  scrollY: number;
}

const HeroSection = ({ scrollY }: HeroSectionProps) => {
  return (
    <div className="hero-container" style={{ transform: `translateY(${scrollY * 0.5}px)` }}>
      <div className="first-square">
        <div className="hero-title-container">
          <h1 className="hero-title">All of your Blender addons, in one space.</h1>
          <p className="hero-description">You thought Gojo saw infinity? Wait till you see this.</p>
        </div>

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