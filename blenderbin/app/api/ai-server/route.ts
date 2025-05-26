import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import * as zlib from 'zlib';
import { promisify } from 'util';
// Add Firebase Admin SDK imports
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { verifyFirebaseToken } from '../server/http/shared';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // Check if the service account key is provided as an environment variable
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Analytics will not be recorded.');
      // Initialize with a default config to prevent errors, but analytics won't work
      initializeApp({
        projectId: 'blenderbin-default'
      });
    } else {
      // Parse the service account key JSON
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        
        // Verify the required fields are present
        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
          throw new Error('Service account key is missing required fields');
        }
        
        // Initialize with the service account
        initializeApp({
          credential: cert(serviceAccount),
        });
        console.log(`Firebase Admin initialized successfully for project: ${serviceAccount.project_id}`);
      } catch (parseError) {
        console.error('Error parsing Firebase service account key:', parseError);
        console.error('Make sure FIREBASE_SERVICE_ACCOUNT_KEY contains a valid JSON string');
        
        // Initialize with a default config to prevent errors
        initializeApp({
          projectId: 'blenderbin-default'
        });
      }
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    console.error('Analytics functionality will be disabled');
  }
}

// Get Firestore instance with error handling
let db: FirebaseFirestore.Firestore;
try {
  db = getFirestore();
  console.log('Firestore instance created successfully');
} catch (error) {
  console.error('Error getting Firestore instance:', error);
  // Create a mock db object to prevent errors when trying to record analytics
  db = {
    collection: () => ({
      doc: () => ({
        set: async () => {},
        update: async () => {},
        get: async () => ({ exists: false }),
      }),
    }),
    runTransaction: async (callback: (transaction: any) => Promise<any>) => {
      await callback({ 
        get: async () => ({ exists: false }),
        set: async () => {},
        update: async () => {},
      });
    },
  } as any;
  console.warn('Using mock Firestore instance - analytics will not be recorded');
}

// Function to record API usage in Firestore
async function recordApiUsage(userId: string, model: string, prompt: string, analytics?: any, sceneInfo?: any) {
  try {
    if (!userId) {
      console.log('No user ID provided, skipping usage tracking');
      return;
    }
    
    const now = Timestamp.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyKey = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Update user's API usage document
    const userUsageRef = db.collection('api_usage').doc(userId);
    
    // Prepare additional analytics data if available
    const clientInfo = analytics ? {
      client_version: analytics.client_version || [],
      blender_version: analytics.blender_version || "",
      platform: analytics.platform || "",
      session_id: analytics.session_id || "",
    } : {};
    
    // Prepare scene complexity data if available
    const sceneComplexity = analytics?.scene_complexity ? {
      object_count: analytics.scene_complexity.object_count || 0,
      collection_count: analytics.scene_complexity.collection_count || 0,
      material_count: analytics.scene_complexity.material_count || 0,
      has_active_object: analytics.scene_complexity.has_active_object || false,
    } : {};
    
    // Create a transaction to ensure atomic updates
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userUsageRef);
      
      if (userDoc.exists) {
        // Update existing document
        transaction.update(userUsageRef, {
          total_queries: FieldValue.increment(1),
          last_query_time: now,
          [`daily_counts.${dailyKey}`]: FieldValue.increment(1),
          [`model_usage.${model}`]: FieldValue.increment(1),
          queries: FieldValue.arrayUnion({
            timestamp: now,
            model: model,
            prompt_length: prompt.length,
            client_info: clientInfo,
            scene_complexity: sceneComplexity,
            // Don't store the full prompt for privacy, just metadata
          }),
        });
        
        // Update client information if available
        if (Object.keys(clientInfo).length > 0) {
          transaction.update(userUsageRef, {
            client_info: clientInfo,
            platform: analytics.platform || '',
          });
        }
      } else {
        // Create new document
        transaction.set(userUsageRef, {
          user_id: userId,
          total_queries: 1,
          first_query_time: now,
          last_query_time: now,
          daily_counts: {
            [dailyKey]: 1
          },
          model_usage: {
            [model]: 1
          },
          queries: [{
            timestamp: now,
            model: model,
            prompt_length: prompt.length,
            client_info: clientInfo,
            scene_complexity: sceneComplexity,
          }],
          client_info: clientInfo,
          platform: analytics?.platform || '',
        });
      }
    });
    
    // Also update a detailed sessions collection for deeper analytics
    if (analytics?.session_id) {
      const sessionRef = db.collection('api_sessions').doc(analytics.session_id);
      await sessionRef.set({
        user_id: userId,
        session_id: analytics.session_id,
        last_activity: now,
        query_count: FieldValue.increment(1),
        client_info: clientInfo,
        platform: analytics.platform || '',
        scene_complexity: sceneComplexity,
      }, { merge: true });
    }
    
    // Also update an aggregate stats document
    const statsRef = db.collection('analytics').doc('api_stats');
    await statsRef.set({
      total_queries: FieldValue.increment(1),
      [`model_counts.${model}`]: FieldValue.increment(1),
      [`platform_counts.${analytics?.platform || 'unknown'}`]: FieldValue.increment(1),
      last_updated: now,
    }, { merge: true });
    
    console.log(`Recorded API usage for user ${userId} using model ${model}`);
  } catch (error) {
    console.error('Error recording API usage to Firestore:', error);
    // Don't throw error - this is non-critical
  }
}

// Promisify zlib functions
const zlibInflate = promisify(zlib.inflate);
const zlibDeflate = promisify(zlib.deflate);

// Type definitions
interface ChatMessage {
  role: string;
  content: string;
}

interface ResponseBlock {
  type: string;
  text?: string;
}

interface CompressedPayload {
  compressed: boolean;
  format: string;
  data: string;
}

// Compression/decompression utility functions
async function decompressData(payload: CompressedPayload): Promise<any> {
  try {
    if (!payload.compressed) {
      return payload;
    }
    
    const buffer = Buffer.from(payload.data, 'base64');
    const decompressed = await zlibInflate(buffer);
    return JSON.parse(decompressed.toString('utf8'));
  } catch (error) {
    console.error('Error decompressing data:', error);
    return payload; // Return original payload on error
  }
}

async function compressData(data: any): Promise<CompressedPayload> {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = await zlibDeflate(Buffer.from(jsonString, 'utf8'));
    const base64Data = compressed.toString('base64');
    
    return {
      compressed: true,
      format: 'zlib+base64',
      data: base64Data
    };
  } catch (error) {
    console.error('Error compressing data:', error);
    return { compressed: false, format: 'none', data: JSON.stringify(data) };
  }
}

// Global memory storage (note: this will reset on server redeploys)
const chatMemory: ChatMessage[] = [];
let lastExecution: any = null;
let lastSuccessfulCode: string | null = null;

// Freemium user tracking (using IP + session as identifier)
// This is a simple in-memory store - will reset on server restart
// For production, this should be moved to a database
interface FreemiumUser {
  ip: string;
  sessionId: string;
  queryCount: number;
  lastQuery: Date;
  firstQuery: Date;
}

// Define subscription tier limits
const SUBSCRIPTION_LIMITS = {
  free: 20,           // Free accounts (no subscription)
  pro: 200,           // Pro subscription
  business: 999999,   // Business subscription (effectively unlimited)
  developer: 999999   // Developer accounts (effectively unlimited)
};

const freemiumUsers: Record<string, FreemiumUser> = {};

// Max queries per day for freemium users
const FREEMIUM_DAILY_LIMIT = 20;

// Function to get or create a freemium user record
function getFreemiumUser(ip: string, sessionId: string): FreemiumUser {
  const key = `${ip}:${sessionId}`;
  
  if (!freemiumUsers[key]) {
    // Create new user record
    freemiumUsers[key] = {
      ip,
      sessionId,
      queryCount: 0,
      lastQuery: new Date(),
      firstQuery: new Date()
    };
  }
  
  // Check if it's a new day - reset counter if needed
  const user = freemiumUsers[key];
  const now = new Date();
  const lastQueryDay = user.lastQuery.getDate();
  const today = now.getDate();
  
  if (lastQueryDay !== today || 
      user.lastQuery.getMonth() !== now.getMonth() || 
      user.lastQuery.getFullYear() !== now.getFullYear()) {
    console.log(`Resetting freemium user ${key} - new day`);
    user.queryCount = 0;
  }
  
  return user;
}

// Function to update freemium user query count
function updateFreemiumUser(ip: string, sessionId: string): [boolean, string] {
  const user = getFreemiumUser(ip, sessionId);
  
  // Check if user has reached daily limit
  if (user.queryCount >= FREEMIUM_DAILY_LIMIT) {
    return [false, `Daily limit of ${FREEMIUM_DAILY_LIMIT} queries reached. Please sign in or upgrade for more.`];
  }
  
  // Update user data
  user.queryCount += 1;
  user.lastQuery = new Date();
  
  // Return success
  return [true, `Query ${user.queryCount}/${FREEMIUM_DAILY_LIMIT} for today`];
}

// Configuration
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GOOGLE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Default model
const DEFAULT_MODEL = "claude-3-5-sonnet-20240620";

// API Keys - make sure these are set in your environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

// Model provider mapping
const MODEL_PROVIDERS = {
  // Claude models
  "claude-3-7-sonnet-20240709": "anthropic",
  "claude-3-5-sonnet-20240620": "anthropic",
  "claude-3-opus-20240229": "anthropic",
  "claude-3-sonnet-20240229": "anthropic",
  "claude-3-haiku-20240307": "anthropic",
  
  // OpenAI models
  "gpt-4o": "openai",
  "gpt-4-turbo": "openai",
  "gpt-3.5-turbo": "openai",
  
  // Google models
  "gemini-pro": "google"
};

// Helper functions
function sanitizeResponse(response: any) {
  const sanitized: any = {};
  
  try {
    // Ensure content is a valid string
    if ('content' in response) {
      let content = response.content;
      if (typeof content !== 'string') {
        content = String(content);
      }
      
      // Ensure valid UTF-8
      sanitized.content = content;
    } else {
      sanitized.content = "";
    }
      
    // Ensure type is a valid string
    if ('type' in response) {
      let typeVal = response.type;
      if (typeof typeVal !== 'string') {
        typeVal = String(typeVal);
      }
      sanitized.type = typeVal;
    } else {
      sanitized.type = "text";
    }
      
    return sanitized;
  } catch (e) {
    console.error(`Error sanitizing response: ${e}`);
    // Return a safe fallback
    return {
      content: `Error processing response: ${String(e)}`,
      type: "error"
    };
  }
}

// Extract code from text
function extractCodeFromText(text: string): string {
  if (!text || typeof text !== 'string') {
    return "";
  }
    
  // Prioritize Python code blocks (```python...```)
  try {
    if (text.includes("```python")) {
      const parts = text.split("```python", 2);
      if (parts.length > 1 && parts[1].includes("```")) {
        const code = parts[1].split("```", 1)[0].trim();
        return code;
      }
    }
  } catch (e) {
    console.warn(`Error extracting Python code block: ${e}`);
  }
      
  // Secondary: Look for code with language specifier at start of block
  try {
    if (text.includes("```")) {
      const splitParts = text.split("```", 2);
      if (splitParts.length > 1) {
        const parts = splitParts[1].split("\n", 2);
        if (parts.length > 1) {
          const langHint = parts[0].trim().toLowerCase();
          if (["py", "python", "python3", "blender"].includes(langHint)) {
            const codeText = parts[1];
            if (codeText.includes("```")) {
              const code = codeText.split("```", 1)[0].trim();
              return code;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Error extracting language-specific code block: ${e}`);
  }
      
  // Try regular code blocks (```...```)
  try {
    if (text.includes("```")) {
      const splitParts = text.split("```", 2);
      if (splitParts.length > 1 && splitParts[1].includes("```")) {
        const code = splitParts[1].split("```", 1)[0].trim();
        
        // Check if it looks like Python
        const pythonIndicators = [
          "import ", "def ", "class ", "for ", "while ", "if ", 
          "print(", "return ", "self.", "with ", "try:", "except:",
          "\n    ", "# ", "'''", '"""', "bpy."
        ];
        
        let indicatorCount = 0;
        for (const indicator of pythonIndicators) {
          if (code.includes(indicator)) {
            indicatorCount++;
          }
        }
        
        // More strict check for generic code blocks
        if (indicatorCount >= 2 || code.includes("bpy.")) {
          return code;
        }
      }
    }
  } catch (e) {
    console.warn(`Error extracting generic code block: ${e}`);
  }
      
  // Last resort: Look for Blender-specific code
  try {
    if (text.includes("bpy.")) {
      const lines = text.split("\n");
      const codeLines = [];
      let inCodeSection = false;
      
      for (const line of lines) {
        try {
          const lineStripped = line.trim();
          if (lineStripped.includes("bpy.") && (lineStripped.includes("(") || lineStripped.includes("="))) {
            inCodeSection = true;
            codeLines.push(line);
          } else if (inCodeSection && lineStripped) {
            let isCodeContinuation = false;
            
            // Check if line is indented
            if (line.startsWith("    ") || line.startsWith("\t")) {
              isCodeContinuation = true;
            } else {
              // Check if line contains code-like elements
              const codeIndicators = ["(", ")", "=", "import", "for", "if", "else", "return"];
              for (const indicator of codeIndicators) {
                if (lineStripped.includes(indicator)) {
                  isCodeContinuation = true;
                  break;
                }
              }
            }
            
            if (isCodeContinuation) {
              codeLines.push(line);
            } else {
              // This looks like text again, stop collecting code
              inCodeSection = false;
            }
          }
        } catch (e) {
          console.warn(`Error processing line in Blender code extraction: ${e}`);
          // Continue with next line
        }
      }
      
      if (codeLines.length > 0) {
        return codeLines.join("\n");
      }
    }
  } catch (e) {
    console.warn(`Error extracting Blender code: ${e}`);
  }
      
  return "";
}

// Validate Python code
function validatePythonCode(code: string): [boolean, string] {
  if (!code || typeof code !== 'string') {
    return [false, "Empty or invalid code"];
  }
    
  // Check for common patterns that shouldn't be considered code
  if (code.trim().split('\n').length < 1) {
    return [false, "Code is too short"];
  }
    
  // Check for plain English text without code indicators
  const codeIndicators = ["import", "def", "class", "=", "(", ")", "bpy.", "for", "if", "while", "return"];
  if (!codeIndicators.some(indicator => code.includes(indicator))) {
    return [false, "No code indicators found"];
  }
  
  // Check for external library imports that aren't standard in Blender
  const allowedImports = ["bpy", "mathutils", "bmesh", "math", "random", "os", "sys", 
                        "time", "datetime", "json", "collections", "re", "struct"];
  
  const externalLibraries = [];
  const modifiedCode = [];
  
  // Process line by line to catch imports
  for (const line of code.split('\n')) {
    const lineStripped = line.trim();
    
    // Look for import statements
    if (lineStripped.startsWith('import ') || lineStripped.startsWith('from ')) {
      const words = lineStripped.replace(',', ' ').split(' ');
      
      // Check the libraries being imported
      for (const word of words) {
        // Skip Python keywords and common syntax in import statements
        if (['import', 'from', 'as', '*'].includes(word)) {
          continue;
        }
          
        // Remove any trailing commas or dots
        const cleanWord = word.replace(/[,.]$/, '');
        
        // Check if this is an allowed import
        if (!allowedImports.includes(cleanWord) && cleanWord.length > 1) {
          externalLibraries.push(cleanWord);
        }
      }
      
      // Comment out the import if it contains external libraries
      if (externalLibraries.some(lib => lineStripped.includes(lib))) {
        modifiedCode.push(`# ${line} # External library - not available in Blender`);
      } else {
        modifiedCode.push(line);
      }
    } else {
      modifiedCode.push(line);
    }
  }
  
  // Add warning comments if external libraries were found
  if (externalLibraries.length) {
    const headerComment = [
      "# WARNING: The following external libraries are not available in standard Blender:",
      "# " + externalLibraries.join(", "),
      "# Code has been modified to use only standard Blender libraries.",
      "# External library imports have been commented out.",
      ""
    ];
    modifiedCode.unshift(...headerComment);
  }
  
  // Since we can't easily check Python syntax in JavaScript, we'll assume it's valid
  // In a real implementation, you might want to use a server-side Python validation or a JS-based Python parser
  
  let modifiedCodeStr = modifiedCode.join('\n');
  
  // Check for Blender relevance by basic regex patterns
  const hasBpyImport = /import\s+bpy/.test(code) || /from\s+bpy\s+import/.test(code);
  const hasBpyUse = /bpy\./.test(code);
  const hasBmeshImport = /import\s+bmesh/.test(code) || /from\s+bmesh\s+import/.test(code);
  const hasBmeshUse = /bmesh\./.test(code);
  
  // Warning if using bpy or bmesh but not importing them
  let missingImports = "";
  if (hasBpyUse && !hasBpyImport) {
    console.warn("Code uses bpy but doesn't import it, adding import statement");
    missingImports += "import bpy\n";
  }
  
  if (hasBmeshUse && !hasBmeshImport) {
    console.warn("Code uses bmesh but doesn't import it, adding import statement");
    missingImports += "import bmesh\n";
  }
  
  if (missingImports) {
    modifiedCodeStr = missingImports + "\n" + modifiedCodeStr;
    return [true, modifiedCodeStr];
  }
  
  return [true, modifiedCodeStr];
}

// Parse the response to identify if it contains Python code blocks
function parseResponse(text: string): [string, string] {
  if (!text || typeof text !== 'string') {
    return ["text", "Empty response"];
  }
  
  try {  
    // Check for Python code blocks (```python...```)
    if (text.includes("```python")) {
      try {
        // Extract the code between the Python code blocks
        const parts = text.split("```python", 2);
        if (parts.length > 1 && parts[1].includes("```")) {
          const codePart = parts[1].split("```", 1)[0].trim();
          console.log(`Detected Python code block: ${codePart.substring(0, 50)}...`);
          return ["code", codePart];
        }
      } catch (e: unknown) {
        console.warn(`Error extracting Python code block: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    // Check for just code blocks (```...```)
    if (text.includes("```")) {
      try {
        // Extract the code between the code blocks
        const parts = text.split("```", 2);
        if (parts.length > 1 && parts[1].includes("```")) {
          const codePart = parts[1].split("```", 1)[0].trim();
          
          // Heuristic: Check multiple indicators of Python code
          const pythonIndicators = [
            "import ", "def ", "class ", "for ", "while ", "if ", 
            "print(", "return ", "self.", "with ", "try:", "except:",
            "\n    ", "# ", "'''", '"""' 
          ];
          
          let indicatorCount = 0;
          for (const indicator of pythonIndicators) {
            if (codePart.includes(indicator)) {
              indicatorCount++;
            }
          }
          
          // If multiple indicators found, it's likely Python code
          if (indicatorCount >= 2) {
            console.log(`Detected generic code block with ${indicatorCount} Python indicators`);
            return ["code", codePart];
          }
        }
      } catch (e: unknown) {
        console.warn(`Error extracting generic code block: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e: unknown) {
    console.error(`Error in parseResponse: ${e instanceof Error ? e.message : String(e)}`);
  }
              
  try {
    // Additional detection for standalone code without backticks
    if (text.includes("bpy.") && text.includes("(")) {
      try {
        // Try to extract Blender-specific commands
        const lines = text.split("\n");
        const codeLines = [];
        let inCodeSection = false;
        
        for (const line of lines) {
          try {
            const trimmedLine = line.trim();
            // Lines that look like code
            if (trimmedLine.includes("bpy.") && (trimmedLine.includes("(") || trimmedLine.includes("=")) && 
                !trimmedLine.startsWith(">") && !trimmedLine.startsWith("*")) {
              inCodeSection = true;
              codeLines.push(line);
            } 
            // Continue adding lines that look like part of the same code block
            else if (inCodeSection && trimmedLine && !trimmedLine.startsWith(">") && !trimmedLine.startsWith("*")) {
              let isCodeContinuation = false;
              
              // Check if line is indented
              if (trimmedLine.startsWith("    ") || trimmedLine.startsWith("\t")) {
                isCodeContinuation = true;
              } else {
                // Check if line contains code-like elements
                const codeIndicators = ["(", ")", "=", "import", "for", "if", "else", "return"];
                for (const indicator of codeIndicators) {
                  if (trimmedLine.includes(indicator)) {
                    isCodeContinuation = true;
                    break;
                  }
                }
              }
              
              if (isCodeContinuation) {
                codeLines.push(line);
              } else {
                // This looks like text again, stop collecting code
                inCodeSection = false;
              }
            }
          } catch (e) {
            console.warn(`Error processing line in standalone code extraction: ${e}`);
            // Continue with next line
          }
        }
        
        if (codeLines.length > 0) {
          const codePart = codeLines.join("\n");
          console.log(`Detected standalone Blender code: ${codePart.substring(0, 50)}...`);
          return ["code", codePart];
        }
      } catch (e: unknown) {
        console.warn(`Error extracting standalone code: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e: unknown) {
    console.warn(`Error in standalone code detection: ${e instanceof Error ? e.message : String(e)}`);
  }
              
  // Otherwise, it's just text
  return ["text", text];
}

// Check if API keys are available and valid
async function checkAPIAccess(provider: string, model: string) {
  try {
    console.log(`Checking ${provider} API access for model ${model}...`);
    
    switch (provider) {
      case "anthropic":
        return await checkAnthropicApi(model);
      case "openai":
        return await checkOpenAIApi(model);
      case "google":
        return await checkGoogleApi(model);
      default:
        console.error(`Unknown provider: ${provider}`);
        return false;
    }
  } catch (e: unknown) {
    console.error(`Error checking API access: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

// Check if Anthropic API key is available and valid
async function checkAnthropicApi(model: string) {
  try {
    console.log(`Checking Anthropic API access for model ${model}...`);
    
    if (!ANTHROPIC_API_KEY) {
      console.error("Anthropic API key not set");
      console.error("Please set your API key in the environment variable ANTHROPIC_API_KEY");
      return false;
    }
    
    // Test the API with a minimal request
    const headers = {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    };
    
    // Make a minimal request to check API access
    try {
      const testData = {
        "model": model,
        "max_tokens": 1,
        "messages": [{"role": "user", "content": "Hello"}]
      };
      
      const response = await axios.post(
        ANTHROPIC_API_URL,
        testData,
        { headers, timeout: 10000 }
      );
      
      if (response.status === 200) {
        console.log("Anthropic API access confirmed");
        return true;
      } else {
        console.error(`API returned status code ${response.status}: ${response.statusText}`);
        return false;
      }
                
    } catch (e: unknown) {
      console.error(`Error connecting to Anthropic API: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
            
  } catch (e: unknown) {
    console.error(`Error checking Anthropic API: ${e instanceof Error ? e.message : String(e)}`);
    console.error("Please make sure you have a valid Anthropic API key");
    console.error("Get an API key from: https://console.anthropic.com/");
    return false;
  }
}

// Check if OpenAI API key is available and valid
async function checkOpenAIApi(model: string) {
  try {
    console.log(`Checking OpenAI API access for model ${model}...`);
    
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key not set");
      console.error("Please set your API key in the environment variable OPENAI_API_KEY");
      return false;
    }
    
    // Test the API with a minimal request
    const headers = {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    };
    
    // Make a minimal request to check API access
    try {
      const testData = {
        "model": model,
        "max_tokens": 1,
        "messages": [{"role": "user", "content": "Hello"}]
      };
      
      const response = await axios.post(
        OPENAI_API_URL,
        testData,
        { headers, timeout: 10000 }
      );
      
      if (response.status === 200) {
        console.log("OpenAI API access confirmed");
        return true;
      } else {
        console.error(`API returned status code ${response.status}: ${response.statusText}`);
        return false;
      }
                
    } catch (e: unknown) {
      console.error(`Error connecting to OpenAI API: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
            
  } catch (e: unknown) {
    console.error(`Error checking OpenAI API: ${e instanceof Error ? e.message : String(e)}`);
    console.error("Please make sure you have a valid OpenAI API key");
    console.error("Get an API key from: https://platform.openai.com/");
    return false;
  }
}

// Check if Google API key is available and valid
async function checkGoogleApi(model: string) {
  try {
    console.log(`Checking Google API access for model ${model}...`);
    
    if (!GOOGLE_API_KEY) {
      console.error("Google API key not set");
      console.error("Please set your API key in the environment variable GOOGLE_API_KEY");
      return false;
    }
    
    // Test the API with a minimal request
    const url = `${GOOGLE_API_URL}/${model}:generateContent?key=${GOOGLE_API_KEY}`;
    
    // Make a minimal request to check API access
    try {
      const testData = {
        "contents": [{"parts": [{"text": "Hello"}]}]
      };
      
      const response = await axios.post(
        url,
        testData,
        { timeout: 10000 }
      );
      
      if (response.status === 200) {
        console.log("Google API access confirmed");
        return true;
      } else {
        console.error(`API returned status code ${response.status}: ${response.statusText}`);
        return false;
      }
                
    } catch (e: unknown) {
      console.error(`Error connecting to Google API: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
            
  } catch (e: unknown) {
    console.error(`Error checking Google API: ${e instanceof Error ? e.message : String(e)}`);
    console.error("Please make sure you have a valid Google API key");
    console.error("Get an API key from: https://makersuite.google.com/");
    return false;
  }
}

// Generate a response using the selected AI model
async function generateResponse(prompt: string, chatHistory: ChatMessage[] = [], sceneInfo?: any, model: string = DEFAULT_MODEL) {
  // Determine which provider to use based on the selected model
  const provider = MODEL_PROVIDERS[model as keyof typeof MODEL_PROVIDERS] || "anthropic";
  
  if (!await checkAPIAccess(provider, model)) {
    return {
      content: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API is not available or the API key is invalid. Please set a valid API key.`,
      type: "error"
    };
  }
  
  // Call the appropriate provider-specific function
  switch (provider) {
    case "anthropic":
      return await generateAnthropicResponse(prompt, chatHistory, sceneInfo, model);
    case "openai":
      return await generateOpenAIResponse(prompt, chatHistory, sceneInfo, model);
    case "google":
      return await generateGoogleResponse(prompt, chatHistory, sceneInfo, model);
    default:
      return {
        content: `Unknown provider: ${provider}. Falling back to Claude.`,
        type: "error"
      };
  }
}

// Generate a response using Anthropic's Claude API
async function generateAnthropicResponse(prompt: string, chatHistory: ChatMessage[] = [], sceneInfo?: any, model: string = DEFAULT_MODEL) {
  
  try {
    console.log(`Generating response for prompt: ${prompt.substring(0, 100)}...`);
    
    // Store this prompt in chat memory if we need to maintain state
    // For a stateless API, we'll use the provided chat history
    const allMessages = [...chatHistory];
    if (allMessages.length === 0 || allMessages[allMessages.length - 1].role !== "user") {
      allMessages.push({"role": "user", "content": prompt});
    }
    
    // Prepare the request headers and payload
    const headers = {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    };
    
    // Create a system prompt focused on Blender assistance with explicit code formatting
    let systemPrompt = `You are a helpful Blender assistant. Provide concise answers about Blender functionality.

When asked to write code, follow these guidelines:
1. Always provide clean Python code that works with the Blender Python API (bpy)
2. ALWAYS FORMAT code inside \`\`\`python code here \`\`\` blocks 
3. For short snippets (1-2 lines), still use the \`\`\`python code here \`\`\` format
4. Include necessary imports like "import bpy" in your code
5. Make code executable in Blender's Python environment
6. Use proper indentation with 4 spaces
7. ALWAYS check object types before accessing type-specific attributes
8. Use hasattr(obj, 'attribute_name') to check if attributes exist before using them
9. Make sure when using Geometry Nodes, you are using the correct node type for the operation you want to perform.
10. Make sure when using the Set Position node, you are using the correct axis for the operation you want to perform.
11. Make sure you properly connect all nodes in your geometry nodes network if you are using geometry nodes.

IMPORTANT CONSTRAINTS:
- Use ONLY the built-in Blender Python API modules: bpy, bmesh, mathutils
- DO NOT use external libraries like NumPy, SciPy, OpenCV, etc.
- NEVER suggest installing external packages with pip or conda
- ONLY use modules that come standard with Blender (bpy, bmesh, mathutils)
- If asked about functionality requiring external libraries, explain how to achieve similar results with Blender's built-in modules
- Be extremely careful about object types - different object types (MESH, CURVE, LIGHT, etc.) have different attributes
- ALWAYS check the object type before applying type-specific operations (e.g., mesh operations only work on MESH objects)

Your goal is to help users learn the Blender Python API and create useful scripts using only the built-in functionality while writing robust code that handles different object types safely.`;

    // Add scene information to system prompt if available
    if (sceneInfo) {
      const sceneOverview = `
SCENE INFORMATION:
- Blender version: ${sceneInfo.blender_version || 'Unknown'}
- Scene name: ${sceneInfo.scene_name || 'Untitled'}
- Total objects: ${sceneInfo.total_objects || 0}
- Object types: ${JSON.stringify(sceneInfo.object_types || {})}
- Collections: ${(sceneInfo.collections || []).map((c: any) => c.name).join(', ')}
- Active object: ${sceneInfo.active_object_details?.name || 'None'}
- Render engine: ${sceneInfo.render_settings?.engine || 'Unknown'}

The user's current Blender scene has been analyzed and is available to you. When responding to queries, consider the context of their scene and tailor your suggestions to work with their specific objects and scene setup. You can reference objects by name and provide specific advice based on their scene configuration.
`;
      
      systemPrompt += "\n\n" + sceneOverview;
    }
    
    // Prepare messages using chat memory for continuity
    let messages = [];
    
    // Only use the last 10 messages from the history to avoid context length issues
    // If there's no history provided, we'll use the global chat memory
    const recentChat = allMessages.length > 0 ? 
      allMessages.slice(-10) : 
      chatMemory.slice(-10).filter(msg => ["user", "assistant"].includes(msg.role));
    
    // If we have chat history, use it
    if (recentChat.length > 0) {
      messages = recentChat;
    } else {
      // Just the current prompt
      messages = [{"role": "user", "content": prompt}];
    }
    
    // Create the payload
    const payload = {
      "model": model,
      "max_tokens": 2000,
      "temperature": 0.7,
      "system": systemPrompt,
      "messages": messages
    };
    
    // Send the request to Claude API
    console.log(`Sending request to Claude API for model ${model}`);
    
    let response;
    try {
      response = await axios.post(
        ANTHROPIC_API_URL, 
        payload, 
        { headers, timeout: 60000 }
      );
    } catch (e: unknown) {
      const axiosError = e as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        console.error("Claude API request timed out after 60 seconds");
        return {
          content: "Request to Claude API timed out. Please try again.",
          type: "error"
        };
      } else {
        console.error(`Connection error when connecting to Claude API: ${axiosError.message || String(e)}`);
        return {
          content: "Could not connect to Claude API. Please check your internet connection.",
          type: "error"
        };
      }
    }
    
    if (response.status !== 200) {
      const errorMsg = `Claude API returned status code ${response.status}`;
      console.error(`${errorMsg}: ${response.statusText}`);
      return {
        content: `Error from Claude API: ${response.statusText}`,
        type: "error"
      };
    }
    
    // Extract the response
    try {
      const result = response.data;
      
      // Claude returns response in content blocks with different types
      const responseContent: ResponseBlock[] = result.content || [];
      if (!responseContent.length) {
        console.warn("Received empty content from Claude API");
        return {
          content: "The model returned an empty response. Please try again with a different prompt.",
          type: "error"
        };
      }
      
      // Extract text and look for code blocks
      let fullResponseText = "";
      const codeBlocks: string[] = [];
      
      // First check if Claude returned any code blocks directly
      for (const block of responseContent) {
        // Check if Claude returned a direct code block (future-proofing)
        if (block && block.type === "code") {
          const code = block.text || "";
          if (code) {
            console.log(`Found direct code block from Claude API: ${code.substring(0, 50)}...`);
            codeBlocks.push(code);
          }
        }
      }
      
      // Then process all text blocks for code
      for (const block of responseContent) {
        if (block && block.type === "text") {
          const blockText = block.text || "";
          fullResponseText += blockText;
          
          // Check for code blocks in the text - make sure blockText exists and is a string
          if (blockText && typeof blockText === 'string') {
            if (blockText.includes("```python") || blockText.includes("```") || blockText.includes("bpy.")) {
              const codeInText = extractCodeFromText(blockText);
              if (codeInText) {
                codeBlocks.push(codeInText);
              }
            }
          }
        }
      }
      
      // Log the response for debugging
      console.log(`Received response from Claude: ${fullResponseText.substring(0, 100)}...`);
      
      // Log the full structure for debugging code detection issues
      const blockTypes = responseContent.map(block => block.type || "unknown");
      console.log(`Claude response structure: ${blockTypes}`);
      
      if (!fullResponseText.trim()) {
        console.warn("Received empty text from Claude API");
        return {
          content: "The model returned an empty response. Please try again with a different prompt.",
          type: "error"
        };
      }
      
      // If we found code blocks, validate and use the first valid one
      if (codeBlocks.length) {
        console.log(`Found ${codeBlocks.length} code blocks in Claude response`);
        
        // Try to find a valid code block
        for (let i = 0; i < codeBlocks.length; i++) {
          const [isValid, result] = validatePythonCode(codeBlocks[i]);
          if (isValid) {
            console.log(`Using validated code block (${i+1}/${codeBlocks.length}): ${result.substring(0, 100)}...`);
            
            // Add to chat memory if we're maintaining global state
            if (chatHistory.length === 0) {
              chatMemory.push({"role": "user", "content": prompt});
              chatMemory.push({"role": "assistant", "content": result});
            }
            
            return {
              content: result,
              type: "code"
            };
          } else {
            console.warn(`Code block ${i+1} validation failed: ${result}`);
          }
        }
        
        // If we get here, no valid code blocks were found
        // Return the first block but with a validation warning
        console.warn("No valid Python code blocks found, returning with warning");
        return {
          content: `# Warning: This code may have syntax errors\n# Please review carefully before executing\n\n${codeBlocks[0]}`,
          type: "code_needs_review"
        };
      }
      
      // Otherwise, parse the full response to see if it contains code
      const [responseType, content] = parseResponse(fullResponseText);
      
      // If it's code, validate it
      if (responseType === "code") {
        const [isValid, result] = validatePythonCode(content);
        if (!isValid) {
          console.warn(`Parsed code validation failed: ${result}`);
          // Mark as code that needs review
          return {
            content: `# Warning: This code may have syntax errors\n# ${result}\n# Please review carefully before executing\n\n${content}`,
            type: "code_needs_review"
          };
        }
        
        // Add to chat memory if we're maintaining global state
        if (chatHistory.length === 0) {
          chatMemory.push({"role": "user", "content": prompt});
          chatMemory.push({"role": "assistant", "content": result});
        }
        
        return {
          content: result,
          type: "code"
        };
      }
      
      // Store text responses in chat memory too
      if (responseType === "text" && chatHistory.length === 0) {
        chatMemory.push({"role": "user", "content": prompt});
        chatMemory.push({"role": "assistant", "content": content});
      }
      
      return {
        content: content,
        type: responseType
      };
    } catch (e: unknown) {
      console.error(`Error processing Claude API response: ${e instanceof Error ? e.message : String(e)}`);
      return {
        content: "Error processing response from Claude API. Please try again.",
        type: "error"
      };
    }
    
  } catch (e: unknown) {
    const errorMsg = `Error generating response: ${e instanceof Error ? e.message : String(e)}`;
    console.error(errorMsg);
    console.error(e instanceof Error ? e.stack : 'No stack trace available');
    return {
      content: errorMsg,
      type: "error"
    };
  }
}

// Generate a response using OpenAI API
async function generateOpenAIResponse(prompt: string, chatHistory: ChatMessage[] = [], sceneInfo?: any, model: string = "gpt-4o") {
  try {
    console.log(`Generating response using OpenAI's ${model} for prompt: ${prompt.substring(0, 100)}...`);
    
    // Store this prompt in chat memory if we need to maintain state
    const allMessages = [...chatHistory];
    if (allMessages.length === 0 || allMessages[allMessages.length - 1].role !== "user") {
      allMessages.push({"role": "user", "content": prompt});
    }
    
    // Prepare the request headers and payload
    const headers = {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    };
    
    // Create a system prompt focused on Blender assistance
    let systemPrompt = `You are a helpful Blender assistant. Provide concise answers about Blender functionality.

When asked to write code, follow these guidelines:
1. Always provide clean Python code that works with the Blender Python API (bpy)
2. ALWAYS FORMAT code inside \`\`\`python code here \`\`\` blocks 
3. For short snippets (1-2 lines), still use the \`\`\`python code here \`\`\` format
4. Include necessary imports like "import bpy" in your code
5. Make code executable in Blender's Python environment
6. Use proper indentation with 4 spaces
7. ALWAYS check object types before accessing type-specific attributes
8. Use hasattr(obj, 'attribute_name') to check if attributes exist before using them

IMPORTANT CONSTRAINTS:
- Use ONLY the built-in Blender Python API modules: bpy, bmesh, mathutils
- DO NOT use external libraries like NumPy, SciPy, OpenCV, etc.
- NEVER suggest installing external packages with pip or conda
- ONLY use modules that come standard with Blender (bpy, bmesh, mathutils)
- If asked about functionality requiring external libraries, explain how to achieve similar results with Blender's built-in modules
- Be extremely careful about object types - different object types (MESH, CURVE, LIGHT, etc.) have different attributes
- ALWAYS check the object type before applying type-specific operations (e.g., mesh operations only work on MESH objects)

Your goal is to help users learn the Blender Python API and create useful scripts using only the built-in functionality while writing robust code that handles different object types safely.`;

    // Add scene information to system prompt if available
    if (sceneInfo) {
      const sceneOverview = `
SCENE INFORMATION:
- Blender version: ${sceneInfo.blender_version || 'Unknown'}
- Scene name: ${sceneInfo.scene_name || 'Untitled'}
- Total objects: ${sceneInfo.total_objects || 0}
- Object types: ${JSON.stringify(sceneInfo.object_types || {})}
- Collections: ${(sceneInfo.collections || []).map((c: any) => c.name).join(', ')}
- Active object: ${sceneInfo.active_object_details?.name || 'None'}
- Render engine: ${sceneInfo.render_settings?.engine || 'Unknown'}

The user's current Blender scene has been analyzed and is available to you. When responding to queries, consider the context of their scene and tailor your suggestions to work with their specific objects and scene setup. You can reference objects by name and provide specific advice based on their scene configuration.
`;
      
      systemPrompt += "\n\n" + sceneOverview;
    }
    
    // Format messages for OpenAI API
    const messages = [];
    
    // Add system message
    messages.push({
      "role": "system",
      "content": systemPrompt
    });
    
    // Only use the last 10 messages from the history to avoid context length issues
    const recentChat = allMessages.length > 0 ? 
      allMessages.slice(-10) : 
      chatMemory.slice(-10).filter(msg => ["user", "assistant"].includes(msg.role));
    
    // Add the chat history messages
    if (recentChat.length > 0) {
      messages.push(...recentChat);
    } else {
      // Just the current prompt
      messages.push({"role": "user", "content": prompt});
    }
    
    // Create the payload
    const payload = {
      "model": model,
      "messages": messages,
      "max_tokens": 2000,
      "temperature": 0.7
    };
    
    // Send the request to OpenAI API
    console.log(`Sending request to OpenAI API for model ${model}`);
    
    let response;
    try {
      response = await axios.post(
        OPENAI_API_URL, 
        payload, 
        { headers, timeout: 60000 }
      );
    } catch (e: unknown) {
      const axiosError = e as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        console.error("OpenAI API request timed out after 60 seconds");
        return {
          content: "Request to OpenAI API timed out. Please try again.",
          type: "error"
        };
      } else {
        console.error(`Connection error when connecting to OpenAI API: ${axiosError.message || String(e)}`);
        return {
          content: "Could not connect to OpenAI API. Please check your internet connection.",
          type: "error"
        };
      }
    }
    
    if (response.status !== 200) {
      const errorMsg = `OpenAI API returned status code ${response.status}`;
      console.error(`${errorMsg}: ${response.statusText}`);
      return {
        content: `Error from OpenAI API: ${response.statusText}`,
        type: "error"
      };
    }
    
    // Extract the response
    try {
      const result = response.data;
      const messageContent = result.choices[0].message.content;
      
      // Log the response for debugging
      console.log(`Received response from OpenAI: ${messageContent.substring(0, 100)}...`);
      
      if (!messageContent.trim()) {
        console.warn("Received empty text from OpenAI API");
        return {
          content: "The model returned an empty response. Please try again with a different prompt.",
          type: "error"
        };
      }
      
      // Parse the response to look for code blocks
      const [responseType, content] = parseResponse(messageContent);
      
      // Add to chat memory if we're maintaining global state
      if (chatHistory.length === 0) {
        chatMemory.push({"role": "user", "content": prompt});
        chatMemory.push({"role": "assistant", "content": messageContent});
      }
      
      // If it's code, validate it before returning
      if (responseType === "code") {
        const [isValid, validatedCode] = validatePythonCode(content);
        if (!isValid) {
          return {
            content: `# Warning: This code may have syntax errors\n# Please review carefully before executing\n\n${content}`,
            type: "code_needs_review"
          };
        }
        
        return {
          content: validatedCode,
          type: "code"
        };
      }
      
      // Return the textual response
      return {
        content: messageContent,
        type: responseType
      };
    } catch (e: unknown) {
      console.error(`Error processing OpenAI API response: ${e instanceof Error ? e.message : String(e)}`);
      return {
        content: "Error processing response from OpenAI API. Please try again.",
        type: "error"
      };
    }
    
  } catch (e: unknown) {
    const errorMsg = `Error generating response: ${e instanceof Error ? e.message : String(e)}`;
    console.error(errorMsg);
    console.error(e instanceof Error ? e.stack : 'No stack trace available');
    return {
      content: errorMsg,
      type: "error"
    };
  }
}

// Generate a response using Google's Gemini API
async function generateGoogleResponse(prompt: string, chatHistory: ChatMessage[] = [], sceneInfo?: any, model: string = "gemini-pro") {
  try {
    console.log(`Generating response using Google's ${model} for prompt: ${prompt.substring(0, 100)}...`);
    
    // Store this prompt in chat memory if we need to maintain state
    const allMessages = [...chatHistory];
    if (allMessages.length === 0 || allMessages[allMessages.length - 1].role !== "user") {
      allMessages.push({"role": "user", "content": prompt});
    }
    
    // Create a system prompt focused on Blender assistance
    let systemInstructions = `You are a helpful Blender assistant. Provide concise answers about Blender functionality.

When asked to write code, follow these guidelines:
1. Always provide clean Python code that works with the Blender Python API (bpy)
2. ALWAYS FORMAT code inside \`\`\`python code here \`\`\` blocks 
3. For short snippets (1-2 lines), still use the \`\`\`python code here \`\`\` format
4. Include necessary imports like "import bpy" in your code
5. Make code executable in Blender's Python environment
6. Use proper indentation with 4 spaces
7. ALWAYS check object types before accessing type-specific attributes
8. Use hasattr(obj, 'attribute_name') to check if attributes exist before using them

IMPORTANT CONSTRAINTS:
- Use ONLY the built-in Blender Python API modules: bpy, bmesh, mathutils
- DO NOT use external libraries like NumPy, SciPy, OpenCV, etc.
- NEVER suggest installing external packages with pip or conda
- ONLY use modules that come standard with Blender (bpy, bmesh, mathutils)
- If asked about functionality requiring external libraries, explain how to achieve similar results with Blender's built-in modules
- Be extremely careful about object types - different object types (MESH, CURVE, LIGHT, etc.) have different attributes
- ALWAYS check the object type before applying type-specific operations (e.g., mesh operations only work on MESH objects)

Your goal is to help users learn the Blender Python API and create useful scripts using only the built-in functionality while writing robust code that handles different object types safely.`;

    // Add scene information if available
    if (sceneInfo) {
      const sceneOverview = `
SCENE INFORMATION:
- Blender version: ${sceneInfo.blender_version || 'Unknown'}
- Scene name: ${sceneInfo.scene_name || 'Untitled'}
- Total objects: ${sceneInfo.total_objects || 0}
- Object types: ${JSON.stringify(sceneInfo.object_types || {})}
- Collections: ${(sceneInfo.collections || []).map((c: any) => c.name).join(', ')}
- Active object: ${sceneInfo.active_object_details?.name || 'None'}
- Render engine: ${sceneInfo.render_settings?.engine || 'Unknown'}

The user's current Blender scene has been analyzed and is available to you. When responding to queries, consider the context of their scene and tailor your suggestions to work with their specific objects and scene setup. You can reference objects by name and provide specific advice based on their scene configuration.
`;
      
      systemInstructions += "\n\n" + sceneOverview;
    }
    
    // Format messages for Gemini API
    const contents = [];
    
    // Add system message as the first content block
    contents.push({
      "role": "system",
      "parts": [{"text": systemInstructions}]
    });
    
    // Only use the last 10 messages from the history to avoid context length issues
    const recentChat = allMessages.length > 0 ? 
      allMessages.slice(-10) : 
      chatMemory.slice(-10).filter(msg => ["user", "assistant"].includes(msg.role));
    
    // Add chat history
    for (const msg of recentChat) {
      const role = msg.role === "assistant" ? "model" : msg.role;
      contents.push({
        "role": role,
        "parts": [{"text": msg.content}]
      });
    }
    
    // If no history was provided, add just the current prompt
    if (recentChat.length === 0) {
      contents.push({
        "role": "user",
        "parts": [{"text": prompt}]
      });
    }
    
    // Create the request URL with API key
    const url = `${GOOGLE_API_URL}/${model}:generateContent?key=${GOOGLE_API_KEY}`;
    
    // Create the payload
    const payload = {
      "contents": contents,
      "generationConfig": {
        "temperature": 0.7,
        "maxOutputTokens": 2048
      }
    };
    
    // Send the request to Google API
    console.log(`Sending request to Google Gemini API for model ${model}`);
    
    let response;
    try {
      response = await axios.post(
        url, 
        payload, 
        { timeout: 60000 }
      );
    } catch (e: unknown) {
      const axiosError = e as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        console.error("Google API request timed out after 60 seconds");
        return {
          content: "Request to Google API timed out. Please try again.",
          type: "error"
        };
      } else {
        console.error(`Connection error when connecting to Google API: ${axiosError.message || String(e)}`);
        return {
          content: "Could not connect to Google API. Please check your internet connection.",
          type: "error"
        };
      }
    }
    
    if (response.status !== 200) {
      const errorMsg = `Google API returned status code ${response.status}`;
      console.error(`${errorMsg}: ${response.statusText}`);
      return {
        content: `Error from Google API: ${response.statusText}`,
        type: "error"
      };
    }
    
    // Extract the response
    try {
      const result = response.data;
      
      if (!result.candidates || result.candidates.length === 0) {
        console.warn("No candidates returned from Google API");
        return {
          content: "The model did not return a valid response. Please try again.",
          type: "error"
        };
      }
      
      const content = result.candidates[0].content;
      const messageText = content.parts[0].text;
      
      // Log the response for debugging
      console.log(`Received response from Google: ${messageText.substring(0, 100)}...`);
      
      if (!messageText.trim()) {
        console.warn("Received empty text from Google API");
        return {
          content: "The model returned an empty response. Please try again with a different prompt.",
          type: "error"
        };
      }
      
      // Parse the response to look for code blocks
      const [responseType, extractedContent] = parseResponse(messageText);
      
      // Add to chat memory if we're maintaining global state
      if (chatHistory.length === 0) {
        chatMemory.push({"role": "user", "content": prompt});
        chatMemory.push({"role": "assistant", "content": messageText});
      }
      
      // If it's code, validate it before returning
      if (responseType === "code") {
        const [isValid, validatedCode] = validatePythonCode(extractedContent);
        if (!isValid) {
          return {
            content: `# Warning: This code may have syntax errors\n# Please review carefully before executing\n\n${extractedContent}`,
            type: "code_needs_review"
          };
        }
        
        return {
          content: validatedCode,
          type: "code"
        };
      }
      
      // Return the textual response
      return {
        content: messageText,
        type: responseType
      };
    } catch (e: unknown) {
      console.error(`Error processing Google API response: ${e instanceof Error ? e.message : String(e)}`);
      return {
        content: "Error processing response from Google API. Please try again.",
        type: "error"
      };
    }
    
  } catch (e: unknown) {
    const errorMsg = `Error generating response: ${e instanceof Error ? e.message : String(e)}`;
    console.error(errorMsg);
    console.error(e instanceof Error ? e.stack : 'No stack trace available');
    return {
      content: errorMsg,
      type: "error"
    };
  }
}

// Main POST handler for the Next.js route
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    
    // Check if the request is compressed
    const isCompressed = req.headers.get('X-Compressed') === 'zlib' || 
                        (rawBody && 'compressed' in rawBody && rawBody.compressed);
    
    // Decompress if needed
    let body;
    if (isCompressed) {
      console.log('Received compressed data, decompressing...');
      body = await decompressData(rawBody);
      console.log('Data decompressed successfully');
    } else {
      body = rawBody;
    }
    
    const { prompt, history, type, scene_info, model, auth } = body;
    
    // Log the model information if specified
    const selectedModel = model || DEFAULT_MODEL;
    const provider = MODEL_PROVIDERS[selectedModel as keyof typeof MODEL_PROVIDERS] || "anthropic";
    if (model) {
      console.log(`Request specifies model: ${selectedModel} (${provider})`);
    }
    
    // Check authentication if provided
    let isAuthenticated = false;
    let userId = "";
    let userEmail = "";
    let analyticsData = null;
    let usageBasedPricing = false;
    let beyondPlanLimits = false;
    let subscriptionTier = "free";
    
    if (auth && auth.token) {
      try {
        console.log(`Request includes authentication token, verifying...`);
        
        // Verify the Firebase token and get user subscription info
        const decodedToken = await verifyFirebaseToken(auth.token);
        
        // User is authenticated - determine their subscription tier
        isAuthenticated = true;
        userId = decodedToken.uid;
        userEmail = decodedToken.email || "";
        
        // Determine subscription tier based on subscriptions
        if (decodedToken.is_developer) {
          subscriptionTier = "developer";
        } else if (decodedToken.has_blenderbin_subscription || decodedToken.has_gizmo_subscription) {
          // Check if user has business tier subscription by looking at Stripe role and price IDs
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.data() || {};
          const stripeRole = userData.stripeRole || 'pro';
          
          // Also check customer document for subscription details
          const customerQuery = await db.collection('customers')
            .where('email', '==', userEmail)
            .limit(1)
            .get();
          
          let hasBusinessSubscription = false;
          
          if (!customerQuery.empty) {
            const customerDoc = customerQuery.docs[0];
            const subscriptionsRef = customerDoc.ref.collection('subscriptions');
            const activeSubs = await subscriptionsRef
              .where('status', 'in', ['trialing', 'active'])
              .get();
            
            // Check for business price IDs
            const businessPriceIds = [
              process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_BUSINESS_STRIPE_TEST_PRICE_ID,
              process.env.NEXT_PUBLIC_GIZMO_YEARLY_BUSINESS_STRIPE_TEST_PRICE_ID,
            ].filter(Boolean);
            
            for (const sub of activeSubs.docs) {
              const subData = sub.data();
              if (subData.items) {
                for (const item of subData.items) {
                  const priceId = item.price?.id;
                  if (businessPriceIds.includes(priceId)) {
                    hasBusinessSubscription = true;
                    break;
                  }
                }
              } else if (subData.price?.id && businessPriceIds.includes(subData.price.id)) {
                hasBusinessSubscription = true;
                break;
              }
              if (hasBusinessSubscription) break;
            }
          }
          
          // Map Stripe roles and business subscriptions to our subscription tiers
          if (hasBusinessSubscription || stripeRole === 'business' || stripeRole === 'enterprise') {
            subscriptionTier = "business";
          } else {
            subscriptionTier = "pro";
          }
        } else {
          // User is authenticated but has no subscription - free tier
          subscriptionTier = "free";
        }
        
        console.log(`User ${userId} authenticated with tier: ${subscriptionTier}`);
        
        // Extract analytics data if available
        if (auth.analytics) {
          analyticsData = auth.analytics;
          console.log(`Received analytics data from client: blender_version=${analyticsData.blender_version}, platform=${analyticsData.platform}`);
        }
        
        // Check if using usage-based pricing
        if (auth.usage_based_pricing) {
          usageBasedPricing = auth.usage_based_pricing.enabled || false;
          beyondPlanLimits = auth.usage_based_pricing.beyond_plan_limits || false;
          console.log(`Request using usage-based pricing: ${usageBasedPricing}, beyond plan limits: ${beyondPlanLimits}`);
        }
        
        // Check if the user can make a request based on their tier and usage
        const [canProceed, limitMessage] = await checkAuthenticatedUserLimits(userId, subscriptionTier, usageBasedPricing);
        
        if (!canProceed) {
          console.log(`User limit reached for ${userId}: ${limitMessage}`);
          return NextResponse.json({ 
            success: false, 
            error: limitMessage,
            type: "limit_reached",
            subscriptionTier: subscriptionTier,
            upgradeUrl: subscriptionTier === "free" ? "/pricing" : "/pricing/usage-based"
          }, { status: 429 });
        }
        
        console.log(`Request approved for user ${userId}: ${limitMessage}`);
        
      } catch (error) {
        console.error("Error verifying authentication token:", error);
        return NextResponse.json({ 
          success: false, 
          error: "Invalid authentication token.",
          type: "authentication_error"
        }, { status: 401 });
      }
    } else {
      // Handle non-authenticated (freemium) users
      // Get IP address and session ID for tracking
      const ip = req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') || 
                'unknown';
      const sessionId = body.session_id || 'unknown';
      
      console.log(`Freemium user request from IP: ${ip}, Session: ${sessionId}`);
      
      // Check and update freemium user limit
      const [canProceed, message] = updateFreemiumUser(ip, sessionId);
      
      if (!canProceed) {
        console.log(`Freemium user limit reached: ${message}`);
        return NextResponse.json({ 
          success: false, 
          error: message,
          type: "error",
          content: `⚠️ ${message}`
        });
      }
      
      console.log(`Freemium request allowed: ${message}`);
    }
    
    // Log scene information if available
    if (scene_info) {
      console.log(`Received scene info with ${scene_info.total_objects} objects and ${scene_info.collections?.length || 0} collections`);
    }
    
    // Handle different request types
    if (type === "execution_result") {
      // Store execution result in memory
      lastExecution = body.content || {};
      return NextResponse.json({ 
        success: true, 
        message: "Execution result received",
        type: "status"
      });
    } 
    else if (type === "execution_error") {
      // Just acknowledge execution errors
      return NextResponse.json({ 
        success: true, 
        message: "Error report received",
        type: "status"
      });
    } 
    else if (type === "user_feedback") {
      // Store successful code
      const content = body.content || {};
      if (content.success) {
        lastSuccessfulCode = content.code || null;
      }
      return NextResponse.json({ 
        success: true, 
        message: "Feedback received",
        type: "status"
      });
    } 
    else if (type === "clear_memory") {
      // Clear the chat memory
      chatMemory.length = 0;
      lastExecution = null;
      lastSuccessfulCode = null;
      return NextResponse.json({ 
        success: true, 
        message: "Memory cleared",
        type: "status"
      });
    } 
    else {
      // Regular prompt processing
      if (!prompt) {
        return NextResponse.json({ 
          success: false, 
          error: "No prompt provided" 
        }, { status: 400 });
      }
      
      // Process the message history if provided
      const messageHistory: ChatMessage[] = Array.isArray(history) ? history : [];
      
      // Record API usage to Firestore for authenticated users
      if (isAuthenticated && userId) {
        await recordApiUsage(userId, selectedModel, prompt, analyticsData, scene_info);
        
        // Record usage-based pricing if applicable
        if (usageBasedPricing && beyondPlanLimits) {
          try {
            // Record this request for usage-based billing
            const response = await fetch('/api/usage-tracking', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                model: selectedModel,
                requestCount: 1,
                tokenCount: 0, // Could calculate this from the response for token-based models
              }),
            });
            
            if (!response.ok) {
              console.error(`Error recording usage-based pricing: ${response.statusText}`);
            } else {
              console.log('Successfully recorded usage-based pricing for this request');
            }
          } catch (error) {
            console.error('Error calling usage-tracking API:', error);
          }
        }
      } else {
        console.log('Anonymous/freemium request, not recording usage to Firestore');
      }
      
      // Generate response with the selected model, passing scene info if available
      const response = await generateResponse(prompt, messageHistory, scene_info, selectedModel);
      
      // Sanitize the response
      const sanitizedResponse = sanitizeResponse(response);
      
      // Add freemium usage information for non-authenticated users
      if (!isAuthenticated) {
        const ip = req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown';
        const sessionId = body.session_id || 'unknown';
        const user = getFreemiumUser(ip, sessionId);
        
        sanitizedResponse.freemium = {
          queryCount: user.queryCount,
          dailyLimit: FREEMIUM_DAILY_LIMIT,
          remaining: FREEMIUM_DAILY_LIMIT - user.queryCount
        };
      }
      
      // Add authentication information if user is authenticated
      if (isAuthenticated) {
        try {
          // Get user's current usage and limits
          const { queryCount } = await getUserDailyUsage(userId);
          const limit = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS] || SUBSCRIPTION_LIMITS.free;
          const remaining = limit >= 999999 ? 999999 : Math.max(0, limit - queryCount);
          
          // Check user's subscription tier and usage-based pricing settings from Firestore
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.data() || {};
          const usagePricingSettings = userData.usagePricingSettings || {};
          
          // Add tier and usage information
          sanitizedResponse.subscription = {
            tier: subscriptionTier,
            queryCount: queryCount,
            dailyLimit: limit >= 999999 ? "unlimited" : limit,
            remaining: limit >= 999999 ? "unlimited" : remaining,
            usageBasedPricingEnabled: usagePricingSettings.enableUsageBasedPricing || false
          };
          
          // In a real implementation, you would refresh the token here
          sanitizedResponse.auth = {
            token: auth.token,
            user: {
              uid: userId,
              email: userEmail,
              subscription_tier: subscriptionTier,
              usage_based_pricing_enabled: usagePricingSettings.enableUsageBasedPricing || false
            }
          };
        } catch (error) {
          console.error('Error fetching user subscription tier:', error);
          // Still include the authentication info without subscription tier
          sanitizedResponse.auth = {
            token: auth.token,
            user: {
              uid: userId,
              email: userEmail
            }
          };
        }
      }
      
      // Determine if response should be compressed
      // Compress if original request was compressed and payload is large
      const shouldCompress = isCompressed && JSON.stringify(sanitizedResponse).length > 1000;
      
      if (shouldCompress) {
        try {
          console.log('Compressing response data...');
          const compressedResponse = await compressData(sanitizedResponse);
          console.log('Response compressed successfully');
          
          // Return compressed response with header
          return NextResponse.json(compressedResponse, { 
            headers: { 'X-Compressed': 'zlib' } 
          });
        } catch (error) {
          console.error('Error compressing response:', error);
          // Fall back to uncompressed if compression fails
          return NextResponse.json(sanitizedResponse);
        }
      } else {
        // Return uncompressed response
        return NextResponse.json(sanitizedResponse);
      }
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error processing request' 
    }, { status: 500 });
  }
}

// GET handler to return API information
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "This is a Blender AI API endpoint. Send POST requests with a 'prompt' field to get responses from Claude."
  });
}

// Function to get user's daily usage from database
async function getUserDailyUsage(userId: string): Promise<{ queryCount: number; lastQuery: Date | null }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyKey = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    const userUsageRef = db.collection('api_usage').doc(userId);
    const userDoc = await userUsageRef.get();

    if (!userDoc.exists) {
      return { queryCount: 0, lastQuery: null };
    }

    const userData = userDoc.data();
    const dailyCounts = userData?.daily_counts || {};
    const queryCount = dailyCounts[dailyKey] || 0;
    const lastQuery = userData?.last_query_time?.toDate() || null;

    return { queryCount, lastQuery };
  } catch (error) {
    console.error('Error getting user daily usage:', error);
    return { queryCount: 0, lastQuery: null };
  }
}

// Function to check if authenticated user can make a request
async function checkAuthenticatedUserLimits(userId: string, subscriptionTier: string, isUsageBasedPricing: boolean): Promise<[boolean, string]> {
  try {
    // If usage-based pricing is enabled, allow unlimited queries
    if (isUsageBasedPricing) {
      return [true, "Using usage-based pricing"];
    }

    // Get subscription limit
    const limit = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS] || SUBSCRIPTION_LIMITS.free;

    // If unlimited (business/developer), allow the request
    if (limit >= 999999) {
      return [true, `Unlimited queries for ${subscriptionTier} tier`];
    }

    // Check daily usage
    const { queryCount } = await getUserDailyUsage(userId);

    if (queryCount >= limit) {
      return [false, `Daily limit of ${limit} queries reached for ${subscriptionTier} tier. Upgrade for higher limits or enable usage-based pricing.`];
    }

    return [true, `Query ${queryCount + 1}/${limit} for ${subscriptionTier} tier`];
  } catch (error) {
    console.error('Error checking authenticated user limits:', error);
    // Default to allowing the request on error to avoid blocking users
    return [true, "Usage check failed, allowing request"];
  }
} 