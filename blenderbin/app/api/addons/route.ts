import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Cache for storing addon data
let addonCache: {
  data: any[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface AddonMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  blenderVersion: string;
  filename: string;
  size: number;
  lastModified: Date;
  tier: 'free' | 'premium';
}

// Function to extract metadata from Python file content
function extractPythonMetadata(content: string, filename: string): Partial<AddonMetadata> {
  const lines = content.split('\n');
  const metadata: Partial<AddonMetadata> = {
    filename: filename,
  };

  // Extract bl_info dictionary
  const blInfoMatch = content.match(/bl_info\s*=\s*{([\s\S]+?)}/);
  if (blInfoMatch) {
    const blInfoContent = blInfoMatch[1];
    
    // Extract name
    const nameMatch = blInfoContent.match(/"name"\s*:\s*"([^"]+)"/);
    if (nameMatch) metadata.name = nameMatch[1];
    
    // Extract description
    const descMatch = blInfoContent.match(/"description"\s*:\s*"([^"]+)"/);
    if (descMatch) metadata.description = descMatch[1];
    
    // Extract version
    const versionMatch = blInfoContent.match(/"version"\s*:\s*\(([^)]+)\)/);
    if (versionMatch) {
      const versionNumbers = versionMatch[1].split(',').map(n => n.trim());
      metadata.version = versionNumbers.join('.');
    }
    
    // Extract author
    const authorMatch = blInfoContent.match(/"author"\s*:\s*"([^"]+)"/);
    if (authorMatch) metadata.author = authorMatch[1];
    
    // Extract category
    const categoryMatch = blInfoContent.match(/"category"\s*:\s*"([^"]+)"/);
    if (categoryMatch) metadata.category = categoryMatch[1];
    
    // Extract Blender version
    const blenderMatch = blInfoContent.match(/"blender"\s*:\s*\(([^)]+)\)/);
    if (blenderMatch) {
      const blenderNumbers = blenderMatch[1].split(',').map(n => n.trim());
      metadata.blenderVersion = blenderNumbers.join('.');
    }
  }

  // Also look for standalone DESCRIPTION variable
  const descriptionMatch = content.match(/DESCRIPTION\s*=\s*["']([^"']+)["']/);
  if (descriptionMatch && !metadata.description) {
    metadata.description = descriptionMatch[1];
  }

  // Fallback to filename if no name found
  if (!metadata.name) {
    metadata.name = filename.replace(/\.py$/, '').replace(/_/g, ' ');
  }

  // Fallback description
  if (!metadata.description) {
    metadata.description = `A Blender addon: ${metadata.name}`;
  }

  return metadata;
}

// Function to fetch addon data from S3
async function fetchAddonsFromS3(): Promise<AddonMetadata[]> {
  try {
    const bucketName = process.env.AWS_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('AWS_BUCKET_NAME environment variable is not set');
    }

    const addons: AddonMetadata[] = [];

    // Define the addon directories to fetch from
    const addonDirectories = [
      { prefix: 'BACKEND/ADDON_LIBRARY/FREE_ADDONS/', tier: 'free' as const },
      { prefix: 'BACKEND/ADDON_LIBRARY/PREMIUM_ADDONS/', tier: 'premium' as const }
    ];

    // Fetch addons from each directory
    for (const directory of addonDirectories) {
      console.log(`Fetching addons from ${directory.prefix}...`);
      
      // List all Python files in the current directory
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: directory.prefix,
        MaxKeys: 100,
      });

      const listResponse = await s3Client.send(listCommand);
      const pythonFiles = listResponse.Contents?.filter(obj => 
        obj.Key?.endsWith('.py') && !obj.Key.includes('__pycache__')
      ) || [];

      console.log(`Found ${pythonFiles.length} Python files in ${directory.prefix}`);

      // Process each Python file
      for (const file of pythonFiles) {
        if (!file.Key) continue;

        try {
          // Get file content
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: file.Key,
          });

          const response = await s3Client.send(getCommand);
          const content = await response.Body?.transformToString() || '';
          
          // Extract metadata
          const filename = file.Key.split('/').pop() || '';
          const metadata = extractPythonMetadata(content, filename);

          // Create complete addon object
          const addon: AddonMetadata = {
            name: metadata.name || filename.replace('.py', ''),
            description: metadata.description || 'No description available',
            version: metadata.version || '1.0.0',
            author: metadata.author || 'Unknown',
            category: metadata.category || 'General',
            blenderVersion: metadata.blenderVersion || '3.0.0',
            filename: filename,
            size: file.Size || 0,
            lastModified: file.LastModified || new Date(),
            tier: directory.tier, // Set tier based on directory
          };

          addons.push(addon);
          console.log(`Processed ${directory.tier} addon: ${addon.name}`);
        } catch (error) {
          console.error(`Error processing file ${file.Key}:`, error);
          // Continue with next file
        }
      }
    }

    console.log(`Total addons fetched: ${addons.length}`);
    return addons.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching addons from S3:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();

    // Check if we have valid cached data
    if (addonCache && (now - addonCache.timestamp) < CACHE_DURATION) {
      console.log('Returning cached addon data');
      return NextResponse.json({
        success: true,
        addons: addonCache.data,
        cached: true,
        cacheAge: Math.floor((now - addonCache.timestamp) / 1000),
      });
    }

    console.log('Fetching fresh addon data from S3');
    
    // Fetch fresh data
    const addons = await fetchAddonsFromS3();

    // Update cache
    addonCache = {
      data: addons,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      addons: addons,
      cached: false,
      count: addons.length,
    });

  } catch (error) {
    console.error('Addons API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch addons',
        addons: [],
      },
      { status: 500 }
    );
  }
} 