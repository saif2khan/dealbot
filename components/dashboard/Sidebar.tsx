'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '⊞' },
  { href: '/items', label: 'Items', icon: '📦' },
  { href: '/conversations', label: 'Conversations', icon: '💬' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
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
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2.5">
        <Image src="/icon.png" alt="DealBot" width={32} height={32} className="rounded-lg" />
        <span className="text-lg font-bold text-blue-600">DealBot</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 truncate px-3 mb-2">{user.email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
