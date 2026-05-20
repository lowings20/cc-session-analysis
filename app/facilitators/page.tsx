import Link from 'next/link'
import { getSessions, splitNames, formatSnapshotDate } from '@/lib/sessions'
import FacilitatorsList from '@/components/FacilitatorsList'
import type { SessionRow } from '@/components/SessionsTable'

export default function FacilitatorsPage() {
  const data = getSessions()

  const byFacilitator = new Map<string, SessionRow[]>()
  for (const row of data.rows) {
    for (const name of splitNames(row.facilitators)) {
      if (!byFacilitator.has(name)) byFacilitator.set(name, [])
      byFacilitator.get(name)!.push(row)
    }
  }

  const facilitators = Array.from(byFacilitator.entries())
    .map(([name, sessions]) => ({
      name,
      sessions: sessions.slice().sort((a, b) => {
        const ad = a.start_date ? new Date(a.start_date).getTime() : -Infinity
        const bd = b.start_date ? new Date(b.start_date).getTime() : -Infinity
        return bd - ad
      }),
    }))
    .sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-xs text-[#94a3b8] hover:text-[#e2e8f0]">
          ← Back
        </Link>
      </div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[#e2e8f0]">Facilitators</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          {facilitators.length} facilitators · snapshot {formatSnapshotDate(data.generated_at)}
        </p>
      </header>

      <FacilitatorsList facilitators={facilitators} />
    </div>
  )
}
