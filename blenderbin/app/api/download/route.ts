// app/api/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken, autoInitializeFirebase } from '../server/http/shared';
import axios from 'axios';

// GitHub repository constants
const GITHUB_OWNER = "WebRendHQ";
const GITHUB_REPO = "BlenderBin-Launcher";
const GITHUB_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/version.json`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('session_id');

    // Require either userId or session_id
    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in or provide a valid session.' },
        { status: 401 }
      );
    }

    // Verify authentication token if provided
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication token required for BlenderBin download.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Add debugging to see what we're working with
    console.log('Received token (first 50 chars):', token.substring(0, 50) + '...');
    console.log('Token length:', token.length);
    
    try {
      // Initialize Firebase before token verification
      console.log('Ensuring Firebase is initialized...');
      const firebaseInitialized = await autoInitializeFirebase();
      if (!firebaseInitialized) {
        console.error('Failed to initialize Firebase');
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
      
      // Verify token and get user subscription info
      const decodedToken = await verifyFirebaseToken(token);
      
      // Determine user tier (allow all authenticated users to download)
      let userTier = "free";
      if (decodedToken.is_developer) {
        userTier = "developer";
      } else if (decodedToken.has_blenderbin_subscription) {
        userTier = "pro"; // Could be business, but pro is sufficient for downloads
      }
      
      console.log(`Download authorized for user ${decodedToken.uid} with tier: ${userTier}`);
      
    } catch (error) {
      console.error('Token verification failed:', error);
      console.error('Token being verified (first 50 chars):', token.substring(0, 50) + '...');
      return NextResponse.json(
        { error: 'Invalid authentication token.' },
        { status: 401 }
      );
    }

    // Fetch version information from GitHub
    const versionResponse = await axios.get(GITHUB_VERSION_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'BlenderBin-Downloader'
      }
    });
    
    const versionData = versionResponse.data;
    let version = versionData.version;
    
    // Ensure version starts with 'v'
    if (!version.startsWith('v')) {
      version = 'v' + version;
    }
    
    // Construct the download URL
    const downloadUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/raw/main/releases/recommended/${version}/BlenderBin.zip`;
    
    // Verify the URL is valid
    try {
      await axios.head(downloadUrl, {
        headers: {
          'User-Agent': 'BlenderBin-Downloader'
        }
      });
    } catch {
      // Try alternative URL format if the first one fails
      const alternativeUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/releases/recommended/${version}/BlenderBin.zip`;
      
      // Return the alternative URL without checking (client will handle any 404s)
      return NextResponse.json({ downloadUrl: alternativeUrl });
    }

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}