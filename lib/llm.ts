import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface EmailClassification {
  intent: string
  confidence: number
  suggestedLabel?: string
  reasoning: string
}

export interface EmailResponse {
  response: string
  tone: string
  reasoning: string
}

export interface UserContext {
  businessTone: string
  customInstructions?: string
  faqs: Array<{ question: string; answer: string }>
}

export async function classifyEmail(
  subject: string,
  body: string,
  fromEmail: string,
  userContext: UserContext
): Promise<EmailClassification> {
  try {
    const prompt = `
You are an AI email classifier. Analyze the following email and classify its intent.

Email Details:
- From: ${fromEmail}
- Subject: ${subject}
- Body: ${body}

Business Context:
- Tone: ${userContext.businessTone}
- Custom Instructions: ${userContext.customInstructions || 'None'}

Available FAQs:
${userContext.faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

Classify this email into one of these categories:
- inquiry: General questions or information requests
- support: Technical support or help requests  
- sales: Sales inquiries or purchase interest
- complaint: Complaints or negative feedback
- partnership: Business partnership or collaboration
- spam: Spam or promotional emails
- other: Anything that doesn't fit above categories

Respond with a JSON object containing:
- intent: The classification category
- confidence: A number between 0 and 1 indicating confidence
- suggestedLabel: A short label name for organizing
- reasoning: Brief explanation of the classification

Example:
{
  "intent": "inquiry",
  "confidence": 0.85,
  "suggestedLabel": "General Inquiry",
  "reasoning": "Customer asking about product features and pricing"
}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    })

    const result = completion.choices[0]?.message?.content
    if (!result) throw new Error('No classification result')

    return JSON.parse(result) as EmailClassification
  } catch (error) {
    console.error('Failed to classify email:', error)
    return {
      intent: 'other',
      confidence: 0.1,
      reasoning: 'Classification failed',
    }
  }
}

export async function generateEmailResponse(
  subject: string,
  body: string,
  fromEmail: string,
  fromName: string | undefined,
  classification: EmailClassification,
  userContext: UserContext
): Promise<EmailResponse> {
  try {
    const relevantFAQs = userContext.faqs.filter(faq => 
      faq.question.toLowerCase().includes(classification.intent) ||
      body.toLowerCase().includes(faq.question.toLowerCase().substring(0, 20))
    )

    const prompt = `
You are an AI email assistant. Generate a professional email response.

Original Email:
- From: ${fromName || fromEmail}
- Subject: ${subject}
- Body: ${body}

Email Classification:
- Intent: ${classification.intent}
- Confidence: ${classification.confidence}
- Reasoning: ${classification.reasoning}

Business Context:
- Tone: ${userContext.businessTone}
- Custom Instructions: ${userContext.customInstructions || 'None'}

Relevant FAQs:
${relevantFAQs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

Generate a response that:
1. Addresses the sender by name if provided
2. Acknowledges their ${classification.intent}
3. Provides helpful information using FAQs when relevant
4. Maintains a ${userContext.businessTone} tone
5. Includes a clear call-to-action or next steps
6. Is concise but complete

Respond with a JSON object containing:
- response: The email response text
- tone: The tone used (should match requested tone)
- reasoning: Brief explanation of the response approach

Example:
{
  "response": "Dear John,\n\nThank you for your inquiry about our services...",
  "tone": "professional",
  "reasoning": "Acknowledged inquiry and provided relevant information from FAQs"
}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    })

    const result = completion.choices[0]?.message?.content
    if (!result) throw new Error('No response generated')

    return JSON.parse(result) as EmailResponse
  } catch (error) {
    console.error('Failed to generate email response:', error)
    return {
      response: `Dear ${fromName || 'there'},\n\nThank you for your email. We have received your message and will get back to you shortly.\n\nBest regards,\nThe Team`,
      tone: userContext.businessTone,
      reasoning: 'Fallback response due to generation error',
    }
  }
}