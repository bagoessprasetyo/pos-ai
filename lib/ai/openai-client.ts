import OpenAI from 'openai'

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Configuration
export const AI_CONFIG = {
  model: process.env.AI_MODEL || 'gpt-4o-mini', // Use mini for cost efficiency
  temperature: 0.7,
  maxTokens: 1500,
  fallbackModel: 'gpt-3.5-turbo',
}

// AI service wrapper with error handling
export async function generateAICompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    stream?: boolean
  }
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: options?.model || AI_CONFIG.model,
      messages,
      temperature: options?.temperature || AI_CONFIG.temperature,
      max_tokens: options?.maxTokens || AI_CONFIG.maxTokens,
      stream: false, // Always use non-streaming for simplicity
    })

    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('OpenAI API Error:', error)
    
    // Fallback to simpler model if main model fails
    if (options?.model !== AI_CONFIG.fallbackModel) {
      try {
        const fallbackCompletion = await openai.chat.completions.create({
          model: AI_CONFIG.fallbackModel,
          messages,
          temperature: options?.temperature || AI_CONFIG.temperature,
          max_tokens: options?.maxTokens || AI_CONFIG.maxTokens,
        })
        
        return fallbackCompletion.choices[0]?.message?.content || ''
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError)
        throw new Error('AI service temporarily unavailable')
      }
    }
    
    throw error
  }
}

// Streaming completion for real-time responses
export async function generateStreamingCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  onChunk: (content: string) => void,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
): Promise<void> {
  try {
    const stream = await openai.chat.completions.create({
      model: options?.model || AI_CONFIG.model,
      messages,
      temperature: options?.temperature || AI_CONFIG.temperature,
      max_tokens: options?.maxTokens || AI_CONFIG.maxTokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        onChunk(content)
      }
    }
  } catch (error) {
    console.error('Streaming completion error:', error)
    throw error
  }
}

// Utility function to validate API key
export function isAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY
}

// Function to estimate token count (rough approximation)
export function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

// Rate limiting helper
export class AIRateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly timeWindow: number

  constructor(maxRequests = 60, timeWindowMinutes = 1) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindowMinutes * 60 * 1000 // Convert to milliseconds
  }

  canMakeRequest(): boolean {
    const now = Date.now()
    
    // Remove requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    // Check if we can make another request
    return this.requests.length < this.maxRequests
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  getTimeUntilNextRequest(): number {
    if (this.canMakeRequest()) return 0
    
    const oldestRequest = Math.min(...this.requests)
    return this.timeWindow - (Date.now() - oldestRequest)
  }
}

// Global rate limiter instance
export const aiRateLimiter = new AIRateLimiter()

// Enhanced AI completion with rate limiting
export async function generateRateLimitedCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    stream?: boolean
  }
): Promise<string> {
  if (!aiRateLimiter.canMakeRequest()) {
    const waitTime = aiRateLimiter.getTimeUntilNextRequest()
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`)
  }

  aiRateLimiter.recordRequest()
  return generateAICompletion(messages, options)
}