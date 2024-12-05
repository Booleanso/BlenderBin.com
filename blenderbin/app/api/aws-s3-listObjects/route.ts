import { NextResponse } from 'next/server';
import { listFiles } from '../../lib/S3';

export async function GET() {
  try {
    const [premiumFiles, freeFiles] = await Promise.all([
      listFiles(
        process.env.AWS_BUCKET_NAME!,
        process.env.AWS_PREMIUM_FOLDER_PATH!
      ),
      listFiles(
        process.env.AWS_BUCKET_NAME!,
        process.env.AWS_FREE_FOLDER_PATH!
      )
    ]);

    return NextResponse.json({
      premium: premiumFiles,
      free: freeFiles
    });
  } catch (error) {
    console.error('S3 Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}