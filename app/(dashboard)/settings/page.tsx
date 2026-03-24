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

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your profile, agent instructions, and billing.</p>
      </div>

      {/* Virtual number */}
      {profile?.telnyx_number && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Your DealBot Number</p>
          <p className="text-xl font-bold text-blue-900 mt-0.5">{profile.telnyx_number}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Profile</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Your name" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full address</label>
          <input type="text" value={form.address} onChange={e => update('address', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="123 Main St, Vancouver, BC" />
          <p className="text-xs text-gray-400 mt-1">Shared with buyers only after deal is confirmed.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">General area</label>
          <input type="text" value={form.address_area} onChange={e => update('address_area', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Coquitlam area" />
          <p className="text-xs text-gray-400 mt-1">Shared before deal confirmation (city/neighbourhood only).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your mobile number</label>
          <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="+1 604 555 0100" />
          <p className="text-xs text-gray-400 mt-1">Receives deal confirmations and escalations.</p>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h2 className="font-semibold text-gray-900 mb-3">Agent settings</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent name</label>
                <input type="text" value={form.agent_name} onChange={e => update('agent_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Zuck" />
                <p className="text-xs text-gray-400 mt-1">Buyers will see this name in your listing.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent gender</label>
                <select value={form.agent_gender} onChange={e => update('agent_gender', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="male">Male (he/him)</option>
                  <option value="female">Female (she/her)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agent tone</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'professional', label: 'Professional', desc: 'Polite, concise, no emoji' },
                  { value: 'friendly', label: 'Friendly', desc: 'Warm, casual, light emoji ok' },
                  { value: 'firm', label: 'Firm', desc: 'Direct, minimal small talk' },
                  { value: 'custom', label: 'Custom', desc: 'Define your own style' },
                ].map(t => (
                  <label key={t.value} className={`flex flex-col gap-0.5 p-3 rounded-lg border cursor-pointer transition ${
                    form.agent_tone === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input type="radio" name="agent_tone" value={t.value} checked={form.agent_tone === t.value}
                      onChange={e => update('agent_tone', e.target.value)} className="sr-only" />
                    <span className="text-sm font-medium text-gray-900">{t.label}</span>
                    <span className="text-xs text-gray-400">{t.desc}</span>
                  </label>
                ))}
              </div>
              {form.agent_tone === 'custom' && (
                <textarea rows={2} value={form.custom_tone_instructions}
                  onChange={e => update('custom_tone_instructions', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mt-2"
                  placeholder="e.g. Friendly but professional. Always use the buyer's first name." />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent instructions</label>
              <textarea rows={3} value={form.global_instructions} onChange={e => update('global_instructions', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                placeholder='e.g. "Always ask if buyer can pick up today. No trades."' />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
              <textarea rows={3} value={form.availability_text} onChange={e => update('availability_text', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                placeholder='e.g. "Weekdays after 5pm, weekends 10am–4pm"' />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </form>

      {/* Billing */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Billing</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Plan</span>
          <span className="font-medium">DealBot — $10/month</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Status</span>
          <span className={`font-medium capitalize ${
            profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
              ? 'text-green-600' : 'text-red-600'
          }`}>
            {profile?.subscription_status ?? 'inactive'}
          </span>
        </div>
        <button onClick={handleBillingPortal} disabled={portalLoading}
          className="w-full border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition">
          {portalLoading ? 'Loading...' : 'Manage billing →'}
        </button>
      </div>
    </div>
  )
}
