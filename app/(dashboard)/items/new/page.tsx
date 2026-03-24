'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

type Tab = 'manual' | 'import'

export default function NewItemPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('manual')

  // Import state
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    condition: 'good',
    category: '',
    askingPrice: '',
    maxDiscount: '',
    firmPrice: false,
    preferredTimes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleImport() {
    if (!importUrl.trim()) return
    setImporting(true)
    setImportError(null)

    const res = await fetch('/api/items/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: importUrl.trim() }),
    })
    const json = await res.json()
    setImporting(false)

    if (!res.ok) {
      setImportError(json.error ?? 'Failed to import listing')
      return
    }

    // Populate form with scraped data
    setForm(prev => ({
      ...prev,
      name: json.name || prev.name,
      description: json.description || prev.description,
      condition: json.condition || prev.condition,
      category: json.category || prev.category,
      askingPrice: json.askingPrice ? String(json.askingPrice) : prev.askingPrice,
    }))

    // Switch to manual tab to let user review and adjust
    setTab('manual')
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
        category: form.category || null,
        askingPrice: parseFloat(form.askingPrice),
        maxDiscount: parseFloat(form.maxDiscount || '0'),
        firmPrice: form.firmPrice,
        preferredTimes: form.preferredTimes || null,
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Failed to create item')
    } else {
      router.push('/items')
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add item</h1>
        <p className="text-gray-500 text-sm mt-1">The agent uses this info to answer buyer questions.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
            tab === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Manual entry
        </button>
        <button
          type="button"
          onClick={() => setTab('import')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
            tab === 'import' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Import from FB Marketplace
        </button>
      </div>

      {/* Import tab */}
      {tab === 'import' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Paste your Facebook Marketplace listing URL or share link below. We&apos;ll auto-fill the details for you to review.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing URL</label>
            <input
              type="url"
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://www.facebook.com/share/marketplace/..."
            />
            <p className="text-xs text-gray-400 mt-1">Works with share links and direct marketplace URLs.</p>
          </div>

          {importError && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="text-sm text-red-600">{importError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !importUrl.trim()}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Importing listing…
              </>
            ) : 'Import listing'}
          </button>

          {importing && (
            <p className="text-xs text-gray-400 text-center">This can take up to 30 seconds…</p>
          )}
        </div>
      )}

      {/* Manual form (shown on manual tab, or after import populates it) */}
      {tab === 'manual' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item name <span className="text-red-500">*</span></label>
            <input type="text" required value={form.name} onChange={e => update('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="IKEA KALLAX shelf" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea rows={4} required value={form.description} onChange={e => update('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Detailed description for the agent to answer buyer questions..." />
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
              <input type="number" required min="0" step="0.01" value={form.askingPrice} onChange={e => update('askingPrice', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="150" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max discount ($)</label>
              <input type="number" min="0" step="0.01" disabled={form.firmPrice} value={form.maxDiscount} onChange={e => update('maxDiscount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" placeholder="20" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.firmPrice} onChange={e => update('firmPrice', e.target.checked)} />
            <span className="text-sm text-gray-700">Firm price — agent will not negotiate</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred pickup times <span className="text-gray-400 font-normal">(optional override)</span></label>
            <input type="text" value={form.preferredTimes} onChange={e => update('preferredTimes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder='e.g. "This weekend only"' />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? 'Adding...' : 'Add item'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
