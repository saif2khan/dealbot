interface Props {
  activeItems: number
  pendingDeals: number
  messagesToday: number
  itemsUsed: number
  itemsLimit: number
}

export default function DashboardSummary({
  activeItems,
  pendingDeals,
  messagesToday,
  itemsUsed,
  itemsLimit,
}: Props) {
  const stats = [
    { label: 'Active Items', value: activeItems, icon: 'inventory_2', iconClass: 'text-indigo-600 bg-indigo-50' },
    { label: 'Pending Deals', value: pendingDeals, icon: 'pending_actions', iconClass: 'text-amber-600 bg-amber-50' },
    { label: 'Active Threads Today', value: messagesToday, icon: 'chat_bubble', iconClass: 'text-emerald-600 bg-emerald-50' },
    { label: 'Items This Month', value: `${itemsUsed} / ${itemsLimit}`, icon: 'calendar_month', iconClass: 'text-slate-600 bg-slate-100' },
  ]

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.iconClass}`}>
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
          </div>
          <p className="text-3xl font-[family-name:var(--font-manrope)] font-black text-on-surface">{stat.value}</p>
          <p className="text-on-surface-variant text-xs font-medium mt-1">{stat.label}</p>
        </div>
      ))}
    </section>
  )
}
