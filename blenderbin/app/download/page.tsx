'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import FAQ from '../components/FAQ/FAQ';
import { auth } from '../lib/firebase-client';
import { User } from 'firebase/auth';
import Link from 'next/link';

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

// Toast styles
const toastStyles = {
  base: "fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300",
  loading: "bg-blue-600 text-white",
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white"
};

// Move all content to this component
function DownloadContent() {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'loading' | 'success' | 'error', duration = 3000) => {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.download-toast');
    existingToasts.forEach(toast => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });

    // Create new toast
    const toast = document.createElement('div');
    toast.className = `${toastStyles.base} ${toastStyles[type]} download-toast`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove toast after duration (except for loading toasts)
    if (type !== 'loading' || duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, duration);
    }

    return toast;
  };

  const redirectToSignIn = () => {
    // Redirect to sign-in page
    router.push('/auth');
  };

  const initiateDownload = useCallback(async () => {
    // If user is not signed in, show sign-in prompt
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }

    try {
      // Show loading toast
      const loadingToast = showToast('Starting download...', 'loading');
      
      // Get parameters from URL or current user
      const userId = searchParams.get('userId') || user?.uid;
      const sessionId = searchParams.get('session_id');
      
      // Build the URL with available parameters
      let downloadUrl = '/api/download?';
      
      // Add parameters if available
      if (userId) downloadUrl += `userId=${userId}`;
      if (sessionId) {
        if (userId) downloadUrl += '&';
        downloadUrl += `session_id=${sessionId}`;
      }
      
      const response = await fetch(downloadUrl);
      const data = await response.json();
      
      // Remove loading toast
      if (loadingToast.parentNode) {
        loadingToast.parentNode.removeChild(loadingToast);
      }
      
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to download file';
        setDownloadError(errorMessage);
        showToast(`Download error: ${errorMessage}`, 'error');
        console.error('Download error:', errorMessage);
        return;
      }

      if (data.downloadUrl) {
        window.location.href = data.downloadUrl;
        setIsDownloading(true);
        showToast('Download started successfully!', 'success');
        
        // Set autoDownloaded if this was triggered by the useEffect
        if (!isDownloading) {
          setAutoDownloaded(true);
        }
      } else {
        setDownloadError('No download URL returned from server');
        showToast('Download error: No download URL returned', 'error');
      }
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Unknown error occurred');
      showToast(`Download error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`, 'error');
      console.error('Download error:', error);
    }
  }, [searchParams, isDownloading, user, router]);

  useEffect(() => {
    // Only start download automatically if user is signed in and we have userId or session_id
    if (!loading && user && (searchParams.get('userId') || searchParams.get('session_id'))) {
      initiateDownload();
    }
  }, [initiateDownload, searchParams, user, loading]);

  // If still loading auth state, show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-gray-100">
        <main className="container mx-auto px-4 py-24">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <h1 className="text-2xl font-bold text-white">
              Checking authentication status...
            </h1>
          </div>
        </main>
      </div>
    );
  }

  // If showing sign-in prompt
  if (showSignInPrompt) {
    return (
      <div className="min-h-screen bg-black text-gray-100">
        <main className="container mx-auto px-4 py-24">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="mx-auto h-16 w-16 text-blue-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-16 w-16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white">
              Sign in to Download
            </h1>
            <p className="text-gray-400">
              You need to sign in to download BlenderBin. Creating an account is quick and easy!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                onClick={redirectToSignIn}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 font-medium"
              >
                Sign In
              </button>
              <Link href="/" className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 font-medium">
                Back to Home
              </Link>
            </div>
            <div className="mt-8 p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-300">
                By signing in, you'll also get access to your download history and can re-download BlenderBin anytime.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {downloadError ? (
            <>
              <div className="mx-auto h-16 w-16 text-red-500 flex items-center justify-center">
                <div className="h-16 w-16 flex items-center justify-center border-4 border-red-500 rounded-full">
                  <span className="text-4xl font-bold">!</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-white">
                Download Error
              </h1>
              <p className="text-red-400">{downloadError}</p>
              <button
                onClick={initiateDownload}
                className="mt-8 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 font-medium text-sm"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
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
                    Click the button below to start your download.
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
                  {isDownloading ? "Download Again" : "Start Download"}
                </button>
              </div>
              
              <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-300">
                  Welcome, {user?.email}! Thanks for signing in. You can re-download BlenderBin anytime from your account.
                </p>
              </div>
            </>
          )}

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