import { NextRequest, NextResponse } from 'next/server'
import { 
  validateApiKey,
  deviceQueues,
  deviceEvents
} from '../shared'

export async function POST(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { status: "error", message: "Invalid API key" },
      { status: 401 }
    )
  }

  const data = await request.json()
  const { device_id } = data
  
  try {
    if (device_id in deviceQueues) {
      // Send None to stop the event stream (matching Python's queue.put(None))
      deviceQueues[device_id].put(null)
      // Clean up
      delete deviceQueues[device_id]
      delete deviceEvents[device_id]
    }
    
    return NextResponse.json({ status: "success" })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: String(error)
    }, { status: 500 })
  }
} 