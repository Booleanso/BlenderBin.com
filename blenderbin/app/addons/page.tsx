'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, User, Calendar, Tag, Package, ExternalLink } from 'lucide-react';
import { auth } from '../lib/firebase-client';
import { db } from '../lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

interface AddonMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  blenderVersion: string;
  filename: string;
  size: number;
  lastModified: string;
  tier: 'free' | 'premium';
}

interface AddonsResponse {
  success: boolean;
  addons: AddonMetadata[];
  cached?: boolean;
  cacheAge?: number;
  count?: number;
  error?: string;
}

export default function AddonsPage() {
  const router = useRouter();
  const [addons, setAddons] = useState<AddonMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<AddonMetadata | null>(null);
  const [priceMap, setPriceMap] = useState<Record<string, { amount: number; currency: string }>>({});
  const [startingCheckout, setStartingCheckout] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setUserLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchAddons();
  }, []);

  // Fetch prices for each addon from Firestore: collection `addon_products` with doc IDs as UPPERCASE slugs
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const entries = await Promise.all(
          addons.map(async (a) => {
            const slug = baseNameFromFilename(a.filename).toUpperCase();
            const snap = await getDoc(doc(db, 'addon_products', slug));
            if (snap.exists()) {
              const data: any = snap.data();
              const amount = Number(data.amount) || 0;
              const currency = (data.currency || 'usd') as string;
              return [slug, { amount, currency }];
            }
            return [slug, { amount: 0, currency: 'usd' }];
          })
        );
        const map: Record<string, { amount: number; currency: string }> = {};
        entries.forEach(([k, v]) => {
          map[k as string] = v as { amount: number; currency: string };
        });
        setPriceMap(map);
      } catch (err) {
        console.error('Error fetching addon prices:', err);
      }
    };
    if (addons.length) fetchPrices();
  }, [addons]);

  // Open modal if URL hash references an addon slug
  useEffect(() => {
    if (!addons.length) return;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash && hash.startsWith('#')) {
      const targetSlug = decodeURIComponent(hash.slice(1)).toLowerCase();
      const match = addons.find(a => baseNameFromFilename(a.filename).toLowerCase() === targetSlug);
      if (match) {
        setSelectedAddon(match);
        setIsModalOpen(true);
      }
    }
  }, [addons]);

  // Handle post-purchase redirect to auto-download
  useEffect(() => {
    const url = new URL(window.location.href);
    const purchase = url.searchParams.get('purchase');
    const sessionId = url.searchParams.get('session_id');
    const addon = url.searchParams.get('addon');
    if (purchase === 'success' && sessionId && addon) {
      // Trigger download
      (async () => {
        try {
          const res = await fetch(`/api/addons/download?session_id=${encodeURIComponent(sessionId)}&addon=${encodeURIComponent(addon)}`);
          const data = await res.json();
          if (res.ok && data.downloadUrl) {
            window.location.href = data.downloadUrl;
          }
        } catch (e) {
          console.error('Auto-download failed:', e);
        } finally {
          // Clean URL
          url.searchParams.delete('purchase');
          url.searchParams.delete('session_id');
          url.searchParams.delete('addon');
          window.history.replaceState({}, '', url.toString());
        }
      })();
    }
  }, []);

  const fetchAddons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/addons');
      const data: AddonsResponse = await response.json();

      if (data.success) {
        setAddons(data.addons);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch addons');
      }
    } catch (err) {
      setError('Network error while fetching addons');
      console.error('Error fetching addons:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories for filtering
  const categories = ['All', ...Array.from(new Set(addons.map(addon => addon.category)))];
  const tiers = ['All', 'Free', 'Premium'];

  // Filter addons by selected category and tier
  const filteredAddons = addons.filter(addon => {
    const categoryMatch = selectedCategory === 'All' || addon.category === selectedCategory;
    const tierMatch = selectedTier === 'All' || addon.tier === selectedTier.toLowerCase();
    return categoryMatch && tierMatch;
  });

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const baseNameFromFilename = (filename: string) => filename.replace(/\.[^/.]+$/, '');

  const openAddonModal = (addon: AddonMetadata) => {
    setSelectedAddon(addon);
    setIsModalOpen(true);
    const slug = baseNameFromFilename(addon.filename);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${encodeURIComponent(slug)}`);
    }
  };

  const closeAddonModal = () => {
    setIsModalOpen(false);
    setSelectedAddon(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  const handleSubscribe = async (addon: AddonMetadata) => {
    // Send users to the BlenderBin trial/subscription
    if (!user) {
      router.push('/signup');
      return;
    }
    try {
      if (startingCheckout) return;
      setStartingCheckout(true);
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '';
      const res = await fetch('/api/checkout/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, priceId })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        router.push('/pricing/blenderbin');
      }
    } catch (e) {
      console.error('Subscribe error:', e);
      router.push('/pricing/blenderbin');
    } finally {
      setStartingCheckout(false);
    }
  };

  const handleBuyAddon = async (addon: AddonMetadata) => {
    const slug = baseNameFromFilename(addon.filename);
    try {
      const res = await fetch('/api/addons/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonSlug: slug,
          addonName: addon.name,
          userId: user?.uid || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Buy addon error:', e);
    }
  };

  if (loading) {
    return (
      <section className="relative min-h-screen bg-black px-4 py-24">
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading add-ons...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-black px-4 py-24">
      {/* Content container */}
      <div className="relative mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center mb-8">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl mb-6">
              BlenderBin
              <span className="block text-white">Add-ons</span>
            </h1>
            <p className="text-lg leading-relaxed text-zinc-300 max-w-2xl mx-auto">
              Discover our curated collection of professional Blender add-ons. 
              Each tool is crafted to enhance your workflow and boost productivity.
            </p>
          </div>

          {/* Stats and Category Filter */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="text-zinc-400 text-center">
              {error ? (
                <span className="text-red-400">Error loading add-ons</span>
              ) : (
                <span>{filteredAddons.length} add-on{filteredAddons.length !== 1 ? 's' : ''} available</span>
              )}
            </div>
            
            {/* Tier Filter */}
            <div className="flex justify-center">
              <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-full border border-zinc-800/50">
                {tiers.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedTier === tier
                        ? 'bg-white text-black'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-white text-black'
                      : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-3xl border border-red-800/50 bg-red-900/20 p-8 backdrop-blur-sm text-center mb-8">
            <h3 className="text-xl font-semibold text-red-300 mb-4">Unable to Load Add-ons</h3>
            <p className="text-red-400 mb-6">{error}</p>
            <button
              onClick={fetchAddons}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Addons Grid */}
        {!error && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAddons.map((addon, index) => (
              <div
                key={addon.filename}
                className="group rounded-3xl border border-zinc-800/50 bg-zinc-900 p-6 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50 hover:bg-zinc-900/80 hover:scale-[1.02] flex flex-col h-full cursor-pointer max-h-[28rem] md:max-h-[32rem] overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
                onClick={() => openAddonModal(addon)}
              >
                {/* Addon Media */}
                <div className="mb-4 rounded-2xl overflow-hidden border border-zinc-800/60 bg-black">
                  <video
                    className="w-full h-44 md:h-52 object-cover"
                    src={`/addons/${baseNameFromFilename(addon.filename)}.mp4`}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    onError={(e) => {
                      // If video missing, hide element gracefully
                      (e.currentTarget as HTMLVideoElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Addon Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-white leading-tight">
                          {addon.name}
                        </h3>
                        {addon.tier === 'premium' && (
                          <span className="px-2 py-1 text-xs bg-zinc-800/50 text-zinc-200 rounded-full border border-zinc-700 font-medium">
                            PRO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 text-xs bg-zinc-800/50 text-zinc-200 rounded-full border border-zinc-700">
                          v{addon.version}
                        </span>
                        <span className="px-2 py-1 text-xs bg-zinc-800/50 text-zinc-200 rounded-full border border-zinc-700">
                          {addon.category}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border font-medium bg-zinc-800/50 text-zinc-200 border-zinc-700`}>
                          {addon.tier === 'free' ? 'FREE' : 'PREMIUM'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-sm text-zinc-200 font-medium px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900/60">
                        {(() => {
                          const slug = baseNameFromFilename(addon.filename).toUpperCase();
                          const p = priceMap[slug];
                          if (!p || !p.amount) return '—';
                          const dollars = (p.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          const curr = (p.currency || 'usd').toUpperCase();
                          return `${curr === 'USD' ? '$' : ''}${dollars}${curr !== 'USD' ? ' ' + curr : ''}`;
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-zinc-300 text-sm leading-relaxed mb-4 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {addon.description}
                  </p>
                </div>

                {/* Addon Metadata - This will grow to fill available space */}
                <div className="space-y-2 mb-6 flex-grow">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <User className="h-3 w-3" />
                    <span>by {addon.author}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Tag className="h-3 w-3" />
                    <span>Blender {addon.blenderVersion}+</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Calendar className="h-3 w-3" />
                    <span>Updated {formatDate(addon.lastModified)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Download className="h-3 w-3" />
                    <span>{formatFileSize(addon.size)}</span>
                  </div>
                </div>

                {/* Subtle nudge to open card (psychology, not obvious) */}
                <div className="mt-auto text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500/60 group-hover:text-zinc-300/80 transition-colors">
                    Explore details
                    <svg className="h-3 w-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!error && !loading && filteredAddons.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">No Add-ons Found</h3>
            <p className="text-zinc-400 mb-6">
              {selectedCategory === 'All' && selectedTier === 'All'
                ? 'No add-ons are currently available.' 
                : `No add-ons found matching your filters${selectedCategory !== 'All' ? ` in "${selectedCategory}"` : ''}${selectedTier !== 'All' ? ` for ${selectedTier} tier` : ''}.`
              }
            </p>
            {(selectedCategory !== 'All' || selectedTier !== 'All') && (
              <div className="flex gap-3 justify-center">
                {selectedCategory !== 'All' && (
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                  >
                    Clear Category Filter
                  </button>
                )}
                {selectedTier !== 'All' && (
                  <button
                    onClick={() => setSelectedTier('All')}
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                  >
                    Clear Tier Filter
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* CTA Section */}
        {!error && filteredAddons.length > 0 && (
          <div className="mt-20 text-center">
            <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-8 md:p-12 backdrop-blur-sm">
              <h3 className="text-2xl font-semibold text-white mb-4">Get Full Access</h3>
              <p className="text-zinc-300 mb-8 leading-relaxed">
                {user 
                  ? 'Subscribe to BlenderBin to download all add-ons and get access to new releases, updates, and exclusive tools.'
                  : 'Sign up for BlenderBin to access our complete library of professional Blender add-ons.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <>
                    <Link 
                      href="/pricing/blenderbin"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105"
                    >
                      Start Free Trial
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Link 
                      href="/"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105 border border-zinc-700/50"
                    >
                      Learn More
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      href={`/signup?from=${encodeURIComponent('/addons')}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105"
                    >
                      Sign Up Free
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Link 
                      href="/pricing"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white px-8 py-4 font-medium transition-all duration-200 hover:scale-105 border border-zinc-700/50"
                    >
                      View Pricing
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subtle background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-0 h-96 w-96 rounded-full bg-blue-500/3 blur-3xl" />
          <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-purple-500/3 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-emerald-500/3 blur-3xl" />
        </div>
      </div>

      {/* Modal overlay for selected addon */}
      {isModalOpen && selectedAddon && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeAddonModal}
        >
          <div
            className="relative w-[92vw] max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-800/60 bg-zinc-900 p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Media */}
            <div className="mb-4 rounded-2xl overflow-hidden border border-zinc-800/60 bg-black">
              <video
                className="w-full h-[36vh] md:h-[42vh] object-cover"
                src={`/addons/${baseNameFromFilename(selectedAddon.filename)}.mp4`}
                autoPlay
                loop
                muted
                playsInline
                controls
                onError={(e) => {
                  (e.currentTarget as HTMLVideoElement).style.display = 'none';
                }}
              />
            </div>

            {/* Header */}
            <div className="mb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-semibold text-white leading-tight">
                      {selectedAddon.name}
                    </h3>
                    {selectedAddon.tier === 'premium' && (
                      <span className="px-2 py-1 text-xs bg-zinc-800/50 text-zinc-200 rounded-full border border-zinc-700 font-medium">
                        PRO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs bg-zinc-800/50 text-zinc-200 rounded-full border border-zinc-700">
                      v{selectedAddon.version}
                    </span>
                    <span className="px-2 py-1 text-xs bg-zinc-800/50 text-zinc-200 rounded-full border border-zinc-700">
                      {selectedAddon.category}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full border font-medium bg-zinc-800/50 text-zinc-200 border-zinc-700`}>
                      {selectedAddon.tier === 'free' ? 'FREE' : 'PREMIUM'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price in modal header */}
              <div className="flex items-center justify-end">
                <div className="text-sm text-zinc-200 font-medium px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900/60">
                  {(() => {
                    const slug = baseNameFromFilename(selectedAddon.filename).toUpperCase();
                    const p = priceMap[slug];
                    if (!p || !p.amount) return '—';
                    const dollars = (p.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const curr = (p.currency || 'usd').toUpperCase();
                    return `${curr === 'USD' ? '$' : ''}${dollars}${curr !== 'USD' ? ' ' + curr : ''}`;
                  })()}
                </div>
              </div>

              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                {selectedAddon.description}
              </p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400 mb-6">
              <div className="flex items-center gap-2"><User className="h-3 w-3" /><span>by {selectedAddon.author}</span></div>
              <div className="flex items-center gap-2"><Tag className="h-3 w-3" /><span>Blender {selectedAddon.blenderVersion}+</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /><span>Updated {formatDate(selectedAddon.lastModified)}</span></div>
              <div className="flex items-center gap-2"><Download className="h-3 w-3" /><span>{formatFileSize(selectedAddon.size)}</span></div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleSubscribe(selectedAddon); }}
                className="flex-1 rounded-full bg-white text-black hover:bg-zinc-100 py-2 px-4 text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-60"
                disabled={startingCheckout}
              >
                {startingCheckout ? 'Starting…' : 'Subscribe'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleBuyAddon(selectedAddon); }}
                className="flex-1 rounded-full bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 py-2 px-4 text-sm font-medium transition-all duration-200 hover:scale-105"
              >
                Buy This Addon
                {(() => {
                  const slug = baseNameFromFilename(selectedAddon.filename).toUpperCase();
                  const p = priceMap[slug];
                  if (!p || !p.amount) return null;
                  const dollars = (p.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const curr = (p.currency || 'usd').toUpperCase();
                  const label = `${curr === 'USD' ? '$' : ''}${dollars}${curr !== 'USD' ? ' ' + curr : ''}`;
                  return <span className="ml-2 text-zinc-300">— {label}</span>;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
} 