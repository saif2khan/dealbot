'use client'

import { useState } from 'react'
import type { OnboardingData } from './OnboardingWizard'

const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none text-sm"

const TONES = [
  { value: 'professional', label: 'Authoritative', icon: 'gavel', desc: 'Polite, concise, no emoji' },
  { value: 'friendly', label: 'Friendly', icon: 'sentiment_satisfied', desc: 'Warm, casual, emoji ok' },
  { value: 'firm', label: 'Direct', icon: 'speed', desc: 'Minimal small talk' },
  { value: 'custom', label: 'Meticulous', icon: 'verified', desc: 'Define your own style' },
]

interface Props {
  userId: string
  onNext: (data: Partial<OnboardingData>) => void
}

export default function StepAvailability({ userId, onNext }: Props) {
  const [instructions, setInstructions] = useState('')
  const [availability, setAvailability] = useState('')
  const [tone, setTone] = useState('professional')
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Agent settings</h2>
        <p className="text-on-surface-variant text-sm mt-1">Tell the agent how to behave and when you&apos;re available.</p>
      </div>

      {/* Tone picker */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-on-surface">Agent tone</label>
        <div className="grid grid-cols-2 gap-3">
          {TONES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTone(t.value)}
              className={`p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all text-left ${
                tone === t.value
                  ? 'border-2 border-indigo-600 bg-indigo-50'
                  : 'border border-slate-200 hover:border-indigo-300'
              }`}
            >
              <span
                className={`material-symbols-outlined ${tone === t.value ? 'text-indigo-600' : 'text-slate-400'}`}
                style={tone === t.value ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {t.icon}
              </span>
              <div className="text-center">
                <span className={`text-xs font-bold block ${tone === t.value ? 'text-indigo-700' : 'text-slate-600'}`}>{t.label}</span>
                <span className="text-[10px] text-slate-400">{t.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-on-surface">
          Agent instructions <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea rows={3} value={instructions} onChange={e => setInstructions(e.target.value)}
          className={inputClass + ' resize-none'}
          placeholder='e.g. "Always ask buyers if they can pick up today. Do not accept trades."' />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-on-surface">
          Your availability <span className="text-red-500">*</span>
        </label>
        <textarea rows={3} required value={availability} onChange={e => setAvailability(e.target.value)}
          className={inputClass + ' resize-none'}
          placeholder='e.g. "Weekdays after 5pm, weekends 10am–4pm. Not available Dec 25."' />
        <p className="text-xs text-slate-400">The agent uses this to propose meetup times to buyers.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 transition-colors active:scale-95 duration-150">
        {loading ? 'Saving…' : 'Continue'}
      </button>
    </form>
  )
}
