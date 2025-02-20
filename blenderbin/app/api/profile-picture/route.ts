import { NextResponse } from 'next/server';
import { generateSignedDownloadUrl } from '@/app/lib/S3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const url = await generateSignedDownloadUrl(
      process.env.AWS_S3_BUCKET!,
      `FRONTEND/USERS/PROFILE_PICTURES/${encodeURIComponent(email)}`,
      3600 // URL expires in 1 hour
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating profile picture URL:', error);
    return NextResponse.json({ error: 'Failed to get profile picture' }, { status: 500 });
  }
} 