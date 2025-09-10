import { NextRequest } from 'next/server'
import { verifyFirebaseToken, autoInitializeFirebase } from '../../server/http/shared'

// GitHub repository constants (same as parent route)
const GITHUB_OWNER = "WebRendHQ"
const GITHUB_REPO = "BlenderBin-Launcher"
const GITHUB_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/version.json`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('session_id')
    const tokenQueryParam = searchParams.get('token')

    if (!userId && !sessionId) {
      return new Response(JSON.stringify({ error: 'Authentication required. Please sign in or provide a valid session.' }), { status: 401 })
    }

    const authHeader = request.headers.get('Authorization')
    let token = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (tokenQueryParam && tokenQueryParam.length > 50) {
      // Safari fallback: token via query param
      token = tokenQueryParam
    }
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication token required for BlenderBin download.' }), { status: 401 })
    }

    // Ensure Firebase initialized and token valid
    const initialized = await autoInitializeFirebase()
    if (!initialized) {
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }), { status: 503 })
    }
    await verifyFirebaseToken(token)

    // Get latest version information
    const versionResp = await fetch(GITHUB_VERSION_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'BlenderBin-Downloader'
      },
      cache: 'no-store'
    })
    if (!versionResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to load version info' }), { status: 502 })
    }
    const versionData = await versionResp.json()
    let version: string = versionData.version
    if (!version.startsWith('v')) version = 'v' + version

    // Build download URL
    const downloadUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/raw/main/releases/recommended/${version}/BlenderBin.zip`

    // Stream the ZIP through our server with strict headers
    const upstream = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'BlenderBin-Downloader' },
      cache: 'no-store'
    })
    if (!upstream.ok || !upstream.body) {
      // Fallback to alternative URL
      const altUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/releases/recommended/${version}/BlenderBin.zip`
      const alt = await fetch(altUrl, { headers: { 'User-Agent': 'BlenderBin-Downloader' }, cache: 'no-store' })
      if (!alt.ok || !alt.body) {
        return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 })
      }
      return new Response(alt.body, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="BlenderBin.zip"',
          'Content-Transfer-Encoding': 'binary',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept-Ranges': 'bytes'
        }
      })
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="BlenderBin.zip"',
        'Content-Transfer-Encoding': 'binary',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept-Ranges': 'bytes'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}


