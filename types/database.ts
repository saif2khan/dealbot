export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete'

export type ItemStatus = 'active' | 'pending' | 'sold' | 'archived'
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'for_parts'
export type ItemCategory = 'electronics' | 'furniture' | 'vehicle' | 'clothing' | 'other'

export type ConversationStatus = 'active'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageSenderType = 'buyer' | 'agent' | 'seller'

export type DealStatus = 'scheduled' | 'completed' | 'cancelled'

export interface User {
  id: string
  email: string
  name: string | null
  address: string | null // stored encrypted
  address_area: string | null // city/neighborhood for sharing before deal
  phone: string | null
  telnyx_number: string | null
  telnyx_number_id: string | null
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus | null
  trial_ends_at: string | null
  global_instructions: string | null
  availability_text: string | null
  agent_tone: 'professional' | 'friendly' | 'firm' | 'custom'
  custom_tone_instructions: string | null
  agent_name: string
  agent_gender: 'male' | 'female'
  agent_active: boolean
  items_listed_this_month: number
  items_limit: number
  created_at: string
}

export interface Item {
  id: string
  user_id: string
  name: string
  description: string
  category: ItemCategory | null
  tags: string[]
  condition: ItemCondition
  asking_price: number
  max_discount: number
  firm_price: boolean
  preferred_times: string | null
  photo_url: string | null
  status: ItemStatus
  pending_buyer_id: string | null
  created_at: string
  archived_at: string | null
}

export interface Conversation {
  id: string
  user_id: string
  buyer_phone: string
  buyer_name: string | null
  current_item_id: string | null
  status: ConversationStatus
  created_at: string
  last_message_at: string
}

export interface Message {
  id: string
  conversation_id: string
  direction: MessageDirection
  body: string
  sender_type: MessageSenderType
  created_at: string
}

export interface PendingDeal {
  id: string
  item_id: string
  conversation_id: string
  buyer_phone: string
  buyer_name: string
  agreed_price: number
  meetup_date: string
  meetup_time: string
  meetup_location: string
  status: DealStatus
  created_at: string
}

export interface WaitlistEntry {
  id: string
  item_id: string
  conversation_id: string
  buyer_phone: string
  created_at: string
}
