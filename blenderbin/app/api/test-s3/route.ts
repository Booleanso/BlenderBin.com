import { NextResponse } from 'next/server';
import { s3Client } from '@/app/lib/S3';
import { ListBucketsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    // Log environment variables for debugging (without exposing secrets)
    console.log('AWS Region from env:', process.env.AWS_REGION);
    console.log('AWS Bucket Name from env:', process.env.AWS_BUCKET_NAME);
    console.log('AWS Access Key ID available:', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('AWS Secret Access Key available:', !!process.env.AWS_SECRET_ACCESS_KEY);

    // Test S3 connection by listing buckets
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    return NextResponse.json({
      success: true,
      message: 'S3 connection successful',
      buckets: response.Buckets?.map(bucket => bucket.Name) || [],
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME
    });
  } catch (error) {
    console.error('Error testing S3 connection:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME
    }, { status: 500 });
  }
} 