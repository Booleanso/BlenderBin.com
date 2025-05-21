'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../lib/firebase-client';
import { User } from 'firebase/auth';
import Image from 'next/image';

import styles from './NavBar.module.scss';

interface SubscriptionStatus {
  isSubscribed: boolean;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  status?: string;
}

const NavBar = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
          <Image
            src="/blenderbinlogo.png"
            alt="BlenderBin Logo"
            width={28}
            height={28}
            className={styles.logoImage}
          />
        </Link>

        {/* Main navigation */}
        <div className={styles.navLinks}>
          {/* Remove pricing link from main nav */}
        </div>

        {/* Auth section */}
        <div className={styles.authButtons}>
          {user ? (
            <div className={styles.authdiv}>
              {/* Show Dashboard button for any authenticated user */}
              <Link href="/dashboard" className={styles.dashboardButton}>
                Dashboard
              </Link>

              {subscriptionStatus.isSubscribed && (
                <button onClick={handleRedownload} className={styles.dashboardButton}>
                  Re-Download
                </button>
              )}
              
              {/* Add Gizmo Pricing button for authenticated users too */}
              <Link href="/pricing" className={styles.subscriptionsButton}>
                Gizmo Pricing
              </Link>
              
              <button onClick={handleLogout} className={styles.dashboardButton}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link href="/signup" className={styles.loginButton}>Log in</Link>
              <Link href="/signup" className={styles.signupButton}>Sign up</Link>
              <Link href="/pricing" className={styles.subscriptionsButton}>Gizmo Pricing</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;


//in NavBar.tsx, i have a navbar that looks like a cursor navbar, but in BlenderPanel.tsx, there is logic that shows a login or signup, and switches it to logout to be able to logout, and shows the email of th person signed in, and a download button to download a file from s3. this logic is already applied to navbar.tsx but i want to apply another logic for it as well. i want you to apply the modal popup for the profile if the user bought the subscription, and then the unsubscribe functionality, and then bring on the get started functionality with the stripe buy button as well if the user isnt subscribed