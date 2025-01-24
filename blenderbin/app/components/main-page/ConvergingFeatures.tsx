'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import '../../css/main-page/ConvergingFeatures.css';

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
    const currentX = addon.startPosition.x * (1 - scrollProgress);
    const currentY = addon.startPosition.y * (1 - scrollProgress);
    const scale = 1 - (scrollProgress * 0.3);
    const opacity = scrollProgress > 0.8 ? 1 - ((scrollProgress - 0.8) * 5) : 1;
    
    return {
      transform: `translate(${currentX}px, ${currentY}px) scale(${scale})`,
      opacity
    };
  };

  const getDisplayName = (filename: string) => {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .toUpperCase();
  };

  return (
    <div ref={sectionRef} className="converging-section">
      <div className="scroll-container">
        <div className="features-container">
          {addons.map((addon) => (
            <Link
              key={addon.id}
              href={`/library/${encodeURIComponent(addon.name)}`}
              className="feature-card-link"
            >
              <div
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
            </Link>
          ))}
        </div>
        
        <div 
          className="center-card"
          style={{
            opacity: scrollProgress > 0.3 ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${0.8 + (scrollProgress * 0.2)})`
          }}
        >
          <Image
            src="/logo.png"
            alt="BlenderBin"
            width={500}
            height={300}
            className="center-image"
            priority
          />
          <div className="card-content">
            <h2>Your Blender Addons Hub</h2>
            <p>All your favorite addons in one place</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvergingFeatures;