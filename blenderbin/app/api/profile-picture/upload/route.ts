import { NextResponse } from 'next/server';
import { s3Client } from '@/app/lib/S3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@/app/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Get the file data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Log the request for debugging
    console.log('Uploading profile picture for email:', email);
    console.log('Using S3 bucket:', process.env.AWS_BUCKET_NAME);
    console.log('Using AWS region:', process.env.AWS_REGION);

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    
    // Use the email directly without URL encoding it again
    // The S3 key should match what we use in the GET route
    const fileName = `FRONTEND/USERS/PROFILE_PICTURES/${email}`;
    console.log('S3 key for upload:', fileName);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: fileName,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
    });

    await s3Client.send(command);
    console.log('File uploaded successfully to S3');

    // Generate the URL for the uploaded image
    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    console.log('Generated image URL:', imageUrl);

    return NextResponse.json({ 
      success: true, 
      message: 'Profile picture uploaded successfully',
      url: imageUrl
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json({ 
      error: 'Failed to upload profile picture',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 