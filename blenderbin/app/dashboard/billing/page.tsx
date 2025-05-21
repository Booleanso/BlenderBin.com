'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Edit, MoreHorizontal, Plus, CreditCard } from 'lucide-react';
import { auth, db } from '../../lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';

export default function BillingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [billingInfo, setBillingInfo] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    }
  });
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch subscription information
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.data();
          
          if (userData) {
            if (userData.stripeRole) {
              setSubscription({
                name: userData.stripeRole === 'business' ? 'Cursor Business' : 'Cursor Pro',
                price: userData.stripeRole === 'business' ? '$40.00' : '$12.00',
                renewDate: 'June 11, 2025',
                status: 'active'
              });
            }
            
            // Set billing info if available
            if (userData.billingInfo) {
              setBillingInfo(userData.billingInfo);
            } else {
              // Set default billing info based on user data
              setBillingInfo({
                name: userData.displayName || '',
                email: userData.email || '',
                address: {
                  line1: '321 Sherwood Rd',
                  city: 'Union',
                  state: 'NJ',
                  postal_code: '07083',
                  country: 'US'
                }
              });
            }
            
            // Simulate payment methods
            setPaymentMethods([
              { id: 1, brand: 'visa', last4: '5845', isDefault: true },
              { id: 2, brand: 'visa', last4: '5845', isDefault: false },
              { id: 3, brand: 'visa', last4: '5845', isDefault: false },
              { id: 4, brand: 'visa', last4: '1863', isDefault: false }
            ]);
            
            // Simulate invoices
            setInvoices([
              { 
                id: 1, 
                date: 'May 18, 2025', 
                amount: '$15.45', 
                status: 'paid',
                description: '38 gemini-2-5-pro-exp-max requests'
              },
              { 
                id: 2, 
                date: 'May 12, 2025', 
                amount: '$20.00', 
                status: 'paid',
                description: '9 gemini-2-5-pro-exp-max requests'
              },
              { 
                id: 3, 
                date: 'May 12, 2025', 
                amount: '$20.00', 
                status: 'paid',
                description: '1669 premium tool calls * 5 cents'
              }
            ]);
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
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center mb-8">
          <Button variant="ghost" asChild className="mr-4">
            <Link href="/dashboard" className="flex items-center text-gray-300 hover:text-white">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Return to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-white">
            Email help@blenderbin.com for help / closing accounts
          </h1>
        </div>

        {/* Subscription Type Clarification */}
        <div className="mb-6">
          <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-md text-blue-300">
            <h3 className="text-md font-medium mb-2">Subscription Information</h3>
            <p className="text-sm mb-3">
              BlenderBin offers two separate subscription types:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li><strong>BlenderBin subscription</strong> - For access to all add-ons and tools</li>
              <li><strong>Gizmo subscription</strong> - For AI features in Blender</li>
            </ul>
            <p className="mt-3 text-sm">
              These are separate subscriptions that can be managed independently.
              The information below shows details about your current subscription.
            </p>
          </div>
        </div>
        
        {/* Current Subscription */}
        <div className="mb-12">
          <h2 className="text-sm font-medium text-gray-400 uppercase mb-4">Current Subscription</h2>
          <div className="bg-black border border-gray-800 rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">{subscription?.name || 'Free'}</h3>
              {subscription && (
                <>
                  <div className="text-2xl font-bold text-white mb-2">{subscription.price} per month</div>
                  <div className="text-gray-400">Your subscription renews on {subscription.renewDate}.</div>
                </>
              )}
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center text-white bg-gray-900 border border-gray-700 rounded p-1 px-2">
                <CreditCard className="h-4 w-4 mr-2" />
                <span className="mr-2">Visa</span>
                <span>•••• 1863</span>
                <Edit className="h-4 w-4 ml-2 text-gray-500" />
              </div>
              
              <div className="ml-auto">
                <Button variant="ghost" className="border border-gray-800 text-white">
                  Cancel subscription
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-12">
          <h2 className="text-sm font-medium text-gray-400 uppercase mb-4">Payment Methods</h2>
          <div className="bg-black border border-gray-800 rounded-lg">
            {paymentMethods.map((method, index) => (
              <div 
                key={method.id} 
                className={`flex items-center justify-between p-4 ${
                  index !== paymentMethods.length - 1 ? 'border-b border-gray-800' : ''
                }`}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3">
                    <span className="text-white uppercase font-bold text-xs">VI</span>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="text-white">{method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}</span>
                      {method.isDefault && (
                        <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">Default</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    link
                  </Button>
                  {!method.isDefault && (
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="p-4 border-t border-gray-800">
              <Button variant="ghost" className="text-gray-400 hover:text-white flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add payment method
              </Button>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="mb-12">
          <h2 className="text-sm font-medium text-gray-400 uppercase mb-4">Billing Information</h2>
          <div className="bg-black border border-gray-800 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-gray-400 mb-1">Name</div>
                <div className="text-white">{billingInfo.name || user?.displayName || 'Not set'}</div>
              </div>
              
              <div>
                <div className="text-gray-400 mb-1">Email</div>
                <div className="text-white">{billingInfo.email || user?.email}</div>
              </div>
              
              <div>
                <div className="text-gray-400 mb-1">Billing address</div>
                <div className="text-white">
                  {billingInfo.address.line1}<br />
                  {billingInfo.address.city}, {billingInfo.address.state} {billingInfo.address.postal_code} {billingInfo.address.country}
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="ghost" className="text-gray-400 hover:text-white flex items-center">
                <Edit className="h-4 w-4 mr-2" />
                Update information
              </Button>
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase">Invoice History</h2>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            </Button>
          </div>
          
          <div className="bg-black border border-gray-800 rounded-lg">
            {invoices.map((invoice, index) => (
              <div 
                key={invoice.id} 
                className={`grid grid-cols-4 gap-4 p-4 ${
                  index !== invoices.length - 1 ? 'border-b border-gray-800' : ''
                }`}
              >
                <div className="text-white">{invoice.date}</div>
                <div className="text-white">{invoice.amount}</div>
                <div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-900 text-green-300 rounded-full">
                    {invoice.status}
                  </span>
                </div>
                <div className="text-white truncate">{invoice.description}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Powered by Stripe */}
        <div className="mt-20 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <span className="mr-2">Powered by</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="25" viewBox="0 0 60 25" fill="none" className="text-gray-500">
              <path d="M59.64 14.28h-8.06v-1.548h8.06v1.549zm-8.06 3.461h8.06v-1.548h-8.06v1.548zm0-6.922h8.06V9.272h-8.06v1.547zM42.038 11.61c0-2.037-1.23-3.66-3.66-3.66-2.431 0-3.927 1.623-3.927 3.927 0 2.586 1.7 3.856 4.02 3.856 1.157 0 2.023-.267 2.683-.668v-1.93c-.66.428-1.429.668-2.396.668-1.129 0-2.13-.428-2.258-1.538h5.524c0-.16.014-.786.014-.654zm-5.551-.96c0-1.129.668-1.93 1.864-1.93 1.103 0 1.757.774 1.757 1.93h-3.62zm-4.566 4.433c-.588 0-.774-.401-.774-1.01V8.845h1.864V7.383h-1.864V4.94h-1.93v2.444h-1.689v1.462h1.69v5.338c0 1.93 1.01 2.67 2.803 2.67.588 0 1.243-.08 1.65-.227v-1.503a6.966 6.966 0 01-1.75.227zm-7.556-7.383l-1.503 5.712-1.597-5.712h-1.81l-1.61 5.725-1.503-5.725h-2.05l2.563 8.421h2.05l1.583-5.365 1.583 5.365h2.05l2.562-8.421h-2.023.005zm-17.5 4.246c0 2.59 1.67 4.246 4.22 4.246 1.29 0 2.13-.294 2.79-.694v-1.977c-.64.468-1.47.788-2.44.788-1.58 0-2.49-1.063-2.49-2.363 0-1.36.91-2.337 2.49-2.337.97 0 1.8.32 2.44.788V7.924c-.66-.401-1.5-.695-2.79-.695-2.55 0-4.22 1.67-4.22 4.26v.001zm-3.555 3.924h1.93V3.29h-1.93v12.578zm-2.97-8.42h-2.31l-2.93 3.152V3.291h-1.93v12.578h1.93v-3.046l.63-.654 2.6 3.7h2.44l-3.62-5.044 3.19-3.378z" fill="currentColor"></path>
            </svg>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/terms" className="text-gray-500 hover:text-gray-300">Terms</Link>
            <Link href="/privacy" className="text-gray-500 hover:text-gray-300">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  );
} 