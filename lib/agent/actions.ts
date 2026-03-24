/** Parsed agent action extracted from response */
export type AgentAction =
  | { type: 'ITEM_IDENTIFIED'; itemId: string }
  | { type: 'DEAL_CONFIRMED'; itemId: string; agreedPrice: number; buyerName: string; meetupDate: string; meetupTime: string; meetupLocation: string }
  | { type: 'WAITLIST_JOIN'; buyerName: string; offeredPrice: number }
  | { type: 'ESCALATE'; reason: string; lastBuyerMessage: string }

/** Extract <ACTION>...</ACTION> block from agent response */
export function parseAction(response: string): { text: string; action: AgentAction | null } {
  const actionMatch = response.match(/<ACTION>([\s\S]*?)<\/ACTION>/)
  if (!actionMatch) return { text: response.trim(), action: null }

  const text = response.replace(/<ACTION>[\s\S]*?<\/ACTION>/, '').trim()
  try {
    const action = JSON.parse(actionMatch[1]) as AgentAction
    return { text, action }
  } catch {
    return { text, action: null }
  }
}
