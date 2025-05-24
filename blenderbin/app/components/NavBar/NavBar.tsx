'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../lib/firebase-client';
import { User } from 'firebase/auth';
import Image from 'next/image';
import ProfileModal from '../ProfileModal/ProfileModal';

import styles from './NavBar.module.scss';

const NavBar = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string>('');
  const [profilePicError, setProfilePicError] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Add useEffect for fetching profile picture
  useEffect(() => {
    const fetchProfilePic = async () => {
      if (user?.email) {
        try {
          // Use our proxy API route for the profile image
          const profileImageUrl = `/api/profile-image/${encodeURIComponent(user.email)}`;
          
          // Set the profile picture URL directly
          setProfilePicUrl(profileImageUrl);
          
          // Reset error state
          setProfilePicError(false);
        } catch (error) {
          console.error('Error setting up profile picture:', error);
          setProfilePicError(true);
        }
      }
    };

    fetchProfilePic();
  }, [user?.email]);

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

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <>
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
        </div>

        {/* Auth section */}
        <div className={styles.authButtons}>
          <Link href="/pricing" className={styles.loginButton}>
            Pricing
          </Link>
          
          <Link href="/addons" className={styles.loginButton}>
            Addons
          </Link>
          
          {user ? (
            <div className={styles.authdiv}>
              <button onClick={handleLogout} className={styles.dashboardButton}>
                Logout
              </button>
                
                {/* Profile Picture Button */}
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className={styles.profileButton}
                  title="Profile & Subscriptions"
                >
                  <div className={styles.profilePicContainer}>
                    {profilePicUrl && !profilePicError ? (
                      <img
                        src={`${profilePicUrl}${profilePicUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`}
                        alt="Profile"
                        width={32}
                        height={32}
                        onError={() => {
                          setProfilePicError(true);
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Image
                        src="/default-profile.svg"
                        alt="Default Profile"
                        width={32}
                        height={32}
                      />
                    )}
                  </div>
              </button>
            </div>
          ) : (
            <Link href="/signup" className={styles.signupButton}>Log In</Link>
          )}
        </div>
      </div>
    </nav>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
      />
    </>
  );
};

export default NavBar;


//in NavBar.tsx, i have a navbar that looks like a cursor navbar, but in BlenderPanel.tsx, there is logic that shows a login or signup, and switches it to logout to be able to logout, and shows the email of th person signed in, and a download button to download a file from s3. this logic is already applied to navbar.tsx but i want to apply another logic for it as well. i want you to apply the modal popup for the profile if the user bought the subscription, and then the unsubscribe functionality, and then bring on the get started functionality with the stripe buy button as well if the user isnt subscribed