'use client'

import { useState } from 'react'
import type { OnboardingData } from './OnboardingWizard'

interface Props {
  userId: string
  data: Partial<OnboardingData>
  onNext: (data: Partial<OnboardingData>) => void
}

export default function StepBilling({ userId, data, onNext }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to start checkout')
    } else {
      // Redirect to Stripe Checkout
      window.location.href = json.url
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Start your free trial</h2>
        <p className="text-gray-500 text-sm mt-1">
          Enter your card to start a 1-month free trial. You won&apos;t be charged until your trial ends.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Plan</span>
          <span className="font-medium">DealBot — $10 / month</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Trial period</span>
          <span className="font-medium text-green-600">30 days free</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Includes</span>
          <span className="font-medium">1 number + 10 listings + unlimited messages</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={startCheckout}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? 'Redirecting...' : 'Add payment method'}
      </button>
    </div>
  )
}
