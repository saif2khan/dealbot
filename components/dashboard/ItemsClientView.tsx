'use client'

import { useState } from 'react'
import Link from 'next/link'
import MarkSoldButton from '@/components/dashboard/MarkSoldButton'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  sold: 'bg-blue-100 text-blue-700',
  archived: 'bg-slate-100 text-slate-500',
}

type Item = {
  id: string
  name: string
  status: string
  asking_price: number
  max_discount: number
  firm_price: boolean
  condition: string
  photo_url: string | null
  waitlist_entries: Array<{ count: number }>
}

type DealInfo = {
  buyer_name: string
  buyer_phone: string
  agreed_price: number
  meetup_date: string
  meetup_time: string
}

type Profile = {
  items_listed_this_month: number
  items_limit: number
}

function formatDealDate(dateStr: string, timeStr: string) {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const [h, m] = timeStr.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${day} @ ${h12}:${String(m).padStart(2, '0')} ${ampm}`
  } catch {
    return `${dateStr} ${timeStr}`
  }
}

export default function ItemsClientView({
  items,
  profile,
  dealsByItem,
}: {
  items: Item[]
  profile: Profile
  dealsByItem?: Record<string, DealInfo>
}) {
  const [search, setSearch] = useState('')
  const deals = dealsByItem ?? {}

  const activeItems = items.filter(i => i.status !== 'archived')
  const archivedItems = items.filter(i => i.status === 'archived')

  const filteredActive = activeItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredArchived = archivedItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const atLimit = (profile?.items_listed_this_month ?? 0) >= (profile?.items_limit ?? 10)

  return (
    <div className="max-w-7xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900">Items</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {profile?.items_listed_this_month ?? 0} / {profile?.items_limit ?? 10} added this month
          </p>
        </div>
        {/* Desktop add button */}
        {atLimit ? (
          <div className="hidden md:flex bg-slate-200 text-slate-400 px-4 py-2 rounded-lg text-sm font-semibold items-center gap-2 cursor-not-allowed" title="Monthly item limit reached">
            <span className="material-symbols-outlined text-sm">add</span>
            Add item
          </div>
        ) : (
          <Link
            href="/items/new"
            className="hidden md:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-95 items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add item
          </Link>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your items..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Active items */}
      <div className="space-y-3">
        {filteredActive.map(item => {
          const waitlistCount = item.waitlist_entries?.[0]?.count ?? 0
          const deal = item.status === 'pending' ? (deals[item.id] ?? null) : null

          return (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              {/* Main row */}
              <div className="p-4 flex items-center gap-4">
                {/* Thumbnail */}
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-400 text-[24px]">inventory_2</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900 font-[family-name:var(--font-manrope)] truncate">{item.name}</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[item.status]}`}>
                      {item.status}
                    </span>
                    {waitlistCount > 0 && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container shrink-0">
                        {waitlistCount} waitlisted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    ${item.asking_price}
                    {!item.firm_price && ` · floor $${item.asking_price - item.max_discount}`}
                    {item.firm_price && ' · firm'}
                    {' · '}{item.condition.replace(/_/g, ' ')}
                  </p>
                </div>

                {/* Desktop deal info — inline */}
                {deal && (
                  <div className="hidden md:flex items-center gap-6 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 shrink-0">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buyer</p>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-indigo-500">person</span>
                        {deal.buyer_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agreed Price</p>
                      <p className="text-sm font-semibold text-indigo-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-indigo-500">payments</span>
                        ${deal.agreed_price}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-indigo-500">calendar_today</span>
                        {formatDealDate(deal.meetup_date, deal.meetup_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact</p>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-indigo-500">call</span>
                        {deal.buyer_phone}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {item.status !== 'sold' && item.status !== 'archived' && (
                    <MarkSoldButton itemId={item.id} itemName={item.name} />
                  )}
                  <Link href={`/items/${item.id}`} className="text-sm font-semibold text-indigo-600 hover:underline">
                    Edit
                  </Link>
                </div>
              </div>

              {/* Mobile deal info — below the main row */}
              {deal && (
                <div className="md:hidden border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buyer Info</p>
                  <div className="space-y-1.5">
                    <p className="text-sm text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-indigo-500">person</span>
                      {deal.buyer_name}
                    </p>
                    <p className="text-sm text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-indigo-500">call</span>
                      {deal.buyer_phone}
                    </p>
                    <p className="text-sm text-indigo-600 font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-indigo-500">payments</span>
                      Agreed: ${deal.agreed_price}
                    </p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">calendar_today</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Scheduled Pickup</p>
                      <p className="text-sm font-semibold text-indigo-700">{formatDealDate(deal.meetup_date, deal.meetup_time)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filteredActive.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">inventory_2</span>
            <p className="text-on-surface-variant font-medium">
              {search ? 'No items match your search.' : 'No active items.'}
            </p>
            {!search && <p className="text-sm text-on-surface-variant mt-1">Add your first listing to get started.</p>}
          </div>
        )}
      </div>

      {/* Archived */}
      {filteredArchived.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Sold / Archived</h2>
          <div className="space-y-3">
            {filteredArchived.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between opacity-50">
                <div>
                  <span className="font-semibold text-slate-900 font-[family-name:var(--font-manrope)]">{item.name}</span>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    ${item.asking_price}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {!atLimit && (
        <Link
          href="/items/new"
          className="md:hidden fixed bottom-20 right-5 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl flex items-center justify-center z-40 active:scale-95 transition-all"
          aria-label="Add item"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </Link>
      )}
    </div>
  )
}
