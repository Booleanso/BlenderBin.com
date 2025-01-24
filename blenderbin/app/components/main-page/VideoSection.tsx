"use client";

import React from 'react';
import { useEffect, useState } from "react";
import "../../css/main-page/video-section.css";

interface Position {
  x: number;
  y: number;
}

const VideoSection = () => {
  const [position, setPosition] = useState<Position>({ x: 75, y: 50 });

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
    <section className="video-section">
      {/* Grid background */}
      <div className="grid-background">
        <div className="grid-container">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="grid-line" />
          ))}
        </div>
      </div>

      <div className="content-wrapper">
        {/* Text Content */}
        <div className="text-content">
          <h2 className="heading">
            Experience ease like never before.
          </h2>
          <p className="description">
            Easy, user-friendly Blender UI to help you with complex projects,
            without having to put the complex in complex.
          </p>
          <button className="preview-button">
            View Plugin Preview
          </button>
        </div>

        {/* Video Placeholder */}
        <div className="video-container">
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