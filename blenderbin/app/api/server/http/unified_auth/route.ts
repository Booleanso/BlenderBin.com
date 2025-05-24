import { NextRequest, NextResponse } from 'next/server'
import { 
  validateApiKey,
  authenticateUser,
  verifyFirebaseToken,
  encryptAndCompressData,
  createQueue,
  deviceQueues,
  deviceEvents,
  s3Client,
  config,
  autoInitializeFirebase,
  firebaseInitialized,
  db
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

  const data = await request.json()
  const { email, password, device_id } = data
  
  console.log(`Starting unified authentication for device: ${device_id}`)
  
  if (!email || !password || !device_id) {
    return NextResponse.json({
      status: 'error',
      message: 'Missing required fields',
      has_subscription: false
    }, { status: 400 })
  }
  
  // Force Firebase initialization with retries if needed
  const retries = 3
  for (let attempt = 0; attempt < retries; attempt++) {
    if (!firebaseInitialized || !db) {
      console.log(`Firebase initialization attempt ${attempt + 1}/${retries}`)
      const initResult = await autoInitializeFirebase()
      if (!initResult) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }
      break
    }
  }
  
  if (!firebaseInitialized || !db) {
    console.log("Firebase database not initialized")
    return NextResponse.json({
      status: "error",
      message: "Database connection not available. Please try again."
    }, { status: 500 })
  }
  
  try {
    // Step 1: Authenticate user with Firebase
    console.log(`Attempting Firebase authentication for email: ${email}`)
    const authResult = await authenticateUser(email, password)
    console.log(`Authentication result:`, authResult)
    
    if (authResult.status !== 'success') {
      return NextResponse.json(authResult, { status: 401 })
    }

    // Get the Firebase ID token
    const firebaseToken = authResult.idToken
    if (!firebaseToken) {
      console.log("Failed to get Firebase token")
      return NextResponse.json({
        status: "error",
        message: "Failed to get Firebase token"
      }, { status: 500 })
    }

    // Add a small delay after getting the token
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Verify token and get user info
    let decodedToken
    const maxRetries = 3
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Verifying Firebase token attempt ${i + 1}/${maxRetries}`)
        decodedToken = await verifyFirebaseToken(firebaseToken)
        console.log(`Token verified successfully for UID: ${decodedToken.uid}`)
        break
      } catch (error) {
        console.log(`Token verification error: ${error}`)
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        return NextResponse.json({
          status: "error",
          message: `Token verification failed: ${error}`
        }, { status: 401 })
      }
    }
    
    // Ensure decodedToken is defined
    if (!decodedToken) {
      return NextResponse.json({
        status: "error",
        message: "Failed to verify Firebase token"
      }, { status: 401 })
    }
    
    // Step 2: Get user document
    console.log("Querying Firestore for user document...")
    const userQuery = await db.collection('customers')
      .where('email', '==', email)
      .limit(1)
      .get()
    
    if (userQuery.empty) {
      console.log(`No user document found for email: ${email}`)
      return NextResponse.json({
        status: 'error',
        message: 'User not found',
        has_subscription: false
      }, { status: 404 })
    }
    
    const userDoc = userQuery.docs[0]
    const userData = userDoc.data() || {}
    console.log(`Found user document: ${userDoc.id}`)
    
    // Check if user is a developer and handle developer script
    let developerScript = null
    if (userData.developer === true) {
      console.log("User is a developer, processing developer script...")
      try {
        const getCommand = new GetObjectCommand({
          Bucket: config.S3_BUCKET_NAME,
          Key: 'BACKEND/BLENDERBIN/DEVELOPMENT/BLENDERBIN_ADDON/TEST_PANEL.py'
        })
        
        const scriptResponse = await s3Client.send(getCommand)
        const scriptContent = await scriptResponse.Body?.transformToByteArray()
        
        if (scriptContent) {
          // Encrypt and compress script
          const encryptionResult = await encryptAndCompressData(
            Buffer.from(scriptContent),
            Buffer.from("rvh2imWO5XWSihxLbWRt6Daxg8ju9MUwHFbqo3VSYN0=")
          )
          
          if (encryptionResult.status === "success") {
            developerScript = encryptionResult
            console.log("Developer script processed successfully")
          }
        }
      } catch (error) {
        console.log(`Error processing developer script: ${error}`)
      }
    }
    
    // Step 3: Handle device verification
    console.log("Performing device verification...")
    const existingDeviceId = userData.device_id
    let deviceSwitched = false
    
    if (!existingDeviceId) {
      console.log(`Registering new device: ${device_id}`)
      await userDoc.ref.update({ device_id })
    } else if (existingDeviceId !== device_id) {
      console.log(`Device switch detected: ${existingDeviceId} -> ${device_id}`)
      await userDoc.ref.update({ device_id })
      deviceSwitched = true
      
      // Send logout event to old device if connected
      if (existingDeviceId in deviceQueues) {
        console.log(`Sending logout event to previous device: ${existingDeviceId}`)
        deviceQueues[existingDeviceId].put({
          type: "logout",
          message: "Another device has logged into this account"
        })
      }
    }
    
    // Step 4: Set up device queue
    if (!(device_id in deviceQueues)) {
      console.log(`Setting up event queue for device: ${device_id}`)
      deviceQueues[device_id] = createQueue()
      deviceEvents[device_id] = true
    }
    
    const responseData = {
      status: "success",
      message: "Authentication and device verification successful",
      has_subscription: decodedToken.has_subscription || false,
      firebase_token: firebaseToken,
      device_switched: deviceSwitched,
      previous_device: deviceSwitched ? existingDeviceId : null,
      sse_url: `/api/server/http/device_events/${device_id}`,
      ...(developerScript || {})
    }
    
    console.log("Authentication process completed successfully")
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.log(`Error in unified authentication: ${error}`)
    return NextResponse.json({
      status: "error",
      message: String(error),
      has_subscription: false
    }, { status: 500 })
  }
} 