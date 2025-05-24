import { NextRequest } from 'next/server'
import { 
  validateApiKey,
  createQueue,
  deviceQueues,
  deviceEvents
} from '../../shared'

export async function GET(
  request: NextRequest,
  { params }: { params: { device_id: string } }
) {
  // Validate API key
  if (!validateApiKey(request)) {
    return new Response(
      JSON.stringify({ status: "error", message: "Invalid API key" }),
      { status: 401 }
    )
  }

  const deviceId = params.device_id
  
  console.log(`SSE connection attempt from device: ${deviceId}`)

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-API-Key',
    'Access-Control-Allow-Methods': 'GET',
    'X-Accel-Buffering': 'no'
  })

  // Initialize device queue if not exists
  if (!(deviceId in deviceQueues)) {
    deviceQueues[deviceId] = createQueue()
    deviceEvents[deviceId] = true
  }

  const stream = new ReadableStream({
    async start(controller) {
      console.log(`Device ${deviceId} connected to SSE stream`)
      
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: "connected",
        message: "SSE connection established"
      })}\n\n`
      controller.enqueue(new TextEncoder().encode(initialMessage))

      const queue = deviceQueues[deviceId]
      
      // Main message loop
      while (true) {
        try {
          // Wait for new messages with a timeout (mimicking Python's queue.get(timeout=30))
          const message = await queue.get(30000) // 30 second timeout
          
          if (message === null) {
            // Stop signal
            console.log(`Received stop signal for device: ${deviceId}`)
            controller.close()
            break
          }
          
          console.log(`Sending message to device ${deviceId}:`, message)
          const sseMessage = `data: ${JSON.stringify(message)}\n\n`
          controller.enqueue(new TextEncoder().encode(sseMessage))
          
        } catch (error) {
          // Timeout occurred, send keepalive
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"))
        }
        
        // Check if request was aborted
        if (request.signal.aborted) {
          console.log(`Request aborted for device: ${deviceId}`)
          break
        }
      }

      // Clean up on close
      console.log(`Cleaning up connection for device: ${deviceId}`)
      delete deviceQueues[deviceId]
      delete deviceEvents[deviceId]
    }
  })

  return new Response(stream, { headers })
} 