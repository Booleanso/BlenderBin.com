'use client';

import React, { useEffect, useState } from "react";
import Image from 'next/image';
import Link from 'next/link';
import InfiniteScroll from './InfiniteScroll/InfiniteScroll';
import TiltedCard from './TiltedCard/TiltedCard';
import './TabComponent.css';

interface S3Files {
  premium: string[];
  free: string[];
  icons: Record<string, string>;
}

interface Section {
  title: string;
  description: string;
  type: "scroll" | "video" | "image" | "tiltedCard";
  videoPath?: string;
  imagePath?: string;
}

const TabComponent: React.FC = () => {
  const [s3Files, setS3Files] = useState<S3Files>({ premium: [], free: [], icons: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchS3Files = async () => {
      try {
        const [filesResponse, iconsResponse] = await Promise.all([
          fetch('/api/aws-s3-listObjects'),
          fetch('/api/aws-s3-listIcons')
        ]);

        if (!filesResponse.ok || !iconsResponse.ok) {
          throw new Error('Failed to fetch S3 files or icons');
        }

        const filesData = await filesResponse.json();
        const iconsData = await iconsResponse.json();

        setS3Files({
          premium: filesData.premium,
          free: filesData.free,
          icons: iconsData
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching S3 files:', error);
        setLoading(false);
      }
    };

    fetchS3Files();
  }, []);

  const getDisplayName = (filename: string) => {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .toUpperCase();
  };

  const getIconUrl = (filename: string) => {
    const baseName = filename.replace(/\.[^/.]+$/, '');
    return s3Files.icons[baseName] || null;
  };

  // Create combined items array for the infinite scroll
  const scrollItems = [...s3Files.free, ...s3Files.premium].map(filename => ({
    content: (
      <div className="button-wrapper">
        <div className="addon-link-container">
          {getIconUrl(filename) && (
            <div className="addon-icon-wrapper">
              <Image
                src={getIconUrl(filename)!}
                alt={`${getDisplayName(filename)} icon`}
                width={24}
                height={24}
              />
            </div>
          )}
          <Link
            href={`/library/${encodeURIComponent(filename)}`}
            className="navbar-link"
          >
            {getDisplayName(filename)}
          </Link>
        </div>
      </div>
    )
  }));

  const sections: Section[] = [
    {
      title: "Full Library of Blender Add-ons",
      description:
        "Access a wide range of Blender add-ons, from basic tools to advanced features.",
      type: "scroll" as const,
    },
    {
      title: "Familiar Interface",
      description:
        "Didn't change a thing you already know. Access to all add-ons in the same place.",
      type: "video" as const,
      videoPath: "/index/TabComponent/iterations.mp4",
    },
    {
      title: "No More Paying for Multiple Add-ons",
      description: "One subscription, one account, and all the add-ons you need in one place.",
      type: "tiltedCard" as const,
      imagePath: "/index/TabComponent/paywall.png",
    },
  ];

  const renderSectionContent = (section: Section) => {
    switch (section.type) {
      case "scroll":
        return (
          <div className="content-container">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <InfiniteScroll
                items={scrollItems}
                isTilted={true}
                tiltDirection='right'
                autoplay={true}
                autoplaySpeed={0.5}
                autoplayDirection="up"
                pauseOnHover={true}
              />
            )}
          </div>
        );
      case "video":
        return (
          <div className="content-container">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="section-video"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain'
              }}
              onError={(e) => {
                console.error('Video error:', e);
              }}
            >
              <source 
                src={section.videoPath} 
                type="video/mp4"
                onError={(e) => {
                  console.error('Source error:', e);
                }}
              />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case "tiltedCard":
        return (
          <div className="content-container">
            <TiltedCard
              imageSrc={section.imagePath}
              altText={section.title}
              containerHeight="100%"
              containerWidth="100%"
              imageHeight="100%"
              imageWidth="100%"
              scaleOnHover={1.05}
              rotateAmplitude={10}
            />
          </div>
        );
      default:
        return <div className="content-container" />;
    }
  };

  return (
    <div className="tab-container">
      <div className="sections-container">
        {sections.map((section, index) => (
          <div key={index} className="section-wrapper">
            <div className="section-header">
              <h1 className="section-title">{section.title}</h1>
              <p className="section-description">{section.description}</p>
            </div>
            {renderSectionContent(section)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabComponent;