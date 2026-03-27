'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OnboardingData } from './OnboardingWizard'

interface PoolNumber { phone_number: string; id: string }
interface Props { userId: string; onNext: (data: Partial<OnboardingData>) => void }

export default function StepCountry({ userId, onNext }: Props) {
  const [poolNumbers, setPoolNumbers] = useState<PoolNumber[]>([])
  const [poolLoading, setPoolLoading] = useState(true)
  const [selectedPool, setSelectedPool] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // "No numbers available" notify flow
  const [noNumbers, setNoNumbers] = useState(false)
  const [notifyState, setNotifyState] = useState<'idle' | 'loading' | 'done'>('idle')

  useEffect(() => {
    async function fetchPool() {
      try {
        const res = await fetch('/api/telnyx/pool')
        const json = await res.json()
        const numbers: PoolNumber[] = json.numbers ?? []
        setPoolNumbers(numbers)
        if (numbers.length > 0) {
          setSelectedPool(numbers[0].phone_number)
        } else {
          setNoNumbers(true)
        }
      } catch {
        setNoNumbers(true)
      } finally {
        setPoolLoading(false)
      }
    }
    fetchPool()
  }, [])

  async function handleClaim() {
    const num = poolNumbers.find(n => n.phone_number === selectedPool)
    if (!num) return
    setClaimLoading(true)
    setError(null)
    const res = await fetch('/api/telnyx/pool/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: num.phone_number, numberId: num.id }),
    })
    const json = await res.json()
    setClaimLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to claim number')
    } else {
      onNext({ telnyxNumber: json.phoneNumber, telnyxNumberId: json.numberId })
    }
  }

  async function handleNotify() {
    setNotifyState('loading')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email
    if (!email) {
      setNotifyState('idle')
      return
    }
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setNotifyState('done')
  }

  if (poolLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Get your BZARP number</h2>
        <p className="text-on-surface-variant text-sm animate-pulse">Checking available numbers…</p>
      </div>
    )
  }

  if (noNumbers) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Get your BZARP number</h2>
          <p className="text-on-surface-variant text-sm mt-1">Buyers will text this number. Post it in your marketplace listings.</p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-4 flex gap-3">
          <span className="material-symbols-outlined text-amber-500 text-[22px] shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">No numbers available right now</p>
            <p className="text-sm text-amber-700 mt-0.5">We&apos;re adding more numbers soon. Would you like us to notify you when one becomes available?</p>
          </div>
        </div>

        {notifyState === 'done' ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-4 flex gap-3 items-center">
            <span className="material-symbols-outlined text-emerald-500 text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <p className="text-sm text-emerald-700 font-medium">Got it! We&apos;ll email you as soon as a number is available.</p>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleNotify}
              disabled={notifyState === 'loading'}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 transition-colors active:scale-95 duration-150"
            >
              {notifyState === 'loading' ? 'Saving…' : 'Yes, notify me'}
            </button>
            <button
              onClick={() => setNoNumbers(false)}
              className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              No thanks
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Get your BZARP number</h2>
        <p className="text-on-surface-variant text-sm mt-1">Buyers will text this number. Post it in your marketplace listings.</p>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
        Select a number below to get started instantly.
      </div>

      <div className="space-y-2">
        {poolNumbers.map(n => (
          <label key={n.phone_number}
            className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
              selectedPool === n.phone_number
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}>
            <input type="radio" name="poolNumber" value={n.phone_number}
              checked={selectedPool === n.phone_number}
              onChange={() => setSelectedPool(n.phone_number)}
              className="text-indigo-600 focus:ring-indigo-500" />
            <span className="font-semibold text-slate-900 text-sm">{n.phone_number}</span>
          </label>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button onClick={handleClaim} disabled={claimLoading || !selectedPool}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 transition-colors active:scale-95 duration-150">
        {claimLoading ? 'Setting up…' : `Use ${selectedPool}`}
      </button>
    </div>
  )
}
