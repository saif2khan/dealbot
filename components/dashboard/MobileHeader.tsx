'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MobileHeader({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-100 px-5 h-[60px] flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
          <span
            className="material-symbols-outlined text-white text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
        </div>
        <span className="font-[family-name:var(--font-manrope)] font-extrabold text-slate-900 tracking-tight text-base">
          BZARP
        </span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          aria-label="Profile menu"
        >
          <span className="material-symbols-outlined text-slate-500 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
        </button>

        {open && (
          <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs text-slate-400 truncate">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">logout</span>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
