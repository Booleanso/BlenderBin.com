// ConvergingFeatures.tsx
import '../../css/main-page/ConvergingFeatures.css';

// ConvergingFeatures.tsx
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';


interface Feature {
  id: number;
  title: string;
  description: string;
  startPosition: {
    x: number;
    y: number;
  };
}

const ConvergingFeatures = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const features: Feature[] = [
    // Top row, spread far outside
    {
      id: 1,
      title: "Seamless Integration",
      description: "Works perfectly with your existing Blender workflow",
      startPosition: { x: -1200, y: -800 }
    },
    {
      id: 2,
      title: "One-Click Install",
      description: "Get started immediately with our simple installation",
      startPosition: { x: 0, y: -1000 }
    },
    {
      id: 3,
      title: "Regular Updates",
      description: "Stay current with continuous improvements",
      startPosition: { x: 1200, y: -800 }
    },
    // Middle row, extreme sides
    {
      id: 4,
      title: "24/7 Support",
      description: "Expert help whenever you need it",
      startPosition: { x: -1500, y: 0 }
    },
    {
      id: 5,
      title: "Custom Scripts",
      description: "Create and share your own automation scripts",
      startPosition: { x: 1500, y: 0 }
    },
    // Bottom row, spread far outside
    {
      id: 6,
      title: "Performance Boost",
      description: "Optimized for maximum rendering speed",
      startPosition: { x: -1200, y: 800 }
    },
    {
      id: 7,
      title: "Cloud Sync",
      description: "Access your settings from anywhere",
      startPosition: { x: 0, y: 1000 }
    },
    {
      id: 8,
      title: "Community Hub",
      description: "Connect with other Blender enthusiasts",
      startPosition: { x: 1200, y: 800 }
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate when the section's center reaches viewport's center
      const sectionCenter = rect.top + (rect.height / 4); // Using quarter instead of half to start earlier
      const viewportCenter = viewportHeight / 2;
      
      // Start animation when section center approaches viewport center
      const triggerPoint = viewportCenter + (viewportHeight * 0.2); // Adjust this value to change when animation starts
      
      // Calculate progress based on distance from trigger point
      const distance = triggerPoint - sectionCenter;
      const maxDistance = viewportHeight * 0.8; // Adjust this to change how long the animation takes
      
      const progress = Math.min(Math.max(distance / maxDistance, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getFeatureStyle = (feature: Feature) => {
    // Calculate current position based on scroll progress
    const currentX = feature.startPosition.x * (1 - scrollProgress);
    const currentY = feature.startPosition.y * (1 - scrollProgress);
    
    // Fade out as they get closer to center
    const opacity = scrollProgress > 0.8 ? 1 - ((scrollProgress - 0.8) * 5) : 1;
    
    return {
      transform: `translate(${currentX}px, ${currentY}px)`,
      opacity
    };
  };

  return (
    <div ref={sectionRef} className="converging-section">
      <div className="scroll-container">
        <div className="features-container">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="feature-card"
              style={getFeatureStyle(feature)}
            >
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
        
        <div 
          className="center-card"
          style={{
            transform: `scale(${0.8 + (scrollProgress * 0.4)})`,
            opacity: scrollProgress > 0.5 ? 1 : 0
          }}
        >
          <Image
            src="/your-center-image.png"
            alt="Central Feature"
            width={500}
            height={300}
            className="center-image"
          />
          <div className="card-content">
            <h2>All Features Combined</h2>
            <p>Experience the full power of our complete toolkit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvergingFeatures;