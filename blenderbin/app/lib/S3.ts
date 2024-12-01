// lib/S3.ts
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function generateSignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn: number = 300
) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
}

export async function listFiles(bucket: string, prefix: string) {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });

  try {
    const response = await s3Client.send(command);
    
    if (!response.Contents) {
      return [];
    }

    // Filter and format the file names
    return response.Contents
      .map(file => {
        if (!file.Key) return null;
        
        // Remove the prefix path and file extension
        const fileName = file.Key
          .replace(prefix, '')
          .replace(/\.[^/.]+$/, ''); // Removes file extension
        
        // Skip empty names or folders
        if (!fileName || fileName.endsWith('/')) return null;
        
        return fileName;
      })
      .filter((fileName): fileName is string => fileName !== null);
  } catch (error) {
    console.error("Error listing files:", error);
    throw error;
  }
}

export { s3Client };