import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

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
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {conv.buyer_name ?? conv.buyer_phone}
        </h1>
        {item && (
          <p className="text-gray-500 text-sm">
            Re: {item.name} — ${item.asking_price} ({item.status})
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {messages?.map(msg => {
          const isInbound = msg.direction === 'inbound'
          return (
            <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm ${
                  isInbound
                    ? 'bg-gray-100 text-gray-900'
                    : msg.sender_type === 'seller'
                    ? 'bg-yellow-100 text-yellow-900'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p>{msg.body}</p>
                <p className={`text-xs mt-1 ${isInbound ? 'text-gray-400' : 'text-blue-200'}`}>
                  {msg.sender_type} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        {(!messages || messages.length === 0) && (
          <p className="text-center text-gray-400 text-sm py-4">No messages yet.</p>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Read-only view. Conversations are managed by DealBot via SMS.
      </p>
    </div>
  )
}
