'use client'

import { useState } from 'react'
import type { OnboardingData } from './OnboardingWizard'

const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none text-sm"

interface Props {
  userId: string
  onNext: (data: Partial<OnboardingData>) => void
}

export default function StepProfile({ userId, onNext }: Props) {
  const [address, setAddress] = useState('')
  const [addressArea, setAddressArea] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, addressArea, phone }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to save profile')
    } else {
      onNext({ address, addressArea, phone })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Your profile</h2>
        <p className="text-on-surface-variant text-sm mt-1">Used for meetup logistics and seller notifications.</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-on-surface">Full address</label>
        <input type="text" value={address} onChange={e => setAddress(e.target.value)}
          className={inputClass} placeholder="123 Main St, Vancouver, BC" />
        <p className="text-xs text-slate-400">Stored encrypted. Only shared after deal confirmation.</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-on-surface">General area</label>
        <input type="text" value={addressArea} onChange={e => setAddressArea(e.target.value)}
          className={inputClass} placeholder="Coquitlam area" />
        <p className="text-xs text-slate-400">Shared with buyers before deal is confirmed (city/neighbourhood).</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-on-surface">Your mobile number</label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          className={inputClass} placeholder="+1 604 555 0100" />
        <p className="text-xs text-slate-400">You&apos;ll receive deal confirmations and escalations here.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={() => onNext({})}
          className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Skip for now
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 transition-colors active:scale-95 duration-150">
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </form>
  )
}
