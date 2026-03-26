import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

function maskPhone(phone: string) {
  if (phone.length < 6) return phone
  return phone.slice(0, 3) + '•••' + phone.slice(-4)
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  sold: 'bg-blue-100 text-blue-700',
  archived: 'bg-slate-100 text-slate-500',
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: conv } = await supabase
    .from('conversations')
    .select('*, items(id, name, asking_price, status, photo_url)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!conv) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const item = conv.items as { id: string; name: string; asking_price: number; status: string; photo_url: string | null } | null

  return (
    <div className="max-w-2xl pb-20">
      {/* Back link — mobile */}
      <Link href="/conversations" className="md:hidden inline-flex items-center gap-1 text-sm text-slate-500 mb-4">
        <span className="material-symbols-outlined text-[18px]">arrow_back_ios</span>
        Conversations
      </Link>

      {/* Desktop header */}
      <div className="hidden md:block mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900">
          {conv.buyer_name ?? maskPhone(conv.buyer_phone)}
        </h1>
      </div>

      {/* Item context card */}
      {item && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 mb-6 shadow-sm">
          {item.photo_url ? (
            <img src={item.photo_url} alt={item.name} className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-slate-400 text-[24px]">inventory_2</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-[family-name:var(--font-manrope)] font-semibold text-sm text-slate-900 truncate">{item.name}</p>
            <p className="text-sm text-slate-500">${item.asking_price}</p>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {item.status}
          </span>
        </div>
      )}

      {/* Buyer name on mobile (below item card) */}
      <div className="md:hidden mb-4">
        <h1 className="text-lg font-[family-name:var(--font-manrope)] font-bold text-slate-900">
          {conv.buyer_name ?? maskPhone(conv.buyer_phone)}
        </h1>
      </div>

      {/* Message thread */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4 max-h-[calc(100vh-360px)] md:max-h-[calc(100vh-280px)] overflow-y-auto">
        {messages?.map(msg => {
          const isInbound = msg.direction === 'inbound'
          const isSeller = msg.sender_type === 'seller'
          return (
            <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[80%] space-y-1">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isInbound
                      ? 'bg-slate-100 text-slate-900 rounded-tl-sm'
                      : isSeller
                      ? 'bg-amber-100 text-amber-900 rounded-tr-sm'
                      : 'bg-indigo-600 text-white rounded-tr-sm'
                  }`}
                >
                  {msg.body}
                </div>
                <p className={`text-[10px] font-medium uppercase tracking-wider text-slate-400 ${isInbound ? '' : 'text-right'}`}>
                  {isSeller ? 'You' : msg.sender_type === 'agent' ? 'BZARP' : 'Buyer'} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        {(!messages || messages.length === 0) && (
          <div className="text-center py-12 text-on-surface-variant text-sm">
            <span className="material-symbols-outlined text-4xl block mb-2 text-slate-300">chat_bubble</span>
            No messages yet.
          </div>
        )}
      </div>

      {/* Read-only notice */}
      <div className="mt-4 bg-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">sms</span>
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">SMS Managed Conversation</span> — This view is read-only. BZARP handles all replies via SMS on your behalf.
        </p>
      </div>
    </div>
  )
}
