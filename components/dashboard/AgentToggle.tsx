'use client'

interface Props {
  active: boolean
  saving: boolean
  onToggle: () => void
}

export default function AgentToggle({ active, saving, onToggle }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between min-w-[320px] shadow-sm">
      <div className="flex items-center space-x-3">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
        <div>
          <p className="text-sm font-bold text-slate-900">
            Seller Agent: {active ? 'Active' : 'Inactive'}
          </p>
          <p className="text-[10px] text-on-surface-variant leading-tight">
            {active
              ? 'Managing inquiries and negotiations.'
              : 'Agent is paused. Buyers won\u2019t get responses.'}
          </p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={onToggle}
          disabled={saving}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  )
}
