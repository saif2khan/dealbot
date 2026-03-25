import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

function maskPhone(phone: string) {
  if (phone.length < 6) return phone
  return phone.slice(0, 3) + '•••' + phone.slice(-4)
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: conv } = await supabase
    .from('conversations')
    .select('*, items(name, asking_price, status)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!conv) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const item = conv.items as { name: string; asking_price: number; status: string } | null

  return (
    <div className="max-w-2xl space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900">
          {conv.buyer_name ?? maskPhone(conv.buyer_phone)}
        </h1>
        {item && (
          <p className="text-on-surface-variant text-sm mt-1">
            Re: {item.name} — ${item.asking_price}{' '}
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 ml-1">
              {item.status}
            </span>
          </p>
        )}
      </div>

      {/* Message thread */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto">
        {messages?.map(msg => {
          const isInbound = msg.direction === 'inbound'
          const isSeller = msg.sender_type === 'seller'
          return (
            <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] space-y-1 ${isInbound ? '' : ''}`}>
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
                <p className={`text-[10px] font-medium uppercase tracking-wider ${isInbound ? 'text-slate-400' : 'text-slate-400 text-right'}`}>
                  {isSeller ? 'You' : msg.sender_type === 'agent' ? 'Agent' : 'Buyer'} · {new Date(msg.created_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' })} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      <p className="text-xs text-on-surface-variant text-center">
        Read-only view. Conversations are managed by BZARP via SMS.
      </p>
    </div>
  )
}
