'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import Link from 'next/link';

interface FileSection {
  premium: string[];
  free: string[];
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
        // Fetch premium addons
        const premiumResponse = await fetch('/api/aws-s3-listObjects?type=premium');
        if (!premiumResponse.ok) {
          throw new Error('Failed to fetch premium files');
        }
        const premiumData = await premiumResponse.json();

        // Fetch free addons
        const freeResponse = await fetch('/api/aws-s3-listObjects?type=free');
        if (!freeResponse.ok) {
          throw new Error('Failed to fetch free files');
        }
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
  }, []); // Removed user dependency

  const AddonGrid = ({ files, sectionType }: { files: string[], sectionType: 'free' | 'premium' }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {files.map((fileName) => (
        <Link href={`/library/${fileName}`} key={fileName}>
          <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer">
            <CardHeader>
              <CardTitle>{fileName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Click to view details</p>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  sectionType === 'premium' 
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {sectionType === 'premium' ? 'Premium' : 'Free'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );

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
    <div className="container mx-auto px-4 py-8">
      {/* Free Addons Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Free Addons</h2>
          <span className="text-sm text-gray-600">{files.free.length} addons available</span>
        </div>
        {files.free.length > 0 ? (
          <AddonGrid files={files.free} sectionType="free" />
        ) : (
          <p className="text-gray-600 text-center py-8">No free addons available yet.</p>
        )}
      </section>

      {/* Premium Addons Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Premium Addons</h2>
          <span className="text-sm text-gray-600">{files.premium.length} addons available</span>
        </div>
        {files.premium.length > 0 ? (
          <AddonGrid files={files.premium} sectionType="premium" />
        ) : (
          <p className="text-gray-600 text-center py-8">No premium addons available yet.</p>
        )}
      </section>
    </div>
  );
}