'use client';

import React, { useState, FormEvent, Suspense } from 'react';
import { auth } from '../lib/firebase-client';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';

interface FormData {
  email: string;
  password: string;
}

interface AuthFormProps {
  onSubmit: (redirectPath: string) => Promise<void>;
  isSignUp: boolean;
  setIsSignUp: (value: boolean) => void;
  isLoading: boolean;
  error: string;
  formData: FormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function AuthForm({ 
  onSubmit, 
  isSignUp,
  isLoading, 
  error, 
  formData, 
  handleInputChange 
}: AuthFormProps): React.ReactElement {
  const searchParams = useSearchParams();
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await onSubmit(searchParams.get('from') ?? '/');
  };

  return (
    <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-white mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
            placeholder="m@example.com"
            value={formData.email}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-white mb-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-white text-black rounded-md font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
      </button>

      {/* Commenting out social login buttons for now
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-black text-gray-500">Or</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className="w-full py-2 px-4 border border-gray-700 rounded-md flex items-center justify-center space-x-2 text-white hover:bg-gray-900"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          <span>Continue with Apple</span>
        </button>

        <button
          type="button"
          className="w-full py-2 px-4 border border-gray-700 rounded-md flex items-center justify-center space-x-2 text-white hover:bg-gray-900"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
      */}

      <p className="text-xs text-center text-gray-500">
        By clicking continue, you agree to our{' '}
        <a href="#" className="underline">Terms of Service</a> and{' '}
        <a href="#" className="underline">Privacy Policy</a>
      </p>
    </form>
  );
}

export default function AuthPage(): React.ReactElement {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFormSubmit = async (redirectTo: string): Promise<void> => {
    setError('');
    setIsLoading(true);

    try {
      const { email, password } = formData;
      const authFunction = isSignUp ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      const userCredential = await authFunction(auth, email, password);

      const idToken = await userCredential.user.getIdToken();

      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      setFormData({ email: '', password: '' });
      router.push(redirectTo);
      router.refresh();

    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (authError.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else if (authError.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          {/* <div className="mb-6">
            <svg className="mx-auto h-12 w-12" viewBox="0 0 24 24" fill="white">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div> */}
          <h2 className="text-2xl font-bold">Welcome to BlenderBin.</h2>
          <p className="mt-2 text-sm text-gray-500">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="text-white underline"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Do not have an account?{' '}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="text-white underline"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <AuthForm 
            onSubmit={handleFormSubmit}
            isSignUp={isSignUp}
            setIsSignUp={setIsSignUp}
            isLoading={isLoading}
            error={error}
            formData={formData}
            handleInputChange={handleInputChange}
          />
        </Suspense>
      </div>
    </div>
  );
}