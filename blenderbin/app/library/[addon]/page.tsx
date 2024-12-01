'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function AddonPage() {
  const params = useParams();
  const addonName = params.addon as string;

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