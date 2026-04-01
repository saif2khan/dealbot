'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'

interface Props {
  itemId: string
  itemName: string
}

export default function MarkSoldButton({ itemId, itemName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSold() {
    setLoading(true)
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sold' }),
    })
    setLoading(false)

    if (res.ok) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4955b3', '#6366f1', '#a5b4fc', '#34d399', '#fbbf24'],
      })
      router.refresh()
    }

    setConfirming(false)
  }

  if (confirming) {
    return (
      <>
        {/* Mobile: full-width bottom sheet style */}
        <div className="md:hidden fixed inset-0 bg-black/20 z-50" onClick={() => setConfirming(false)} />
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 p-5 pb-8 space-y-4 animate-in slide-in-from-bottom">
          <p className="text-sm font-semibold text-slate-900 text-center">
            Mark &quot;{itemName}&quot; as sold?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-3 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSold}
              disabled={loading}
              className="flex-1 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-3 rounded-xl disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Yes, sold!'}
            </button>
          </div>
        </div>

        {/* Desktop: inline confirmation */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500">Mark &quot;{itemName}&quot; as sold?</span>
          <button
            onClick={handleSold}
            disabled={loading}
            className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : 'Yes, sold'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors shrink-0 flex items-center gap-1"
      title="Mark as sold"
    >
      <span className="material-symbols-outlined text-[16px]">sell</span>
      <span className="hidden sm:inline">Sold</span>
    </button>
  )
}
