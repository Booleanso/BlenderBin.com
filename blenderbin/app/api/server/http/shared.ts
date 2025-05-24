import { NextRequest } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'crypto'
import { gzip } from 'zlib'
import { promisify } from 'util'

// Types
export interface DeviceQueue {
  [deviceId: string]: {
    messages: any[]
    waitingResolvers: Array<(value: any) => void>
    put: (message: any) => void
    get: (timeout?: number) => Promise<any>
  }
}

export interface AuthResult {
  status: string
  message?: string
  idToken?: string
}

export interface EncryptionResult {
  status: string
  encrypted_data?: string
  encryption_type?: string
  compressed?: boolean
  message?: string
}

export interface ClickData {
  status: string
  script_clicks?: { [key: string]: number }
  total_clicks?: number
  message?: string
}

// Global state
export let db: any = null
export let firebaseInitialized = false
export const deviceQueues: DeviceQueue = {}
export const deviceEvents: { [key: string]: boolean } = {}

export const EC2_SERVER_URL = "https://ec2-3-12-129-190.us-east-2.compute.amazonaws.com:5000"

// Environment variables
export const config = {
  S3_BUCKET_NAME: process.env.AWS_BUCKET_NAME!,
  STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY!,
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY!,
  APP_SECRET_KEY: process.env.APP_SECRET_KEY!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
  AWS_REGION: process.env.AWS_REGION || 'us-east-2'
}

// AWS S3 Client
export const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 2
})

// Utility functions
export const gzipAsync = promisify(gzip)

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key')
  return apiKey === config.APP_SECRET_KEY
}

export function validateS3Path(path: string): boolean {
  if (typeof path !== 'string') return false
  if (path.includes('..') || path.startsWith('/')) return false
  return true
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input
  return input.replace(/[;<>&`|]/g, '')
}

export async function encryptAndCompressData(data: Buffer, secretKey: Buffer): Promise<EncryptionResult> {
  try {
    // Compress the data
    const compressedData = await gzipAsync(data)
    
    // Generate random salt and IV
    const salt = randomBytes(16)
    const iv = randomBytes(16)
    
    // Derive key using PBKDF2
    const key = pbkdf2Sync(secretKey, salt, 100000, 32, 'sha256')
    
    // Generate keystream for encryption
    function generateKeystream(key: Buffer, iv: Buffer, length: number): Buffer {
      const result: Buffer[] = []
      let counter = 0
      let currentLength = 0
      
      while (currentLength < length) {
        const counterBytes = Buffer.alloc(8)
        counterBytes.writeBigUInt64LE(BigInt(counter), 0)
        
        const hash = createHash('sha256')
        hash.update(key)
        hash.update(iv)
        hash.update(counterBytes)
        const h = hash.digest()
        
        result.push(h)
        currentLength += h.length
        counter++
      }
      
      return Buffer.concat(result).subarray(0, length)
    }
    
    // Encrypt using XOR with keystream
    const keystream = generateKeystream(key, iv, compressedData.length)
    const ciphertext = Buffer.alloc(compressedData.length)
    
    for (let i = 0; i < compressedData.length; i++) {
      ciphertext[i] = compressedData[i] ^ keystream[i]
    }
    
    // Generate HMAC for authenticity
    const hmacValue = createHmac('sha256', key)
      .update(iv)
      .update(ciphertext)
      .digest()
    
    // Combine salt + HMAC + IV + ciphertext
    const finalData = Buffer.concat([salt, hmacValue, iv, ciphertext])
    
    // Encode for transmission
    const encodedData = finalData.toString('base64')
    
    return {
      status: "success",
      encrypted_data: encodedData,
      encryption_type: "STREAM-CIPHER-HMAC-IV",
      compressed: true
    }
  } catch (error) {
    console.error('Encryption error:', error)
    return { status: "error", message: String(error) }
  }
}

export async function downloadServiceAccountKey(bucketName: string) {
  try {
    // List objects in bucket to find JSON file
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName
    })
    
    const response = await s3Client.send(listCommand)
    const serviceAccountKeyFile = response.Contents?.find(obj => obj.Key?.endsWith('.json'))?.Key
    
    if (!serviceAccountKeyFile) {
      return {
        status: "failure",
        message: "No service account key file found in the S3 bucket."
      }
    }

    // Download the JSON file
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: serviceAccountKeyFile
    })
    
    const getResponse = await s3Client.send(getCommand)
    const jsonContent = await getResponse.Body?.transformToString()
    
    if (!jsonContent) {
      return {
        status: "failure",
        message: "Failed to read service account key file"
      }
    }

    const serviceAccountKeyJson = JSON.parse(jsonContent)
    return {
      status: "success",
      data: serviceAccountKeyJson
    }
  } catch (error: any) {
    return {
      status: "failure",
      message: `Error downloading service account key: ${error.message}`
    }
  }
}

export async function initializeFirebase(serviceAccountKeyJson: any) {
  try {
    if (!firebaseInitialized) {
      // Check if Firebase is already initialized
      if (getApps().length === 0) {
        initializeApp({
          credential: cert(serviceAccountKeyJson)
        })
      }
      db = getFirestore()
      firebaseInitialized = true
    }
    return { status: "success", message: "Firebase initialized." }
  } catch (error) {
    return { status: "failure", message: String(error) }
  }
}

export async function autoInitializeFirebase(): Promise<boolean> {
  try {
    if (!firebaseInitialized) {
      console.log("Starting Firebase initialization...")
      const serviceAccountKey = await downloadServiceAccountKey(config.S3_BUCKET_NAME)
      console.log(`Service account key response:`, serviceAccountKey)
      
      if (serviceAccountKey.status !== 'success') {
        console.log(`Failed to download service account key: ${serviceAccountKey.message}`)
        return false
      }
      
      // Initialize Firebase with retry logic
      const maxRetries = 3
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await initializeFirebase(serviceAccountKey.data)
          console.log(`Firebase initialization attempt ${attempt + 1} result:`, result)
          
          if (result.status === 'success') {
            // Verify database connection
            try {
              await db.collection('test').doc('test').get()
              console.log("Database connection verified")
              return true
            } catch (error) {
              console.log(`Database connection test failed: ${error}`)
            }
          }
          
          if (attempt < maxRetries - 1) {
            console.log(`Retrying initialization in ${2 ** attempt} seconds...`)
            await new Promise(resolve => setTimeout(resolve, (2 ** attempt) * 1000))
          }
        } catch (error) {
          console.log(`Error during initialization attempt ${attempt + 1}: ${error}`)
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, (2 ** attempt) * 1000))
          }
        }
      }
      
      console.log("Failed to initialize Firebase after all retries")
      return false
    }
    
    return firebaseInitialized
  } catch (error) {
    console.log(`Error during Firebase initialization: ${error}`)
    return false
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    console.log(`Starting authentication for ${email}`)
    const payload = {
      email: email,
      password: password,
      returnSecureToken: true
    }
    
    console.log("Making request to Firebase authentication endpoint...")
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )
    
    console.log(`Firebase auth response status: ${response.status}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.log('Firebase error response:', errorData)
      return {
        status: "error",
        message: `HTTPError: ${response.status} - Firebase error: ${errorData.error?.message || 'No error message'}`
      }
    }
    
    const data = await response.json()
    console.log("Successfully received idToken")
    return { status: "success", idToken: data.idToken }
  } catch (error: any) {
    console.log(`Unexpected error during authentication: ${error.message}`)
    return { status: "error", message: error.message }
  }
}

export function getScriptVersionHash(scriptContent: Buffer | string): string {
  try {
    const contentBytes = Buffer.isBuffer(scriptContent) 
      ? scriptContent 
      : Buffer.from(scriptContent, 'utf-8')
    return createHash('sha256').update(contentBytes).digest('hex')
  } catch (error) {
    console.error('Error generating version hash:', error)
    return ''
  }
}

export async function updateClickCount(scriptPath: string, deviceId: string) {
  if (!db) {
    return { status: "error", message: "Firebase not initialized" }
  }
  
  try {
    const currentDate = new Date().toISOString().split('T')[0]
    const scriptRef = db.collection('script_clicks').doc(scriptPath)
    const totalRef = db.collection('script_clicks').doc('total')

    // Update script-specific clicks
    const scriptDoc = await scriptRef.get()
    if (!scriptDoc.exists) {
      await scriptRef.set({
        clicks: 1,
        unique_users: [deviceId],
        daily_clicks: { [currentDate]: [deviceId] },
        weekly_clicks: { [currentDate]: [deviceId] }
      })
    } else {
      const scriptData = scriptDoc.data()
      const updatedData = {
        clicks: (scriptData.clicks || 0) + 1,
        unique_users: scriptData.unique_users || []
      }
      
      if (!updatedData.unique_users.includes(deviceId)) {
        updatedData.unique_users.push(deviceId)
      }

      // Update daily clicks
      const dailyClicks = scriptData.daily_clicks || {}
      if (!dailyClicks[currentDate]) {
        dailyClicks[currentDate] = []
      }
      if (!dailyClicks[currentDate].includes(deviceId)) {
        dailyClicks[currentDate].push(deviceId)
      }

      // Update weekly clicks
      const weeklyClicks = scriptData.weekly_clicks || {}
      if (!weeklyClicks[currentDate]) {
        weeklyClicks[currentDate] = []
      }
      if (!weeklyClicks[currentDate].includes(deviceId)) {
        weeklyClicks[currentDate].push(deviceId)
      }

      await scriptRef.set({
        ...updatedData,
        daily_clicks: dailyClicks,
        weekly_clicks: weeklyClicks
      })
    }

    // Update total clicks
    const totalDoc = await totalRef.get()
    if (!totalDoc.exists) {
      await totalRef.set({ total_clicks: 1 })
    } else {
      const totalData = totalDoc.data()
      await totalRef.set({ total_clicks: (totalData.total_clicks || 0) + 1 })
    }

    return { status: "success", message: "Click data updated" }
  } catch (error) {
    return { status: "error", message: String(error) }
  }
}

export async function verifyFirebaseToken(token: string) {
  try {
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)
    
    // Add subscription check results
    const email = decodedToken.email
    console.log(`=== SUBSCRIPTION DEBUG START for ${decodedToken.uid} (${email}) ===`)
    
    if (email && db) {
      decodedToken.has_subscription = false
      decodedToken.has_blenderbin_subscription = false
      decodedToken.has_gizmo_subscription = false
      
      try {
        console.log(`Looking for customer with email: ${email}`)
        const userQuery = await db.collection('customers')
          .where('email', '==', email)
          .limit(1)
          .get()
        
        console.log(`Customer query result: ${userQuery.empty ? 'NO RESULTS' : 'FOUND CUSTOMER'}`)
        
        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0]
          const userData = userDoc.data() || {}
          console.log(`Customer ID: ${userDoc.id}`)
          console.log(`Customer data keys:`, Object.keys(userData))
          
          // Check if user is a developer
          const isDeveloper = userData.developer === true
          decodedToken.is_developer = isDeveloper
          console.log(`Developer status: ${isDeveloper}`)
          
          if (isDeveloper) {
            decodedToken.has_subscription = true
            decodedToken.has_blenderbin_subscription = true
            decodedToken.has_gizmo_subscription = true
            console.log(`DEVELOPER ACCESS GRANTED`)
          } else {
            // Check subscriptions for regular users
            // Include BOTH production and test price IDs for BlenderBin
            const blenderBinPriceIds = [
              process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,           // Production monthly
              process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID,    // Production yearly
              process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID,      // Test monthly  
              process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID // Test yearly
            ].filter(Boolean) // Remove undefined values
            
            console.log(`BlenderBin Price IDs (Production + Test):`, blenderBinPriceIds)
            
            // Gizmo price IDs
            const gizmoPriceIds = [
              // Gizmo Production Price IDs
              process.env.NEXT_PUBLIC_GIZMO_STRIPE_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_PRICE_ID,
              // Gizmo Test Price IDs
              process.env.NEXT_PUBLIC_GIZMO_STRIPE_TEST_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_YEARLY_STRIPE_TEST_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_TEST_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_TEST_PRICE_ID,
            ].filter(Boolean) // Remove undefined values
            
            console.log(`Gizmo Price IDs:`, gizmoPriceIds)
            
            // Check for active subscriptions (including trials)
            const customerRef = db.collection('customers').doc(userDoc.id)
            const subscriptionsRef = customerRef.collection('subscriptions')
            
            console.log(`Checking subscriptions in: customers/${userDoc.id}/subscriptions`)
            
            const activeSubs = await subscriptionsRef
              .where('status', 'in', ['trialing', 'active'])
              .get()
            
            console.log(`Found ${activeSubs.docs.length} active/trialing subscriptions`)
            
            let activeBlenderBinSubscription = false
            let activeGizmoSubscription = false
            
            for (const sub of activeSubs.docs) {
              const subData = sub.data()
              console.log(`Processing subscription ${sub.id}:`, {
                status: subData.status,
                hasItems: !!subData.items,
                hasPriceId: !!subData.price?.id,
                itemsCount: subData.items?.length || 0
              })
              
              // Users get subscription access during both trial and active periods
              if (['trialing', 'active'].includes(subData.status)) {
              
                // Check specific price IDs for BlenderBin
              if (subData.items) {
                  console.log(`Checking ${subData.items.length} subscription items:`)
                for (const item of subData.items) {
                  const priceData = item.price || {}
                    console.log(`  Item price ID: ${priceData.id}`)
                    if (blenderBinPriceIds.includes(priceData.id)) {
                      activeBlenderBinSubscription = true
                      console.log(`✅ Found BlenderBin subscription: ${priceData.id}, status: ${subData.status}`)
                    } else if (gizmoPriceIds.includes(priceData.id)) {
                      activeGizmoSubscription = true
                      console.log(`✅ Found Gizmo subscription: ${priceData.id}, status: ${subData.status}`)
                    } else {
                      console.log(`❓ Unknown price ID: ${priceData.id}`)
                  }
                }
              } else if (subData.price?.id) {
                  // Legacy format support
                  console.log(`Checking legacy price format: ${subData.price.id}`)
                  if (blenderBinPriceIds.includes(subData.price.id)) {
                    activeBlenderBinSubscription = true
                    console.log(`✅ Found legacy BlenderBin subscription: ${subData.price.id}, status: ${subData.status}`)
                  } else if (gizmoPriceIds.includes(subData.price.id)) {
                    activeGizmoSubscription = true
                    console.log(`✅ Found legacy Gizmo subscription: ${subData.price.id}, status: ${subData.status}`)
                  } else {
                    console.log(`❓ Unknown legacy price ID: ${subData.price.id}`)
                  }
                } else {
                  console.log(`⚠️  Subscription has no price ID in items or price field`)
                }
                
                // Log trial information if applicable
                if (subData.status === 'trialing') {
                  const trialEnd = subData.trial_end?.toDate?.() || subData.trial_end
                  if (trialEnd) {
                    const now = new Date()
                    const daysRemaining = Math.ceil((new Date(trialEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    console.log(`📅 Trial subscription: ${daysRemaining} days remaining, ends: ${trialEnd}`)
                  }
                }
              } else {
                console.log(`❌ Subscription status not active/trialing: ${subData.status}`)
              }
            }
            
            decodedToken.has_blenderbin_subscription = activeBlenderBinSubscription
            decodedToken.has_gizmo_subscription = activeGizmoSubscription
            
            // For AI access: grant access if user has EITHER BlenderBin OR Gizmo subscription
            // BlenderBin includes AI features, and Gizmo is specifically for AI
            decodedToken.has_subscription = activeBlenderBinSubscription || activeGizmoSubscription
            
            console.log(`FINAL RESULTS:`)
            console.log(`  BlenderBin subscription: ${activeBlenderBinSubscription}`)
            console.log(`  Gizmo subscription: ${activeGizmoSubscription}`)
            console.log(`  Combined AI access: ${decodedToken.has_subscription}`)
            
            if (decodedToken.has_subscription) {
              console.log(`✅ User has valid subscription access - BlenderBin: ${activeBlenderBinSubscription}, Gizmo: ${activeGizmoSubscription}`)
            } else {
              console.log(`❌ User has no valid subscriptions`)
            }
          }
        } else {
          console.log(`❌ No customer found with email: ${email}`)
        }
      } catch (error) {
        console.error('❌ Error checking subscription:', error)
      }
    } else {
      console.log(`❌ No email in token or database not available`)
    }
    
    console.log(`=== SUBSCRIPTION DEBUG END ===`)
    
    return decodedToken
  } catch (error) {
    throw new Error(`Invalid Firebase token: ${error}`)
  }
}

// Queue implementation to match Python's Queue behavior
export function createQueue() {
  const messages: any[] = []
  const waitingResolvers: Array<(value: any) => void> = []
  
  return {
    messages,
    waitingResolvers,
    put: (message: any) => {
      if (waitingResolvers.length > 0) {
        const resolve = waitingResolvers.shift()!
        resolve(message)
      } else {
        messages.push(message)
      }
    },
    get: (timeout: number = 30000): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (messages.length > 0) {
          const message = messages.shift()
          resolve(message)
        } else {
          waitingResolvers.push(resolve)
          
          // Set timeout to reject if no message comes
          setTimeout(() => {
            const index = waitingResolvers.indexOf(resolve)
            if (index > -1) {
              waitingResolvers.splice(index, 1)
              reject(new Error('Queue timeout'))
            }
          }, timeout)
        }
      })
    }
  }
} 