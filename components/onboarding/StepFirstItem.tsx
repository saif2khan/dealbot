'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OnboardingData } from './OnboardingWizard'

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for_parts', label: 'For Parts' },
]

const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none text-sm"
const selectClass = inputClass + ' appearance-none cursor-pointer'

interface Props { userId: string; data: Partial<OnboardingData> }

export default function StepFirstItem({ userId, data }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    description: '',
    condition: 'good',
    askingPrice: '',
    maxDiscount: '',
    firmPrice: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        condition: form.condition,
        askingPrice: parseFloat(form.askingPrice),
        maxDiscount: parseFloat(form.maxDiscount || '0'),
        firmPrice: form.firmPrice,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to create item')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-[family-name:var(--font-manrope)] font-extrabold text-slate-900">Add your first listing</h2>
        <p className="text-on-surface-variant text-sm mt-1">The agent uses this info to answer buyer questions.</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-on-surface">Item name <span className="text-red-500">*</span></label>
        <input type="text" required value={form.name} onChange={e => update('name', e.target.value)}
          className={inputClass} placeholder="IKEA KALLAX shelf unit" />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-on-surface">Description <span className="text-red-500">*</span></label>
        <textarea rows={3} required value={form.description} onChange={e => update('description', e.target.value)}
          className={inputClass + ' resize-none'}
          placeholder="White, 4x4 squares. No scratches. Purchased 2022. Includes hardware." />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-on-surface">Condition <span className="text-red-500">*</span></label>
        <select value={form.condition} onChange={e => update('condition', e.target.value)} className={selectClass}>
          {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-on-surface">Asking price ($) <span className="text-red-500">*</span></label>
          <input type="number" required min="0" step="0.01" value={form.askingPrice} onChange={e => update('askingPrice', e.target.value)}
            className={inputClass} placeholder="150" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-on-surface">Max discount ($)</label>
          <input type="number" min="0" step="0.01" disabled={form.firmPrice} value={form.maxDiscount} onChange={e => update('maxDiscount', e.target.value)}
            className={inputClass + ' disabled:opacity-40'} placeholder="20" />
        </div>
      </div>

      <label className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors">
        <input type="checkbox" checked={form.firmPrice} onChange={e => update('firmPrice', e.target.checked)}
          className="h-5 w-5 rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500" />
        <div>
          <span className="text-sm font-bold text-indigo-700 block">Firm price — agent will not negotiate</span>
          <span className="text-xs text-indigo-500">DealBot will reject all offers below the asking price.</span>
        </div>
      </label>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={() => router.push('/dashboard')}
          className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Skip for now
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 transition-colors active:scale-95 duration-150">
          {loading ? 'Adding…' : 'Add item & go to dashboard'}
        </button>
      </div>
    </form>
  )
}
