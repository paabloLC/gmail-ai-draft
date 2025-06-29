import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Gmail webhook received:', JSON.stringify(body, null, 2))

    // Parse Pub/Sub message
    if (!body.message) {
      return NextResponse.json({ error: 'No message in request' }, { status: 400 })
    }

    // Decode the Pub/Sub message data
    const messageData = body.message.data 
      ? JSON.parse(Buffer.from(body.message.data, 'base64').toString())
      : {}

    console.log('Decoded message data:', messageData)

    const { emailAddress, historyId } = messageData

    if (!emailAddress || !historyId) {
      console.log('Missing required fields in push notification')
      return NextResponse.json({ success: true }) // Acknowledge but ignore
    }

    // Find user by email address
    const user = await db.user.findUnique({
      where: { email: emailAddress },
    })

    if (!user) {
      console.log(`User not found for email: ${emailAddress}`)
      return NextResponse.json({ success: true }) // Acknowledge but ignore
    }

    console.log(`Processing Gmail notification for user ${user.id}, historyId: ${historyId}`)

    // Trigger email processing
    try {
      const handlerResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/gmail/handler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          historyId: historyId,
        }),
      })

      if (!handlerResponse.ok) {
        console.error('Failed to process emails:', await handlerResponse.text())
      } else {
        const result = await handlerResponse.json()
        console.log(`Email processing completed: ${result.processed} emails processed`)
      }
    } catch (error) {
      console.error('Failed to trigger email processing:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Gmail webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const challenge = url.searchParams.get('hub.challenge')
  
  if (challenge) {
    // Return the challenge for webhook verification
    return new Response(challenge)
  }
  
  return NextResponse.json({ message: 'Gmail webhook endpoint' })
}