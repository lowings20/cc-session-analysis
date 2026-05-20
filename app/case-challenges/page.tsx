import Link from 'next/link'
import { getSessions, formatSnapshotDate } from '@/lib/sessions'

export default function CaseChallengesPage() {
  const data = getSessions()

  const counts = new Map<string, number>()
  for (const r of data.rows) {
    counts.set(r.case_challenge, (counts.get(r.case_challenge) ?? 0) + 1)
  }
  const tiles = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-xs text-[#94a3b8] hover:text-[#e2e8f0]">
          ← Back
        </Link>
      </div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[#e2e8f0]">Case Challenges</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          {tiles.length} distinct case challenges · snapshot {formatSnapshotDate(data.generated_at)}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div
            key={t.name}
            className="relative rounded-lg border border-[#1e293b] bg-[#0f172a] hover:border-[#334155] transition-colors px-5 py-6 min-h-[120px]"
          >
            <div className="text-base font-medium text-[#e2e8f0] pr-12">{t.name}</div>
            <div className="absolute bottom-3 right-4 text-3xl font-semibold text-[#a78bfa] tabular-nums leading-none">
              {t.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
