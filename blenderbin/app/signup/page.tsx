"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { auth } from '../lib/firebase-client';

// Set up Google provider
const googleProvider = new GoogleAuthProvider();
// Add scopes for Google authentication
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Set custom parameters for better redirect handling
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Set persistence to LOCAL (browser)
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase persistence error:", error);
  });

// Separate component to handle search params
function SignupPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Prevent flickering
  const [success, setSuccess] = useState(false);
  const [animating, setAnimating] = useState(false); // Track animation state
  const [formOpacity, setFormOpacity] = useState('opacity-100'); // Control form opacity

  // Debug function
  const debugAuthState = () => {
    console.log("Current auth user:", auth.currentUser?.email || "No user");
    console.log("Component user state:", user?.email || "No user in state");
  };
  
  // Handle mode switch with animation
  const handleAuthModeSwitch = () => {
    // Start animation
    setAnimating(true);
    setFormOpacity('opacity-0 transform scale-95');
    
    // After animation completes, change the mode
    setTimeout(() => {
      setAuthMode(authMode === 'login' ? 'signup' : 'login');
      // Start fade-in animation
      setTimeout(() => {
        setFormOpacity('opacity-100 transform scale-100');
        setAnimating(false);
      }, 50);
    }, 200);
  };

  // Check auth state on load and handle redirect results
  useEffect(() => {
    console.log("Auth useEffect running, checking for redirect and auth state");
    
    let authCheckComplete = false;
    
    // Function to handle redirect result
    const handleRedirectResult = async () => {
      try {
        console.log("Checking for redirect result...");
        // Check if returning from a redirect
        const result = await getRedirectResult(auth);
        console.log("Redirect result:", result ? `User: ${result.user.email}` : "No result");
        
        if (result && result.user) {
          console.log("Google sign-in successful via redirect:", result.user.email);
          
          // Update UI state to reflect signed-in user
          setUser(result.user);
          
          // If user is authenticated via redirect and we have a session ID, send token to Blender addon
          if (sessionId) {
            await sendTokenToAddon(result.user);
          } else {
            // If no session ID, this is a web authentication - redirect to dashboard
            router.push('/dashboard');
          }
        }
        
        // Only set loading to false here if auth check is also complete
        if (authCheckComplete) {
          setLoading(false);
          setHasLoadedOnce(true);
        }
      } catch (error: any) {
        console.error('Error handling redirect result:', error);
        setMessage(`Authentication error: ${error instanceof Error ? error.message : 'Failed to complete sign-in'}`);
        setLoading(false);
        setHasLoadedOnce(true);
      }
    };

    // Check for auth state first (might already be logged in)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser ? currentUser.email : "No user");
      setUser(currentUser);
      
      // If user is authenticated
      if (currentUser) {
        // If session ID exists, we're being opened from Blender addon
        if (sessionId && !success) {
          sendTokenToAddon(currentUser);
        } 
        // If no session ID and not already in the animation state, this is a web login
        else if (!sessionId && !animating) {
          console.log("Web authentication detected, redirecting to dashboard");
          router.push('/dashboard');
        }
      }
      
      authCheckComplete = true;
      // Only set loading to false after both checks are complete
      // or if there's no redirect result to check
      if (!window.location.href.includes("firebase")) {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    });

    // Then check for redirect result (if coming back from OAuth)
    handleRedirectResult();
    
    // Debugging
    setTimeout(debugAuthState, 2000);
    
    return () => {
      unsubscribe();
    };
  }, [sessionId, router, animating, success]);
  
  // Send auth token to Blender addon through our API
  const sendTokenToAddon = async (currentUser: User) => {
    try {
      if (!sessionId) {
        setMessage('Error: No session ID provided');
        return;
      }
      
      console.log("Sending token to addon for user:", currentUser.email);
      const idToken = await currentUser.getIdToken(true); // Force refresh token
      
      // Send to our API endpoint
      const response = await fetch(`/api/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: idToken,
          session_id: sessionId,
          user: {
            uid: currentUser.uid,
            email: currentUser.email
          }
        }),
      });

      if (response.ok) {
        // Success! Token was saved
        console.log("Token successfully sent to addon");
        setSuccess(true);
        setMessage('Successfully authenticated! You can close this window and return to Blender.');
        
        // Close window automatically after 5 seconds
        setTimeout(() => {
          window.close();
        }, 5000);
      } else {
        const data = await response.json();
        console.error("Failed to send token:", data);
        setMessage(`Error: ${data.error || 'Failed to send authentication to Blender'}`);
      }
    } catch (error) {
      console.error('Error sending token to addon:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Handle email/password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    try {
      setLoading(true);
      
      if (authMode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Signed in with email:", userCredential.user.email);
        
        // If no session ID, redirect to dashboard (not from Blender)
        if (!sessionId) {
          router.push('/dashboard');
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Created account with email:", userCredential.user.email);
        
        // If no session ID, redirect to dashboard (not from Blender)
        if (!sessionId) {
          router.push('/dashboard');
        }
      }
      // Auth state change will trigger sendTokenToAddon if sessionId exists
    } catch (error: any) {
      console.error('Error during authentication:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Authentication failed'}`);
      setLoading(false);
      setHasLoadedOnce(true);
    }
  };
  
  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      console.log("Starting Google sign-in with redirect...");
      // Use popup for better experience on development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log("Using popup for local development");
        const result = await signInWithPopup(auth, googleProvider);
        console.log("Google sign-in successful with popup:", result.user.email);
        
        // If session ID exists, send token to Blender addon
        if (sessionId) {
          await sendTokenToAddon(result.user);
        } else {
          // If no session ID, redirect to dashboard
          router.push('/dashboard');
        }
      } else {
        // Use redirect for production (more reliable across browsers)
        await signInWithRedirect(auth, googleProvider);
        // Will return after redirect - handled in useEffect
      }
    } catch (error: any) {
      console.error('Error during Google authentication:', error);
      
      // Show more specific error based on Firebase error code
      if (error.code === 'auth/unauthorized-domain') {
        setMessage('This domain is not authorized for OAuth operations. Contact the administrator.');
      } else {
        setMessage(`Error: ${error instanceof Error ? error.message : 'Google authentication failed'}`);
      }
      
      setLoading(false);
      setHasLoadedOnce(true);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      console.log("Signing out...");
      await signOut(auth);
      setMessage('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Logout failed'}`);
    }
  };

  // For debugging - add a button to the logged-in state to check auth status
  const checkAuthStatus = () => {
    debugAuthState();
    setMessage(`Current auth: ${auth.currentUser?.email || "None"}`);
  };
  
  // Create a stable loading ID to prevent re-renders
  const [loadingId] = useState(() => Math.random().toString(36).substring(7));
  
  // Display loading spinner only if we're loading and haven't finished at least one load cycle
  if (loading && !hasLoadedOnce) {
    return (
      <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm">
              <div className="text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-white mb-6">
                  BlenderBin
                  <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Authentication
                  </span>
                </h1>
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-zinc-300">Authenticating...</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  
  // Display success message
  if (success) {
    return (
      <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <svg 
                  className="w-8 h-8 text-emerald-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-4">
                Authentication
                <span className="block bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                  Successful
                </span>
              </h1>
              <p className="text-zinc-300 mb-6">
                You are now logged in as {user?.email}
              </p>
              <div className="rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-4">
                <p className="text-sm text-zinc-400">
                  You can close this window and return to Blender.
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  This window will close automatically in a few seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  
  // Display already logged in screen
  if (user) {
    return (
      <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-4">
                Already
                <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Signed In
                </span>
              </h1>
              <p className="text-zinc-300 mb-8">
                You are logged in as {user.email}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 py-3 px-6 font-medium transition-all duration-200 hover:scale-105"
                >
                  Sign Out
                </button>
                <button
                  onClick={checkAuthStatus}
                  className="w-full rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 border border-zinc-700/50 py-2 px-4 text-sm font-medium transition-all duration-200 hover:scale-105"
                >
                  Debug Auth
                </button>
              </div>
              {message && (
                <div className="mt-6 rounded-2xl bg-red-900/20 border border-red-800/50 p-4">
                  <p className="text-sm text-red-400">{message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }
  
  // Display login/signup form
  return (
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm">
            
            {/* Header */}
            <div className={`text-center mb-8 transition-all duration-300 ease-in-out ${formOpacity}`}>
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
                {authMode === 'login' ? (
                  <>
                    Welcome to
                    <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                      BlenderBin
                    </span>
                  </>
                ) : (
                  <>
                    Join
                    <span className="block bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                      BlenderBin
                    </span>
                  </>
                )}
              </h1>
              <p className="text-zinc-300 leading-relaxed">
                {authMode === 'login' 
                  ? 'Sign in to access your Blender add-ons and AI tools' 
                  : 'Create an account to unlock professional Blender workflows'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailLogin} className={`space-y-6 transition-all duration-300 ease-in-out ${formOpacity}`}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="Enter your email"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                disabled={loading || animating}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  authMode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>
            
            {/* Divider */}
            <div className={`relative my-8 transition-all duration-300 ease-in-out ${formOpacity}`}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700/50"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-zinc-900/20 px-4 text-sm text-zinc-400">Or continue with</span>
              </div>
            </div>
            
            {/* Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              disabled={animating}
              className={`w-full flex items-center justify-center rounded-full border border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 py-3 px-6 font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${formOpacity}`}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
            
            {/* Mode Switch */}
            <div className={`text-center mt-6 transition-all duration-300 ease-in-out ${formOpacity}`}>
              <button
                onClick={handleAuthModeSwitch}
                disabled={animating}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
              >
                {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
            
            {/* Error Message */}
            {message && (
              <div className={`mt-6 rounded-2xl bg-red-900/20 border border-red-800/50 p-4 transition-all duration-300 ease-in-out ${formOpacity}`}>
                <div className="flex items-start">
                  <svg className="mr-2 h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-red-400">{message}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Subtle background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
      </div>
    </section>
  );
}

// Loading fallback component
function SignupPageFallback() {
  return (
    <section className="relative min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 backdrop-blur-sm">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-6">
                BlenderBin
                <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Authentication
                </span>
              </h1>
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-zinc-300">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Main component with Suspense boundary
export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}