"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./css/main-page/hero-section.css";
import "./css/main-page/about-section.css";
import "./css/main-page/blender-screen.css";
import "./css/main-page/scroll-addons.css";


import BentoBox from './components/main-page/BentoBox';
import "./css/main-page/bento-box.css";
import ConvergingFeatures from './components/main-page/ConvergingFeatures';


import DTFA from "./components/main-page/DTFA";
import VideoSection from "./components/main-page/VideoSection";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="body-main">
      <section className="hero-section">

      <iframe
        src="https://my.spline.design/blenderbincopy-1749f0bebc4ffdbe4c9fb47c98860979/"
        className="w-full h-screen absolute top-0 left-0 -z-10"
        style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(0, 0, 0, 0.2)' }}
        frameBorder="0"
        allow="autoplay; fullscreen; vr"
      />
        
        <div className="hero-desc">
          <div className="new-tag">SPANKING NEW</div>
          <h1 className="mb-1 text-5xl font-bold md:text-4xl">
          All of your Blender addons, in one space.
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-300 md:text-xl">
          You thought Gojo saw infinity? Wait till you see this.
          </p>
          <div className="hero-buttons mt-1 border-t border-gray-800 pt-8">
            <button className="trial-button">Start Your Free Trial</button>
            <button className="explore-button">Explore Add-Ons</button>    
          </div>
        </div>
      </section>
      
      
      <ConvergingFeatures />

      <DTFA />

      <BentoBox />

      <VideoSection />
    </div>
  );
}