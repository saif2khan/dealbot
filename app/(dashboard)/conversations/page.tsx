'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function maskPhone(phone: string) {
  if (phone.length < 6) return phone
  return phone.slice(0, 3) + '•••' + phone.slice(-4)
}

type ConvRow = {
  id: string
  buyer_phone: string
  buyer_name: string | null
  status: string
  last_message_at: string
  current_item_id: string | null
  items: { id: string; name: string } | null
  messages: Array<{ body: string; created_at: string; direction: string }>
}

type ItemOption = { id: string; name: string }

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConvRow[]>([])
  const [items, setItems] = useState<ItemOption[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [itemFilter, setItemFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: convs }, { data: sellerItems }] = await Promise.all([
        supabase
          .from('conversations')
          .select(`*, items(id, name), messages(body, created_at, direction)`)
          .eq('user_id', user.id)
          .order('last_message_at', { ascending: false }),
        supabase
          .from('items')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setConversations((convs ?? []) as ConvRow[])
      setItems((sellerItems ?? []) as ItemOption[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = conversations.filter(conv => {
    if (statusFilter !== 'all' && conv.status !== statusFilter) return false
    if (itemFilter !== 'all' && conv.current_item_id !== itemFilter) return false
    return true
  })

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    escalated: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-gray-500 text-sm mt-1">{filtered.length} thread{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>

        <select value={itemFilter} onChange={e => setItemFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="all">All items</option>
          {items.map(item => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        {(statusFilter !== 'all' || itemFilter !== 'all') && (
          <button onClick={() => { setStatusFilter('all'); setItemFilter('all') }}
            className="text-sm text-blue-600 hover:underline px-1">
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {conversations.length === 0
              ? 'No conversations yet. Post your virtual number in marketplace listings to get started.'
              : 'No conversations match the selected filters.'}
          </div>
        ) : (
          filtered.map(conv => {
            const messages = conv.messages ?? []
            const lastMsg = messages[messages.length - 1]
            const item = conv.items

            return (
              <Link
                key={conv.id}
                href={`/conversations/${conv.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">
                      {conv.buyer_name ?? maskPhone(conv.buyer_phone)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[conv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {conv.status}
                    </span>
                  </div>
                  {item && <p className="text-xs text-gray-400 mt-0.5">Re: {item.name}</p>}
                  {lastMsg && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {lastMsg.direction === 'outbound' ? 'You: ' : ''}{lastMsg.body}
                    </p>
                  )}
                </div>
                <div className="ml-4 text-xs text-gray-400 whitespace-nowrap">
                  {conv.last_message_at
                    ? new Date(conv.last_message_at).toLocaleDateString()
                    : ''}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
