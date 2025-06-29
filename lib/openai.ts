import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface EmailContent {
  subject: string
  body: string
  from: string
  to: string
}

export interface EmailClassification {
  intent: string
  confidence: number
  category: 'question' | 'request' | 'complaint' | 'information' | 'spam' | 'other'
  urgency: 'low' | 'medium' | 'high'
  requiresResponse: boolean
  summary: string
}

export interface EmailResponse {
  response: string
  tone: string
  confidence: number
}

export class OpenAIService {
  async classifyEmail(email: EmailContent): Promise<EmailClassification> {
    try {
      const prompt = `
Analyze this email and classify it:

Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

Please analyze and respond with a JSON object containing:
- intent: brief description of what the sender wants
- confidence: confidence score 0-1
- category: one of [question, request, complaint, information, spam, other]
- urgency: one of [low, medium, high]
- requiresResponse: boolean if this needs a response
- summary: 1-sentence summary of the email

Respond only with valid JSON.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an AI email classification system. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      // Clean the response to extract JSON
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      return JSON.parse(cleanContent) as EmailClassification
    } catch (error) {
      console.error('Failed to classify email:', error)
      // Return default classification on error
      return {
        intent: 'unknown',
        confidence: 0.1,
        category: 'other',
        urgency: 'low',
        requiresResponse: false,
        summary: 'Unable to classify email'
      }
    }
  }

  async generateResponse(
    email: EmailContent, 
    classification: EmailClassification,
    userInstructions?: string,
    businessTone?: string,
    faqs?: Array<{question: string, answer: string}>,
    userName?: string
  ): Promise<EmailResponse> {
    try {
      // Build context from FAQs
      const faqContext = faqs && faqs.length > 0 
        ? `\n\nRelevant FAQs:\n${faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}`
        : ''

      const prompt = `
Generate a professional email response based on the following:

Original Email:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

Email Classification:
Intent: ${classification.intent}
Category: ${classification.category}
Urgency: ${classification.urgency}
Summary: ${classification.summary}

Response Guidelines:
- Business tone: ${businessTone || 'professional'}
- Custom instructions: ${userInstructions || 'None'}
${faqContext}

Generate a helpful, professional response that:
1. Acknowledges their ${classification.category}
2. Addresses their specific intent: ${classification.intent}
3. Uses a ${businessTone || 'professional'} tone
4. Is concise but complete
5. Includes relevant information from FAQs if applicable
6. ${userName ? `Ends with a professional signature using the name: ${userName}` : 'Ends with a professional signature'}
7. Uses plain text format only (no HTML, no markdown, no special formatting)
8. Uses proper line breaks (\n) for paragraphs, not <br> tags

Respond with a JSON object containing:
- response: the email response text
- tone: the tone used
- confidence: confidence score 0-1 for response quality

Respond only with valid JSON.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email response generator. Always respond with valid JSON containing the response text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      // Clean the response to extract JSON
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      return JSON.parse(cleanContent) as EmailResponse
    } catch (error) {
      console.error('Failed to generate response:', error)
      return {
        response: 'Thank you for your email. We have received your message and will respond as soon as possible.',
        tone: 'professional',
        confidence: 0.5
      }
    }
  }
}

export const openaiService = new OpenAIService()