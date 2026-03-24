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
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      {/* Number row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Your DealBot Number</p>
          <p className="text-xl font-bold text-blue-900 mt-0.5">{number}</p>
        </div>
        <button
          onClick={handleCopyNumber}
          className="ml-4 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-200 transition"
        >
          {copiedNumber ? 'Copied!' : 'Copy number'}
        </button>
      </div>

      {/* Listing phrase */}
      <div className="bg-white border border-blue-100 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-500 mb-1.5">Paste this into your listing description:</p>
        <p className="text-sm text-gray-700 leading-relaxed">{listingPhrase}</p>
        <button
          onClick={handleCopyPhrase}
          className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
        >
          {copiedPhrase ? 'Copied!' : 'Copy listing text'}
        </button>
      </div>
    </div>
  )
}
