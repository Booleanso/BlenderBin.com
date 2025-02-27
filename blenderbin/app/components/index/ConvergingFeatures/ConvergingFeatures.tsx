'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import './ConvergingFeatures.css';


interface Addon {
  id: number;
  name: string;
  type: 'free' | 'premium';
  iconUrl: string | null;
  startPosition: {
    x: number;
    y: number;
  };
}

interface S3Files {
  premium: string[];
  free: string[];
  icons: Record<string, string>;
}

const ConvergingFeatures = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [addons, setAddons] = useState<Addon[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  const generateRandomPosition = () => {
    const minDistance = 500;
    const maxDistance = 1200;
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  };

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const [filesResponse, iconsResponse] = await Promise.all([
          fetch('/api/aws-s3-listObjects'),
          fetch('/api/aws-s3-listIcons')
        ]);

        if (!filesResponse.ok || !iconsResponse.ok) {
          throw new Error('Failed to fetch addons or icons');
        }

        const filesData: S3Files = await filesResponse.json();
        const iconsData = await iconsResponse.json();

        const allAddons: Addon[] = [
          ...filesData.free.map((name, index) => ({
            id: index,
            name,
            type: 'free' as const,
            iconUrl: iconsData[name] || null,
            startPosition: generateRandomPosition()
          })),
          ...filesData.premium.map((name, index) => ({
            id: filesData.free.length + index,
            name,
            type: 'premium' as const,
            iconUrl: iconsData[name] || null,
            startPosition: generateRandomPosition()
          }))
        ];

        setAddons(allAddons);
      } catch (error) {
        console.error('Error fetching addons:', error);
      }
    };

    fetchAddons();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionHeight = sectionRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      // Calculate progress based on section scroll position
      const progress = Math.max(0, Math.min(1, -rect.top / (sectionHeight - viewportHeight)));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAddonStyle = (addon: Addon) => {
    // Normalize the progress to start at 50% scroll
    const normalizedProgress = scrollProgress < 0.5 ? 0 : (scrollProgress - 0.5) * 2;
    
    const currentX = addon.startPosition.x * (1 - normalizedProgress);
    const currentY = addon.startPosition.y * (1 - normalizedProgress);
    const scale = 1 - (normalizedProgress * 0.3);
    
    // New opacity calculation:
    // Start at 0 opacity and fade in when second title appears (50% scroll)
    // Then fade out after 80% total scroll
    const fadeInOpacity = Math.min(1, (scrollProgress - 0.5) * 5); // 0 to 1 starting at 50% scroll
    const fadeOutOpacity = scrollProgress > 0.8 ? 1 - ((scrollProgress - 0.8) * 5) : 1;
    const opacity = fadeInOpacity * fadeOutOpacity;
    
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) scale(${scale})`,
      opacity: scrollProgress < 0.5 ? 0 : opacity
    };
  };

  const getDisplayName = (filename: string) => {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .toUpperCase();
  };

  const getTitleAndOpacity = () => {
    if (scrollProgress < 0.1) {
      return {
        text: "",
        opacity: 0
      };
    } else if (scrollProgress < 0.4) {
      // First title: fade in 0.1-0.15, visible until 0.3, fade out 0.3-0.4
      const opacity = scrollProgress < 0.15 
        ? (scrollProgress - 0.1) * 20  // Quick fade in
        : scrollProgress > 0.3 
          ? 1 - ((scrollProgress - 0.3) * 10)  // Fade out
          : 1;  // Stay visible
      return {
        text: "First, we had one idea.",
        opacity: Math.max(0, Math.min(1, opacity))
      };
    } else if (scrollProgress < 0.7) {
      // Second title: fade in 0.4-0.45, visible until 0.6, fade out 0.6-0.7
      const opacity = scrollProgress < 0.45 
        ? (scrollProgress - 0.4) * 20  // Quick fade in
        : scrollProgress > 0.6 
          ? 1 - ((scrollProgress - 0.6) * 10)  // Fade out
          : 1;  // Stay visible
      return {
        text: "Then, we had multiple.",
        opacity: Math.max(0, Math.min(1, opacity))
      };
    } else {
      // Final title: fade in 0.7-0.75, visible for the rest
      const opacity = scrollProgress < 0.75
        ? (scrollProgress - 0.7) * 20  // Quick fade in
        : 1;
      return {
        text: "So, we created a hub to house them.",
        opacity
      };
    }
  };

  return (
    <div ref={sectionRef} className="converging-section">
      <div className="scroll-container">
        <div className="features-container">
          {/* Update the title div */}
          <div 
            className="story-title"
            style={{
              position: 'absolute',
              top: '30%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
              textAlign: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#fff',
              opacity: getTitleAndOpacity().opacity,
              transition: 'opacity 0.3s ease'
            }}
          >
            {getTitleAndOpacity().text}
          </div>

          {/* Existing center card */}
          <div 
            className="center-card"
            style={{
              opacity: scrollProgress > 0.3 ? 1 : 0,
              transform: `translate(-49%, -40%) scale(${0.2 + (scrollProgress * 0.2)})`
            }}
          >
            <Image
              src="/blenderbin-zip.png"
              alt="BlenderBin Addon Manager"
              width={500}
              height={500}
              className="center-image"
              priority
            />
          </div>

          {/* Modified addons mapping - removed Link wrapper */}
          {addons.map((addon) => (
            <div
              key={addon.id}
              className={`feature-card ${addon.type}-addon`}
              style={getAddonStyle(addon)}
            >
              <div className="feature-content">
                {addon.iconUrl && (
                  <Image
                    src={addon.iconUrl}
                    alt={`${addon.name} icon`}
                    className="addon-icon"
                    width={32}
                    height={32}
                  />
                )}
                <h3 className="feature-title">{getDisplayName(addon.name)}</h3>
                <span className={`addon-type ${addon.type}`}>
                  {addon.type.charAt(0).toUpperCase() + addon.type.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConvergingFeatures;