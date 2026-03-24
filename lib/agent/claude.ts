import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '@/types/database'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Use Haiku in dev for cost, Sonnet in prod for quality
const MODEL = process.env.NODE_ENV === 'production'
  ? 'claude-sonnet-4-6'
  : 'claude-haiku-4-5-20251001'

export async function callClaude(
  systemPrompt: string,
  history: Message[],
  buyerMessage: string
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({
      role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
      content: m.body,
    })),
    { role: 'user', content: buyerMessage },
  ]

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages,
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}
