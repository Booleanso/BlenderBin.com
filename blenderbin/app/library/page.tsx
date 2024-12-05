'use client';

import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

interface FileSection {
  premium: string[];
  free: string[];
}

interface FileItem {
  name: string;
  type: 'premium' | 'free';
  clicks: number;
}

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileSection>({
    premium: [],
    free: []
  });
  const [clickData, setClickData] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch files from S3
        const [premiumResponse, freeResponse] = await Promise.all([
          fetch('/api/aws-s3-listObjects?type=premium'),
          fetch('/api/aws-s3-listObjects?type=free')
        ]);
        
        if (!premiumResponse.ok || !freeResponse.ok) {
          throw new Error('Failed to fetch files');
        }
        
        const premiumData = await premiumResponse.json();
        const freeData = await freeResponse.json();

        const allFiles = {
          premium: premiumData.files,
          free: freeData.files
        };
        setFiles(allFiles);

        // Fetch click data for each file
        const fileNames = [...allFiles.premium, ...allFiles.free];
        const clickDataMap: { [key: string]: number } = {};
        
        for (const fileName of fileNames) {
          const response = await fetch('/api/clicks', {
            headers: {
              'script-name': fileName
            }
          });
          const data = await response.json();
          if (data.clickData) {
            clickDataMap[fileName] = data.clickData[fileName] || 0;
          }
        }

        setClickData(clickDataMap);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const allFiles: FileItem[] = [
    ...files.free.map(file => ({ 
      name: file, 
      type: 'free' as const,
      clicks: clickData[file] || 0
    })),
    ...files.premium.map(file => ({ 
      name: file, 
      type: 'premium' as const,
      clicks: clickData[file] || 0
    }))
  ];

  const FileCard = ({ file }: { file: FileItem }) => (
    <div>
      <a href={`/library/${file.name}`} className="block">
        <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow h-64">
          <img
            src="/api/placeholder/400/320"
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 truncate">{file.name}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-bold
              ${file.type === 'premium' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
            >
              {file.type === 'premium' ? 'PAID' : 'FREE'}
            </span>
          </div>
          <div className="mt-2 flex items-center text-gray-600 text-sm">
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <span>{file.clicks} clicks</span>
            </div>
          </div>
        </div>
      </a>
    </div>
  );

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="animate-pulse">Loading...</div></div>;
  if (error) return <div className="flex justify-center items-center min-h-screen"><div className="text-center text-red-600"><p>{error}</p></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allFiles.map((file) => (
            <FileCard key={file.name} file={file} />
          ))}
        </div>
      </div>
    </div>
  );
}