'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  name: string | null
  address: string | null
  address_area: string | null
  phone: string | null
  global_instructions: string | null
  availability_text: string | null
  agent_tone: string | null
  custom_tone_instructions: string | null
  agent_name: string | null
  agent_gender: string | null
  telnyx_number: string | null
  subscription_status: string | null
}

const TONES = [
  { value: 'professional', label: 'Authoritative', icon: 'gavel', desc: 'Polite, concise, no emoji' },
  { value: 'friendly', label: 'Friendly', icon: 'sentiment_satisfied', desc: 'Warm, casual, emoji ok' },
  { value: 'firm', label: 'Direct', icon: 'speed', desc: 'Minimal small talk' },
  { value: 'custom', label: 'Meticulous', icon: 'verified', desc: 'Define your own style' },
]

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({
    name: '',
    address: '',
    address_area: '',
    phone: '',
    global_instructions: '',
    availability_text: '',
    agent_tone: 'professional',
    custom_tone_instructions: '',
    agent_name: 'Zuck',
    agent_gender: 'male',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setForm({
          name: data.name ?? '',
          address: data.address ?? '',
          address_area: data.address_area ?? '',
          phone: data.phone ?? '',
          global_instructions: data.global_instructions ?? '',
          availability_text: data.availability_text ?? '',
          agent_tone: data.agent_tone ?? 'professional',
          custom_tone_instructions: data.custom_tone_instructions ?? '',
          agent_name: data.agent_name ?? 'Zuck',
          agent_gender: data.agent_gender ?? 'male',
        })
      }
    }
    load()
  }, [])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        address: form.address,
        addressArea: form.address_area,
        phone: form.phone,
        globalInstructions: form.global_instructions,
        availabilityText: form.availability_text,
        agentTone: form.agent_tone,
        customToneInstructions: form.custom_tone_instructions,
        agentName: form.agent_name,
        agentGender: form.agent_gender,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handleBillingPortal() {
    setPortalLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const json = await res.json()
    setPortalLoading(false)
    if (json.url) window.location.href = json.url
  }

  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none text-sm"

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900">Settings</h1>
        <p className="text-on-surface-variant text-sm mt-1">Manage your profile, agent instructions, and billing.</p>
      </div>

      {/* BZARP number card */}
      {profile?.telnyx_number && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Your BZARP Number</p>
          <p className="text-2xl font-[family-name:var(--font-manrope)] font-bold text-indigo-900 tracking-tight">{profile.telnyx_number}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Profile section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-10">
          <section className="space-y-5">
            <h3 className="text-lg font-[family-name:var(--font-manrope)] font-bold text-on-surface">Profile</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Name</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className={inputClass} placeholder="Your name" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Full address</label>
                <input type="text" value={form.address} onChange={e => update('address', e.target.value)} className={inputClass} placeholder="123 Main St, Vancouver, BC" />
                <p className="text-xs text-slate-400">Shared with buyers only after deal is confirmed.</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">General area</label>
                <input type="text" value={form.address_area} onChange={e => update('address_area', e.target.value)} className={inputClass} placeholder="Coquitlam area" />
                <p className="text-xs text-slate-400">Shared before deal confirmation (city/neighbourhood only).</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Your mobile number</label>
                <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className={inputClass} placeholder="+1 604 555 0100" />
                <p className="text-xs text-slate-400">Receives deal confirmations and escalations.</p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Agent settings */}
          <section className="space-y-6">
            <h3 className="text-lg font-[family-name:var(--font-manrope)] font-bold text-on-surface">Agent settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Agent name</label>
                <input type="text" value={form.agent_name} onChange={e => update('agent_name', e.target.value)} className={inputClass} placeholder="Zuck" />
                <p className="text-xs text-slate-400">Buyers will see this name in your listing.</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-on-surface">Agent gender</label>
                <div className="relative">
                  <select value={form.agent_gender} onChange={e => update('agent_gender', e.target.value)} className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer">
                    <option value="male">Male (he/him)</option>
                    <option value="female">Female (she/her)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[18px]">expand_more</span>
                </div>
              </div>
            </div>

            {/* Tone picker */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-on-surface">Agent tone</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update('agent_tone', t.value)}
                    className={`p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${
                      form.agent_tone === t.value
                        ? 'border-2 border-indigo-600 bg-indigo-50'
                        : 'border border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${form.agent_tone === t.value ? 'text-indigo-600' : 'text-slate-400'}`}
                      style={form.agent_tone === t.value ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {t.icon}
                    </span>
                    <span className={`text-xs font-bold ${form.agent_tone === t.value ? 'text-indigo-700' : 'text-slate-500'}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface">Agent instructions</label>
              <textarea rows={3} value={form.global_instructions} onChange={e => update('global_instructions', e.target.value)}
                className={inputClass + ' resize-none'}
                placeholder='e.g. "Always ask if buyer can pick up today. No trades."' />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-on-surface">Availability</label>
              <textarea rows={3} value={form.availability_text} onChange={e => update('availability_text', e.target.value)}
                className={inputClass + ' resize-none'}
                placeholder='e.g. "Weekdays after 5pm, weekends 10am–4pm"' />
            </div>
          </section>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        {/* Form actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-8 py-2.5 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 transition-colors active:scale-95 duration-150"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Billing */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-4">
        <h3 className="text-lg font-[family-name:var(--font-manrope)] font-bold text-on-surface">Billing</h3>
        <div className="flex items-center justify-between text-sm py-2 border-b border-slate-100">
          <span className="text-on-surface-variant">Plan</span>
          <span className="font-semibold">BZARP — $10/month</span>
        </div>
        <div className="flex items-center justify-between text-sm py-2">
          <span className="text-on-surface-variant">Status</span>
          <span className={`font-semibold capitalize ${
            profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
              ? 'text-emerald-600' : 'text-error'
          }`}>
            {profile?.subscription_status ?? 'inactive'}
          </span>
        </div>
        <button
          onClick={handleBillingPortal}
          disabled={portalLoading}
          className="w-full border border-slate-200 py-2.5 rounded-xl text-sm font-medium hover:bg-surface-container-low disabled:opacity-50 transition"
        >
          {portalLoading ? 'Loading...' : 'Manage billing →'}
        </button>
      </div>
    </div>
  )
}
