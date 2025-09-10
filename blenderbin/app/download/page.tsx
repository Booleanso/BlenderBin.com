'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Download, ArrowLeft, FileDown, AlertCircle } from 'lucide-react';
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
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm text-center">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
            <h1 className="text-xl font-semibold text-white">
              Loading download information...
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}

// Move all content to this component
function DownloadContent() {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [toastMessage, setToastMessage] = useState<{message: string; type: 'loading' | 'success' | 'error'} | null>(null);
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
    setToastMessage({ message, type });
    
    if (type !== 'loading' || duration > 0) {
      setTimeout(() => {
        setToastMessage(null);
      }, duration);
    }
  };

  const redirectToSignIn = () => {
    router.push('/signup');
  };

  const initiateDownload = useCallback(async () => {
    // If user is not signed in, show sign-in prompt
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }

    try {
      // Show loading toast
      showToast('Starting download...', 'loading');
      
      // Get parameters from URL or current user
      const userId = searchParams.get('userId') || user?.uid;
      const sessionId = searchParams.get('session_id');
      const addonName = searchParams.get('addon');
      let token = searchParams.get('token'); // Extract token from URL parameters
      
      // If no token from URL or token seems invalid, get a fresh one
      if (!token || token.length < 100) {
        console.log('Getting fresh auth token...');
        try {
          token = await user.getIdToken(true); // Force refresh to get fresh token
        } catch (error) {
          console.error('Failed to get fresh token:', error);
          setDownloadError('Failed to authenticate. Please try signing in again.');
          showToast('Authentication failed. Please try signing in again.', 'error');
          return;
        }
      }
      
      // Build the URL with available parameters (excluding token, which goes in headers)
      let downloadUrl = '/api/download?';
      
      // Add parameters if available
      if (userId) downloadUrl += `userId=${userId}`;
      if (sessionId) {
        if (userId) downloadUrl += '&';
        downloadUrl += `session_id=${sessionId}`;
      }
      if (addonName) {
        if (userId || sessionId) downloadUrl += '&';
        downloadUrl += `addon=${addonName}`;
      }
      
      // Prepare headers with authentication token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header with token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: headers
      });
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to download file';
        setDownloadError(errorMessage);
        showToast(`Download error: ${errorMessage}`, 'error');
        console.error('Download error:', errorMessage);
        return;
      }

      if (data.downloadUrl) {
        // Always route through our proxy to force attachment headers and preserve .zip
        const base = typeof window !== 'undefined' ? window.location.origin : ''
        const proxied = `${base}/api/download/file?userId=${encodeURIComponent(userId || '')}${sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ''}${token ? `&token=${encodeURIComponent(token)}` : ''}`
        window.location.href = proxied
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
  }, [searchParams, isDownloading, user]);

  useEffect(() => {
    // Only start download automatically if user is signed in and we have userId or session_id
    if (!loading && user && (searchParams.get('userId') || searchParams.get('session_id'))) {
      initiateDownload();
    }
  }, [initiateDownload, searchParams, user, loading]);

  // If still loading auth state, show loading
  if (loading) {
    return (
      <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm text-center">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
              <h1 className="text-xl font-semibold text-white">
                Checking authentication status...
              </h1>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // If showing sign-in prompt
  if (showSignInPrompt) {
    return (
      <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-lg">
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
                <Download className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-4">
                Sign in to
                <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Download
                </span>
              </h1>
              <p className="text-zinc-300 leading-relaxed mb-8">
                You need to sign in to download BlenderBin. Creating an account is quick and easy!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={redirectToSignIn}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105"
                >
                  Sign In
                </button>
                <Link 
                  href="/" 
                  className="rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white border border-zinc-700/50 px-8 py-4 font-medium transition-all duration-200 hover:scale-105 text-center"
                >
                  Back to Home
                </Link>
              </div>
              <div className="mt-8 rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-4">
                <p className="text-sm text-zinc-400">
                  By signing in, you'll also get access to your download history and can re-download BlenderBin anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-4xl">
          
          {/* Back to Addons Link */}
          <div className="mb-8">
            <Link 
              href="/addons" 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Add-ons
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            
            {/* Main Download Card */}
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm">
              {downloadError ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white mb-4">
                    Download
                    <span className="block bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
                      Error
                    </span>
                  </h1>
                  <p className="text-red-400 mb-8 leading-relaxed">{downloadError}</p>
                  <button
                    onClick={initiateDownload}
                    className="rounded-full bg-red-600 hover:bg-red-700 text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white mb-4">
                    Thank you for downloading
                    <span className="block bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                      BlenderBin
                    </span>
                  </h1>
                  
                  <div className="space-y-6">
                    {autoDownloaded ? (
                      <p className="text-zinc-300 leading-relaxed">
                        Your download has started automatically. If it doesn't appear in your downloads folder, click the button below.
                      </p>
                    ) : (
                      <p className="text-zinc-300 leading-relaxed">
                        Click the button below to start your download.
                      </p>
                    )}
                    
                    {isDownloading && !autoDownloaded && (
                      <div className="rounded-2xl bg-blue-900/20 border border-blue-800/50 p-4">
                        <p className="text-sm text-blue-300">
                          Download started! Check your downloads folder.
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={initiateDownload}
                      className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 mx-auto"
                    >
                      <FileDown className="w-5 h-5" />
                      {isDownloading ? "Download Again" : "Start Download"}
                    </button>
                  </div>
                  
                  {user && (
                    <div className="mt-8 rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-4">
                      <p className="text-sm text-zinc-400">
                        Welcome, {user?.email}! Thanks for signing in. You can re-download BlenderBin anytime from your account.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Installation Guide Card */}
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-white mb-6">
                Installation
                <span className="block bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                  Guide
                </span>
              </h2>
              
              <div className="space-y-6">
                {[
                  {
                    step: "1",
                    title: "Open Blender Preferences",
                    description: "Go to Edit → Preferences → Add-ons"
                  },
                  {
                    step: "2", 
                    title: "Install Add-on",
                    description: "Click Install in the top right corner"
                  },
                  {
                    step: "3",
                    title: "Select File", 
                    description: "Navigate to BlenderBin.zip and select it"
                  },
                  {
                    step: "4",
                    title: "Enable Add-on",
                    description: 'Check the box next to "Add Mesh: BlenderBin"'
                  },
                  {
                    step: "5",
                    title: "Access Panel",
                    description: "Find BlenderBin in the Sidebar (press N key)"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 border border-blue-600/30">
                      <span className="text-sm font-medium text-blue-300">{item.step}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl bg-blue-900/20 border border-blue-800/50 p-4">
                <p className="text-sm text-blue-300">
                  <strong>Pro Tip:</strong> Quickly access the sidebar by pressing the <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs font-mono">N</kbd> key in the 3D Viewport
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 rounded-2xl border p-4 backdrop-blur-sm shadow-2xl transition-all duration-300 z-50 ${
          toastMessage.type === 'loading' 
            ? 'border-blue-800/50 bg-blue-900/20 text-blue-300' 
            : toastMessage.type === 'success'
            ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-300'
            : 'border-red-800/50 bg-red-900/20 text-red-300'
        }`}>
          <div className="flex items-center gap-3">
            {toastMessage.type === 'loading' && (
              <div className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin"></div>
            )}
            {toastMessage.type === 'success' && (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
            {toastMessage.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm font-medium">{toastMessage.message}</span>
          </div>
        </div>
      )}
      
      {/* Subtle background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
      </div>
    </section>
  );
}