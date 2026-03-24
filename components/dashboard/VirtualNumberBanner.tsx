'use client'

import { useState } from 'react'

export default function VirtualNumberBanner({ number }: { number: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(number)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Your DealBot Number</p>
        <p className="text-xl font-bold text-blue-900 mt-0.5">{number}</p>
        <p className="text-xs text-blue-500 mt-1">Post this number in your marketplace listings</p>
      </div>
      <button
        onClick={handleCopy}
        className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}
