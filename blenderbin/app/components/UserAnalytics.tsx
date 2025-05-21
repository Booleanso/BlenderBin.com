'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase-client';
import { BarChart, Activity, Calendar, Clock, Database, Cpu } from 'lucide-react';

// Simple Card Components
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-black ${className || ''}`}>
    {children}
  </div>
);

const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className || ''}`}>
    {children}
  </div>
);

const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className || ''}`}>
    {children}
  </h3>
);

const CardDescription = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <p className={`text-sm text-gray-500 dark:text-gray-400 ${className || ''}`}>
    {children}
  </p>
);

const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`p-6 pt-0 ${className || ''}`}>
    {children}
  </div>
);

// Simple Tabs Components
const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {},
});

const Tabs = ({ className, defaultValue, onValueChange, children }: { className?: string, defaultValue: string, onValueChange?: (value: string) => void, children: React.ReactNode }) => {
  const [value, setValue] = useState(defaultValue);
  
  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };
  
  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={`w-full ${className || ''}`} data-value={value}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`inline-flex items-center rounded-md bg-gray-100 p-1 dark:bg-gray-800 ${className || ''}`}>
    {children}
  </div>
);

const TabsTrigger = ({ className, value, children }: { className?: string, value: string, children: React.ReactNode }) => {
  const context = React.useContext(TabsContext);
  const isActive = context.value === value;
  
  return (
    <button 
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-sm dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300 dark:data-[state=active]:bg-gray-950 dark:data-[state=active]:text-gray-50 ${className || ''}`}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => context.onValueChange(value)}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ className, value, children }: { className?: string, value: string, children: React.ReactNode }) => {
  const context = React.useContext(TabsContext);
  const isActive = context.value === value;
  
  if (!isActive) {
    return null;
  }
  
  return (
    <div 
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300 ${className || ''}`}
      data-state={isActive ? 'active' : 'inactive'}
    >
      {children}
    </div>
  );
};

interface ModelUsage {
  model: string;
  count: number;
}

interface DailyCount {
  date: string;
  count: number;
}

interface ClientInfo {
  client_version?: number[] | string;
  blender_version?: string;
  platform?: string;
  session_id?: string;
}

interface AnalyticsData {
  total_queries: number;
  first_query_time?: any;
  last_query_time?: any;
  daily_counts: DailyCount[];
  model_usage: ModelUsage[];
  recent_queries: any[];
  sessions: any[];
  client_info: ClientInfo;
  platform: string;
}

const UserAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the current user
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }
        
        // Get the user's ID token
        const token = await currentUser.getIdToken();
        
        // Call our API endpoint with proper Authorization header
        const response = await fetch('/api/user-analytics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          // Handle HTTP errors properly
          const errorText = await response.text();
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
          } catch (e) {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Check if we have actual data before setting it
        if (data && data.data) {
          // Transform data if needed before setting state
          const transformedData = {
            ...data.data,
            // Ensure these arrays exist to prevent rendering errors
            daily_counts: data.data.daily_counts || [],
            model_usage: data.data.model_usage || [],
            recent_queries: data.data.recent_queries || [],
            sessions: data.data.sessions || [],
          };
          setAnalyticsData(transformedData);
        } else {
          throw new Error('No data received from server');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);
  
  // Format timestamp to readable date
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firestore Timestamp objects
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
  
  // Calculate days since first query
  const daysSinceFirstQuery = (): string => {
    if (!analyticsData?.first_query_time) return 'N/A';
    
    const firstQueryDate = analyticsData.first_query_time._seconds 
      ? new Date(analyticsData.first_query_time._seconds * 1000)
      : new Date(analyticsData.first_query_time);
      
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - firstQueryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays.toString();
  };
  
  // Get client information
  const getClientInfo = (): string => {
    if (!analyticsData?.client_info) return 'No client data available';
    
    const info = analyticsData.client_info;
    let clientVersion = 'Unknown';
    
    if (info.client_version) {
      if (Array.isArray(info.client_version)) {
        clientVersion = info.client_version.join('.');
      } else {
        clientVersion = info.client_version.toString();
      }
    }
    
    return `${info.blender_version || 'Unknown Blender'} on ${info.platform || 'Unknown platform'}`;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 bg-red-950 border border-red-800 rounded-lg">
        <h3 className="text-lg font-medium text-red-300">Error Loading Analytics</h3>
        <p className="text-red-400 mt-2">{error}</p>
        <p className="text-red-400 mt-2">
          No API usage data found. You may not have made any requests yet, or there might be an issue accessing your analytics.
        </p>
      </div>
    );
  }
  
  if (!analyticsData) {
    return (
      <div className="p-8 bg-gray-950 border border-gray-800 rounded-lg text-center">
        <h3 className="text-lg font-medium text-gray-300">No Analytics Data</h3>
        <p className="text-gray-400 mt-2">
          No API usage data found. Start using Gizmo AI in Blender to generate usage statistics.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-black border border-gray-800 rounded-lg p-1">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="usage"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            Usage Details
          </TabsTrigger>
          <TabsTrigger 
            value="sessions"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            Sessions
          </TabsTrigger>
          <TabsTrigger 
            value="models"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            Models Used
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-black border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <span>Total Queries</span>
                </CardTitle>
                <CardDescription>Lifetime API usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{analyticsData.total_queries}</div>
                {analyticsData.first_query_time && (
                  <p className="text-sm text-gray-400 mt-2">
                    First query: {formatDate(analyticsData.first_query_time)}
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-black border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <span>Last Activity</span>
                </CardTitle>
                <CardDescription>Most recent API usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium text-white">
                  {formatDate(analyticsData.last_query_time)}
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Using for {daysSinceFirstQuery()} days
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-black border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-purple-500" />
                  <span>Client</span>
                </CardTitle>
                <CardDescription>Latest client information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium text-white">
                  {getClientInfo()}
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Latest session: {analyticsData.sessions[0]?.session_id || 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-black border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-amber-500" />
                  <span>Most Used Models</span>
                </CardTitle>
                <CardDescription>Model popularity by usage count</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.model_usage.length > 0 ? (
                  <div className="space-y-4">
                    {analyticsData.model_usage.slice(0, 5).map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-gray-200">{item.model}</div>
                          <div className="text-gray-400">{item.count} queries</div>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (item.count / analyticsData.total_queries) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">No model usage data available</div>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-black border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span>Recent Usage</span>
                </CardTitle>
                <CardDescription>Last 30 days activity</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.daily_counts.length > 0 ? (
                  <div className="h-60 flex items-end gap-1">
                    {analyticsData.daily_counts.slice(-14).map((day, index) => {
                      // Find max count for scaling
                      const maxCount = Math.max(...analyticsData.daily_counts.map(d => d.count as number));
                      const percentage = maxCount > 0 ? (day.count as number) / maxCount : 0;
                      const barHeight = Math.max(4, percentage * 100); // Minimum 4% height for visibility
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-blue-600 rounded-t"
                            style={{ height: `${barHeight}%` }}
                          ></div>
                          <div className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-8">No daily usage data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="usage" className="mt-6">
          <Card className="bg-black border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Recent Queries</CardTitle>
              <CardDescription>Last {analyticsData.recent_queries.length} queries submitted</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.recent_queries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Timestamp</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Model</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Prompt Length</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.recent_queries.slice().reverse().map((query, index) => (
                        <tr key={index} className="border-b border-gray-800">
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {formatDate(query.timestamp)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {query.model || 'Unknown'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {query.prompt_length} chars
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">No query data available</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-black border-gray-800 mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Daily Usage Breakdown</CardTitle>
              <CardDescription>API usage by date</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.daily_counts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Queries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.daily_counts.slice().reverse().map((day, index) => (
                        <tr key={index} className="border-b border-gray-800">
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              year: 'numeric',
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {day.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">No daily usage data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sessions" className="mt-6">
          <Card className="bg-black border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
              <CardDescription>Last {analyticsData.sessions.length} Blender sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.sessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Session ID</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Last Activity</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Queries</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Platform</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.sessions.map((session, index) => (
                        <tr key={index} className="border-b border-gray-800">
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {session.session_id}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {formatDate(session.last_activity)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {session.query_count || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {session.platform || 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">No session data available</div>
              )}
            </CardContent>
          </Card>
          
          {analyticsData.sessions.length > 0 && analyticsData.sessions[0]?.scene_complexity && (
            <Card className="bg-black border-gray-800 mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Scene Complexity</CardTitle>
                <CardDescription>Details about your Blender scenes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analyticsData.sessions.slice(0, 1).map((session, index) => {
                    const complexity = session.scene_complexity || {};
                    return (
                      <React.Fragment key={index}>
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="text-sm text-gray-400">Objects</div>
                          <div className="text-2xl font-bold text-white">{complexity.object_count || 0}</div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="text-sm text-gray-400">Collections</div>
                          <div className="text-2xl font-bold text-white">{complexity.collection_count || 0}</div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="text-sm text-gray-400">Materials</div>
                          <div className="text-2xl font-bold text-white">{complexity.material_count || 0}</div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="text-sm text-gray-400">Has Active Object</div>
                          <div className="text-2xl font-bold text-white">
                            {complexity.has_active_object ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="models" className="mt-6">
          <Card className="bg-black border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Model Usage Breakdown</CardTitle>
              <CardDescription>AI models used in your queries</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.model_usage.length > 0 ? (
                <>
                  <div className="flex space-x-2 pb-8">
                    {analyticsData.model_usage.slice(0, 5).map((model, index) => {
                      const totalQueries = analyticsData.total_queries;
                      const percentage = totalQueries > 0 
                        ? Math.round((model.count as number) / totalQueries * 100) 
                        : 0;
                      
                      // Color based on index
                      const colors = [
                        'bg-blue-600', 'bg-green-600', 'bg-purple-600', 
                        'bg-amber-600', 'bg-red-600'
                      ];
                      
                      return (
                        <div 
                          key={index}
                          className="flex-1 text-center p-2"
                        >
                          <div className={`h-full rounded-t-lg ${colors[index % colors.length]}`}
                               style={{ height: `${percentage * 2}px` }}>
                          </div>
                          <div className="text-white font-bold mt-2">{percentage}%</div>
                          <div className="text-xs text-gray-400 truncate">{model.model}</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Model</th>
                          <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Queries</th>
                          <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.model_usage.map((model, index) => {
                          const percentage = analyticsData.total_queries > 0 
                            ? ((model.count as number) / analyticsData.total_queries * 100).toFixed(1) 
                            : '0';
                          
                          return (
                            <tr key={index} className="border-b border-gray-800">
                              <td className="py-3 px-4 text-sm text-gray-300">
                                {model.model}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-300">
                                {model.count}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-300">
                                {percentage}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-center py-8">No model usage data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserAnalytics; 