import Anthropic from '@anthropic-ai/sdk'
import type { Item } from '@/types/database'

export type SellerCommand =
  | { type: 'STATUS_CHANGE'; itemName: string; newStatus: 'sold' | 'active' | 'archived' }
  | { type: 'CANCEL_DEAL'; itemName: string }
  | { type: 'NONE' }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function detectSellerCommand(
  messageText: string,
  sellerItems: Item[]
): Promise<SellerCommand> {
  if (!sellerItems.length) return { type: 'NONE' }

  const itemList = sellerItems.map(i => `- "${i.name}" (status: ${i.status})`).join('\n')

  const systemPrompt = `You detect inventory management commands from a seller in a peer-to-peer marketplace.

The seller's items:
${itemList}

Classify the seller's message into one of these actions:
- STATUS_CHANGE to sold: "mark X as sold", "sold the X", "X is sold", "X went for [price]"
- STATUS_CHANGE to active: "X is available again", "mark X as available", "relist X", "deal fell through on X", "buyer ghosted on X"
- STATUS_CHANGE to archived: "archive X", "remove X listing", "take down X"
- CANCEL_DEAL: "cancel the deal on X", "deal cancelled for X", "buyer backed out of X"
- NONE: anything else (general questions, escalation replies, etc.)

Respond with ONLY valid JSON — no explanation:
{"type":"STATUS_CHANGE","itemName":"exact item name","newStatus":"sold"|"active"|"archived"}
{"type":"CANCEL_DEAL","itemName":"exact item name"}
{"type":"NONE"}

Match item names loosely (e.g. "couch" matches "Blue IKEA Couch"). Use the exact item name from the list.`

  try {
    console.log(`[sellerCommands] items=${sellerItems.length}, message="${messageText}"`)
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageText }],
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    console.log(`[sellerCommands] raw response: ${raw}`)
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(text)
    return parsed as SellerCommand
  } catch (err) {
    console.error(`[sellerCommands] error:`, err)
    return { type: 'NONE' }
  }
}
