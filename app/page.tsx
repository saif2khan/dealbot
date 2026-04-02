import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-blue-600">BZARP</span>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
            Log in
          </Link>
          <Link href="/signup" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
            Get started free
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
        <h1 className="text-5xl font-bold text-gray-900 max-w-2xl leading-tight">
          Let AI handle selling on FB marketplace
        </h1>
        <p className="text-xl text-gray-500 mt-4 max-w-xl">
          Life is too short to reply to "Is it available?" 33 times a day. Let your personal AI assistant answer questions, negotiates price, schedules pickups, and notify you when deals are done — all via SMS.
        </p>
        <div className="flex gap-3 mt-8">
          <Link href="/signup" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium text-lg hover:bg-blue-700 transition">
            Start free trial
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-3">1 month free · No charge today · Cancel anytime</p>

        <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl text-left">
          {[
            { title: 'Answers instantly', desc: 'Buyers get responses in seconds, any time of day.' },
            { title: 'Negotiates for you', desc: 'Sets your floor price. Agent works down to it — not below.' },
            { title: 'Schedules pickups', desc: 'Books meetups based on your availability. No back-and-forth.' },
          ].map(f => (
            <div key={f.title} className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
