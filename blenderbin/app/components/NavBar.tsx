'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '../lib/firebase-client';
import { User } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ChevronDown, ChevronRight } from 'lucide-react';
import '../css/navbar.css';

interface SubscriptionStatus {
  isSubscribed: boolean;
  priceId?: string;
}

interface S3Files {
  premium: string[];
  free: string[];
  icons: Record<string, string>;
}

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="panel-container">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="panel-header"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
      </button>
      {isOpen && (
        <div className="panel-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default function NavBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [s3Files, setS3Files] = useState<S3Files>({ premium: [], free: [], icons: {} });
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false
  });

  useEffect(() => {
    const fetchS3Files = async () => {
      try {
        const [filesResponse, iconsResponse] = await Promise.all([
          fetch('/api/aws-s3-listObjects'),
          fetch('/api/aws-s3-listIcons')
        ]);

        if (!filesResponse.ok || !iconsResponse.ok) {
          throw new Error('Failed to fetch S3 files or icons');
        }

        const filesData = await filesResponse.json();
        const iconsData = await iconsResponse.json();

        setS3Files({
          premium: filesData.premium,
          free: filesData.free,
          icons: iconsData
        });
      } catch (error) {
        console.error('Error fetching S3 files:', error);
      }
    };

    fetchS3Files();
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

  const getDisplayName = (filename: string) => {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .toUpperCase();
  };

  const getIconUrl = (filename: string) => {
    const baseName = filename.replace(/\.[^/.]+$/, '');
    return s3Files.icons[baseName] || null;
  };

  if (loading) {
    return <div className="navbar-loading">Loading...</div>;
  }

  return (
    <>
      <nav className="navbar">
        {/* User Controls Section */}
        <div className="buttons-full-wrap">
          <div className="navbar-right">
            {user ? (
              <>
                <span className="navbar-email">{user.email}</span>
                {subscriptionStatus.isSubscribed ? (
                  <>
                    <div className="button-wrapper">
                      <button onClick={handleRedownload} className="navbar-button">RE-DOWNLOAD</button>
                    </div>
                    <div className="button-wrapper">
                      <button onClick={() => setProfileModalOpen(true)} className="navbar-button">PROFILE</button>
                    </div>
                  </>
                ) : (
                  <div className="button-wrapper">
                    <button onClick={() => setModalOpen(true)} className="navbar-button">GET STARTED</button>
                  </div>
                )}
                <div className="button-wrapper">
                  <button onClick={handleLogout} className="navbar-button">LOGOUT</button>
                </div>
              </>
            ) : (
              <div className="button-wrapper">
                <Link href="/auth" className="navbar-button">Sign In / Sign Up</Link>
              </div>
            )}
          </div>
        </div>

        {/* Addons Section */}
        <div className="navbar-container">
          <div className="navbar-content">
            {/* Free Addons Panel */}
            <CollapsiblePanel title="FREE ADDONS">
              <div className="buttons-full-wrap">
                {s3Files.free.map((filename) => (
                  <div key={`free-${filename}`} className="button-wrapper">
                    <div className="addon-link-container">
                      {getIconUrl(filename) && (
                        <div className="addon-icon-wrapper">
                          <Image
                            src={getIconUrl(filename)!}
                            alt={`${getDisplayName(filename)} icon`}
                            width={24}
                            height={24}
                          />
                        </div>
                      )}
                      <Link
                        href={`/library/${encodeURIComponent(filename)}`}
                        className="navbar-link"
                      >
                        {getDisplayName(filename)}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsiblePanel>

            {/* Premium Addons Panel */}
            {subscriptionStatus.isSubscribed && (
              <CollapsiblePanel title="PREMIUM ADDONS">
                <div className="buttons-full-wrap">
                  {s3Files.premium.map((filename) => (
                    <div key={`premium-${filename}`} className="button-wrapper">
                      <div className="addon-link-container">
                        {getIconUrl(filename) && (
                          <div className="addon-icon-wrapper">
                            <Image
                              src={getIconUrl(filename)!}
                              alt={`${getDisplayName(filename)} icon`}
                              width={24}
                              height={24}
                            />
                          </div>
                        )}
                        <Link
                          href={`/library/${encodeURIComponent(filename)}`}
                          className="navbar-link"
                        >
                          {getDisplayName(filename)}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsiblePanel>
            )}
          </div>
        </div>
      </nav>

      {/* Subscription Modal */}
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
    </>
  );
}