import React from 'react';
import { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';

const WaitlistOverlay: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to join waitlist');
      }
      
      setSubmitted(true);
      setEmail('');
    } catch (error) {
      console.error('Error submitting to waitlist:', error);
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm shadow-2xl">
          
          {submitted ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">
                Welcome to the
                <span className="block bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                  Waitlist
                </span>
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-8">
                Thanks for joining our waitlist! We'll notify you as soon as spots become available.
              </p>
              <div className="rounded-2xl bg-emerald-900/20 border border-emerald-800/50 p-4">
                <p className="text-sm text-emerald-300">
                  Keep an eye on your inbox – we'll be in touch soon with early access!
                </p>
              </div>
            </div>
          ) : (
            // Form State
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">
                Join the
                <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Waitlist
                </span>
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-8">
                We're currently in private beta. Join our waitlist to get early access when spots become available.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
                    required
                    disabled={loading}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Joining...
                    </span>
                  ) : (
                    'Join Waitlist'
                  )}
                </button>
              </form>
              
              {error && (
                <div className="mt-6 rounded-2xl bg-red-900/20 border border-red-800/50 p-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              
              <div className="mt-8 rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-4">
                <p className="text-sm text-zinc-400">
                  We'll notify you as soon as we have a spot available. No spam, we promise!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Subtle background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
      </div>
    </div>
  );
};

export default WaitlistOverlay; 