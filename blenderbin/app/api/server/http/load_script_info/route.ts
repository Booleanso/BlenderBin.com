import { NextRequest, NextResponse } from 'next/server'
import { 
  validateApiKey,
  verifyFirebaseToken,
  s3Client,
  config,
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

  try {
    await verifyFirebaseToken(firebaseToken)
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: String(error)
    }, { status: 401 })
  }

  const data = await request.json()
  const { script_path } = data

  try {
    const getCommand = new GetObjectCommand({
      Bucket: config.S3_BUCKET_NAME,
      Key: script_path
    })
    
    const response = await s3Client.send(getCommand)
    const scriptContent = await response.Body?.transformToString()
    
    if (!scriptContent) {
      return NextResponse.json({
        status: "error",
        message: "Failed to load script content"
      }, { status: 500 })
    }

    // Extract script icon variables
    const iconUrlMatch = scriptContent.match(/SCRIPT_ICON_URL\s*=\s*"(.*?)"/)
    const iconPathMatch = scriptContent.match(/SCRIPT_ICON_PATH\s*=\s*"(.*?)"/)
    const iconNameMatch = scriptContent.match(/SCRIPT_ICON_NAME\s*=\s*"(.*?)"/)

    const scriptIconUrl = iconUrlMatch ? iconUrlMatch[1] : ""
    const scriptIconPath = iconPathMatch ? iconPathMatch[1] : ""
    const scriptIconName = iconNameMatch ? iconNameMatch[1] : ""

    return NextResponse.json({
      status: "success",
      script_icon_url: scriptIconUrl,
      script_icon_path: scriptIconPath,
      script_icon_name: scriptIconName,
      s3_bucket_name: config.S3_BUCKET_NAME
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: String(error)
    }, { status: 500 })
  }
} 