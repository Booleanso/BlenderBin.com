"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
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
  setPersistence,
  inMemoryPersistence
} from 'firebase/auth';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDIuu33lWChgE_oTteuAuywPrJwBFiRavM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "marv-studio-points-plugin.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://marv-studio-points-plugin-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "marv-studio-points-plugin",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "marv-studio-points-plugin.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "441089628814",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:441089628814:web:4b4bc410399ae288bd47df",
};

// Initialize Firebase - prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
// Set persistence to LOCAL (browser)
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase persistence error:", error);
  });

// Set up Google provider
const googleProvider = new GoogleAuthProvider();
// Add scopes for Google authentication
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Set custom parameters for better redirect handling
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Use client ID from environment variable if available
  ...(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? { client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID } : {})
});

export default function SignupPage() {
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
      <div key={`loading-${loadingId}`} className="flex min-h-screen items-center justify-center bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-black text-white">
        <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Gizmo AI</h1>
            <div className="mt-6 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500"></div>
            </div>
            <p className="mt-4 text-sm text-zinc-400">Authenticating...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Display success message
  if (success) {
  return (
      <div className="flex min-h-screen items-center justify-center bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-black text-white">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 shadow-xl backdrop-blur-sm">
        <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <svg 
                className="h-8 w-8 text-green-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M5 13l4 4L19 7"
                />
            </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Authentication Successful</h1>
            <p className="mt-2 text-zinc-400">
              You are now logged in as {user?.email}
            </p>
            <div className="mt-6 text-sm text-zinc-500">
              You can close this window and return to Blender.
              <p className="mt-1 text-zinc-600">This window will close automatically in a few seconds.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Display already logged in screen
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-black text-white">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 shadow-xl backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Already Signed In</h1>
            <p className="mt-2 text-zinc-400">
              You are logged in as {user.email}
            </p>
            <div className="flex flex-col gap-2 mt-6">
                <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-md border border-red-800 bg-red-950/30 px-5 py-2.5 text-sm font-medium text-red-400 shadow-sm transition-colors hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-black"
                >
                Sign Out
                </button>
              
                <button
                onClick={checkAuthStatus}
                className="mt-2 inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/50 px-5 py-2 text-xs font-medium text-zinc-400 shadow-sm transition-colors hover:bg-zinc-700/40"
                >
                Debug Auth
                </button>
            </div>
            {message && (
              <div className="mt-4 text-sm text-red-400">{message}</div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Display login/signup form
  return (
    <div key={`form-${authMode}`} className="flex min-h-screen items-center justify-center bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-black px-4 py-12 text-white">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 shadow-xl backdrop-blur-sm">
        <div className={`text-center transition-all duration-300 ease-in-out ${formOpacity}`}>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            {authMode === 'login' ? 'Sign In to Gizmo AI' : 'Create Account'}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {authMode === 'login' 
              ? 'Sign in to continue using Gizmo AI in Blender' 
              : 'Create an account to use Gizmo AI in Blender'}
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className={`mt-8 space-y-6 transition-all duration-300 ease-in-out ${formOpacity}`}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50"
            disabled={loading || animating}
          >
            {loading ? (
              <span className="flex items-center">
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
        
        <div className={`relative my-6 transition-all duration-300 ease-in-out ${formOpacity}`}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-900 px-2 text-zinc-400">Or continue with</span>
          </div>
        </div>
        
        <button
          onClick={handleGoogleLogin}
          disabled={animating}
          className={`flex w-full items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 shadow-sm transition-all duration-300 ease-in-out hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 ${formOpacity}`}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
        
        <div className={`mt-4 text-center text-sm transition-all duration-300 ease-in-out ${formOpacity}`}>
          <button
            onClick={handleAuthModeSwitch}
            disabled={animating}
            className="text-blue-400 hover:text-blue-300 hover:underline disabled:opacity-50"
          >
            {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
        
        {message && (
          <div className={`mt-4 rounded-md bg-red-900/20 p-3 text-sm text-red-400 transition-all duration-300 ease-in-out ${formOpacity}`}>
            <div className="flex">
              <svg className="mr-2 h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}