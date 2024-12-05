"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./css/main-page/hero-section.css";
import "./css/main-page/about-section.css";
import "./css/main-page/blender-screen.css";
import "./css/main-page/scroll-addons.css";

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
          frameBorder="0"
          allow="autoplay; fullscreen; vr"

        />
        
        <div className="hero-desc">
          <div className="new-tag">SPANKING NEW</div>
          <h1 className="hero-title">All your Blender addons under one subscription.</h1>
          <p>You thought Gojo saw infinity? Wait till you see this.</p>
          <div className="hero-buttons">
            <button className="trial-button">Start Your Free Trial</button>
            <button className="explore-button">Explore Add-Ons</button>    
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-content">
          <h2>Many addons, little cost.</h2>
          <p>Our subscription was meant for plugins that can help you in little ways; so enjoy paying for one thing, and having it all.</p>
          <button className="view-plugins-button">View All Plugins</button>
        </div>
        <div className="feature-image-container">
          <Image 
            src="/your-image.png"
            alt="Feature illustration"
            width={400}
            height={600}
            className="floating-image"
            style={{
              transform: `translateY(${scrollY * 0.2}px)`
            }}
          />
        </div>
      </section>

      <DTFA />
      <VideoSection />
    </div>
  );
}