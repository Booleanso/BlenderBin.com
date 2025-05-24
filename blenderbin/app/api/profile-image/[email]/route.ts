import { NextRequest, NextResponse } from 'next/server';
import { generateSignedDownloadUrl } from '@/app/lib/S3';
import fs from 'fs';
import path from 'path';

// Cache for default profile image
let defaultProfileImageCache: Buffer | null = null;

// Function to get the default profile image
async function getDefaultProfileImage() {
  if (defaultProfileImageCache) {
    return defaultProfileImageCache;
  }
  
  try {
    // Path to the default profile image in the public directory
    const imagePath = path.join(process.cwd(), 'public', 'default-profile.svg');
    const imageBuffer = await fs.promises.readFile(imagePath);
    defaultProfileImageCache = imageBuffer;
    return imageBuffer;
  } catch (error) {
    console.error('Error reading default profile image:', error);
    // Return a simple SVG as fallback
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="#ccc"/>
      <circle cx="50" cy="40" r="15" fill="#fff"/>
      <path d="M25,85 C25,65 75,65 75,85" fill="#fff"/>
    </svg>`;
    return Buffer.from(fallbackSvg);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    
    if (!email) {
      // Return default profile image if no email is provided
      const defaultImage = await getDefaultProfileImage();
      return new NextResponse(defaultImage, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    console.log('Fetching profile image for email:', email);
    
    // Generate the S3 key
    const key = `FRONTEND/USERS/PROFILE_PICTURES/${email}`;
    console.log('S3 key:', key);

    try {
      // Get the signed URL
      const signedUrl = await generateSignedDownloadUrl(
        process.env.AWS_BUCKET_NAME!,
        key,
        3600 // URL expires in 1 hour
      );

      // Fetch the image from S3 using the signed URL
      const imageResponse = await fetch(signedUrl);
      
      if (!imageResponse.ok) {
        console.log('Profile image not found for email:', email);
        // Return default profile image if the S3 image is not found
        const defaultImage = await getDefaultProfileImage();
        return new NextResponse(defaultImage, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // Get the image data and content type
      const imageData = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

      // Return the image directly
      return new NextResponse(imageData, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.log('Error fetching profile image, returning default image:', error);
      // Return default profile image if there's an error
      const defaultImage = await getDefaultProfileImage();
      return new NextResponse(defaultImage, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch (error) {
    console.log('Error in profile image route, returning default image:', error);
    // Return default profile image if there's an error
    const defaultImage = await getDefaultProfileImage();
    return new NextResponse(defaultImage, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
} 