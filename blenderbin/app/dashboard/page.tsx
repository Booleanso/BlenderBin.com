'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Settings, User, CreditCard, Users, BarChart, Terminal, 
  Check, Shield, PlusCircle, X, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { auth, db } from '../lib/firebase-client';
import { onAuthStateChanged, updateEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import Image from 'next/image';

// Import any UI components needed
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import UserAnalytics from '../components/UserAnalytics';
import UsageBasedPricing from '../components/UsageBasedPricing';
import { FirebaseError } from 'firebase/app';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>({
    isSubscribed: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: '',
    status: ''
  });
  
  // Add state for Gizmo subscription
  const [gizmoSubscription, setGizmoSubscription] = useState<any>(null);
  const [gizmoSubscriptionStatus, setGizmoSubscriptionStatus] = useState<any>({
    isSubscribed: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: '',
    status: ''
  });
  const [activeTab, setActiveTab] = useState('team');
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const router = useRouter();
  
  // Usage-based pricing settings
  const [usagePricing, setUsagePricing] = useState({
    enableUsageBasedPricing: true,
    enablePremiumUsageBasedPricing: true,
    onlyAdminsCanModify: false,
    monthlySpendingLimit: '$300',
    perUserMonthlyLimit: 'Not set'
  });
  
  // Saving state
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState(false);

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
  
  // Toggle boolean settings
  const toggleSetting = async (setting: string) => {
    try {
      const newSettings = {
        ...usagePricing,
        [setting]: !usagePricing[setting as keyof typeof usagePricing]
      };
      
      setUsagePricing(newSettings);
      
      // Call API to save settings
      if (user) {
        // Get auth token
        const token = await user.getIdToken();
        console.log(`Toggling ${setting} to:`, !usagePricing[setting as keyof typeof usagePricing]);
        
        // Create the payload
        const payload = {
          settings: {
            [setting]: !usagePricing[setting as keyof typeof usagePricing]
          }
        };
        
        console.log('Sending request to /api/usage with payload:', payload);
        
        try {
          const response = await axios.post('/api/usage', 
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('API response:', response.data);
          
          if (response.data.success) {
            setSaveMessage(`Successfully updated ${setting}`);
            setSaveError(false);
          } else {
            setSaveError(true);
            setSaveMessage(response.data.error || 'Failed to update settings');
          }
        } catch (apiError: any) {
          console.error('API call error:', apiError);
          setSaveError(true);
          setSaveMessage(`Error: ${apiError.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      console.error('Error saving setting:', error);
      setSaveError(true);
      setSaveMessage(`Error saving settings: ${error.message || 'Unknown error'}`);
    }
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSaveMessage('');
    }, 3000);
  };
  
  // Handle input change
  const handleInputChange = (field: string, value: string) => {
    setUsagePricing({
      ...usagePricing,
      [field]: value
    });
  };
  
  // Save input settings
  const saveSettings = async (field: string) => {
    try {
      setIsSaving(field);
      
      // Call API to save settings
      if (user) {
        // Get auth token
        const token = await user.getIdToken();
        console.log(`Saving ${field} with value:`, usagePricing[field as keyof typeof usagePricing]);
        
        // Create the payload
        const payload = {
          settings: {
            [field]: usagePricing[field as keyof typeof usagePricing]
          }
        };
        
        console.log('Sending request to /api/usage with payload:', payload);
        
        try {
          const response = await axios.post('/api/usage', 
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('API response:', response.data);
          
          if (response.data.success) {
            setSaveMessage(`Successfully updated ${field}`);
            setSaveError(false);
          } else {
            setSaveError(true);
            setSaveMessage(response.data.error || 'Failed to update settings');
          }
        } catch (apiError: any) {
          console.error('API call error:', apiError);
          setSaveError(true);
          setSaveMessage(`Error: ${apiError.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      console.error('Error saving setting:', error);
      setSaveError(true);
      setSaveMessage(`Error saving settings: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(null);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    }
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
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch subscription information
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.data();
          
          // Set BlenderBin subscription data
          if (userData && userData.stripeRole) {
            setSubscription(userData.stripeRole);
          }
          
          // Set Gizmo subscription data (if available in userData)
          if (userData && userData.gizmoSubscription) {
            setGizmoSubscription(userData.gizmoSubscription);
          }
          
          // Fetch BlenderBin subscription status details
          const response = await fetch(`/api/subscription/status?userId=${currentUser.uid}`);
          if (response.ok) {
            const statusData = await response.json();
            setSubscriptionStatus(statusData);
          }
          
          // Fetch Gizmo subscription status details if needed
          try {
            const gizmoResponse = await fetch(`/api/gizmo/subscription/status?userId=${currentUser.uid}`);
            if (gizmoResponse.ok) {
              const gizmoStatusData = await gizmoResponse.json();
              setGizmoSubscriptionStatus(gizmoStatusData);
            }
          } catch (error) {
            console.error('Error fetching Gizmo subscription status:', error);
            // Default to free tier if we can't fetch the status
            setGizmoSubscriptionStatus({
              isSubscribed: false,
              cancelAtPeriodEnd: false,
              currentPeriodEnd: '',
              status: ''
            });
          }
          
          // Fetch usage-based pricing settings if they exist
          if (userData && userData.usagePricingSettings) {
            setUsagePricing(userData.usagePricingSettings);
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        }
      } else {
        // Redirect to signup if not authenticated
        router.push('/signup');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-black text-white">
      <header className="border-b border-zinc-800">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold text-white">
              
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {/* Download button removed from header */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400 mt-2">You can manage your account, billing, and team settings here.</p>
        </div>
        
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white">Basic Information</h2>
              <div className="mt-4 space-y-6">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-3 border-2 border-zinc-800">
                    {profilePicUrl && !profilePicError ? (
                      <img
                        src={`${profilePicUrl}${profilePicUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`}
                        alt="Profile"
                        width={96}
                        height={96}
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
                        width={96}
                        height={96}
                      />
                    )}
                  </div>
                  <label className="cursor-pointer bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 text-sm px-3 py-1 rounded-md transition-colors shadow-sm">
                    Change Picture
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePicUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                
                <div>
                  <div className="text-sm text-zinc-400">Name</div>
                  <div className="text-white">{user?.displayName || 'Not set'}</div>
                </div>
                
                <div>
                  <div className="text-sm text-zinc-400 mb-1">Email</div>
                  {editingEmail ? (
                    <div className="space-y-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="New email address"
                        className="w-full px-3 py-2 border border-zinc-700 bg-zinc-800/50 rounded-md text-sm text-zinc-200 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {emailError && (
                        <p className="text-sm text-red-500">{emailError}</p>
                      )}
                      <div className="flex space-x-2 mt-2">
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
                          className="bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded-md text-sm shadow-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-white">{user?.email}</div>
                      <button
                        onClick={() => {
                          setEditingEmail(true);
                          setNewEmail(user?.email || '');
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="text-sm text-zinc-400 mb-1">Password</div>
                  <div className="flex items-center justify-between">
                    <div className="text-white">••••••••</div>
                    <Link 
                      href="/reset-password" 
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Reset
                    </Link>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-zinc-400">Member since</div>
                  <div className="text-white">{user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800">
              <h2 className="text-xl font-semibold text-white">Account</h2>
              
              {/* BlenderBin subscription section */}
              <div className="mt-6 mb-6 p-4 border border-zinc-800 rounded-md bg-zinc-900/50 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                  BlenderBin Subscription
                </h3>
                <div className="flex items-center mt-2">
                  <div className="text-sm inline-flex items-center px-2.5 py-1 rounded-full bg-black border border-gray-800 text-gray-300">
                    {subscription ? subscription : 'Free'}
                  </div>
                  {subscription === 'business' && (
                    <span className="ml-2 text-xs bg-amber-800 text-amber-300 px-1.5 py-0.5 rounded uppercase font-semibold">business</span>
                  )}
                </div>
                
                {subscription && (
                  <div className="mt-4">
                    {subscriptionStatus?.cancelAtPeriodEnd ? (
                      <div className="text-sm text-amber-500">
                        Your subscription will cancel on {new Date(subscriptionStatus?.currentPeriodEnd || '').toLocaleDateString()}
                      </div>
                    ) : subscriptionStatus?.status === 'trialing' ? (
                      <>
                        <div className="text-sm text-blue-500 mb-2">
                          You are currently in your free trial period
                          {subscriptionStatus?.currentPeriodEnd && (
                            <span className="block mt-1">
                              Trial ends on: {new Date(subscriptionStatus?.currentPeriodEnd).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleUnsubscribe}
                          className="w-full mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-md text-sm font-medium border border-red-900/50"
                        >
                          Cancel Free Trial
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleUnsubscribe}
                        className="w-full mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-md text-sm font-medium border border-red-900/50"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Gizmo subscription section */}
              <div className="p-4 border border-zinc-800 rounded-md bg-zinc-900/50 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-400"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                  Gizmo AI Subscription
                </h3>
                <div className="flex items-center mt-2">
                  <div className="text-sm inline-flex items-center px-2.5 py-1 rounded-full bg-black border border-gray-800 text-gray-300">
                    {gizmoSubscription ? gizmoSubscription : 'Free'}
                  </div>
                  {gizmoSubscription === 'business' && (
                    <span className="ml-2 text-xs bg-amber-800 text-amber-300 px-1.5 py-0.5 rounded uppercase font-semibold">business</span>
                  )}
                </div>
                
                {gizmoSubscription ? (
                  <div className="mt-4">
                    {gizmoSubscriptionStatus?.cancelAtPeriodEnd ? (
                      <div className="text-sm text-amber-500">
                        Your Gizmo subscription will cancel on {new Date(gizmoSubscriptionStatus?.currentPeriodEnd || '').toLocaleDateString()}
                      </div>
                    ) : gizmoSubscriptionStatus?.status === 'trialing' ? (
                      <>
                        <div className="text-sm text-blue-500 mb-2">
                          You are currently in your Gizmo free trial period
                          {gizmoSubscriptionStatus?.currentPeriodEnd && (
                            <span className="block mt-1">
                              Trial ends on: {new Date(gizmoSubscriptionStatus?.currentPeriodEnd).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Handle Gizmo subscription cancellation
                          }}
                          className="w-full mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-md text-sm font-medium border border-red-900/50"
                        >
                          Cancel Gizmo Free Trial
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          // Handle Gizmo subscription cancellation
                        }}
                        className="w-full mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-md text-sm font-medium border border-red-900/50"
                      >
                        Cancel Gizmo Subscription
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <Link href="/pricing" className="block text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                      Upgrade Gizmo AI
                    </Link>
                    <p className="text-xs text-gray-400 mt-2">
                      Upgrade to access advanced AI features in Blender, including unlimited AI queries and priority support.
                    </p>
                  </div>
                )}
              </div>
              
                              <div className="mt-6">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center text-gray-300 hover:text-white p-0"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" /> Invite
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center text-gray-300 hover:text-white p-0"
                        asChild
                      >
                        <Link href="/download">
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Link>
                      </Button>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center text-gray-300 hover:text-white p-0"
                      onClick={async () => {
                      try {
                        setIsBillingLoading(true);
                        
                        // Get auth token
                        const token = await user.getIdToken();
                        
                        // Call our API to get a Stripe Billing Portal URL
                        const response = await axios.post('/api/create-billing-portal', 
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
                            console.log('Created new Stripe customer');
                          }
                          
                          // Open the Stripe Billing Portal in a new tab
                          window.open(response.data.url, '_blank');
                        } else if (response.data.redirectUrl) {
                          // If there's no Stripe customer yet, redirect to upgrade page
                          router.push(response.data.redirectUrl);
                        }
                      } catch (error) {
                        console.error('Error opening billing portal:', error);
                        
                        // Show error message to user
                        alert('Failed to open billing portal. Please try again later.');
                      } finally {
                        setIsBillingLoading(false);
                      }
                    }}
                  >
                    {isBillingLoading ? 'Loading...' : 'Billing'}
                  </Button>
                </div>
              </div>
              
              {/* Add delete account button */}
              <div className="mt-6">
                <button
                  onClick={() => setDeleteAccountModalOpen(true)}
                  className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-md text-sm font-medium border border-red-900/50"
                >
                  Delete Account
                </button>
              </div>
              
              {/* Delete account confirmation modal */}
              {deleteAccountModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="bg-zinc-900/90 p-6 rounded-xl max-w-md w-full backdrop-blur-sm border border-zinc-800 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4">Delete Account</h3>
                                          <p className="text-zinc-300 mb-4">
                      Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
                    </p>
                    <div className="mb-4">
                      <label className="block text-zinc-400 text-sm mb-2">
                        Please enter your password to confirm:
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-zinc-700 bg-zinc-800/50 rounded-md p-2 text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {deleteError && (
                        <p className="text-red-500 text-sm mt-1">{deleteError}</p>
                      )}
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setDeleteAccountModalOpen(false);
                          setPassword('');
                          setDeleteError('');
                        }}
                        className="px-4 py-2 bg-zinc-800/50 text-zinc-300 rounded-md hover:bg-zinc-700 shadow-sm border border-zinc-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Display save message */}
              {saveMessage && (
                <div className={`mt-4 p-2 rounded text-sm ${saveError ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                  {saveMessage}
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800">
              <h2 className="text-xl font-semibold text-white">Data Privacy</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white">Privacy mode</div>
                    <div className="text-xs text-gray-400">(enforced across all seats)</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white">OpenAI Zero-data-retention</div>
                    <div className="text-xs text-gray-400">(approved)</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white">Anthropic Zero-data-retention</div>
                    <div className="text-xs text-gray-400">(approved)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800">
              <h2 className="text-xl font-semibold text-white">Support</h2>
              <div className="mt-2 text-sm text-zinc-300">
                For support, please contact the BlenderBin team via email at help@blenderbin.com
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl shadow-xl backdrop-blur-sm">
            <Tabs defaultValue="team" className="w-full">
              <div className="border-b border-zinc-800">
                <TabsList className="p-0 h-auto bg-transparent border-b border-zinc-800">
                  <TabsTrigger 
                    value="team" 
                    className="py-3 px-4 font-medium text-zinc-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-400 rounded-none bg-transparent hover:text-blue-300 transition-colors"
                  >
                    Team
                  </TabsTrigger>
                  <TabsTrigger 
                    value="metrics" 
                    className="py-3 px-4 font-medium text-zinc-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-400 rounded-none bg-transparent hover:text-blue-300 transition-colors"
                  >
                    Metrics
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pricing" 
                    className="py-3 px-4 font-medium text-zinc-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-400 rounded-none bg-transparent hover:text-blue-300 transition-colors"
                  >
                    Usage-Based Pricing
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="team" className="p-6">
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Team Members</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View analytics
                    </Button>
                    <Button variant="outline" size="sm">
                      Edit Request Limit
                    </Button>
                    <Button size="sm">
                      + Invite
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-800">
                  <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-black">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          User
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Last Used
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-black divide-y divide-gray-800">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-white">
                              {user?.displayName || 'User'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{user?.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">Just now</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900 text-blue-300">
                            Admin
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          <button className="text-gray-400 hover:text-white">...</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              
              <TabsContent value="metrics" className="p-6">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Usage Analytics</h3>
                  <p className="text-gray-400 mb-6">
                    Track your usage of Gizmo AI features in Blender. The data below shows your API usage patterns
                    and helps you understand how you're using the service.
                  </p>
                  
                  {/* Import and use the UserAnalytics component */}
                  {user && <UserAnalytics />}
                </div>
              </TabsContent>
              
              <TabsContent value="pricing" className="p-6">
                <div className="space-y-8">
                  <div className="bg-[#2c2a14] border border-[#5f5b30] rounded-md p-4 flex items-start gap-3">
                    <div className="text-white mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </div>
                    <div className="text-white text-sm">
                      Usage-based pricing allows you to pay for extra requests beyond your plan limits. <a href="#" className="text-white underline">Learn more</a>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-white mb-6">Settings</h3>
                    
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white">Enable usage-based pricing</span>
                          <button className="text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          </button>
                        </div>
                        <button 
                          className="w-12 h-6 rounded-full p-1 flex items-center"
                          style={{ backgroundColor: usagePricing.enableUsageBasedPricing ? '#1f2937' : '#1f2937' }}
                          onClick={() => toggleSetting('enableUsageBasedPricing')}
                        >
                          <div 
                            className={`w-4 h-4 rounded-full transform transition-transform ${
                              usagePricing.enableUsageBasedPricing ? 'translate-x-6 bg-green-500' : 'translate-x-0 bg-gray-300'
                            }`}
                          ></div>
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white">Enable usage-based pricing for premium models</span>
                          <button className="text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          </button>
                        </div>
                        <button 
                          className="w-12 h-6 rounded-full p-1 flex items-center"
                          style={{ backgroundColor: '#1f2937' }}
                          onClick={() => toggleSetting('enablePremiumUsageBasedPricing')}
                        >
                          <div 
                            className={`w-4 h-4 rounded-full transform transition-transform ${
                              usagePricing.enablePremiumUsageBasedPricing ? 'translate-x-6 bg-green-500' : 'translate-x-0 bg-gray-300'
                            }`}
                          ></div>
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white">Only admins can modify usage-based pricing settings</span>
                          <button className="text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          </button>
                        </div>
                        <button 
                          className="w-12 h-6 rounded-full p-1 flex items-center"
                          style={{ backgroundColor: '#1f2937' }}
                          onClick={() => toggleSetting('onlyAdminsCanModify')}
                        >
                          <div 
                            className={`w-4 h-4 rounded-full transform transition-transform ${
                              usagePricing.onlyAdminsCanModify ? 'translate-x-6 bg-green-500' : 'translate-x-0 bg-gray-300'
                            }`}
                          ></div>
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white">Monthly spending limit:</span>
                          <button className="text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="text" 
                            value={usagePricing.monthlySpendingLimit} 
                            onChange={(e) => handleInputChange('monthlySpendingLimit', e.target.value)}
                            className="bg-black border border-gray-800 rounded-md px-3 py-2 text-white text-right w-32" 
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => saveSettings('monthlySpendingLimit')}
                          >
                            {isSaving === 'monthlySpendingLimit' ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white">Per-user monthly limit:</span>
                          <button className="text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="text" 
                            value={usagePricing.perUserMonthlyLimit} 
                            onChange={(e) => handleInputChange('perUserMonthlyLimit', e.target.value)}
                            className="bg-black border border-gray-800 rounded-md px-3 py-2 text-white text-right w-32" 
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => saveSettings('perUserMonthlyLimit')}
                          >
                            {isSaving === 'perUserMonthlyLimit' ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>

                      {saveMessage && (
                        <div className={`text-sm ${saveError ? 'text-red-500' : 'text-green-500'}`}>
                          {saveMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-800 pt-8">
                    <h3 className="text-xl font-bold text-white mb-6">Current Usage</h3>
                    
                    {/* Integrate the UsageBasedPricing component */}
                    <UsageBasedPricing 
                      user={user} 
                      isEnabled={usagePricing.enableUsageBasedPricing} 
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
} 