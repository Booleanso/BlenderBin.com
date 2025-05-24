import { NextRequest, NextResponse } from 'next/server'
import { 
  validateApiKey, 
  verifyFirebaseToken, 
  validateS3Path,
  s3Client,
  config,
  autoInitializeFirebase,
  firebaseInitialized,
  db
} from '../shared'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

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
  let folderPaths = data.folder_paths || data.folder_path
  
  if (!folderPaths) {
    return NextResponse.json({
      status: "error",
      message: "No folder paths provided"
    }, { status: 400 })
  }
  
  // Convert to array if string
  if (typeof folderPaths === 'string') {
    folderPaths = [folderPaths]
  }
  
  // Validate all paths
  for (const path of folderPaths) {
    if (typeof path !== 'string') {
      return NextResponse.json({
        status: "error",
        message: `Invalid path type: ${typeof path}`
      }, { status: 400 })
    }
    
    if (!validateS3Path(path)) {
      return NextResponse.json({
        status: "error",
        message: `Invalid path format: ${path}`
      }, { status: 400 })
    }
    
    // Additional security check for development folder
    if (path.includes('DEVELOPMENT')) {
      try {
        const decodedToken = await verifyFirebaseToken(firebaseToken)
        const userQuery = await db.collection('customers')
          .where('email', '==', decodedToken.email)
          .limit(1)
          .get()
        
        if (userQuery.empty || !userQuery.docs[0].data()?.developer) {
          folderPaths = folderPaths.filter((p: string) => !p.includes('DEVELOPMENT'))
        }
      } catch (error) {
        console.error('Error checking developer status:', error)
        folderPaths = folderPaths.filter((p: string) => !p.includes('DEVELOPMENT'))
      }
    }
  }
  
  try {
    const results: { [key: string]: string[] } = {}
    
    for (const folderPath of folderPaths) {
      const listCommand = new ListObjectsV2Command({
        Bucket: config.S3_BUCKET_NAME,
        Prefix: folderPath
      })
      
      const response = await s3Client.send(listCommand)
      const scripts = (response.Contents || [])
        .filter(item => item.Key?.endsWith('.py'))
        .map(item => item.Key!)
      
      results[folderPath] = scripts
    }
    
    console.log('Found scripts in folders:', results)
    return NextResponse.json({
      status: "success",
      scripts: results
    })
    
  } catch (error) {
    console.error('Error getting scripts:', error)
    return NextResponse.json({
      status: "error",
      message: String(error)
    }, { status: 500 })
  }
} 