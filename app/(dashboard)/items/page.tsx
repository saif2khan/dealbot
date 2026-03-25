import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  sold: 'bg-blue-100 text-blue-700',
  archived: 'bg-slate-100 text-slate-500',
}

export default async function ItemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, itemsResult] = await Promise.all([
    supabase.from('users').select('items_listed_this_month, items_limit').eq('id', user.id).single(),
    supabase
      .from('items')
      .select('*, waitlist_entries(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileResult.data
  const items = itemsResult.data ?? []
  const activeItems = items.filter(i => i.status !== 'archived')
  const archivedItems = items.filter(i => i.status === 'archived')

  return (
    <div className="max-w-7xl space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900">Items</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {profile?.items_listed_this_month ?? 0} / {profile?.items_limit ?? 10} added this month
          </p>
        </div>
        {(profile?.items_listed_this_month ?? 0) >= (profile?.items_limit ?? 10) ? (
          <div className="bg-slate-200 text-slate-400 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-not-allowed" title="Monthly item limit reached">
            <span className="material-symbols-outlined text-sm">add</span>
            Add item
          </div>
        ) : (
          <Link
            href="/items/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add item
          </Link>
        )}
      </div>

      {/* Active items */}
      <div className="space-y-4">
        {activeItems.map(item => {
          const waitlistCount = (item.waitlist_entries as Array<{ count: number }>)?.[0]?.count ?? 0
          return (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-400 text-[22px]">inventory_2</span>
                  </div>
                )}
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-900 font-[family-name:var(--font-manrope)]">{item.name}</h3>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
                    {item.status}
                  </span>
                  {waitlistCount > 0 && (
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container">
                      {waitlistCount} waitlisted
                    </span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant">
                  ${item.asking_price}
                  {!item.firm_price && ` · floor $${item.asking_price - item.max_discount}`}
                  {item.firm_price && ' · firm'}
                  {' · '}{item.condition.replace(/_/g, ' ')}
                </p>
              </div>
              </div>
              <Link
                href={`/items/${item.id}`}
                className="ml-4 text-sm font-semibold text-indigo-600 hover:underline"
              >
                Edit
              </Link>
            </div>
          )
        })}

        {activeItems.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">inventory_2</span>
            <p className="text-on-surface-variant font-medium">No active items.</p>
            <p className="text-sm text-on-surface-variant mt-1">Add your first listing to get started.</p>
          </div>
        )}
      </div>

      {/* Archived */}
      {archivedItems.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">Sold / Archived</h2>
          <div className="space-y-3">
            {archivedItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between opacity-50">
                <div>
                  <span className="font-semibold text-slate-900 font-[family-name:var(--font-manrope)]">{item.name}</span>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Sold for ${item.final_sale_price ?? item.asking_price}
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
    </div>
  )
}
