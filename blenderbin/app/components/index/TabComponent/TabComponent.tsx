'use client';

import React, { useEffect, useState } from "react";
import Image from 'next/image';
import Link from 'next/link';
import InfiniteScroll from './InfiniteScroll/InfiniteScroll';
import './TabComponent.css';

interface S3Files {
  premium: string[];
  free: string[];
  icons: Record<string, string>;
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

  const sections = [
    {
      title: "Full Library of Blender Add-ons",
      description:
        "Access a wide range of Blender add-ons, from basic tools to advanced features.",
      type: "scroll",
    },
    {
      title: "Infinite Iterations",
      description:
        "Limitless possibilities built with any add-on you choose.",
      type: "gif",
      gifPath: "/public/gif/iterations.gif",
    },
    {
      title: "No More Huge Paywall",
      description: "One subscription, and all the add-ons you need.",
      type: "custom",
    },
  ];

  const renderSectionContent = (section: any, index: number) => {
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
      case "gif":
        return (
          <div className="content-container">
            <Image
              src={section.gifPath}
              alt="Infinite Iterations"
              width={500}
              height={300}
              className="gif-content"
            />
          </div>
        );
      case "custom":
        return (
          <div className="content-container">



          </div>
        );
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
            {renderSectionContent(section, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabComponent;