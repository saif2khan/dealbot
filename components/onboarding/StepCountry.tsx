'use client'

import { useState, useEffect } from 'react'
import type { OnboardingData } from './OnboardingWizard'

const SUPPORTED_COUNTRIES = [
  { code: 'US', label: 'United States (+1)' },
  { code: 'CA', label: 'Canada (+1)' },
  { code: 'GB', label: 'United Kingdom (+44)' },
  { code: 'AU', label: 'Australia (+61)' },
]

const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none text-sm appearance-none cursor-pointer"

interface PoolNumber { phone_number: string; id: string }
interface Props { userId: string; onNext: (data: Partial<OnboardingData>) => void }

export default function StepCountry({ userId, onNext }: Props) {
  const [poolNumbers, setPoolNumbers] = useState<PoolNumber[]>([])
  const [poolLoading, setPoolLoading] = useState(true)
  const [showBuyFlow, setShowBuyFlow] = useState(false)
  const [selectedPool, setSelectedPool] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [country, setCountry] = useState('CA')
  const [searchResults, setSearchResults] = useState<PoolNumber[]>([])
  const [selectedBuy, setSelectedBuy] = useState('')
  const [searching, setSearching] = useState(false)
  const [buyLoading, setBuyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          setShowBuyFlow(true)
        }
      } catch {
        setShowBuyFlow(true)
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

  async function searchNumbers() {
    setSearching(true)
    setError(null)
    const res = await fetch(`/api/telnyx/numbers?country=${country}`)
    const json = await res.json()
    setSearching(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to search numbers')
    } else {
      const nums: PoolNumber[] = json.numbers ?? []
      setSearchResults(nums)
      if (nums.length > 0) setSelectedBuy(nums[0].phone_number)
    }
  }

  async function handlePurchase() {
    setBuyLoading(true)
    setError(null)
    const res = await fetch('/api/telnyx/numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: selectedBuy, userId }),
    })
    const json = await res.json()
    setBuyLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to provision number')
    } else {
      onNext({ telnyxNumber: json.phoneNumber, telnyxNumberId: json.numberId })
    }
  }

  if (poolLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Get your BZARP number</h2>
        <p className="text-on-surface-variant text-sm animate-pulse">Checking available numbers…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Get your BZARP number</h2>
        <p className="text-on-surface-variant text-sm mt-1">Buyers will text this number. Post it in your marketplace listings.</p>
      </div>

      {!showBuyFlow && poolNumbers.length > 0 && (
        <>
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
        </>
      )}

      {showBuyFlow && (
        <>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-on-surface">Country</label>
            <div className="relative">
              <select value={country} onChange={e => { setCountry(e.target.value); setSearchResults([]) }} className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer">
                {SUPPORTED_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">expand_more</span>
            </div>
          </div>

          <button onClick={searchNumbers} disabled={searching}
            className="w-full border border-slate-300 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {searching ? 'Searching…' : 'Search available numbers'}
          </button>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.map(n => (
                <label key={n.phone_number}
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                    selectedBuy === n.phone_number
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                  <input type="radio" name="buyNumber" value={n.phone_number}
                    checked={selectedBuy === n.phone_number}
                    onChange={() => setSelectedBuy(n.phone_number)}
                    className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="font-semibold text-slate-900 text-sm">{n.phone_number}</span>
                </label>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <button onClick={handlePurchase} disabled={buyLoading || !selectedBuy}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 transition-colors active:scale-95 duration-150">
              {buyLoading ? 'Provisioning…' : `Claim ${selectedBuy}`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
