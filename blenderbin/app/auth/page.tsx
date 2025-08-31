"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase-client';

// Set up Google provider
const googleProvider = new GoogleAuthProvider();

// Separate component to handle search params
function AuthPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const redirectUri = searchParams.get('redirect_uri');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [deeplinkUrl, setDeeplinkUrl] = useState<string | null>(null);
  const [needsUserAction, setNeedsUserAction] = useState(false);
  
  // Check auth state on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // If user is logged in and a redirect_uri was provided, prefer redirect with id_token
      if (currentUser && redirectUri) {
        redirectWithIdToken(currentUser);
        return;
      }
      // Otherwise, fall back to legacy session-based callback flow
      if (currentUser && sessionId) {
        sendTokenToAddon(currentUser);
      }
    });
    
    return () => unsubscribe();
  }, [sessionId, redirectUri]);
  
  // Send auth token to Blender addon through our API
  const sendTokenToAddon = async (currentUser: User) => {
    try {
      if (!sessionId) {
        setMessage('Error: No session ID provided');
        return;
      }
      
      const idToken = await currentUser.getIdToken();
      
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
        setSuccess(true);
        setMessage('Successfully authenticated! You can close this window and return to Blender.');
        
        // Close window automatically after 5 seconds
        setTimeout(() => {
          window.close();
        }, 5000);
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.error || 'Failed to send authentication to Blender'}`);
      }
    } catch (error) {
      console.error('Error sending token to addon:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Redirect the browser to the provided redirect_uri with the Firebase ID token appended
  const redirectWithIdToken = async (currentUser: User) => {
    try {
      if (!redirectUri) return;
      const idToken = await currentUser.getIdToken(true);
      const target = new URL(redirectUri);
      target.searchParams.set('id_token', idToken);
      // If target is http/https, we can safely auto-redirect. For custom schemes (e.g., blenderbin://),
      // Safari requires a user gesture to navigate. In that case, show a button for the user to click.
      if (target.protocol === 'http:' || target.protocol === 'https:') {
        window.location.assign(target.toString());
      } else {
        setDeeplinkUrl(target.toString());
        setNeedsUserAction(true);
        setMessage('Tap the button below to open Blender and complete sign-in.');
      }
    } catch (error) {
      console.error('Failed to redirect with id_token:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Redirect failed'}`);
    }
  };
  
  // Handle email/password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    try {
      setLoading(true);
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // After sign-in, prefer redirect flow if redirect_uri is present
      if (auth.currentUser && redirectUri) {
        await redirectWithIdToken(auth.currentUser);
        return;
      }
      // Otherwise auth state change will trigger legacy flow
    } catch (error) {
      console.error('Error during authentication:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Authentication failed'}`);
      setLoading(false);
    }
  };
  
  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setMessage('');
      await signInWithPopup(auth, googleProvider);
      // After sign-in, prefer redirect flow if redirect_uri is present
      if (auth.currentUser && redirectUri) {
        await redirectWithIdToken(auth.currentUser);
        return;
      }
      // Otherwise auth state change will trigger legacy flow
    } catch (error) {
      console.error('Error during Google authentication:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Google authentication failed'}`);
      setLoading(false);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessage('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Logout failed'}`);
    }
  };
  
  // Display appropriate UI based on authentication state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Loading...</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-4">
            <svg 
              className="mx-auto h-12 w-12 text-green-500" 
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
          <h1 className="text-2xl font-bold mb-4 text-center">Authentication Successful!</h1>
          <p className="text-center text-gray-600 mb-4">
            You are now logged in as {user?.email}
          </p>
          <p className="text-center text-gray-600">
            You can close this window and return to Blender.
          </p>
          <p className="text-center text-gray-400 text-sm mt-4">
            This window will close automatically in a few seconds.
          </p>
        </div>
      </div>
    );
  }

  // If we have a custom-scheme deeplink that needs a user gesture, prompt the user to click
  if (user && deeplinkUrl && needsUserAction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Open in Blender</h1>
          <p className="text-gray-600 mb-6">You're signed in. To finish connecting, open Blender.</p>
          <button
            onClick={() => { if (deeplinkUrl) window.location.href = deeplinkUrl; }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
          >
            Open in Blender
          </button>
          {message && (
            <p className="mt-4 text-center text-gray-500">{message}</p>
          )}
        </div>
      </div>
    );
  }
  
  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Already Logged In</h1>
          <p className="text-center text-gray-600 mb-4">
            You are logged in as {user.email}
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
            >
              Sign Out
            </button>
          </div>
          {message && (
            <p className="mt-4 text-center text-red-500">{message}</p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {authMode === 'login' ? 'Sign In to BlenderBin' : 'Create Account'}
        </h1>
        
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              <div className="flex items-center justify-center">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                Google
              </div>
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="text-blue-500 hover:text-blue-700"
          >
            {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
        
        {message && (
          <p className="mt-4 text-center text-red-500">{message}</p>
        )}
      </div>
    </div>
  );
}

// Loading fallback component
function AuthPageFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Loading...</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
} 