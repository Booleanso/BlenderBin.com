'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, MotionValue } from 'framer-motion';

interface FileSection {
  premium: string[];
  free: string[];
}

interface FileItem {
  name: string;
  type: 'premium' | 'free';
}

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileSection>({
    premium: [],
    free: []
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const premiumResponse = await fetch('/api/aws-s3-listObjects?type=premium');
        const freeResponse = await fetch('/api/aws-s3-listObjects?type=free');
        
        if (!premiumResponse.ok || !freeResponse.ok) {
          throw new Error('Failed to fetch files');
        }
        
        const premiumData = await premiumResponse.json();
        const freeData = await freeResponse.json();

        setFiles({
          premium: premiumData.files,
          free: freeData.files
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching files:', error);
        setError('Failed to load addons');
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const AppGrid = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const [totalWidth, setTotalWidth] = useState(0);
    const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });

    const ITEM_SIZE = 500;
    // Calculate spacing based on circle size to prevent overlap
    const HORIZONTAL_SPACING = ITEM_SIZE * 0.866; // cos(30°) * diameter
    const VERTICAL_SPACING = ITEM_SIZE * 0.75; // sin(30°) * diameter

    const allFiles: FileItem[] = [
      ...files.free.map(file => ({ name: file, type: 'free' as const })),
      ...files.premium.map(file => ({ name: file, type: 'premium' as const }))
    ];

    useEffect(() => {
      if (containerRef.current) {
        const maxColumns = Math.ceil(Math.sqrt(allFiles.length * 2));
        setTotalWidth(maxColumns * HORIZONTAL_SPACING);
        setViewportDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }

      const handleResize = () => {
        setViewportDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [allFiles.length]);

    const AppIcon = ({ 
      fileName, 
      type
    }: { 
      fileName: string; 
      type: 'premium' | 'free';
    }) => {
      const itemRef = useRef<HTMLDivElement>(null);
      
      const scale = useTransform([x, y] as MotionValue<number>[], ([xValue, yValue]: number[]) => {
        if (!containerRef.current || !itemRef.current) return 0;
        
        const containerBounds = containerRef.current.getBoundingClientRect();
        const itemBounds = itemRef.current.getBoundingClientRect();
        
        const itemCenter = {
          x: itemBounds.x + (itemBounds.width / 2),
          y: itemBounds.y + (itemBounds.height / 2)
        };

        const distanceFromLeft = Math.max(0, Math.min(1, itemCenter.x / (viewportDimensions.width * 0.3)));
        const distanceFromRight = Math.max(0, Math.min(1, (viewportDimensions.width - itemCenter.x) / (viewportDimensions.width * 0.3)));
        const distanceFromTop = Math.max(0, Math.min(1, itemCenter.y / (viewportDimensions.height * 0.3)));
        const distanceFromBottom = Math.max(0, Math.min(1, (viewportDimensions.height - itemCenter.y) / (viewportDimensions.height * 0.3)));

        const edgeScale = Math.min(
          distanceFromLeft,
          distanceFromRight,
          distanceFromTop,
          distanceFromBottom
        );

        const containerCenter = {
          x: containerBounds.width / 2,
          y: containerBounds.height / 2
        };
        const currentPosition = {
          x: itemBounds.x - containerBounds.x + xValue,
          y: itemBounds.y - containerBounds.y + yValue
        };
        
        const distanceFromCenter = Math.sqrt(
          Math.pow(containerCenter.x - currentPosition.x, 2) + 
          Math.pow(containerCenter.y - currentPosition.y, 2)
        );
        const maxDistance = Math.sqrt(
          Math.pow(containerBounds.width / 2, 2) + 
          Math.pow(containerBounds.height / 2, 2)
        );
        const centerScale = Math.max(0.4, 1 - (distanceFromCenter / maxDistance));

        return Math.min(centerScale, edgeScale);
      });

      return (
        <motion.div
          ref={itemRef}
          style={{ scale }}
          className="relative"
        >
          <motion.a
            href={`/library/${fileName}`}
            className="block w-[500px] h-[500px] rounded-full shadow-lg transition-shadow hover:shadow-xl relative"
            style={{
              backgroundImage: 'url("")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: type === 'premium' ? '#60A5FA' : '#4ADE80'
            }}
          >
            <div className="absolute bottom-8 left-0 right-0 text-center text-2xl text-white truncate px-6">
              {fileName}
            </div>
            <div className={`absolute bottom-4 right-8 px-3 py-1 rounded-full text-sm font-bold
              ${type === 'premium' 
                ? 'bg-blue-800 text-white' 
                : 'bg-green-800 text-white'}`}
            >
              {type === 'premium' ? 'PAID' : 'FREE'}
            </div>
          </motion.a>
        </motion.div>
      );
    };

    const getHexPosition = (index: number) => {
      const maxColumns = Math.ceil(Math.sqrt(allFiles.length * 2));
      const col = index % maxColumns;
      const row = Math.floor(index / maxColumns);
      
      // Offset odd rows for hexagonal pattern
      const xOffset = row % 2 ? HORIZONTAL_SPACING / 2 : 0;
      
      return {
        transform: `translate(
          ${col * HORIZONTAL_SPACING + xOffset - totalWidth/2}px,
          ${row * VERTICAL_SPACING - totalWidth/2}px
        )`
      };
    };

    const dragConstraints = {
      left: -totalWidth,
      right: totalWidth,
      top: -totalWidth,
      bottom: totalWidth
    };

    return (
      <motion.div
        ref={containerRef}
        className="fixed inset-0 w-screen h-screen cursor-grab active:cursor-grabbing flex items-center justify-center"
        drag
        dragConstraints={dragConstraints}
        style={{ x, y }}
        initial={{ x: 0, y: 0 }}
      >
        <div className="absolute">
          {allFiles.map((file, i) => (
            <div
              key={file.name}
              className="absolute"
              style={getHexPosition(i)}
            >
              <AppIcon
                fileName={file.name}
                type={file.type}
              />
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <AppGrid />
    </div>
  );
}