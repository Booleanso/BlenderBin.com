import { NextRequest, NextResponse } from 'next/server'
import { 
  validateApiKey,
  verifyFirebaseToken,
  encryptAndCompressData,
  getScriptVersionHash,
  updateClickCount,
  s3Client,
  autoInitializeFirebase,
  firebaseInitialized
} from '../shared'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export async function POST(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { status: "error", message: "Invalid API key" },
      { status: 401 }
    )
  }

  // Initialize Firebase if not already done
  if (!firebaseInitialized) {
    await autoInitializeFirebase()
  }

  // Verify Firebase token
  const firebaseToken = request.headers.get('Firebase-Token')
  if (!firebaseToken) {
    return NextResponse.json({
      status: "error",
      message: "No Firebase token provided"
    }, { status: 401 })
  }

  let decodedToken
  try {
    decodedToken = await verifyFirebaseToken(firebaseToken)
    console.log(`Token verified for user ${decodedToken.uid}:`, {
      has_subscription: decodedToken.has_subscription || false,
      has_blenderbin_subscription: decodedToken.has_blenderbin_subscription || false,
      is_developer: decodedToken.is_developer || false
    })
  } catch (error) {
    console.error('Token verification failed:', error)
    return NextResponse.json({
      status: "error",
      message: String(error)
    }, { status: 401 })
  }

  const data = await request.json()
  const { bucket, key, device_id, current_hash } = data

  if (!bucket || !key || !device_id) {
    return NextResponse.json({
      status: "error",
      message: "Missing required parameters: bucket, key, or device_id"
    }, { status: 400 })
  }
  
  // Check premium content access
  if (key.toLowerCase().includes("premium")) {
    const hasBlenderBinSubscription = decodedToken.has_blenderbin_subscription || false
    const isDeveloper = decodedToken.is_developer || false
    
    console.log(`Premium script download requested - User: ${decodedToken.uid}, BlenderBin subscription: ${hasBlenderBinSubscription}, Developer: ${isDeveloper}`)
    
    if (!hasBlenderBinSubscription && !isDeveloper) {
      console.log(`Premium script access denied for user ${decodedToken.uid}: No BlenderBin subscription`)
      return NextResponse.json({
        status: "error",
        message: "BlenderBin subscription required to download premium add-ons",
        requires_subscription: true,
        redirectUrl: "/pricing/blenderbin",
        debug: {
          hasBlenderBin: hasBlenderBinSubscription,
          isDeveloper: isDeveloper,
          scriptType: "premium_addon"
        }
      }, { status: 403 })
    }
    
    console.log(`Premium script access granted for user ${decodedToken.uid}`)
  }

  try {
    // Download script content
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })
    
    const response = await s3Client.send(getCommand)
    const scriptContent = await response.Body?.transformToByteArray()
    
    if (!scriptContent) {
      return NextResponse.json({
        status: "error",
        message: "Failed to download script content"
      }, { status: 500 })
    }

    // Generate new version hash
    const newHash = getScriptVersionHash(Buffer.from(scriptContent))
    
    // If client provided current hash and it matches, return early
    if (current_hash && current_hash === newHash) {
      return NextResponse.json({
        status: "success",
        message: "Script is up to date",
        version_hash: newHash,
        unchanged: true
      })
    }

    // Update click count
    const clickResult = await updateClickCount(key, device_id)
    if (clickResult.status !== "success") {
      console.warn(`Warning: Failed to update click count: ${clickResult.message}`)
    }
    
    // Encrypt and compress the script
    const result = await encryptAndCompressData(
      Buffer.from(scriptContent),
      Buffer.from("rvh2imWO5XWSihxLbWRt6Daxg8ju9MUwHFbqo3VSYN0=")
    )
    
    if (result.status === "success") {
      return NextResponse.json({
        ...result,
        version_hash: newHash
      })
    } else {
      return NextResponse.json({
        status: "error",
        message: result.message || "Encryption failed"
      }, { status: 500 })
    }
    
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: String(error)
    }, { status: 500 })
  }
} 