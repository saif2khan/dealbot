'use client'

import { useState, useEffect } from 'react'
import type { OnboardingData } from './OnboardingWizard'

const SUPPORTED_COUNTRIES = [
  { code: 'US', label: 'United States (+1)' },
  { code: 'CA', label: 'Canada (+1)' },
  { code: 'GB', label: 'United Kingdom (+44)' },
  { code: 'AU', label: 'Australia (+61)' },
]

interface PoolNumber {
  phone_number: string
  id: string
}

interface Props {
  userId: string
  onNext: (data: Partial<OnboardingData>) => void
}

export default function StepCountry({ userId, onNext }: Props) {
  const [poolNumbers, setPoolNumbers] = useState<PoolNumber[]>([])
  const [poolLoading, setPoolLoading] = useState(true)
  const [showBuyFlow, setShowBuyFlow] = useState(false)

  // Pool selection state
  const [selectedPool, setSelectedPool] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)

  // Buy flow state
  const [country, setCountry] = useState('CA')
  const [searchResults, setSearchResults] = useState<PoolNumber[]>([])
  const [selectedBuy, setSelectedBuy] = useState('')
  const [searching, setSearching] = useState(false)
  const [buyLoading, setBuyLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  // On mount, check pool
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
        <h2 className="text-xl font-bold">Get your DealBot number</h2>
        <p className="text-gray-500 text-sm animate-pulse">Checking available numbers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Get your DealBot number</h2>
        <p className="text-gray-500 text-sm mt-1">
          Buyers will text this number. Post it in your marketplace listings.
        </p>
      </div>

      {/* Pool numbers available */}
      {!showBuyFlow && poolNumbers.length > 0 && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
            Select a number below to get started instantly.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available numbers</label>
            <div className="space-y-2">
              {poolNumbers.map(n => (
                <label key={n.phone_number} className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="poolNumber"
                    value={n.phone_number}
                    checked={selectedPool === n.phone_number}
                    onChange={() => setSelectedPool(n.phone_number)}
                  />
                  <span className="font-medium text-gray-900">{n.phone_number}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleClaim}
            disabled={claimLoading || !selectedPool}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {claimLoading ? 'Setting up...' : `Use ${selectedPool}`}
          </button>

        </>
      )}

      {/* Buy flow — only shown when pool is empty */}
      {showBuyFlow && (
        <>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select
              value={country}
              onChange={e => { setCountry(e.target.value); setSearchResults([]) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {SUPPORTED_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={searchNumbers}
            disabled={searching}
            className="w-full border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {searching ? 'Searching...' : 'Search available numbers'}
          </button>

          {searchResults.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select a number</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map(n => (
                  <label key={n.phone_number} className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="buyNumber"
                      value={n.phone_number}
                      checked={selectedBuy === n.phone_number}
                      onChange={() => setSelectedBuy(n.phone_number)}
                    />
                    <span className="font-medium text-gray-900">{n.phone_number}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {searchResults.length > 0 && (
            <button
              onClick={handlePurchase}
              disabled={buyLoading || !selectedBuy}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {buyLoading ? 'Provisioning...' : `Claim ${selectedBuy}`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
