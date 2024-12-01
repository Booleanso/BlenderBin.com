// app/api/list-files/route.ts
import { NextResponse } from 'next/server';
import { listFiles } from '../../lib/S3';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'premium';
    
    // Determine the folder path based on the type
    const folderPath = type === 'premium' 
      ? process.env.AWS_PREMIUM_FOLDER_PATH 
      : process.env.AWS_FREE_FOLDER_PATH;

    const files = await listFiles(
      process.env.AWS_BUCKET_NAME!,
      folderPath!
    );

    return NextResponse.json({ files });
  } catch (error) {
    console.error('S3 Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' }, 
      { status: 500 }
    );
  }
}