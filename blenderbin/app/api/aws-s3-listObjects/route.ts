import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export async function GET() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME as string,
      Prefix: process.env.AWS_FOLDER_PATH as string, // e.g., "addons/"
    });

    const response = await s3.send(command);

    if (!response.Contents) {
      return NextResponse.json({ files: [] });
    }

    // Filter and format the file names
    const files = response.Contents
      .map(file => {
        if (!file.Key) return null;
        
        // Remove the prefix path and file extension
        const fileName = file.Key
          .replace(process.env.AWS_FOLDER_PATH as string, '')
          .replace(/\.[^/.]+$/, ''); // Removes file extension
        
        // Skip empty names or folders
        if (!fileName || fileName.endsWith('/')) return null;
        
        return fileName;
      })
      .filter((fileName): fileName is string => fileName !== null);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('S3 Error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}