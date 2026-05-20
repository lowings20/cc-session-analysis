import sessionsData from '@/app/data/sessions.json'
import SessionsTable, { type SessionRow } from '@/components/SessionsTable'

interface SessionsFile {
  generated_at: string
  source: string
  rows: SessionRow[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SessionsPage() {
  const data = sessionsData as unknown as SessionsFile

  return (
    <div className="min-h-screen px-6 py-8 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#e2e8f0]">Case Challenge Sessions</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          Sourced from Arrow · snapshot {formatDate(data.generated_at)}
        </p>
      </header>

      <SessionsTable rows={data.rows} />
    </div>
  )
}
