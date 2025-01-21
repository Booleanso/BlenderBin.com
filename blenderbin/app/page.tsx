"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./css/main-page/hero-section.css";
import "./css/main-page/about-section.css";
import "./css/main-page/blender-screen.css";
import "./css/main-page/scroll-addons.css";

import HeroSection from './components/main-page/HeroSection';
import TabComponent from './components/main-page/TabComponent';
import FeaturesSection from './components/main-page/FeatureSection';
import Newsletter from './components/main-page/Newsletter';
import LovedBy from './components/main-page/LovedBy';
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

        <HeroSection />


      </section>

      <DTFA />


      <TabComponent />

      <FeaturesSection />



      <BentoBox />

      <VideoSection />

      <Newsletter
        title="Iterating with Shadow Workspaces"
        description="Hidden windows and kernel-level folder proxies to let AIs iterate on code without affecting the user."
        author="Arvid"
        readTime="19 minutes"
      />

      <LovedBy />
      
      <ConvergingFeatures />


    </div>
  );
}