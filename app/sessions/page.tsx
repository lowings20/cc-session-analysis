import Link from 'next/link'
import { getSessions, formatSnapshotDate } from '@/lib/sessions'
import SessionsTable from '@/components/SessionsTable'
import RefreshButton from '@/components/RefreshButton'

export default function SessionsPage() {
  const data = getSessions()

  return (
    <div className="min-h-screen px-6 py-8 max-w-[1400px] mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-xs text-[#94a3b8] hover:text-[#e2e8f0]">
          ← Back
        </Link>
      </div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#e2e8f0]">Case Challenge Sessions</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Sourced from Arrow</p>
        </div>
        <RefreshButton snapshotLabel={formatSnapshotDate(data.generated_at)} />
      </header>

      <SessionsTable rows={data.rows} />
    </div>
  )
}
