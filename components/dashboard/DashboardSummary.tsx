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
    { label: 'Active Items', value: activeItems },
    { label: 'Pending Deals', value: pendingDeals },
    { label: 'Active Threads Today', value: messagesToday },
    { label: 'Items This Month', value: `${itemsUsed} / ${itemsLimit}` },
  ]

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <p className="text-on-surface-variant text-xs font-medium mb-3">{stat.label}</p>
          <p className="text-4xl font-[family-name:var(--font-manrope)] font-black text-on-surface">{stat.value}</p>
        </div>
      ))}
    </section>
  )
}
