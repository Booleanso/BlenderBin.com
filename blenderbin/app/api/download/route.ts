// app/api/download/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

// GitHub repository constants
const GITHUB_OWNER = "WebRendHQ";
const GITHUB_REPO = "BlenderBin-Launcher";
const GITHUB_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/version.json`;

export async function GET(request: Request) {
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