import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserGmailService } from '@/lib/gmail'
import { openaiService } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { userId, historyId } = await request.json()

    if (!userId || !historyId) {
      return NextResponse.json({ error: 'Missing userId or historyId' }, { status: 400 })
    }

    console.log(`Processing emails for user ${userId}, historyId: ${historyId}`)

    // Get user and Gmail service
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        faqs: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const gmailService = await getUserGmailService(userId)
    if (!gmailService) {
      return NextResponse.json({ error: 'Gmail service not available' }, { status: 400 })
    }

    // Get new messages since last historyId
    const history = await gmailService.getMessages(user.historyId || undefined)
    
    if (!history || history.length === 0) {
      console.log('No new messages found')
      return NextResponse.json({ success: true, processed: 0 })
    }

    let processedCount = 0

    // Process each new message
    for (const historyItem of history) {
      if (historyItem && 'messagesAdded' in historyItem && historyItem.messagesAdded) {
        for (const messageAdded of historyItem.messagesAdded) {
          try {
            const messageId = messageAdded.message?.id
            if (messageId) {
              await processEmail(userId, messageId, gmailService, user)
              processedCount++
            }
          } catch (error) {
            console.error(`Failed to process message ${messageAdded.message?.id}:`, error)
          }
        }
      }
    }

    // Update user's historyId (convert to string)
    await db.user.update({
      where: { id: userId },
      data: { historyId: historyId.toString() }
    })

    console.log(`Processed ${processedCount} emails for user ${userId}`)

    return NextResponse.json({ 
      success: true, 
      processed: processedCount 
    })

  } catch (error) {
    console.error('Email processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process emails' },
      { status: 500 }
    )
  }
}

async function processEmail(userId: string, messageId: string, gmailService: any, user: any) {
  try {
    // Check if we already processed this email
    const existingLog = await db.emailLog.findUnique({
      where: { gmailMessageId: messageId }
    })

    if (existingLog) {
      console.log(`Email ${messageId} already processed, skipping`)
      return
    }

    // Get full message content
    const message = await gmailService.getMessage(messageId)
    const emailContent = gmailService.extractEmailContent(message)

    console.log(`Processing email: ${emailContent.subject} from ${emailContent.from}`)

    // Skip if it's our own email or from certain addresses
    if (emailContent.from.includes(user.email) || 
        emailContent.from.includes('noreply') ||
        emailContent.from.includes('no-reply')) {
      console.log('Skipping automated or own email')
      return
    }

    // Classify email with AI
    const classification = await openaiService.classifyEmail({
      subject: emailContent.subject,
      body: emailContent.body,
      from: emailContent.from,
      to: emailContent.to
    })

    console.log(`Email classified as: ${classification.category} (${classification.confidence})`)

    // Create email log
    const emailLog = await db.emailLog.create({
      data: {
        gmailMessageId: messageId,
        gmailThreadId: emailContent.threadId,
        subject: emailContent.subject,
        fromEmail: emailContent.from,
        fromName: extractNameFromEmail(emailContent.from),
        receivedAt: emailContent.date,
        intent: classification.intent,
        confidence: classification.confidence,
        userId: userId
      }
    })

    // Generate response if needed
    if (classification.requiresResponse && user.autoRespond && classification.category !== 'spam') {
      try {
        const response = await openaiService.generateResponse(
          {
            subject: emailContent.subject,
            body: emailContent.body,
            from: emailContent.from,
            to: emailContent.to
          },
          classification,
          user.customInstructions,
          user.businessTone,
          user.faqs,
          user.name
        )

        console.log(`Generated response with confidence: ${response.confidence}`)

        // Create draft if confidence is high enough
        if (response.confidence > 0.7) {
          const draft = await gmailService.createDraft(
            emailContent.from,
            emailContent.subject, // Pass original subject, createDraft will handle "Re:" prefix
            response.response,
            emailContent.threadId,
            emailContent.originalMessageId
          )

          // Update email log with draft info
          await db.emailLog.update({
            where: { id: emailLog.id },
            data: {
              responseGenerated: true,
              draftCreated: true,
              gmailDraftId: draft.id
            }
          })

          console.log(`Draft created for email ${messageId}`)
        } else {
          // Mark as response generated but no draft due to low confidence
          await db.emailLog.update({
            where: { id: emailLog.id },
            data: {
              responseGenerated: true,
              draftCreated: false
            }
          })

          console.log(`Response generated but not drafted due to low confidence: ${response.confidence}`)
        }
      } catch (error) {
        console.error('Failed to generate response:', error)
      }
    }

  } catch (error) {
    console.error(`Failed to process email ${messageId}:`, error)
    throw error
  }
}

function extractNameFromEmail(emailString: string): string {
  const match = emailString.match(/^(.+?)\s*<.*>$/)
  return match ? match[1].trim().replace(/"/g, '') : emailString.split('@')[0]
}