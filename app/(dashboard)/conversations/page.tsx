'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function maskPhone(phone: string) {
  if (phone.length < 6) return phone
  return phone.slice(0, 3) + '•••' + phone.slice(-4)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
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
  active: 'bg-emerald-100 text-emerald-700',
}

const STATUS_CHIPS = [
  { value: 'all', label: 'All Threads' },
  { value: 'active', label: 'Active' },
]

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConvRow[]>([])
  const [items, setItems] = useState<ItemOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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
    if (search) {
      const q = search.toLowerCase()
      const name = (conv.buyer_name ?? conv.buyer_phone).toLowerCase()
      const itemName = conv.items?.name?.toLowerCase() ?? ''
      if (!name.includes(q) && !itemName.includes(q)) return false
    }
    return true
  })

  return (
    <div className="max-w-5xl space-y-6 pb-20">
      {/* Page header — desktop only */}
      <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-on-surface">
            Conversations
          </h2>
          <p className="text-on-surface-variant font-medium mt-1 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block"></span>
            {filtered.length} thread{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Desktop filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-9 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">expand_more</span>
          </div>

          <div className="relative">
            <select
              value={itemFilter}
              onChange={e => setItemFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-9 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">All items</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">expand_more</span>
          </div>

          {(statusFilter !== 'all' || itemFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilter('all'); setItemFilter('all') }}
              className="text-sm text-indigo-600 hover:underline font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Mobile status chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {STATUS_CHIPS.map(chip => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              statusFilter === chip.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-on-surface-variant text-sm animate-pulse">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="pt-12 flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">forum</span>
            </div>
            <p className="font-[family-name:var(--font-manrope)] font-bold text-on-surface-variant">
              {conversations.length === 0 ? 'No conversations yet' : 'No conversations match'}
            </p>
            <p className="text-sm text-on-surface-variant mt-1 max-w-xs">
              {conversations.length === 0
                ? 'New inquiries for your listed items will appear here automatically.'
                : 'Try a different search or filter.'}
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
                className="group bg-white hover:bg-slate-50 transition-all rounded-xl p-4 shadow-sm flex items-center gap-3 block"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-[family-name:var(--font-manrope)] font-semibold text-sm text-slate-900 truncate">
                      {conv.buyer_name ?? maskPhone(conv.buyer_phone)}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                    </span>
                  </div>

                  {lastMsg && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {lastMsg.body}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[conv.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {conv.status}
                    </span>
                    {item && (
                      <span className="text-[10px] text-slate-400 truncate">· {item.name}</span>
                    )}
                  </div>
                </div>

                <span className="material-symbols-outlined text-slate-300 text-[18px] shrink-0 group-hover:text-slate-400 transition-colors">chevron_right</span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
