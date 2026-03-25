'use client'

import { useState, useEffect } from 'react'
import type { OnboardingData } from './OnboardingWizard'

interface Props {
  userId: string
  data: Partial<OnboardingData>
  onNext: (data: Partial<OnboardingData>) => void
  billingDone?: boolean
}

export default function StepBilling({ userId, data, onNext, billingDone = false }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Billing already completed (e.g. returning from Stripe) — auto-advance
  useEffect(() => {
    if (billingDone) {
      onNext({})
    }
  }, [billingDone, onNext])

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
      window.location.href = json.url
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Start your free trial</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Enter your card to start a 1-month free trial. You won&apos;t be charged until your trial ends.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant">Plan</span>
          <span className="font-semibold text-slate-900">BZARP — $10 / month</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant">Trial period</span>
          <span className="font-semibold text-emerald-600">30 days free</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant">Includes</span>
          <span className="font-semibold text-slate-900 text-right">1 number · 10 listings · unlimited messages</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button onClick={startCheckout} disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 transition-colors active:scale-95 duration-150">
        {loading ? 'Redirecting…' : 'Add payment method →'}
      </button>
    </div>
  )
}
