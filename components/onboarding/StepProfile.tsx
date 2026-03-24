'use client'

import { useState } from 'react'
import type { OnboardingData } from './OnboardingWizard'

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
        <h2 className="text-xl font-bold">Your profile</h2>
        <p className="text-gray-500 text-sm mt-1">
          Used for meetup logistics and seller notifications.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="123 Main St, Vancouver, BC"
        />
        <p className="text-xs text-gray-400 mt-1">Stored encrypted. Only shared after deal confirmation.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          General area <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={addressArea}
          onChange={e => setAddressArea(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Coquitlam area"
        />
        <p className="text-xs text-gray-400 mt-1">Shared with buyers before deal is confirmed (city/neighbourhood).</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your mobile number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="+1 604 555 0100"
        />
        <p className="text-xs text-gray-400 mt-1">You&apos;ll receive deal confirmations and escalations here.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? 'Saving...' : 'Continue'}
      </button>
    </form>
  )
}
