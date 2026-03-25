'use client'

import { useState } from 'react'

export default function VirtualNumberBanner({
  number,
  agentName,
  agentGender,
}: {
  number: string
  agentName: string
  agentGender: 'male' | 'female'
}) {
  const [copiedNumber, setCopiedNumber] = useState(false)
  const [copiedPhrase, setCopiedPhrase] = useState(false)

  const pronoun = agentGender === 'female' ? 'she' : 'he'
  const listingPhrase = `Hi! I'm using an AI assistant named ${agentName} to handle inquiries for this listing. Please text ${agentName} at ${number} — ${pronoun} responds instantly 24/7. I'm not monitoring FB Messenger.`

  async function handleCopyNumber() {
    await navigator.clipboard.writeText(number)
    setCopiedNumber(true)
    setTimeout(() => setCopiedNumber(false), 2000)
  }

  async function handleCopyPhrase() {
    await navigator.clipboard.writeText(listingPhrase)
    setCopiedPhrase(true)
    setTimeout(() => setCopiedPhrase(false), 2000)
  }

  return (
    <section className="bg-[#f0f7ff] border border-[#dce9ff] rounded-2xl p-8 relative overflow-hidden">
      {/* Number row */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-2">Your BZARP Number</p>
          <h3 className="text-3xl font-[family-name:var(--font-manrope)] font-black text-[#1a237e]">{number}</h3>
        </div>
        <button
          onClick={handleCopyNumber}
          className="bg-[#dce9ff] hover:bg-[#cfdfff] text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
        >
          {copiedNumber ? '✓ Copied!' : 'Copy number'}
        </button>
      </div>

      {/* Listing phrase card */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
        <p className="text-on-surface-variant text-xs mb-4">Paste this into your listing description:</p>
        <p className="text-sm text-slate-800 leading-relaxed mb-6">{listingPhrase}</p>
        <button
          onClick={handleCopyPhrase}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors"
        >
          {copiedPhrase ? '✓ Copied!' : 'Copy listing text'}
        </button>
      </div>
    </section>
  )
}
