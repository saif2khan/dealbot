'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AgentToggle from './AgentToggle'
import VirtualNumberBanner from './VirtualNumberBanner'

interface Props {
  initialActive: boolean
  telnyxNumber: string
  agentName: string
  agentGender: 'male' | 'female'
}

export default function AgentStatusSection({ initialActive, telnyxNumber, agentName, agentGender }: Props) {
  const [active, setActive] = useState(initialActive)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const next = !active
    setActive(next)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({ agent_active: next }).eq('id', user.id)
      }
    } catch {
      setActive(!next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="hidden md:block text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900">Dashboard</h2>
          <p className="hidden md:block text-on-surface-variant text-sm mt-1">Your BZARP at a glance</p>
        </div>
        <AgentToggle active={active} saving={saving} onToggle={toggle} />
      </div>

      <div className="relative">
        <VirtualNumberBanner
          number={telnyxNumber}
          agentName={agentName}
          agentGender={agentGender}
        />
        {!active && (
          <div className="absolute inset-0 rounded-2xl bg-slate-100/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 rounded-xl px-5 py-3 shadow-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">pause_circle</span>
              <p className="text-sm font-semibold text-slate-500">Agent is inactive</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
