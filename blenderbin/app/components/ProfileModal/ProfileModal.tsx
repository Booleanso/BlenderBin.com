'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Settings, CreditCard, Download, User, Box, Bot } from 'lucide-react';
import { auth, db } from '../../lib/firebase-client';
import { updateEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import Image from 'next/image';
import { FirebaseError } from 'firebase/app';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>({
    isSubscribed: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: '',
    status: ''
  });
  
  // Gizmo subscription removed
  
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  
  // Add separate billing loading states
  const [isBlenderBinBillingLoading, setIsBlenderBinBillingLoading] = useState(false);
  // Removed Gizmo billing state
  
  // Add states for profile management
  const [profilePicUrl, setProfilePicUrl] = useState<string>('');
  const [profilePicError, setProfilePicError] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Saving state
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle modal animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Trigger animation after render
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Hide modal after animation completes
      setTimeout(() => setShouldRender(false), 200);
    }
  }, [isOpen]);

  // Close modal with animation
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Add functions for profile management
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
      
      // Show success message
      setSaveMessage('Email updated successfully');
      setSaveError(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    } catch (error: any) {
      const errorMessage = error instanceof FirebaseError ? error.message : 'Failed to update email';
      setEmailError(errorMessage);
      console.error('Error updating email:', error);
    }
  };
  
  const handleProfilePicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) return;

    try {
      setSaveMessage('Uploading profile picture...');
      setSaveError(false);

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }

      const data = await response.json();
      console.log('Upload response:', data);

      // Show success message
      setSaveMessage('Profile picture updated successfully');
      setSaveError(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);

      // Reset error state
      setProfilePicError(false);

      // Use our proxy API route for the profile image
      const profileImageUrl = `/api/profile-image/${encodeURIComponent(user.email)}?t=${Date.now()}`; // Add timestamp to bust cache
      console.log('Setting profile picture URL after upload:', profileImageUrl);
      setProfilePicUrl(profileImageUrl);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      
      // Show error message
      setSaveMessage(error instanceof Error ? error.message : 'Failed to upload profile picture');
      setSaveError(true);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);

      // Set error state
      setProfilePicError(true);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    
    try {
      setIsDeleting(true);
      setDeleteError('');
      
      // Re-authenticate user before deleting account
      const credential = EmailAuthProvider.credential(
        user.email || '',
        password
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Delete the user
      await deleteUser(user);
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      setDeleteError('Failed to delete account. Please make sure your password is correct.');
      console.error('Error deleting account:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleUnsubscribe = async () => {
    try {
      if (!user?.uid) return;
      
      setSaveMessage('Cancelling subscription...');
      setSaveError(false);
      
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      setSaveMessage('Subscription canceled successfully');
      setSaveError(false);
      
      // Refresh subscription data
      setTimeout(() => {
        fetchSubscriptionData();
      }, 1500);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      
      setSaveMessage(error instanceof Error ? error.message : 'Failed to cancel subscription');
      setSaveError(true);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    }
  };

  // Removed Gizmo unsubscribe handler

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

  const fetchSubscriptionData = async () => {
    if (user) {
      try {
        console.log('Fetching subscription data for user:', user.uid);
        
        // Fetch subscription information
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        // Set BlenderBin subscription data
        if (userData && userData.stripeRole) {
          setSubscription(userData.stripeRole);
        }
        
        // Gizmo subscription data removed
        
        // Fetch BlenderBin subscription status details with retry logic
        let statusData = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts && !statusData) {
          try {
            console.log(`Fetching BlenderBin subscription status, attempt ${attempts + 1}`);
            const response = await fetch(`/api/subscription/status?userId=${user.uid}&_t=${Date.now()}`);
            
            if (response.ok) {
              statusData = await response.json();
              console.log('BlenderBin subscription status:', statusData);
              setSubscriptionStatus(statusData);
              break;
            } else {
              console.error('Failed to fetch BlenderBin subscription status, status:', response.status);
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
              }
            }
          } catch (error) {
            console.error('Error fetching BlenderBin subscription status:', error);
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        }
        
        // If we failed to get status data, set default
        if (!statusData) {
          console.log('Setting default subscription status after failed attempts');
          setSubscriptionStatus({
            isSubscribed: false,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: '',
            status: 'none',
            isTrialing: false,
            trialDaysRemaining: null
          });
        }
        
        // Gizmo status fetch removed
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchSubscriptionData();
    }
  }, [isOpen, user]);

  // Add billing portal handlers for each product
  const handleBlenderBinBillingPortal = async () => {
    try {
      setIsBlenderBinBillingLoading(true);
      
      // Get auth token
      const token = await user.getIdToken();
      
      // Call our BlenderBin-specific billing portal API
      const response = await axios.post('/api/create-billing-portal/blenderbin', 
        {
          returnUrl: window.location.href
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        // If we created a new customer
        if (response.data.newCustomer) {
          console.log('Created new BlenderBin Stripe customer');
        }
        
        // Open the Stripe Billing Portal in a new tab
        window.open(response.data.url, '_blank');
      } else if (response.data.redirectUrl) {
        // If there's no Stripe customer yet, redirect to upgrade page
        router.push(response.data.redirectUrl);
      }
    } catch (error) {
      console.error('Error opening BlenderBin billing portal:', error);
      
      // Show error message to user
      alert('Failed to open BlenderBin billing portal. Please try again later.');
    } finally {
      setIsBlenderBinBillingLoading(false);
    }
  };

  // Gizmo billing portal handler removed

  // Manual refresh function for subscription data
  const handleRefreshSubscriptionData = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      console.log('Manual subscription refresh triggered from ProfileModal');
      await fetchSubscriptionData();
    } catch (error) {
      console.error('Error in manual subscription refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Debug function to get detailed subscription information
  const handleDebugSubscription = async () => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/subscription/debug?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data);
        setShowDebugInfo(true);
      } else {
        const errorData = await response.json();
        console.error('Debug API error:', errorData);
        setSaveMessage('Failed to fetch debug information: ' + (errorData.error || 'Unknown error'));
        setSaveError(true);
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error fetching debug info:', error);
      setSaveMessage('Error fetching debug information');
      setSaveError(true);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Force sync function to manually sync subscription data from Stripe
  const handleForceSync = async () => {
    if (!user) return;
    
    try {
      setSaveMessage('Syncing subscription data from Stripe...');
      setSaveError(false);
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/subscription/force-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.uid })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Force sync result:', data);
        
        if (data.syncedSubscriptions > 0) {
          setSaveMessage(`Successfully synced ${data.syncedSubscriptions} subscription(s) from Stripe!`);
          setSaveError(false);
          
          // Refresh subscription data after successful sync
          setTimeout(async () => {
            await fetchSubscriptionData();
          }, 1500);
        } else {
          setSaveMessage('No missing subscriptions found to sync.');
          setSaveError(false);
        }
      } else {
        const errorData = await response.json();
        console.error('Force sync error:', errorData);
        setSaveMessage('Sync failed: ' + (errorData.error || 'Unknown error'));
        setSaveError(true);
      }
      
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('Error in force sync:', error);
      setSaveMessage('Error syncing subscription data');
      setSaveError(true);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        .animate-modal-in {
          animation: modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
      
      <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`rounded-2xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto transition-all duration-200 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          
          {/* Compact Header with Profile */}
          <div className="p-6 border-b border-zinc-800/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Profile</h2>
              <button
                onClick={handleClose}
                className="rounded-full p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Inline Profile Info */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-800/50 bg-zinc-800/20">
                  {profilePicUrl && !profilePicError ? (
                    <img
                      src={`${profilePicUrl}${profilePicUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`}
                      alt="Profile"
                      width={64}
                      height={64}
                      onError={() => {
                        setProfilePicError(true);
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Image
                      src="/default-profile.svg"
                      alt="Default Profile"
                      width={64}
                      height={64}
                    />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-blue-600 hover:bg-blue-700 text-white p-1.5 transition-all duration-200 hover:scale-105">
                  <Settings className="h-3 w-3" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{user?.displayName || 'User'}</div>
                <div className="flex items-center justify-between">
                  {editingEmail ? (
                    <div className="flex-1 space-y-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full px-3 py-1.5 text-sm border border-zinc-700/50 bg-zinc-800/50 rounded-lg text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                      {emailError && (
                        <p className="text-xs text-red-400">{emailError}</p>
                      )}
                      <div className="flex space-x-2">
                        <button
                          onClick={handleEmailUpdate}
                          className="text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingEmail(false);
                            setEmailError('');
                            setNewEmail('');
                          }}
                          className="text-xs rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-2 py-1 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-zinc-400 truncate">{user?.email}</div>
                      <button
                        onClick={() => {
                          setEditingEmail(true);
                          setNewEmail(user?.email || '');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 ml-2 flex-shrink-0"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            
            {/* Subscriptions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Subscriptions</h3>
                <div className="flex gap-1">
                  <button
                    onClick={handleRefreshSubscriptionData}
                    disabled={refreshing}
                    className="rounded-md px-2 py-1 text-xs bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    {refreshing ? '⟳' : '↻'}
                  </button>
                  <button
                    onClick={handleDebugSubscription}
                    className="rounded-md px-2 py-1 text-xs bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 transition-colors"
                    title="Debug"
                  >
                    🐛
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* BlenderBin Row */}
                <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                        <Box className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium">BlenderBin</div>
                        <div className="text-xs text-zinc-400">Blender Add-ons</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">
                          {subscriptionStatus?.isTrialing ? 'Trial' : subscription || 'Free'}
                        </span>
                        {subscriptionStatus?.isTrialing && (
                          <span className="text-xs text-blue-400">
                            {subscriptionStatus?.trialDaysRemaining}d left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {subscriptionStatus?.isSubscribed ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleBlenderBinBillingPortal}
                        disabled={isBlenderBinBillingLoading}
                        className="flex-1 rounded-lg py-2 px-3 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                      >
                        {isBlenderBinBillingLoading ? 'Loading...' : 'Manage'}
                      </button>
                      <button
                        onClick={handleRedownload}
                        className="flex-1 rounded-lg py-2 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Download
                      </button>
                      {subscriptionStatus?.status === 'trialing' && (
                        <button
                          onClick={handleUnsubscribe}
                          className="rounded-lg py-2 px-3 text-xs font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Link 
                        href="/pricing/blenderbin"
                        className="block w-full text-center rounded-lg py-2 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Subscribe
                      </Link>
                    </div>
                  )}
                </div>

                {/* Gizmo Row removed */}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
              <div className="space-y-2">
                <button
                  onClick={handleForceSync}
                  className="w-full text-left rounded-lg p-3 bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="text-white text-sm font-medium">Sync Subscriptions</div>
                  <div className="text-zinc-400 text-xs">Force sync from Stripe</div>
                </button>
                
                <button
                  onClick={() => setDeleteAccountModalOpen(true)}
                  className="w-full text-left rounded-lg p-3 bg-red-900/20 border border-red-800/50 hover:bg-red-900/30 transition-colors"
                >
                  <div className="text-red-400 text-sm font-medium">Delete Account</div>
                  <div className="text-red-400/70 text-xs">Permanently remove your account</div>
                </button>
              </div>
            </div>

            {/* Status Message */}
            {saveMessage && (
              <div className={`p-3 rounded-lg text-xs font-medium ${
                saveError 
                  ? 'bg-red-600/10 border border-red-600/20 text-red-300' 
                  : 'bg-green-600/10 border border-green-600/20 text-green-300'
              }`}>
                {saveMessage}
              </div>
            )}
          </div>

          {/* Debug modal */}
          {showDebugInfo && debugInfo && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto animate-modal-in">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800/50">
                  <h3 className="text-xl font-semibold text-white">Debug Information</h3>
                  <button
                    onClick={() => setShowDebugInfo(false)}
                    className="rounded-full p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all duration-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <h4 className="font-medium text-zinc-100 mb-2">Firestore Data:</h4>
                    <pre className="bg-zinc-800/50 p-3 rounded-lg text-zinc-300 overflow-x-auto text-xs">
                      {JSON.stringify(debugInfo.firestore, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-zinc-100 mb-2">Stripe Data:</h4>
                    <pre className="bg-zinc-800/50 p-3 rounded-lg text-zinc-300 overflow-x-auto text-xs">
                      {JSON.stringify(debugInfo.stripe, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-zinc-100 mb-2">Status API:</h4>
                    <pre className="bg-zinc-800/50 p-3 rounded-lg text-zinc-300 overflow-x-auto text-xs">
                      {JSON.stringify(debugInfo.statusApi, null, 2)}
                    </pre>
                  </div>
                </div>
                
                <div className="p-6 border-t border-zinc-800/50">
                  <button
                    onClick={() => setShowDebugInfo(false)}
                    className="rounded-lg py-2 px-4 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete account confirmation modal */}
          {deleteAccountModalOpen && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm shadow-2xl max-w-sm w-full animate-modal-in">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Delete Account</h3>
                  <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
                    This action cannot be undone. All your data will be permanently removed.
                  </p>
                  <div className="mb-4">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2 border border-zinc-700/50 bg-zinc-800/50 rounded-lg text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/20 text-sm"
                    />
                    {deleteError && (
                      <p className="text-red-400 text-xs mt-2">{deleteError}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setDeleteAccountModalOpen(false);
                        setPassword('');
                        setDeleteError('');
                      }}
                      className="flex-1 rounded-lg py-2 px-4 text-sm font-medium bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="flex-1 rounded-lg py-2 px-4 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfileModal; 