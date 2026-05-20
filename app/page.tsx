import Link from 'next/link'
import { getSessions, formatSnapshotDate } from '@/lib/sessions'

const BUTTONS = [
  { href: '/case-challenges', title: 'Explore a Case Challenge', subtitle: 'Browse case challenges by name' },
  { href: '/facilitators', title: 'See a Facilitator', subtitle: 'View facilitators and the sessions they lead' },
  { href: '/sessions', title: 'See the Sessions we’re pulling from', subtitle: 'Full sessions table with filters and search' },
]

export default function Home() {
  const data = getSessions()

  return (
    <div className="min-h-screen px-6 py-16 max-w-3xl mx-auto">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-semibold text-[#e2e8f0]">Case Challenge Sessions</h1>
        <p className="text-sm text-[#94a3b8] mt-2">
          Snapshot from {formatSnapshotDate(data.generated_at)} · {data.rows.length} sessions
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {BUTTONS.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="block rounded-lg border border-[#1e293b] bg-[#0f172a] hover:bg-[#131e2e] hover:border-[#334155] transition-colors px-6 py-5"
          >
            <div className="text-xl font-medium text-[#e2e8f0]">{b.title}</div>
            <div className="text-sm text-[#94a3b8] mt-1">{b.subtitle}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
