import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  sold: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
          <p className="text-gray-500 text-sm mt-1">
            {profile?.items_listed_this_month ?? 0} / {profile?.items_limit ?? 10} added this month
          </p>
        </div>
        <Link
          href="/items/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          + Add item
        </Link>
      </div>

      {/* Active items */}
      <div className="grid gap-3">
        {activeItems.map(item => {
          const waitlistCount = (item.waitlist_entries as Array<{ count: number }>)?.[0]?.count ?? 0
          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
                    {item.status}
                  </span>
                  {waitlistCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                      {waitlistCount} waitlisted
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  ${item.asking_price}
                  {!item.firm_price && ` · floor $${item.asking_price - item.max_discount}`}
                  {item.firm_price && ' · firm'}
                  {' · '}{item.condition.replace('_', ' ')}
                </p>
              </div>
              <Link
                href={`/items/${item.id}`}
                className="ml-4 text-sm text-blue-600 hover:underline"
              >
                Edit
              </Link>
            </div>
          )
        })}

        {activeItems.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No active items. Add your first listing.
          </div>
        )}
      </div>

      {/* Archived */}
      {archivedItems.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Sold / Archived</h2>
          <div className="grid gap-3">
            {archivedItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between opacity-60">
                <div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Sold for ${item.final_sale_price ?? item.asking_price}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
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
