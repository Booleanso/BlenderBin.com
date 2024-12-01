'use client';

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../../lib/firebase-client';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useParams } from 'next/navigation';

export default function AddonPage() {
  const params = useParams();
  const addonName = params.addon as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to view this addon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">{addonName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-600">
                Details for {addonName} addon.
              </p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">Installation</h2>
              <p className="text-gray-600">
                Installation instructions for {addonName}.
              </p>
            </div>

            <button
              onClick={() => {
                // Here you can add logic to download or view the file from S3
                console.log(`Download ${addonName}`);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
            >
              Download
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}