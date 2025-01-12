'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '../lib/firebase-client';
import { User } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import '../css/navbar.css';

interface SubscriptionStatus {
  isSubscribed: boolean;
  priceId?: string;
}

export default function NavBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        try {
          const response = await fetch(`/api/subscription/status?userId=${user.uid}`);
          if (!response.ok) {
            throw new Error('Failed to fetch subscription status');
          }
          const data = await response.json();
          setSubscriptionStatus(data);
        } catch (error) {
          console.error('Error fetching subscription status:', error);
        }
      } else {
        setSubscriptionStatus({ isSubscribed: false });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      await fetch('/api/auth/session', { method: 'DELETE' });
      router.refresh();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCheckout = async () => {
    try {
      if (!user?.uid) {
        console.error('No user ID found');
        return;
      }
  
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (!data.sessionId) {
        throw new Error('No session ID returned');
      }
  
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }
  
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });
  
      if (error) {
        console.error('Stripe redirect error:', error);
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  const handleRedownload = async () => {
    try {
      const response = await fetch(`/api/download?userId=${user?.uid}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Download error:', data.error);
        return;
      }

      if (data.downloadUrl) {
        window.location.href = data.downloadUrl;
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      if (!user?.uid) return;
      
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // Refresh subscription status
      const statusResponse = await fetch(`/api/subscription/status?userId=${user.uid}`);
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setSubscriptionStatus(data);
      }

      setProfileModalOpen(false);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  if (loading) {
    return <div className="navbar-loading">Loading...</div>;
  }

  const navLinks = [
    { href: '/', text: 'Home' },
    { href: '/features', text: 'Features' },
    { href: '/pricing', text: 'Pricing' },
    { href: '/tutorials', text: 'Tutorials' },
    { href: '/influencers', text: 'Influencers' },
    { href: '/faq', text: 'FAQ' },
    { href: '/library', text: 'Addon Library' },
  ];

  return (
    <>
      <div className="navbar-spacer"></div>
      
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-content">
            <div className="navbar-left">
              <Link href="/" className="navbar-logo">
                <Image 
                  src="/logo.png"
                  alt="BlenderBin Logo"
                  width={150}
                  height={40}
                  priority
                />
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="navbar-link"
                >
                  {link.text}
                </Link>
              ))}
            </div>
          </div>
        </div>
        
        <div className="navbar-right">
          {user ? (
            <>
              <span className="navbar-email">{user.email}</span>
              {subscriptionStatus.isSubscribed ? (
                <>
                  <button
                    onClick={handleRedownload}
                    className="navbar-button navbar-button-green"
                  >
                    Re-download
                  </button>
                  <button
                    onClick={() => setProfileModalOpen(true)}
                    className="navbar-button navbar-button-purple"
                  >
                    Profile
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="navbar-button navbar-button-blue"
                >
                  Get Started
                </button>
              )}
              <button
                onClick={handleLogout}
                className="navbar-button navbar-button-red"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="navbar-button navbar-button-indigo"
            >
              Sign In / Sign Up
            </Link>
          )}
        </div>
      </nav>

      {/* Subscription Modal */}
      {user && !subscriptionStatus.isSubscribed && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Subscribe to Our Product</DialogTitle>
              <DialogDescription>
                Get access to our premium boilerplate and start building amazing applications today!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                <h3 className="font-medium text-gray-900">What is included:</h3>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li>Complete Next.js 14 boilerplate with App Router</li>
                  <li>Firebase Authentication integration</li>
                  <li>Stripe subscription setup</li>
                  <li>Tailwind CSS and shadcn/ui components</li>
                  <li>TypeScript configuration</li>
                  <li>Free updates and support</li>
                </ul>
              </div>
              <div className="text-lg font-semibold">
                Price: $49.99/one-time
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  handleCheckout();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Purchase Now
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Profile Modal */}
      {user && subscriptionStatus.isSubscribed && (
        <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Profile Settings</DialogTitle>
              <DialogDescription>
                Manage your account settings and subscription
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Account Information</h3>
                <p className="text-sm text-gray-500">Email: {user.email}</p>
                <p className="text-sm text-gray-500">Member since: {new Date(user.metadata.creationTime!).toLocaleDateString()}</p>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/settings/profile')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Edit Profile Settings
                </button>
                
                <button
                  onClick={handleUnsubscribe}
                  className="w-full bg-red-100 hover:bg-red-200 text-red-900 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Unsubscribe
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}