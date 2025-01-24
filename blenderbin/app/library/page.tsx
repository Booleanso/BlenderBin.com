'use client';

import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import Image from 'next/image';

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
  const [files, setFiles] = useState<FileSection>({ premium: [], free: [] });
  const [clickData, setClickData] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const filesResponse = await fetch('/api/aws-s3-listObjects');
        if (!filesResponse.ok) throw new Error('Failed to fetch files');
        const allFiles: FileSection = await filesResponse.json();
        setFiles(allFiles);

        const fileNames = [...allFiles.premium, ...allFiles.free];
        const clicksResponse = await fetch('/api/clicks', {
          headers: { 'script-names': fileNames.join(',') }
        });
        const data = await clicksResponse.json();
        setClickData(data.clickData || {});
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
    ...files.free.map(file => ({ name: file, type: 'free' as const, clicks: clickData[file] || 0 })),
    ...files.premium.map(file => ({ name: file, type: 'premium' as const, clicks: clickData[file] || 0 }))
  ];

  const FileCard = ({ file }: { file: FileItem }) => (
    <div>
      <a href={`/library/${file.name}`} className="block">
        <div className="bg-[#111111] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow h-64 border border-gray-800">
          <Image
            src="/api/placeholder/400/320"
            alt={file.name}
            className="w-full h-full object-cover opacity-80"
          />
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-200 truncate">{file.name}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${file.type === 'premium' ? 'bg-blue-900 text-blue-100' : 'bg-green-900 text-green-100'}`}>
              {file.type === 'premium' ? 'PAID' : 'FREE'}
            </span>
          </div>
          <div className="mt-2 flex items-center text-gray-400 text-sm">
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <span>{file.clicks} clicks</span>
            </div>
          </div>
        </div>
      </a>
    </div>
  );

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#111111] text-gray-200"><div className="animate-pulse">Loading...</div></div>;
  if (error) return <div className="flex justify-center items-center min-h-screen bg-[#111111]"><div className="text-center text-red-400"><p>{error}</p></div></div>;

  return (
    <div className="min-h-screen bg-[#111111] py-8 px-4">
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