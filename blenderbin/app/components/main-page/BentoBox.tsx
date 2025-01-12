// BentoBox.tsx
"use client";

import React from 'react';
// import Image from 'next/image';

const BentoBox = () => {
  return (
    <section className="bento-section">
      <div className="bento-grid">
        <div className="bento-item featured">
          <div className="bento-content">
            <div className="tag">Heading</div>
            <h2>Heading</h2>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.</p>
          </div>
        </div>
        <div className="bento-item">
          <div className="bento-content">
            {/* Add content for other boxes */}
          </div>
        </div>
        <div className="bento-item">
          <div className="bento-content">
            {/* Add content for other boxes */}
          </div>
        </div>
        <div className="bento-item">
          <div className="bento-content">
            {/* Add content for other boxes */}
          </div>
        </div>
        <div className="bento-item wide">
          <div className="bento-content">
            {/* Add content for other boxes */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BentoBox;