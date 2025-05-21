import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info, ArrowDownAZ, DollarSign, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { User } from 'firebase/auth';

interface ModelUsage {
  count: number;
  cost: number;
}

interface UsageEvent {
  id: string;
  model: string;
  requestCount: number;
  tokenCount: number;
  cost: number;
  timestamp: any;
}

interface Charge {
  id: string;
  amount: number;
  timestamp: any;
  status: string;
}

interface UsageData {
  month: string;
  currentBalance: number;
  models: Record<string, ModelUsage>;
  totalCost: number;
  totalCharged: number;
  remainingBalance: number;
  chargeHistory: Charge[];
  usageEvents: UsageEvent[];
  lastUpdated: any;
}

interface UsageBasedPricingProps {
  user: User | null;
  isEnabled: boolean;
}

const UsageBasedPricing: React.FC<UsageBasedPricingProps> = ({ user, isEnabled }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>('');
  
  // Format the month for display (YYYY-M to Month YYYY)
  const formatMonth = (monthString: string): string => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Get previous month
  const getPreviousMonth = (monthString: string): string => {
    const [year, month] = monthString.split('-').map(Number);
    const date = new Date(year, month - 2, 1); // month is 1-indexed, so subtract 2
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  };
  
  // Get next month
  const getNextMonth = (monthString: string): string => {
    const [year, month] = monthString.split('-').map(Number);
    const date = new Date(year, month, 1); // month is 1-indexed, so no need to add 1
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  };
  
  // Check if a month is in the future
  const isFutureMonth = (monthString: string): boolean => {
    const [year, month] = monthString.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const today = new Date();
    return date > today;
  };
  
  // Format model name for display
  const formatModelName = (model: string): string => {
    // Replace underscores with dots (used to make Firebase keys)
    const fixedModel = model.replace(/_/g, '.');
    
    // Map of model codes to display names
    const modelNames: Record<string, string> = {
      'gemini-2-5-pro-exp-max': 'Gemini 2.5 Pro (Experimental Max)',
      'o3': 'o3 request',
      'extra-fast-premium': 'Extra Fast Premium Request',
      'premium-tool-call': 'Premium Tool Call',
      'claude-3.7-sonnet-max': 'Claude 3.7 Sonnet Max',
      'claude-3.7-sonnet-thinking-max': 'Claude 3.7 Sonnet Thinking Max',
      'token-based-claude': 'Claude 3.7 Sonnet (Token-Based)'
    };
    
    return modelNames[fixedModel] || fixedModel;
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firestore timestamp objects
      const date = timestamp._seconds 
        ? new Date(timestamp._seconds * 1000) 
        : new Date(timestamp);
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };
  
  // Format currency amount
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };
  
  // Load usage data
  const loadUsageData = async (month: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Get the auth token
      const token = await user.getIdToken();
      
      const response = await axios.get(`/api/usage-data?month=${month}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setUsageData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load usage data');
      }
    } catch (err) {
      console.error('Error loading usage data:', err);
      setError('An error occurred while loading usage data');
    } finally {
      setLoading(false);
    }
  };
  
  // Initialize current month and load data
  useEffect(() => {
    const today = new Date();
    const thisMonth = `${today.getFullYear()}-${today.getMonth() + 1}`;
    setCurrentMonth(thisMonth);
    
    // Set a default empty structure for usageData to prevent undefined errors
    setUsageData({
      month: thisMonth,
      currentBalance: 0,
      models: {},
      totalCost: 0,
      totalCharged: 0,
      remainingBalance: 0,
      chargeHistory: [],
      usageEvents: [],
      lastUpdated: null
    });
    
    if (user && isEnabled) {
      loadUsageData(thisMonth);
    }
  }, [user, isEnabled]);
  
  // Handle month navigation
  const handlePreviousMonth = () => {
    const prevMonth = getPreviousMonth(currentMonth);
    setCurrentMonth(prevMonth);
    loadUsageData(prevMonth);
  };
  
  const handleNextMonth = () => {
    const nextMonth = getNextMonth(currentMonth);
    if (!isFutureMonth(nextMonth)) {
      setCurrentMonth(nextMonth);
      loadUsageData(nextMonth);
    }
  };
  
  if (!isEnabled) {
    return (
      <div className="bg-[#231b1b] border border-[#3d2929] rounded-md p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-red-500 mt-0.5">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="text-white text-lg font-medium mb-2">Usage-Based Pricing is Disabled</h3>
            <p className="text-gray-300 text-sm">
              To use AI beyond your subscription limits, enable usage-based pricing in the settings above.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-[#231b1b] border border-[#3d2929] rounded-md p-4">
        <div className="flex items-start gap-3">
          <div className="text-red-500 mt-0.5">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="text-white text-lg font-medium mb-2">Error Loading Usage Data</h3>
            <p className="text-gray-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!usageData) {
    return (
      <div className="bg-[#1b1f23] border border-[#2e3238] rounded-md p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 mt-0.5">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-white text-lg font-medium mb-2">No Usage Data Available</h3>
            <p className="text-gray-300 text-sm">
              When you use AI beyond your subscription limits, your usage and charges will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="text-3xl font-bold text-white">
              {formatCurrency(usageData.currentBalance)}
            </h3>
            <span className="text-gray-400 ml-2">
              current balance (will be charged at $20)
            </span>
          </div>
          
          <div className="text-sm text-gray-400">
            {usageData.lastUpdated && (
              <>Last updated: {formatTimestamp(usageData.lastUpdated)}</>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button 
            className="text-gray-300 p-1 rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="text-white font-medium">{formatMonth(currentMonth)}</span>
          
          <button 
            className="text-gray-300 p-1 rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={handleNextMonth}
            disabled={isFutureMonth(getNextMonth(currentMonth))}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Model Usage Breakdown */}
      <div className="space-y-2 text-sm">
        {Object.entries(usageData.models || {}).length > 0 ? (
          Object.entries(usageData.models || {}).map(([model, usage]) => (
            <div key={model} className="flex justify-between items-center">
              <span className="text-gray-300">{formatModelName(model)} ({usage.count} requests)</span>
              <span className="text-white">{formatCurrency(usage.cost)}</span>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-4">
            No model usage for this period
          </div>
        )}
        
        {usageData.chargeHistory?.length > 0 && (
          <>
            {usageData.chargeHistory.map(charge => (
              <div key={charge.id} className="flex justify-between items-center">
                <span className="text-gray-300">
                  Payment {formatTimestamp(charge.timestamp)}
                </span>
                <span className="text-green-500">-{formatCurrency(charge.amount)}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Recent Usage Events */}
      <div className="border-t border-gray-800 pt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Recent Usage Events</h3>
          <div className="flex items-center">
            <span className="text-gray-400 text-sm mr-1">
              Showing the last {usageData.usageEvents?.length || 0} events
            </span>
            <button className="text-gray-400">
              <Info size={16} />
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
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-gray-800">
              {usageData.usageEvents?.length > 0 ? (
                usageData.usageEvents.map(event => (
                  <tr key={event.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatModelName(event.model)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {event.tokenCount > 0 ? 'Token-based' : 'Request-based'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatCurrency(event.cost)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">
                    No usage events for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsageBasedPricing; 