'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../lib/firebase-client';
import { User } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import styles from '../css/NavBar.module.scss';

interface SubscriptionStatus {
  isSubscribed: boolean;
  priceId?: string;
}

const NavBar = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
      if (!user?.uid) return;
      
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

      if (!response.ok) throw new Error('Checkout failed');
      
      const { sessionId } = await response.json();
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('Failed to load Stripe');
      
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Checkout error:', error);
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

      if (!response.ok) throw new Error('Failed to cancel subscription');

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

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* Logo and brand */}
        <Link href="/" className={styles.logoContainer}>
          <span className={styles.logo}>BlenderBin</span>
        </Link>

        {/* Main navigation */}
        <div className={styles.navLinks}>
          <Link href="/features" className={styles.navLink}>Features</Link>
          <Link href="/pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/docs" className={styles.navLink}>Docs</Link>
        </div>

        {/* Auth section */}
        <div className={styles.authButtons}>
          {user ? (
            <>
              <span className={styles.userEmail}>{user.email}</span>

              {subscriptionStatus.isSubscribed ? (
                <div>
                  <button onClick={handleRedownload} className={styles.downloadButton}>
                    Re-Download
                  </button>
                  <button onClick={() => setProfileModalOpen(true)} className="navbar-button">Profile</button>

                </div>

              ) : (
                <div>
                  <button onClick={() => setModalOpen(true)} className="navbar-button">Get Started</button>
                </div>
                
                
              )}
              <button onClick={handleLogout} className={styles.logoutButton}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" className={styles.loginButton}>Log in</Link>
              <Link href="/auth" className={styles.signupButton}>Sign up</Link>
            </>
          )}
        </div>
      </div>

      {/* Get Started Modal */}
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

      {/* Profile Modal */}
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
              <p className="text-sm text-gray-500">Email: {user?.email}</p>
              <p className="text-sm text-gray-500">Member since: {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
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
    </nav>
  );
};

export default NavBar;


//in NavBar.tsx, i have a navbar that looks like a cursor navbar, but in BlenderPanel.tsx, there is logic that shows a login or signup, and switches it to logout to be able to logout, and shows the email of th person signed in, and a download button to download a file from s3. this logic is already applied to navbar.tsx but i want to apply another logic for it as well. i want you to apply the modal popup for the profile if the user bought the subscription, and then the unsubscribe functionality, and then bring on the get started functionality with the stripe buy button as well if the user isnt subscribed