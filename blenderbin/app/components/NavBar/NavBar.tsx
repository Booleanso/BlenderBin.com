'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../lib/firebase-client';
import { User, updateEmail } from 'firebase/auth';
import Image from 'next/image';
import { FirebaseError } from 'firebase/app';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
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
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false
  });
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState<string>('');
  const [profilePicError, setProfilePicError] = useState(false);

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
          // Instead of fetching a signed URL, we'll use our proxy API route
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

  const handleUnsubscribe = async () => {
    try {
      if (!user?.uid) return;
      
      // Show loading state
      const loadingToast = document.createElement('div');
      loadingToast.className = styles.toast;
      loadingToast.textContent = 'Cancelling subscription...';
      document.body.appendChild(loadingToast);
      
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      // Remove loading toast
      document.body.removeChild(loadingToast);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      // Show success toast
      const successToast = document.createElement('div');
      successToast.className = `${styles.toast} ${styles.successToast}`;
      successToast.textContent = 'Subscription canceled successfully';
      document.body.appendChild(successToast);
      
      // Close the profile modal
      setProfileModalOpen(false);
      
      // Refresh the page after a short delay to allow the user to see the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
      // No need to manually update subscription status or remove the toast
      // since we're refreshing the page
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      
      // Show error toast
      const errorToast = document.createElement('div');
      errorToast.className = `${styles.toast} ${styles.errorToast}`;
      errorToast.textContent = error instanceof Error ? error.message : 'Failed to cancel subscription';
      document.body.appendChild(errorToast);
      
      // Remove error toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 3000);
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
    } catch (error: FirebaseError | unknown) {
      const errorMessage = error instanceof FirebaseError ? error.message : 'Failed to update email';
      setEmailError(errorMessage);
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
      // Show loading toast
      const loadingToast = document.createElement('div');
      loadingToast.className = styles.toast;
      loadingToast.textContent = 'Uploading profile picture...';
      document.body.appendChild(loadingToast);

      // Get the user's ID token for authentication
      const idToken = await user.getIdToken();
      
      // Create form data to send the file
      const formData = new FormData();
      formData.append('file', file);

      // Use the API route to upload the file
      const response = await fetch('/api/profile-picture/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData
      });

      // Remove loading toast
      document.body.removeChild(loadingToast);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }

      const data = await response.json();
      console.log('Upload response:', data);

      // Show success toast
      const successToast = document.createElement('div');
      successToast.className = `${styles.toast} ${styles.successToast}`;
      successToast.textContent = 'Profile picture updated successfully';
      document.body.appendChild(successToast);
      
      // Remove success toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(successToast);
      }, 3000);

      // Reset error state
      setProfilePicError(false);

      // Use our proxy API route for the profile image
      const profileImageUrl = `/api/profile-image/${encodeURIComponent(user.email)}?t=${Date.now()}`; // Add timestamp to bust cache
      console.log('Setting profile picture URL after upload:', profileImageUrl);
      setProfilePicUrl(profileImageUrl);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      
      // Remove any existing loading toast
      const existingLoadingToast = document.querySelector(`.${styles.toast}:not(.${styles.successToast}):not(.${styles.errorToast})`);
      if (existingLoadingToast && existingLoadingToast.parentNode) {
        existingLoadingToast.parentNode.removeChild(existingLoadingToast);
      }
      
      // Show error toast
      const errorToast = document.createElement('div');
      errorToast.className = `${styles.toast} ${styles.errorToast}`;
      errorToast.textContent = error instanceof Error ? error.message : 'Failed to upload profile picture';
      document.body.appendChild(errorToast);
      
      // Remove error toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 3000);

      // Set error state
      setProfilePicError(true);
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
          {/* <Link href="/features" className={styles.navLink}>Features</Link> */}
          {/* <Link href="/pricing" className={styles.navLink}>Pricing</Link> */}
          {/* <Link href="/docs" className={styles.navLink}>Docs</Link> */}
        </div>

        {/* Auth section */}
        <div className={styles.authButtons}>
          {user ? (
            <>
              {/* <span className={styles.userEmail}>{user.email}</span> */}

              <div className={styles.authdiv}>
                <button 
                  onClick={() => setProfileModalOpen(true)} 
                  className={styles.profileButton}
                >
                  {profilePicUrl && !profilePicError ? (
                    <img
                      src={`${profilePicUrl}${profilePicUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`}
                      alt="Profile"
                      width={40}
                      height={40}
                      onError={() => {
                        // Silently handle the error by using the default image
                        setProfilePicError(true);
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

                {subscriptionStatus.isSubscribed && (
                  <button onClick={handleRedownload} className={styles.downloadButton}>
                    Re-Download
                  </button>
                )}
              </div>

              {!subscriptionStatus.isSubscribed && (
                <button onClick={scrollToSubscriptions} className={styles.subscriptionsButton}>See Subscriptions</button>
              )}
              
              <button onClick={handleLogout} className={styles.downloadButton}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" className={styles.loginButton}>Log in</Link>
              <Link href="/auth" className={styles.signupButton}>Sign up</Link>
              <button onClick={scrollToSubscriptions} className={styles.subscriptionsButton}>See Subscriptions</button>
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
                  {profilePicUrl && !profilePicError ? (
                    <Image
                      src={`${profilePicUrl}${profilePicUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`}
                      alt="Profile"
                      width={80}
                      height={80}
                      onError={() => {
                        // Silently handle the error by using the default image
                        setProfilePicError(true);
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
            
            {subscriptionStatus.isSubscribed && (
              <div className="space-y-2">
                {subscriptionStatus.cancelAtPeriodEnd ? (
                  <div className="text-sm text-amber-500 mb-2">
                    Your subscription will cancel on {new Date(subscriptionStatus.currentPeriodEnd || '').toLocaleDateString()}
                  </div>
                ) : subscriptionStatus.status === 'trialing' ? (
                  <>
                    <div className="text-sm text-blue-500 mb-2">
                      You are currently in your free trial period
                      {subscriptionStatus.currentPeriodEnd && (
                        <span className="block mt-1">
                          Trial ends on: {new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleUnsubscribe}
                      className="w-full bg-red-100 hover:bg-red-200 text-red-900 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Cancel Free Trial
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleUnsubscribe}
                    className="w-full bg-red-100 hover:bg-red-200 text-red-900 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Unsubscribe
                  </button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default NavBar;


//in NavBar.tsx, i have a navbar that looks like a cursor navbar, but in BlenderPanel.tsx, there is logic that shows a login or signup, and switches it to logout to be able to logout, and shows the email of th person signed in, and a download button to download a file from s3. this logic is already applied to navbar.tsx but i want to apply another logic for it as well. i want you to apply the modal popup for the profile if the user bought the subscription, and then the unsubscribe functionality, and then bring on the get started functionality with the stripe buy button as well if the user isnt subscribed