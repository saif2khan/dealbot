'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

const navItems = [
  { href: '/dashboard', label: 'Overview', shortLabel: 'Overview', icon: 'dashboard' },
  { href: '/items', label: 'Items', shortLabel: 'Items', icon: 'inventory_2' },
  { href: '/conversations', label: 'Conversations', shortLabel: 'Chat', icon: 'chat_bubble' },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: 'settings' },
]

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 z-50 bg-slate-100 p-6 space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight font-[family-name:var(--font-manrope)]">BZARP</h1>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 font-[family-name:var(--font-manrope)] ${
                  active
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 0" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Add Item CTA */}
        {user.items_listed_this_month >= user.items_limit ? (
          <div className="bg-slate-200 text-slate-400 w-full py-3 rounded-xl font-[family-name:var(--font-manrope)] font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed" title="Monthly item limit reached">
            <span className="material-symbols-outlined text-sm">add</span>
            Add Item
          </div>
        ) : (
          <Link
            href="/items/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-3 rounded-xl font-[family-name:var(--font-manrope)] font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors active:scale-95 duration-150"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Item
          </Link>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 space-y-1">
          <p className="text-[10px] text-slate-400 truncate px-4 mb-1">{user.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-left text-sm text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-[family-name:var(--font-manrope)]"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-50 px-2">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
            >
              <span
                className={`material-symbols-outlined text-[24px] transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wide transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                {item.shortLabel}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
