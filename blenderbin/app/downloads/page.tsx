'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

interface SuccessContentProps {
  onDownloadStart: () => void;
  downloading: boolean;
}

function SuccessContent({ onDownloadStart, downloading }: SuccessContentProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      const verifyPurchase = async () => {
        try {
          const response = await fetch(`/api/verify-purchase?session_id=${sessionId}`);
          if (response.ok) {
            onDownloadStart();
            window.location.href = '/api/download';
          }
        } catch (error) {
          console.error('Verification error:', error);
        }
      };
      verifyPurchase();
    }
  }, [searchParams, onDownloadStart]);

  return (
    <div className="max-w-md w-full space-y-8 text-center">
      <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
      <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
        Thank you for your purchase!
      </h2>
      <div className="mt-2 text-gray-600">
        <p>Your download should start automatically.</p>
        <p className="mt-4">Installation instructions:</p>
        <ol className="text-left mt-4 space-y-2">
          <li>1. Extract the downloaded ZIP file</li>
          <li>2. Navigate to the project directory</li>
          <li>3. Run <code className="bg-gray-100 px-2 py-1 rounded">npm install</code></li>
          <li>4. Set up your environment variables</li>
          <li>5. Run <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code></li>
        </ol>
      </div>
      {downloading && (
        <div className="mt-4 text-sm text-gray-500">
          Downloading... If it does not start automatically,
          <button 
            onClick={() => window.location.href = '/api/download'}
            className="text-indigo-600 hover:text-indigo-500 ml-1"
          >
            click here
          </button>
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  const [downloading, setDownloading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Processing your purchase...
          </h2>
        </div>
      }>
        <SuccessContent 
          onDownloadStart={() => setDownloading(true)}
          downloading={downloading}
        />
      </Suspense>
    </div>
  );
}