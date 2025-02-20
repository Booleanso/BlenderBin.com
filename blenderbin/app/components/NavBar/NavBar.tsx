'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../lib/firebase-client';
import { User, updateEmail } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import { storage } from '../../lib/firebase-client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { s3Client } from '../../lib/S3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import styles from './NavBar.module.scss';

interface SubscriptionStatus {
  isSubscribed: boolean;
  priceId?: string;
}

const NavBar = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false
  });
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState<string>('');

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

  useEffect(() => {
    const fetchProfilePic = async () => {
      if (user?.email) {
        try {
          const response = await fetch(`/api/profile-picture?email=${encodeURIComponent(user.email)}`);
          if (response.ok) {
            const { url } = await response.json();
            setProfilePicUrl(url);
          }
        } catch (error) {
          console.error('Error fetching profile picture:', error);
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

  const handleEmailUpdate = async () => {
    try {
      if (!user) return;
      
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        setEmailError('Please enter a valid email address');
        return;
      }

      await updateEmail(user, newEmail);
      setEditingEmail(false);
      setEmailError('');
      setNewEmail('');
    } catch (error: any) {
      setEmailError(error.message || 'Failed to update email');
      console.error('Error updating email:', error);
    }
  };

  const scrollToSubscriptions = () => {
    const element = document.getElementById('subscriptions');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleProfilePicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) return;

    try {
      // Create a buffer from the file
      const buffer = await file.arrayBuffer();
      const fileName = `FRONTEND/USERS/PROFILE_PICTURES/${encodeURIComponent(user.email)}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      });

      await s3Client.send(command);

      // Fetch and update the new URL
      const response = await fetch(`/api/profile-picture?email=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const { url } = await response.json();
        setProfilePicUrl(url);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
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
            width={32}
            height={32}
            className={styles.logoImage}
          />
        </Link>

        {/* Main navigation */}
        <div className={styles.navLinks}>
          {/* <Link href="/features" className={styles.navLink}>Features</Link> */}
          {/* <Link href="/pricing" className={styles.navLink}>Pricing</Link> */}
          {/* <Link href="/docs" className={styles.navLink}>Docs</Link> */}
        </div>

        {/* Auth section */}
        <div className={styles.authButtons}>
          {user ? (
            <>
              {/* <span className={styles.userEmail}>{user.email}</span> */}

              {subscriptionStatus.isSubscribed ? (
                <div className={styles.authdiv}>
          
                  <button 
                    onClick={() => setProfileModalOpen(true)} 
                    className={styles.profileButton}
                  >
                    {profilePicUrl ? (
                      <Image
                        src={profilePicUrl}
                        alt="Profile"
                        width={40}
                        height={40}
                      />
                    ) : (
                      <Image
                        src="/default-profile.svg"
                        alt="Default Profile"
                        width={40}
                        height={40}
                      />
                    )}
                  </button>

                  <button onClick={handleRedownload} className={styles.downloadButton}>
                    Re-Download
                  </button>


                </div>
              ) : (
                <div>
                  <button onClick={scrollToSubscriptions} className={styles.downloadButton}>Get Started</button>
                </div>
              )}
              <button onClick={handleLogout} className={styles.downloadButton}>
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
              <h3 className="text-sm font-medium">Profile Picture</h3>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full overflow-hidden">
                  {profilePicUrl ? (
                    <Image
                      src={profilePicUrl}
                      alt="Profile"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <Image
                      src="/default-profile.svg"
                      alt="Default Profile"
                      width={80}
                      height={80}
                    />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicUpload}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Account Information</h3>
              {editingEmail ? (
                <div className="space-y-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email address"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  {emailError && (
                    <p className="text-sm text-red-500">{emailError}</p>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEmailUpdate}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingEmail(false);
                        setEmailError('');
                        setNewEmail('');
                      }}
                      className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Email: {user?.email}</p>
                  <button
                    onClick={() => {
                      setEditingEmail(true);
                      setNewEmail(user?.email || '');
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Edit
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-500">Member since: {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
            </div>
            
            <div className="space-y-2">
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