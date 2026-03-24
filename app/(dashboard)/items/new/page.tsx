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

const inputClass = "w-full bg-surface-container-low border-none rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline-variant text-sm outline-none"
const selectClass = "w-full bg-surface-container-low border-none rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary/20 appearance-none transition-all text-sm outline-none"
const urlInputClass = "w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-on-surface focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-sm outline-none"

export default function NewItemPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('import')

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

    setForm(prev => ({
      ...prev,
      name: json.name || prev.name,
      description: json.description || prev.description,
      condition: json.condition || prev.condition,
      category: json.category || prev.category,
      askingPrice: json.askingPrice ? String(json.askingPrice) : prev.askingPrice,
    }))

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
    <div className="max-w-4xl pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900 mb-1">Add item</h1>
        <p className="text-on-surface-variant text-sm">The agent uses this info to answer buyer questions.</p>
      </div>

      {/* Tab switcher */}
      <div className="bg-slate-100 p-1 rounded-xl flex mb-8 w-fit gap-1">
        <button
          type="button"
          onClick={() => setTab('import')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'import'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Import from FB Marketplace
        </button>
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'manual'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Manual entry
        </button>
      </div>

      {/* Import tab */}
      {tab === 'import' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm max-w-2xl">
          <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
            Paste your Facebook Marketplace listing URL or share link below. We&apos;ll auto-fill the details for you to review.
          </p>
          <div className="space-y-2 mb-8">
            <label className="block text-sm font-semibold text-slate-900" htmlFor="listing_url">Listing URL</label>
            <input
              id="listing_url"
              type="url"
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              className={urlInputClass}
              placeholder="https://www.facebook.com/share/marketplace/..."
            />
            <p className="text-[11px] text-slate-400">Works with share links and direct marketplace URLs.</p>
          </div>

          {importError && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
              <p className="text-sm text-error">{importError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !importUrl.trim()}
            className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              importing || !importUrl.trim()
                ? 'bg-indigo-400/60 text-white cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
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
          {importing && <p className="text-xs text-on-surface-variant text-center mt-3">This can take up to 30 seconds…</p>}
        </div>
      )}

      {/* Manual form */}
      {tab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Identity & Context */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <h4 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-primary">Identity & Context</h4>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">The name and category define how DealBot answers buyer questions.</p>
            </div>
            <div className="md:col-span-8 bg-white border border-slate-200 p-8 rounded-xl shadow-sm space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Item name <span className="text-error">*</span></label>
                <input type="text" required value={form.name} onChange={e => update('name', e.target.value)} className={inputClass} placeholder="e.g. IKEA KALLAX shelf" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Condition <span className="text-error">*</span></label>
                  <select value={form.condition} onChange={e => update('condition', e.target.value)} className={selectClass}>
                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</label>
                  <select value={form.category} onChange={e => update('category', e.target.value)} className={selectClass}>
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Description <span className="text-error">*</span></label>
                <textarea rows={4} required value={form.description} onChange={e => update('description', e.target.value)}
                  className={inputClass + ' resize-none'}
                  placeholder="Describe condition, history, and any wear…" />
              </div>
            </div>
          </div>

          {/* Pricing Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <h4 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-primary">Pricing Strategy</h4>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">Set your limits. DealBot will close deals within your range.</p>
            </div>
            <div className="md:col-span-8 bg-white border border-slate-200 p-8 rounded-xl shadow-sm space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Asking price ($) <span className="text-error">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                    <input type="number" required min="0" step="0.01" value={form.askingPrice} onChange={e => update('askingPrice', e.target.value)}
                      className={inputClass + ' pl-8'} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Max discount ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                    <input type="number" min="0" step="0.01" disabled={form.firmPrice} value={form.maxDiscount} onChange={e => update('maxDiscount', e.target.value)}
                      className={inputClass + ' pl-8 disabled:opacity-40'} placeholder="0.00" />
                  </div>
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
            </div>
          </div>

          {/* Fulfillment */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <h4 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-primary">Fulfillment</h4>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">Streamline the hand-off with clear availability.</p>
            </div>
            <div className="md:col-span-8 bg-white border border-slate-200 p-8 rounded-xl shadow-sm space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Preferred pickup times <span className="text-outline-variant font-normal normal-case">(optional)</span>
                </label>
                <input type="text" value={form.preferredTimes} onChange={e => update('preferredTimes', e.target.value)}
                  className={inputClass} placeholder='e.g. "Weekends after 2pm, Tuesdays 5–7pm"' />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-outline-variant/20">
            <button type="button" onClick={() => router.back()}
              className="px-8 py-3 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 px-12 py-3 rounded-xl text-white font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-all duration-150">
              {loading ? 'Adding...' : 'Add item'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
