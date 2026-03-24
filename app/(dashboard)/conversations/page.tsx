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

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-tertiary-container text-on-tertiary-container',
  escalated: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-slate-100 text-slate-500',
}

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

  return (
    <div className="max-w-5xl space-y-10 pb-20">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-on-surface">
            Conversations
          </h2>
          <p className="text-on-surface-variant font-medium mt-1 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block"></span>
            {filtered.length} thread{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-surface-container-low border-none rounded-xl py-3 pl-4 pr-10 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-sm">expand_more</span>
          </div>

          <div className="relative">
            <select
              value={itemFilter}
              onChange={e => setItemFilter(e.target.value)}
              className="appearance-none bg-surface-container-low border-none rounded-xl py-3 pl-4 pr-10 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer"
            >
              <option value="all">All items</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-sm">expand_more</span>
          </div>

          {(statusFilter !== 'all' || itemFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilter('all'); setItemFilter('all') }}
              className="text-sm text-primary hover:underline font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Thread list */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-on-surface-variant text-sm animate-pulse">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="pt-12 flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-32 h-32 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">forum</span>
            </div>
            <p className="font-[family-name:var(--font-manrope)] font-bold text-on-surface-variant">
              {conversations.length === 0 ? 'No conversations yet' : 'No conversations match filters'}
            </p>
            <p className="text-sm text-on-surface-variant mt-1 max-w-xs">
              {conversations.length === 0
                ? 'New inquiries for your listed items will appear here automatically.'
                : 'Try clearing the filters above.'}
            </p>
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
                className="group relative bg-white hover:bg-surface-container-low transition-all duration-200 rounded-xl p-6 shadow-sm flex items-start gap-6 cursor-pointer block"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-manrope)] font-bold text-on-surface">
                        {conv.buyer_name ?? maskPhone(conv.buyer_phone)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[conv.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {conv.status}
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {item && (
                    <p className="text-sm font-semibold text-primary-dim mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">reply</span>
                      Re: {item.name}
                    </p>
                  )}

                  {lastMsg && (
                    <p className="text-sm text-on-surface-variant truncate">
                      {lastMsg.direction === 'outbound' && <span className="font-bold text-on-surface">You: </span>}
                      {lastMsg.body}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
