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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{stat.label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
