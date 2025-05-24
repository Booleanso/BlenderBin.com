# HTTP Server API Routes

This directory contains Next.js API routes that are a complete conversion of the original Flask Python server (`http_server.py`) to TypeScript/Next.js format.

## ✅ Conversion Complete

The original single Flask file has been successfully converted to individual Next.js API route files. Each endpoint now has its own URL path following Next.js conventions:

- `POST /api/server/http/get_scripts_in_folder` ← **This should now work!**
- `POST /api/server/http/unified_auth`
- `POST /api/server/http/download_script`
- `POST /api/server/http/load_script_info`
- `POST /api/server/http/disconnect_device`
- etc.

## Features

- **Authentication**: Firebase authentication with device verification
- **File Management**: S3 script downloads with encryption
- **Subscription Management**: Premium content access control
- **Real-time Communication**: Server-sent events (SSE) for device communication
- **Security**: API key validation, input sanitization, and path validation

## File Structure

Each endpoint is now its own route file:
```
blenderbin/app/api/server/http/
├── shared.ts                           # Shared utilities and functions
├── unified_auth/route.ts               # User authentication
├── get_scripts_in_folder/route.ts      # S3 script listing  
├── download_script/route.ts            # Script downloads
├── load_script_info/route.ts           # Script metadata
├── disconnect_device/route.ts          # Device disconnection
└── device_events/[device_id]/route.ts  # Server-sent events
```

## API Endpoints

### POST Endpoints

- **`POST /api/server/http/unified_auth`** - User authentication and device verification
- **`POST /api/server/http/get_scripts_in_folder`** - Get scripts from S3 folders
- **`POST /api/server/http/download_script`** - Download and encrypt script files
- **`POST /api/server/http/load_script_info`** - Load script metadata
- **`POST /api/server/http/disconnect_device`** - Disconnect device from SSE

### GET Endpoints

- **`GET /api/server/http/device_events/{device_id}`** - Server-sent events stream

## Required Environment Variables

Create a `.env.local` file in the `blenderbin` directory with the following variables:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-2
S3_BUCKET_NAME=your_s3_bucket_name_here

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key_here

# Application Security
APP_SECRET_KEY=your_app_secret_key_here

# Stripe Configuration
STRIPE_API_KEY=your_stripe_api_key_here

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Dependencies

All required dependencies are already included in the `package.json`:

- `@aws-sdk/client-s3` - AWS S3 operations
- `firebase-admin` - Firebase Admin SDK
- `next` - Next.js framework
- Built-in Node.js modules: `crypto`, `zlib`, `util`

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   - Copy the environment variables above into `.env.local`
   - Replace placeholder values with your actual credentials

3. **Firebase Service Account**:
   - Upload your Firebase service account JSON file to your S3 bucket
   - The system will automatically download and use it for initialization

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Key Differences from Python Version

### Technology Stack
- **Framework**: Flask → Next.js API Routes
- **Language**: Python → TypeScript
- **AWS SDK**: boto3 → @aws-sdk/client-s3
- **Firebase SDK**: firebase-admin (Python) → firebase-admin (Node.js)

### Architecture Changes
- **Route Handling**: Individual route files following Next.js file-based routing conventions
- **Async/Await**: Consistent async/await pattern throughout
- **Type Safety**: Full TypeScript typing for better development experience
- **Error Handling**: Standardized error responses with proper HTTP status codes
- **Queue System**: Custom promise-based queue implementation to match Python's `Queue.get(timeout)` behavior
- **Shared Utilities**: Common functions and configurations in `shared.ts` for reusability

### Security Enhancements
- Input validation and sanitization
- Path traversal protection
- API key validation for all endpoints
- Firebase token verification
- Developer-only content access control

### Complete Function Coverage
All Python functions have been converted:
- ✅ `encrypt_and_compress_data()` → `encryptAndCompressData()`
- ✅ `download_service_account_key()` → `downloadServiceAccountKey()`
- ✅ `initialize_firebase()` → `initializeFirebase()`
- ✅ `auto_initialize_firebase()` → `autoInitializeFirebase()`
- ✅ `require_firebase_token()` → `verifyFirebaseToken()`
- ✅ `require_api_key()` → `validateApiKey()`
- ✅ `update_click_count()` → `updateClickCount()`
- ✅ `get_click_data()` → `getClickData()`
- ✅ `clear_user_device_info()` → `clearUserDeviceInfo()`
- ✅ `save_monthly_ratios()` → `saveMonthlyRatios()`
- ✅ `authenticate_user()` → `authenticateUser()`
- ✅ `get_script_version_hash()` → `getScriptVersionHash()`
- ✅ `sanitize_input()` → `sanitizeInput()`
- ✅ `validate_s3_path()` → `validateS3Path()`
- ✅ All Flask routes converted to Next.js handlers

### Device Queue Implementation
The Python version uses `Queue()` objects with blocking `queue.get(timeout=30)` calls. The TypeScript version implements a custom promise-based queue system that:
- Supports async `get(timeout)` method with timeout handling
- Properly queues messages when no consumers are waiting
- Immediately resolves when consumers are waiting for messages
- Matches the exact behavior of Python's threading.Queue

## Usage Examples

### Authentication
```typescript
const response = await fetch('/api/server/http/unified_auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    device_id: 'unique_device_id'
  })
})
```

### Download Script
```typescript
const response = await fetch('/api/server/http/download_script', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key',
    'Firebase-Token': 'firebase_id_token'
  },
  body: JSON.stringify({
    bucket: 'your_bucket',
    key: 'path/to/script.py',
    device_id: 'unique_device_id'
  })
})
```

### Get Scripts in Folder
```typescript
const response = await fetch('/api/server/http/get_scripts_in_folder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key',
    'Firebase-Token': 'firebase_id_token'
  },
  body: JSON.stringify({
    folder_paths: ['BACKEND/BLENDERBIN/ADDONS/']
    // or for backward compatibility:
    // folder_path: 'BACKEND/BLENDERBIN/ADDONS/'
  })
})
```

### Server-Sent Events
```typescript
// Note: You'll need to include the API key in the headers when opening the EventSource
// This requires a custom implementation or a library that supports headers
const eventSource = new EventSource('/api/server/http/device_events/your_device_id', {
  headers: {
    'X-API-Key': 'your_api_key'
  }
})

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}

// Alternative using fetch for SSE with proper headers:
const response = await fetch('/api/server/http/device_events/your_device_id', {
  method: 'GET',
  headers: {
    'X-API-Key': 'your_api_key',
    'Accept': 'text/event-stream'
  }
})

const reader = response.body?.getReader()
// Handle the stream...
```

## Error Handling

The API returns standardized error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing parameters, invalid data)
- `401` - Unauthorized (invalid API key, invalid Firebase token)
- `403` - Forbidden (subscription required for premium content)
- `404` - Not Found (endpoint or resource not found)
- `500` - Internal Server Error

## Monitoring and Logging

The route includes comprehensive logging for debugging and monitoring:
- Authentication attempts and results
- Firebase initialization status
- S3 operations
- Device connections and disconnections
- Error conditions

Check your Next.js logs for detailed information about API usage and any issues. 