'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import FAQ from '../components/FAQ/FAQ';

// Create a wrapper component that doesn't use useSearchParams
export default function DownloadPage() {
  return (
    <Suspense fallback={<DownloadingPlaceholder />}>
      <DownloadContent />
    </Suspense>
  );
}

// Simple loading component
function DownloadingPlaceholder() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h1 className="text-4xl font-bold text-white">
            Loading download information...
          </h1>
        </div>
      </main>
    </div>
  );
}

// Move all content to this component
function DownloadContent() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const searchParams = useSearchParams();

  const initiateDownload = useCallback(async () => {
    try {
      const userId = searchParams.get('userId');
      const sessionId = searchParams.get('session_id');
      
      // Build the URL with available parameters
      let downloadUrl = '/api/download?';
      if (userId) downloadUrl += `userId=${userId}`;
      if (sessionId) {
        if (userId) downloadUrl += '&';
        downloadUrl += `session_id=${sessionId}`;
      }
      
      const response = await fetch(downloadUrl);
      if (response.ok) {
        const { downloadUrl: fileUrl } = await response.json();
        window.location.href = fileUrl;
        setIsDownloading(true);
        
        // Set autoDownloaded if this was triggered by the useEffect
        if (!isDownloading) {
          setAutoDownloaded(true);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [searchParams, isDownloading]);

  useEffect(() => {
    // Start download immediately if userId or session_id is present
    if (searchParams.get('userId') || searchParams.get('session_id')) {
      initiateDownload();
    }
  }, [initiateDownload, searchParams]);

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-4xl font-bold text-white">
            Thank you for downloading BlenderBin
          </h1>
          
          <div className="space-y-4">
            {autoDownloaded ? (
              <p className="text-gray-400">
                Your download has started automatically. If it doesn't appear in your downloads folder, click the button below.
              </p>
            ) : (
              <p className="text-gray-400">
                Your download should begin automatically in a few seconds.
              </p>
            )}
            
            {isDownloading && !autoDownloaded && (
              <p className="text-sm text-gray-500">
                Download started! Check your downloads folder.
              </p>
            )}
            
            <button
              onClick={initiateDownload}
              className="mt-8 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 font-medium text-sm"
            >
              Download Again
            </button>
          </div>

          <div className="mt-16 pt-12 border-t border-gray-800">
            <h2 className="text-2xl font-semibold mb-6 text-white">Installation Guide</h2>
            <ol className="text-left space-y-4 text-gray-400">
              <li className="flex items-start">
                <span className="font-mono bg-gray-900 px-2 py-0.5 rounded mr-2">1</span>
                Open Blender and go to <span className="text-gray-300">Edit → Preferences → Add-ons</span>
              </li>
              <li className="flex items-start">
                <span className="font-mono bg-gray-900 px-2 py-0.5 rounded mr-2">2</span>
                Click <span className="text-gray-300">Install</span> in the top right corner
              </li>
              <li className="flex items-start">
                <span className="font-mono bg-gray-900 px-2 py-0.5 rounded mr-2">3</span>
                Navigate to the downloaded <span className="text-gray-300">BlenderBin.zip</span> file and select it
              </li>
              <li className="flex items-start">
                <span className="font-mono bg-gray-900 px-2 py-0.5 rounded mr-2">4</span>
                Enable the addon by checking the box next to <span className="text-gray-300">"Add Mesh: BlenderBin"</span>
              </li>
              <li className="flex items-start">
                <span className="font-mono bg-gray-900 px-2 py-0.5 rounded mr-2">5</span>
                The BlenderBin panel will appear in the <span className="text-gray-300">Sidebar (N)</span> of the 3D Viewport
              </li>
            </ol>

            <div className="mt-8 p-4 bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-400">
                <strong className="text-gray-300">Pro Tip:</strong> You can quickly access the sidebar by pressing the <kbd className="px-2 py-0.5 bg-gray-800 rounded text-sm">N</kbd> key in the 3D Viewport
              </p>
            </div>
          </div>
        </div>

        <div className="mt-32">
          <FAQ />
        </div>
      </main>
    </div>
  );
}