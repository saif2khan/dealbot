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
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-400 text-sm animate-pulse">Loading item...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit item</h1>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item name <span className="text-red-500">*</span></label>
          <input type="text" required value={form.name} onChange={e => update('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
          <textarea rows={4} required value={form.description} onChange={e => update('description', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition <span className="text-red-500">*</span></label>
            <select value={form.condition} onChange={e => update('condition', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={e => update('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select...</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asking price ($) <span className="text-red-500">*</span></label>
            <input type="number" required min="0" step="0.01" value={form.asking_price} onChange={e => update('asking_price', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max discount ($)</label>
            <input type="number" min="0" step="0.01" disabled={form.firm_price} value={form.max_discount} onChange={e => update('max_discount', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.firm_price} onChange={e => update('firm_price', e.target.checked)} />
          <span className="text-sm text-gray-700">Firm price — agent will not negotiate</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred pickup times <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={form.preferred_times} onChange={e => update('preferred_times', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder='e.g. "This weekend only"' />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status} onChange={e => update('status', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-red-100 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Delete item</p>
          <p className="text-xs text-gray-400 mt-0.5">Permanently removes this listing.</p>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition">
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
