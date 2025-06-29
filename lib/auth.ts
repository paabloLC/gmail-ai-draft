import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { db } from '@/lib/db'
import type { AuthOptions } from 'next-auth'
import { google } from 'googleapis'

interface GmailCredentials {
  accessToken: string
  refreshToken: string
  expiresAt?: Date | null
}

async function setupGmailWatchForUser(userId: string, credentials: GmailCredentials) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiresAt?.getTime(),
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

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

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.settings.basic',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  events: {
    async linkAccount({ account, user }) {
      // Store tokens in user record when account is linked
      if (account.provider === 'google') {
        try {
          await db.user.update({
            where: { id: user.id },
            data: {
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            }
          })

          // Auto-setup Gmail Watch for all users in multi-user mode
          const multiUserMode = process.env.MULTI_USER_MODE === 'true'
          if (multiUserMode && account.access_token && account.refresh_token) {
            try {
              await setupGmailWatchForUser(user.id, {
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
              })
              console.log(`Gmail Watch auto-configured for user ${user.id}`)
            } catch (error) {
              console.error(`Failed to auto-setup Gmail Watch for user ${user.id}:`, error)
            }
          }
        } catch (error) {
          console.error('Failed to store OAuth tokens in user record:', error)
        }
      }
    },
  },
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
}