import { PubSub } from '@google-cloud/pubsub'

const pubsub = new PubSub({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
})

export interface GmailPushNotification {
  message: {
    data: string
    messageId: string
    publishTime: string
  }
  subscription: string
}

export interface GmailPushData {
  emailAddress: string
  historyId: string
}

export function parseGmailPushNotification(notification: GmailPushNotification): GmailPushData | null {
  try {
    const data = JSON.parse(Buffer.from(notification.message.data, 'base64').toString())
    return {
      emailAddress: data.emailAddress,
      historyId: data.historyId,
    }
  } catch (error) {
    console.error('Failed to parse Gmail push notification:', error)
    return null
  }
}

export async function verifyPubSubToken(token: string): Promise<boolean> {
  // In production, you should verify the JWT token from Google Cloud Pub/Sub
  // For now, we'll implement basic verification
  try {
    // This is a simplified verification - in production you should:
    // 1. Verify the JWT signature
    // 2. Check the audience claim
    // 3. Verify the issuer
    // 4. Check token expiration
    
    if (!token) return false
    
    // For development, we'll accept any non-empty token
    // In production, implement proper JWT verification
    return true
  } catch (error) {
    console.error('Failed to verify Pub/Sub token:', error)
    return false
  }
}

export async function createPubSubTopic(topicName: string) {
  try {
    const [topic] = await pubsub.createTopic(topicName)
    console.log(`Topic ${topicName} created successfully`)
    return topic
  } catch (error) {
    if ((error as any).code === 6) {
      // Topic already exists
      console.log(`Topic ${topicName} already exists`)
      return pubsub.topic(topicName)
    }
    throw error
  }
}

export async function createPubSubSubscription(topicName: string, subscriptionName: string, endpoint: string) {
  try {
    const topic = pubsub.topic(topicName)
    
    const [subscription] = await topic.createSubscription(subscriptionName, {
      pushConfig: {
        pushEndpoint: endpoint,
      },
    })
    
    console.log(`Subscription ${subscriptionName} created successfully`)
    return subscription
  } catch (error) {
    if ((error as any).code === 6) {
      // Subscription already exists
      console.log(`Subscription ${subscriptionName} already exists`)
      return pubsub.subscription(subscriptionName)
    }
    throw error
  }
}