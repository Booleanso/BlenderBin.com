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
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import axios from 'axios';

// Import any UI components needed
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import UserAnalytics from '../components/UserAnalytics';
import UsageBasedPricing from '../components/UsageBasedPricing';
import WaitlistOverlay from '../components/WaitlistOverlay';
import { isWaitlistEnabled } from '../utils/waitlist';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('team');
  const [showWaitlist, setShowWaitlist] = useState(false);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch user data for usage-based pricing settings
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.data();
          
          // Fetch usage-based pricing settings if they exist
          if (userData && userData.usagePricingSettings) {
            setUsagePricing(userData.usagePricingSettings);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        // Redirect to signup if not authenticated
        router.push('/signup');
      }
      setLoading(false);
    });

    // Check waitlist setting
    setShowWaitlist(isWaitlistEnabled());

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
      {/* Waitlist Overlay - shown only when enabled */}
      {showWaitlist && <WaitlistOverlay />}
      
      <header className="border-b border-zinc-800">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold text-white">
              
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400 mt-2">You can manage your account, billing, and team settings here.</p>
        </div>
        
        <div className="mt-10">
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
                    Track your BlenderBin usage analytics below to understand how you're using the service.
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