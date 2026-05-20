import Link from 'next/link'
import { getSessions, formatSnapshotDate } from '@/lib/sessions'
import { getCaseChallenges } from '@/lib/case-challenges'

export default function CaseChallengesPage() {
  const data = getSessions()
  const cases = getCaseChallenges().cases

  const tiles = cases.map((c) => ({
    name: c.case_challenge,
    displayName: c.name,
    urlKey: c.url_key,
    imageUrl: c.imageUrl,
    count: c.session_count,
  }))

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
          <Link
            key={t.name}
            href={`/case-challenges/${t.urlKey}`}
            className="relative rounded-lg border border-[#1e293b] bg-[#0f172a] hover:border-[#334155] hover:bg-[#131e2e] transition-colors px-5 py-6 min-h-[120px] block"
          >
            <div className="text-base font-medium text-[#e2e8f0] pr-12">{t.displayName}</div>
            <div className="absolute bottom-3 right-4 text-3xl font-semibold text-[#a78bfa] tabular-nums leading-none">
              {t.count}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
