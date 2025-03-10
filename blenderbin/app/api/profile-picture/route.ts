import { NextResponse } from 'next/server';
import { generateSignedDownloadUrl } from '@/app/lib/S3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // Log the request for debugging
    console.log('Generating profile picture URL for email:', email);
    console.log('Using S3 bucket:', process.env.AWS_BUCKET_NAME);
    console.log('Using AWS region:', process.env.AWS_REGION);

    // The email is already URL-encoded in the key
    const key = `FRONTEND/USERS/PROFILE_PICTURES/${email}`;
    console.log('S3 key:', key);

    try {
      const url = await generateSignedDownloadUrl(
        process.env.AWS_BUCKET_NAME!,
        key,
        3600 // URL expires in 1 hour
      );

      console.log('Generated signed URL:', url);
      return NextResponse.json({ url });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      
      // Try with double-encoded email as a fallback
      // This is because the email might have been double-encoded during upload
      console.log('Trying with double-encoded email as fallback');
      const doubleEncodedKey = `FRONTEND/USERS/PROFILE_PICTURES/${encodeURIComponent(email)}`;
      console.log('Fallback S3 key:', doubleEncodedKey);
      
      try {
        const url = await generateSignedDownloadUrl(
          process.env.AWS_BUCKET_NAME!,
          doubleEncodedKey,
          3600 // URL expires in 1 hour
        );
        
        console.log('Generated fallback signed URL:', url);
        return NextResponse.json({ url });
      } catch (fallbackError) {
        console.error('Error generating fallback signed URL:', fallbackError);
        throw error; // Throw the original error
      }
    }
  } catch (error) {
    console.error('Error generating profile picture URL:', error);
    return NextResponse.json({ error: 'Failed to get profile picture' }, { status: 500 });
  }
} 