"use client";

import React from 'react';
import { useEffect, useState } from "react";
import "./video-section.css";

interface Position {
  x: number;
  y: number;
}

const VideoSection = () => {
  const [position, setPosition] = useState<Position>({ x: 75, y: 50 });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let frame: number;
    let angle = 0;

    const animate = () => {
      angle += 0.002;
      setPosition({
        x: 75 + Math.cos(angle) * 10,
        y: 50 + Math.sin(angle) * 10,
      });
      frame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section 
      className={`video-section ${isExpanded ? 'expanded' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Content Above Video */}
      <div className="content-wrapper">
        <div className="text-content">
          <h2 className="heading">
            Coming up next: Decal Add-on
          </h2>
          <p className="description">
            Experience the next evolution in Blender add-ons with our upcoming Decal system.
            Click to expand and see more details.
          </p>
        </div>
      </div>

      {/* Video Container */}
      <div className="video-container">
        <video
          autoPlay
          muted
          loop
          className="video"
          src="/index/VideoSection/videosection.mp4"
        />
        <div className="pause-button">
          <svg
            className="pause-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      {/* Animated gradient blob */}
      <div
        className="gradient-blob"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </section>
  );
};

export default VideoSection;