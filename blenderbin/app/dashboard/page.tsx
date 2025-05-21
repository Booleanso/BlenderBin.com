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

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
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

  // Toggle boolean settings
  const toggleSetting = async (setting: string) => {
    try {
      const newSettings = {
        ...usagePricing,
        [setting]: !usagePricing[setting as keyof typeof usagePricing]
      };
      
      setUsagePricing(newSettings);
      
      // Call API to save settings
      if (user && user.email) {
        const response = await axios.post('/api/update-usage-settings', {
          email: user.email,
          settings: {
            [setting]: !usagePricing[setting as keyof typeof usagePricing]
          }
        });
        
        if (response.data.success) {
          setSaveMessage(`Successfully updated ${setting}`);
          setSaveError(false);
        } else {
          setSaveError(true);
          setSaveMessage('Failed to update settings');
        }
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      setSaveError(true);
      setSaveMessage('Error saving settings');
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
      if (user && user.email) {
        const response = await axios.post('/api/update-usage-settings', {
          email: user.email,
          settings: {
            [field]: usagePricing[field as keyof typeof usagePricing]
          }
        });
        
        if (response.data.success) {
          setSaveMessage(`Successfully updated ${field}`);
          setSaveError(false);
        } else {
          setSaveError(true);
          setSaveMessage('Failed to update settings');
        }
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      setSaveError(true);
      setSaveMessage('Error saving settings');
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
        
        // Fetch subscription information
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.data();
          
          if (userData && userData.stripeRole) {
            setSubscription(userData.stripeRole);
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
    <div className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-gray-800">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold text-white">
              
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/download">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Link>
            </Button>
            <div className="text-right">
              <div className="font-medium text-white">{user?.displayName || user?.email}</div>
              <div className="text-sm text-gray-400">{user?.email}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">You can manage your account, billing, and team settings here.</p>
        </div>
        
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <div className="bg-black border border-gray-800 rounded-lg p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white">Basic Information</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-sm text-gray-400">Name</div>
                  <div className="text-white">{user?.displayName || 'Not set'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Email</div>
                  <div className="text-white">{user?.email}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800">
              <h2 className="text-xl font-semibold text-white">Account</h2>
              <div className="flex items-center mt-2">
                <div className="text-sm inline-flex items-center px-2.5 py-1 rounded-full bg-black border border-gray-800 text-gray-300">
                  {subscription ? subscription : 'Free'}
                </div>
                {subscription === 'business' && (
                  <span className="ml-2 text-xs bg-amber-800 text-amber-300 px-1.5 py-0.5 rounded uppercase font-semibold">business</span>
                )}
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center">
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
                    onClick={async () => {
                      try {
                        setIsBillingLoading(true);
                        // Call our API to get a Stripe Billing Portal URL
                        const response = await axios.post('/api/create-billing-portal', {
                          returnUrl: window.location.href
                        });
                        
                        if (response.data.success) {
                          // Open the Stripe Billing Portal in a new tab
                          window.open(response.data.url, '_blank');
                        } else if (response.data.redirectUrl) {
                          // If there's no Stripe customer yet, redirect to upgrade page
                          router.push(response.data.redirectUrl);
                        }
                      } catch (error) {
                        console.error('Error opening billing portal:', error);
                      } finally {
                        setIsBillingLoading(false);
                      }
                    }}
                  >
                    {isBillingLoading ? 'Loading...' : 'Billing'}
                  </Button>
                </div>
              </div>
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
              <div className="mt-2 text-sm text-gray-300">
                For support, please contact the BlenderBin team via email at help@blenderbin.com
              </div>
            </div>
          </div>

          <div className="bg-black border border-gray-800 rounded-lg">
            <Tabs defaultValue="team" className="w-full">
              <div className="border-b border-gray-800">
                <TabsList className="p-0 h-auto bg-transparent border-b border-gray-800">
                  <TabsTrigger 
                    value="team" 
                    className="py-3 px-4 font-medium text-gray-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-400 rounded-none bg-transparent hover:text-blue-300 transition-colors"
                  >
                    Team
                  </TabsTrigger>
                  <TabsTrigger 
                    value="metrics" 
                    className="py-3 px-4 font-medium text-gray-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-400 rounded-none bg-transparent hover:text-blue-300 transition-colors"
                  >
                    Metrics
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pricing" 
                    className="py-3 px-4 font-medium text-gray-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-400 rounded-none bg-transparent hover:text-blue-300 transition-colors"
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
                <div className="bg-black rounded-lg p-8 text-center border border-gray-800">
                  <BarChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Usage Metrics</h3>
                  <p className="text-gray-400 mb-4">
                    Track your team's usage of Gizmo AI features in Blender.
                  </p>
                  <Button>View Detailed Analytics</Button>
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
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-white">$205.80</span>
                        <span className="text-gray-400 ml-2">of $300 limit</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <button className="text-gray-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <span className="text-white">May 2025</span>
                        <button className="text-gray-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">9 gemini-2-5-pro-exp-max requests * 5 cents per such request</span>
                          <span className="text-white">$0.45</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">1 o3 request * 30 cents per such request</span>
                          <span className="text-white">$0.30</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">2 extra fast premium requests beyond 500/month * 4 cents per such request</span>
                          <span className="text-white">$0.08</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">2071 premium tool calls * 5 cents per tool call</span>
                          <span className="text-white">$103.55</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">231 claude-3.7-sonnet-max requests * 5 cents per such request</span>
                          <span className="text-white">$11.55</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">277 claude-3.7-sonnet-thinking-max requests * 5 cents per such request</span>
                          <span className="text-white">$13.85</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">979 token-based usage calls to claude-3.7-sonnet-thinking, totalling: $76.02</span>
                          <span className="text-white">$76.02</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Mid-month usage paid for May 2025</span>
                          <span className="text-white">$-120.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="flex justify-between items-center w-full text-white">
                    <span>View Pricing Details</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>

                  <div className="border-t border-gray-800 pt-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-white">Recent Usage Events</h3>
                      <div className="flex items-center">
                        <span className="text-gray-400 text-sm mr-1">Showing the last 500 events</span>
                        <button className="text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-800">
                      <table className="min-w-full divide-y divide-gray-800">
                        <thead className="bg-black">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Model
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              User
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center">
                              Requests
                              <button className="ml-1 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-black divide-y divide-gray-800">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              May 20, 2025, 09:32 PM
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              claude-3.7-sonnet-thinking
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              ceo@webrend.com
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              Usage-based
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              0
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              May 20, 2025, 09:31 PM
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              claude-3.7-sonnet-thinking
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              ceo@webrend.com
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              Usage-based
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              0
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              May 20, 2025, 09:31 PM
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              claude-3.7-sonnet-thinking
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              ceo@webrend.com
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              Usage-based
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              3.4
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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