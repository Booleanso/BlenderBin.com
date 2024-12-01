'use client';

import { useState, FormEvent, Suspense } from 'react';
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
  setIsSignUp, 
  isLoading, 
  error, 
  formData, 
  handleInputChange 
}: AuthFormProps): JSX.Element {
  const searchParams = useSearchParams();
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await onSubmit(searchParams.get('from') ?? '/');
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Email address"
            value={formData.email}
            onChange={handleInputChange}
            aria-label="Email address"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            aria-label="Password"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4" role="alert">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </div>

      <div className="text-sm text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          {isSignUp 
            ? 'Already have an account? Sign in' 
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </form>
  );
}

export default function AuthPage(): JSX.Element {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create an account' : 'Sign in to your account'}
          </h2>
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