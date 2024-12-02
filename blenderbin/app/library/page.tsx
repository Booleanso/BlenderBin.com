'use client';

import { useState, useEffect, useRef } from 'react';

interface FileSection {
  premium: string[];
  free: string[];
}

interface FileItem {
  name: string;
  type: 'premium' | 'free';
}

interface Position {
  x: number;
  y: number;
}

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileSection>({
    premium: [],
    free: []
  });
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState<Position>({ x: 0, y: 0 });

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
    const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });

    const ITEM_SIZE = 500;
    const HORIZONTAL_SPACING = ITEM_SIZE * 0.866;
    const VERTICAL_SPACING = ITEM_SIZE * 0.75;

    const allFiles: FileItem[] = [
      ...files.free.map(file => ({ name: file, type: 'free' as const })),
      ...files.premium.map(file => ({ name: file, type: 'premium' as const }))
    ];

    useEffect(() => {
      const handleResize = () => {
        setViewportDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setStartPosition({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - startPosition.x;
      const newY = e.clientY - startPosition.y;
      
      // Add constraints if needed
      const maxDistance = 2000; // Adjust this value as needed
      const constrainedX = Math.max(-maxDistance, Math.min(maxDistance, newX));
      const constrainedY = Math.max(-maxDistance, Math.min(maxDistance, newY));
      
      setPosition({ x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const calculateScale = (itemBounds: DOMRect) => {
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

      const centerPosition = {
        x: viewportDimensions.width / 2,
        y: viewportDimensions.height / 2
      };

      const distanceFromCenter = Math.sqrt(
        Math.pow(centerPosition.x - itemCenter.x, 2) + 
        Math.pow(centerPosition.y - itemCenter.y, 2)
      );

      const maxDistance = Math.sqrt(
        Math.pow(viewportDimensions.width / 2, 2) + 
        Math.pow(viewportDimensions.height / 2, 2)
      );

      const centerScale = Math.max(0.4, 1 - (distanceFromCenter / maxDistance));
      return Math.min(centerScale, edgeScale);
    };

    const AppIcon = ({ fileName, type }: { fileName: string; type: 'premium' | 'free' }) => {
      const itemRef = useRef<HTMLDivElement>(null);
      const [scale, setScale] = useState(1);

      useEffect(() => {
        if (itemRef.current) {
          const updateScale = () => {
            const bounds = itemRef.current?.getBoundingClientRect();
            if (bounds) {
              setScale(calculateScale(bounds));
            }
          };

          updateScale();
          const interval = setInterval(updateScale, 100); // Update scale periodically
          return () => clearInterval(interval);
        }
      }, [position]);

      return (
        <div
          ref={itemRef}
          className="relative"
          style={{ transform: `scale(${scale})` }}
        >
          <a
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
          </a>
        </div>
      );
    };

    const getHexPosition = (index: number) => {
      const maxColumns = Math.ceil(Math.sqrt(allFiles.length * 2));
      const col = index % maxColumns;
      const row = Math.floor(index / maxColumns);
      const xOffset = row % 2 ? HORIZONTAL_SPACING / 2 : 0;
      
      return {
        transform: `translate(
          ${col * HORIZONTAL_SPACING + xOffset + position.x}px,
          ${row * VERTICAL_SPACING + position.y}px
        )`
      };
    };

    return (
      <div
        ref={containerRef}
        className="fixed inset-0 w-screen h-screen cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
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
      </div>
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