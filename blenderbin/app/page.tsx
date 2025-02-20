'use client';

import { useEffect, useState } from "react";

import "./css/index/about-section.css";
import "./css/index/blender-screen.css";
import "./css/index/scroll-addons.css";

import HeroSection from './components/index/HeroSection/HeroSection';
import TabComponent from './components/index/TabComponent/TabComponent';
import FeaturesSection from './components/index/FeatureSection/FeatureSection';
// import Newsletter from './components/index/Newsletter/Newsletter';
import LovedBy from './components/index/LovedBy/LovedBy';
import ConvergingFeatures from './components/index/ConvergingFeatures/ConvergingFeatures';
import FAQ from './components/FAQ/FAQ';
// import Trusted from '../app/components/index/Trusted/Trusted';
import Subscriptions from './components/index/Subscriptions/Subscriptions';


import DTFA from "./components/index/DTFA/DTFA";
import VideoSection from "./components/index/VideoSection/VideoSection";

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

      <HeroSection scrollY={scrollY}/>
 
      {/* <Trusted /> */}

      <ConvergingFeatures />

      <DTFA />

      <TabComponent />
      <VideoSection />
      <FeaturesSection />

      

      {/* <Newsletter
        title="Iterating with Shadow Workspaces"
        description="Hidden windows and kernel-level folder proxies to let AIs iterate on code without affecting the user."
        author="Arvid"
        readTime="19 minutes"
      /> */}

      

      <section id="subscriptions">
        <Subscriptions />
      </section>

      <FAQ />

      

      <LovedBy />

      
      
      


    </div>
  );
}