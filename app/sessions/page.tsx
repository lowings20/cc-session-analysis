import sessionsData from '@/app/data/sessions.json'

interface SessionRow {
  session_id: number
  session_uuid: string
  session_name: string
  start_date: string | null
  program_id: number
  program_name: string
  program_uuid: string
  case_challenge: string
  number_of_teams: number
  players_per_team: number | null
  facilitators: string | null
  producers: string | null
}

interface SessionsFile {
  generated_at: string
  source: string
  rows: SessionRow[]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function arrowProgramUrl(uuid: string): string {
  return `https://arrow.abilitie.com/programs/${uuid}`
}

export default function SessionsPage() {
  const data = sessionsData as unknown as SessionsFile
  const rows = data.rows

  return (
    <div className="min-h-screen px-6 py-8 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#e2e8f0]">Case Challenge Sessions</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          {rows.length} sessions with 4+ teams · sourced from Arrow · snapshot {formatDate(data.generated_at)}
        </p>
      </header>

      <div className="rounded-lg border border-[#1e293b] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#1e293b] text-[#94a3b8]">
            <tr>
              <th className="text-left font-medium px-4 py-3">Case Challenge</th>
              <th className="text-left font-medium px-4 py-3">Session</th>
              <th className="text-left font-medium px-4 py-3">Date</th>
              <th className="text-right font-medium px-4 py-3">Teams</th>
              <th className="text-left font-medium px-4 py-3">Program</th>
              <th className="text-left font-medium px-4 py-3">Facilitator</th>
              <th className="text-left font-medium px-4 py-3">Producer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.session_id} className="border-t border-[#1e293b] hover:bg-[#131e2e]">
                <td className="px-4 py-3 text-[#e2e8f0]">{r.case_challenge}</td>
                <td className="px-4 py-3 text-[#cbd5e1]">{r.session_name}</td>
                <td className="px-4 py-3 text-[#94a3b8] whitespace-nowrap">{formatDate(r.start_date)}</td>
                <td className="px-4 py-3 text-right text-[#e2e8f0] font-medium tabular-nums">{r.number_of_teams}</td>
                <td className="px-4 py-3">
                  <a
                    href={arrowProgramUrl(r.program_uuid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#a78bfa] hover:text-[#c4b5fd] hover:underline"
                  >
                    {r.program_name}
                  </a>
                </td>
                <td className="px-4 py-3 text-[#cbd5e1]">{r.facilitators ?? '—'}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{r.producers ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
