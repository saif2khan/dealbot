'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for_parts', label: 'For Parts' },
]

const CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'other', label: 'Other' },
]

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
  { value: 'archived', label: 'Archived' },
]

const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none text-sm"
const selectClass = "w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"

export default function EditItemPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [form, setForm] = useState({
    name: '',
    description: '',
    condition: 'good',
    category: '',
    asking_price: '',
    max_discount: '',
    firm_price: false,
    preferred_times: '',
    status: 'active',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/items/${id}`)
      if (!res.ok) { router.push('/items'); return }
      const json = await res.json()
      const item = json.item
      setForm({
        name: item.name ?? '',
        description: item.description ?? '',
        condition: item.condition ?? 'good',
        category: item.category ?? '',
        asking_price: item.asking_price?.toString() ?? '',
        max_discount: item.max_discount?.toString() ?? '',
        firm_price: item.firm_price ?? false,
        preferred_times: item.preferred_times ?? '',
        status: item.status ?? 'active',
      })
      setLoading(false)
    }
    load()
  }, [id, router])

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        condition: form.condition,
        category: form.category || null,
        asking_price: parseFloat(form.asking_price),
        max_discount: parseFloat(form.max_discount || '0'),
        firm_price: form.firm_price,
        preferred_times: form.preferred_times || null,
        status: form.status,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
    } else {
      router.push('/items')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this item? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    router.push('/items')
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <div>
        <h1 className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900 mb-1">Edit item</h1>
        <p className="text-on-surface-variant text-sm">Update listing details. Changes apply immediately.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-12">
        {/* Identity & Context */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4">
            <h4 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-indigo-600">Identity & Context</h4>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">The name and category define how BZARP answers buyer questions.</p>
          </div>
          <div className="md:col-span-8 bg-white border border-slate-200 p-8 rounded-xl shadow-sm space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface">Item name <span className="text-red-500">*</span></label>
              <input type="text" required value={form.name} onChange={e => update('name', e.target.value)} className={inputClass} placeholder="e.g. IKEA KALLAX shelf" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Condition <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={form.condition} onChange={e => update('condition', e.target.value)} className={selectClass}>
                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">expand_more</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Category</label>
                <div className="relative">
                  <select value={form.category} onChange={e => update('category', e.target.value)} className={selectClass}>
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">expand_more</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface">Description <span className="text-red-500">*</span></label>
              <textarea rows={4} required value={form.description} onChange={e => update('description', e.target.value)}
                className={inputClass + ' resize-none'} placeholder="Describe condition, history, and any wear…" />
            </div>
          </div>
        </div>

        {/* Pricing Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4">
            <h4 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-indigo-600">Pricing Strategy</h4>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">Set your limits. BZARP will close deals within your range.</p>
          </div>
          <div className="md:col-span-8 bg-white border border-slate-200 p-8 rounded-xl shadow-sm space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Asking price ($) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input type="number" required min="0" step="0.01" value={form.asking_price} onChange={e => update('asking_price', e.target.value)}
                    className={inputClass + ' pl-8'} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Max discount ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input type="number" min="0" step="0.01" disabled={form.firm_price} value={form.max_discount} onChange={e => update('max_discount', e.target.value)}
                    className={inputClass + ' pl-8 disabled:opacity-40'} placeholder="0.00" />
                </div>
              </div>
            </div>
            <label className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors">
              <input type="checkbox" checked={form.firm_price} onChange={e => update('firm_price', e.target.checked)}
                className="h-5 w-5 rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500" />
              <div>
                <span className="text-sm font-bold text-indigo-700 block">Firm price — agent will not negotiate</span>
                <span className="text-xs text-indigo-500">BZARP will reject all offers below the asking price.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Fulfillment & Status */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4">
            <h4 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-indigo-600">Fulfillment</h4>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">Pickup logistics and current listing status.</p>
          </div>
          <div className="md:col-span-8 bg-white border border-slate-200 p-8 rounded-xl shadow-sm space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface">Preferred pickup times <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="text" value={form.preferred_times} onChange={e => update('preferred_times', e.target.value)}
                className={inputClass} placeholder='e.g. "Weekends after 2pm, Tuesdays 5–7pm"' />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface">Status</label>
              <div className="relative">
                <select value={form.status} onChange={e => update('status', e.target.value)} className={selectClass}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
          <button type="button" onClick={() => router.back()}
            className="px-8 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 px-10 py-2.5 rounded-lg text-white font-bold shadow-md disabled:opacity-50 active:scale-95 transition-all duration-150">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Delete item</p>
          <p className="text-xs text-slate-400 mt-0.5">Permanently removes this listing and all associated data.</p>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
