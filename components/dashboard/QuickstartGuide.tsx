'use client'

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

export default function QuickstartGuide() {
  return (
    <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-primary">play_circle</span>
          <h3 className="text-lg font-[family-name:var(--font-manrope)] font-bold text-slate-900">Quickstart Guide</h3>
        </div>
        <p className="text-on-surface-variant text-xs mt-1">Learn how to set up your BZARP in under 2 minutes.</p>
      </div>
      <div className="p-6">
        <a
          href={YOUTUBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="aspect-video w-full bg-slate-100 rounded-xl flex items-center justify-center group cursor-pointer relative overflow-hidden border-2 border-dashed border-slate-200 hover:border-primary/30 transition-colors block"
        >
          <div className="text-center z-10">
            <div className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center text-primary mb-4 mx-auto group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </div>
            <p className="text-slate-500 font-medium text-sm">Watch the setup guide</p>
          </div>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <svg className="h-full w-full" fill="none" viewBox="0 0 100 100">
              <pattern id="qs-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#qs-grid)" />
            </svg>
          </div>
        </a>
      </div>
    </section>
  )
}
