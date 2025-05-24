"use client";

import React from "react";
import SpotlightCard from '../../ui/SpotlightCard/SpotlightCard';

const FeatureSection = () => {
  const features = [
    {
      title: "7 Day Free Trial",
      description: "Experience our premium add-ons first hand, for free. Cancel your subscription before 7 days if you do not want to get charged.",
      spotlightColor: "rgba(59, 130, 246, 0.15)" as const,
      accent: "blue"
    },
    {
      title: "Over-whelming Value",
      description: "One subscription, access to all of our add-ons. 200+ add-ons after year two.",
      spotlightColor: "rgba(147, 51, 234, 0.15)" as const,
      accent: "purple"
    },
    {
      title: "Built With Security",
      description: "Add-ons served instantly using an experimental version of WebSocket Secure. Creators program coming soon, with the ability to host your own add-on on BlenderBin.",
      spotlightColor: "rgba(16, 185, 129, 0.15)" as const,
      accent: "emerald"
    }
  ];

  const getAccentClasses = (accent: string) => {
    switch (accent) {
      case "blue":
        return "from-blue-500/20 to-blue-600/20";
      case "purple":
        return "from-purple-500/20 to-purple-600/20";
      case "emerald":
        return "from-emerald-500/20 to-emerald-600/20";
      default:
        return "from-zinc-500/20 to-zinc-600/20";
    }
  };

  return (
    <section className="relative bg-black px-4 py-20">
      {/* Content container */}
      <div className="relative mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl mb-3">
            Create 3D faster
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            With an infinite number of add-ons at your disposal.
          </p>
      </div>
      
        {/* Staggered feature cards */}
        <div className="space-y-12">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`flex items-center ${
                index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
              }`}
            >
              {/* Feature content */}
              <div className="flex-1 lg:px-12">
                <div className={`max-w-lg ${index % 2 === 0 ? 'lg:ml-auto' : 'lg:mr-auto'}`}>
                  <h3 className="text-2xl font-semibold text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-300 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  {/* Feature badge */}
                  <div className="inline-flex items-center rounded-full border border-zinc-800/50 bg-zinc-900/30 px-4 py-2 backdrop-blur-sm">
                    <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${getAccentClasses(feature.accent)} mr-2`} />
                    <span className="text-sm text-zinc-400">Premium Feature</span>
                  </div>
                </div>
              </div>

              {/* Feature card */}
              <div className="flex-1 mt-8 lg:mt-0">
                <div className={`max-w-md ${index % 2 === 0 ? 'lg:mr-auto' : 'lg:ml-auto'}`}>
                  <SpotlightCard 
                    className="!border-zinc-800/50 !bg-zinc-900/20 !backdrop-blur-sm !rounded-2xl"
                    spotlightColor={feature.spotlightColor}
                  >
                    <div className="aspect-[4/3] p-8 flex items-center justify-center">
                      {/* Visual element for each feature */}
                      <div className="relative">
                        <div className={`h-24 w-24 rounded-2xl bg-gradient-to-br ${getAccentClasses(feature.accent)} border border-white/10 flex items-center justify-center backdrop-blur-sm`}>
                          {feature.accent === "blue" && (
                            <svg className="h-10 w-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          {feature.accent === "purple" && (
                            <svg className="h-10 w-10 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          {feature.accent === "emerald" && (
                            <svg className="h-10 w-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Floating accent elements */}
                        <div className={`absolute -top-2 -right-2 h-4 w-4 rounded-full bg-gradient-to-r ${getAccentClasses(feature.accent)} blur-sm`} />
                        <div className={`absolute -bottom-2 -left-2 h-3 w-3 rounded-full bg-gradient-to-r ${getAccentClasses(feature.accent)} blur-sm`} />
                      </div>
                    </div>
        </SpotlightCard>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-0 h-72 w-72 rounded-full bg-blue-500/3 blur-3xl" />
          <div className="absolute top-1/2 right-0 h-72 w-72 rounded-full bg-purple-500/3 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 h-72 w-72 rounded-full bg-emerald-500/3 blur-3xl" />
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
