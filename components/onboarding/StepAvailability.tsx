'use client'

import { useState } from 'react'
import type { OnboardingData } from './OnboardingWizard'

interface Props {
  userId: string
  onNext: (data: Partial<OnboardingData>) => void
}

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Polite, concise, no emoji' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm, casual, light emoji ok' },
  { value: 'firm', label: 'Firm', desc: 'Direct, minimal small talk' },
  { value: 'custom', label: 'Custom', desc: 'Define your own style' },
]

export default function StepAvailability({ userId, onNext }: Props) {
  const [instructions, setInstructions] = useState('')
  const [availability, setAvailability] = useState('')
  const [tone, setTone] = useState('professional')
  const [customTone, setCustomTone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        globalInstructions: instructions,
        availabilityText: availability,
        agentTone: tone,
        customToneInstructions: customTone,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
    } else {
      onNext({ globalInstructions: instructions, availabilityText: availability })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Agent settings</h2>
        <p className="text-gray-500 text-sm mt-1">
          Tell the agent how to behave and when you&apos;re available for meetups.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Agent tone</label>
        <div className="grid grid-cols-2 gap-2">
          {TONES.map(t => (
            <label key={t.value} className={`flex flex-col gap-0.5 p-3 rounded-lg border cursor-pointer transition ${
              tone === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input type="radio" name="agent_tone" value={t.value} checked={tone === t.value}
                onChange={e => setTone(e.target.value)} className="sr-only" />
              <span className="text-sm font-medium text-gray-900">{t.label}</span>
              <span className="text-xs text-gray-400">{t.desc}</span>
            </label>
          ))}
        </div>
        {tone === 'custom' && (
          <textarea rows={2} value={customTone} onChange={e => setCustomTone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mt-2"
            placeholder='e.g. "Friendly but professional. Always use the buyer&apos;s first name."' />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Agent instructions <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          placeholder='e.g. "Always ask buyers if they can pick up today. Do not accept trades."'
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your availability <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          required
          value={availability}
          onChange={e => setAvailability(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          placeholder='e.g. "Weekdays after 5pm, weekends 10am–4pm. Not available Dec 25."'
        />
        <p className="text-xs text-gray-400 mt-1">The agent uses this to propose meetup times to buyers.</p>
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
