import { google } from 'googleapis'
import { db } from './db'

export interface GmailCredentials {
  accessToken: string
  refreshToken: string
  expiresAt?: Date | null
}

export class GmailService {
  private oauth2Client: any

  constructor(credentials: GmailCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    )

    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiresAt?.getTime(),
    })
  }

  async getGmailClient() {
    return google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  async setupWatch(userId: string) {
    try {
      const gmail = await this.getGmailClient()
      
      if (!process.env.PUBSUB_TOPIC) {
        throw new Error('PUBSUB_TOPIC environment variable not configured')
      }
      
      const response = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: process.env.PUBSUB_TOPIC,
          labelIds: ['INBOX'],
          labelFilterAction: 'include',
        },
      })

      if (!response.data.expiration || !response.data.historyId) {
        throw new Error('Invalid response from Gmail Watch API')
      }

      // Update user with watch expiry and history ID
      await db.user.update({
        where: { id: userId },
        data: {
          gmailWatchExpiry: new Date(parseInt(response.data.expiration)),
          historyId: response.data.historyId,
        },
      })

      console.log(`Gmail watch setup successful for user ${userId}:`, {
        expiration: new Date(parseInt(response.data.expiration)),
        historyId: response.data.historyId
      })

      return {
        expiration: response.data.expiration,
        historyId: response.data.historyId,
        success: true
      }
    } catch (error) {
      console.error('Failed to setup Gmail watch:', error)
      throw error
    }
  }

  async getMessages(historyId?: string) {
    try {
      const gmail = await this.getGmailClient()

      if (historyId) {
        // Get history since last check
        const history = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: historyId,
          labelId: 'INBOX',
        })

        return history.data.history || []
      } else {
        // Get recent messages
        const messages = await gmail.users.messages.list({
          userId: 'me',
          labelIds: ['INBOX'],
          maxResults: 10,
        })

        return messages.data.messages || []
      }
    } catch (error) {
      console.error('Failed to get messages:', error)
      throw error
    }
  }

  async getMessage(messageId: string) {
    try {
      const gmail = await this.getGmailClient()
      
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })

      return message.data
    } catch (error) {
      console.error('Failed to get message:', error)
      throw error
    }
  }

  extractEmailContent(message: any) {
    try {
      const headers = message.payload?.headers || []
      
      // Extract headers
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject'
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown sender'
      const to = headers.find((h: any) => h.name === 'To')?.value || 'Unknown recipient'
      const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString()
      const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || null
      
      // Extract body
      let body = ''
      
      if (message.payload?.parts) {
        // Multi-part message
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8')
          }
        }
      } else if (message.payload?.body?.data) {
        // Single part message
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
      }

      // Clean up body text
      body = body.replace(/\r\n/g, '\n').trim()

      return {
        messageId: message.id,
        threadId: message.threadId,
        subject,
        from,
        to,
        date: new Date(date),
        body,
        snippet: message.snippet || '',
        labelIds: message.labelIds || [],
        originalMessageId: messageId
      }
    } catch (error) {
      console.error('Failed to extract email content:', error)
      throw error
    }
  }

  async createDraft(to: string, subject: string, body: string, threadId?: string, originalMessageId?: string) {
    try {
      const gmail = await this.getGmailClient()

      // Ensure subject has "Re:" prefix if it's a reply
      const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`

      // Create email headers
      const headers = [
        `To: ${to}`,
        `Subject: ${replySubject}`,
        `Content-Type: text/plain; charset=UTF-8`,
      ]

      // Add threading headers if originalMessageId is provided
      if (originalMessageId) {
        headers.push(`In-Reply-To: ${originalMessageId}`)
        headers.push(`References: ${originalMessageId}`)
      }

      // Clean body text - remove HTML tags and convert <br> to line breaks
      const cleanBody = body
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()

      const email = [
        ...headers,
        '', // Empty line to separate headers from body
        cleanBody,
      ].join('\n')

      const encodedEmail = Buffer.from(email).toString('base64url')

      const draft = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedEmail,
            threadId,
          },
        },
      })

      return draft.data
    } catch (error) {
      console.error('Failed to create draft:', error)
      throw error
    }
  }

  async getLabels() {
    try {
      const gmail = await this.getGmailClient()
      
      const labels = await gmail.users.labels.list({
        userId: 'me',
      })

      return labels.data.labels || []
    } catch (error) {
      console.error('Failed to get labels:', error)
      throw error
    }
  }

  async createLabel(name: string, color: string) {
    try {
      const gmail = await this.getGmailClient()
      
      const label = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          color: {
            backgroundColor: color,
            textColor: '#ffffff',
          },
          messageListVisibility: 'show',
          labelListVisibility: 'labelShow',
        },
      })

      return label.data
    } catch (error) {
      console.error('Failed to create label:', error)
      throw error
    }
  }

  async addLabelToMessage(messageId: string, labelId: string) {
    try {
      const gmail = await this.getGmailClient()
      
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId],
        },
      })
    } catch (error) {
      console.error('Failed to add label to message:', error)
      throw error
    }
  }
}

export async function getUserGmailService(userId: string): Promise<GmailService | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
    },
  })

  if (!user?.accessToken || !user?.refreshToken) {
    return null
  }

  return new GmailService({
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
    expiresAt: user.tokenExpiresAt,
  })
}