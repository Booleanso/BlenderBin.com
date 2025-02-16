"use client";

import { useEffect, useState } from "react";
// import Image from "next/image";

import "./css/main-page/about-section.css";
import "./css/main-page/blender-screen.css";
import "./css/main-page/scroll-addons.css";

import HeroSection from '../app/components/main-page/HeroSection';
import TabComponent from '../app/components/main-page/TabComponent';
import FeaturesSection from '../app/components/main-page/FeatureSection';
import Newsletter from '../app/components/main-page/Newsletter';
import LovedBy from '../app/components/main-page/LovedBy';
import BentoBox from '../app/components/main-page/BentoBox';
import ConvergingFeatures from '../app/components/main-page/ConvergingFeatures';


import DTFA from "../app/components/main-page/DTFA";
import VideoSection from "../app/components/main-page/VideoSection";

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

      <HeroSection scrollY={scrollY} />

      {/* <Squares 
      speed={0.5} 
      squareSize={40}
      direction='diagonal' // up, down, left, right, diagonal
      borderColor='#fff'
      hoverFillColor='#222'
      /> */}



      <ConvergingFeatures />

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
      
      


    </div>
  );
}